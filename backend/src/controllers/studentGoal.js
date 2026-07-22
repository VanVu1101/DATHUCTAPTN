const studentGoalService = require('../services/studentGoal');

const getGoals = async (req, res) => {
    try {
        const goals = await studentGoalService.getStudentGoals(req.user.id, req.user.role);
        res.status(200).json({ success: true, data: goals });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const createGoal = async (req, res) => {
    try {
        const goal = await studentGoalService.createStudentGoal(req.user.id, req.body, req.user.role);
        res.status(201).json({ success: true, data: goal });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateGoal = async (req, res) => {
    try {
        const goal = await studentGoalService.updateStudentGoal(req.user.id, req.params.id, req.body, req.user.role);
        res.status(200).json({ success: true, data: goal });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteGoal = async (req, res) => {
    try {
        await studentGoalService.deleteStudentGoal(req.user.id, req.params.id, req.user.role);
        res.status(200).json({ success: true, message: 'Đã xóa mục tiêu' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };
