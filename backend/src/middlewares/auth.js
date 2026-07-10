const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Lấy token từ header của request
    // Định dạng gửi lên thường là: "Bearer eyJhbGciOiJIUzI1NiIsIn..."
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Truy cập bị từ chối! Không tìm thấy Token.' 
        });
    }

    try {
        // 2. Giải mã token bằng chuỗi bí mật trong file .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        
        // 3. Gắn thông tin user vừa giải mã vào request để các Controller có thể dùng
        req.user = decoded; 
        
        // 4. Cho phép đi tiếp vào Controller
        next(); 
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Token không hợp lệ hoặc đã hết hạn!' 
        });
    }
};

// Middleware kiểm tra quyền (Ví dụ: Chỉ ADMIN mới được xóa sinh viên)
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện hành động này!'
            });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };