const http = require('http');
const { extractIssueData } = require('../utils/githubData');
const { processIssue } = require('../services/issueProcessor');
const { verifySignature } = require('../utils/security');
const config = require('../config/config');

const StatusCode = require('../constants/statusCode'); 


function getRequestBody(req, limit = 1e6) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { 
            body += chunk.toString(); 
            if (body.length > limit) {
                reject(new Error('Payload too large'));
            }
        });
        req.on('error', (err) => reject(err));
        req.on('end', () => resolve(body));
    });
}

 //Handle POST request from GitHub Webhook
 
async function handleRequest(req, res) {
    // 1. Check URL and Method using the Enum-style object
    if (req.url !== '/github/webhook' || req.method !== 'POST') {
        return res.writeHead(StatusCode.ClientErrorNotFound).end();
    }

    try {
        // 2. Collect body
        const body = await getRequestBody(req);
        const signature = req.headers['x-hub-signature-256'];

        // 3. Verify signature
        if (!verifySignature(body, signature)) {
            console.warn('[SECURITY] Invalid signature attempt');
            return res.writeHead(StatusCode.ClientErrorUnauthorized).end('Invalid signature');
        }

        // 4. Parse and process data
        const rawJson = JSON.parse(body);
        const issueData = extractIssueData(rawJson);
        const processedData = await processIssue(issueData);
        
        // 5. Success response
        res.writeHead(StatusCode.SuccessOK, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            status: 'success', 
            fullDescription: processedData.fullDescription,
            parsedEntries: processedData.parsedEntries
        }));

    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        
        // Logic to pick the right status code based on the error
        let status = StatusCode.ClientErrorBadRequest;
        
        if (error.message === 'Payload too large') {
            status = StatusCode.ClientErrorPayloadTooLarge;
        } else if (!(error instanceof SyntaxError)) {
            // If it's not a JSON parsing error, it's likely a server-side logic crash
            status = StatusCode.ServerErrorInternal;
        }

        return res.writeHead(status).end(error.message);
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