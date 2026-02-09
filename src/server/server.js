const http = require('http');
const { extractIssueData } = require('../utils/githubData');
const { processIssue } = require('../services/issueProcessor');
const { verifySignature } = require('../utils/security');
const config = require('../config/config');

// Handle POST request from GitHub Webhook
async function handleRequest(req, res) {
    // 1. Перевіряємо метод та шлях (Early Return)
    if (req.url !== '/github/webhook' || req.method !== 'POST') {
        return res.writeHead(404).end();
    }

    const signature = req.headers['x-hub-signature-256'];
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            // 2. Перевірка підпису (Early Return)
            if (!verifySignature(body, signature)) {
                console.error('[SECURITY] Invalid signature');
                return res.writeHead(401).end('Invalid signature');
            }

            // 3. Основна логіка (вже без зайвих вкладень)
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
}

// Start server
function startServer() {
    http.createServer(handleRequest).listen(config.PORT, '0.0.0.0', () => {
        console.log(`[SYSTEM] Server listening on port ${config.PORT}`);
    });
}

module.exports = {
    handleRequest,
    startServer
};