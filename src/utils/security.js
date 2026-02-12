const crypto = require('crypto');
const config = require('../config/config');

// Verify GitHub webhook signature
function verifySignature(body, signature) {
    if (!signature) {
        console.error('[SECURITY] No signature found!');
        return false;
    }

    // use secret from environment variable or config file dinamically
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
        return false;
    }

    return true;
}

module.exports = {
    verifySignature
};