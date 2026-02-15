import type { HexColor, Position } from "./types.js"
import { getDevicePixelRatio, hexToColorAlpha } from "./utils.js"

export interface CreateDebugLabelOptions {
	/** Label text (default: "Label") */
	text?: string
	/** Font size in pixels (default: 20) */
	fontSize?: number
	/** Text color (default: "#ffffff") */
	color?: HexColor
	/** Font family (default: "Verdana") */
	fontFamily?: string
	/** Horizontal alignment (default: "center") */
	align?: "left" | "center" | "right"
	/** Bold text (default: false) */
	isBold?: boolean
	/** Italic text (default: false) */
	isItalic?: boolean
	/** Fixed width for word wrap (optional) */
	wordWrapWidth?: number
	/** Position (optional) */
	position?: Position
}

/**
 * A debug text label rendered with Phaser.GameObjects.Text.
 *
 * Thin wrapper that applies dark-theme defaults (white text, Verdana)
 * and exposes a chainable styling API.
 */
export class DebugLabel extends Phaser.GameObjects.Text {
	constructor(scene: Phaser.Scene, options: CreateDebugLabelOptions = {}) {
		const {
			text = "Label",
			fontSize = 20,
			color = "#ffffff",
			fontFamily = "Verdana",
			align = "center",
			isBold = false,
			isItalic = false,
			wordWrapWidth,
			position,
		} = options

		const fontStyle = [isBold ? "bold" : "", isItalic ? "italic" : ""].filter(Boolean).join(" ").trim() || "normal"

		const c = hexToColorAlpha(color)
		const colorStr = `#${c.color.toString(16).padStart(6, "0")}`

		super(scene, position?.x ?? 0, position?.y ?? 0, text, {
			fontFamily,
			fontSize: `${fontSize}px`,
			fontStyle,
			color: colorStr,
			align,
			wordWrap: wordWrapWidth ? { width: wordWrapWidth } : undefined,
			resolution: getDevicePixelRatio(),
		})

		this.setOrigin(0.5, 0.5)
		this.setAlpha(c.alpha)

		scene.add.existing(this)
	}

	setTextColor(color: HexColor): this {
		const c = hexToColorAlpha(color)
		this.setColor(`#${c.color.toString(16).padStart(6, "0")}`)
		this.setAlpha(c.alpha)
		return this
	}
}

export function createDebugLabel(scene: Phaser.Scene, options: CreateDebugLabelOptions = {}): DebugLabel {
	return new DebugLabel(scene, options)
}
