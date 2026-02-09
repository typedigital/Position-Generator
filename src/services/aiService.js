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
        console.log('[AI] Warning: Empty description provided. Skipping AI.');
        return 'No issue description was provided.';
    }

    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];

    for (const modelName of models) {
        try {
            console.log(`[AI] Attempting short rewrite with ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const prompt = `Summarize the following GitHub issue into a single, professional paragraph. 
            Do not use any special characters like asterisks, hashes, dashes, or brackets. 
            Keep it strictly under 450 characters. Text: ${text}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let output = response.text().trim();
            
            output = cleanSpecialChars(output);
            output = output.length > 500 ? output.substring(0, 497) + '...' : output;

            console.log(`[AI] SUCCESS: Summary generated (${output.length} chars)`);
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