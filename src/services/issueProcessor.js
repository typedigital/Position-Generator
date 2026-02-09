const { parseCommentReferences } = require('../utils/githubData');
const { generateClientDescription } = require('./aiService');
const { generateEmailHtml, sendEmail } = require('./emailService');

// Main function to process issue data and decide if we need to send email
async function processIssue(issueData) {
    issueData.parsedEntries = issueData.parsedEntries || [];
    issueData.clientDescription = issueData.clientDescription || '';
    issueData.emailHtml = '';

    let shouldRewrite = false;
    const isComment = !!issueData.comment;

    if (isComment) {
        const parseResult = parseCommentReferences([{ json: { body: issueData.comment } }]);
        if (parseResult.status) {
            shouldRewrite = true;
            issueData.parsedEntries = parseResult.foundEntries;
        } else {
            issueData.clientDescription = issueData.clientDescription || 'No issue description was provided.';
            return { ...issueData, skipped: true };
        }
    } else {
        shouldRewrite = true;
    }

    if (shouldRewrite) {
        const cleanText = await generateClientDescription(issueData.fullDescription);
        issueData.clientDescription = cleanText;
        issueData.fullDescription = (cleanText === 'No issue description was provided.') 
            ? 'No description provided.' 
            : cleanText;

        if (issueData.fullDescription && issueData.fullDescription !== 'No description provided.') {
            console.log('[PROCESS] Generating Email HTML and sending...');
            issueData.emailHtml = generateEmailHtml(issueData);
            await sendEmail(issueData.emailHtml, issueData.number, issueData.repo);
        }
    }

    return issueData;
}

module.exports = {
    processIssue
};