const scheduleService = require('../services/schedule');

const createSchedule = async (req, res) => {
    try {
        const schedule = await scheduleService.createSchedule({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: schedule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getSchedules = async (req, res) => {
    try {
        const schedules = await scheduleService.getSchedules({ periodId: req.query.periodId });
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
        await scheduleService.deleteSchedule(req.params.id);
        res.status(200).json({ success: true, message: 'Xóa lịch thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule };