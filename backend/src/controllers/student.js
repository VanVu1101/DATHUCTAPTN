const studentService = require('../services/student');

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
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyProfile = async (req, res) => {
    try {
        const profile = await studentService.getMyProfile(req.user.id);
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const profile = await studentService.updateMyProfile(req.user.id, req.body);
        res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyProfileDocuments = async (req, res) => {
    try {
        const documents = await studentService.getProfileDocuments(req.user.id);
        res.status(200).json({ success: true, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadProfileDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file để upload' });
        }
        const document = await studentService.uploadProfileDocument(req.user.id, req.body, req.file);
        res.status(201).json({ success: true, message: 'Đã upload tài liệu hồ sơ', data: document });
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
        const profile = await studentService.uploadProfileImage(req.user.id, req.file);
        res.status(200).json({ success: true, message: 'Đã cập nhật ảnh hồ sơ', data: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
        const updateData = {
            mentorId: req.body.mentorId
        };
        if (req.body.mentorName) updateData.mentorName = req.body.mentorName;
        const student = await studentService.updateStudent(req.params.id, updateData);
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
    deleteStudent
};