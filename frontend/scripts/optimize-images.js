#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts JPEG images to WebP format with quality optimization
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeImage(inputPath, outputPath, quality = 80) {
  try {
    const info = await sharp(inputPath)
      .resize(1920, 360, { fit: 'cover', position: 'center' })
      .webp({ quality })
      .toFile(outputPath);
    
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = info.size;
    const savings = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    console.log(`✅ Optimized: ${path.basename(inputPath)}`);
    console.log(`   Input:  ${(inputSize / 1024).toFixed(0)} KB`);
    console.log(`   Output: ${(outputSize / 1024).toFixed(0)} KB`);
    console.log(`   Saved:  ${savings}% (${((inputSize - outputSize) / 1024).toFixed(0)} KB)\n`);
    
    return { success: true, savings: inputSize - outputSize };
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
    return { success: false, error };
  }
}

async function optimizeLogo(inputPath, outputPath) {
  try {
    // Create optimized logo at actual display size
    const info = await sharp(inputPath)
      .resize(96, 137, { fit: 'inside' }) // Max size for h-24 (96px)
      .webp({ quality: 90 })
      .toFile(outputPath);
    
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = info.size;
    const savings = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    console.log(`✅ Optimized: ${path.basename(inputPath)}`);
    console.log(`   Input:  ${(inputSize / 1024).toFixed(0)} KB`);
    console.log(`   Output: ${(outputSize / 1024).toFixed(0)} KB`);
    console.log(`   Saved:  ${savings}% (${((inputSize - outputSize) / 1024).toFixed(0)} KB)\n`);
    
    return { success: true, savings: inputSize - outputSize };
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
    return { success: false, error };
  }
}

async function main() {
  console.log('🖼️  Image Optimization Starting...\n');
  
  const publicDir = path.join(__dirname, '..', 'public');
  const bannerJpeg = path.join(publicDir, 'banner.JPEG');
  const bannerWebp = path.join(publicDir, 'banner.webp');
  const logoPng = path.join(publicDir, 'logo.png');
  const logoWebp = path.join(publicDir, 'logo.webp');
  
  let totalSavings = 0;
  
  // Optimize banner image
  if (fs.existsSync(bannerJpeg)) {
    const result = await optimizeImage(bannerJpeg, bannerWebp, 80);
    if (result.success) {
      totalSavings += result.savings;
    }
  }
  
  // Optimize logo image
  if (fs.existsSync(logoPng)) {
    const result = await optimizeLogo(logoPng, logoWebp);
    if (result.success) {
      totalSavings += result.savings;
    }
  }
  
  if (totalSavings > 0) {
    console.log('✨ Optimization complete!');
    console.log(`💾 Total savings: ${(totalSavings / 1024).toFixed(0)} KB\n`);
    console.log(`📝 Next steps:`);
    console.log(`   1. Update components to use .webp images`);
    console.log(`   2. Add <picture> tags with fallbacks`);
    console.log(`   3. Test in your app\n`);
  } else {
    console.error('❌ No images optimized');
    process.exit(1);
  }
}

main();
