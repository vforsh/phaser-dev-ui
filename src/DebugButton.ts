import type { ClickHandler, DebugImageIconOptions, HexColor, Position, Size } from "./types.js"
import { dimHex, getDevicePixelRatio, hexToColorAlpha } from "./utils.js"

type ButtonVisualState = "normal" | "hover" | "disabled"

export interface CreateDebugButtonOptions {
	/** Button text (default: "Button") */
	text?: string
	/** Optional image icon rendered next to text (or standalone for icon-only buttons). */
	icon?: DebugImageIconOptions
	/** Button width (default: 160) */
	width?: number
	/** Button height (default: 80) */
	height?: number
	/** Corner radius (default: 10) */
	cornerRadius?: number
	/** Enable stroke outline (default: true) */
	stroke?: boolean
	/** Enable shadow (default: true) */
	shadow?: boolean
	/** Font size (default: 20) */
	fontSize?: number
	/** Font family (default: "Verdana") */
	fontFamily?: string
	/** Bold text (default: true) */
	isBold?: boolean
	/** Click handler (optional) */
	onClick?: ClickHandler<DebugButton>
	/** Enabled state (default: true) */
	enabled?: boolean
	/** Position (optional) */
	position?: Position
}

/**
 * An interactive debug button with hover/disabled visual states.
 *
 * Renders background, optional shadow, optional stroke border, and centered text.
 * Supports normal → hover → disabled state transitions with automatic color dimming.
 * Chainable API.
 */
export class DebugButton extends Phaser.GameObjects.Container {
	private _bg: Phaser.GameObjects.Graphics
	private _shadow: Phaser.GameObjects.Graphics
	private _label: Phaser.GameObjects.Text
	private _icon: Phaser.GameObjects.Image | null = null
	private _hitZone: Phaser.GameObjects.Zone

	private _width: number
	private _height: number
	private _cornerRadius: number
	private _shadowVisible: boolean
	private _outlineThickness: number

	private _normalBgColor = "#000000"
	private _hoverBgColor: string | null = null
	private _normalOutlineColor = "#a3a3a3"
	private _hoverOutlineColor: string | null = null
	private _normalTextColor = "#a3a3a3"
	private _hoverTextColor: string | null = null
	private _disabledBgColor = "#1a1a1a"
	private _disabledOutlineColor = "#5a5a5a"
	private _disabledTextColor = "#6f6f6f"

	private _isHovering = false
	private _isEnabled = true
	private _iconOptions: DebugImageIconOptions | null = null

