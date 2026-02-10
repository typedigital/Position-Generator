import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import config from "../config/config.js";

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

  const models: string[] = ["gemini-1.5-flash", "gemini-2.0-flash"];

  for (const modelName of models) {
    try {
      const model: GenerativeModel = genAI.getGenerativeModel({ model: modelName });

      const prompt = `Fasse das folgende GitHub-Issue in einem einzigen, professionellen Absatz auf Deutsch zusammen. 

        Befolge dabei diese strikten Regeln:
        1. Nenne bis zu 3 Kernpunkte oder Positionen als textliche Aufzählung innerhalb des Absatzes.
        2. Benutze keinerlei Sonderzeichen wie Sternchen, Rauten, Bindestriche, Spiegelstriche oder Klammern.
        3. Der gesamte Text muss unter 450 Zeichen bleiben.

        Text: ${text}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let output = response.text().trim();

      output = cleanSpecialChars(output);
      
      // Enforce character limit
      return output.length > 500 ? output.substring(0, 497) + "..." : output;
      
    } catch (err: any) {
      console.error(`[AI] FAILURE: ${modelName} failed. Error: ${err.message}`);
      // Continue to next model in loop
    }
  }


  return cleanSpecialChars(text).substring(0, 500);
}