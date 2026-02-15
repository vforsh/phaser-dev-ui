import type { HexColor, Position } from "./types.js"
import { hexToColorAlpha } from "./utils.js"

export interface DebugScrollContainerStyleOptions {
	/** Viewport width. */
	width?: number
	/** Viewport height. */
	height?: number
	/** Content padding left. */
	paddingLeft?: number
	/** Content padding right. */
	paddingRight?: number
	/** Content padding top. */
	paddingTop?: number
	/** Content padding bottom. */
	paddingBottom?: number
	/** Background color. */
	bgColor?: HexColor
	/** Border color. */
	strokeColor?: HexColor
	/** Border thickness. */
	strokeThickness?: number
	/** Corner radius for panel and clip mask. */
	cornerRadius?: number
	/** Show scrollbar. */
	scrollbarEnabled?: boolean
	/** Scrollbar width in px. */
	scrollbarWidth?: number
	/** Scrollbar thumb color. */
	scrollbarColor?: HexColor
	/** Scrollbar track color. */
	scrollbarTrackColor?: HexColor
	/** Minimum thumb height. */
	scrollbarMinThumbHeight?: number
}

export interface CreateDebugScrollContainerOptions extends DebugScrollContainerStyleOptions {
	/** Initial scroll offset in px (default: 0). */
	initialScrollY?: number
	/** Enable mouse-wheel scrolling (default: true). */
	wheelEnabled?: boolean
	/** Wheel scroll step in px per tick (default: 24). */
	wheelStep?: number
	/** Position (optional). */
	position?: Position
}

/**
 * A masked vertical scroll container for debug UIs.
 *
 * Add children to the internal content container via `addItem()`/`addItems()`,
 * then call `layout()` if child bounds change. Supports wheel scrolling,
 * clamped scroll range, and optional visual scrollbar.
 */
export class DebugScrollContainer extends Phaser.GameObjects.Container {
	private _panel: Phaser.GameObjects.Graphics
	private _content: Phaser.GameObjects.Container
	private _maskGraphics: Phaser.GameObjects.Graphics
	private _scrollbar: Phaser.GameObjects.Graphics
	private _wheelZone: Phaser.GameObjects.Zone
	private _contentMask: Phaser.Display.Masks.GeometryMask

	private _width: number
	private _height: number
	private _paddingLeft: number
	private _paddingRight: number
	private _paddingTop: number
	private _paddingBottom: number
	private _bgColor: HexColor
	private _strokeColor: HexColor
	private _strokeThickness: number
	private _cornerRadius: number
	private _scrollbarEnabled: boolean
	private _scrollbarWidth: number
	private _scrollbarColor: HexColor
	private _scrollbarTrackColor: HexColor
	private _scrollbarMinThumbHeight: number
	private _wheelEnabled: boolean
	private _wheelStep: number

	private _contentMinY = 0
	private _contentHeight = 0
	private _scrollY = 0

	private readonly _wheelHandler: (
		pointer: Phaser.Input.Pointer,
		currentlyOver: Phaser.GameObjects.GameObject[],
		deltaX: number,
		deltaY: number,
		deltaZ: number,
		event?: Event,
	) => void

