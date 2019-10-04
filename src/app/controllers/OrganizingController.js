import { compareAsc } from 'date-fns';
import Meetup from '../models/Meetup';

class OrganizingController {
  async index(req, res) {
    const page = req.query.page || 1;
    const meetups = await Meetup.findAll({
      where: {
        user_id: req.userId,
      },
      limit: 10,
      offset: (page - 1) * 10,
    });

    return res.json(meetups.sort((a, b) => compareAsc(a.date, b.date)));
  }
}

export default new OrganizingController();
