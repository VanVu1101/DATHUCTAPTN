const mysql = require('mysql2/promise');

async function fixCharset() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'internship_management',
        multipleStatements: true
    });

    try {
        const sql = `
            ALTER TABLE schedules CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE check_ins CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE evaluations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE internships CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE internship_periods CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE majors CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE meetings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE mentors CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE period_documents CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE positions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE reports CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE students CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE student_documents CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE tasks CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE weekly_reports CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `;

        await connection.query(sql);
        console.log('✅ All tables converted to utf8mb4 successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixCharset();
