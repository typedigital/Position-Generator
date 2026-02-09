require('dotenv').config();
const PORT = process.env.PORT || 3000;
const http = require('http');
//for Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//Security key for GitHub Webhook analysis
const crypto = require('crypto');


//EMail transporter setup (using Gmail as an example)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

//Issue to Array
function extractIssueData(rawData) {
    console.log('[DATA] Extracting data from incoming payload...');
    let data = Array.isArray(rawData) && rawData[0]?.body ? rawData[0].body : rawData;
    const issue = data.issue || {};
    
    const extracted = {
        title: issue.title,
        number: issue.number,
        fullDescription: issue.body || '',
        status: issue.state,
        author: issue.user?.login,
        repo: data.repository?.full_name,
        url: issue.html_url,
        created: issue.created_at,
        labels: issue.labels?.map(l => l.name).join(', ') || 'none',
        assignees: issue.assignees?.map(a => a.login).join(', ') || 'none',
        comment: data.comment?.body || ''
    };

    console.log(`[DATA] Target: Issue #${extracted.number} in ${extracted.repo}`);
    return extracted;
}

//Filter for comments with "pt" references and extract them
function parseCommentReferences(items) {
    console.log('[PARSE] Scanning comment for "pt" references...');
    for (const item of items) {
        const commentBody = item.json?.body?.comment?.body || item.json?.body || '';
        
        if (!commentBody || !commentBody.toLowerCase().includes('pt')) {
            console.log('[PARSE] Result: No "pt" keyword found.');
            return { foundEntries: [], message: 'No "pt" found in comment', status: false };
        }

        const foundEntries = [];
        const regex = /(?:([A-Za-z0-9&\s]+?)?\s*)?(?:pt[:\-]?\s*(\d+)|(\d+)\s*pt)(?!\w)/gi;
        
        let m;
        while ((m = regex.exec(commentBody)) !== null) {
            const rawDept = m[1] ? m[1].trim() : null;
            const num = m[2] || m[3];
            const noise = ['and', 'for', 'also'];
            const dept = rawDept && !noise.includes(rawDept.toLowerCase()) ? rawDept : null;
            foundEntries.push({ dept, num, comment: commentBody });
        }

        if (foundEntries.length > 0) {
            console.log(`[PARSE] Success: Found ${foundEntries.length} entry/ies.`);
            return { foundEntries, message: 'Entries successfully parsed', status: true };
        }
    }
    console.log('[PARSE] Result: No valid numeric "pt" entries found.');
    return { foundEntries: [], message: 'No valid entries found', status: false };
}

