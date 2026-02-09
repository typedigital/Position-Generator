const http = require('http');
const { extractIssueData } = require('../utils/githubData');
const { processIssue } = require('../services/issueProcessor');
const { verifySignature } = require('../utils/security');
const config = require('../config/config');

// Helper function to collect request body
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('error', (err) => reject(err));
        req.on('end', () => resolve(body));
    });
}

// Handle POST request from GitHub Webhook
async function handleRequest(req, res) {
    // 1. Check URL and Method
    if (req.url !== '/github/webhook' || req.method !== 'POST') {
        return res.writeHead(404).end();
    }

    try {
        // 2. Collect body
        const body = await getRequestBody(req);
        const signature = req.headers['x-hub-signature-256'];

        // 3. Verify signature
        if (!verifySignature(body, signature)) {
            console.error('[SECURITY] Invalid signature');
            return res.writeHead(401).end('Invalid signature');
        }

        // 4. Parse and process data
        const rawJson = JSON.parse(body);
        const issueData = extractIssueData(rawJson);
        const processedData = await processIssue(issueData);
        
        // 5. Success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            status: 'success', 
            fullDescription: processedData.fullDescription,
            parsedEntries: processedData.parsedEntries
        }));

    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        return res.writeHead(400).end('Bad Request');
    }
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