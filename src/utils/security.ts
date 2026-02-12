import crypto from 'crypto';
import config from '../config/config.js';


export function verifyGitHubSignature(body: string, signature: string | undefined): boolean {
    if (!signature) {
        console.error('[SECURITY] No signature found!');
        return false;
    }

    const secret = config.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
        console.error('[SECURITY] No secret configured!');
        return false;
    }

    try {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from('sha256=' + hmac.update(body).digest('hex'), 'utf8');
        const checksum = Buffer.from(signature, 'utf8');


        if (checksum.length !== digest.length) {
            return false;
        }

        return crypto.timingSafeEqual(digest, checksum);
    } catch (error) {
        console.error('[SECURITY] Verification error:', error);
        return false;
    }
}