	constructor(scene: Phaser.Scene, options: CreateDebugScrollContainerOptions = {}) {
		const {
			width = 320,
			height = 220,
			paddingLeft = 10,
			paddingRight = 10,
			paddingTop = 10,
			paddingBottom = 10,
			bgColor = "#000000",
			strokeColor = "#a3a3a3",
			strokeThickness = 2,
			cornerRadius = 10,
			scrollbarEnabled = true,
			scrollbarWidth = 6,
			scrollbarColor = "#a3a3a3",
			scrollbarTrackColor = "#262626",
			scrollbarMinThumbHeight = 24,
			wheelEnabled = true,
			wheelStep = 24,
			initialScrollY = 0,
			position,
		} = options

		super(scene, position?.x ?? 0, position?.y ?? 0)

		this._width = width
		this._height = height
		this._paddingLeft = paddingLeft
		this._paddingRight = paddingRight
		this._paddingTop = paddingTop
		this._paddingBottom = paddingBottom
		this._bgColor = bgColor
		this._strokeColor = strokeColor
		this._strokeThickness = strokeThickness
		this._cornerRadius = cornerRadius
		this._scrollbarEnabled = scrollbarEnabled
		this._scrollbarWidth = scrollbarWidth
		this._scrollbarColor = scrollbarColor
		this._scrollbarTrackColor = scrollbarTrackColor
		this._scrollbarMinThumbHeight = scrollbarMinThumbHeight
		this._wheelEnabled = wheelEnabled
		this._wheelStep = wheelStep
		this.setSize(width, height)

		this._panel = scene.add.graphics()
		this._content = scene.add.container(0, 0)
		this._maskGraphics = scene.add.graphics()
		this._scrollbar = scene.add.graphics()
		this._wheelZone = scene.add.zone(0, 0, 1, 1).setInteractive()
		this._wheelZone.input!.cursor = "default"

		this._contentMask = this._maskGraphics.createGeometryMask()
		this._content.setMask(this._contentMask)
		this._maskGraphics.setVisible(false)

		this.add([this._panel, this._wheelZone, this._content, this._scrollbar, this._maskGraphics])

		this._wheelHandler = (_pointer, currentlyOver, _deltaX, deltaY, _deltaZ, event) => {
			this.handleWheel(currentlyOver, deltaY, event)
		}
		scene.input.on("wheel", this._wheelHandler)

		this.layout()
		this.setScrollY(initialScrollY)
		scene.add.existing(this)
	}

	addItem(child: Phaser.GameObjects.GameObject): this {
		this._content.add(child)
		return this.layout()
	}

	addItems(children: Phaser.GameObjects.GameObject[]): this {
		if (children.length === 0) return this
		this._content.add(children)
		return this.layout()
	}

	removeItem(child: Phaser.GameObjects.GameObject, destroyChild = false): this {
		if (!this._content.exists(child)) return this
		this._content.remove(child, destroyChild)
		return this.layout()
	}

	removeAllItems(destroyChildren = false): this {
		if (this._content.list.length === 0) return this
		this._content.removeAll(destroyChildren)
		return this.layout()
	}

	getContentContainer(): Phaser.GameObjects.Container {
		return this._content
	}

	layout(): this {
		this.setSize(this._width, this._height)
		this.redrawPanel()
		this.redrawMaskAndWheelZone()
		this.updateContentMetrics()
		this._scrollY = Phaser.Math.Clamp(this._scrollY, 0, this.getMaxScrollY())
		this.applyScroll()
		this.redrawScrollbar()
		return this
	}

	setScrollY(value: number): this {
		const clamped = Phaser.Math.Clamp(value, 0, this.getMaxScrollY())
		if (clamped === this._scrollY) return this
		this._scrollY = clamped
		this.applyScroll()
		this.redrawScrollbar()
		this.emit("scroll-changed", this._scrollY, this.getMaxScrollY())
		return this
	}

	scrollBy(deltaY: number): this {
		if (deltaY === 0) return this
		return this.setScrollY(this._scrollY + deltaY)
	}

	scrollToTop(): this {
		return this.setScrollY(0)
	}

	scrollToBottom(): this {
		return this.setScrollY(this.getMaxScrollY())
	}

	getScrollY(): number {
		return this._scrollY
	}

	getMaxScrollY(): number {
		return Math.max(0, this._contentHeight - this.getViewportHeight())
	}

	getContentHeight(): number {
		return this._contentHeight
	}

	setWheelEnabled(enabled: boolean): this {
		this._wheelEnabled = enabled
		return this
	}

	setWheelStep(step: number): this {
		this._wheelStep = Math.max(1, step)
		return this
	}

	setScrollbarEnabled(enabled: boolean): this {
		if (this._scrollbarEnabled === enabled) return this
		this._scrollbarEnabled = enabled
		this.redrawScrollbar()
		return this
	}

	setViewportSize(width: number, height: number): this {
		this._width = Math.max(1, width)
		this._height = Math.max(1, height)
		this.setSize(this._width, this._height)
		return this.layout()
	}

