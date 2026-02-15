import type { Position } from "./types.js"

export interface CreateRowContainerOptions {
	/** Horizontal spacing between children (default: 0). */
	spacingX?: number
	/** Padding (default: 0 all sides). */
	paddingLeft?: number
	paddingRight?: number
	paddingTop?: number
	paddingBottom?: number
	/** Direction (default: "left-to-right"). */
	direction?: "left-to-right" | "right-to-left"
	/** Position (optional). */
	position?: Position
}

/**
 * A horizontal layout container that arranges children in a row.
 *
 * After adding children via `addItem()`, call `layout()` to position them.
 * Items are spaced by `spacingX` with configurable padding.
 * Children must have a measurable width (use `getBounds().width` or `displayWidth`).
 */
export class DebugRowContainer extends Phaser.GameObjects.Container {
	private _spacingX: number
	private _paddingLeft: number
	private _paddingRight: number
	private _paddingTop: number
	private _paddingBottom: number
	private _direction: "left-to-right" | "right-to-left"

	constructor(scene: Phaser.Scene, options: CreateRowContainerOptions = {}) {
		const {
			spacingX = 0,
			paddingLeft = 0,
			paddingRight = 0,
			paddingTop = 0,
			paddingBottom = 0,
			direction = "left-to-right",
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._spacingX = spacingX
		this._paddingLeft = paddingLeft
		this._paddingRight = paddingRight
		this._paddingTop = paddingTop
		this._paddingBottom = paddingBottom
		this._direction = direction

		scene.add.existing(this)
	}

	addItem(child: Phaser.GameObjects.GameObject): this {
		this.add(child)
		return this
	}

	addItems(children: Phaser.GameObjects.GameObject[]): this {
		for (const child of children) this.add(child)
		return this
	}

	setSpacingX(spacing: number): this {
		this._spacingX = spacing
		return this
	}

	/** Reposition children according to current spacing/padding. */
	layout(): this {
		const items = this.list as Phaser.GameObjects.GameObject[]
		let cursor = this._paddingLeft

		const ordered = this._direction === "right-to-left" ? [...items].reverse() : items

		for (const item of ordered) {
			const go = item as unknown as Phaser.GameObjects.Components.Transform
			if (!go.setPosition) continue

			const size = this.getItemSize(item)
			go.setPosition(cursor + size.width / 2, this._paddingTop + size.height / 2)
			cursor += size.width + this._spacingX
		}

		return this
	}

	/** Total width of laid-out children + padding. */
	getContentWidth(): number {
		const items = this.list as Phaser.GameObjects.GameObject[]
		let total = this._paddingLeft + this._paddingRight
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (!item) continue
			total += this.getItemSize(item).width
			if (i < items.length - 1) total += this._spacingX
		}
		return total
	}

	private getItemSize(item: Phaser.GameObjects.GameObject): { width: number; height: number } {
		const withDisplay = item as unknown as { displayWidth?: number; displayHeight?: number }
		const widthFromDisplay = typeof withDisplay.displayWidth === "number" ? withDisplay.displayWidth : 0
		const heightFromDisplay = typeof withDisplay.displayHeight === "number" ? withDisplay.displayHeight : 0
		if (widthFromDisplay > 0 || heightFromDisplay > 0) {
			return { width: Math.max(0, widthFromDisplay), height: Math.max(0, heightFromDisplay) }
		}

		const withSize = item as unknown as { width?: number; height?: number }
		const widthFromSize = typeof withSize.width === "number" ? withSize.width : 0
		const heightFromSize = typeof withSize.height === "number" ? withSize.height : 0
		if (widthFromSize > 0 || heightFromSize > 0) {
			return { width: Math.max(0, widthFromSize), height: Math.max(0, heightFromSize) }
		}

		if ("getBounds" in item && typeof item.getBounds === "function") {
			const bounds = item.getBounds()
			return { width: Math.max(0, bounds.width), height: Math.max(0, bounds.height) }
		}

		return { width: 0, height: 0 }
	}
}

export function createRowContainer(scene: Phaser.Scene, options: CreateRowContainerOptions = {}): DebugRowContainer {
	return new DebugRowContainer(scene, options)
}
