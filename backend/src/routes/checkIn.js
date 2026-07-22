const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkIn');
const { verifyToken, checkRole } = require('../middlewares/auth');
const checkInQrController = require('../controllers/checkInQr');

router.post('/', verifyToken, checkRole(['STUDENT']), checkInController.submitCheckIn);
router.post('/checkout', verifyToken, checkRole(['STUDENT']), checkInController.submitCheckOut);
router.get('/me', verifyToken, checkRole(['STUDENT']), checkInController.getMyCheckIns);
router.get('/admin/summary', verifyToken, checkRole(['ADMIN']), checkInController.getAdminSummary);
router.get('/admin/detail', verifyToken, checkRole(['ADMIN']), checkInController.getAdminDetail);
// QR endpoints
router.post('/qr/generate', verifyToken, checkRole(['ADMIN']), checkInQrController.generateQr);
router.post('/qr/redeem', verifyToken, checkRole(['STUDENT', 'ADMIN', 'ENTERPRISE']), checkInQrController.redeemQr);

module.exports = router;
