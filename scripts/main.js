// js/main.js
import { calculateOptimalCut } from './logic.js';
import { parsePartsList } from './utils.js';
import { initUI, clearResults, displayError, hideError, displayResultSummary, displayCutDetails, displayShareLink, showCopyFeedback } from './ui.js';

// --- クエリパラメータのマッピング (短縮名 <-> フルネーム) ---
const queryParamKeys = {
  materialLength: 'ml',
  unitPrice: 'up',
  cutPrice: 'cp',
  bladeWidth: 'bw',
  parts: 'p' // 部材リストはカンマ区切り文字列で
};

/**
 * Applies query parameter values to the input fields on page load.
 * @param {object} elements - References to the input field DOM elements.
 */
function applyQueryParams(elements) {
  const params = new URLSearchParams(window.location.search);

  const setValue = (element, paramName, isNumeric = true, defaultValue = null) => {
    if (params.has(paramName)) {
      let value = params.get(paramName);
      if (isNumeric) {
        const numValue = parseFloat(value);
        // Basic validation: ensure it's a number and non-negative (except partsList)
        if (!isNaN(numValue) && numValue >= 0) {
          element.value = numValue;
        } else if (defaultValue !== null) {
          console.warn(`Invalid numeric value for ${paramName}. Using default.`);
          element.value = defaultValue;
        }
      } else {
        // For parts list (string)
        if (value) { // Check if not empty string
          // Decode comma potentially encoded as %2C, etc.
          element.value = decodeURIComponent(value).replace(/ /g, '\n'); // Replace commas with newlines for textarea display
        } else if (defaultValue !== null) {
          console.warn(`Empty value for ${paramName}. Using default.`);
          element.value = defaultValue;
        }
      }
    } else if (defaultValue !== null) {
      // Set default value if param not present but default exists
      // This ensures consistency if defaults change later
      element.value = defaultValue;
    }
  };

  // Use default values from the HTML initially for consistency
  setValue(elements.materialLengthInput, queryParamKeys.materialLength, true, elements.materialLengthInput.value);
  setValue(elements.unitPriceInput, queryParamKeys.unitPrice, true, elements.unitPriceInput.value);
  setValue(elements.cutPriceInput, queryParamKeys.cutPrice, true, elements.cutPriceInput.value);
  setValue(elements.bladeWidthInput, queryParamKeys.bladeWidth, true, elements.bladeWidthInput.value);
  // Parts list: replace commas with newlines for display, pass default value
  setValue(elements.partsListInput, queryParamKeys.parts, false, elements.partsListInput.value);
}

/**
 * Generates a shareable URL based on the calculation input parameters.
 * @param {import('./logic.js').WoodCutInput} inputParams
 * @returns {string} The generated shareable URL.
 */
function generateShareUrl(inputParams) {
  const params = new URLSearchParams();
  params.set(queryParamKeys.materialLength, inputParams.materialLength.toString());
  params.set(queryParamKeys.unitPrice, inputParams.unitPrice.toString());
  params.set(queryParamKeys.cutPrice, inputParams.cutPrice.toString());
  params.set(queryParamKeys.bladeWidth, inputParams.bladeWidth.toString());
  // Join parts list with comma for the URL parameter
  params.set(queryParamKeys.parts, inputParams.partsListRaw.join(','));

  // Construct the full URL
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}


// Run script after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const form = document.getElementById('calculationForm');
  const materialLengthInput = document.getElementById('materialLength');
  const unitPriceInput = document.getElementById('unitPrice');
  const cutPriceInput = document.getElementById('cutPrice');
  const bladeWidthInput = document.getElementById('bladeWidth');
  const partsListInput = document.getElementById('partsList');
  const errorDisplay = document.getElementById('error-message');
  const resultSection = document.getElementById('result');
  const summaryDisplay = document.getElementById('summary');
  const costsDisplay = document.getElementById('costs');
  const detailsSection = document.getElementById('details');
  const detailsList = document.getElementById('details-list');
  // Get share section elements
  const shareSection = document.getElementById('shareSection');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const copyShareUrlButton = document.getElementById('copyShareUrlButton');
  const copyFeedback = document.getElementById('copyFeedback');


  // Check if all elements were found
  const allElementsFound = form && materialLengthInput && unitPriceInput && cutPriceInput && bladeWidthInput && partsListInput && errorDisplay && resultSection && summaryDisplay && costsDisplay && detailsSection && detailsList && shareSection && shareUrlInput && copyShareUrlButton && copyFeedback;
  if (!allElementsFound) {
    console.error("Initialization failed: One or more required DOM elements not found.");
    alert("ページの初期化に失敗しました。要素が見つかりません。");
    return;
  }

  // Collect element references for UI module
  const uiElements = {
    errorDisplay, resultSection, summary: summaryDisplay, costs: costsDisplay,
    detailsSection, detailsList, shareSection, shareUrlInput, copyShareUrlButton, copyFeedback
  };

  // Initialize UI module
  initUI(uiElements);

  // Apply query parameters to input fields
  applyQueryParams({
    materialLengthInput, unitPriceInput, cutPriceInput, bladeWidthInput, partsListInput
  });

  // Add form submit listener
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleCalculation();
  });

  // Add listener for the copy button
  copyShareUrlButton.addEventListener('click', () => {
    if (shareUrlInput.value) {
      navigator.clipboard.writeText(shareUrlInput.value)
        .then(() => {
          showCopyFeedback("コピーしました！"); // Show success feedback in UI module
        })
        .catch(err => {
          console.error('クリップボードへのコピーに失敗しました:', err);
          showCopyFeedback("コピー失敗", 3000); // Show error feedback
          // Fallback for older browsers or security restrictions (optional)
          // try { shareUrlInput.select(); document.execCommand('copy'); } catch (e) {}
        });
    }
  });


  /** Handles the calculation process */
  function handleCalculation() {
    clearResults();

    const inputValues = {
      materialLength: parseFloat(materialLengthInput.value),
      unitPrice: parseFloat(unitPriceInput.value),
      cutPrice: parseFloat(cutPriceInput.value),
      bladeWidth: parseFloat(bladeWidthInput.value),
      partsListStr: partsListInput.value
    };

    const partsListRaw = parsePartsList(inputValues.partsListStr);
    if (partsListRaw === null) {
      displayError("部材リストの形式が正しくありません。数値のみをカンマまたは改行で区切ってください。");
      return;
    }

    const calculationInput = { ...inputValues, partsListRaw }; // Combine values

    const outcome = calculateOptimalCut(calculationInput);

    if (outcome.success) {
      hideError();
      displayResultSummary(outcome.result);
      displayCutDetails(outcome.result);
      // Generate and display the share link
      const shareUrl = generateShareUrl(outcome.result.inputParams);
      displayShareLink(shareUrl);
    } else {
      displayError(outcome.error);
    }
  }
});