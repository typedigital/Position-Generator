import dotenv from "dotenv";
dotenv.config();

// Define an interface to enforce strict types
interface Config {
  PORT: number;
  GEMINI_API_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  CUSTOMER_EMAIL: string;
  PIPEDRIVE_API_KEY: string;
}

const config: Config = {
  PORT: Number(process.env.PORT) || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || "",
  EMAIL_USER: process.env.EMAIL_USER || "", // Fallback to "" ensures it's a string
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  CUSTOMER_EMAIL: process.env.CUSTOMER_EMAIL || "",
  PIPEDRIVE_API_KEY: process.env.PIPEDRIVE_API_KEY || "",
};

export default config;