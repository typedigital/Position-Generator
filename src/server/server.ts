import http, { IncomingMessage, ServerResponse } from 'http';
import { extractIssueData } from '../utils/githubData.js';
import { processIssue } from '../services/issueProcessor.js';
import { verifyGitHubSignature } from '../utils/security.js';
import { createPipedriveDeal } from '../services/pipedriveService.js'; 
import config from '../config/config.js';
import { StatusCode } from '../constants/statusCode.js';

function getRequestBody(req: IncomingMessage, limit: number = 1e6): Promise<string> {
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

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.url !== '/github/webhook' || req.method !== 'POST') {
        res.writeHead(StatusCode.ClientErrorNotFound).end();
        return;
    }

    try {
        const body = await getRequestBody(req);
        const signature = req.headers['x-hub-signature-256'];
        const eventType = req.headers['x-github-event']; 

        if (typeof signature !== 'string' || !verifyGitHubSignature(body, signature)) {
            console.warn('[SECURITY] Invalid signature attempt');
            res.writeHead(StatusCode.ClientErrorUnauthorized).end('Invalid signature');
            return;
        }

        const rawJson = JSON.parse(body);
        const issueData = extractIssueData(rawJson);
        const processedData = await processIssue(issueData);


        if (eventType === 'issues' && rawJson.action === 'opened') {
            try {
                await createPipedriveDeal(processedData);
            } catch (pError: any) {
                console.error(`[PIPEDRIVE ERROR] ${pError.message}`);
               
            }
        }
        
        res.writeHead(StatusCode.SuccessOK, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'success', 
            fullDescription: processedData.fullDescription,
            parsedEntries: processedData.parsedEntries
        }));

    } catch (error: any) {
        console.error(`[ERROR] ${error.message}`);
        
        let status = StatusCode.ClientErrorBadRequest;
        
        if (error.message === 'Payload too large') {
            status = StatusCode.ClientErrorPayloadTooLarge;
        } else if (!(error instanceof SyntaxError)) {
            status = StatusCode.ServerErrorInternal;
        }

        res.writeHead(status).end(error.message);
    }
}

export function startServer(): void {
    const port = Number(config.PORT) || 3000;
    http.createServer(handleRequest).listen(port, '0.0.0.0', () => {
        console.log(`Server listening on port ${port}`);
    });
}