const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sequelize = require('../src/config/database');

(async () => {
  try {
    const qi = sequelize.getQueryInterface();
    const desc = await qi.describeTable('tasks');
    console.log(JSON.stringify(desc, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error describing tasks table:', err);
    process.exit(1);
  }
})();
