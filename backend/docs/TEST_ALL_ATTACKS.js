/**
 * 🧪 Complete Security Testing Script
 * 
 * วิธีใช้:
 * 1. เปิด Browser Console (F12)
 * 2. Copy script ทั้งหมดนี้
 * 3. Paste ลงใน Console
 * 4. กด Enter
 * 5. ดูผลลัพธ์ใน Console และ Security Dashboard
 */

const API_URL = 'https://supervision-remote-purchased-floors.trycloudflare.com';

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test Results Tracker
const results = {
    sqlInjection: { tested: false, blocked: false, attempts: 0 },
    xss: { tested: false, blocked: false, attempts: 0 },
    commandInjection: { tested: false, blocked: false, attempts: 0 },
    bruteForce: { tested: false, blocked: false, attempts: 0 },
    validationScanning: { tested: false, blocked: false, attempts: 0 }
};

// 🔴 Test 1: SQL Injection (CRITICAL - Should Auto-Block)
async function testSQLInjection() {
    console.log('\n🔴 ========================================');
    console.log('🔴 TEST 1: SQL Injection (CRITICAL)');
    console.log('🔴 Expected: Auto-block after 1-2 attempts');
    console.log('🔴 ========================================\n');
    
    const payloads = [
        "admin' OR '1'='1",
        "1' UNION SELECT * FROM users--",
        "'; DROP TABLE users--"
    ];
    
    for (let i = 0; i < payloads.length; i++) {
        results.sqlInjection.attempts++;
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: payloads[i],
                    password: 'test123456'
                })
            });
            
            const data = await response.json();
            console.log(`📝 Attempt ${i + 1}/${payloads.length}:`, response.status, data.error?.message || data.message);
            
            if (response.status === 403) {
                console.log('✅ SUCCESS: IP AUTO-BLOCKED after SQL Injection!');
                results.sqlInjection.blocked = true;
                results.sqlInjection.tested = true;
                return true;
            }
        } catch (error) {
            console.error(`❌ Error on attempt ${i + 1}:`, error.message);
        }
        
        await delay(500);
    }
    
    results.sqlInjection.tested = true;
    console.log('⚠️  WARNING: IP was NOT blocked after SQL Injection attempts');
    return false;
}

// 🟠 Test 2: XSS (HIGH - Should Log Only)
async function testXSS() {
    console.log('\n🟠 ========================================');
    console.log('🟠 TEST 2: XSS Attack (HIGH)');
    console.log('🟠 Expected: Logged but NOT blocked');
    console.log('🟠 ========================================\n');
    
    const payloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)'
    ];
    
    for (let i = 0; i < payloads.length; i++) {
        results.xss.attempts++;
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: `xss${i}@test.com`,
                    password: payloads[i]
                })
            });
            
            const data = await response.json();
            console.log(`📝 XSS Attempt ${i + 1}/${payloads.length}:`, response.status);
            
            if (response.status === 403) {
                console.log('⚠️  WARNING: IP was blocked (XSS should NOT auto-block)');
                results.xss.blocked = true;
            }
        } catch (error) {
            console.error(`❌ Error on attempt ${i + 1}:`, error.message);
        }
        
        await delay(500);
    }
    
    results.xss.tested = true;
    if (!results.xss.blocked) {
        console.log('✅ SUCCESS: XSS logged but NOT blocked (correct behavior)');
    }
    return true;
}

// 🔴 Test 3: Command Injection (CRITICAL - Should Auto-Block)
async function testCommandInjection() {
    console.log('\n🔴 ========================================');
    console.log('🔴 TEST 3: Command Injection (CRITICAL)');
    console.log('🔴 Expected: Auto-block after 1-2 attempts');
    console.log('🔴 ========================================\n');
    
    const payloads = [
        '| ls -la',
        '; cat /etc/passwd',
        '`whoami`'
    ];
    
    for (let i = 0; i < payloads.length; i++) {
        results.commandInjection.attempts++;
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: payloads[i]
                })
            });
            
            const data = await response.json();
            console.log(`📝 Attempt ${i + 1}/${payloads.length}:`, response.status, data.error?.message || data.message);
            
            if (response.status === 403) {
                console.log('✅ SUCCESS: IP AUTO-BLOCKED after Command Injection!');
                results.commandInjection.blocked = true;
                results.commandInjection.tested = true;
                return true;
            }
        } catch (error) {
            console.error(`❌ Error on attempt ${i + 1}:`, error.message);
        }
        
        await delay(500);
    }
    
    results.commandInjection.tested = true;
    console.log('⚠️  WARNING: IP was NOT blocked after Command Injection attempts');
    return false;
}

