const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { verifyToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', verifyToken, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPasswordWithToken);

// protected route for login history
router.get('/history', verifyToken, authController.getLoginHistory);

module.exports = router;