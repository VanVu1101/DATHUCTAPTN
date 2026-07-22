require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { DataTypes } = require('sequelize');

// 1. Import config và models
const sequelize = require('./src/config/database');
const User = require('./src/models/user'); 
const Major = require('./src/models/major');
const Student = require('./src/models/student');
const InternshipPeriod = require('./src/models/internshipPeriod');
const Position = require('./src/models/position');
const Mentor = require('./src/models/mentor');
const Internship = require('./src/models/internship');
const WeeklyReport = require('./src/models/weeklyReport');
const Task = require('./src/models/task');
const Report = require('./src/models/report');
const PeriodDocument = require('./src/models/periodDocument');
const StudentDocument = require('./src/models/studentDocument');
const Evaluation = require('./src/models/evaluation');
const Notification = require('./src/models/notification');
const CheckIn = require('./src/models/checkIn');
const Schedule = require('./src/models/schedule');
const Meeting = require('./src/models/meeting');
const ChatConversation = require('./src/models/chatConversation');
const ChatMessage = require('./src/models/chatMessage');

const app = express();
const httpServer = http.createServer(app);
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});
app.set('io', io);
require('./src/sockets/chat.socket')(io);

// Middlewares cơ bản
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- THIẾT LẬP MỐI QUAN HỆ CÁC BẢNG (ASSOCIATIONS) ---
User.hasOne(Student, { foreignKey: 'userId' });
Student.belongsTo(User, { foreignKey: 'userId' });

Major.hasMany(Student, { foreignKey: 'majorId' });
Student.belongsTo(Major, { foreignKey: 'majorId' });

InternshipPeriod.hasMany(Student, { foreignKey: 'periodId' });
Student.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

// Mentor liên kết với User
User.hasOne(Mentor, { foreignKey: 'userId' });
Mentor.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Mentor, { foreignKey: 'ownerUserId', as: 'ManagedMentors' });
Mentor.belongsTo(User, { foreignKey: 'ownerUserId', as: 'Owner' });

// Thiết lập quan hệ cho bảng Phân công (Internships)
Student.hasMany(Internship, { foreignKey: 'studentId' });
Internship.belongsTo(Student, { foreignKey: 'studentId' });

Student.hasMany(Task, { foreignKey: 'studentId' });
Task.belongsTo(Student, { foreignKey: 'studentId' });

InternshipPeriod.hasMany(Internship, { foreignKey: 'periodId' });
Internship.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

Position.hasMany(Internship, { foreignKey: 'positionId' });
Internship.belongsTo(Position, { foreignKey: 'positionId' });

Mentor.hasMany(Student, { foreignKey: 'mentorId' });
Student.belongsTo(Mentor, { foreignKey: 'mentorId' });

Mentor.hasMany(Internship, { foreignKey: 'mentorId' });
Internship.belongsTo(Mentor, { foreignKey: 'mentorId' });

Student.hasMany(Report, { foreignKey: 'studentId' });
Report.belongsTo(Student, { foreignKey: 'studentId' });

// --- QUAN HỆ MODULE 3 ---
Internship.hasMany(Task, { foreignKey: 'internshipId' });
Task.belongsTo(Internship, { foreignKey: 'internshipId' });

Internship.hasMany(Report, { foreignKey: 'internshipId' });
Report.belongsTo(Internship, { foreignKey: 'internshipId' });

Internship.hasOne(Evaluation, { foreignKey: 'internshipId' });
Evaluation.belongsTo(Internship, { foreignKey: 'internshipId' });

Mentor.hasMany(Evaluation, { foreignKey: 'mentorId' });
Evaluation.belongsTo(Mentor, { foreignKey: 'mentorId' });

// --- QUAN HỆ MODULE 4 ---
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

Internship.hasMany(CheckIn, { foreignKey: 'internshipId' });
CheckIn.belongsTo(Internship, { foreignKey: 'internshipId' });

InternshipPeriod.hasMany(Schedule, { foreignKey: 'periodId' });
Schedule.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

InternshipPeriod.hasMany(Meeting, { foreignKey: 'periodId' });
Meeting.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

InternshipPeriod.hasMany(WeeklyReport, { foreignKey: 'periodId' });
WeeklyReport.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

WeeklyReport.hasMany(Report, { foreignKey: 'weeklyReportId' });
Report.belongsTo(WeeklyReport, { foreignKey: 'weeklyReportId' });

InternshipPeriod.hasMany(PeriodDocument, { foreignKey: 'periodId' });
PeriodDocument.belongsTo(InternshipPeriod, { foreignKey: 'periodId' });

Student.hasMany(StudentDocument, { foreignKey: 'studentId' });
StudentDocument.belongsTo(Student, { foreignKey: 'studentId' });

