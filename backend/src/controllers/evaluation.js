const evaluationService = require('../services/evaluation');

const createOrUpdate = async (req, res) => {
  try {
    const internshipId = Number(req.params.internshipId);
    if (!internshipId) return res.status(400).json({ success: false, message: 'internshipId is required' });

    const payload = {
      score: typeof req.body.score === 'string' ? Number(req.body.score) : req.body.score,
      feedback: req.body.feedback || '',
      criteria: req.body.criteria || null
    };

    // Allow creating evaluation when score or criteria provided
    if ((payload.score == null || Number.isNaN(payload.score)) && !payload.criteria) {
      return res.status(400).json({ success: false, message: 'score or criteria is required' });
    }

    const mentorId = req.user?.id || null;
    const evaluation = await evaluationService.createOrUpdateEvaluation(internshipId, mentorId, payload);
    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    console.error('evaluation.createOrUpdate error', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lưu đánh giá' });
  }
};

const getByInternship = async (req, res) => {
  try {
    const internshipId = Number(req.params.internshipId);
    if (!internshipId) return res.status(400).json({ success: false, message: 'internshipId is required' });
    const evaluation = await evaluationService.getEvaluationByInternship(internshipId);
    // Return success with null data when no evaluation exists to avoid 404 in frontend
    if (!evaluation) return res.status(200).json({ success: true, data: null });
    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyEvaluation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const evaluation = await evaluationService.getEvaluationForUser(userId);
    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createOrUpdate, getByInternship, getMyEvaluation };
