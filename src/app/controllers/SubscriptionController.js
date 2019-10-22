import { Op } from 'sequelize';
import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';
import Queue from '../../lib/Queue';
import SubscriptionMail from '../jobs/SubscriptionMail';
import File from '../models/File';

class SubscriptionController {
  async index(req, res) {
    const page = req.query.page || 1;
    const { rows: subscriptions, count } = await Subscription.findAndCountAll({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          order: [['date', 'asc']],
          include: [
            User,
            {
              model: File,
              attributes: ['id', 'path', 'url'],
            },
          ],
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          required: true,
        },
      ],
      limit: 10,
      offset: 10 * page - 10,
      order: [[Meetup, 'date']],
    });

    res.set('x-total-page', Math.ceil(count / 10));

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.meetupId, {
      include: [User],
    });

    if (meetup.user_id === req.userId) {
      return res.status(400).json({
        error: 'Não pode se inscrever para o Meetup que você mesmo criou.',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: 'Não pode se inscrever para Meetups que já ocorreram.',
      });
    }

    const checkDate = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (checkDate) {
      return res.status(400).json({
        error:
          'Não pode se inscrever para dois Meetups que ocorrem no mesmo momento',
      });
    }

    const subscription = await Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    await Queue.add(SubscriptionMail.key, {
      meetup,
      user,
    });

    return res.json(subscription);
  }

  async delete(req, res) {
    const subscription_id = req.params.id;
    const user_id = req.userId;
    const subscription = await Subscription.findByPk(subscription_id, {
      include: Meetup,
    });

    const { Meetup: meetup } = subscription;

    if (subscription.user_id !== user_id) {
      return res.status(401).json({
        error: 'Usuario não tem autorização para deletar Meetup',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: 'Não pode deletar inscrição de Meetup que já ocorreu',
      });
    }

    await subscription.destroy();

    return res.send({
      message: 'Desinscrito com sucesso.',
    });
  }
}

export default new SubscriptionController();
