const reportService = require('../services/report');

const updateReportStatus = async (req, res) => {
    try {
        const evalPayload = {
            score: req.body.score,
            feedback: req.body.feedback
        };
        const updated = await reportService.updateReportStatus(req.params.id, req.body.status, req.body.reviewerNote, evalPayload, req.user?.id);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { updateReportStatus };