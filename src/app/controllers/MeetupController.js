import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';
import Subscription from '../models/Subscription';

class MeetupController {
  async index(req, res) {
    const page = req.query.page || 1;
    const user = await User.findByPk(req.userId);

    const where = {
      user_id: {
        [Op.not]: user.id,
      },
    };

    if (req.query.date) {
      const searchDate = parseISO(req.query.date);

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const { rows, count } = await Meetup.findAndCountAll({
      where,
      include: [
        User,
        {
          model: File,
          attributes: ['id', 'path', 'url'],
        },
      ],
      order: [['date', 'asc']],
      limit: 10,
      offset: 10 * page - 10,
    });

    const mapMeetup = async meetup => {
      const checkSubscribed = await Subscription.findOne({
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

      return {
        ...meetup.toJSON(),
        canSubscribe: !checkSubscribed,
      };
    };

    const meetups = await Promise.all(await rows.map(mapMeetup));

    res.set('x-total-page', Math.ceil(count / 10));

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      file_id: Yup.number().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({
        error: 'Erro ao validar campos, porfavor verifique novamente.',
      });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({
        error: 'Data do Meetup invalida.',
      });
    }

    const user_id = req.userId;

    const meetup = await Meetup.create({
      ...req.body,
      user_id,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      file_id: Yup.number(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({
        error: 'Erro ao validar campos, porfavor verifique novamente.',
      });
    }

    const user_id = req.userId;

    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id !== user_id) {
      return res.status(401).json({
        error: 'Usuario não autorizado para atualizar o meetup.',
      });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({
        error: 'Data do Meetup invalida',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: 'Não pode atualizar Meetups que já ocorreram',
      });
    }

    await meetup.update(req.body);

    const updatedMeetup = await Meetup.findByPk(req.params.id, {
      include: [
        User,
        {
          model: File,
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json(updatedMeetup);
  }

  async delete(req, res) {
    const user_id = req.userId;

    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(404).json({
        error: 'Meetup não encontrado.',
      });
    }

    if (meetup.user_id !== user_id) {
      return res.status(401).json({
        error: 'Usuario não autorizado a deleta o MeetUp.',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: 'Não pode deletar meetups que já ocorreram',
      });
    }

    await meetup.destroy();

    return res.send();
  }
}

export default new MeetupController();
