const periodService = require('../services/internshipPeriod');

const createPeriod = async (req, res) => {
    try {
        const newPeriod = await periodService.createPeriod(req.body);
        res.status(201).json({ success: true, message: 'Tạo đợt thực tập thành công', data: newPeriod });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllPeriods = async (req, res) => {
    try {
        const periods = await periodService.getAllPeriods(req.query);
        res.status(200).json({ success: true, data: periods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPeriodById = async (req, res) => {
    try {
        const period = await periodService.getPeriodById(req.params.id);
        res.status(200).json({ success: true, data: period });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const updatePeriod = async (req, res) => {
    try {
        const updatedPeriod = await periodService.updatePeriod(req.params.id, req.body);
        res.status(200).json({ success: true, message: 'Cập nhật thành công', data: updatedPeriod });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deletePeriod = async (req, res) => {
    try {
        await periodService.deletePeriod(req.params.id);
        res.status(200).json({ success: true, message: 'Xóa đợt thực tập thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const uploadPeriodDocument = async (req, res) => {
    try {
        const document = await periodService.createPeriodDocument(req.params.id, req.body, req.file, req.user.id);
        res.status(201).json({ success: true, message: 'Đã upload tài liệu kỳ thực tập', data: document });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createPeriod,
    getAllPeriods,
    getPeriodById,
    updatePeriod,
    deletePeriod,
    uploadPeriodDocument
};
