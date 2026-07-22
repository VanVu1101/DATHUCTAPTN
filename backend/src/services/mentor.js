const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/user');
const Mentor = require('../models/mentor');
const Internship = require('../models/internship');
const InternshipPeriod = require('../models/internshipPeriod');
const Student = require('../models/student');
const { getFileUrl } = require('../config/s3');

const listMentors = async (actor) => {
    const where = actor.role === 'ADMIN'
        ? {}
        : { [Op.or]: [{ ownerUserId: actor.id }, { userId: actor.id }] };

    const mentors = await Mentor.findAll({
        where,
        include: [{ model: User, attributes: ['id', 'email', 'profileImageUrl'] }],
        order: [['fullName', 'ASC']]
    });

    return Promise.all(mentors.map(async (mentor) => {
        const item = mentor.get({ plain: true });
        if (item.User?.profileImageUrl && !String(item.User.profileImageUrl).startsWith('http')) {
            try {
                item.User.profileImageUrl = await getFileUrl(item.User.profileImageUrl);
            } catch (error) {
                // ignore conversion errors
            }
        }
        item.avatar = item.User?.profileImageUrl || null;
        item.assignedStudentCount = await Internship.count({
            where: {
                mentorId: mentor.id,
                status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] }
            }
        });
        return item;
    }));
};

const createMentor = async (actor, payload) => {
    const { fullName, companyName, email, password } = payload;
    if (!fullName?.trim() || !companyName?.trim() || !email?.trim() || !password) {
        throw new Error('Vui lòng nhập họ tên, doanh nghiệp, email và mật khẩu mentor.');
    }
    if (String(password).length < 6) {
        throw new Error('Mật khẩu mentor phải có ít nhất 6 ký tự.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (actor.role === 'ENTERPRISE') {
        const actorMentor = await Mentor.findOne({ where: { userId: actor.id } });
        if (actorMentor) {
            throw new Error('Tài khoản mentor không được phép tạo mentor khác.');
        }
    }
    const ownerUserId = actor.role === 'ADMIN'
        ? (payload.ownerUserId ? Number(payload.ownerUserId) : null)
        : Number(actor.id);

    return sequelize.transaction(async (transaction) => {
        const existing = await User.findOne({ where: { email: normalizedEmail }, transaction });
        if (existing) throw new Error('Email mentor đã được sử dụng.');

        const user = await User.create({
            email: normalizedEmail,
            password: await bcrypt.hash(password, 10),
            role: 'ENTERPRISE'
        }, { transaction });

        return Mentor.create({
            fullName: fullName.trim(),
            companyName: companyName.trim(),
            phone: payload.phone?.trim() || null,
            userId: user.id,
            ownerUserId
        }, { transaction });
    });
};

const updateMentor = async (actor, id, payload) => {
    const mentor = await Mentor.findByPk(id);
    if (!mentor) throw new Error('Không tìm thấy mentor.');
    const canManage = actor.role === 'ADMIN'
        || Number(mentor.ownerUserId) === Number(actor.id);
    if (!canManage) throw new Error('Bạn không có quyền sửa mentor này.');

    await mentor.update({
        fullName: payload.fullName?.trim() || mentor.fullName,
        companyName: payload.companyName?.trim() || mentor.companyName,
        phone: payload.phone !== undefined ? (payload.phone?.trim() || null) : mentor.phone
    });
    return mentor;
};

const deleteMentor = async (actor, id) => {
    const mentor = await Mentor.findByPk(id);
    if (!mentor) throw new Error('Không tìm thấy mentor.');
    const canManage = actor.role === 'ADMIN'
        || Number(mentor.ownerUserId) === Number(actor.id);
    if (!canManage) throw new Error('Bạn không có quyền xóa mentor này.');

    const assigned = await Internship.count({
        where: { mentorId: mentor.id, status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] } }
    });
    if (assigned > 0) {
        throw new Error('Mentor đang được phân công sinh viên, không thể xóa.');
    }

    return sequelize.transaction(async (transaction) => {
        const userId = mentor.userId;
        await mentor.destroy({ transaction });
        await User.destroy({ where: { id: userId }, transaction });
        return true;
    });
};

const getAssignedStudents = async (actor) => {
    const mentorWhere = actor.role === 'ADMIN'
        ? {}
        : { [Op.or]: [{ ownerUserId: actor.id }, { userId: actor.id }] };
    const mentors = await Mentor.findAll({ where: mentorWhere, attributes: ['id'] });
    const mentorIds = mentors.map((mentor) => mentor.id);
    if (!mentorIds.length) return [];

    const internships = await Internship.findAll({
        where: {
            mentorId: { [Op.in]: mentorIds },
            status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] }
        },
        include: [{ model: Student }],
        order: [['updatedAt', 'DESC']]
    });
    return internships;
};

const buildStudentSearchClause = (search) => {
    if (!search) return null;
    const normalized = `%${search.trim()}%`;
    return {
        [Op.or]: [
            { fullName: { [Op.like]: normalized } },
            { studentCode: { [Op.like]: normalized } },
            { enterpriseName: { [Op.like]: normalized } },
            { majorName: { [Op.like]: normalized } }
        ]
    };
};

const buildStudentFilters = (query = {}) => {
    const clauses = [];
    if (query.search) clauses.push(buildStudentSearchClause(query.search));
    if (query.periodId) clauses.push({ periodId: Number(query.periodId) });
    if (query.majorName) clauses.push({ majorName: query.majorName });
    if (query.enterpriseName) clauses.push({ enterpriseName: query.enterpriseName });
    if (query.assignedStatus === 'unassigned') clauses.push({ mentorId: null });
    if (query.assignedStatus === 'assigned') clauses.push({ mentorId: { [Op.ne]: null } });
    if (!clauses.length) return {};
    return { [Op.and]: clauses };
};

const getCompanyStudents = async (actor, query = {}) => {
    const baseFilter = buildStudentFilters(query);
    const studentQuery = {
        where: baseFilter,
        include: [
            { model: Mentor, attributes: ['id', 'fullName'] },
            { model: InternshipPeriod, attributes: ['id', 'name'] }
        ],
        order: [['fullName', 'ASC']]
    };

    if (actor.role === 'ADMIN') {
        return Student.findAll(studentQuery);
    }

    const ownedMentors = await Mentor.findAll({
        where: { [Op.or]: [{ ownerUserId: actor.id }, { userId: actor.id }] },
        attributes: ['id', 'companyName']
    });

    const mentorIds = ownedMentors.map((mentor) => mentor.id).filter(Boolean);
    const companyNames = [...new Set(ownedMentors.map((mentor) => (mentor.companyName || '').trim()).filter(Boolean))];

    if (!companyNames.length && !mentorIds.length) return [];

    const companyClause = { [Op.or]: [] };
    if (companyNames.length) companyClause[Op.or].push({ enterpriseName: { [Op.in]: companyNames } });
    if (mentorIds.length) companyClause[Op.or].push({ mentorId: { [Op.in]: mentorIds } });

    if (!companyClause[Op.or].length) return [];

    if (Object.keys(baseFilter).length) {
        studentQuery.where = { [Op.and]: [ baseFilter, companyClause ] };
    } else {
        studentQuery.where = companyClause;
    }

    return Student.findAll(studentQuery);
};

const getAssignableStudents = async (actor, query = {}) => {
    const effectiveQuery = { ...query };
    if (!effectiveQuery.assignedStatus) {
        effectiveQuery.assignedStatus = 'unassigned';
    }
    return getCompanyStudents(actor, effectiveQuery);
};

module.exports = {
    listMentors,
    createMentor,
    updateMentor,
    deleteMentor,
    getAssignedStudents,
    getCompanyStudents,
    getAssignableStudents
};
