import type { HexColor, Position } from "./types.js"
import { getDevicePixelRatio, hexToColorAlpha } from "./utils.js"

export interface CreateDebugSeparatorOptions {
	/** Total width of the separator line (default: 200). */
	width?: number
	/** Line thickness in px (default: 1). */
	thickness?: number
	/** Line color (default: "#a3a3a3"). */
	color?: HexColor
	/** Optional centered label text (e.g. "Physics"). Omit for a plain line. */
	label?: string
	/** Label font size (default: 12). */
	labelFontSize?: number
	/** Label text color (default: same as line color). */
	labelColor?: HexColor
	/** Gap in px between label edges and line segments (default: 8). */
	labelGap?: number
	/** Position (optional). */
	position?: Position
}

/**
 * A thin horizontal divider line with an optional centered label.
 *
 * Use inside panels or layout containers to visually separate sections.
 * Chainable API.
 */
export class DebugSeparator extends Phaser.GameObjects.Container {
	private _line: Phaser.GameObjects.Graphics
	private _label: Phaser.GameObjects.Text | null = null
	private _separatorWidth: number
	private _thickness: number
	private _color: HexColor
	private _labelGap: number

	constructor(scene: Phaser.Scene, options: CreateDebugSeparatorOptions = {}) {
		const {
			width = 200,
			thickness = 1,
			color = "#a3a3a3",
			label,
			labelFontSize = 12,
			labelColor,
			labelGap = 8,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._separatorWidth = width
		this._thickness = thickness
		this._color = color
		this._labelGap = labelGap

		this._line = new Phaser.GameObjects.Graphics(scene)
		this.add(this._line)

		if (label !== undefined && label !== "") {
			const lc = hexToColorAlpha(labelColor ?? color)
			this._label = new Phaser.GameObjects.Text(scene, 0, 0, label, {
				fontFamily: "Verdana",
				fontSize: `${labelFontSize}px`,
				color: `#${lc.color.toString(16).padStart(6, "0")}`,
				resolution: getDevicePixelRatio(),
			})
			this._label.setOrigin(0.5, 0.5)
			this._label.setAlpha(lc.alpha)
			this.add(this._label)
		}

		this.redraw()
		this.setSize(width, Math.max(thickness, this._label?.displayHeight ?? 0))

		scene.add.existing(this)
	}

	setLineColor(color: HexColor): this {
		this._color = color
		this.redraw()
		return this
	}

	setLabel(text: string): this {
		if (!this._label) {
			const lc = hexToColorAlpha(this._color)
			this._label = new Phaser.GameObjects.Text(this.scene, 0, 0, text, {
				fontFamily: "Verdana",
				fontSize: "12px",
				color: `#${lc.color.toString(16).padStart(6, "0")}`,
				resolution: getDevicePixelRatio(),
			})
			this._label.setOrigin(0.5, 0.5)
			this._label.setAlpha(lc.alpha)
			this.add(this._label)
		} else {
			this._label.setText(text)
		}
		this.redraw()
		return this
	}

	setThickness(thickness: number): this {
		this._thickness = Math.max(1, thickness)
		this.redraw()
		return this
	}

	setSeparatorWidth(width: number): this {
		this._separatorWidth = width
		this.setSize(width, this.height)
		this.redraw()
		return this
	}

	setStyle(options: Partial<Pick<CreateDebugSeparatorOptions, "width" | "thickness" | "color" | "labelGap">>): this {
		if (options.width !== undefined) this._separatorWidth = options.width
		if (options.thickness !== undefined) this._thickness = Math.max(1, options.thickness)
		if (options.color !== undefined) this._color = options.color
		if (options.labelGap !== undefined) this._labelGap = options.labelGap
		this.redraw()
		return this
	}

	private redraw(): void {
		const halfW = this._separatorWidth / 2
		const c = hexToColorAlpha(this._color)

		this._line.clear()
		this._line.lineStyle(this._thickness, c.color, c.alpha)

		if (!this._label || this._label.text === "") {
			this._line.lineBetween(-halfW, 0, halfW, 0)
			this.setSize(this._separatorWidth, this._thickness)
			return
		}

		const labelHalfW = this._label.displayWidth / 2
		const gap = this._labelGap
		const lineLeftEnd = -(labelHalfW + gap)
		const lineRightStart = labelHalfW + gap

		this._line.lineBetween(-halfW, 0, lineLeftEnd, 0)
		this._line.lineBetween(lineRightStart, 0, halfW, 0)
		this.setSize(this._separatorWidth, Math.max(this._thickness, this._label.displayHeight))
	}
}

export function createDebugSeparator(scene: Phaser.Scene, options: CreateDebugSeparatorOptions = {}): DebugSeparator {
	return new DebugSeparator(scene, options)
}
