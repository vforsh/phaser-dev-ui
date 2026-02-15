import type { HexColor, Position } from "./types.js"
import { hexToColorAlpha } from "./utils.js"

export interface DebugProgressBarStyleOptions {
	width?: number
	height?: number
	trackColor?: HexColor
	fillColor?: HexColor
	cornerRadius?: number
}

export interface CreateDebugProgressBarOptions extends DebugProgressBarStyleOptions {
	/** Progress value, 0–1 (default: 0). */
	value?: number
	/** Position (optional). */
	position?: Position
}

/**
 * A horizontal progress bar for debug HUD.
 *
 * Displays a normalized 0–1 value as a filled track.
 * Supports rounded corners and configurable track/fill colors.
 * Chainable API.
 */
export class DebugProgressBar extends Phaser.GameObjects.Container {
	private _track: Phaser.GameObjects.Graphics
	private _fill: Phaser.GameObjects.Graphics
	private _width: number
	private _height: number
	private _trackColor: HexColor
	private _fillColor: HexColor
	private _cornerRadius: number
	private _value: number

	constructor(scene: Phaser.Scene, options: CreateDebugProgressBarOptions = {}) {
		const {
			width = 200,
			height = 8,
			trackColor = "#333333",
			fillColor = "#4caf50",
			cornerRadius,
			value = 0,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._width = width
		this._height = height
		this._trackColor = trackColor
		this._fillColor = fillColor
		this._cornerRadius = cornerRadius ?? height / 2
		this._value = Math.max(0, Math.min(1, value))
		this.setSize(width, height)

		this._track = scene.add.graphics()
		this._fill = scene.add.graphics()

		this.add([this._track, this._fill])
		this.redraw()

		scene.add.existing(this)
	}

	setValue(value: number): this {
		this._value = Math.max(0, Math.min(1, value))
		this.redrawFill()
		return this
	}

	getValue(): number {
		return this._value
	}

	setFillColor(color: HexColor): this {
		this._fillColor = color
		this.redrawFill()
		return this
	}

	setTrackColor(color: HexColor): this {
		this._trackColor = color
		this.redrawTrack()
		return this
	}

	setCornerRadius(radius: number): this {
		this._cornerRadius = Math.max(0, radius)
		this.redraw()
		return this
	}

	setBarSize(width: number, height: number): this {
		this._width = width
		this._height = height
		this.setSize(width, height)
		this.redraw()
		return this
	}

	setStyle(options: DebugProgressBarStyleOptions): this {
		if (options.trackColor) this._trackColor = options.trackColor
		if (options.fillColor) this._fillColor = options.fillColor
		if (options.cornerRadius !== undefined) this._cornerRadius = Math.max(0, options.cornerRadius)
		if (options.width !== undefined || options.height !== undefined) {
			this._width = options.width ?? this._width
			this._height = options.height ?? this._height
		}
		this.redraw()
		return this
	}

	private redraw(): void {
		this.setSize(this._width, this._height)
		this.redrawTrack()
		this.redrawFill()
	}

	private redrawTrack(): void {
		const halfW = this._width / 2
		const halfH = this._height / 2
		const radius = Math.min(this._cornerRadius, halfH)
		const c = hexToColorAlpha(this._trackColor)

		this._track.clear()
		this._track.fillStyle(c.color, c.alpha)
		this._track.fillRoundedRect(-halfW, -halfH, this._width, this._height, radius)
	}

	private redrawFill(): void {
		const halfW = this._width / 2
		const halfH = this._height / 2
		const fillWidth = this._width * this._value
		const radius = Math.min(this._cornerRadius, halfH)
		const c = hexToColorAlpha(this._fillColor)

		this._fill.clear()
		if (fillWidth <= 0) return

		this._fill.fillStyle(c.color, c.alpha)
		this._fill.fillRoundedRect(-halfW, -halfH, fillWidth, this._height, radius)
	}
}

export function createDebugProgressBar(scene: Phaser.Scene, options: CreateDebugProgressBarOptions = {}): DebugProgressBar {
	return new DebugProgressBar(scene, options)
}
