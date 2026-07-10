const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.get('/stats', checkRole(['ADMIN']), dashboardController.getStats);

module.exports = router;