//email sending 
async function sendEmail(htmlContent, issueNumber, repo) {
    try {
        console.log(`[EMAIL] Sending email for Issue #${issueNumber}...`);
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER,
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

//Generation with Gemini API description for client
async function generateClientDescription(text) {
    if (!text || !text.trim()) {
        console.log('[AI] Warning: Empty description provided. Skipping AI.');
        return 'No issue description was provided.';
    }

    // Використовуємо актуальні моделі (flash — найшвидша і найкраща для коротких текстів)
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];

    for (const modelName of models) {
        try {
            console.log(`[AI] Attempting short rewrite with ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            // Жорсткий промпт: Plain text, No formatting, Limit length
            const prompt = `Summarize the following GitHub issue into a single, professional paragraph. 
            Do not use any special characters like asterisks, hashes, dashes, or brackets. 
            Keep it strictly under 450 characters. Text: ${text}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let output = response.text().trim();
            
            // Фінальна очистка кодом для гарантії
            output = cleanSpecialChars(output);
            
            // Обрізаємо до 500 символів, якщо ШІ перевищив ліміт
            output = output.length > 500 ? output.substring(0, 497) + '...' : output;

            console.log(`[AI] SUCCESS: Summary generated (${output.length} chars)`);
            return output;
        } catch (err) {
            console.error(`[AI] FAILURE: ${modelName} failed. Error: ${err.message}`);
        }
    }

    // Якщо ШІ не спрацював, повертаємо очищений оригінал, обмежений по довжині
    return cleanSpecialChars(text).substring(0, 500); 
}

//Clean output of function generateClientDescription
function cleanSpecialChars(text) {
    // Видаляємо #, *, _, [, ], -, >, + та зайві переноси рядків
    return text
        .replace(/[#*_\[\]\-|>+]/g, '') 
        .replace(/\s+/g, ' ') // Замінюємо кілька пробілів/переносів одним пробілом
        .trim();
}

//Use Array with all info to create EMail
function generateEmailHtml(data) {
    // Format all parsed entries
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
        <!-- Main Card -->
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🐛 New GitHub Issue
                </h1>
                <div style="margin-top: 12px; display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">
                    <span style="color: white; font-weight: 700; font-size: 18px;">#${data.number}</span>
                </div>
            </div>

            <!-- Content -->
            <div style="padding: 35px;">
                
                <!-- Issue Title -->
                <div style="margin-bottom: 25px;">
                    <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">Issue Title</div>
                    <h2 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600; line-height: 1.4;">${data.title}</h2>
                </div>

                <!-- Description -->
                <div style="margin-bottom: 25px; padding: 20px; background: #f9fafb; border-left: 4px solid #667eea; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">${data.fullDescription}</div>
                </div>

                <!-- PT Badge -->
                <div style="margin-bottom: 30px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 24px; border-radius: 50px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        <span style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-right: 8px;">PT</span>
                        <span style="color: white; font-size: 24px; font-weight: 800;">${ptValue}</span>
                    </div>
                </div>

                <!-- Info Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <!-- Status -->
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Status</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">${data.status}</div>
                    </div>
                    <!-- Author -->
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Author</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">@${data.author}</div>
                    </div>
                    <!-- Repo -->
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Repository</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">${data.repo}</div>
                    </div>
                    <!-- Created -->
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Created</div>
                        <div style="color: #1f2937; font-weight: 600; font-size: 15px;">${new Date(data.created).toLocaleDateString()}</div>
                    </div>
                </div>

                <!-- View Button -->
                <a href="${data.url}" style="display: block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                    View on GitHub →
                </a>
            </div>

            <!-- Footer -->
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
//Main function to process issue data and decide if we need to send email
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

//Catcher of POST request from GitHub Webhook, with security verification and data parsing
async function handleRequest(req, res) {
    if (req.url === '/github/webhook' && req.method === 'POST') {
        const signature = req.headers['x-hub-signature-256'];
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // --- SECURITY VERIFICATION (The "Unhashing" Logic) ---
                if (!signature) {
                    console.error('[SECURITY] No signature found!');
                    return res.writeHead(401).end('No signature');
                }

                const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
                const digest = Buffer.from('sha256=' + hmac.update(body).digest('hex'), 'utf8');
                const checksum = Buffer.from(signature, 'utf8');

                // crypto.timingSafeEqual prevents timing attacks
                if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
                    console.error('[SECURITY] Signature mismatch! Request is not from GitHub.');
                    return res.writeHead(401).end('Invalid signature');
                }
                
                console.log('[SECURITY] Signature verified. Proceeding to parse data...');
                // --- END SECURITY VERIFICATION ---

                // Now it is safe to "unhash" (parse) the JSON
                const rawJson = JSON.parse(body);
                const issueData = extractIssueData(rawJson);
                const processedData = await processIssue(issueData);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'success', 
                    fullDescription: processedData.fullDescription,
                    parsedEntries: processedData.parsedEntries
                }));
            } catch (error) {
                console.error(`[ERROR] ${error.message}`);
                res.writeHead(400).end('Bad Request');
            }
        });
    } else {
        res.writeHead(404).end();
    }
}

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

// Listen on 0.0.0.0 instead of default localhost
http.createServer(handleRequest).listen(PORT, '0.0.0.0', () => {
    console.log(`[SYSTEM] Server listening on port ${PORT}`);
});
}

module.exports = { 
    handleRequest, // <--- This MUST be here
    parseCommentReferences, 
    processIssue, 
    generateClientDescription, 
    generateEmailHtml 
};