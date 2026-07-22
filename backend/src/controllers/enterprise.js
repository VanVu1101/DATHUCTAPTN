const enterpriseService = require('../services/enterprise');

const getEnterpriseSummary = async (req, res) => {
    try {
        const enterpriseUserId = parseInt(req.params.id, 10);
        if (Number.isNaN(enterpriseUserId)) {
            return res.status(400).json({ success: false, message: 'Invalid enterprise id' });
        }

        const summary = await enterpriseService.getEnterpriseSummary(enterpriseUserId, { inactivityDays: req.query.inactivityDays ? parseInt(req.query.inactivityDays, 10) : 14 });
        return res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error('Enterprise summary error', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getEnterpriseSummary };
