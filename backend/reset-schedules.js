const mysql = require('mysql2/promise');

async function resetSchedules() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'internship_management'
    });

    try {
        // Xóa lịch cũ
        await connection.query('DELETE FROM schedules');
        console.log('✅ Xóa lịch cũ');

        // Xóa cuộc họp cũ
        await connection.query('DELETE FROM meetings');
        console.log('✅ Xóa cuộc họp cũ');

        // Tạo internship_period
        const [result] = await connection.query(`
            INSERT INTO internship_periods (name, academicYear, startDate, endDate, description, createdAt, updatedAt)
            VALUES ('Kỳ thực tập hè 2026', '2025-2026', '2026-07-01', '2026-09-30', 'Kỳ thực tập hè', NOW(), NOW())
        `);
        
        const periodId = result.insertId;
        console.log('✅ Tạo internship period:', periodId);

        // Tạo lịch mới
        await connection.query(`
            INSERT INTO schedules (title, description, type, startDate, endDate, startTime, endTime, location, audience, periodId, createdBy, createdAt, updatedAt)
            VALUES 
                ('Lịch họp khởi động', 'Họp khởi động kỳ thực tập', 'MEETING', '2026-07-15', '2026-07-15', '09:00', '10:30', 'Phòng họp A', 'ALL_STUDENTS', NULL, 1, NOW(), NOW()),
                ('Deadline nộp báo cáo tuần 1', 'Nộp báo cáo tiến độ', 'DEADLINE', '2026-07-19', '2026-07-19', '17:00', '17:00', 'Online', 'ALL_STUDENTS', NULL, 1, NOW(), NOW()),
                ('Lịch họp giữa kỳ', 'Đánh giá tiến độ thực tập', 'MEETING', '2026-08-01', '2026-08-01', '14:00', '15:30', 'Phòng họp B', 'ALL_STUDENTS', NULL, 1, NOW(), NOW())
        `);
        console.log('✅ Tạo lịch mới');

        console.log('\n✅ Done! Hãy reload app để xem lịch mới');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

resetSchedules();
