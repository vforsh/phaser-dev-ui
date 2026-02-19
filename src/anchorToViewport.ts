export type ViewportAnchor =
	| "top-left"
	| "top-center"
	| "top-right"
	| "center-left"
	| "center"
	| "center-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right"

export interface SafeAreaInsets {
	left: number
	right: number
	top: number
	bottom: number
}

export interface SafeAreaOptions {
	/** Merge extra insets in game units. */
	extraInsets?: Partial<SafeAreaInsets>
	/** Read CSS env(safe-area-inset-*) values from the browser (default: true). */
	useCssEnvInsets?: boolean
}

export interface AnchorToViewportOptions {
	/** Scene object for scale/resize events (auto-detected from target.scene when omitted). */
	scene?: Phaser.Scene
	/** Target object to place in viewport coordinates. */
	target: Phaser.GameObjects.GameObject
	/** Anchor point in viewport (default: "top-left"). */
	anchor?: ViewportAnchor
	/** Offset from anchor in game units (default: 0). */
	offsetX?: number
	offsetY?: number
	/** Apply safe-area insets (default: true). */
	useSafeArea?: boolean
	/** Safe-area options (extra insets + css env toggle). */
	safeArea?: SafeAreaOptions
	/** Update automatically on scale resize (default: true). */
	autoResize?: boolean
}

export interface ViewportAnchorHandle {
	update(): void
	destroy(): void
	isDestroyed(): boolean
	getSafeAreaInsets(): SafeAreaInsets
}

/**
 * Anchor a game object to a viewport corner/edge/center.
 *
 * Position is computed in game coordinates and updated on resize.
 * Assumes centered origin for best results (0.5, 0.5).
 */
export function anchorToViewport(options: AnchorToViewportOptions): ViewportAnchorHandle {
	const {
		target,
		scene: sceneFromOptions,
		anchor = "top-left",
		offsetX = 0,
		offsetY = 0,
		useSafeArea = true,
		safeArea,
		autoResize = true,
	} = options

	const scene = sceneFromOptions ?? target.scene
	if (!scene) {
		throw new Error("anchorToViewport: scene not found. Pass options.scene or use a scene-owned target.")
	}

	let destroyed = false

	const placeTarget = (): void => {
		if (destroyed) return

		const viewport = getViewportRect(scene)
		const insets = useSafeArea ? getSafeAreaInsets(scene, safeArea) : zeroInsets()

		const left = viewport.x + insets.left
		const right = viewport.x + viewport.width - insets.right
		const top = viewport.y + insets.top
		const bottom = viewport.y + viewport.height - insets.bottom

		const availableWidth = Math.max(0, right - left)
		const availableHeight = Math.max(0, bottom - top)
		const size = getDisplaySize(target)
		const halfW = size.width / 2
		const halfH = size.height / 2

		const x = computeAnchoredX(anchor, left, availableWidth, right, halfW) + offsetX
		const y = computeAnchoredY(anchor, top, availableHeight, bottom, halfH) + offsetY

		setTargetPosition(target, x, y)
	}

	const onResize = (): void => {
		placeTarget()
	}

	if (autoResize) {
		scene.scale.on("resize", onResize)
	}
	scene.events.once("shutdown", destroyHandle)

	attachAutoDestroy(target, () => {
		destroyHandle()
	})

	placeTarget()

	function destroyHandle(): void {
		if (destroyed) return
		destroyed = true
		if (autoResize) {
			scene.scale.off("resize", onResize)
		}
		scene.events.off("shutdown", destroyHandle)
	}

	return {
		update: placeTarget,
		destroy: destroyHandle,
		isDestroyed: () => destroyed,
		getSafeAreaInsets: () => (useSafeArea ? getSafeAreaInsets(scene, safeArea) : zeroInsets()),
	}
}

/**
 * Resolve safe-area insets in game units.
 *
 * Uses browser CSS env(safe-area-inset-*) values when available,
 * then applies optional caller-provided extra insets.
 */
export function getSafeAreaInsets(scene: Phaser.Scene, options: SafeAreaOptions = {}): SafeAreaInsets {
	const { extraInsets, useCssEnvInsets = true } = options
	const cssInsetsPx = useCssEnvInsets ? getCssSafeAreaInsetsPx() : zeroInsets()
	const scale = getCanvasToGameScale(scene)

	return {
		left: Math.max(0, cssInsetsPx.left * scale.x + (extraInsets?.left ?? 0)),
		right: Math.max(0, cssInsetsPx.right * scale.x + (extraInsets?.right ?? 0)),
		top: Math.max(0, cssInsetsPx.top * scale.y + (extraInsets?.top ?? 0)),
		bottom: Math.max(0, cssInsetsPx.bottom * scale.y + (extraInsets?.bottom ?? 0)),
	}
}

let safeAreaProbe: HTMLDivElement | null = null

