import type { HexColor, Position } from "./types.js"
import { hexToColorAlpha } from "./utils.js"

export interface DebugSliderStyleOptions {
	width?: number
	height?: number
	trackHeight?: number
	thumbRadius?: number
	trackColor?: HexColor
	fillColor?: HexColor
	thumbColor?: HexColor
}

export interface CreateDebugSliderOptions extends DebugSliderStyleOptions {
	/** Current value (default: 0, clamped to min–max range). */
	value?: number
	/** Minimum value (default: 0). */
	min?: number
	/** Maximum value (default: 1). */
	max?: number
	/** Step size — 0 = continuous (default: 0). */
	step?: number
	/** Whether the slider accepts input (default: true). */
	enabled?: boolean
	/** Called when the value changes. */
	onChange?: (value: number, slider: DebugSlider) => void
	/** Position (optional). */
	position?: Position
}

/**
 * An interactive horizontal slider for debug HUD.
 *
 * Supports min/max range, step snapping, and drag interaction.
 * Emits `"value-changed"` event. Chainable API.
 */
export class DebugSlider extends Phaser.GameObjects.Container {
	private _track: Phaser.GameObjects.Graphics
	private _fill: Phaser.GameObjects.Graphics
	private _thumb: Phaser.GameObjects.Graphics
	private _hitZone: Phaser.GameObjects.Zone
	private _value: number
	private _min: number
	private _max: number
	private _step: number
	private _isEnabled: boolean
	private _isDragging = false
	private _sliderWidth: number
	private _sliderHeight: number
	private _trackHeight: number
	private _thumbRadius: number
	private _trackColor: HexColor
	private _fillColor: HexColor
	private _thumbColor: HexColor
	private _onChangeCallbacks: Array<(value: number, slider: DebugSlider) => void> = []

	private _boundOnPointerMove: (pointer: Phaser.Input.Pointer) => void
	private _boundOnPointerUp: () => void

	constructor(scene: Phaser.Scene, options: CreateDebugSliderOptions = {}) {
		const {
			value = 0,
			min = 0,
			max = 1,
			step = 0,
			enabled = true,
			width = 200,
			height = 24,
			trackHeight = 6,
			thumbRadius = 10,
			trackColor = "#333333",
			fillColor = "#4caf50",
			thumbColor = "#ffffff",
			onChange,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._min = min
		this._max = max
		this._step = step
		this._isEnabled = enabled
		this._sliderWidth = width
		this._sliderHeight = height
		this._trackHeight = trackHeight
		this._thumbRadius = thumbRadius
		this._trackColor = trackColor
		this._fillColor = fillColor
		this._thumbColor = thumbColor
		this._value = this.clampAndSnap(value)

		if (onChange) this._onChangeCallbacks.push(onChange)

		this._track = new Phaser.GameObjects.Graphics(scene)
		this._fill = new Phaser.GameObjects.Graphics(scene)
		this._thumb = new Phaser.GameObjects.Graphics(scene)
		this._hitZone = new Phaser.GameObjects.Zone(scene, 0, 0, width, height)
		this._hitZone.setInteractive({ useHandCursor: true })

		this._hitZone.on("pointerdown", this.handlePointerDown, this)

		this._boundOnPointerMove = this.handlePointerMove.bind(this)
		this._boundOnPointerUp = this.handlePointerUp.bind(this)

		this.add([this._track, this._fill, this._thumb, this._hitZone])
		this.setSize(width, height)
		this.applyEnabledState()
		this.redraw()

		scene.add.existing(this)
	}

	getValue(): number {
		return this._value
	}

	setValue(value: number): this {
		const clamped = this.clampAndSnap(value)
		if (clamped === this._value) return this
		const prev = this._value
		this._value = clamped
		this.redraw()
		this.emit("value-changed", clamped, prev)
		this.fireOnChange()
		return this
	}

	isEnabled(): boolean {
		return this._isEnabled
	}

	setEnabled(enabled: boolean): this {
		this._isEnabled = enabled
		this.applyEnabledState()
		return this
	}

	onValueChanged(handler: (value: number, slider: DebugSlider) => void): this {
		this._onChangeCallbacks.push(handler)
		return this
	}

	setTrackColor(color: HexColor): this {
		this._trackColor = color
		this.redraw()
		return this
	}

	setFillColor(color: HexColor): this {
		this._fillColor = color
		this.redraw()
		return this
	}

	setThumbColor(color: HexColor): this {
		this._thumbColor = color
		this.redraw()
		return this
	}

	setRange(min: number, max: number): this {
		this._min = min
		this._max = max
		this._value = this.clampAndSnap(this._value)
		this.redraw()
		return this
	}

	setStep(step: number): this {
		this._step = Math.max(0, step)
		this._value = this.clampAndSnap(this._value)
		this.redraw()
		return this
	}

	setSliderSize(width: number, height: number): this {
		this._sliderWidth = width
		this._sliderHeight = height
		this._hitZone.setSize(width, height)
		this.setSize(width, height)
		this.redraw()
		return this
	}

	setStyle(options: DebugSliderStyleOptions): this {
		if (options.trackColor !== undefined) this._trackColor = options.trackColor
		if (options.fillColor !== undefined) this._fillColor = options.fillColor
		if (options.thumbColor !== undefined) this._thumbColor = options.thumbColor
		if (options.trackHeight !== undefined) this._trackHeight = options.trackHeight
		if (options.thumbRadius !== undefined) this._thumbRadius = options.thumbRadius
		if (options.width !== undefined || options.height !== undefined) {
			this._sliderWidth = options.width ?? this._sliderWidth
			this._sliderHeight = options.height ?? this._sliderHeight
			this._hitZone.setSize(this._sliderWidth, this._sliderHeight)
			this.setSize(this._sliderWidth, this._sliderHeight)
		}
		this.redraw()
		return this
	}

	override destroy(fromScene?: boolean): void {
		this.stopDragging()
		super.destroy(fromScene)
	}

	private handlePointerDown(pointer: Phaser.Input.Pointer): void {
		if (!this._isEnabled) return
		this._isDragging = true
		this.updateValueFromPointer(pointer)

		this.scene.input.on("pointermove", this._boundOnPointerMove)
		this.scene.input.on("pointerup", this._boundOnPointerUp)
	}

	private handlePointerMove(pointer: Phaser.Input.Pointer): void {
		if (!this._isDragging) return
		this.updateValueFromPointer(pointer)
	}

	private handlePointerUp(): void {
		this.stopDragging()
	}

	private stopDragging(): void {
		if (!this._isDragging) return
		this._isDragging = false
		this.scene?.input?.off("pointermove", this._boundOnPointerMove)
		this.scene?.input?.off("pointerup", this._boundOnPointerUp)
	}

	private updateValueFromPointer(pointer: Phaser.Input.Pointer): void {
		const matrix = this.getWorldTransformMatrix()
		const tmp = new Phaser.Math.Vector2()
		matrix.applyInverse(pointer.worldX, pointer.worldY, tmp)

		const halfW = this._sliderWidth / 2
		const ratio = Phaser.Math.Clamp((tmp.x + halfW) / this._sliderWidth, 0, 1)
		const rawValue = this._min + ratio * (this._max - this._min)
		this.setValue(rawValue)
	}

	private clampAndSnap(value: number): number {
		let v = Phaser.Math.Clamp(value, this._min, this._max)
		if (this._step > 0) {
			v = Math.round((v - this._min) / this._step) * this._step + this._min
			v = Phaser.Math.Clamp(v, this._min, this._max)
		}
		return v
	}

	private fireOnChange(): void {
		for (const cb of this._onChangeCallbacks) {
			cb(this._value, this)
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
		const w = this._sliderWidth
		const halfW = w / 2
		const th = this._trackHeight
		const halfTH = th / 2
		const trackRadius = halfTH

		// Normalized position 0–1
		const range = this._max - this._min
		const ratio = range > 0 ? (this._value - this._min) / range : 0
		const thumbX = -halfW + ratio * w

		// Track
		const tc = hexToColorAlpha(this._trackColor)
		this._track.clear()
		this._track.fillStyle(tc.color, tc.alpha)
		this._track.fillRoundedRect(-halfW, -halfTH, w, th, trackRadius)

		// Fill
		const fc = hexToColorAlpha(this._fillColor)
		const fillWidth = ratio * w
		this._fill.clear()
		if (fillWidth > 0) {
			this._fill.fillStyle(fc.color, fc.alpha)
			this._fill.fillRect(-halfW, -halfTH, fillWidth, th)
		}

		// Thumb
		const thumbC = hexToColorAlpha(this._thumbColor)
		this._thumb.clear()
		this._thumb.fillStyle(thumbC.color, thumbC.alpha)
		this._thumb.fillCircle(thumbX, 0, this._thumbRadius)
	}
}

export function createDebugSlider(scene: Phaser.Scene, options: CreateDebugSliderOptions = {}): DebugSlider {
	return new DebugSlider(scene, options)
}
