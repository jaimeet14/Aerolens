/**
 * Duochrome (red-green) stimulus colours.
 *
 * A duochrome only works if the two halves differ in colour alone: the eye's chromatic aberration then focuses red
 * slightly behind green, so a short-sighted eye sees the letters on red sharper and a long-sighted (or over-corrected)
 * eye those on green. If one half is brighter, the black letters simply have more contrast there and look "blacker
 * and sharper" whatever the focus. Before 15 Nov 2026 the halves were rgb(255,45,45) (luminance 0.233) and
 * rgb(0,205,90) (0.444): 5.7:1 against 9.9:1 for the black E's, which biased answers to green.
 *
 * The halves are now luminance-matched in sRGB (about 0.213 each, so about 5.3:1 for black letters on both).
 * A real phone screen is not exactly sRGB, and night mode / blue-light filters dim the green, so the match is close,
 * not exact; the test protocol asks for those filters to be off.
 *
 * Fixed stimulus colours: never theme tokens.
 */

/** A colour as 0-255 sRGB channels. */
export interface Rgb { r: number; g: number; b: number }

/** sRGB channel (0-255) to linear light (0-1), as in WCAG 2.x. */
function linear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of an sRGB colour (channels 0-255): 0 for black, 1 for white. */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio of two relative luminances, always >= 1 (the order does not matter). */
export function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** CSS colour string, e.g. 'rgb(255,0,0)'. */
export const rgbCss = ({ r, g, b }: Rgb): string => `rgb(${r},${g},${b})`;

/** Red half: the sRGB red primary (luminance 0.2126). */
export const DUO_RED: Rgb = { r: 255, g: 0, b: 0 };
/** Green half: a clear green (hue about 136°, not yellowish or teal), luminance 0.2133, matching the red. */
export const DUO_GREEN: Rgb = { r: 0, g: 148, b: 40 };
/** The letters (Tumbling E's) and the answer-button text on both halves: black. */
export const DUO_INK: Rgb = { r: 0, g: 0, b: 0 };

export const DUO_RED_CSS = rgbCss(DUO_RED);
export const DUO_GREEN_CSS = rgbCss(DUO_GREEN);
export const DUO_INK_CSS = rgbCss(DUO_INK);
