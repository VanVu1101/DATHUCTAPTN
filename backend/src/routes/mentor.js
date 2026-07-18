const express = require('express');
const { verifyToken, checkRole } = require('../middlewares/auth');
const controller = require('../controllers/mentor');

const router = express.Router();
router.use(verifyToken, checkRole(['ADMIN', 'ENTERPRISE']));

router.get('/', controller.list);
router.get('/assigned-students', controller.assignedStudents);
router.get('/company-students', controller.companyStudents);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