	constructor(scene: Phaser.Scene, options: CreateDebugButtonOptions = {}) {
		const {
			text = "Button",
			icon,
			width = 160,
			height = 80,
			cornerRadius = 10,
			stroke = true,
			shadow = true,
			fontSize = 20,
			fontFamily = "Verdana",
			isBold = true,
			onClick,
			enabled = true,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._width = width
		this._height = height
		this._cornerRadius = cornerRadius
		this._shadowVisible = shadow
		this._outlineThickness = stroke ? 4 : 0
		this.setSize(width, height)

		this._shadow = scene.add.graphics()
		this._bg = scene.add.graphics()

		const fontStyle = isBold ? "bold" : "normal"
		this._label = scene.add.text(0, 0, text, {
			fontFamily,
			fontSize: `${fontSize}px`,
			fontStyle,
			color: "#a3a3a3",
			align: "center",
			wordWrap: { width: width - 20 },
			resolution: getDevicePixelRatio(),
		})
		this._label.setOrigin(0.5, 0.5)

		if (icon) {
			this._icon = scene.add.image(0, 0, icon.key, icon.frame)
			this._icon.setOrigin(0.5, 0.5)
			this._iconOptions = icon
		}

		this._hitZone = scene.add.zone(0, 0, width, height)
		this._hitZone.setInteractive({ useHandCursor: true })

		const children: Phaser.GameObjects.GameObject[] = [this._shadow, this._bg]
		if (this._icon) children.push(this._icon)
		children.push(this._label, this._hitZone)
		this.add(children)

		// Default hover colors (matches Cocos version)
		this._hoverBgColor = "#2a2a2a"
		this._hoverTextColor = "#ffffff"
		if (stroke) {
			this._hoverOutlineColor = "#d0d0d0"
		}

		this._isEnabled = enabled
		this.syncDerivedDisabledColors()
		this.setupInteraction()
		this.refreshContentLayout()

		if (onClick) {
			this._hitZone.on("pointerup", () => {
				if (this._isEnabled) onClick(this)
			})
		}

		this.applyVisualState()
		scene.add.existing(this)
	}

	// -- Chainable setters --

	setBgColor(color: HexColor, hoverColor?: HexColor): this {
		this._normalBgColor = color
		this._hoverBgColor = hoverColor ?? null
		this.syncDerivedDisabledColors()
		this.applyVisualState()
		return this
	}

	setOutline(color: HexColor, thickness: number, hoverColor?: HexColor): this {
		this._normalOutlineColor = color
		this._hoverOutlineColor = hoverColor ?? null
		this._outlineThickness = thickness
		this.syncDerivedDisabledColors()
		this.applyVisualState()
		return this
	}

	setText(text: string): this {
		this._label.setText(text)
		this.refreshContentLayout()
		return this
	}

	setTextColor(color: HexColor, hoverColor?: HexColor): this {
		this._normalTextColor = color
		this._hoverTextColor = hoverColor ?? null
		this.syncDerivedDisabledColors()
		this.applyVisualState()
		return this
	}

	setIcon(icon: DebugImageIconOptions | null): this {
		if (!icon) {
			if (this._icon) {
				this.remove(this._icon)
				this._icon.destroy()
				this._icon = null
			}
			this._iconOptions = null
			this.refreshContentLayout()
			return this
		}

		if (!this._icon) {
			this._icon = this.scene.add.image(0, 0, icon.key, icon.frame)
			this._icon.setOrigin(0.5, 0.5)
			// Insert above bg, below label/hitzone.
			this.addAt(this._icon, 2)
		} else {
			this._icon.setTexture(icon.key, icon.frame)
		}

		this._iconOptions = icon
		this.refreshContentLayout()
		this.applyVisualState()
		return this
	}

	setEnabled(enabled: boolean): this {
		if (this._isEnabled === enabled) return this
		this._isEnabled = enabled
		this._isHovering = false
		this._hitZone.input!.cursor = enabled ? "pointer" : "default"
		this.applyVisualState()
		return this
	}

	isEnabled(): boolean {
		return this._isEnabled
	}

	setShadowEnabled(enabled: boolean): this {
		this._shadowVisible = enabled
		this._shadow.setVisible(enabled)
		return this
	}

	setButtonSize(width: number, height: number): this {
		this._width = width
		this._height = height
		this.setSize(width, height)
		this._hitZone.setSize(width, height)
		this.refreshContentLayout()
		this.applyVisualState()
		return this
	}

	setStyle(options: {
		size?: Size
		bgColor?: HexColor
		bgHoverColor?: HexColor
		outlineColor?: HexColor
		outlineHoverColor?: HexColor
		outlineThickness?: number
		text?: string
		textColor?: HexColor
		textHoverColor?: HexColor
		shadowEnabled?: boolean
	}): this {
		if (options.size) this.setButtonSize(options.size.width, options.size.height)
		if (options.bgColor) this.setBgColor(options.bgColor, options.bgHoverColor)
		if (options.outlineColor && options.outlineThickness !== undefined) {
			this.setOutline(options.outlineColor, options.outlineThickness, options.outlineHoverColor)
		}
		if (options.text !== undefined) this.setText(options.text)
		if (options.textColor) this.setTextColor(options.textColor, options.textHoverColor)
		if (options.shadowEnabled !== undefined) this.setShadowEnabled(options.shadowEnabled)
		return this
	}

	onClick(handler: ClickHandler<DebugButton>): this {
		this._hitZone.on("pointerup", () => {
			if (this._isEnabled) handler(this)
		})
		return this
	}

	getLabel(): Phaser.GameObjects.Text {
		return this._label
	}

	getIcon(): Phaser.GameObjects.Image | null {
		return this._icon
	}

	// -- Internal --

	private refreshContentLayout(): void {
		const hasText = this._label.text.length > 0
		this._label.setVisible(hasText)

		const icon = this._icon
		const iconOpt = this._iconOptions

		const iconW = icon ? icon.displayWidth : 0
		const gap = iconOpt?.gap ?? 8
		const contentPadX = 20

		const wrapW = Math.max(0, this._width - contentPadX - (iconW > 0 ? iconW + (hasText ? gap : 0) : 0))
		this._label.setWordWrapWidth(wrapW)

		const labelW = hasText ? this._label.width : 0
		const groupW = iconW + labelW + (iconW > 0 && labelW > 0 ? gap : 0)

		if (!iconW && labelW) {
			this._label.setPosition(0, 0)
			return
		}

		if (iconW && !labelW) {
			icon!.setPosition(0, 0)
			return
		}

		if (!iconW && !labelW) return

		const startX = -groupW / 2
		const side = iconOpt?.side ?? "left"
		if (side === "left") {
			icon!.setPosition(startX + iconW / 2, 0)
			this._label.setPosition(startX + iconW + gap + labelW / 2, 0)
		} else {
			this._label.setPosition(startX + labelW / 2, 0)
			icon!.setPosition(startX + labelW + gap + iconW / 2, 0)
		}
	}

	private setupInteraction(): void {
		this._hitZone.on("pointerover", () => {
			if (!this._isEnabled) return
			this._isHovering = true
			this.applyVisualState()
		})

		this._hitZone.on("pointerout", () => {
			if (!this._isEnabled) return
			this._isHovering = false
			this.applyVisualState()
		})
	}

	private resolveVisualState(): ButtonVisualState {
		if (!this._isEnabled) return "disabled"
		if (this._isHovering) return "hover"
		return "normal"
	}

	private getColorForState(
		state: ButtonVisualState,
		normal: string,
		hover: string | null,
		disabled: string,
	): string {
		switch (state) {
			case "disabled":
				return disabled
			case "hover":
				return hover ?? normal
			case "normal":
				return normal
		}
	}

	private syncDerivedDisabledColors(): void {
		const bgDim = dimHex(this._normalBgColor, 0.45)
		this._disabledBgColor = `#${bgDim.color.toString(16).padStart(6, "0")}`
		const olDim = dimHex(this._normalOutlineColor, 0.55)
		this._disabledOutlineColor = `#${olDim.color.toString(16).padStart(6, "0")}`
		const txDim = dimHex(this._normalTextColor, 0.55)
		this._disabledTextColor = `#${txDim.color.toString(16).padStart(6, "0")}`
	}

	private applyVisualState(): void {
		const state = this.resolveVisualState()
		const bgHex = this.getColorForState(state, this._normalBgColor, this._hoverBgColor, this._disabledBgColor)
		const olHex = this.getColorForState(state, this._normalOutlineColor, this._hoverOutlineColor, this._disabledOutlineColor)
		const txHex = this.getColorForState(state, this._normalTextColor, this._hoverTextColor, this._disabledTextColor)

		this.redraw(bgHex, olHex)

		const tc = hexToColorAlpha(txHex)
		this._label.setColor(`#${tc.color.toString(16).padStart(6, "0")}`)
		this._label.setAlpha(tc.alpha)

		if (this._icon) {
			const iconOpt = this._iconOptions
			const iconHex =
				state === "hover"
					? iconOpt?.hoverTint ?? txHex
					: state === "disabled"
						? iconOpt?.disabledTint ?? txHex
						: iconOpt?.tint ?? txHex
			const ic = hexToColorAlpha(iconHex)
			this._icon.setTint(ic.color)
			this._icon.setAlpha(ic.alpha * (iconOpt?.alpha ?? 1))
		}
	}

	private redraw(bgHex: string, outlineHex: string): void {
		const halfW = this._width / 2
		const halfH = this._height / 2

		// Shadow
		this._shadow.clear()
		if (this._shadowVisible) {
			this._shadow.fillStyle(0x000000, 0.2)
			this._shadow.fillRoundedRect(-halfW, -halfH + 4, this._width, this._height, this._cornerRadius)
		}

		// Background
		this._bg.clear()
		const fc = hexToColorAlpha(bgHex)
		this._bg.fillStyle(fc.color, fc.alpha)
		this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, this._cornerRadius)

		if (this._outlineThickness > 0) {
			const sc = hexToColorAlpha(outlineHex)
			this._bg.lineStyle(this._outlineThickness, sc.color, sc.alpha)
			this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, this._cornerRadius)
		}
	}
}

export function createDebugButton(scene: Phaser.Scene, options: CreateDebugButtonOptions = {}): DebugButton {
	return new DebugButton(scene, options)
}
