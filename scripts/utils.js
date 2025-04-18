// scripts/utils.js

/**
 * Checks if a hex color is light or dark.
 * @param {string} color - Hex color code (e.g., "#RRGGBB").
 * @returns {boolean} - True if the color is considered light, false otherwise.
 */
export function isColorLight(color) {
  const hex = color.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  if (fullHex.length !== 6) return false;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5;
}

/**
 * Parses a string of numbers separated by commas or newlines.
 * @param {string} str The input string.
 * @returns {number[] | null} An array of numbers or null if parsing fails or contains NaN.
 */
export function parsePartsList(str) {
  try {
    const parts = str.split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => parseFloat(s));
    // Check for NaN values which indicate parsing errors
    if (parts.some(isNaN)) {
      console.error("Parsing failed: Input contains non-numeric values.");
      return null;
    }
    return parts;
  } catch (e) {
    console.error("Error parsing parts list string:", e);
    return null;
  }
}

/**
 * Formats a number into a Japanese Yen currency string.
 * @param {number} amount The number to format.
 * @returns {string} Formatted currency string (e.g., "1,234 円").
 */
export function formatCurrency(amount) {
  return `${amount.toLocaleString()} 円`;
}