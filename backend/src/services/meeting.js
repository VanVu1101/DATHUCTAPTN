const Meeting = require('../models/meeting');
const { Op } = require('sequelize');

const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const text = String(value).trim();
    // accept HH:MM, H:MM, HHMM, HMM, '9:00', '09:00'
    const colon = text.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/);
    if (colon) {
        const h = Number(colon[1]);
        const m = Number(colon[2]);
        if (Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
        return null;
    }
    const numeric = text.match(/^\s*(\d{1,2})(\d{2})\s*$/);
    if (numeric) {
        const h = Number(numeric[1]);
        const m = Number(numeric[2]);
        if (Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
        return null;
    }
    return null;
};

const toHHMM = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const validateMeeting = (data) => {
    // date check: use local date in Asia/Ho_Chi_Minh
    const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const meetingDateStr = data.meetingDate || null;
    if (meetingDateStr) {
        const meetingDate = new Date(meetingDateStr);
        const todayDate = new Date(todayParts);
        // compare date-only
        meetingDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        if (meetingDate < todayDate) throw new Error('Ngày họp không được nhỏ hơn hôm nay');
    }

    if (data.audience === 'SPECIFIC_PERIOD' && (data.periodId === null || data.periodId === undefined)) {
        throw new Error('Vui lòng chọn kỳ thực tập cho cuộc họp theo kỳ.');
    }

    const startMins = parseTimeToMinutes(data.meetingTime);
    const endMins = parseTimeToMinutes(data.endTime || data.meetingEndTime);
    if (startMins == null) throw new Error('Giờ bắt đầu không hợp lệ');
    if (endMins == null) throw new Error('Giờ kết thúc không hợp lệ');
    if (startMins >= endMins) throw new Error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');

    // normalize back into data for storage
    data.meetingTime = toHHMM(startMins);
    data.endTime = toHHMM(endMins);
};

const createMeeting = async (data) => {
    if (!data.title || !data.meetingDate) {
        throw new Error('Thiếu thông tin cuộc họp');
    }

    validateMeeting(data);

    const existingMeeting = await Meeting.findOne({
        where: {
            meetingDate: data.meetingDate,
            audience: data.audience,
            ...(data.audience === 'SPECIFIC_PERIOD' ? { periodId: data.periodId } : {})
        }
    });
    if (existingMeeting) {
        throw new Error('Đã có cuộc họp trùng ngày cho cùng đối tượng.');
    }

    return Meeting.create(data);
};

const getMeetings = async (filters = {}) => {
    const where = {};

    // Nếu có periodId, filter theo period hoặc show ALL_STUDENTS
    if (filters.periodId) {
        where[Op.or] = [
            { audience: 'ALL_STUDENTS' },
            { audience: 'SPECIFIC_PERIOD', periodId: filters.periodId }
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
        endTime: data.endTime ?? meeting.endTime,
        audience: data.audience ?? meeting.audience,
        periodId: data.periodId !== undefined ? data.periodId : meeting.periodId,
    });

    const updatedMeetingDate = data.meetingDate ?? meeting.meetingDate;
    const updatedAudience = data.audience ?? meeting.audience;
    const updatedPeriodId = data.periodId !== undefined ? data.periodId : meeting.periodId;

    const existingMeeting = await Meeting.findOne({
        where: {
            id: { [Op.ne]: meeting.id },
            meetingDate: updatedMeetingDate,
            audience: updatedAudience,
            ...(updatedAudience === 'SPECIFIC_PERIOD' ? { periodId: updatedPeriodId } : {})
        }
    });
    if (existingMeeting) {
        throw new Error('Cập nhật gây trùng ngày họp với cuộc họp khác.');
    }

    return meeting.update(data);
};

const deleteMeeting = async (id) => {
    const meeting = await getMeetingById(id);
    await meeting.destroy({ force: true });
    const check = await Meeting.findByPk(id);
    if (check) {
        console.error('deleteMeeting: record still exists after destroy()', { id, check });
        throw new Error('Xóa thất bại: bản ghi cuộc họp vẫn tồn tại.');
    }
    return true;
};

module.exports = { createMeeting, getMeetings, getMeetingById, updateMeeting, deleteMeeting };