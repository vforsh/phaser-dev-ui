import type { Position } from "./types.js"

export interface CreateGridContainerOptions {
	/** Number of columns (default: 3). */
	columns?: number
	/** Cell width (default: 100). */
	cellWidth?: number
	/** Cell height (default: 100). */
	cellHeight?: number
	/** Horizontal spacing (default: 0). */
	spacingX?: number
	/** Vertical spacing (default: 0). */
	spacingY?: number
	/** Padding (default: 0 all sides). */
	paddingLeft?: number
	paddingTop?: number
	/** Position (optional). */
	position?: Position
}

/**
 * A grid layout container that arranges children in rows and columns.
 *
 * Children flow left-to-right, top-to-bottom within a fixed column count.
 * Call `layout()` after adding items to reposition them.
 */
export class DebugGridContainer extends Phaser.GameObjects.Container {
	private _columns: number
	private _cellWidth: number
	private _cellHeight: number
	private _spacingX: number
	private _spacingY: number
	private _paddingLeft: number
	private _paddingTop: number

	constructor(scene: Phaser.Scene, options: CreateGridContainerOptions = {}) {
		const {
			columns = 3,
			cellWidth = 100,
			cellHeight = 100,
			spacingX = 0,
			spacingY = 0,
			paddingLeft = 0,
			paddingTop = 0,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._columns = columns
		this._cellWidth = cellWidth
		this._cellHeight = cellHeight
		this._spacingX = spacingX
		this._spacingY = spacingY
		this._paddingLeft = paddingLeft
		this._paddingTop = paddingTop

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

	/** Reposition children in grid cells. */
	layout(): this {
		const items = this.list as Phaser.GameObjects.GameObject[]

		for (let i = 0; i < items.length; i++) {
			const col = i % this._columns
			const row = Math.floor(i / this._columns)
			const go = items[i] as unknown as Phaser.GameObjects.Components.Transform
			if (!go.setPosition) continue

			const x = this._paddingLeft + col * (this._cellWidth + this._spacingX) + this._cellWidth / 2
			const y = this._paddingTop + row * (this._cellHeight + this._spacingY) + this._cellHeight / 2

			go.setPosition(x, y)
		}

		return this
	}

	/** Total grid width. */
	getContentWidth(): number {
		return this._paddingLeft + this._columns * this._cellWidth + (this._columns - 1) * this._spacingX
	}

	/** Total grid height based on current items. */
	getContentHeight(): number {
		const rows = Math.ceil(this.list.length / this._columns)
		return this._paddingTop + rows * this._cellHeight + Math.max(0, rows - 1) * this._spacingY
	}
}

export function createGridContainer(scene: Phaser.Scene, options: CreateGridContainerOptions = {}): DebugGridContainer {
	return new DebugGridContainer(scene, options)
}
