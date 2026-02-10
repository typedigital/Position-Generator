// 1. Standard Testing Imports
const request = require('supertest');
const http = require('http');
const crypto = require('crypto');
const StatusCode = require('../src/constants/statusCode'); // Import codes

describe('FEATURE: GitHub Webhook Security & Integration', () => {
    let server;
    const TEST_SECRET = 'test_secret_123';

    // 2. SETUP: Environment configuration and server initialization
    beforeAll(() => {
        process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
        process.env.GEMINI_API_KEY = 'fake_key';

        jest.resetModules();

        const { handleRequest } = require('../src/server/server');
        server = http.createServer(handleRequest);
    });

    afterAll((done) => {
        if (server && server.listening) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('SCENARIO: Authenticated Webhook Delivery', () => {
        test('GIVEN a valid payload WHEN signed with the correct secret THEN the server should accept it', async () => {
            const payload = { issue: { title: "Test" }, repository: { full_name: "repo" } };
            const bodyString = JSON.stringify(payload);
            
            const hmac = crypto.createHmac('sha256', TEST_SECRET);
            const signature = 'sha256=' + hmac.update(bodyString).digest('hex');

            const response = await request(server)
                .post('/github/webhook')
                .set('x-hub-signature-256', signature)
                .set('Content-Type', 'application/json')
                .send(bodyString);

            // Use the "Enum" here
            expect(response.status).toBe(StatusCode.SuccessOK);
            expect(response.body).toHaveProperty('status', 'success');
        });
    });

    describe('SCENARIO: Unauthorized/Invalid Webhook Delivery', () => {
        test('GIVEN an incoming request WHEN the signature is incorrect THEN it should return 401', async () => {
            const invalidSignature = 'sha256=wrong_hash_value';
            const payload = JSON.stringify({ data: 'untrusted' });

            const response = await request(server)
                .post('/github/webhook')
                .set('x-hub-signature-256', invalidSignature)
                .send(payload);

            // Use the "Enum" here
            expect(response.status).toBe(StatusCode.ClientErrorUnauthorized);
        });

        test('GIVEN a request with no signature THEN the server should reject it', async () => {
            const response = await request(server)
                .post('/github/webhook')
                .send({ some: "data" });

            expect(response.status).toBe(StatusCode.ClientErrorUnauthorized);
        });
    });

    describe('SCENARIO: Edge Cases', () => {
        test('GIVEN a non-existent URL THEN it should return 404', async () => {
            const response = await request(server).get('/unknown-route');
            expect(response.status).toBe(StatusCode.ClientErrorNotFound);
        });

        test('GIVEN an oversized payload THEN it should return 413', async () => {
            // Create a "huge" body to trigger the limit we added to getRequestBody
            const hugeBody = 'a'.repeat(2 * 1024 * 1024); // 2MB
            
            const response = await request(server)
                .post('/github/webhook')
                .send(hugeBody);

            expect(response.status).toBe(StatusCode.ClientErrorPayloadTooLarge);
        });
    });
});