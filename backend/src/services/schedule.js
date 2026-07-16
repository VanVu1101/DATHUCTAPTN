const Schedule = require('../models/schedule');
const { Op } = require('sequelize');

const createSchedule = async (data) => {
    if (!data.title || !data.startDate || !data.endDate) {
        throw new Error('Thiếu thông tin lịch làm việc');
    }

    if (data.audience === 'SPECIFIC_PERIOD' && !data.periodId) {
        throw new Error('Vui lòng chọn kỳ thực tập cho lịch theo kỳ.');
    }

    return Schedule.create(data);
};

const getSchedules = async (filters = {}) => {
    const where = {};

    console.log('🔍 getSchedules called with filters:', filters);

    // Nếu có periodId, filter theo period hoặc show ALL_STUDENTS
    if (filters.periodId) {
        where[Op.or] = [
            { periodId: filters.periodId },
            { audience: 'ALL_STUDENTS' }
        ];
    } else {
        // Không có periodId, chỉ show ALL_STUDENTS
        where.audience = 'ALL_STUDENTS';
    }

    console.log('📋 Query where:', JSON.stringify(where));

    const result = await Schedule.findAll({
        where,
        order: [['startDate', 'ASC'], ['startTime', 'ASC']]
    });

    console.log('✅ Found schedules:', result.map(s => ({ id: s.id, title: s.title, startDate: s.startDate, endDate: s.endDate, audience: s.audience })));

    return result;
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