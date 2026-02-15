import type { HexColor, Position, Size } from "./types.js"
import { hexToColorAlpha } from "./utils.js"

export interface CreateDebugPanelOptions {
	/** Panel width (default: 400) */
	width?: number
	/** Panel height (default: 400) */
	height?: number
	/** Corner radius (default: 10) */
	cornerRadius?: number
	/** Background fill color (default: "#000000") */
	fillColor?: HexColor
	/** Stroke/border color (default: "#a3a3a3") */
	strokeColor?: HexColor
	/** Stroke thickness (default: 4) */
	strokeThickness?: number
	/** Shadow color (default: "#00000032") */
	shadowColor?: HexColor
	/** Shadow Y offset in pixels (default: 4) */
	shadowOffsetY?: number
	/** Position (optional) */
	position?: Position
	/** Block pointer events from passing through (default: false) */
	blockInputEvents?: boolean
}

/**
 * A rectangular debug panel rendered with Phaser Graphics.
 *
 * All rendering is code-only — no sprites or assets required.
 * Supports background fill, stroke border, drop shadow, and rounded corners.
 * Chainable API for styling.
 */
export class DebugPanel extends Phaser.GameObjects.Container {
	private _bg: Phaser.GameObjects.Graphics
	private _shadow: Phaser.GameObjects.Graphics
	private _width: number
	private _height: number
	private _cornerRadius: number
	private _fillColor: HexColor
	private _strokeColor: HexColor
	private _strokeThickness: number
	private _shadowColor: HexColor
	private _shadowOffsetY: number
	private _shadowVisible = true
	private _hitArea: Phaser.GameObjects.Rectangle | null = null

	constructor(scene: Phaser.Scene, options: CreateDebugPanelOptions = {}) {
		const {
			width = 400,
			height = 400,
			cornerRadius = 10,
			fillColor = "#000000",
			strokeColor = "#a3a3a3",
			strokeThickness = 4,
			shadowColor = "#00000032",
			shadowOffsetY = 4,
			position,
			blockInputEvents = false,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._width = width
		this._height = height
		this._cornerRadius = cornerRadius
		this._fillColor = fillColor
		this._strokeColor = strokeColor
		this._strokeThickness = strokeThickness
		this._shadowColor = shadowColor
		this._shadowOffsetY = shadowOffsetY
		this.setSize(width, height)

		this._shadow = scene.add.graphics()
		this._bg = scene.add.graphics()

		this.add([this._shadow, this._bg])

		if (blockInputEvents) {
			this._hitArea = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
			this._hitArea.setInteractive()
			this.add(this._hitArea)
			this.sendToBack(this._hitArea)
		}

		this.redraw()
		scene.add.existing(this)
	}

	// -- Chainable setters --

	setBgColor(color: HexColor): this {
		this._fillColor = color
		this.redraw()
		return this
	}

	setStrokeColor(color: HexColor): this {
		this._strokeColor = color
		this.redraw()
		return this
	}

	setStrokeThickness(thickness: number): this {
		this._strokeThickness = thickness
		this.redraw()
		return this
	}

	setShadowColor(color: HexColor): this {
		this._shadowColor = color
		this.redraw()
		return this
	}

	setShadowVisible(visible: boolean): this {
		this._shadowVisible = visible
		this._shadow.setVisible(visible)
		return this
	}

	setCornerRadius(radius: number): this {
		this._cornerRadius = radius
		this.redraw()
		return this
	}

	setPanelSize(width: number, height: number): this {
		this._width = width
		this._height = height
		this.setSize(width, height)
		if (this._hitArea) {
			this._hitArea.setSize(width, height)
		}
		this.redraw()
		return this
	}

	setStyle(options: {
		size?: Size
		bgColor?: HexColor
		strokeColor?: HexColor
		strokeThickness?: number
		shadowColor?: HexColor
		shadowVisible?: boolean
		cornerRadius?: number
	}): this {
		if (options.size) this.setPanelSize(options.size.width, options.size.height)
		if (options.bgColor) this._fillColor = options.bgColor
		if (options.strokeColor) this._strokeColor = options.strokeColor
		if (options.strokeThickness !== undefined) this._strokeThickness = options.strokeThickness
		if (options.shadowColor) this._shadowColor = options.shadowColor
		if (options.shadowVisible !== undefined) this.setShadowVisible(options.shadowVisible)
		if (options.cornerRadius !== undefined) this._cornerRadius = options.cornerRadius
		this.redraw()
		return this
	}

	getPanelWidth(): number {
		return this._width
	}

	getPanelHeight(): number {
		return this._height
	}

	// -- Internal --

	private redraw(): void {
		const halfW = this._width / 2
		const halfH = this._height / 2

		// Shadow
		this._shadow.clear()
		if (this._shadowVisible) {
			const sc = hexToColorAlpha(this._shadowColor)
			this._shadow.fillStyle(sc.color, sc.alpha)
			this._shadow.fillRoundedRect(-halfW, -halfH + this._shadowOffsetY, this._width, this._height, this._cornerRadius)
		}

		// Background
		this._bg.clear()
		const fc = hexToColorAlpha(this._fillColor)
		this._bg.fillStyle(fc.color, fc.alpha)
		this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, this._cornerRadius)

		if (this._strokeThickness > 0) {
			const sc = hexToColorAlpha(this._strokeColor)
			this._bg.lineStyle(this._strokeThickness, sc.color, sc.alpha)
			this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, this._cornerRadius)
		}
	}
}

/** Factory function — mirrors the Cocos `createDebugPanel()` API. */
export function createDebugPanel(scene: Phaser.Scene, options: CreateDebugPanelOptions = {}): DebugPanel {
	return new DebugPanel(scene, options)
}
