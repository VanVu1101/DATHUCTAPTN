const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', meetingController.getMeetings);
router.get('/:id', meetingController.getMeetingById);
router.post('/', checkRole(['ADMIN']), meetingController.createMeeting);
router.put('/:id', checkRole(['ADMIN']), meetingController.updateMeeting);
router.delete('/:id', checkRole(['ADMIN']), meetingController.deleteMeeting);

module.exports = router;