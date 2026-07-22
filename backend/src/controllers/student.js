const studentService = require('../services/student');
const Major = require('../models/major');

const getStudents = async (req, res) => {
    try {
        const filters = {
            periodId: req.query.periodId,
            mentorId: req.query.mentorId,
            status: req.query.status,
            search: req.query.search
        };
        const students = await studentService.getStudents(filters);
        res.status(200).json({ success: true, data: students });
    } catch (error) {
        console.error('getStudents error:', error && error.stack ? error.stack : error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyProfile = async (req, res) => {
    try {
        const profile = await studentService.getMyProfile(req.user.id);
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        console.error('getMyProfile error:', error && error.stack ? error.stack : error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const profile = await studentService.updateMyProfile(req.user.id, req.body);
        res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data: profile });
    } catch (error) {
        console.error('updateMyProfile error:', error?.message || error);
        console.error('updateMyProfile error details:', error?.errors || error?.stack || error);
        console.error('updateMyProfile payload:', req.body);
        res.status(500).json({ success: false, message: error.message || 'Lỗi cập nhật hồ sơ' });
    }
};

const getMyProfileDocuments = async (req, res) => {
    try {
        const documents = await studentService.getProfileDocuments(req.user.id);
        res.status(200).json({ success: true, data: documents });
    } catch (error) {
        console.error('getMyProfileDocuments error:', error && error.stack ? error.stack : error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadProfileDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file để upload' });
        }
        const document = await studentService.uploadProfileDocument(req.user.id, req.body, req.file);
        res.status(201).json({
            success: true,
            message: 'Đã upload tài liệu hồ sơ và gửi thông báo xác nhận qua email',
            data: document
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteProfileDocument = async (req, res) => {
    try {
        const deleted = await studentService.deleteProfileDocument(req.user.id, req.params.id);
        res.status(200).json({ success: true, message: 'Đã xóa tài liệu', data: deleted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh để upload' });
        }
        console.log('uploadProfileImage: received file', {
            userId: req.user?.id,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        const profile = await studentService.uploadProfileImage(req.user.id, req.file);
        console.log('uploadProfileImage: updated profile for user', req.user?.id, 'profileImageUrl:', profile?.profileImageUrl || profile?.data?.profileImageUrl || 'N/A');
        res.status(200).json({ success: true, message: 'Đã cập nhật ảnh hồ sơ', data: profile });
    } catch (error) {
        console.error('uploadProfileImage error:', error && error.stack ? error.stack : error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi upload ảnh hồ sơ' });
    }
};

const getStudentById = async (req, res) => {
    try {
        const student = await studentService.getStudentById(req.params.id);
        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const createStudent = async (req, res) => {
    try {
        const student = await studentService.createStudent(req.body);
        res.status(201).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateStudent = async (req, res) => {
    try {
        const student = await studentService.updateStudent(req.params.id, req.body);
        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const assignStudentPeriod = async (req, res) => {
    try {
        const student = await studentService.updateStudent(req.params.id, { periodId: req.body.periodId });
        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const assignStudentMentor = async (req, res) => {
    try {
        if (!req.body.mentorId) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn mentor' });
        }
        const student = await studentService.assignMentor(
            req.params.id,
            req.body.mentorId,
            req.user
        );
        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteStudent = async (req, res) => {
    try {
        await studentService.deleteStudent(req.params.id);
        res.status(200).json({ success: true, message: 'Xóa sinh viên thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getMajors = async (req, res) => {
    try {
        const majors = await Major.findAll({
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: majors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createMajor = async (req, res) => {
    try {
        const major = await Major.create({
            name: req.body.name,
            description: req.body.description || ''
        });
        res.status(201).json({ success: true, data: major });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateMajor = async (req, res) => {
    try {
        const major = await Major.findByPk(req.params.id);
        if (!major) return res.status(404).json({ success: false, message: 'Không tìm thấy chuyên ngành' });
        await major.update({
            name: req.body.name ?? major.name,
            description: req.body.description ?? major.description
        });
        res.status(200).json({ success: true, data: major });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteMajor = async (req, res) => {
    try {
        const major = await Major.findByPk(req.params.id);
        if (!major) return res.status(404).json({ success: false, message: 'Không tìm thấy chuyên ngành' });
        await major.destroy();
        res.status(200).json({ success: true, message: 'Đã xóa chuyên ngành' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getStudents,
    getMyProfile,
    updateMyProfile,
    getMyProfileDocuments,
    uploadProfileDocument,
    deleteProfileDocument,
    uploadProfileImage,
    getStudentById,
    createStudent,
    updateStudent,
    assignStudentPeriod,
    assignStudentMentor,
    deleteStudent,
    getMajors,
    createMajor,
    updateMajor,
    deleteMajor
};

const saveProfileImageKey = async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ success: false, message: 'key is required' });
        const profile = await studentService.saveProfileImageKey(req.user.id, key);
        res.status(200).json({ success: true, message: 'Đã lưu key ảnh hồ sơ', data: profile });
    } catch (error) {
        console.error('saveProfileImageKey error:', error && error.stack ? error.stack : error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi lưu key ảnh' });
    }
};

module.exports.saveProfileImageKey = saveProfileImageKey;
