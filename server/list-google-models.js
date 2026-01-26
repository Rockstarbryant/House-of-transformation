const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function listModels() {
  try {
    console.log('Fetching available models...\n');
    
    // Try different model names that might be available
    const modelsToTry = [
      'gemini-1.5-pro',
      'gemini-1.5-flash', 
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-2.0-flash'
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent("Hello");
        console.log(`✅ ${modelName} - AVAILABLE\n`);
      } catch (error) {
        console.log(`❌ ${modelName} - Not available\n`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();