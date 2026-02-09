const crypto = require('crypto');
const config = require('../config/config');

// Verify GitHub webhook signature
function verifySignature(body, signature) {
    if (!signature) {
        console.error('[SECURITY] No signature found!');
        return false;
    }

    const hmac = crypto.createHmac('sha256', config.GITHUB_WEBHOOK_SECRET);
    const digest = Buffer.from('sha256=' + hmac.update(body).digest('hex'), 'utf8');
    const checksum = Buffer.from(signature, 'utf8');

    // crypto.timingSafeEqual prevents timing attacks
    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        console.error('[SECURITY] Signature mismatch! Request is not from GitHub.');
        return false;
    }

    console.log('[SECURITY] Signature verified. Proceeding to parse data...');
    return true;
}

module.exports = {
    verifySignature
};