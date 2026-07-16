const Meeting = require('../models/meeting');
const { Op } = require('sequelize');

const createMeeting = async (data) => {
    if (!data.title || !data.meetingDate) {
        throw new Error('Thiếu thông tin cuộc họp');
    }

    return Meeting.create(data);
};

const getMeetings = async (filters = {}) => {
    const where = {};

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

    return Meeting.findAll({
        where,
        order: [['meetingDate', 'ASC'], ['meetingTime', 'ASC']]
    });
};

const getMeetingById = async (id) => {
    const meeting = await Meeting.findByPk(id);
    if (!meeting) {
        throw new Error('Không tìm thấy cuộc họp này');
    }
    return meeting;
};

const updateMeeting = async (id, data) => {
    const meeting = await getMeetingById(id);
    return meeting.update(data);
};

const deleteMeeting = async (id) => {
    const meeting = await getMeetingById(id);
    await meeting.destroy();
    return true;
};

module.exports = { createMeeting, getMeetings, getMeetingById, updateMeeting, deleteMeeting };