// 🟡 Test 4: Brute Force (Should Auto-Block after 5 attempts)
async function testBruteForce() {
    console.log('\n🟡 ========================================');
    console.log('🟡 TEST 4: Brute Force Attack');
    console.log('🟡 Expected: Auto-block after 5 failed logins');
    console.log('🟡 ========================================\n');
    
    for (let i = 1; i <= 7; i++) {
        results.bruteForce.attempts++;
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@example.com',
                    password: `wrongpass${i}12345678` // Valid length
                })
            });
            
            const data = await response.json();
            console.log(`📝 Failed Login ${i}/7:`, response.status, data.error?.message || data.message);
            
            if (response.status === 403) {
                console.log(`✅ SUCCESS: IP AUTO-BLOCKED after ${i} failed login attempts!`);
                results.bruteForce.blocked = true;
                results.bruteForce.tested = true;
                return true;
            }
        } catch (error) {
            console.error(`❌ Error on attempt ${i}:`, error.message);
        }
        
        await delay(1000);
    }
    
    results.bruteForce.tested = true;
    console.log('⚠️  WARNING: IP was NOT blocked after brute force attempts');
    return false;
}

// 🔵 Test 5: Validation Scanning (Should Auto-Block after 20 failures)
async function testValidationScanning() {
    console.log('\n🔵 ========================================');
    console.log('🔵 TEST 5: Validation Scanning');
    console.log('🔵 Expected: Auto-block after 20 validation failures');
    console.log('🔵 ========================================\n');
    
    for (let i = 1; i <= 22; i++) {
        results.validationScanning.attempts++;
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'scan@test.com',
                    password: `${i}` // Too short - validation failure
                })
            });
            
            const data = await response.json();
            
            if (i % 5 === 0) {
                console.log(`📝 Validation Failure ${i}/22:`, response.status);
            }
            
            if (response.status === 403) {
                console.log(`✅ SUCCESS: IP AUTO-BLOCKED after ${i} validation failures!`);
                results.validationScanning.blocked = true;
                results.validationScanning.tested = true;
                return true;
            }
        } catch (error) {
            console.error(`❌ Error on attempt ${i}:`, error.message);
        }
        
        await delay(300);
    }
    
    results.validationScanning.tested = true;
    console.log('⚠️  WARNING: IP was NOT blocked after validation scanning');
    return false;
}

// Print Summary
function printSummary() {
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SECURITY TESTING SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const tests = [
        { name: 'SQL Injection (CRITICAL)', data: results.sqlInjection, shouldBlock: true },
        { name: 'XSS Attack (HIGH)', data: results.xss, shouldBlock: false },
        { name: 'Command Injection (CRITICAL)', data: results.commandInjection, shouldBlock: true },
        { name: 'Brute Force Attack', data: results.bruteForce, shouldBlock: true },
        { name: 'Validation Scanning', data: results.validationScanning, shouldBlock: true }
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach((test, index) => {
        const icon = test.data.tested ? (test.data.blocked === test.shouldBlock ? '✅' : '❌') : '⏭️';
        const status = test.data.tested 
            ? (test.data.blocked === test.shouldBlock ? 'PASS' : 'FAIL')
            : 'SKIPPED';
        
        console.log(`${icon} Test ${index + 1}: ${test.name}`);
        console.log(`   Status: ${status}`);
        console.log(`   Attempts: ${test.data.attempts}`);
        console.log(`   Blocked: ${test.data.blocked ? 'Yes' : 'No'}`);
        console.log(`   Expected: ${test.shouldBlock ? 'Should Block' : 'Should NOT Block'}`);
        console.log('');
        
        if (test.data.tested) {
            if (test.data.blocked === test.shouldBlock) {
                passed++;
            } else {
                failed++;
            }
        }
    });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${5 - passed - failed}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📍 Next Steps:');
    console.log('1. Check Security Dashboard: /monitoring/security');
    console.log('2. Check Audit Logs: /monitoring/audit-logs');
    console.log('3. Verify blocked IPs in "Blocked IPs" section');
    console.log('4. Test manual block/unblock functionality');
    console.log('5. Check database: SELECT * FROM security_events;');
    console.log('\n');
}

// Main Test Runner
async function runAllTests() {
    console.clear();
    console.log('🚀 Starting Complete Security Test Suite...\n');
    console.log('⚠️  WARNING: This will attempt to attack your system!');
    console.log('⚠️  Your IP may be blocked during testing.');
    console.log('⚠️  Make sure you can unblock yourself from Security Dashboard.\n');
    
    const startTime = Date.now();
    
    try {
        // Run tests sequentially
        await testSQLInjection();
        await delay(2000);
        
        await testXSS();
        await delay(2000);
        
        await testCommandInjection();
        await delay(2000);
        
        await testBruteForce();
        await delay(2000);
        
        await testValidationScanning();
        
    } catch (error) {
        console.error('❌ Test suite error:', error);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Total test duration: ${duration} seconds`);
    
    printSummary();
}

// Auto-run when script is loaded
console.log('🧪 Security Test Script Loaded!');
console.log('📝 Run: runAllTests()');
console.log('');

// Uncomment to auto-run:
// runAllTests();
