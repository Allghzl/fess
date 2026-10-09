/**
 * Text measurement utilities for Satori renderer.
 * Satori uses CSS layout — we can't measure actual pixels before render,
 * so we use a character-count heuristic for auto-sizing.
 */

/**
 * Binary-search the largest font size (pt) where the text fits in maxWidth×maxHeight.
 * @param {string} text
 * @param {number} maxWidth   px
 * @param {number} maxHeight  px
 * @param {number} minPt
 * @param {number} maxPt
 * @param {number} avgCharWidthFactor  fraction of pt size per character (default 0.52)
 * @returns {number} pt size
 */
export function autoFontSize(text, maxWidth, maxHeight, minPt, maxPt, avgCharWidthFactor = 0.65) {
  let lo = minPt, hi = maxPt, best = minPt;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const charsPerLine = Math.max(1, Math.floor(maxWidth / (mid * avgCharWidthFactor)));
    const lines = Math.ceil(text.length / charsPerLine);
    const height = lines * mid * 1.65; // matches CSS lineHeight 1.55 + safety margin
    if (height <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * Truncate text to maxChars at word boundary, appending ellipsis if truncated.
 */
export function truncate(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const cut = text.lastIndexOf(' ', maxChars - 1);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, maxChars - 1)) + '…';
}
