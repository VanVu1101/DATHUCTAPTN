const Schedule = require('../models/schedule');
const { Op } = require('sequelize');

const validateSchedule = (data, partial = false) => {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date());
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (data.startDate && data.startDate < today) throw new Error('Ngày bắt đầu không được nhỏ hơn hôm nay');
    if (data.endDate && data.endDate < today) throw new Error('Ngày kết thúc không được nhỏ hơn hôm nay');
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi');
    }
    if (data.startTime && !timePattern.test(String(data.startTime).slice(0, 5))) {
        throw new Error('Giờ bắt đầu không hợp lệ');
    }
    if (data.endTime && !timePattern.test(String(data.endTime).slice(0, 5))) {
        throw new Error('Giờ kết thúc không hợp lệ');
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
        throw new Error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
    }
    if (!partial && (!data.startTime || !data.endTime)) {
        throw new Error('Vui lòng nhập giờ bắt đầu và giờ kết thúc');
    }
    if (data.audience === 'SPECIFIC_PERIOD' && (data.periodId === null || data.periodId === undefined)) {
        throw new Error('Vui lòng chọn kỳ thực tập cho lịch theo kỳ.');
    }
};

const createSchedule = async (data) => {
    if (!data.title || !data.startDate || !data.endDate) {
        throw new Error('Thiếu thông tin lịch làm việc');
    }

    validateSchedule(data);

    // Prevent overlapping schedules for the same audience/period
    // If any existing schedule overlaps any date in [startDate, endDate], we reject
    const overlapWhere = {
        audience: data.audience,
        ...(data.audience === 'SPECIFIC_PERIOD' ? { periodId: data.periodId } : {}),
        startDate: { [Op.lte]: data.endDate },
        endDate: { [Op.gte]: data.startDate },
    };
    const overlap = await Schedule.findOne({ where: overlapWhere });
    if (overlap) {
        // collect all overlapping rows for diagnostics
        const overlaps = await Schedule.findAll({ where: overlapWhere, order: [['id', 'ASC']] });
        console.error('createSchedule overlap detected. Payload:', data, 'Found overlaps:', overlaps.map(o => ({ id: o.id, startDate: o.startDate, endDate: o.endDate, audience: o.audience, periodId: o.periodId })));
        throw new Error('Đã có lịch trùng ngày. Mỗi ngày chỉ được tạo một lịch.');
    }

    return Schedule.create(data);
};

const getSchedules = async (filters = {}) => {
    const where = {};

    console.log('🔍 getSchedules called with filters:', filters);

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

    console.log('📋 Query where:', JSON.stringify(where));

    // If pagination requested, use findAndCountAll
    if (filters.page && filters.limit) {
        const page = Number(filters.page) || 1;
        const limit = Number(filters.limit) || 20;
        const offset = (page - 1) * limit;
        const result = await Schedule.findAndCountAll({
            where,
            order: [['startDate', 'ASC'], ['startTime', 'ASC']],
            limit,
            offset,
        });

        console.log('✅ Found schedules (paginated):', result.rows.length, 'of', result.count);
        return {
            rows: result.rows,
            count: result.count,
            page,
            limit,
        };
    }

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
    const resultingAudience = data.audience ?? schedule.audience;
    const resultingPeriodId = data.periodId !== undefined ? data.periodId : schedule.periodId;

    validateSchedule({
        startDate: data.startDate ?? schedule.startDate,
        endDate: data.endDate ?? schedule.endDate,
        startTime: data.startTime ?? schedule.startTime,
        endTime: data.endTime ?? schedule.endTime,
        audience: resultingAudience,
        periodId: resultingPeriodId,
    }, true);

    if (resultingAudience === 'SPECIFIC_PERIOD' && (resultingPeriodId === null || resultingPeriodId === undefined)) {
        throw new Error('Vui lòng chọn kỳ thực tập cho lịch theo kỳ.');
    }

    const newStart = data.startDate ?? schedule.startDate;
    const newEnd = data.endDate ?? schedule.endDate;
    const overlapWhere = {
        audience: resultingAudience,
        id: { [Op.ne]: schedule.id },
        startDate: { [Op.lte]: newEnd },
        endDate: { [Op.gte]: newStart },
    };
    if (resultingAudience === 'SPECIFIC_PERIOD') {
        overlapWhere.periodId = resultingPeriodId;
    }

    const overlap = await Schedule.findOne({ where: overlapWhere });
    if (overlap) {
        throw new Error('Cập nhật gây trùng lịch với một lịch khác. Mỗi ngày chỉ được tạo một lịch.');
    }
    return schedule.update(data);
};

const deleteSchedule = async (id) => {
    const schedule = await getScheduleById(id);
    // force destroy in case model has paranoid enabled
    await schedule.destroy({ force: true });
    // verify deletion
    const check = await Schedule.findByPk(id);
    if (check) {
        console.error('deleteSchedule: record still exists after destroy()', { id, check });
        throw new Error('Xóa thất bại: bản ghi vẫn tồn tại.');
    }
    return true;
};

module.exports = { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule };