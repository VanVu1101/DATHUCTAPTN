require('dotenv').config();
const sequelize = require('./src/config/database');
const Student = require('./src/models/student');
const User = require('./src/models/user');
const Major = require('./src/models/major');
const InternshipPeriod = require('./src/models/internshipPeriod');

// Set up associations (normally done in server.js)
User.hasOne(Student, { foreignKey: 'userId' });
Student.belongsTo(User, { foreignKey: 'userId' });

Major.hasMany(Student, { foreignKey: 'majorId' });
Student.belongsTo(Major, { foreignKey: 'majorId' });

InternshipPeriod.hasMany(Student, { foreignKey: 'periodId' });
Student.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

async function test() {
    try {
        // Check if database is connected
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Check majors
        const majors = await Major.findAll();
        console.log('📚 Majors in DB:', majors.length, majors.map(m => ({ id: m.id, name: m.name })));

        // Check users
        const users = await User.findAll({ attributes: ['id', 'email', 'role'] });
        console.log('👥 Users in DB:', users.length, users.map(u => ({ id: u.id, email: u.email })));

        // Check students
        const students = await Student.findAll({ attributes: ['id', 'userId', 'studentCode', 'fullName'] });
        console.log('🎓 Students in DB:', students.length, students.map(s => ({ id: s.id, userId: s.userId, code: s.studentCode })));

        // Try to create a student for user ID 2
        if (users.length > 1) {
            const testUser = users[1];
            console.log(`\n🔍 Testing getMyProfile for user ${testUser.id} (${testUser.email})...`);
            
            const studentService = require('./src/services/student');
            const profile = await studentService.getMyProfile(testUser.id);
            console.log('✅ Profile created successfully:', { id: profile.id, code: profile.studentCode });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
    }
}

test();
