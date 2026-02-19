import type { HexColor, Position, Size } from "./types.js"
import { getDevicePixelRatio, hexToColorAlpha } from "./utils.js"

export interface SwitchButtonOption<K extends string | number = string> {
	key: K
	value: string
}

export type SwitchOptions<K extends string | number = string> = Array<SwitchButtonOption<K>>

export interface CreateDebugSwitchButtonOptions<K extends string | number = string> {
	/** Array of switch options with key-value pairs. */
	options: SwitchOptions<K>
	/** Initial selected option index (default: 0). */
	optionInitialIndex?: number
	/** Wrap around at ends (default: true). */
	optionsWrap?: boolean
	/** Size (default: 200×40). */
	size?: Size
	/** Background color (default: "#ffffff"). */
	bgColor?: HexColor
	/** Stroke color (default: "#000000"). */
	strokeColor?: HexColor
	/** Stroke thickness (default: 1). */
	strokeThickness?: number
	/** Text color (default: "#000000"). */
	textColor?: HexColor
	/** Arrow color (default: "#ffffff"). */
	arrowColor?: HexColor
	/** Arrow size in px (default: auto from height). */
	arrowSize?: number
	/** Arrow margin from edges (default: 10). */
	arrowMargin?: number
	/** Font size in px (default: 16). */
	fontSize?: number
	/** Font family (default: "Verdana"). */
	fontFamily?: string
	/** Enabled (default: true). */
	enabled?: boolean
	/** Position (optional). */
	position?: Position
}

/**
 * A cycling switch button for debug HUD.
 *
 * Displays a list of key-value options with left/right arrow navigation.
 * Supports wrap-around, enabled/disabled states, and emits "option-changed" events.
 * Chainable API.
 */
export class DebugSwitchButton<K extends string | number = string> extends Phaser.GameObjects.Container {
	private _bg: Phaser.GameObjects.Graphics
	private _label: Phaser.GameObjects.Text
	private _leftArrow: Phaser.GameObjects.Graphics
	private _rightArrow: Phaser.GameObjects.Graphics
	private _leftZone: Phaser.GameObjects.Zone
	private _rightZone: Phaser.GameObjects.Zone

	private _options: SwitchOptions<K> = []
	private _currentIndex = 0
	private _optionsWrap = true
	private _isEnabled = true

	private _panelWidth: number
	private _panelHeight: number
	private _cornerRadius = 6
	private _bgColor: HexColor
	private _strokeColor: HexColor
	private _strokeThickness: number
	private _textColor: HexColor
	private _arrowColor: HexColor
	private _arrowSize: number
	private _arrowMargin: number
	private _fontSize: number
	private _fontFamily: string

	constructor(scene: Phaser.Scene, options: CreateDebugSwitchButtonOptions<K>) {
		const {
			options: switchOptions,
			optionInitialIndex = 0,
			optionsWrap = true,
			size = { width: 200, height: 40 },
			bgColor = "#ffffff",
			strokeColor = "#000000",
			strokeThickness = 1,
			textColor = "#000000",
			arrowColor = "#ffffff",
			arrowSize,
			arrowMargin = 10,
			fontSize = 16,
			fontFamily = "Verdana",
			enabled = true,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._panelWidth = size.width
		this._panelHeight = size.height
		this._bgColor = bgColor
		this._strokeColor = strokeColor
		this._strokeThickness = strokeThickness
		this._textColor = textColor
		this._arrowColor = arrowColor
		this._arrowSize = arrowSize ?? Math.min(20, size.height * 0.5)
		this._arrowMargin = arrowMargin
		this._fontSize = fontSize
		this._fontFamily = fontFamily
		this._options = switchOptions
		this._currentIndex = Math.max(0, Math.min(optionInitialIndex, switchOptions.length - 1))
		this._optionsWrap = optionsWrap
		this._isEnabled = enabled
		this.setSize(size.width, size.height)

		// Panel bg
		this._bg = scene.add.graphics()

		// Label
		const tc = hexToColorAlpha(textColor)
		this._label = scene.add.text(0, 0, "", {
			fontFamily: fontFamily,
			fontSize: `${fontSize}px`,
			fontStyle: "normal",
			color: `#${tc.color.toString(16).padStart(6, "0")}`,
			align: "center",
			resolution: getDevicePixelRatio(),
		})
		this._label.setOrigin(0.5, 0.5)

		// Arrows
		this._leftArrow = scene.add.graphics()
		this._rightArrow = scene.add.graphics()

		// Hit zones for arrows
		const zoneSize = this._arrowSize + this._arrowMargin
		this._leftZone = scene.add.zone(0, 0, zoneSize, this._panelHeight).setInteractive({ useHandCursor: true })
		this._rightZone = scene.add.zone(0, 0, zoneSize, this._panelHeight).setInteractive({ useHandCursor: true })

		this.add([this._bg, this._label, this._leftArrow, this._rightArrow, this._leftZone, this._rightZone])

		this._leftZone.on("pointerup", () => {
			if (this._isEnabled) this.previousOption()
		})
		this._rightZone.on("pointerup", () => {
			if (this._isEnabled) this.nextOption()
		})

		this.redraw()
		this.updateDisplay()
		this.updateArrowStates()
		this.updateEnabledVisuals()

		scene.add.existing(this)
	}

	// -- Navigation --

	nextOption(): this {
		if (this._options.length === 0) return this
		const prevIdx = this._currentIndex
		const next = this._currentIndex + 1
		if (next >= this._options.length) {
			if (this._optionsWrap) this._currentIndex = 0
			else return this
		} else {
			this._currentIndex = next
		}
		this.updateDisplay()
		this.updateArrowStates()
		this.emitChanged(prevIdx)
		return this
	}

	previousOption(): this {
		if (this._options.length === 0) return this
		const prevIdx = this._currentIndex
		const next = this._currentIndex - 1
		if (next < 0) {
			if (this._optionsWrap) this._currentIndex = this._options.length - 1
			else return this
		} else {
			this._currentIndex = next
		}
		this.updateDisplay()
		this.updateArrowStates()
		this.emitChanged(prevIdx)
		return this
	}

	setOptionIndex(index: number): this {
		if (index < 0 || index >= this._options.length) return this
		const prevIdx = this._currentIndex
		this._currentIndex = index
		this.updateDisplay()
		this.updateArrowStates()
		this.emitChanged(prevIdx)
		return this
	}

	setOptionByKey(key: K): this {
		const idx = this._options.findIndex((o) => o.key === key)
		if (idx !== -1) this.setOptionIndex(idx)
		return this
	}

	getCurrentOption(): SwitchButtonOption<K> | null {
		return this._options[this._currentIndex] ?? null
	}

	getCurrentIndex(): number {
		return this._currentIndex
	}

	getOptions(): SwitchOptions<K> {
		return [...this._options]
	}

	setOptions(options: SwitchOptions<K>): this {
		const prev = this.getCurrentOption()
		this._options = [...options]
		let newIdx = 0
		if (prev) {
			const found = options.findIndex((o) => o.key === prev.key)
			if (found !== -1) newIdx = found
		}
		this._currentIndex = Math.min(newIdx, this._options.length - 1)
		this.updateDisplay()
		this.updateArrowStates()
		return this
	}

	// -- Setters --

	setEnabled(enabled: boolean): this {
		if (this._isEnabled === enabled) return this
		this._isEnabled = enabled
		this.updateEnabledVisuals()
		this.updateArrowStates()
		return this
	}

	isEnabled(): boolean {
		return this._isEnabled
	}

	setOptionsWrap(wrap: boolean): this {
		this._optionsWrap = wrap
		this.updateArrowStates()
		return this
	}

	setBgColor(color: HexColor): this {
		this._bgColor = color
		this.redrawBg()
		return this
	}

	setTextColor(color: HexColor): this {
		this._textColor = color
		const c = hexToColorAlpha(color)
		this._label.setColor(`#${c.color.toString(16).padStart(6, "0")}`)
		return this
	}

	setArrowColor(color: HexColor): this {
		this._arrowColor = color
		this.redrawArrows()
		return this
	}

	setSwitchSize(width: number, height: number): this {
		this._panelWidth = width
		this._panelHeight = height
		this.setSize(width, height)
		this._arrowSize = Math.min(this._arrowSize, height * 0.5)
		this.redraw()
		return this
	}

	setFontSize(size: number): this {
		this._fontSize = size
		this._label.setFontSize(`${size}px`)
		return this
	}

	setFontFamily(family: string): this {
		this._fontFamily = family
		this._label.setFontFamily(family)
		return this
	}

	setStyle(options: {
		size?: Size
		bgColor?: HexColor
		strokeColor?: HexColor
		strokeThickness?: number
		textColor?: HexColor
		arrowColor?: HexColor
		arrowSize?: number
		arrowMargin?: number
		fontSize?: number
		fontFamily?: string
	}): this {
		if (options.size) this.setSwitchSize(options.size.width, options.size.height)
		if (options.bgColor) this._bgColor = options.bgColor
		if (options.strokeColor) this._strokeColor = options.strokeColor
		if (options.strokeThickness !== undefined) this._strokeThickness = options.strokeThickness
		if (options.textColor) this.setTextColor(options.textColor)
		if (options.arrowColor) this._arrowColor = options.arrowColor
		if (options.arrowSize !== undefined) this._arrowSize = options.arrowSize
		if (options.arrowMargin !== undefined) this._arrowMargin = options.arrowMargin
		if (options.fontSize !== undefined) this.setFontSize(options.fontSize)
		if (options.fontFamily) this.setFontFamily(options.fontFamily)
		this.redraw()
		return this
	}

	/** Listen for option changes. */
	onOptionChanged(
		handler: (option: SwitchButtonOption<K>, index: number, prevOption: SwitchButtonOption<K> | null, prevIndex: number) => void,
	): this {
		this.on("option-changed", handler)
		return this
	}

	// -- Internal --

	private redraw(): void {
		this.redrawBg()
		this.redrawArrows()
		this.positionArrows()
	}

	private redrawBg(): void {
		const halfW = this._panelWidth / 2
		const halfH = this._panelHeight / 2
		const c = hexToColorAlpha(this._bgColor)

		this._bg.clear()
		this._bg.fillStyle(c.color, c.alpha)
		this._bg.fillRoundedRect(-halfW, -halfH, this._panelWidth, this._panelHeight, this._cornerRadius)

		if (this._strokeThickness > 0) {
			const sc = hexToColorAlpha(this._strokeColor)
			this._bg.lineStyle(this._strokeThickness, sc.color, sc.alpha)
			this._bg.strokeRoundedRect(-halfW, -halfH, this._panelWidth, this._panelHeight, this._cornerRadius)
		}
	}

	private redrawArrows(): void {
		const c = hexToColorAlpha(this._arrowColor)
		const s = this._arrowSize
		const halfS = s / 2

		// Left arrow (triangle pointing left)
		this._leftArrow.clear()
		this._leftArrow.fillStyle(c.color, c.alpha)
		this._leftArrow.fillTriangle(-halfS, 0, halfS, -halfS, halfS, halfS)

		// Right arrow (triangle pointing right)
		this._rightArrow.clear()
		this._rightArrow.fillStyle(c.color, c.alpha)
		this._rightArrow.fillTriangle(halfS, 0, -halfS, -halfS, -halfS, halfS)
	}

	private positionArrows(): void {
		const halfW = this._panelWidth / 2
		const leftX = -halfW + this._arrowSize / 2 + this._arrowMargin
		const rightX = halfW - this._arrowSize / 2 - this._arrowMargin

		this._leftArrow.setPosition(leftX, 0)
		this._rightArrow.setPosition(rightX, 0)
		this._leftZone.setPosition(leftX, 0)
		this._rightZone.setPosition(rightX, 0)
	}

	private updateDisplay(): void {
		const opt = this._options[this._currentIndex]
		if (opt) this._label.setText(opt.value)
	}

	private updateArrowStates(): void {
		if (!this._isEnabled) {
			this._leftArrow.setAlpha(0.2)
			this._rightArrow.setAlpha(0.2)
			return
		}

		const canLeft = this._optionsWrap || this._currentIndex > 0
		const canRight = this._optionsWrap || this._currentIndex < this._options.length - 1
		this._leftArrow.setAlpha(canLeft ? 1 : 0.2)
		this._rightArrow.setAlpha(canRight ? 1 : 0.2)
	}

	private updateEnabledVisuals(): void {
		const alpha = this._isEnabled ? 1 : 0.65
		this._bg.setAlpha(alpha)
		this._label.setAlpha(alpha)
	}

	private emitChanged(prevIndex: number): void {
		const current = this.getCurrentOption()
		const prev = this._options[prevIndex] ?? null
		if (current) {
			this.emit("option-changed", current, this._currentIndex, prev, prevIndex)
		}
	}
}

export function createDebugSwitchButton<K extends string | number = string>(
	scene: Phaser.Scene,
	options: CreateDebugSwitchButtonOptions<K>,
): DebugSwitchButton<K> {
	return new DebugSwitchButton(scene, options)
}
