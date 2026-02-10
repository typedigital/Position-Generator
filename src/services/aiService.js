const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// Clean special characters from text
function cleanSpecialChars(text) {
    return text
        .replace(/[#*_\[\]\-|>+]/g, '') 
        .replace(/\s+/g, ' ')
        .trim();
}

// Generate client description using Gemini API
async function generateClientDescription(text) {
    if (!text || !text.trim()) {
        return 'No issue description was provided.';
    }

    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const prompt = `Fasse das folgende GitHub-Issue in einem einzigen, professionellen Absatz auf Deutsch zusammen. 

Befolge dabei diese strikten Regeln:
1. Nenne bis zu 3 Kernpunkte oder Positionen als textliche Aufzählung innerhalb des Absatzes.
2. Benutze keinerlei Sonderzeichen wie Sternchen, Rauten, Bindestriche, Spiegelstriche oder Klammern.
3. Der gesamte Text muss unter 450 Zeichen bleiben.

Text: ${text}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let output = response.text().trim();
            
            output = cleanSpecialChars(output);
            output = output.length > 500 ? output.substring(0, 497) + '...' : output;

           
            return output;
        } catch (err) {
            console.error(`[AI] FAILURE: ${modelName} failed. Error: ${err.message}`);
        }
    }

    return cleanSpecialChars(text).substring(0, 500); 
}

module.exports = {
    generateClientDescription,
    cleanSpecialChars
};