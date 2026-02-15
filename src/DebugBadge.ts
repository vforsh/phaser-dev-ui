import type { HexColor, Position } from "./types.js"
import { estimateTextWidth, getDevicePixelRatio, hexToColorAlpha } from "./utils.js"

export interface DebugBadgeStyleOptions {
	bgColor?: HexColor
	textColor?: HexColor
	paddingX?: number
	paddingY?: number
	cornerRadius?: number
	minWidth?: number
	height?: number
}

export interface CreateDebugBadgeOptions extends DebugBadgeStyleOptions {
	/** Badge text content. */
	text: string
	/** Font family (default: "Verdana"). */
	fontFamily?: string
	/** Font size (default: 14). */
	fontSize?: number
	/** Bold text (default: true). */
	isBold?: boolean
	/** Position (optional). */
	position?: Position
}

/**
 * A compact display-only badge for debug HUD.
 *
 * Shows short tags — build version, mode flag, active bonus, etc.
 * Auto-sizes to fit text content with configurable padding.
 * Chainable API.
 */
export class DebugBadge extends Phaser.GameObjects.Container {
	private _bg: Phaser.GameObjects.Graphics
	private _label: Phaser.GameObjects.Text

	private _paddingX: number
	private _paddingY: number
	private _cornerRadius: number
	private _minWidth: number
	private _height: number
	private _bgColor: HexColor

	constructor(scene: Phaser.Scene, options: CreateDebugBadgeOptions) {
		const {
			text,
			bgColor = "#000000",
			textColor = "#e5e5e5",
			fontSize = 14,
			fontFamily = "Verdana",
			isBold = true,
			cornerRadius = 10,
			paddingX = 8,
			paddingY = 4,
			minWidth = 22,
			height = 22,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._paddingX = paddingX
		this._paddingY = paddingY
		this._cornerRadius = cornerRadius
		this._minWidth = minWidth
		this._height = height
		this._bgColor = bgColor

		this._bg = scene.add.graphics()
		const tc = hexToColorAlpha(textColor)

		this._label = scene.add.text(0, 0, text, {
			fontFamily,
			fontSize: `${fontSize}px`,
			fontStyle: isBold ? "bold" : "normal",
			color: `#${tc.color.toString(16).padStart(6, "0")}`,
			align: "center",
			resolution: getDevicePixelRatio(),
		})
		this._label.setOrigin(0.5, 0.5)
		this._label.setAlpha(tc.alpha)

		this.add([this._bg, this._label])
		this.refreshLayout()

		scene.add.existing(this)
	}

	setText(text: string): this {
		this._label.setText(text)
		this.refreshLayout()
		return this
	}

	setBgColor(color: HexColor): this {
		this._bgColor = color
		this.redrawBg()
		return this
	}

	setTextColor(color: HexColor): this {
		const c = hexToColorAlpha(color)
		this._label.setColor(`#${c.color.toString(16).padStart(6, "0")}`)
		this._label.setAlpha(c.alpha)
		return this
	}

	setPadding(options: { x?: number; y?: number }): this {
		if (options.x !== undefined) this._paddingX = Math.max(0, options.x)
		if (options.y !== undefined) this._paddingY = Math.max(0, options.y)
		this.refreshLayout()
		return this
	}

	setCornerRadius(radius: number): this {
		this._cornerRadius = Math.max(0, radius)
		this.redrawBg()
		return this
	}

	setMinWidth(minWidth: number): this {
		this._minWidth = Math.max(0, minWidth)
		this.refreshLayout()
		return this
	}

	setBadgeHeight(height: number): this {
		this._height = Math.max(1, height)
		this.refreshLayout()
		return this
	}

	setStyle(options: DebugBadgeStyleOptions): this {
		if (options.bgColor) this._bgColor = options.bgColor
		if (options.textColor) this.setTextColor(options.textColor)
		if (options.paddingX !== undefined || options.paddingY !== undefined) {
			this.setPadding({ x: options.paddingX, y: options.paddingY })
		}
		if (options.cornerRadius !== undefined) this._cornerRadius = Math.max(0, options.cornerRadius)
		if (options.minWidth !== undefined) this._minWidth = Math.max(0, options.minWidth)
		if (options.height !== undefined) this._height = Math.max(1, options.height)
		this.refreshLayout()
		return this
	}

	// -- Internal --

	private refreshLayout(): void {
		const fontSize = parseInt(this._label.style.fontSize as string) || 14
		const textWidth = estimateTextWidth(this._label.text, fontSize)
		const targetWidth = Math.max(this._minWidth, textWidth + this._paddingX * 2 + 10)
		const targetHeight = Math.max(this._height, fontSize * 1.2 + this._paddingY * 2 + 2)

		this.setSize(targetWidth, targetHeight)
		// Re-center label is automatic (origin 0.5)
		this.redrawBg(targetWidth, targetHeight)
	}

	private redrawBg(w?: number, h?: number): void {
		const fontSize = parseInt(this._label.style.fontSize as string) || 14
		const textWidth = estimateTextWidth(this._label.text, fontSize)
		const width = w ?? Math.max(this._minWidth, textWidth + this._paddingX * 2 + 10)
		const height = h ?? Math.max(this._height, fontSize * 1.2 + this._paddingY * 2 + 2)

		const radius = Math.min(this._cornerRadius, height / 2)
		const c = hexToColorAlpha(this._bgColor)

		this._bg.clear()
		this._bg.fillStyle(c.color, c.alpha)
		this._bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
	}
}

export function createDebugBadge(scene: Phaser.Scene, options: CreateDebugBadgeOptions): DebugBadge {
	return new DebugBadge(scene, options)
}
