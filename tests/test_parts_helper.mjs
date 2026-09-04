// tests/test_parts_helper.mjs
import {
  parseTextToPartGroups,
  partGroupsToText,
  addPartToGroups,
  updatePartCountInGroups,
  removePartFromGroups
} from '../scripts/parts-helper.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("--- Test 1: parseTextToPartGroups ---");
const raw = "320, 244, 470, 470, 470, 470, 320, 244, 470, 470, 470, 470";
const groups = parseTextToPartGroups(raw);
assert(groups.length === 3, `Group count is 3 (got ${groups.length})`);
assert(groups.find(g => g.length === 320)?.count === 2, "320mm count is 2");
assert(groups.find(g => g.length === 244)?.count === 2, "244mm count is 2");
assert(groups.find(g => g.length === 470)?.count === 8, "470mm count is 8");

console.log("\n--- Test 2: partGroupsToText round-trip ---");
const textOut = partGroupsToText(groups);
const roundTripped = parseTextToPartGroups(textOut);
assert(roundTripped.length === 3, "Round-trip preserves 3 groups");
assert(roundTripped.reduce((sum, g) => sum + g.count, 0) === 12, "Total piece count is 12");

console.log("\n--- Test 3: addPartToGroups ---");
// 既存の長さに加算
const addedExisting = addPartToGroups(groups, 470, 2);
assert(addedExisting.find(g => g.length === 470)?.count === 10, "470mm increased from 8 to 10");

// 新しい長さを追加
const addedNew = addPartToGroups(groups, 600, 3);
assert(addedNew.length === 4, "Group count increased to 4");
assert(addedNew.find(g => g.length === 600)?.count === 3, "New 600mm has count 3");

console.log("\n--- Test 4: updatePartCountInGroups ---");
// 1本減らす
const decreased = updatePartCountInGroups(groups, 320, -1);
assert(decreased.find(g => g.length === 320)?.count === 1, "320mm decreased to 1");

// カウント0になったら除外される
const zeroed = updatePartCountInGroups(decreased, 320, -1);
assert(zeroed.find(g => g.length === 320) === undefined, "320mm removed when count reaches 0");

console.log("\n--- Test 5: removePartFromGroups ---");
const removed = removePartFromGroups(groups, 470);
assert(removed.find(g => g.length === 470) === undefined, "470mm completely removed");
assert(removed.length === 2, "Remaining groups is 2");

console.log("\n--- Test 6: Empty and Edge Cases ---");
assert(parseTextToPartGroups("").length === 0, "Empty string returns empty array");
assert(parseTextToPartGroups("  \n  ,  ").length === 0, "Whitespace and commas returns empty array");
assert(parseTextToPartGroups("abc, 123").length === 0, "Invalid text returns empty array (safe fallback)");

if (failed) {
  process.exit(1);
} else {
  console.log("\n🎉 ALL PARTS HELPER TESTS PASSED!");
}
