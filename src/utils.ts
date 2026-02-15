/**
 * Parse a hex color string into numeric components.
 * Supports "#rgb", "#rrggbb", "#rrggbbaa".
 */
export function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
	let h = hex.startsWith("#") ? hex.slice(1) : hex

	if (h.length === 3) {
		h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!
	}

	const r = parseInt(h.slice(0, 2), 16)
	const g = parseInt(h.slice(2, 4), 16)
	const b = parseInt(h.slice(4, 6), 16)
	const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1

	return { r, g, b, a }
}

/** Convert {r,g,b,a} to a Phaser-compatible 0xRRGGBB number. */
export function toColorInt(c: { r: number; g: number; b: number }): number {
	return (c.r << 16) | (c.g << 8) | c.b
}

/** Dim a hex color by a multiplier (0–1). */
export function dimHex(hex: string, multiplier: number): { color: number; alpha: number } {
	const c = parseHex(hex)
	return {
		color: toColorInt({
			r: Math.round(c.r * multiplier),
			g: Math.round(c.g * multiplier),
			b: Math.round(c.b * multiplier),
		}),
		alpha: c.a,
	}
}

/** Parse hex to { color: 0xRRGGBB, alpha: 0–1 }. */
export function hexToColorAlpha(hex: string): { color: number; alpha: number } {
	const c = parseHex(hex)
	return { color: toColorInt(c), alpha: c.a }
}

/** Device pixel ratio for crisp text on high-DPI displays. */
export function getDevicePixelRatio(): number {
	if (typeof window === "undefined") return 1
	return window.devicePixelRatio ?? 1
}

/** Rough monospace-ish text width estimator. */
export function estimateTextWidth(text: string, fontSize: number): number {
	if (text.length === 0) return 0

	let width = 0
	for (const char of text) {
		if (char === " ") width += 0.34
		else if (/[0-9]/.test(char)) width += 0.64
		else if (/[A-Z]/.test(char)) width += 0.76
		else if (/[a-z]/.test(char)) width += 0.64
		else width += 0.8
	}

	return width * fontSize
}
