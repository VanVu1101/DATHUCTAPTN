require('dotenv').config();
const Schedule = require('../src/models/schedule');
const { Op } = require('sequelize');

const dateArg = process.argv[2];
if (!dateArg) {
  console.error('Usage: node find_schedules_by_date.js YYYY-MM-DD');
  process.exit(1);
}

(async () => {
  try {
    const date = dateArg;
    const rows = await Schedule.findAll({
      where: {
        startDate: { [Op.lte]: date },
        endDate: { [Op.gte]: date },
      },
      order: [['id', 'ASC']]
    });
    if (!rows.length) {
      console.log('No schedules found overlapping', date);
      process.exit(0);
    }
    console.log('Found schedules overlapping', date, rows.map(r => ({ id: r.id, title: r.title, startDate: r.startDate, endDate: r.endDate, audience: r.audience, periodId: r.periodId })));
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();
