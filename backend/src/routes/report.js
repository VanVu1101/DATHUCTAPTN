const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');

// Limit uploads to 5MB and accept only PDF / DOC / DOCX for report submissions
const ALLOWED_REPORT_MIMES = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		// allow no-file requests (e.g., text-only submissions)
		if (!file) return cb(null, true);
		if (ALLOWED_REPORT_MIMES.includes(file.mimetype)) return cb(null, true);
		return cb(new Error('Invalid file type. Only PDF/DOC/DOCX are allowed.'));
	}
});

// Submit a report for current user
router.post('/', verifyToken, upload.single('file'), reportController.submitReport);
router.post('/weekly-reports', verifyToken, checkRole(['ADMIN']), upload.single('file'), reportController.createWeeklyReport);
router.get('/weekly-reports', verifyToken, checkRole(['ADMIN']), reportController.getWeeklyReports);
router.get('/weekly-reports/me', verifyToken, reportController.getMyWeeklyReports);
router.put('/weekly-reports/:id', verifyToken, checkRole(['ADMIN']), upload.single('file'), reportController.updateWeeklyReport);
router.delete('/weekly-reports/:id', verifyToken, checkRole(['ADMIN']), reportController.deleteWeeklyReport);
// Get reports of current user
router.get('/me', verifyToken, reportController.getMyReports);
router.get('/summary', verifyToken, reportController.getMySummary);
router.get('/admin', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.getAllReports);
router.post('/admin', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.createReport);
router.put('/admin/:id', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.updateReport);
// Get all reports for a given internship (admin/mentor view)
router.get('/internship/:id', verifyToken, reportController.getByInternship);
router.patch('/:id/status', verifyToken, checkRole(['ADMIN']), reportController.updateReportStatus);

module.exports = router;
