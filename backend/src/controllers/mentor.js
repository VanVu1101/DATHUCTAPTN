const mentorService = require('../services/mentor');

const handleError = (res, error, status = 400) => (
    res.status(status).json({ success: false, message: error.message })
);

const list = async (req, res) => {
    try {
        res.json({ success: true, data: await mentorService.listMentors(req.user) });
    } catch (error) {
        handleError(res, error, 500);
    }
};

const create = async (req, res) => {
    try {
        const mentor = await mentorService.createMentor(req.user, req.body);
        res.status(201).json({ success: true, message: 'Đã tạo tài khoản mentor.', data: mentor });
    } catch (error) {
        handleError(res, error);
    }
};

const update = async (req, res) => {
    try {
        const mentor = await mentorService.updateMentor(req.user, req.params.id, req.body);
        res.json({ success: true, message: 'Đã cập nhật mentor.', data: mentor });
    } catch (error) {
        handleError(res, error);
    }
};

const remove = async (req, res) => {
    try {
        await mentorService.deleteMentor(req.user, req.params.id);
        res.json({ success: true, message: 'Đã xóa mentor.' });
    } catch (error) {
        handleError(res, error);
    }
};

const assignedStudents = async (req, res) => {
    try {
        res.json({ success: true, data: await mentorService.getAssignedStudents(req.user) });
    } catch (error) {
        handleError(res, error, 500);
    }
};

const companyStudents = async (req, res) => {
    try {
        res.json({ success: true, data: await mentorService.getCompanyStudents(req.user) });
    } catch (error) {
        handleError(res, error, 500);
    }
};

module.exports = { list, create, update, remove, assignedStudents, companyStudents };
