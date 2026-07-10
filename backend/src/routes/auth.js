const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { verifyToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', verifyToken, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;