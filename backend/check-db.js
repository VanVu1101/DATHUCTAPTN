const mysql = require('mysql2/promise');

async function checkData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'internship_management'
    });

    try {
        // Check schedules
        const [schedules] = await connection.query('SELECT * FROM schedules');
        console.log('📅 Schedules in DB:', JSON.stringify(schedules, null, 2));

        // Check meetings
        const [meetings] = await connection.query('SELECT * FROM meetings');
        console.log('\n🤝 Meetings in DB:', JSON.stringify(meetings, null, 2));

        // Check internship_periods
        const [periods] = await connection.query('SELECT * FROM internship_periods');
        console.log('\n🎓 Internship Periods:', JSON.stringify(periods, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkData();
