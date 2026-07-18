const Meeting = require('../models/meeting');
const { Op } = require('sequelize');

const validateMeeting = (data) => {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date());
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (data.meetingDate && data.meetingDate < today) {
        throw new Error('Ngày họp không được nhỏ hơn hôm nay');
    }
    if (!data.meetingTime || !timePattern.test(String(data.meetingTime).slice(0, 5))) {
        throw new Error('Giờ bắt đầu không hợp lệ');
    }
    if (!data.endTime || !timePattern.test(String(data.endTime).slice(0, 5))) {
        throw new Error('Giờ kết thúc không hợp lệ');
    }
    if (data.meetingTime >= data.endTime) {
        throw new Error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
    }
};

const createMeeting = async (data) => {
    if (!data.title || !data.meetingDate) {
        throw new Error('Thiếu thông tin cuộc họp');
    }

    validateMeeting(data);
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
    validateMeeting({
        meetingDate: data.meetingDate ?? meeting.meetingDate,
        meetingTime: data.meetingTime ?? meeting.meetingTime,
        endTime: data.endTime ?? meeting.endTime
    });
    return meeting.update(data);
};

const deleteMeeting = async (id) => {
    const meeting = await getMeetingById(id);
    await meeting.destroy();
    return true;
};

module.exports = { createMeeting, getMeetings, getMeetingById, updateMeeting, deleteMeeting };