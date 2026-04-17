/**
 * Debug Rich Menu Image Upload
 * 
 * This script helps debug the 404 error when uploading Rich Menu images
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { env } from './src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';
const ACCESS_TOKEN = env.LINE_CHANNEL_ACCESS_TOKEN;

async function debugRichMenuUpload() {
    console.log('🔍 Debugging Rich Menu Image Upload...\n');
    
    if (!ACCESS_TOKEN) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found');
        return;
    }
    
    console.log('✅ Access token found');
    console.log(`📡 API Base URL: ${LINE_MESSAGING_API}`);
    
    // Test with admin Rich Menu
    const richMenuId = 'richmenu-20bde4eb98355badfcf04553b25b91e2';
    const imagePath = path.join(__dirname, '../public/richmenu/admin.png');
    
    console.log(`\n🎯 Testing with Rich Menu ID: ${richMenuId}`);
    console.log(`📁 Image path: ${imagePath}`);
    
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
        console.log('❌ Image file not found');
        return;
    }
    
    const stats = fs.statSync(imagePath);
    console.log(`📏 Image size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Step 1: Verify Rich Menu exists
    console.log('\n🔍 Step 1: Verifying Rich Menu exists...');
    try {
        const response = await axios.get(
            `${LINE_MESSAGING_API}/richmenu/${richMenuId}`,
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                },
            }
        );
        console.log('✅ Rich Menu exists');
        console.log(`📝 Name: ${response.data.name}`);
        console.log(`📏 Size: ${response.data.size.width}x${response.data.size.height}`);
    } catch (error: any) {
        console.log('❌ Rich Menu verification failed:', error.response?.status, error.response?.statusText);
        if (error.response?.data) {
            console.log('📄 Error details:', JSON.stringify(error.response.data, null, 2));
        }
        return;
    }
    
    // Step 2: Test image upload with detailed error info
    console.log('\n📤 Step 2: Testing image upload...');
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const uploadUrl = `${LINE_MESSAGING_API}/richmenu/${richMenuId}/content`;
        
        console.log(`🌐 Upload URL: ${uploadUrl}`);
        console.log(`📦 Buffer size: ${imageBuffer.length} bytes`);
        
        const response = await axios.post(
            uploadUrl,
            imageBuffer,
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'image/png',
                },
                timeout: 30000, // 30 second timeout
            }
        );
        
        console.log('✅ Image upload successful!');
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📄 Response data:`, response.data);
        
    } catch (error: any) {
        console.log('❌ Image upload failed');
        console.log(`📊 Status: ${error.response?.status}`);
        console.log(`📄 Status Text: ${error.response?.statusText}`);
        
        if (error.response?.data) {
            console.log('📄 Error details:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.headers) {
            console.log('📋 Response headers:', error.response.headers);
        }
        
        // Check if it's a timeout
        if (error.code === 'ECONNABORTED') {
            console.log('⏰ Request timed out');
        }
        
        // Check if it's a network error
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('🌐 Network connection error');
        }
    }
    
    // Step 3: Test with a smaller test image
    console.log('\n🧪 Step 3: Testing with minimal test image...');
    try {
        // Create a minimal 1x1 PNG for testing
        const minimalPng = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
            0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, // image data
            0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 
            0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, // IEND chunk
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        console.log(`📦 Test image size: ${minimalPng.length} bytes`);
        
        const response = await axios.post(
            `${LINE_MESSAGING_API}/richmenu/${richMenuId}/content`,
            minimalPng,
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'image/png',
                },
                timeout: 10000,
            }
        );
        
        console.log('✅ Minimal image upload successful!');
        console.log('💡 The issue might be with the actual image file');
        
    } catch (error: any) {
        console.log('❌ Minimal image upload also failed');
        console.log(`📊 Status: ${error.response?.status}`);
        console.log('💡 This suggests an API or authentication issue');
    }
}

// Run the debug
debugRichMenuUpload()
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });