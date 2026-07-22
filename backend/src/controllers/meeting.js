const meetingService = require('../services/meeting');
const Student = require('../models/student');
const notificationService = require('../services/notification');

const createMeeting = async (req, res) => {
    try {
        const meeting = await meetingService.createMeeting({ ...req.body, createdBy: req.user.id });
                // Notify students in the period about the new meeting
                try {
                    if (meeting && meeting.periodId) {
                        const students = await Student.findAll({ where: { periodId: meeting.periodId } });
                        for (const s of students) {
                            if (s.userId) {
                                await notificationService.createNotification({
                                    userId: s.userId,
                                    title: 'Lịch họp mới',
                                    message: `Có lịch họp/đi làm tại công ty vào ${meeting.startTime || meeting.startDate || ''}`,
                                    type: 'MEETING',
                                    data: { meetingId: meeting.id }
                                });
                            }
                        }
                    }
                } catch (nErr) {
                    console.error('Notification error:', nErr.message || nErr);
                }
        res.status(201).json({ success: true, data: meeting });
    } catch (error) {
        console.error('meeting.createMeeting error:', error && error.stack ? error.stack : error, { body: req.body, user: req.user });
        res.status(400).json({ success: false, message: error.message });
    }
};

const getMeetings = async (req, res) => {
    try {
        const meetings = await meetingService.getMeetings({ periodId: req.query.periodId });
        res.status(200).json({ success: true, data: meetings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMeetingById = async (req, res) => {
    try {
        const meeting = await meetingService.getMeetingById(req.params.id);
        res.status(200).json({ success: true, data: meeting });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const updateMeeting = async (req, res) => {
    try {
        const meeting = await meetingService.updateMeeting(req.params.id, req.body);
        res.status(200).json({ success: true, data: meeting });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteMeeting = async (req, res) => {
    try {
        await meetingService.deleteMeeting(req.params.id);
        res.status(200).json({ success: true, message: 'Xóa cuộc họp thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { createMeeting, getMeetings, getMeetingById, updateMeeting, deleteMeeting };