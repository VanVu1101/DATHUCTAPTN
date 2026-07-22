const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/auth');
const userController = require('../controllers/user');

router.use(verifyToken, checkRole(['ADMIN']));
router.get('/', userController.listUsers);
router.patch('/:id/role', userController.updateUserRole);

module.exports = router;
