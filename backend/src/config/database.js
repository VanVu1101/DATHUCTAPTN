const { Sequelize } = require('sequelize');
require('dotenv').config();

// Khởi tạo kết nối Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false // Tắt log câu lệnh SQL trên terminal cho đỡ rối
    }
);

// Test kết nối
sequelize.authenticate()
    .then(() => console.log('✅ Đã kết nối thành công tới MySQL (Sequelize)!'))
    .catch(err => console.error('❌ Lỗi kết nối Database:', err));

module.exports = sequelize;