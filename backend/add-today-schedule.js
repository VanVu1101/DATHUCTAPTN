const mysql = require('mysql2/promise');

async function addTodaySchedule() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'internship_management'
    });

    try {
        // Tạo lịch cho hôm nay (13/7)
        await connection.query(`
            INSERT INTO schedules (title, description, type, startDate, endDate, startTime, endTime, location, audience, createdBy, createdAt, updatedAt)
            VALUES 
                ('Lịch họp buổi sáng', 'Họp báo cáo tiến độ', 'MEETING', '2026-07-13', '2026-07-13', '09:00', '10:00', 'Phòng họp A', 'ALL_STUDENTS', 1, NOW(), NOW()),
                ('Deadline nộp tài liệu', 'Nộp tài liệu yêu cầu', 'DEADLINE', '2026-07-13', '2026-07-13', '17:00', '17:00', 'Online', 'ALL_STUDENTS', 1, NOW(), NOW())
        `);
        console.log('✅ Tạo lịch cho hôm nay (13/7)');

        // Xem lịch
        const [schedules] = await connection.query('SELECT * FROM schedules WHERE audience = "ALL_STUDENTS"');
        console.log('\n📅 Tất cả lịch ALL_STUDENTS:', JSON.stringify(schedules, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

addTodaySchedule();
