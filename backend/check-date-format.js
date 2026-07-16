const mysql = require('mysql2/promise');

async function checkDateFormat() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'internship_management'
    });

    try {
        // Xem lịch tạo hôm nay (13/7) vs ngày mai (14/7)
        const [schedules] = await connection.query(`
            SELECT id, title, startDate, endDate, audience
            FROM schedules 
            WHERE audience = 'ALL_STUDENTS'
            ORDER BY createdAt DESC
            LIMIT 5
        `);
        
        console.log('📅 5 lịch gần đây:');
        schedules.forEach(s => {
            console.log(`  ID ${s.id}: ${s.title}`);
            console.log(`    startDate: ${s.startDate} (type: ${typeof s.startDate})`);
            console.log(`    endDate: ${s.endDate}`);
            
            // Check local date
            const startLocal = new Date(s.startDate);
            const year = startLocal.getFullYear();
            const month = String(startLocal.getMonth() + 1).padStart(2, '0');
            const day = String(startLocal.getDate()).padStart(2, '0');
            const localDate = `${year}-${month}-${day}`;
            console.log(`    Local date: ${localDate}\n`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkDateFormat();
