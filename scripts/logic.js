// scripts/logic.js

/**
 * @typedef {object} WoodCutInput
 * @property {number} materialLength
 * @property {number} unitPrice
 * @property {number} cutPrice
 * @property {number} bladeWidth
 * @property {number[]} partsListRaw - Original part lengths (without blade width)
 */
/**
 * @typedef {number[]} BinItem - Array of part lengths including blade width
 */
/**
 * @typedef {object} WoodCutResult
 * @property {number} materialQuantity
 * @property {number} materialPriceTotal
 * @property {number} cutCount
 * @property {number} cutPriceTotal
 * @property {number} totalPrice
 * @property {BinItem[]} packedBins
 * @property {WoodCutInput} inputParams - Input parameters used for this calculation
 */
/**
 * @typedef {{success: true, result: WoodCutResult} | {success: false, error: string}} CalculationOutcome
 */
/**
 * @typedef {object} PackedBinInternal
 * @property {number[]} items
 * @property {number} remainingCapacity
 */


/**
 * First Fit Decreasing (FFD) Bin Packing Algorithm.
 * @param {number} binCapacity
 * @param {number[]} items - Items with blade width included.
 * @returns {BinItem[]}
 */
function binPackingFFD(binCapacity, items) {
  const sortedItems = [...items].sort((a, b) => b - a);
  /** @type {PackedBinInternal[]} */
  const bins = [];

  for (const item of sortedItems) {
    if (item > binCapacity) {
      console.warn(`Item size ${item} exceeds bin capacity ${binCapacity}. Skipping.`);
      continue;
    }
    let placed = false;
    for (const bin of bins) {
      if (bin.remainingCapacity >= item) {
        bin.items.push(item);
        bin.remainingCapacity -= item;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({ items: [item], remainingCapacity: binCapacity - item });
    }
  }
  return bins.map(bin => bin.items);
}

/**
* Performs the wood cut calculation including validation.
* @param {WoodCutInput} input
* @returns {CalculationOutcome}
*/
export function calculateOptimalCut(input) {
  const { materialLength, unitPrice, cutPrice, bladeWidth, partsListRaw } = input;

  // --- Input Validation ---
  const errorMessages = [];
  if (isNaN(materialLength) || materialLength <= 0) errorMessages.push("材料定尺は正の数で入力してください。");
  if (isNaN(unitPrice) || unitPrice < 0) errorMessages.push("材料単価は0以上の数で入力してください。");
  if (isNaN(cutPrice) || cutPrice < 0) errorMessages.push("カット単価は0以上の数で入力してください。");
  if (isNaN(bladeWidth) || bladeWidth < 0) errorMessages.push("鋸刃幅は0以上の数で入力してください。");
  if (!partsListRaw || partsListRaw.length === 0) errorMessages.push("部材リストを入力してください。");
  // Assuming parsePartsList already handled basic parsing errors and NaN check
  else if (partsListRaw.some(l => l <= 0)) errorMessages.push("部材リストには正の数を入力してください。");
  else if (partsListRaw.some(l => l + bladeWidth > materialLength)) {
    errorMessages.push(`刃幅(${bladeWidth}mm)を含めた長さが材料定尺(${materialLength}mm)を超える部材があります。`);
  }

  if (errorMessages.length > 0) {
    return { success: false, error: errorMessages.join('<br>') }; // Use <br> for HTML display
  }

  // --- Calculation ---
  try {
    const partsWithBlade = partsListRaw.map(l => l + bladeWidth);
    const packedBins = binPackingFFD(materialLength, partsWithBlade);
    const materialQuantity = packedBins.length;
    const materialPriceTotal = materialQuantity * unitPrice;
    let cutCount = 0;
    packedBins.forEach(binItems => { if (binItems.length > 0) cutCount += (binItems.length - 1); });
    const cutPriceTotal = cutCount * cutPrice;
    const totalPrice = materialPriceTotal + cutPriceTotal;

    /** @type {WoodCutResult} */
    const result = {
      materialQuantity,
      materialPriceTotal,
      cutCount,
      cutPriceTotal,
      totalPrice,
      packedBins,
      inputParams: input,
    };
    return { success: true, result };
  } catch (err) {
    console.error("Calculation Error:", err);
    return { success: false, error: "計算中に予期せぬエラーが発生しました。" };
  }
}