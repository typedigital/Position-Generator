const crypto = require('crypto');
const config = require('../config/config');

// Verify GitHub webhook signature
function verifySignature(body, signature) {
    if (!signature) {
        console.error('[SECURITY] No signature found!');
        return false;
    }

    // ✨ ПРАВКА: Беремо секрет з env або з конфігу динамічно
    const secret = process.env.GITHUB_WEBHOOK_SECRET || config.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
        console.error('[SECURITY] No secret configured!');
        return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from('sha256=' + hmac.update(body).digest('hex'), 'utf8');
    const checksum = Buffer.from(signature, 'utf8');

    // crypto.timingSafeEqual prevents timing attacks
    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        console.error('[SECURITY] Signature mismatch!');
        return false;
    }

    console.log('[SECURITY] Signature verified.');
    return true;
}

module.exports = {
    verifySignature
};