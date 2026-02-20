import type { HexColor, Position } from "./types.js"
import { hexToColorAlpha } from "./utils.js"

export interface DebugToggleStyleOptions {
	width?: number
	height?: number
	onColor?: HexColor
	offColor?: HexColor
	thumbColor?: HexColor
	thumbPadding?: number
}

export interface CreateDebugToggleOptions extends DebugToggleStyleOptions {
	/** Initial value (default: false). */
	value?: boolean
	/** Whether the toggle accepts input (default: true). */
	enabled?: boolean
	/** Called when the value changes. */
	onChange?: (value: boolean, toggle: DebugToggle) => void
	/** Position (optional). */
	position?: Position
}

/**
 * A boolean on/off pill toggle switch for debug HUD.
 *
 * Click to flip state. Emits `"value-changed"` event.
 * Supports enabled/disabled state and chainable API.
 */
export class DebugToggle extends Phaser.GameObjects.Container {
	private _track: Phaser.GameObjects.Graphics
	private _thumb: Phaser.GameObjects.Graphics
	private _hitZone: Phaser.GameObjects.Zone
	private _isOn: boolean
	private _isEnabled: boolean
	private _onColor: HexColor
	private _offColor: HexColor
	private _thumbColor: HexColor
	private _toggleWidth: number
	private _toggleHeight: number
	private _thumbPadding: number
	private _onChangeCallbacks: Array<(value: boolean, toggle: DebugToggle) => void> = []

	constructor(scene: Phaser.Scene, options: CreateDebugToggleOptions = {}) {
		const {
			value = false,
			enabled = true,
			onColor = "#4caf50",
			offColor = "#555555",
			thumbColor = "#ffffff",
			width = 48,
			height = 26,
			thumbPadding = 3,
			onChange,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._isOn = value
		this._isEnabled = enabled
		this._onColor = onColor
		this._offColor = offColor
		this._thumbColor = thumbColor
		this._toggleWidth = width
		this._toggleHeight = height
		this._thumbPadding = thumbPadding

		if (onChange) this._onChangeCallbacks.push(onChange)

		this._track = new Phaser.GameObjects.Graphics(scene)
		this._thumb = new Phaser.GameObjects.Graphics(scene)
		this._hitZone = new Phaser.GameObjects.Zone(scene, 0, 0, width, height)
		this._hitZone.setInteractive({ useHandCursor: true })

		this._hitZone.on("pointerup", this.handleClick, this)

		this.add([this._track, this._thumb, this._hitZone])
		this.setSize(width, height)
		this.applyEnabledState()
		this.redraw()

		scene.add.existing(this)
	}

	getValue(): boolean {
		return this._isOn
	}

	setValue(value: boolean): this {
		if (this._isOn === value) return this
		this._isOn = value
		this.redraw()
		this.emit("value-changed", value)
		this.fireOnChange()
		return this
	}

	toggle(): this {
		return this.setValue(!this._isOn)
	}

	isEnabled(): boolean {
		return this._isEnabled
	}

	setEnabled(enabled: boolean): this {
		this._isEnabled = enabled
		this.applyEnabledState()
		return this
	}

	onValueChanged(handler: (value: boolean, toggle: DebugToggle) => void): this {
		this._onChangeCallbacks.push(handler)
		return this
	}

	setOnColor(color: HexColor): this {
		this._onColor = color
		this.redraw()
		return this
	}

	setOffColor(color: HexColor): this {
		this._offColor = color
		this.redraw()
		return this
	}

	setThumbColor(color: HexColor): this {
		this._thumbColor = color
		this.redraw()
		return this
	}

	setToggleSize(width: number, height: number): this {
		this._toggleWidth = width
		this._toggleHeight = height
		this._hitZone.setSize(width, height)
		this.setSize(width, height)
		this.redraw()
		return this
	}

	setStyle(options: DebugToggleStyleOptions): this {
		if (options.onColor !== undefined) this._onColor = options.onColor
		if (options.offColor !== undefined) this._offColor = options.offColor
		if (options.thumbColor !== undefined) this._thumbColor = options.thumbColor
		if (options.thumbPadding !== undefined) this._thumbPadding = options.thumbPadding
		if (options.width !== undefined || options.height !== undefined) {
			this._toggleWidth = options.width ?? this._toggleWidth
			this._toggleHeight = options.height ?? this._toggleHeight
			this._hitZone.setSize(this._toggleWidth, this._toggleHeight)
			this.setSize(this._toggleWidth, this._toggleHeight)
		}
		this.redraw()
		return this
	}

	private handleClick(): void {
		if (!this._isEnabled) return
		this._isOn = !this._isOn
		this.redraw()
		this.emit("value-changed", this._isOn)
		this.fireOnChange()
	}

	private fireOnChange(): void {
		for (const cb of this._onChangeCallbacks) {
			cb(this._isOn, this)
		}
	}

	private applyEnabledState(): void {
		this.setAlpha(this._isEnabled ? 1 : 0.5)
		if (this._isEnabled) {
			this._hitZone.setInteractive({ useHandCursor: true })
		} else {
			this._hitZone.disableInteractive()
		}
	}

	private redraw(): void {
		const w = this._toggleWidth
		const h = this._toggleHeight
		const halfW = w / 2
		const halfH = h / 2
		const radius = halfH

		// Track (pill shape)
		const trackColor = this._isOn ? this._onColor : this._offColor
		const tc = hexToColorAlpha(trackColor)
		this._track.clear()
		this._track.fillStyle(tc.color, tc.alpha)
		this._track.fillRoundedRect(-halfW, -halfH, w, h, radius)

		// Thumb (circle)
		const thumbRadius = halfH - this._thumbPadding
		const thumbX = this._isOn ? halfW - halfH : -halfW + halfH
		const thumbC = hexToColorAlpha(this._thumbColor)
		this._thumb.clear()
		this._thumb.fillStyle(thumbC.color, thumbC.alpha)
		this._thumb.fillCircle(thumbX, 0, thumbRadius)
	}
}

export function createDebugToggle(scene: Phaser.Scene, options: CreateDebugToggleOptions = {}): DebugToggle {
	return new DebugToggle(scene, options)
}