	setPadding(options: {
		left?: number
		right?: number
		top?: number
		bottom?: number
	}): this {
		if (options.left !== undefined) this._paddingLeft = options.left
		if (options.right !== undefined) this._paddingRight = options.right
		if (options.top !== undefined) this._paddingTop = options.top
		if (options.bottom !== undefined) this._paddingBottom = options.bottom
		return this.layout()
	}

	setStyle(options: DebugScrollContainerStyleOptions): this {
		if (options.width !== undefined) this._width = Math.max(1, options.width)
		if (options.height !== undefined) this._height = Math.max(1, options.height)
		if (options.paddingLeft !== undefined) this._paddingLeft = options.paddingLeft
		if (options.paddingRight !== undefined) this._paddingRight = options.paddingRight
		if (options.paddingTop !== undefined) this._paddingTop = options.paddingTop
		if (options.paddingBottom !== undefined) this._paddingBottom = options.paddingBottom
		if (options.bgColor) this._bgColor = options.bgColor
		if (options.strokeColor) this._strokeColor = options.strokeColor
		if (options.strokeThickness !== undefined) this._strokeThickness = options.strokeThickness
		if (options.cornerRadius !== undefined) this._cornerRadius = options.cornerRadius
		if (options.scrollbarEnabled !== undefined) this._scrollbarEnabled = options.scrollbarEnabled
		if (options.scrollbarWidth !== undefined) this._scrollbarWidth = options.scrollbarWidth
		if (options.scrollbarColor) this._scrollbarColor = options.scrollbarColor
		if (options.scrollbarTrackColor) this._scrollbarTrackColor = options.scrollbarTrackColor
		if (options.scrollbarMinThumbHeight !== undefined) this._scrollbarMinThumbHeight = options.scrollbarMinThumbHeight
		return this.layout()
	}

	override destroy(fromScene?: boolean): void {
		if (this.scene) this.scene.input.off("wheel", this._wheelHandler)
		this._content.clearMask(true)
		super.destroy(fromScene)
	}

	private redrawPanel(): void {
		const halfW = this._width / 2
		const halfH = this._height / 2
		const bg = hexToColorAlpha(this._bgColor)

		this._panel.clear()
		this._panel.fillStyle(bg.color, bg.alpha)
		this._panel.fillRoundedRect(-halfW, -halfH, this._width, this._height, this._cornerRadius)

		if (this._strokeThickness <= 0) return

		const stroke = hexToColorAlpha(this._strokeColor)
		this._panel.lineStyle(this._strokeThickness, stroke.color, stroke.alpha)
		this._panel.strokeRoundedRect(-halfW, -halfH, this._width, this._height, this._cornerRadius)
	}

	private redrawMaskAndWheelZone(): void {
		const viewportLeft = this.getViewportLeft()
		const viewportTop = this.getViewportTop()
		const viewportWidth = this.getViewportWidth()
		const viewportHeight = this.getViewportHeight()
		const clipRadius = Math.max(0, this._cornerRadius - this._strokeThickness)

		this._maskGraphics.clear()
		this._maskGraphics.fillStyle(0xffffff, 1)
		this._maskGraphics.fillRoundedRect(viewportLeft, viewportTop, viewportWidth, viewportHeight, clipRadius)
		this._maskGraphics.setVisible(false)

		this._wheelZone.setPosition(viewportLeft + viewportWidth / 2, viewportTop + viewportHeight / 2)
		this._wheelZone.setSize(viewportWidth, viewportHeight)
	}

	private updateContentMetrics(): void {
		const items = this._content.list as Phaser.GameObjects.GameObject[]
		if (items.length === 0) {
			this._contentMinY = 0
			this._contentHeight = 0
			return
		}

		let minY = Number.POSITIVE_INFINITY
		let maxY = Number.NEGATIVE_INFINITY

		for (const item of items) {
			const transform = item as unknown as Phaser.GameObjects.Components.Transform
			const y = transform.y ?? 0
			const halfHeight = this.getItemHalfHeight(item)

			minY = Math.min(minY, y - halfHeight)
			maxY = Math.max(maxY, y + halfHeight)
		}

		if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
			this._contentMinY = 0
			this._contentHeight = 0
			return
		}

