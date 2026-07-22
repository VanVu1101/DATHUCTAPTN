const express = require('express');
const multer = require('multer');
const router = express.Router();
const studentController = require('../controllers/student');
const { verifyToken, checkRole } = require('../middlewares/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

router.get('/profile', studentController.getMyProfile);
router.put('/profile', studentController.updateMyProfile);
router.get('/profile/documents', studentController.getMyProfileDocuments);
router.post('/profile/documents', upload.single('file'), studentController.uploadProfileDocument);
router.delete('/profile/documents/:id', studentController.deleteProfileDocument);
router.post('/profile/image', upload.single('file'), studentController.uploadProfileImage);
router.post('/profile/image-key', studentController.saveProfileImageKey);
router.get('/', checkRole(['ADMIN']), studentController.getStudents);
router.get('/majors', studentController.getMajors);
router.post('/majors', checkRole(['ADMIN']), studentController.createMajor);
router.put('/majors/:id', checkRole(['ADMIN']), studentController.updateMajor);
router.delete('/majors/:id', checkRole(['ADMIN']), studentController.deleteMajor);
router.get('/:id', checkRole(['ADMIN']), studentController.getStudentById);
router.post('/', checkRole(['ADMIN']), studentController.createStudent);
router.put('/:id', checkRole(['ADMIN']), studentController.updateStudent);
router.put('/:id/assign-period', checkRole(['ADMIN']), studentController.assignStudentPeriod);
router.put('/:id/assign-mentor', checkRole(['ADMIN', 'ENTERPRISE']), studentController.assignStudentMentor);
router.delete('/:id', checkRole(['ADMIN', 'ENTERPRISE']), studentController.deleteStudent);

module.exports = router;