import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EmailData {
  number: number | string;
  title: string;
  fullDescription: string;
  status: string;
  author: string;
  repo: string;
  url: string;
  created?: string;
  parsedEntries?: Array<{ dept?: string | null; num: string | number }>; 
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

function getTemplatePath(): string {
  const pathsToTry = [
    path.resolve(__dirname, "..", "Email template", "email.html"),
    path.resolve(process.cwd(), "src", "Email template", "email.html"),
    path.resolve(process.cwd(), "dist", "Email template", "email.html")
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Template not found. Checked: ${pathsToTry.join(", ")}`);
}

export function generateEmailHtml(data: EmailData | null | undefined): string {
  if (!data) return "<p>Error: No data available.</p>";

  // Logic to build the PT value string from parsed entries
  let ptValue = "N/A";
  if (data.parsedEntries && data.parsedEntries.length > 0) {
    ptValue = data.parsedEntries
      .map((entry) => (entry.dept ? `${entry.dept} ${entry.num}` : String(entry.num)))
      .join(" ");
  }

  try {
    const templatePath = getTemplatePath();
    let html = fs.readFileSync(templatePath, "utf8");

    // Robust Date Formatting
    const eventDate = data.created ? new Date(data.created) : new Date();
    const formattedDate = isNaN(eventDate.getTime()) 
      ? "N/A" 
      : eventDate.toLocaleDateString("de-DE");

    // Mapping keys to data values
    const replacements: Record<string, string> = {
      "{{issueNumber}}": String(data.number || "N/A"),
      "{{title}}": data.title || "No Title",
      "{{description}}": data.fullDescription || "",
      "{{ptValue}}": ptValue,
      "{{status}}": data.status || "Open",
      "{{author}}": data.author || "unknown",
      "{{repo}}": data.repo || "N/A",
      "{{date}}": formattedDate,
      "{{url}}": data.url || "#",
    };

    // Perform global replacement for all keys
    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(key, value);
    }

    return html;
  } catch (error: any) {
    console.error("Replacement Error:", error.message);
    return `<p>Error creating preview: ${error.message}</p>`;
  }
}

export async function sendEmail(
  htmlContent: string, 
  issueNumber: string | number, 
  repo: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailOptions = {
      from: config.EMAIL_USER,
      to: config.EMAIL_RECIPIENT || config.EMAIL_USER,
      subject: `Offer #${issueNumber} - ${repo}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}