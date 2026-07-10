const express = require('express');
const router = express.Router();
const evalController = require('../controllers/evaluation');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.get('/me', verifyToken, evalController.getMyEvaluation);
router.get('/:internshipId', verifyToken, evalController.getByInternship);
router.post('/:internshipId', verifyToken, checkRole(['ADMIN']), evalController.createOrUpdate);

module.exports = router;
