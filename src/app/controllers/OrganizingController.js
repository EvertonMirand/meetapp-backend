import { compareAsc, isBefore, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import File from '../models/File';

class OrganizingController {
  async index(req, res) {
    const page = req.query.page || 1;
    const meetups = await Meetup.findAll({
      where: {
        user_id: req.userId,
      },
      include: [File],
      limit: 10,
      offset: (page - 1) * 10,
    }).map(meetup => {
      meetup.past = isBefore(parseISO(meetup.date), new Date());
      return meetup;
    });

    return res.json(meetups.sort((a, b) => compareAsc(a.date, b.date)));
  }
}

export default new OrganizingController();
