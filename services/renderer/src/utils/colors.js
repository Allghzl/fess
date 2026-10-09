/**
 * Color utilities for Satori renderer.
 */

export function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

/** GD alpha: 0=opaque, 127=transparent → CSS opacity 0–1 */
export function gdAlphaToOpacity(gdAlpha) {
  return 1 - Math.max(0, Math.min(127, gdAlpha)) / 127;
}

/** Darken a hex color by reducing each channel by `amount` (0–255). */
export function darkenHex(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = v => Math.max(0, v - amount).toString(16).padStart(2, '0');
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}
