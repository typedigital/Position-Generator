import 'dotenv/config';

const requiredEnvVars = [
    'GEMINI_API_KEY',
    'GITHUB_WEBHOOK_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS'
] as const;

for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`❌ MISSING ENV VAR: ${key}. Please check your .env file.`);
    }
}

const config = {
    PORT: Number(process.env.PORT) || 3000,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
    EMAIL_USER: process.env.EMAIL_USER!,
    EMAIL_PASS: process.env.EMAIL_PASS!,
    EMAIL_RECIPIENT: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER!
} as const;

export default config;