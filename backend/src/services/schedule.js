const Schedule = require('../models/schedule');

const createSchedule = async (data) => {
    if (!data.title || !data.startDate || !data.endDate) {
        throw new Error('Thiếu thông tin lịch làm việc');
    }

    return Schedule.create(data);
};

const getSchedules = async (filters = {}) => {
    const where = {};

    if (filters.periodId) {
        where.periodId = filters.periodId;
    }

    return Schedule.findAll({
        where,
        order: [['startDate', 'ASC'], ['startTime', 'ASC']]
    });
};

const getScheduleById = async (id) => {
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
        throw new Error('Không tìm thấy lịch này');
    }
    return schedule;
};

const updateSchedule = async (id, data) => {
    const schedule = await getScheduleById(id);
    return schedule.update(data);
};

const deleteSchedule = async (id) => {
    const schedule = await getScheduleById(id);
    await schedule.destroy();
    return true;
};

module.exports = { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule };