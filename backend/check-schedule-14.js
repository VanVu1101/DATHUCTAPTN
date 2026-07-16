const mysql = require('mysql2/promise');

async function checkSchedule14() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'internship_management'
    });

    try {
        // Xem tất cả lịch
        const [schedules] = await connection.query(`
            SELECT id, title, startDate, endDate, startTime, endTime, audience, periodId 
            FROM schedules 
            ORDER BY startDate ASC
        `);
        
        console.log('📅 Tất cả lịch:');
        schedules.forEach(s => {
            console.log(`  - ${s.id}: ${s.title}`);
            console.log(`    Từ: ${s.startDate} đến ${s.endDate}`);
            console.log(`    Audience: ${s.audience}, PeriodId: ${s.periodId}\n`);
        });

        // Filter lịch ngày 14/7
        const july14Start = '2026-07-14 00:00:00';
        const july14End = '2026-07-14 23:59:59';
        
        const [july14Schedules] = await connection.query(`
            SELECT * FROM schedules 
            WHERE startDate <= ? AND ? <= endDate
            AND audience = 'ALL_STUDENTS'
        `, ['2026-07-14', '2026-07-14']);
        
        console.log(`\n🔍 Lịch ngày 14/7 (ALL_STUDENTS):`, JSON.stringify(july14Schedules, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkSchedule14();
