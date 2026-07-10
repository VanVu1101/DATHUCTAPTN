const express = require('express');
const router = express.Router();
const reportReviewController = require('../controllers/reportReview');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.patch('/:id/status', checkRole(['ADMIN']), reportReviewController.updateReportStatus);

module.exports = router;