		this._contentMinY = minY
		this._contentHeight = Math.max(0, maxY - minY)
	}

	private applyScroll(): void {
		this._content.x = this.getViewportLeft()
		this._content.y = this.getViewportTop() - this._contentMinY - this._scrollY
	}

	private redrawScrollbar(): void {
		this._scrollbar.clear()
		if (!this._scrollbarEnabled) return

		const maxScroll = this.getMaxScrollY()
		if (maxScroll <= 0) return

		const viewportLeft = this.getViewportLeft()
		const viewportTop = this.getViewportTop()
		const viewportWidth = this.getViewportWidth()
		const viewportHeight = this.getViewportHeight()
		const barWidth = Math.max(2, this._scrollbarWidth)

		if (viewportWidth <= barWidth) return

		const x = viewportLeft + viewportWidth - barWidth
		const trackRadius = barWidth / 2
		const trackColor = hexToColorAlpha(this._scrollbarTrackColor)
		const thumbColor = hexToColorAlpha(this._scrollbarColor)

		this._scrollbar.fillStyle(trackColor.color, trackColor.alpha)
		this._scrollbar.fillRoundedRect(x, viewportTop, barWidth, viewportHeight, trackRadius)

		const rawThumbHeight = (viewportHeight / this._contentHeight) * viewportHeight
		const thumbHeight = Phaser.Math.Clamp(rawThumbHeight, this._scrollbarMinThumbHeight, viewportHeight)
		const travel = Math.max(0, viewportHeight - thumbHeight)
		const thumbY = viewportTop + (this._scrollY / maxScroll) * travel

		this._scrollbar.fillStyle(thumbColor.color, thumbColor.alpha)
		this._scrollbar.fillRoundedRect(x, thumbY, barWidth, thumbHeight, trackRadius)
	}

	private handleWheel(currentlyOver: Phaser.GameObjects.GameObject[], deltaY: number, event?: Event): void {
		if (!this._wheelEnabled) return
		if (deltaY === 0) return
		if (!this.isWheelOverThisContainer(currentlyOver)) return

		const before = this._scrollY
		const direction = deltaY > 0 ? 1 : -1
		this.scrollBy(direction * this._wheelStep)

		if (before === this._scrollY) return

		if (!event) return
		if ("preventDefault" in event && typeof event.preventDefault === "function") event.preventDefault()
		if ("stopPropagation" in event && typeof event.stopPropagation === "function") event.stopPropagation()
	}

	private isWheelOverThisContainer(currentlyOver: Phaser.GameObjects.GameObject[]): boolean {
		if (currentlyOver.length === 0) return false

		for (const obj of currentlyOver) {
			if (this.ownsObject(obj)) return true
		}

		return false
	}

	private ownsObject(obj: Phaser.GameObjects.GameObject): boolean {
		if (obj === this._wheelZone) return true
		if (obj.parentContainer === this) return true

		let parent = obj.parentContainer
		while (parent) {
			if (parent === this) return true
			parent = parent.parentContainer
		}

		return false
	}

	private getItemHalfHeight(item: Phaser.GameObjects.GameObject): number {
		const maybeDisplay = item as unknown as { displayHeight?: number }
		if (typeof maybeDisplay.displayHeight === "number" && maybeDisplay.displayHeight > 0) {
			return maybeDisplay.displayHeight / 2
		}

		const maybeHeight = item as unknown as { height?: number }
		if (typeof maybeHeight.height === "number" && maybeHeight.height > 0) {
			return maybeHeight.height / 2
		}

		if ("getBounds" in item && typeof item.getBounds === "function") {
			const bounds = item.getBounds()
			return bounds.height / 2
		}

		return 0
	}

	private getViewportLeft(): number {
		return -this._width / 2 + this._paddingLeft
	}

	private getViewportTop(): number {
		return -this._height / 2 + this._paddingTop
	}

	private getViewportWidth(): number {
		return Math.max(1, this._width - this._paddingLeft - this._paddingRight)
	}

	private getViewportHeight(): number {
		return Math.max(1, this._height - this._paddingTop - this._paddingBottom)
	}
}

export function createDebugScrollContainer(
	scene: Phaser.Scene,
	options: CreateDebugScrollContainerOptions = {},
): DebugScrollContainer {
	return new DebugScrollContainer(scene, options)
}
