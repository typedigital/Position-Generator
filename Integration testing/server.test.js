const request = require('supertest');
const http = require('http');
const crypto = require('crypto');
const { handleRequest } = require('../catchGHInfo'); // Ensure this path is correct

// ... (Mocks for Gemini and Nodemailer stay the same) ...

describe('GitHub Webhook Integration', () => {
    let server;
    const secret = 'test_secret';

    beforeAll(() => {
        process.env.GITHUB_WEBHOOK_SECRET = secret;
        process.env.GEMINI_API_KEY = 'fake_key';
        // Wrap your handler in a server instance
        server = http.createServer(handleRequest);
    });

    test('SUCCESS: Should process valid webhook', async () => {
        const payload = {
            issue: {
                title: "Test Issue",
                number: 1,
                body: "Need a summary",
                state: "open",
                user: { login: "tester" }
            },
            repository: { full_name: "repo/test" }
        };
        const body = JSON.stringify(payload);
        const hmac = crypto.createHmac('sha256', secret);
        const signature = 'sha256=' + hmac.update(body).digest('hex');

        // Pass the SERVER instance to request
        const response = await request(server)
            .post('/github/webhook')
            .set('x-hub-signature-256', signature)
            .send(payload);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
    });

    test('FAILURE: Should return 401 for invalid signature', async () => {
        const response = await request(server)
            .post('/github/webhook')
            .set('x-hub-signature-256', 'wrong-signature')
            .send({ data: 'none' });

        expect(response.status).toBe(401);
    });
});