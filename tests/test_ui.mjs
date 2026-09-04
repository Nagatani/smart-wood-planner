import { calculateOptimalCut } from '../scripts/logic.js';

const parts = [320, 244, 470, 470, 470, 470, 320, 244, 470, 470, 470, 470];
const outcome = calculateOptimalCut({
  materialLength: 1820,
  unitPrice: 598,
  cutPrice: 50,
  bladeWidth: 3,
  partsListRaw: parts
});

console.log('Success:', outcome.success);
console.log('Result summary:', {
  materialQuantity: outcome.result.materialQuantity,
  maxRemaining: outcome.result.maxRemaining + ' mm',
  cutCount: outcome.result.cutCount,
  totalPrice: outcome.result.totalPrice + ' 円',
  usageEfficiency: outcome.result.usageEfficiency.toFixed(1) + '%'
});

outcome.result.packedBins.forEach((bin, i) => {
  const used = bin.reduce((a, b) => a + b, 0);
  const rem = 1820 - used;
  console.log(`Material #${i + 1}: parts=${bin.length}, used=${used}mm, scrap=${rem}mm`);
});
