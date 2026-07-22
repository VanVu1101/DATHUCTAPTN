const jwt = require('jsonwebtoken');

const generateQrToken = ({ meetingId = null, internshipId = null, expiresMinutes = 10 }) => {
  const payload = {
    type: 'QR_CHECKIN',
    meetingId: meetingId || null,
    internshipId: internshipId || null,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: `${Number(expiresMinutes)}m` });
  return token;
};

const verifyQrToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    if (!decoded || decoded.type !== 'QR_CHECKIN') throw new Error('Invalid QR token');
    return decoded;
  } catch (err) {
    throw err;
  }
};

module.exports = { generateQrToken, verifyQrToken };
