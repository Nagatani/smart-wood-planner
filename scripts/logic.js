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
 * @property {number} maxRemaining - Length of the longest reusable scrap [mm]
 * @property {number} totalWaste - Total scrap length across all materials [mm]
 * @property {number} usageEfficiency - Wood usage efficiency percentage (%)
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
 * Best Fit Decreasing (BFD) Bin Packing.
 * @param {number} binCapacity
 * @param {number[]} items
 * @returns {PackedBinInternal[]}
 */
function binPackingBFD(binCapacity, items) {
  const sortedItems = [...items].sort((a, b) => b - a);
  /** @type {PackedBinInternal[]} */
  const bins = [];

  for (const item of sortedItems) {
    let bestIdx = -1;
    let minRem = Infinity;
    for (let i = 0; i < bins.length; i++) {
      if (bins[i].remainingCapacity >= item && bins[i].remainingCapacity - item < minRem) {
        minRem = bins[i].remainingCapacity - item;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      bins[bestIdx].items.push(item);
      bins[bestIdx].remainingCapacity -= item;
    } else {
      bins.push({ items: [item], remainingCapacity: binCapacity - item });
    }
  }
  return bins;
}

/**
 * First Fit Decreasing (FFD) Bin Packing Algorithm.
 * @param {number} binCapacity
 * @param {number[]} items - Items with blade width included.
 * @returns {BinItem[]}
 */
export function binPackingFFD(binCapacity, items) {
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
 * Compares two bin packings.
 * Returns > 0 if A is strictly better than B.
 * 1. Fewer bins is strictly better.
 * 2. Lexicographically larger sorted remainders (maximizes the longest reusable scrap).
 * @param {PackedBinInternal[]} binsA
 * @param {PackedBinInternal[]} binsB
 * @returns {number}
 */
function compareBins(binsA, binsB) {
  if (binsA.length !== binsB.length) {
    return binsB.length - binsA.length;
  }
  const remA = binsA.map(b => b.remainingCapacity).sort((a, b) => b - a);
  const remB = binsB.map(b => b.remainingCapacity).sort((a, b) => b - a);
  for (let i = 0; i < remA.length; i++) {
    if (Math.abs(remA[i] - remB[i]) > 0.001) {
      return remA[i] - remB[i];
    }
  }
  return 0;
}

/**
 * Clones internal bin list.
 * @param {PackedBinInternal[]} bins
 * @returns {PackedBinInternal[]}
 */
function cloneBins(bins) {
  return bins.map(b => ({ items: [...b.items], remainingCapacity: b.remainingCapacity }));
}

/**
 * Cutting Stock Optimization with Scrap Maximization.
 * Minimizes total materials while concentrating remaining capacity to maximize the longest reusable scrap piece.
 * @param {number} materialLength
 * @param {number[]} itemsWithBlade
 * @param {number} [maxTimeMs=120]
 * @returns {PackedBinInternal[]}
 */
export function optimizeCuttingStock(materialLength, itemsWithBlade, maxTimeMs = 120) {
  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const getTime = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());

  const sortedItems = [...itemsWithBlade].sort((a, b) => b - a);

  // 1. Initial heuristic solutions
  let bestBins = binPackingBFD(materialLength, sortedItems);
  const ffdInternal = sortedItems.reduce((acc, item) => {
    let placed = false;
    for (const bin of acc) {
      if (bin.remainingCapacity >= item) {
        bin.items.push(item);
        bin.remainingCapacity -= item;
        placed = true;
        break;
      }
    }
    if (!placed) {
      acc.push({ items: [item], remainingCapacity: materialLength - item });
    }
    return acc;
  }, /** @type {PackedBinInternal[]} */ ([]));

  if (compareBins(ffdInternal, bestBins) > 0) {
    bestBins = ffdInternal;
  }

  // 2. Local Search for maximizing remainders and minimizing bins
  function localSearch(bins) {
    let improved = true;
    while (improved && (getTime() - startTime < maxTimeMs)) {
      improved = false;

      // 1-to-0 move: push item from bin i to bin j
      for (let i = 0; i < bins.length; i++) {
        for (let itIdx = 0; itIdx < bins[i].items.length; itIdx++) {
          const item = bins[i].items[itIdx];
          for (let j = 0; j < bins.length; j++) {
            if (i === j) continue;
            if (bins[j].remainingCapacity >= item) {
              bins[i].items.splice(itIdx, 1);
              bins[i].remainingCapacity += item;
              bins[j].items.push(item);
              bins[j].remainingCapacity -= item;

              const nonZeroBins = bins.filter(b => b.items.length > 0);
              if (compareBins(nonZeroBins, bestBins) > 0) {
                bins = nonZeroBins;
                bestBins = cloneBins(bins);
                improved = true;
                break;
              } else {
                bins[j].items.pop();
                bins[j].remainingCapacity += item;
                bins[i].items.splice(itIdx, 0, item);
                bins[i].remainingCapacity -= item;
              }
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) continue;

      // 1-to-1 swap
      for (let i = 0; i < bins.length; i++) {
        for (let j = i + 1; j < bins.length; j++) {
          for (let itA = 0; itA < bins[i].items.length; itA++) {
            for (let itB = 0; itB < bins[j].items.length; itB++) {
              const itemA = bins[i].items[itA];
              const itemB = bins[j].items[itB];
              const diff = itemA - itemB;
              if (bins[j].remainingCapacity + itemB >= itemA && bins[i].remainingCapacity + itemA >= itemB) {
                bins[i].items[itA] = itemB;
                bins[i].remainingCapacity += diff;
                bins[j].items[itB] = itemA;
                bins[j].remainingCapacity -= diff;

                if (compareBins(bins, bestBins) > 0) {
                  bestBins = cloneBins(bins);
                  improved = true;
                  break;
                } else {
                  bins[i].items[itA] = itemA;
                  bins[i].remainingCapacity -= diff;
                  bins[j].items[itB] = itemB;
                  bins[j].remainingCapacity += diff;
                }
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) continue;

      // 2-to-1 swap: swap 2 smaller items with 1 larger item
      for (let i = 0; i < bins.length; i++) {
        for (let j = 0; j < bins.length; j++) {
          if (i === j) continue;
          if (bins[i].items.length < 2) continue;
          for (let itA1 = 0; itA1 < bins[i].items.length; itA1++) {
            for (let itA2 = itA1 + 1; itA2 < bins[i].items.length; itA2++) {
              for (let itB = 0; itB < bins[j].items.length; itB++) {
                const itemA1 = bins[i].items[itA1];
                const itemA2 = bins[i].items[itA2];
                const sumA = itemA1 + itemA2;
                const itemB = bins[j].items[itB];
                const diff = sumA - itemB;

                if (bins[j].remainingCapacity + itemB >= sumA && bins[i].remainingCapacity + sumA >= itemB) {
                  bins[i].items.splice(itA2, 1);
                  bins[i].items.splice(itA1, 1);
                  bins[i].items.push(itemB);
                  bins[i].remainingCapacity += diff;

                  bins[j].items.splice(itB, 1);
                  bins[j].items.push(itemA1, itemA2);
                  bins[j].remainingCapacity -= diff;

                  if (compareBins(bins, bestBins) > 0) {
                    bestBins = cloneBins(bins);
                    improved = true;
                    break;
                  } else {
                    bins[j].items.pop();
                    bins[j].items.pop();
                    bins[j].items.splice(itB, 0, itemB);
                    bins[j].remainingCapacity += diff;

                    bins[i].items.pop();
                    bins[i].items.splice(itA1, 0, itemA1);
                    bins[i].items.splice(itA2, 0, itemA2);
                    bins[i].remainingCapacity -= diff;
                  }
                }
              }
              if (improved) break;
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
    }
  }

  localSearch(cloneBins(bestBins));

  // 3. Iterated Local Search (ILS) with random perturbations
  let iteration = 0;
  while (getTime() - startTime < maxTimeMs && iteration < 40) {
    iteration++;
    const perturbed = [...sortedItems].sort(() => Math.random() - 0.5);
    const startBins = Math.random() > 0.5 ? binPackingBFD(materialLength, perturbed) : runFFDInternal(materialLength, perturbed);
    if (compareBins(startBins, bestBins) > 0) {
      bestBins = cloneBins(startBins);
    }
    localSearch(startBins);
  }

  // Sort items inside each bin descending
  bestBins.forEach(bin => {
    bin.items.sort((a, b) => b - a);
  });

  // Sort bins: tightly packed bins (least remaining) first,
  // and the bin with the maximum remaining reusable scrap last.
  bestBins.sort((a, b) => a.remainingCapacity - b.remainingCapacity);

  return bestBins;
}

/**
 * Helper for running FFD internally.
 * @param {number} capacity
 * @param {number[]} items
 * @returns {PackedBinInternal[]}
 */
function runFFDInternal(capacity, items) {
  const bins = [];
  for (const item of items) {
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
      bins.push({ items: [item], remainingCapacity: capacity - item });
    }
  }
  return bins;
}

/**
* Performs the wood cut calculation including validation and scrap maximization.
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
  else if (partsListRaw.some(l => l <= 0)) errorMessages.push("部材リストには正の数を入力してください。");
  else if (partsListRaw.some(l => l + bladeWidth > materialLength)) {
    errorMessages.push(`刃幅(${bladeWidth}mm)を含めた長さが材料定尺(${materialLength}mm)を超える部材があります。`);
  }

  if (errorMessages.length > 0) {
    return { success: false, error: errorMessages.join('<br>') };
  }

  // --- Calculation with Optimization ---
  try {
    const partsWithBlade = partsListRaw.map(l => l + bladeWidth);
    const optimizedBins = optimizeCuttingStock(materialLength, partsWithBlade);
    const packedBins = optimizedBins.map(bin => bin.items);
    const materialQuantity = packedBins.length;
    const materialPriceTotal = materialQuantity * unitPrice;

    // Cut count calculation:
    // If a material has remaining scrap (> 0), cutCount is equal to binItems.length (cuts off scrap).
    // If a material is fully consumed with 0 scrap, cutCount is binItems.length - 1.
    let cutCount = 0;
    let maxRemaining = 0;
    let totalWaste = 0;

    packedBins.forEach(binItems => {
      if (binItems.length > 0) {
        const usedLength = binItems.reduce((sum, l) => sum + l, 0);
        const remaining = Math.max(0, materialLength - usedLength);
        totalWaste += remaining;
        if (remaining > maxRemaining) {
          maxRemaining = remaining;
        }
        if (remaining > 0.001) {
          cutCount += binItems.length;
        } else {
          cutCount += Math.max(0, binItems.length - 1);
        }
      }
    });

    const cutPriceTotal = cutCount * cutPrice;
    const totalPrice = materialPriceTotal + cutPriceTotal;

    const totalMaterialLength = materialQuantity * materialLength;
    const totalPartsLength = partsListRaw.reduce((sum, l) => sum + l, 0);
    const usageEfficiency = totalMaterialLength > 0 ? (totalPartsLength / totalMaterialLength) * 100 : 0;

    /** @type {WoodCutResult} */
    const result = {
      materialQuantity,
      materialPriceTotal,
      cutCount,
      cutPriceTotal,
      totalPrice,
      packedBins,
      inputParams: input,
      maxRemaining,
      totalWaste,
      usageEfficiency,
    };
    return { success: true, result };
  } catch (err) {
    console.error("Calculation Error:", err);
    return { success: false, error: "計算中に予期せぬエラーが発生しました。" };
  }
}