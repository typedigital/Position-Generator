const request = require('supertest');
const http = require('http');
const crypto = require('crypto');

describe('GitHub Webhook Integration', () => {
    let server;
    const TEST_SECRET = 'test_secret_123';

    beforeAll(() => {
        // 1. Встановлюємо змінні оточення ДО імпорту сервера
        process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
        process.env.GEMINI_API_KEY = 'fake_key';

        // 2. Скидаємо кеш модулів, щоб сервер підтягнув нові env
        jest.resetModules();

        // 3. Імпортуємо функцію обробки запитів
        const { handleRequest } = require('../src/server/server');
        
        // 4. Створюємо сервер, але НЕ викликаємо .listen() (supertest зробить це сам)
        server = http.createServer(handleRequest);
    });

    afterAll((done) => {
        // Перевіряємо, чи сервер існує перед тим як закрити
        if (server && server.listening) {
            server.close(done);
        } else {
            done();
        }
    });

    test('✅ SUCCESS: Should process valid webhook', async () => {
        const payload = { issue: { title: "Test" }, repository: { full_name: "repo" } };
        const bodyString = JSON.stringify(payload);
        
        const hmac = crypto.createHmac('sha256', TEST_SECRET);
        const signature = 'sha256=' + hmac.update(bodyString).digest('hex');

        const response = await request(server)
            .post('/github/webhook')
            .set('x-hub-signature-256', signature)
            .set('Content-Type', 'application/json')
            .send(bodyString);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
    });

    test('❌ FAILURE: Should return 401 for invalid signature', async () => {
        const response = await request(server)
            .post('/github/webhook')
            .set('x-hub-signature-256', 'sha256=wrong')
            .send(JSON.stringify({ data: 'none' }));

        expect(response.status).toBe(401);
    });
});