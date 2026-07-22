const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const taskController = require('../controllers/task');
const { verifyToken, checkRole } = require('../middlewares/auth');

const taskUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../uploads/tasks');
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `${timestamp}-${safeName}`);
        }
    })
});

router.use(verifyToken);

router.get('/', checkRole(['ADMIN']), taskController.getTasks);
router.get('/me', taskController.getMyTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', checkRole(['ADMIN']), taskController.createTask);
router.put('/:id', checkRole(['ADMIN']), taskController.updateTask);
router.delete('/:id', checkRole(['ADMIN']), taskController.deleteTask);
router.post('/:id/comments', taskController.addComment);
router.post('/:id/mentor-note', checkRole(['ADMIN', 'MENTOR']), taskController.saveMentorNote);
router.post('/:id/submit', taskUpload.single('file'), taskController.submitTask);

module.exports = router;
