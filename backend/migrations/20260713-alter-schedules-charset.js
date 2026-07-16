const fs = require('fs');
const path = require('path');
const sequelize = require('../src/config/database');

module.exports = {
    up: async (queryInterface) => {
        const sql = fs.readFileSync(path.join(__dirname, '20260713-alter-schedules-charset.sql'), 'utf8');
        const statements = sql.split(';').filter(s => s.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await queryInterface.sequelize.query(statement);
            }
        }
    },

    down: async (queryInterface) => {
        // Rollback nếu cần
        console.log('Rollback: Converting back to utf8');
    }
};
