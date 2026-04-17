import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

config();

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found');
    process.exit(1);
  }

  console.log('🔍 Fetching available Gemini models...\n');

  try {
    // Try to list models using REST API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ Available Models:\n');

    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((model: any) => {
        console.log(`📦 ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Description: ${model.description}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
        console.log('');
      });
    }

    // Test with models that should work
    console.log('\n🧪 Testing working models...\n');

    const genAI = new GoogleGenerativeAI(apiKey);

    const workingModels = [
      'models/gemini-pro',
      'models/gemini-2.5-flash',
      'gemini-2.5-flash-latest',
      'gemini-2.0-flash-exp',
    ];

    for (const modelName of workingModels) {
      try {
        console.log(`Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hi');
        console.log(`✅ ${modelName} works!`);
      } catch (error: any) {
        console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listAvailableModels();
