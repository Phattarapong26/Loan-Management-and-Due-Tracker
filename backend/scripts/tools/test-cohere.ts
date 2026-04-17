
import { CohereClient } from 'cohere-ai';
import fs from 'fs';

// Manual .env loading
const envPath = '/Users/medlab/Desktop/SMEBank2026/backend/.env';

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const lines = envConfig.split('\n');
    for (const line of lines) {
        const [key, val] = line.split('=');
        if (key && val) process.env[key.trim()] = val.trim();
    }
}

async function testCohere() {
    const key = process.env.COHERE_API_KEY;
    if (!key) {
        console.error('❌ Error: COHERE_API_KEY not found in .env');
        return;
    }

    const cohere = new CohereClient({
        token: key,
    });

    console.log('🔍 Listing available models...');
    try {
        const list = await cohere.models.list();
        if (list && list.models) {
            const chatModels = list.models.filter(m => m.endpoints && m.endpoints.includes('chat'));
            console.log(`✅ Found ${chatModels.length} chat models:`);
            chatModels.forEach(m => console.log(`   - ${m.name} (Context: ${m.contextLength})`));

            // Pick the first available one to test
            if (chatModels.length > 0) {
                const bestModel = chatModels.find(m => m.name.includes('plus'))?.name || chatModels[0].name;
                console.log(`\n🚀 Testing Best Model: ${bestModel}...`);

                const response = await cohere.chat({
                    message: "Return JSON: {\"status\": \"ok\", \"model\": \"" + bestModel + "\"}",
                    model: bestModel,
                    temperature: 0.1,
                });
                console.log(`📡 Response: ${response.text}`);
            }
        }
    } catch (e: any) {
        console.error('❌ Failed to list models:', e.message);
    }
}

testCohere();
