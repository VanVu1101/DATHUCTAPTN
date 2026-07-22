const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');

// Limit uploads to 5MB and accept only PDF / DOC / DOCX for report submissions
const ALLOWED_REPORT_MIMES = new Set([
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const ALLOWED_REPORT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

const isAllowedReportFile = (file) => {
	if (!file) return true;

	const mime = String(file.mimetype || '').toLowerCase();
	const originalName = String(file.originalname || '').toLowerCase();
	const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';

	return ALLOWED_REPORT_MIMES.has(mime) || ALLOWED_REPORT_EXTENSIONS.has(extension);
};

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		// allow no-file requests (e.g., text-only submissions)
		if (!file || !file.originalname) return cb(null, true);
		if (isAllowedReportFile(file)) return cb(null, true);
		return cb(new Error('Invalid file type. Chỉ cho phép file PDF, DOC hoặc DOCX.'));
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
router.get('/:id/download', verifyToken, reportController.downloadReport);
router.get('/summary', verifyToken, reportController.getMySummary);
router.get('/admin', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.getAllReports);
router.post('/admin', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.createReport);
router.put('/admin/:id', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.updateReport);
router.delete('/admin/:id', verifyToken, checkRole(['ADMIN','MENTOR']), reportController.deleteReport);
// Get all reports for a given internship (admin/mentor view)
router.get('/internship/:id', verifyToken, reportController.getByInternship);
router.patch('/:id/status', verifyToken, checkRole(['ADMIN']), reportController.updateReportStatus);

module.exports = router;
