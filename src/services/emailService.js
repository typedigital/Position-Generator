const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
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
    // Avoid crash if data is null or undefined
    if (!data) return "<p>Fehler: Keine Daten vorhanden.</p>";

    let ptValue = 'N/A';
    if (data.parsedEntries && Array.isArray(data.parsedEntries) && data.parsedEntries.length > 0) {
        ptValue = data.parsedEntries
            .map(entry => entry.dept ? `${entry.dept} ${entry.num}` : entry.num)
            .join(' ');
    }

    try {
        //Ensure this points to your "Email template" folder correctly
        const templatePath = path.resolve(__dirname, '..', '..', 'Email template', 'emailTemplate.html');
        
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found at: ${templatePath}`);
        }

        let template = fs.readFileSync(templatePath, 'utf8');

        const eventDate = data.created ? new Date(data.created) : new Date();
        const formattedDateTime = eventDate.toLocaleString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        return template
            .replace('{{issueNumber}}', data.number || 'N/A')
            .replace('{{title}}', data.title || 'Kein Titel')
            .replace('{{description}}', data.fullDescription || '')
            .replace('{{ptValue}}', ptValue)
            .replace('{{status}}', data.status || 'Offen')
            .replace('{{author}}', data.author || 'unbekannt')
            .replace('{{repo}}', data.repo || 'N/A')
            .replace('{{date}}', formattedDateTime)
            .replace('{{url}}', data.url || '#');

    } catch (error) {
        // Return a string so the test can at least read the error
        console.error("Template Error:", error.message);
        return `<p>Fehler: E-Mail-Vorschau konnte nicht erstellt werden. ${error.message}</p>`;
    }
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