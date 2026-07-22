const express = require('express');
const router = express.Router();
const studentGoalController = require('../controllers/studentGoal');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);
router.get('/', studentGoalController.getGoals);
router.post('/', studentGoalController.createGoal);
router.put('/:id', studentGoalController.updateGoal);
router.delete('/:id', studentGoalController.deleteGoal);

module.exports = router;
