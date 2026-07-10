const express = require('express');
const router = express.Router();
const periodController = require('../controllers/internshipPeriod');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'period-documents');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
		cb(null, `${Date.now()}-${safeName}`);
	}
});

const upload = multer({ storage });

router.use(verifyToken);

router.post('', checkRole(['ADMIN']), periodController.createPeriod);
router.put('/:id', checkRole(['ADMIN']), periodController.updatePeriod);
router.delete('/:id', checkRole(['ADMIN']), periodController.deletePeriod);
router.post('/:id/documents', checkRole(['ADMIN']), upload.single('file'), periodController.uploadPeriodDocument);

router.get('', periodController.getAllPeriods);
router.get('/:id', periodController.getPeriodById);

module.exports = router;
