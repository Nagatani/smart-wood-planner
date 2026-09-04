// scripts/ui.js

import { PART_COLORS, WASTE_COLOR } from './config.js';
import { isColorLight, formatCurrency } from './utils.js';

// Keep references to DOM elements needed for UI updates
let elements = {
  // Initialize with null or default values
  summary: null,
  costs: null,
  detailsList: null,
  resultSection: null,
  detailsSection: null,
  errorDisplay: null,
  shareSection: null, // Add share section elements
  shareUrlInput: null,
  copyShareUrlButton: null,
  copyFeedback: null,
};

/**
 * Initializes the UI module with references to DOM elements.
 */
export function initUI(elementRefs) {
  elements = { ...elements, ...elementRefs }; // Merge references
}

/** Clears previous results, error messages, and share link from the UI. */
export function clearResults() {
  if (elements.summary) elements.summary.innerHTML = '';
  if (elements.costs) elements.costs.innerHTML = '';
  if (elements.detailsList) elements.detailsList.innerHTML = '';
  if (elements.resultSection) elements.resultSection.style.display = 'none';
  if (elements.detailsSection) elements.detailsSection.style.display = 'none';
  if (elements.shareSection) elements.shareSection.style.display = 'none'; // Hide share section
  if (elements.shareUrlInput) elements.shareUrlInput.value = ''; // Clear share URL
  if (elements.copyFeedback) elements.copyFeedback.textContent = ''; // Clear copy feedback
  hideError();
}

/**
 * Displays an error message in the designated error area.
 * @param {string} message - The error message (can contain HTML like <br>).
 */
export function displayError(message) {
  if (!elements.errorDisplay) return;
  elements.errorDisplay.innerHTML = `<span role="img" aria-label="error">❌</span> エラー: <pre>${message}</pre>`;
  elements.errorDisplay.style.display = 'block';
}

/** Hides the error message area. */
export function hideError() {
  if (elements.errorDisplay) elements.errorDisplay.style.display = 'none';
}

/**
 * Displays the summary of the calculation results.
 * @param {import('./logic.js').WoodCutResult} result
 */
export function displayResultSummary(result) {
  if (elements.summary) {
    elements.summary.innerHTML = `
            <div class="summary-item"><span role="img" aria-label="wood log">🪵</span> <strong>必要材料本数:</strong> ${result.materialQuantity} 本</div>
            <div class="summary-item"><span role="img" aria-label="sparkles">✨</span> <strong>最長端材 (再利用推奨):</strong> <span class="summary-highlight">${result.maxRemaining.toFixed(1)} mm</span></div>
            <div class="summary-item"><span role="img" aria-label="triangular ruler">📐</span> <strong>木材利用効率:</strong> <span>${result.usageEfficiency.toFixed(1)} %</span> (総端材: ${result.totalWaste.toFixed(1)} mm)</div>
        `;
  }
  if (elements.costs) {
    elements.costs.innerHTML = `
            <div class="cost-item"><span role="img" aria-label="yen bag">💰</span> <strong>材料費合計:</strong> <span>${formatCurrency(result.materialPriceTotal)}</span></div>
            <div class="cost-item"><span role="img" aria-label="counter">⏱️</span> <strong>合計カット回数:</strong> ${result.cutCount} 回</div>
            <div class="cost-item"><span role="img" aria-label="money with wings">💸</span> <strong>加工費合計:</strong> <span>${formatCurrency(result.cutPriceTotal)}</span></div>
            <hr style="border-top: 1px dashed #ccc; margin: 10px 0;">
            <div class="cost-item" style="font-size: 1.2em;"><strong><span role="img" aria-label="receipt">🧾</span> 総合計:</strong> <span>${formatCurrency(result.totalPrice)}</span></div>
        `;
  }
  if (elements.resultSection) elements.resultSection.style.display = 'block';
}

/**
 * Creates the graphical representation of a single material bar.
 * @param {number[]} binItemsWithBlade - Items in the bin (blade width included).
 * @param {number} materialLength - Total length of the material.
 * @param {number} bladeWidth - Width of the saw blade.
 * @param {number} materialIndex - Index of this material.
 * @param {number} totalMaterials - Total number of materials.
 * @returns {HTMLDivElement} - The container div for the material bar.
 */
