import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import config from "../config/config.js";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export function cleanSpecialChars(text: string): string {
  return text
    .replace(/[#*_\[\]\-|>+]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateClientDescription(text: string | null | undefined): Promise<string> {
  if (!text || !text.trim()) {
    return "No issue description was provided.";
  }

  const promptTemplatePath = path.join(process.cwd(), "prompt", "prompt.txt");
  let promptTemplate: string;
  
  try {
    promptTemplate = fs.readFileSync(promptTemplatePath, "utf-8");
    console.log(`[AI-SERVICE] Success: Prompt loaded from ${promptTemplatePath}`);
  } catch (err) {
    console.error(`[AI-SERVICE] Error: Failed to load prompt.txt. Path: ${promptTemplatePath}`);
    promptTemplate = "Summarize this: {{text}}"; // Fallback template
  }

  const modelName = "gemini-2.0-flash";

  try {
    const model: GenerativeModel = genAI.getGenerativeModel({ model: modelName });
    const prompt = promptTemplate.replace("{{text}}", text);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let output = response.text().trim();

    output = cleanSpecialChars(output);
    
    return output.length > 500 ? output.substring(0, 497) + "..." : output;
    
  } catch (err: any) {
    console.error(`[AI] FAILURE: ${modelName} failed. Error: ${err.message}`);
    return cleanSpecialChars(text).substring(0, 500);
  }
}