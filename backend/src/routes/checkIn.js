const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkIn');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.post('/', verifyToken, checkRole(['STUDENT']), checkInController.submitCheckIn);
router.post('/checkout', verifyToken, checkRole(['STUDENT']), checkInController.submitCheckOut);
router.get('/me', verifyToken, checkRole(['STUDENT']), checkInController.getMyCheckIns);
router.get('/admin/summary', verifyToken, checkRole(['ADMIN']), checkInController.getAdminSummary);
router.get('/admin/detail', verifyToken, checkRole(['ADMIN']), checkInController.getAdminDetail);

module.exports = router;
