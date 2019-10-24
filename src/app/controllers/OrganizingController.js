import { isBefore, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import File from '../models/File';

class OrganizingController {
  async index(req, res) {
    const page = req.query.page || 1;
    const { rows: meetups, count } = await Meetup.findAndCountAll({
      where: {
        user_id: req.userId,
        date: {
          [Op.gt]: new Date(),
        },
      },
      order: [['date', 'asc']],
      include: [File],
      limit: 10,
      offset: (page - 1) * 10,
    });

    const meetupsMapped = meetups.map(meetup => {
      meetup.past = isBefore(parseISO(meetup.date), new Date());
      return meetup;
    });

    res.set('x-total-page', Math.ceil(count / 10));

    return res.json(meetupsMapped);
  }
}

export default new OrganizingController();
