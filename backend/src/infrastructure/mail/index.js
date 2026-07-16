const nodemailer = require('nodemailer');

const createTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });
};

const sendPasswordResetEmail = async (toEmail, resetLink) => {
    const transporter = createTransporter();
    const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER || 'internhub@example.com';

    if (!transporter) {
        console.warn('SMTP chưa được cấu hình. Bỏ qua gửi email reset mật khẩu. Link reset:', resetLink);
        return { sent: false, reason: 'SMTP_NOT_CONFIGURED', resetLink };
    }

    const mailOptions = {
        from: fromEmail,
        to: toEmail,
        subject: 'Đặt lại mật khẩu InternHub',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h3>Đặt lại mật khẩu</h3>
                <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản InternHub.</p>
                <p>Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
                <p>
                    <a href="${resetLink}" style="display: inline-block; padding: 10px 16px; background: #3157d8; color: white; text-decoration: none; border-radius: 6px;">
                        Đặt lại mật khẩu
                    </a>
                </p>
                <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    return { sent: true, resetLink };
};

module.exports = { sendPasswordResetEmail };