function getCssSafeAreaInsetsPx(): SafeAreaInsets {
	if (typeof document === "undefined") return zeroInsets()
	if (!safeAreaProbe) {
		safeAreaProbe = document.createElement("div")
		safeAreaProbe.style.position = "fixed"
		safeAreaProbe.style.left = "0"
		safeAreaProbe.style.top = "0"
		safeAreaProbe.style.width = "0"
		safeAreaProbe.style.height = "0"
		safeAreaProbe.style.paddingLeft = "env(safe-area-inset-left)"
		safeAreaProbe.style.paddingRight = "env(safe-area-inset-right)"
		safeAreaProbe.style.paddingTop = "env(safe-area-inset-top)"
		safeAreaProbe.style.paddingBottom = "env(safe-area-inset-bottom)"
		safeAreaProbe.style.pointerEvents = "none"
		safeAreaProbe.style.visibility = "hidden"
		document.body.appendChild(safeAreaProbe)
	}

	const styles = getComputedStyle(safeAreaProbe)
	return {
		left: toFiniteNumber(styles.paddingLeft),
		right: toFiniteNumber(styles.paddingRight),
		top: toFiniteNumber(styles.paddingTop),
		bottom: toFiniteNumber(styles.paddingBottom),
	}
}

function getCanvasToGameScale(scene: Phaser.Scene): { x: number; y: number } {
	const canvas = scene.game.canvas
	if (!canvas || typeof canvas.getBoundingClientRect !== "function") return { x: 1, y: 1 }

	const rect = canvas.getBoundingClientRect()
	if (rect.width <= 0 || rect.height <= 0) return { x: 1, y: 1 }

	return {
		x: scene.scale.width / rect.width,
		y: scene.scale.height / rect.height,
	}
}

function getViewportRect(scene: Phaser.Scene): Phaser.Geom.Rectangle {
	if (typeof scene.scale.getViewPort === "function") {
		const out = scene.scale.getViewPort(scene.cameras.main)
		if (out) return out
	}
	return new Phaser.Geom.Rectangle(0, 0, scene.scale.width, scene.scale.height)
}

function getDisplaySize(target: Phaser.GameObjects.GameObject): { width: number; height: number } {
	const withDisplay = target as unknown as { displayWidth?: number; displayHeight?: number }
	if (typeof withDisplay.displayWidth === "number" || typeof withDisplay.displayHeight === "number") {
		return {
			width: Math.max(0, withDisplay.displayWidth ?? 0),
			height: Math.max(0, withDisplay.displayHeight ?? 0),
		}
	}

	const withSize = target as unknown as { width?: number; height?: number }
	if (typeof withSize.width === "number" || typeof withSize.height === "number") {
		return {
			width: Math.max(0, withSize.width ?? 0),
			height: Math.max(0, withSize.height ?? 0),
		}
	}

	if (typeof (target as { getBounds?: () => Phaser.Geom.Rectangle }).getBounds === "function") {
		const bounds = (target as unknown as { getBounds: () => Phaser.Geom.Rectangle }).getBounds()
		return { width: Math.max(0, bounds.width), height: Math.max(0, bounds.height) }
	}

	return { width: 0, height: 0 }
}

function setTargetPosition(target: Phaser.GameObjects.GameObject, x: number, y: number): void {
	const transform = target as unknown as { setPosition?: (x: number, y: number) => unknown }
	if (typeof transform.setPosition !== "function") {
		throw new Error("anchorToViewport: target does not support setPosition(x, y)")
	}
	transform.setPosition(x, y)
}

function attachAutoDestroy(target: Phaser.GameObjects.GameObject, onDestroy: () => void): void {
	const emitter = target as unknown as { once?: (eventName: string, cb: () => void) => void }
	if (typeof emitter.once !== "function") return
	emitter.once("destroy", onDestroy)
}

function computeAnchoredX(
	anchor: ViewportAnchor,
	left: number,
	availableWidth: number,
	right: number,
	halfWidth: number,
): number {
	switch (anchor) {
		case "top-left":
		case "center-left":
		case "bottom-left":
			return left + halfWidth
		case "top-center":
		case "center":
		case "bottom-center":
			return left + availableWidth / 2
		case "top-right":
		case "center-right":
		case "bottom-right":
			return right - halfWidth
		default:
			return left + halfWidth
	}
}

function computeAnchoredY(
	anchor: ViewportAnchor,
	top: number,
	availableHeight: number,
	bottom: number,
	halfHeight: number,
): number {
	switch (anchor) {
		case "top-left":
		case "top-center":
		case "top-right":
			return top + halfHeight
		case "center-left":
		case "center":
		case "center-right":
			return top + availableHeight / 2
		case "bottom-left":
		case "bottom-center":
		case "bottom-right":
			return bottom - halfHeight
		default:
			return top + halfHeight
	}
}

function toFiniteNumber(value: string): number {
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function zeroInsets(): SafeAreaInsets {
	return { left: 0, right: 0, top: 0, bottom: 0 }
}
