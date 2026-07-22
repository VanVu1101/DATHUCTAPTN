const { generateQrToken, verifyQrToken } = require('../services/checkInQr');
const checkInService = require('../services/checkIn');

const generateQr = async (req, res) => {
    try {
        const { meetingId = null, internshipId = null, expiresMinutes = 10 } = req.body || {};
        const token = generateQrToken({ meetingId, internshipId, expiresMinutes });
        const apiOrigin = (process.env.API_ORIGIN || '').replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
        const url = `${apiOrigin}/qr-checkin?token=${encodeURIComponent(token)}`;
        res.json({ success: true, data: { token, url, expiresMinutes } });
    } catch (error) {
        console.error('generateQr error:', error && error.stack ? error.stack : error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const redeemQr = async (req, res) => {
    try {
        const token = req.body.token || req.query.token;
        if (!token) return res.status(400).json({ success: false, message: 'Thiếu token' });
        const decoded = verifyQrToken(token);
        const noteParts = [];
        if (decoded.meetingId) noteParts.push(`QR:meeting:${decoded.meetingId}`);
        if (decoded.internshipId) noteParts.push(`QR:internship:${decoded.internshipId}`);
        const payload = { userId: req.user.id, internshipId: decoded.internshipId || null, note: noteParts.join(' | ') || 'QR' };
        const checkin = await checkInService.createCheckIn(payload);
        res.json({ success: true, data: checkin });
    } catch (error) {
        console.error('redeemQr error:', error && error.stack ? error.stack : error);
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { generateQr, redeemQr };
