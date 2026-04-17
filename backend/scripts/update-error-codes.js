/**
 * Script to update all Controllers with proper Error Codes
 * Run: node backend/scripts/update-error-codes.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Error Code Mappings
const errorMappings = [
  // Authentication Errors
  { pattern: /User not authenticated/gi, code: 'UNAUTHORIZED' },
  { pattern: /Invalid credentials/gi, code: 'INVALID_CREDENTIALS' },
  { pattern: /Session expired/gi, code: 'SESSION_EXPIRED' },
  { pattern: /Token invalid/gi, code: 'TOKEN_INVALID' },
  
  // Validation Errors
  { pattern: /Validation failed/gi, code: 'VALIDATION_ERROR' },
  { pattern: /Invalid format/gi, code: 'INVALID_FORMAT' },
  { pattern: /required/gi, code: 'REQUIRED_FIELD' },
  
  // Business Logic Errors
  { pattern: /Branch ID is required/gi, code: 'BRANCH_ID_REQUIRED' },
  { pattern: /not found/gi, code: 'NOT_FOUND' },
  { pattern: /already exists/gi, code: 'DUPLICATE_ENTRY' },
  { pattern: /duplicate/gi, code: 'DUPLICATE_ENTRY' },
  { pattern: /permission/gi, code: 'INSUFFICIENT_PERMISSIONS' },
  
  // Concurrency Errors
  { pattern: /Concurrent modification/gi, code: 'CONCURRENT_MODIFICATION' },
  { pattern: /Optimistic lock/gi, code: 'OPTIMISTIC_LOCK_ERROR' },
  
  // Network Errors
  { pattern: /Network error/gi, code: 'NETWORK_ERROR' },
  { pattern: /timeout/gi, code: 'TIMEOUT' },
  { pattern: /connection refused/gi, code: 'CONNECTION_REFUSED' },
  
  // Server Errors
  { pattern: /Internal error/gi, code: 'INTERNAL_ERROR' },
  { pattern: /Database error/gi, code: 'DATABASE_ERROR' },
  { pattern: /Service unavailable/gi, code: 'SERVICE_UNAVAILABLE' },
  
  // Rate Limiting
  { pattern: /Rate limit/gi, code: 'RATE_LIMIT_EXCEEDED' },
  { pattern: /Too many requests/gi, code: 'RATE_LIMIT_EXCEEDED' },
];

function detectErrorCode(errorMessage) {
  for (const mapping of errorMappings) {
    if (mapping.pattern.test(errorMessage)) {
      return mapping.code;
    }
  }
  return null;
}

function updateControllerFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: ResponseUtil.error(reply, 'message', statusCode)
  // Replace with: ResponseUtil.error(reply, 'message', statusCode, 'ERROR_CODE')
  const pattern1 = /ResponseUtil\.error\(reply,\s*['"`]([^'"`]+)['"`],\s*(\d+)\)/g;
  
  content = content.replace(pattern1, (match, message, statusCode) => {
    const errorCode = detectErrorCode(message);
    if (errorCode) {
      modified = true;
      return `ResponseUtil.error(reply, '${message}', ${statusCode}, '${errorCode}')`;
    }
    return match;
  });

  // Pattern 2: ResponseUtil.error(reply, error.message, statusCode)
  // Replace with: ResponseUtil.error(reply, error.message, statusCode, detectErrorCode(error.message))
  const pattern2 = /ResponseUtil\.error\(reply,\s*(?:error\.message|\(error as Error\)\.message|errorMessage),\s*(\d+)\)/g;
  
  content = content.replace(pattern2, (match, statusCode) => {
    modified = true;
    // For dynamic error messages, we can't add a static code, but we can add a comment
    return match; // Keep as is, Error Mapper will handle it
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔍 Scanning for Controller files...\n');
  
  const controllersPattern = path.join(__dirname, '../src/modules/**/controllers/*.controller.ts');
  const files = glob.sync(controllersPattern);
  
  console.log(`Found ${files.length} controller files\n`);
  
  let updatedCount = 0;
  
  files.forEach(file => {
    if (updateControllerFile(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n✨ Done! Updated ${updatedCount} files`);
}

main();