// --- QUAN HỆ CHAT REALTIME ---
Internship.hasOne(ChatConversation, { foreignKey: 'internshipId' });
ChatConversation.belongsTo(Internship, { foreignKey: 'internshipId' });

ChatConversation.hasMany(ChatMessage, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversationId' });

User.hasMany(ChatConversation, { foreignKey: 'studentUserId', as: 'StudentConversations' });
ChatConversation.belongsTo(User, { foreignKey: 'studentUserId', as: 'StudentUser' });
User.hasMany(ChatConversation, { foreignKey: 'mentorUserId', as: 'MentorConversations' });
ChatConversation.belongsTo(User, { foreignKey: 'mentorUserId', as: 'MentorUser' });
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'SentChatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

// --- ĐĂNG KÝ CÁC ROUTES ---
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/student');
const periodRoutes = require('./src/routes/internshipPeriod');
const reportRoutes = require('./src/routes/report');
const reportReviewRoutes = require('./src/routes/reportReview');
const taskRoutes = require('./src/routes/task');
const dashboardRoutes = require('./src/routes/dashboard');
const checkInRoutes = require('./src/routes/checkIn');
const scheduleRoutes = require('./src/routes/schedule');
const meetingRoutes = require('./src/routes/meeting');
const evaluationRoutes = require('./src/routes/evaluation');
const notificationRoutes = require('./src/routes/notification');
const chatRoutes = require('./src/routes/chat');
const mentorRoutes = require('./src/routes/mentor');
const uploadRoutes = require('./src/routes/upload');
const studentGoalRoutes = require('./src/routes/studentGoal');
const userRoutes = require('./src/routes/user');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports-review', reportReviewRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/checkins', checkInRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/goals', studentGoalRoutes);
app.use('/api/users', userRoutes);

// 2. Đồng bộ Database an toàn: tạo bảng mới nếu chưa có, và bổ sung cột thiếu cho bảng tasks
const ensureTaskTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const taskTable = await queryInterface.describeTable('tasks').catch(() => null);

        if (!taskTable) {
            return;
        }

        const columnsToAdd = [
            ['studentId', { type: DataTypes.INTEGER, allowNull: true }],
            ['fileUrl', { type: DataTypes.STRING, allowNull: true }],
            ['fileName', { type: DataTypes.STRING, allowNull: true }],
            ['fileType', { type: DataTypes.STRING, allowNull: true }],
            ['submissionComment', { type: DataTypes.TEXT, allowNull: true }],
            ['submittedAt', { type: DataTypes.DATE, allowNull: true }],
            ['assignedAt', { type: DataTypes.DATE, allowNull: true }],
            ['category', { type: DataTypes.STRING, allowNull: true }],
            ['taskCode', { type: DataTypes.STRING, allowNull: true }],
            ['priority', { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'), allowNull: true, defaultValue: 'MEDIUM' }]
        ];

        for (const [columnName, definition] of columnsToAdd) {
            if (!taskTable[columnName]) {
                await queryInterface.addColumn('tasks', columnName, definition);
                console.log(`✅ Đã thêm cột ${columnName} vào bảng tasks`);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra/bổ sung cột bảng tasks:', error);
    }
};

const ensureStudentTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const studentTable = await queryInterface.describeTable('students').catch(() => null);

        if (!studentTable) {
            return;
        }

        const columnsToAdd = [
            ['mentorId', { type: DataTypes.INTEGER, allowNull: true }],
            ['status', { type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'COMPLETED'), allowNull: true, defaultValue: 'ACTIVE' }],
            ['profileImageUrl', { type: DataTypes.STRING, allowNull: true }]
        ];

        for (const [columnName, definition] of columnsToAdd) {
            if (!studentTable[columnName]) {
                await queryInterface.addColumn('students', columnName, definition);
                console.log(`✅ Đã thêm cột ${columnName} vào bảng students`);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra/bổ sung cột bảng students:', error);
    }
};

const ensureUserTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const userTable = await queryInterface.describeTable('users').catch(() => null);

        if (!userTable) {
            return;
        }

        if (!userTable.profileImageUrl) {
            await queryInterface.addColumn('users', 'profileImageUrl', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ Đã thêm cột profileImageUrl vào bảng users');
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra/bổ sung cột bảng users:', error);
    }
};

const ensureReportTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const reportTable = await queryInterface.describeTable('reports').catch(() => null);

        if (!reportTable) {
            return;
        }

        const columnsToAdd = [
            ['studentId', { type: DataTypes.INTEGER, allowNull: true }]
        ];

        for (const [columnName, definition] of columnsToAdd) {
            if (!reportTable[columnName]) {
                await queryInterface.addColumn('reports', columnName, definition);
                console.log(`✅ Đã thêm cột ${columnName} vào bảng reports`);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra/bổ sung cột bảng reports:', error);
    }
};

const ensureEvaluationTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const evalTable = await queryInterface.describeTable('evaluations').catch(() => null);

        if (!evalTable) return;

        const columnsToAdd = [
            ['criteria', { type: DataTypes.JSON, allowNull: true }]
        ];

        for (const [columnName, definition] of columnsToAdd) {
            if (!evalTable[columnName]) {
                await queryInterface.addColumn('evaluations', columnName, definition);
                console.log(`✅ Đã thêm cột ${columnName} vào bảng evaluations`);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra/bổ sung cột bảng evaluations:', error);
    }
};

const ensureNotificationTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const notifTable = await queryInterface.describeTable('notifications').catch(() => null);

        if (!notifTable) {
            return;
        }

        const columnsToAdd = [
            ['type', { type: DataTypes.STRING, allowNull: true }],
            ['data', { type: DataTypes.JSON, allowNull: true }],
            ['read', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }]
        ];

        for (const [columnName, definition] of columnsToAdd) {
            if (!notifTable[columnName]) {
                await queryInterface.addColumn('notifications', columnName, definition);
                console.log(`✅ Đã thêm cột ${columnName} vào bảng notifications`);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra/bổ sung cột bảng notifications:', error);
    }
};

const ensureMentorTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const mentorTable = await queryInterface.describeTable('mentors').catch(() => null);
        if (mentorTable && !mentorTable.ownerUserId) {
            await queryInterface.addColumn('mentors', 'ownerUserId', {
                type: DataTypes.INTEGER,
                allowNull: true
            });
            console.log('✅ Đã thêm cột ownerUserId vào bảng mentors');
        }
    } catch (error) {
        console.error('❌ Lỗi khi bổ sung bảng mentors:', error);
    }
};

const ensureWeeklyReportTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const table = await queryInterface.describeTable('weekly_reports').catch(() => null);
        if (!table) return;
        if (!table.attachmentUrl) {
            await queryInterface.addColumn('weekly_reports', 'attachmentUrl', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }
        if (!table.attachmentName) {
            await queryInterface.addColumn('weekly_reports', 'attachmentName', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }
    } catch (error) {
        console.error('❌ Lỗi khi bổ sung bảng weekly_reports:', error);
    }
};

const ensureMeetingTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const table = await queryInterface.describeTable('meetings').catch(() => null);
        if (table && !table.endTime) {
            await queryInterface.addColumn('meetings', 'endTime', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }
    } catch (error) {
        console.error('❌ Lỗi khi bổ sung bảng meetings:', error);
    }
};

const ensureCheckInTableColumns = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const table = await queryInterface.describeTable('check_ins').catch(() => null);
        if (!table) return;
        if (!table.photoUrl) {
            await queryInterface.addColumn('check_ins', 'photoUrl', { type: DataTypes.STRING, allowNull: true });
            console.log('✅ Đã thêm cột photoUrl vào bảng check_ins');
        }
        if (!table.geoLat) {
            await queryInterface.addColumn('check_ins', 'geoLat', { type: DataTypes.FLOAT, allowNull: true });
            console.log('✅ Đã thêm cột geoLat vào bảng check_ins');
        }
        if (!table.geoLng) {
            await queryInterface.addColumn('check_ins', 'geoLng', { type: DataTypes.FLOAT, allowNull: true });
            console.log('✅ Đã thêm cột geoLng vào bảng check_ins');
        }
    } catch (error) {
        console.error('❌ Lỗi khi bổ sung bảng check_ins:', error);
    }
};

sequelize.sync()
    .then(async () => {
        await ensureTaskTableColumns();
        await ensureStudentTableColumns();
        await ensureUserTableColumns();
        await ensureReportTableColumns();
        await ensureEvaluationTableColumns();
        await ensureNotificationTableColumns();
        await ensureMentorTableColumns();
        await ensureWeeklyReportTableColumns();
        await ensureMeetingTableColumns();
        await ensureCheckInTableColumns();
        console.log('✅ Đã đồng bộ các bảng trong MySQL!');
    })
    .catch(err => console.error('❌ Lỗi đồng bộ bảng:', err));

// Start automation: reminders for upcoming schedules/meetings
const { notifyUpcomingEvents } = require('./src/services/checkInAutomation');
setInterval(() => {
    notifyUpcomingEvents({ lookaheadMinutes: 30, notifyBeforeMinutes: 15 });
}, 60 * 1000 * 5); // every 5 minutes

// 3. Khởi chạy Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});