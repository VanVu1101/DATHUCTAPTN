const express = require('express');
const router = express.Router();
const enterpriseController = require('../controllers/enterprise');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.get('/:id/summary', checkRole(['ADMIN','ENTERPRISE']), enterpriseController.getEnterpriseSummary);

module.exports = router;
