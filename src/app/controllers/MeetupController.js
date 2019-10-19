import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';
import Subscription from '../models/Subscription';

class MeetupController {
  async index(req, res) {
    const where = {};
    const page = req.query.page || 1;
    const user = await User.findByPk(req.userId);

    if (req.query.date) {
      const searchDate = parseISO(req.query.date);

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const { rows: meetups, count } = await Meetup.findAndCountAll({
      where,
      include: [
        User,
        {
          model: File,
          attributes: ['id', 'path', 'url'],
        },
      ],
      limit: 10,
      offset: 10 * page - 10,
    });

    const mapMeetup = async meetup => {
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

      return {
        ...meetup.toJSON(),
        canSubscribe: !checkDate,
      };
    };

    const a = await Promise.all(await meetups.map(mapMeetup));

    res.set('x-total-page', Math.ceil(count / 10));

    return res.json(a);
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
        error: 'Validation fails',
      });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({
        error: 'Meetup date invalid',
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
        error: 'Validation fails',
      });
    }

    const user_id = req.userId;

    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id !== user_id) {
      return res.status(401).json({
        error: 'Not authorized.',
      });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({
        error: 'Meetup date invalid',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: "Can't update past meetups.",
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

    if (meetup.user_id !== user_id) {
      return res.status(401).json({
        error: 'Not authorized.',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: "Can't delete past meetups.",
      });
    }

    await meetup.destroy();

    return res.send();
  }
}

export default new MeetupController();
