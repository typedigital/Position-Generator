import dotenv from "dotenv";
dotenv.config();

const config = {
  PORT: Number(process.env.PORT) || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || "",
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  CUSTOMER_EMAIL: process.env.CUSTOMER_EMAIL || "",
  PIPEDRIVE_API_KEY: process.env.PIPEDRIVE_API_KEY || "",
} as const;

export default config;
