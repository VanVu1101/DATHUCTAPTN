const checkInService = require('../services/checkIn');

const submitCheckIn = async (req, res) => {
    try {
        const payload = { ...req.body, userId: req.user.id };
        console.log('submitCheckIn payload:', payload);
        const checkin = await checkInService.createCheckIn(payload);
        res.status(201).json({ success: true, data: checkin });
    } catch (error) {
        console.error('submitCheckIn error:', error && error.stack ? error.stack : error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const submitCheckOut = async (req, res) => {
    try {
        const payload = { ...req.body, userId: req.user.id };
        const checkin = await checkInService.recordCheckOut(payload);
        res.status(200).json({ success: true, data: checkin });
    } catch (error) {
        console.error('submitCheckOut error:', error && error.stack ? error.stack : error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const getMyCheckIns = async (req, res) => {
    try {
        const checkins = await checkInService.getCheckInsByUser(req.user.id);
        res.status(200).json({ success: true, data: checkins });
    } catch (error) {
        console.error('getMyCheckIns error:', error && error.stack ? error.stack : error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAdminSummary = async (req, res) => {
    try {
        const data = await checkInService.getAdminSummary(req.query.periodId || null);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAdminDetail = async (req, res) => {
    try {
        if (!req.query.studentId) {
            return res.status(400).json({ success: false, message: 'Thiếu studentId' });
        }
        const data = await checkInService.getAdminDetail(req.query);
        res.json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    submitCheckIn,
    submitCheckOut,
    getMyCheckIns,
    getAdminSummary,
    getAdminDetail
};