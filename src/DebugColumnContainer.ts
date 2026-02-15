import type { Position } from "./types.js"

export interface CreateColumnContainerOptions {
	/** Vertical spacing between children (default: 0). */
	spacingY?: number
	/** Padding (default: 0 all sides). */
	paddingLeft?: number
	paddingRight?: number
	paddingTop?: number
	paddingBottom?: number
	/** Direction (default: "top-to-bottom"). */
	direction?: "top-to-bottom" | "bottom-to-top"
	/** Position (optional). */
	position?: Position
}

/**
 * A vertical layout container that arranges children in a column.
 *
 * After adding children via `addItem()`, call `layout()` to position them.
 * Items are spaced by `spacingY` with configurable padding.
 */
export class DebugColumnContainer extends Phaser.GameObjects.Container {
	private _spacingY: number
	private _paddingLeft: number
	private _paddingRight: number
	private _paddingTop: number
	private _paddingBottom: number
	private _direction: "top-to-bottom" | "bottom-to-top"

	constructor(scene: Phaser.Scene, options: CreateColumnContainerOptions = {}) {
		const {
			spacingY = 0,
			paddingLeft = 0,
			paddingRight = 0,
			paddingTop = 0,
			paddingBottom = 0,
			direction = "top-to-bottom",
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._spacingY = spacingY
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

	setSpacingY(spacing: number): this {
		this._spacingY = spacing
		return this
	}

	/** Reposition children according to current spacing/padding. */
	layout(): this {
		const items = this.list as Phaser.GameObjects.GameObject[]
		let cursor = this._paddingTop

		const ordered = this._direction === "bottom-to-top" ? [...items].reverse() : items

		for (const item of ordered) {
			const go = item as unknown as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Size
			if (!go.setPosition) continue

			const h = ("displayHeight" in go ? (go as any).displayHeight : 0) as number
			go.setPosition(this._paddingLeft, cursor + h / 2)
			cursor += h + this._spacingY
		}

		return this
	}

	/** Total height of laid-out children + padding. */
	getContentHeight(): number {
		const items = this.list as Phaser.GameObjects.GameObject[]
		let total = this._paddingTop + this._paddingBottom
		for (let i = 0; i < items.length; i++) {
			const go = items[i] as any
			total += ("displayHeight" in go ? go.displayHeight : 0) as number
			if (i < items.length - 1) total += this._spacingY
		}
		return total
	}
}

export function createColumnContainer(scene: Phaser.Scene, options: CreateColumnContainerOptions = {}): DebugColumnContainer {
	return new DebugColumnContainer(scene, options)
}