function createMaterialBarElement(binItemsWithBlade, materialLength, bladeWidth, materialIndex, totalMaterials) {
  const barContainer = document.createElement('div');
  barContainer.className = 'material-bar-container';

  const materialBar = document.createElement('div');
  materialBar.className = 'material-bar';
  materialBar.title = `材料全長: ${materialLength}mm (${totalMaterials}本中 ${materialIndex + 1}本目)`;

  const totalLengthWithBlade = binItemsWithBlade.reduce((sum, l) => sum + l, 0);
  const remainingMaterial = materialLength - totalLengthWithBlade;
  const sortedItems = [...binItemsWithBlade].sort((a, b) => b - a);

  // Add parts
  sortedItems.forEach((itemWithBlade, itemIndex) => {
    const originalLength = itemWithBlade - bladeWidth;
    const widthPercent = Math.max(0, (itemWithBlade / materialLength) * 100);
    const color = PART_COLORS[itemIndex % PART_COLORS.length];
    const isLight = isColorLight(color);
    const textClass = isLight ? 'dark-text' : '';
    const tooltipText = `部材 ${itemIndex + 1}: ${originalLength.toFixed(1)}mm (鋸刃込 ${itemWithBlade.toFixed(1)}mm)`;
    const showText = widthPercent > 3; // Threshold to show text

    const partDiv = document.createElement('div');
    partDiv.className = `part-bar ${textClass}`;
    partDiv.style.width = `${widthPercent.toFixed(3)}%`;
    partDiv.style.backgroundColor = color;
    partDiv.title = tooltipText;
    if (showText) {
      const textSpan = document.createElement('span');
      textSpan.className = 'bar-text';
      textSpan.textContent = originalLength.toFixed(0);
      partDiv.appendChild(textSpan);
    }
    materialBar.appendChild(partDiv);
  });

  // Add waste
  if (remainingMaterial > 0.1) {
    const wasteWidthPercent = Math.max(0, (remainingMaterial / materialLength) * 100);
    const isWasteLight = isColorLight(WASTE_COLOR);
    const wasteTextClass = isWasteLight ? 'dark-text' : '';
    const tooltipText = `端材: ${remainingMaterial.toFixed(1)}mm`;
    const showText = wasteWidthPercent > 3;

    const wasteDiv = document.createElement('div');
    wasteDiv.className = `waste-bar ${wasteTextClass}`;
    wasteDiv.style.width = `${wasteWidthPercent.toFixed(3)}%`;
    wasteDiv.style.backgroundColor = WASTE_COLOR;
    wasteDiv.title = tooltipText;
    if (showText) {
      const textSpan = document.createElement('span');
      textSpan.className = 'bar-text';
      textSpan.textContent = '端材';
      wasteDiv.appendChild(textSpan);
    }
    materialBar.appendChild(wasteDiv);
  }

  barContainer.appendChild(materialBar);
  return barContainer;
}


/**
 * Displays the detailed cut list including graphical bars.
 * @param {import('./logic.js').WoodCutResult} result
 */
export function displayCutDetails(result) {
  if (!elements.detailsList) return;
  elements.detailsList.innerHTML = ''; // Clear previous list

  const { packedBins, inputParams } = result;
  const { materialLength, bladeWidth } = inputParams;

  packedBins.forEach((binItemsWithBlade, index) => {
    const li = document.createElement('li');

    const itemsOriginalLength = binItemsWithBlade.map(l => l - bladeWidth);
    const totalLengthWithBlade = binItemsWithBlade.reduce((sum, l) => sum + l, 0);
    const totalOriginalLength = itemsOriginalLength.reduce((sum, l) => sum + l, 0);
    const remainingMaterial = materialLength - totalLengthWithBlade;

    // Create text info div
    const isLongestScrap = result.maxRemaining > 0.1 && Math.abs(remainingMaterial - result.maxRemaining) < 0.01;
    const badgeHtml = isLongestScrap ? '<span class="badge-longest-waste">✨ 最長端材 (再利用推奨)</span>' : '';

    const textInfoDiv = document.createElement('div');
    textInfoDiv.innerHTML = `
            <strong>材料 No.${index + 1}</strong> (使用長: ${totalLengthWithBlade.toFixed(1)}mm)${badgeHtml}<br>
            カットする部材 (元の長さ): [ ${itemsOriginalLength.map(l => l.toFixed(1)).join('mm, ')}mm ]<br>
            部材合計長 (刃幅除く): ${totalOriginalLength.toFixed(1)}mm<br>
            <strong>端材: ${remainingMaterial.toFixed(1)}mm</strong> (${((remainingMaterial / materialLength) * 100).toFixed(1)}%)
        `;

    // Create graphical bar
    const barElement = createMaterialBarElement(binItemsWithBlade, materialLength, bladeWidth, index, packedBins.length);

    // Append text and bar to list item
    li.appendChild(textInfoDiv);
    li.appendChild(barElement);

    elements.detailsList.appendChild(li);
  });

  if (elements.detailsSection) elements.detailsSection.style.display = 'block';
}
/**
 * Displays the share section with the generated URL.
 * @param {string} url The URL to display for sharing.
 */
export function displayShareLink(url) {
  if (elements.shareUrlInput) elements.shareUrlInput.value = url;
  if (elements.shareSection) elements.shareSection.style.display = 'block';
  if (elements.copyFeedback) elements.copyFeedback.textContent = ''; // Clear previous feedback
}

/** Shows a temporary feedback message after copying. */
export function showCopyFeedback(message = "コピーしました！", duration = 2000) {
  if (elements.copyFeedback) {
    elements.copyFeedback.textContent = message;
    setTimeout(() => {
      if (elements.copyFeedback) elements.copyFeedback.textContent = '';
    }, duration);
  }
  // Optionally disable button temporarily
  if (elements.copyShareUrlButton) {
    const originalText = elements.copyShareUrlButton.textContent;
    elements.copyShareUrlButton.textContent = 'OK!';
    elements.copyShareUrlButton.disabled = true;
    setTimeout(() => {
      if (elements.copyShareUrlButton) {
        elements.copyShareUrlButton.textContent = originalText;
        elements.copyShareUrlButton.disabled = false;
      }
    }, duration);
  }
}