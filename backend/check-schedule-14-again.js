const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('internship_management', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

async function check() {
  try {
    const schedules = await sequelize.query(`
      SELECT id, title, startDate, endDate, audience, periodId 
      FROM schedules 
      WHERE DATE(CONVERT_TZ(startDate, '+00:00', '+07:00')) = '2026-07-14'
         OR DATE(CONVERT_TZ(endDate, '+00:00', '+07:00')) = '2026-07-14'
      ORDER BY startDate;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n=== Schedules cho ngày 14/7/2026 ===');
    console.log(JSON.stringify(schedules, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

check();
