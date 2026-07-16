const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Submit a report for current user
router.post('/', verifyToken, upload.single('file'), reportController.submitReport);
router.post('/weekly-reports', verifyToken, checkRole(['ADMIN']), reportController.createWeeklyReport);
router.get('/weekly-reports', verifyToken, checkRole(['ADMIN']), reportController.getWeeklyReports);
router.get('/weekly-reports/me', verifyToken, reportController.getMyWeeklyReports);
// Get reports of current user
router.get('/me', verifyToken, reportController.getMyReports);
router.get('/summary', verifyToken, reportController.getMySummary);
router.get('/admin', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.getAllReports);
router.post('/admin', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.createReport);
router.put('/admin/:id', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.updateReport);
router.delete('/admin/:id', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.deleteReport);
// Get all reports for a given internship (admin/mentor view)
router.get('/internship/:id', verifyToken, reportController.getByInternship);
router.patch('/:id/status', verifyToken, checkRole(['ADMIN']), reportController.updateReportStatus);

module.exports = router;
