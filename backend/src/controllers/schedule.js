const scheduleService = require('../services/schedule');

const createSchedule = async (req, res) => {
    try {
        console.log('POST /schedules create called by user:', req.user?.id, 'body:', req.body);
        const schedule = await scheduleService.createSchedule({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: schedule });
    } catch (error) {
        console.error('schedule.create error, user:', req.user?.id, 'body:', req.body, '\n', error && error.stack ? error.stack : error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const getSchedules = async (req, res) => {
    try {
        const { periodId, page, limit } = req.query;

        // If pagination params are provided, return paginated result
        if (page !== undefined || limit !== undefined) {
            const p = parseInt(page || '1', 10) || 1;
            const l = parseInt(limit || '20', 10) || 20;
            const result = await scheduleService.getSchedules({ periodId, page: p, limit: l });
            return res.status(200).json({ success: true, data: result });
        }

        // Backwards-compatible: return array as before
        const schedules = await scheduleService.getSchedules({ periodId });
        res.status(200).json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getScheduleById = async (req, res) => {
    try {
        const schedule = await scheduleService.getScheduleById(req.params.id);
        res.status(200).json({ success: true, data: schedule });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const updateSchedule = async (req, res) => {
    try {
        const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
        res.status(200).json({ success: true, data: schedule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteSchedule = async (req, res) => {
    try {
        console.log('DELETE /schedules called by user:', req.user?.id, 'id:', req.params.id);
        const result = await scheduleService.deleteSchedule(req.params.id);
        console.log('schedule.delete result for id', req.params.id, '=>', result);
        res.status(200).json({ success: true, message: 'Xóa lịch thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule };