const nodemailer = require('nodemailer');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const NotificationDeliveryLog = require('../../models/notificationDeliveryLog');

const snsClient = (() => {
    const region = process.env.AWS_REGION || 'ap-southeast-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
        return null;
    }

    return new SNSClient({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {})
        }
    });
})();

const sesClient = (() => {
    const region = process.env.AWS_REGION || 'ap-southeast-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
        return null;
    }

    return new SESClient({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {})
        }
    });
})();

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

const logNotificationDelivery = async ({ event, provider, status, toEmail, subject, reason, details = {}, source }) => {
    const payload = {
        timestamp: new Date().toISOString(),
        event,
        provider,
        status,
        toEmail,
        subject,
        reason,
        ...details
    };

    if (status === 'success') {
        console.info('[notification]', JSON.stringify(payload));
    } else {
        console.error('[notification]', JSON.stringify(payload));
    }

    try {
        await NotificationDeliveryLog.create({
            event,
            provider,
            status,
            toEmail,
            subject,
            reason,
            source,
            metadata: details
        });
    } catch (logError) {
        console.warn('[notification-log-failed]', logError.message);
    }
};

const buildPasswordResetMessage = (toEmail, resetLink) => ({
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
    `,
    text: `Đặt lại mật khẩu InternHub\n\nBạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.\nVui lòng mở liên kết sau để tiếp tục: ${resetLink}`
});

const buildReportSubmissionMessage = (recipientName, studentName, weekNumber, reportLink) => ({
    subject: 'InternHub: sinh viên vừa nộp báo cáo',
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h3>Thông báo nộp báo cáo</h3>
            <p>Xin chào ${recipientName || 'bạn'},</p>
            <p>${studentName || 'Một sinh viên'} vừa nộp báo cáo${weekNumber ? ` cho tuần ${weekNumber}` : ''}.</p>
            <p>Vui lòng mở trang quản lý báo cáo để xem chi tiết và hỗ trợ sinh viên nếu cần.</p>
            <p>
                <a href="${reportLink}" style="display: inline-block; padding: 10px 16px; background: #3157d8; color: white; text-decoration: none; border-radius: 6px;">
                    Xem báo cáo
                </a>
            </p>
        </div>
    `,
    text: `Xin chào ${recipientName || 'bạn'}, ${studentName || 'Một sinh viên'} vừa nộp báo cáo${weekNumber ? ` cho tuần ${weekNumber}` : ''}. Vui lòng mở đường dẫn: ${reportLink}`
});

const sendViaSes = async (toEmail, subject, html, text) => {
    const fromEmail = process.env.MAIL_FROM || process.env.AWS_SES_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@internhub.local';

    if (!sesClient || !fromEmail) {
        return { sent: false, reason: 'SES_NOT_CONFIGURED' };
    }

    try {
        const command = new SendEmailCommand({
            Source: fromEmail,
            Destination: { ToAddresses: [toEmail] },
            Message: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: html, Charset: 'UTF-8' },
                    Text: { Data: text, Charset: 'UTF-8' }
                }
            }
        });

        await sesClient.send(command);
        await logNotificationDelivery({
            event: 'email.send',
            provider: 'ses',
            status: 'success',
            toEmail,
            subject,
            reason: 'SES_SUCCESS'
        });
        return { sent: true, provider: 'ses' };
    } catch (error) {
        await logNotificationDelivery({
            event: 'email.send',
            provider: 'ses',
            status: 'failed',
            toEmail,
            subject,
            reason: 'SES_FAILED',
            details: { error: error.message }
        });
        return { sent: false, reason: 'SES_FAILED', error: error.message };
    }
};

const sendViaSns = async (toEmail, subject, html, text) => {
    const topicArn = process.env.PASSWORD_RESET_SNS_TOPIC_ARN || 'arn:aws:sns:ap-southeast-1:224346254168:internship-alert-topic';

    if (!snsClient || !topicArn) {
        return { sent: false, reason: 'SNS_NOT_CONFIGURED' };
    }

    const plainTextBody = text || html || `Thông báo từ InternHub cho ${toEmail}`;

    try {
        const command = new PublishCommand({
            TopicArn: topicArn,
            Subject: subject,
            Message: `${subject}\n\n${plainTextBody}`
        });

        await snsClient.send(command);
        await logNotificationDelivery({
            event: 'email.send',
            provider: 'sns',
            status: 'success',
            toEmail,
            subject,
            reason: 'SNS_SUCCESS'
        });
        return { sent: true, provider: 'sns' };
    } catch (error) {
        await logNotificationDelivery({
            event: 'email.send',
            provider: 'sns',
            status: 'failed',
            toEmail,
            subject,
            reason: 'SNS_FAILED',
            details: { error: error.message }
        });
        return { sent: false, reason: 'SNS_FAILED', error: error.message };
    }
};

const sendGenericEmail = async ({ toEmail, subject, html, text }) => {
    const snsResult = await sendViaSns(toEmail, subject, html, text);
    if (snsResult.sent) {
        return { sent: true, provider: 'sns' };
    }

    const sesResult = await sendViaSes(toEmail, subject, html, text);
    if (sesResult.sent) {
        return { sent: true, provider: 'ses' };
    }

    const transporter = createTransporter();
    if (!transporter) {
        return { sent: false, reason: 'ALL_DELIVERY_METHODS_FAILED', snsResult, sesResult };
    }

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER || 'internhub@example.com',
            to: toEmail,
            subject,
            html,
            text
        });
        await logNotificationDelivery({
            event: 'email.send',
            provider: 'smtp',
            status: 'success',
            toEmail,
            subject,
            reason: 'SMTP_SUCCESS'
        });
        return { sent: true, provider: 'smtp' };
    } catch (error) {
        await logNotificationDelivery({
            event: 'email.send',
            provider: 'smtp',
            status: 'failed',
            toEmail,
            subject,
            reason: 'SMTP_FAILED',
            details: { error: error.message, snsResult, sesResult }
        });
        return { sent: false, reason: 'SMTP_FAILED', error: error.message, snsResult, sesResult };
    }
};

const sendPasswordResetEmail = async (toEmail, resetLink) => {
    const payload = buildPasswordResetMessage(toEmail, resetLink);
    const result = await sendGenericEmail({
        toEmail,
        subject: payload.subject,
        html: payload.html,
        text: payload.text
    });

    if (!result.sent) {
        console.warn('Không thể gửi qua SES/SMTP/SNS. Link reset:', resetLink);
    }

    return {
        ...result,
        resetLink
    };
};

const sendReportSubmissionEmail = async (toEmail, { recipientName, studentName, weekNumber, reportLink }) => {
    if (!toEmail) {
        return { sent: false, reason: 'NO_RECIPIENT' };
    }

    const payload = buildReportSubmissionMessage(recipientName, studentName, weekNumber, reportLink);
    return sendGenericEmail({
        toEmail,
        subject: payload.subject,
        html: payload.html,
        text: payload.text
    });
};

module.exports = {
    sendGenericEmail,
    sendPasswordResetEmail,
    sendReportSubmissionEmail
};