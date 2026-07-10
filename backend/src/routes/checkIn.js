const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkIn');
const { verifyToken } = require('../middlewares/auth');

router.post('/', verifyToken, checkInController.submitCheckIn);
router.post('/checkout', verifyToken, checkInController.submitCheckOut);
router.get('/me', verifyToken, checkInController.getMyCheckIns);

module.exports = router;
