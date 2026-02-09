const nodemailer = require('nodemailer');
const config = require('../config/config');

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
    }
});

// Generate HTML email template
function generateEmailHtml(data) {
    let ptValue = 'N/A';
    if (data.parsedEntries && data.parsedEntries.length > 0) {
        ptValue = data.parsedEntries
            .map(entry => entry.dept ? `${entry.dept} ${entry.num}` : entry.num)
            .join(' ');
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🐛 New GitHub Issue
                </h1>
                <div style="margin-top: 12px; display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">
                    <span style="color: white; font-weight: 700; font-size: 18px;">#${data.number}</span>
                </div>
            </div>

            <div style="padding: 35px;">
                
                <div style="margin-bottom: 25px;">
                    <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">Issue Title</div>
                    <h2 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600; line-height: 1.4;">${data.title}</h2>
                </div>

                <div style="margin-bottom: 25px; padding: 20px; background: #f9fafb; border-left: 4px solid #667eea; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">${data.fullDescription}</div>
                </div>

                <div style="margin-bottom: 30px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 24px; border-radius: 50px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        <span style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-right: 8px;">PT</span>
                        <span style="color: white; font-size: 24px; font-weight: 800;">${ptValue}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Status</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">${data.status}</div>
                    </div>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Author</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">@${data.author}</div>
                    </div>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Repository</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">${data.repo}</div>
                    </div>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Created</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">${new Date(data.created).toLocaleDateString()}</div>
                    </div>
                </div>

                <a href="${data.url}" style="display: block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    View on GitHub →
                </a>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    Automated notification from GitHub Webhook
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Send email
async function sendEmail(htmlContent, issueNumber, repo) {
    try {
        console.log(`[EMAIL] Sending email for Issue #${issueNumber}...`);
        
        const mailOptions = {
            from: config.EMAIL_USER,
            to: config.EMAIL_RECIPIENT || config.EMAIL_USER,
            subject: `Offer #${issueNumber} - ${repo}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Email sent successfully! Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send email: ${error.message}`);
        return { success: false, error: error.message };
    }
}

module.exports = {
    generateEmailHtml,
    sendEmail
};