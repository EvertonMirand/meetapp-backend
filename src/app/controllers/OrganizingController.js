import { compareAsc } from 'date-fns';
import Meetup from '../models/Meetup';

class OrganizingController {
  async index(req, res) {
    const meetups = await Meetup.findAll({
      where: {
        user_id: req.userId,
      },
    });

    return res.json(meetups.sort((a, b) => compareAsc(a.date, b.date)));
  }
}

export default new OrganizingController();
