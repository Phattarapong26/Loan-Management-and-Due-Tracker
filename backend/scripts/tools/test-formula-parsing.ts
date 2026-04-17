#!/usr/bin/env tsx
/**
 * Test formula parsing
 */

const testFormulas = [
    "MLR + 1.5%",
    "MRR + 2.0%",
    "ปีที่ 4+: MRR + 1.5%",
    "Year 4+: MLR + 1.0%",
    "MLR - 0.5%",
    "Invalid formula",
];

for (const formula of testFormulas) {
    const extractMatch = formula.match(/(MLR|MRR)\s*([+-])\s*([\d.]+)%?/i);
    
    if (extractMatch) {
        const [fullMatch, baseType, operator, marginStr] = extractMatch;
        console.log(`✅ "${formula}"`);
        console.log(`   Base: ${baseType}, Operator: ${operator}, Margin: ${marginStr}`);
    } else {
        console.log(`❌ "${formula}" - No match`);
    }
}
