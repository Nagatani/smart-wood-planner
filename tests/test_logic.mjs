import { calculateOptimalCut } from '../scripts/logic.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("--- Test 1: Default Scenario ---");
const defInput = {
  materialLength: 1820,
  unitPrice: 598,
  cutPrice: 50,
  bladeWidth: 3,
  partsListRaw: [320, 244, 470, 470, 470, 470, 320, 244, 470, 470, 470, 470]
};
const resDef = calculateOptimalCut(defInput);
assert(resDef.success === true, "Calculation succeeded");
assert(resDef.result.materialQuantity === 3, `Material quantity is 3 (got ${resDef.result.materialQuantity})`);
assert(resDef.result.maxRemaining >= 401, `Max remaining scrap is maximized to >= 401mm (got ${resDef.result.maxRemaining.toFixed(1)}mm)`);
assert(resDef.result.cutCount === 12, `Cut count is 12 for 12 parts with scrap (got ${resDef.result.cutCount})`);
assert(resDef.result.usageEfficiency > 85, `Usage efficiency calculated properly (${resDef.result.usageEfficiency.toFixed(1)}%)`);

console.log("\n--- Test 2: Scrap Maximization vs FFD ---");
const test2Input = {
  materialLength: 1000,
  unitPrice: 500,
  cutPrice: 30,
  bladeWidth: 0,
  partsListRaw: [500, 400, 300, 300, 200]
};
const res2 = calculateOptimalCut(test2Input);
assert(res2.success === true, "Test 2 succeeded");
assert(res2.result.materialQuantity === 2, `Test 2 quantity is 2 (got ${res2.result.materialQuantity})`);
assert(res2.result.maxRemaining === 300, `Test 2 max scrap is 300mm (got ${res2.result.maxRemaining})`);

console.log("\n--- Test 3: Cut Count for Exact Fit (No scrap) ---");
const test3Input = {
  materialLength: 1000,
  unitPrice: 500,
  cutPrice: 30,
  bladeWidth: 0,
  partsListRaw: [500, 500]
};
const res3 = calculateOptimalCut(test3Input);
assert(res3.success === true, "Test 3 succeeded");
assert(res3.result.cutCount === 1, `Cut count is 1 for 2 pieces with 0 scrap (got ${res3.result.cutCount})`);
assert(res3.result.maxRemaining === 0, `Scrap is 0mm (got ${res3.result.maxRemaining})`);

console.log("\n--- Test 4: Single Part with Scrap ---");
const test4Input = {
  materialLength: 1000,
  unitPrice: 500,
  cutPrice: 30,
  bladeWidth: 0,
  partsListRaw: [500]
};
const res4 = calculateOptimalCut(test4Input);
assert(res4.success === true, "Test 4 succeeded");
assert(res4.result.cutCount === 1, `Cut count is 1 for 1 piece with scrap (got ${res4.result.cutCount})`);
assert(res4.result.maxRemaining === 500, `Scrap is 500mm (got ${res4.result.maxRemaining})`);

console.log("\n--- Test 5: Performance Benchmark ---");
const t0 = performance.now();
for (let i = 0; i < 20; i++) {
  calculateOptimalCut(defInput);
}
const elapsed = (performance.now() - t0) / 20;
console.log(`Average execution time: ${elapsed.toFixed(2)}ms`);
assert(elapsed < 20, `Execution is fast enough (< 20ms, got ${elapsed.toFixed(2)}ms)`);

if (failed) {
  process.exit(1);
} else {
  console.log("\n🎉 ALL TESTS PASSED!");
}
