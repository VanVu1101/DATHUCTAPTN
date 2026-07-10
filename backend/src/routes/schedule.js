const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', scheduleController.getSchedules);
router.get('/:id', scheduleController.getScheduleById);
router.post('/', checkRole(['ADMIN']), scheduleController.createSchedule);
router.put('/:id', checkRole(['ADMIN']), scheduleController.updateSchedule);
router.delete('/:id', checkRole(['ADMIN']), scheduleController.deleteSchedule);

module.exports = router;