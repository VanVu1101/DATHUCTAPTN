const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { sendGenericEmail, logNotificationDelivery } = require('../infrastructure/mail');

let snsClient = null;

const getSnsClient = () => {
    if (snsClient) return snsClient;

    const region = process.env.AWS_REGION || 'ap-southeast-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    const clientConfig = { region };
    if (accessKeyId && secretAccessKey) {
        clientConfig.credentials = { accessKeyId, secretAccessKey };
    }

    snsClient = new SNSClient(clientConfig);
    return snsClient;
};

const publishNotification = async (subject, message) => {
    const topicArn = process.env.SNS_TOPIC_ARN || process.env.PASSWORD_RESET_SNS_TOPIC_ARN;
    const fallbackEmail = process.env.NOTIFICATION_EMAIL || process.env.MAIL_FROM || process.env.SMTP_USER || process.env.AWS_SES_FROM_EMAIL || null;

    if (!topicArn) {
        logNotificationDelivery({
            event: 'sns.publish',
            provider: 'sns',
            status: 'failed',
            subject,
            reason: 'SNS_TOPIC_ARN_NOT_CONFIGURED'
        });
        if (fallbackEmail) {
            return sendGenericEmail({
                toEmail: fallbackEmail,
                subject,
                text: message,
                html: `<pre>${message}</pre>`
            });
        }
        return { sent: false, reason: 'SNS_TOPIC_ARN_NOT_CONFIGURED' };
    }

    try {
        const client = getSnsClient();
        const response = await client.send(new PublishCommand({
            TopicArn: topicArn,
            Subject: subject,
            Message: message
        }));

        logNotificationDelivery({
            event: 'sns.publish',
            provider: 'sns',
            status: 'success',
            subject,
            reason: 'SNS_SUCCESS',
            details: { messageId: response.MessageId }
        });

        return { sent: true, provider: 'sns', messageId: response.MessageId };
    } catch (error) {
        logNotificationDelivery({
            event: 'sns.publish',
            provider: 'sns',
            status: 'failed',
            subject,
            reason: 'SNS_PUBLISH_FAILED',
            details: { error: error?.message || String(error) }
        });

        if (fallbackEmail) {
            return sendGenericEmail({
                toEmail: fallbackEmail,
                subject,
                text: message,
                html: `<pre>${message}</pre>`
            });
        }

        return { sent: false, reason: 'SNS_PUBLISH_FAILED', error: error?.message || String(error) };
    }
};

const formatEmailBody = (lines) => lines.join('\n');

const publishWeeklyReportSubmitted = async ({ studentName, weekNumber, submittedAt, status = 'Submitted' }) => {
    const subject = 'New Weekly Report Submitted';
    const message = formatEmailBody([
        'A new weekly report has been submitted.',
        '',
        `Student: ${studentName || 'Unknown student'}`,
        `Week: ${weekNumber || 'N/A'}`,
        `Submitted Time: ${submittedAt || new Date().toISOString()}`,
        `Status: ${status}`
    ]);

    return publishNotification(subject, message);
};

const publishReportReviewed = async ({ studentName, weekNumber, reviewedAt, status, reviewerNote }) => {
    const subject = 'Weekly Report Reviewed';
    const message = formatEmailBody([
        'A weekly report has been reviewed.',
        '',
        `Student: ${studentName || 'Unknown student'}`,
        `Week: ${weekNumber || 'N/A'}`,
        `Reviewed Time: ${reviewedAt || new Date().toISOString()}`,
        `Status: ${status || 'Reviewed'}`,
        ...(reviewerNote ? [`Feedback: ${reviewerNote}`] : [])
    ]);

    return publishNotification(subject, message);
};

const publishTaskCreated = async ({ title, studentName, deadline, description, category }) => {
    const subject = 'New Internship Task';
    const message = formatEmailBody([
        'A new internship task has been assigned.',
        '',
        `Task: ${title || 'Untitled task'}`,
        `Assigned To: ${studentName || 'Unknown student'}`,
        `Deadline: ${deadline || 'Not specified'}`,
        `Category: ${category || 'General'}`,
        `Description: ${description || 'No description provided'}`
    ]);

    return publishNotification(subject, message);
};

module.exports = {
    publishNotification,
    publishWeeklyReportSubmitted,
    publishReportReviewed,
    publishTaskCreated
};
