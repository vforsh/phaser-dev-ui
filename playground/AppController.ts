/**
 * Phaser-adapted AppController for E2E testing and debug inspection.
 *
 * Exposes `window.appctl` with scene graph inspection, test ID registry,
 * canvas position queries, frame/time control, input simulation,
 * snapshot collection, performance stats, and screenshot capture.
 *
 * Playground-only — not part of the library dist.
 */

export type TestId = string

export interface NodeInfo {
	name: string
	type: string
	active: boolean
	visible: boolean
	alpha: number
	x: number
	y: number
	scaleX: number
	scaleY: number
	depth: number
	text?: string
	children?: NodeInfo[]
}

export interface CanvasPosition {
	x: number
	y: number
}

export interface CanvasBounds {
	x: number
	y: number
	width: number
	height: number
	left: number
	right: number
	top: number
	bottom: number
	centerX: number
	centerY: number
}

export interface SnapshotButton {
	type: "button"
	testId: string | null
	text: string
	x: number
	y: number
	enabled: boolean
	visible: boolean
}

export interface SnapshotLabel {
	type: "label"
	testId: string | null
	text: string
	x: number
	y: number
	visible: boolean
}

export type SnapshotEntry = SnapshotButton | SnapshotLabel

export interface PerfStats {
	fps: number
	delta: number
	gameObjectCount: number
}

export interface AppControllerOptions {
	game: Phaser.Game
}

export class AppController {
	private _game: Phaser.Game
	private _testIdMap: Map<TestId, Phaser.GameObjects.GameObject> = new Map()

	constructor(options: AppControllerOptions) {
		this._game = options.game
		;(window as any).appctl = this
	}

	// ── Game & Scene access ──

	get game(): Phaser.Game {
		return this._game
	}

	/** Get the currently active scene (first running scene). */
	getActiveScene(): Phaser.Scene | null {
		const scenes = this._game.scene.getScenes(true)
		return scenes[0] ?? null
	}

	/** Get scene by key. */
	getScene(key: string): Phaser.Scene | null {
		return this._game.scene.getScene(key) ?? null
	}

	/** List all scene keys and their status. */
	getSceneList(): Array<{ key: string; active: boolean; visible: boolean }> {
		return this._game.scene.getScenes(false).map((s) => ({
			key: s.scene.key,
			active: s.scene.isActive(),
			visible: s.scene.isVisible(),
		}))
	}

	// ── Test ID Registry ──

	registerNode(testId: TestId, gameObject: Phaser.GameObjects.GameObject): void {
		this._testIdMap.set(testId, gameObject)
		gameObject.once("destroy", () => {
			if (this._testIdMap.get(testId) === gameObject) {
				this._testIdMap.delete(testId)
			}
		})
	}

	getNodeById(testId: TestId): Phaser.GameObjects.GameObject | null {
		return this._testIdMap.get(testId) ?? null
	}

	getNodeInfoById(testId: TestId): NodeInfo | null {
		const go = this._testIdMap.get(testId)
		if (!go) return null
		return this.serializeGameObject(go)
	}

	assertNodeExists(testId: TestId): Phaser.GameObjects.GameObject {
		const go = this._testIdMap.get(testId)
		if (!go) throw new Error(`Test ID "${testId}" not registered`)
		return go
	}

	getRegisteredTestIds(): TestId[] {
		return Array.from(this._testIdMap.keys())
	}

	// ── Scene Graph Inspection ──

	/** Serialize the full scene graph of the active scene. */
	getCurrentSceneGraph(): NodeInfo[] {
		const scene = this.getActiveScene()
		if (!scene) return []
		return this.getSceneGraph(scene.scene.key)
	}

	/** Serialize the scene graph for a specific scene. */
	getSceneGraph(sceneKey: string): NodeInfo[] {
		const scene = this.getScene(sceneKey)
		if (!scene) return []
		return scene.children.list.map((go) => this.serializeGameObject(go, true))
	}

	/** Serialize a single game object (without children by default). */
	serializeGameObject(go: Phaser.GameObjects.GameObject, includeChildren = false): NodeInfo {
		const transform = go as unknown as Phaser.GameObjects.Components.Transform
		const visible = go as unknown as Phaser.GameObjects.Components.Visible
		const alpha = go as unknown as Phaser.GameObjects.Components.Alpha
		const depth = go as unknown as Phaser.GameObjects.Components.Depth

		const info: NodeInfo = {
			name: go.name || go.type,
			type: go.type,
			active: go.active,
			visible: "visible" in go ? (visible.visible ?? true) : true,
			alpha: "alpha" in go ? (alpha.alpha ?? 1) : 1,
			x: "x" in go ? (transform.x ?? 0) : 0,
			y: "y" in go ? (transform.y ?? 0) : 0,
			scaleX: "scaleX" in go ? (transform.scaleX ?? 1) : 1,
			scaleY: "scaleY" in go ? (transform.scaleY ?? 1) : 1,
			depth: "depth" in go ? (depth.depth ?? 0) : 0,
		}

		// Text content
		if (go instanceof Phaser.GameObjects.Text) {
			info.text = go.text
		}

		// Container children
		if (includeChildren && go instanceof Phaser.GameObjects.Container) {
			info.children = go.list.map((child) => this.serializeGameObject(child, true))
		}

		return info
	}

	// ── Canvas Position Queries ──

	/** Get the canvas-space position of a game object. */
	getNodeCanvasPosition(go: Phaser.GameObjects.GameObject): CanvasPosition | null {
		const transform = go as unknown as Phaser.GameObjects.Components.Transform
		if (!("x" in go)) return null

		const camera = this.getActiveScene()?.cameras.main
		if (!camera) return null

		const matrix = (go as any).getWorldTransformMatrix?.()
		if (matrix) {
			return { x: matrix.tx - camera.scrollX, y: matrix.ty - camera.scrollY }
		}

		return {
			x: transform.x - camera.scrollX,
			y: transform.y - camera.scrollY,
		}
	}

	/** Get the canvas-space bounds of a game object. */
	getNodeCanvasBounds(go: Phaser.GameObjects.GameObject): CanvasBounds | null {
		const pos = this.getNodeCanvasPosition(go)
		if (!pos) return null

		const bounds = (go as any).getBounds?.() as Phaser.Geom.Rectangle | undefined
		if (bounds) {
			const camera = this.getActiveScene()?.cameras.main
			if (!camera) return null
			const left = bounds.x - camera.scrollX
			const top = bounds.y - camera.scrollY
			return {
				x: left,
				y: top,
				width: bounds.width,
				height: bounds.height,
				left,
				right: left + bounds.width,
				top,
				bottom: top + bounds.height,
				centerX: left + bounds.width / 2,
				centerY: top + bounds.height / 2,
			}
		}

		// Fallback: point bounds
		return {
			x: pos.x,
			y: pos.y,
			width: 0,
			height: 0,
			left: pos.x,
			right: pos.x,
			top: pos.y,
			bottom: pos.y,
			centerX: pos.x,
			centerY: pos.y,
		}
	}

	getNodeCanvasPositionById(testId: TestId): CanvasPosition | null {
		const go = this._testIdMap.get(testId)
		if (!go) return null
		return this.getNodeCanvasPosition(go)
	}

	getNodeCanvasBoundsById(testId: TestId): CanvasBounds | null {
		const go = this._testIdMap.get(testId)
		if (!go) return null
		return this.getNodeCanvasBounds(go)
	}

	// ── Frame / Time Control ──

	/** Advance N frames with a fixed delta time (ms). */
	async advanceFrames(count: number, deltaMs = 16.666): Promise<void> {
		for (let i = 0; i < count; i++) {
			this._game.loop.step(performance.now())
			await this.waitOneFrame()
		}
	}

	/** Advance simulation by a duration (ms). Uses fixed 16.666ms steps. */
	async advanceTime(durationMs: number, stepMs = 16.666): Promise<void> {
		const steps = Math.ceil(durationMs / stepMs)
		await this.advanceFrames(steps, stepMs)
	}

	/** Advance until a predicate returns true, or maxSteps is reached. */
	async advanceUntil(
		predicate: () => boolean,
		options: { maxSteps?: number; stepMs?: number } = {},
	): Promise<boolean> {
		const { maxSteps = 600, stepMs = 16.666 } = options

		for (let i = 0; i < maxSteps; i++) {
			if (predicate()) return true
			this._game.loop.step(performance.now())
			await this.waitOneFrame()
		}

		return predicate()
	}

	private waitOneFrame(): Promise<void> {
		return new Promise((resolve) => requestAnimationFrame(() => resolve()))
	}

	// ── Input Simulation ──

	/** Simulate a keyboard key down event. */
	emitKeyDown(key: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean } = {}): void {
		const event = new KeyboardEvent("keydown", {
			key,
			code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
			shiftKey: modifiers.shift ?? false,
			ctrlKey: modifiers.ctrl ?? false,
			altKey: modifiers.alt ?? false,
			bubbles: true,
		})
		this._game.canvas.dispatchEvent(event)
	}

	/** Simulate a keyboard key up event. */
	emitKeyUp(key: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean } = {}): void {
		const event = new KeyboardEvent("keyup", {
			key,
			code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
			shiftKey: modifiers.shift ?? false,
			ctrlKey: modifiers.ctrl ?? false,
			altKey: modifiers.alt ?? false,
			bubbles: true,
		})
		this._game.canvas.dispatchEvent(event)
	}

	/** Simulate a pointer click at canvas coordinates. */
	emitClick(x: number, y: number): void {
		const scene = this.getActiveScene()
		if (!scene) return
		scene.input.emit("pointerdown", { x, y, worldX: x, worldY: y })
		scene.input.emit("pointerup", { x, y, worldX: x, worldY: y })
	}

	// ── Snapshot ──

	/** Collect a flat list of visible buttons and labels from the active scene. */
	getSnapshot(): SnapshotEntry[] {
		const scene = this.getActiveScene()
		if (!scene) return []

		const entries: SnapshotEntry[] = []
		const testIdReverse = new Map<Phaser.GameObjects.GameObject, TestId>()

		for (const [id, go] of this._testIdMap) {
			testIdReverse.set(go, id)
		}

		const walk = (gameObjects: Phaser.GameObjects.GameObject[]) => {
			for (const go of gameObjects) {
				if (!go.active) continue
				const visible = (go as unknown as Phaser.GameObjects.Components.Visible).visible
				if (visible === false) continue

				const testId = testIdReverse.get(go) ?? null

				// Check if it's a button-like object (has interactive + text child)
				if (go instanceof Phaser.GameObjects.Container && go.input) {
					const textChild = go.list.find((c) => c instanceof Phaser.GameObjects.Text) as
						| Phaser.GameObjects.Text
						| undefined
					entries.push({
						type: "button",
						testId,
						text: textChild?.text ?? "",
						x: go.x,
						y: go.y,
						enabled: go.input?.enabled ?? true,
						visible: true,
					})
					continue // Skip children — label already captured
				}

				// Text objects
				if (go instanceof Phaser.GameObjects.Text) {
					entries.push({
						type: "label",
						testId,
						text: go.text,
						x: go.x,
						y: go.y,
						visible: true,
					})
				}

				// Recurse into containers
				if (go instanceof Phaser.GameObjects.Container) {
					walk(go.list)
				}
			}
		}

		walk(scene.children.list)
		return entries
	}

	// ── Performance Stats ──

	getPerfStats(): PerfStats {
		return {
			fps: Math.round(this._game.loop.actualFps),
			delta: this._game.loop.delta,
			gameObjectCount: this.countGameObjects(),
		}
	}

	private countGameObjects(): number {
		let count = 0
		const scenes = this._game.scene.getScenes(true)
		for (const scene of scenes) {
			count += this.countInList(scene.children.list)
		}
		return count
	}

	private countInList(list: Phaser.GameObjects.GameObject[]): number {
		let count = list.length
		for (const go of list) {
			if (go instanceof Phaser.GameObjects.Container) {
				count += this.countInList(go.list)
			}
		}
		return count
	}

	// ── Screenshot ──

	/** Capture the game canvas as a PNG data URL. */
	takeScreenshot(): string {
		return this._game.canvas.toDataURL("image/png")
	}

	/** Capture a region of the canvas as a PNG data URL. */
	takeRegionScreenshot(x: number, y: number, width: number, height: number): string {
		const tempCanvas = document.createElement("canvas")
		tempCanvas.width = width
		tempCanvas.height = height
		const ctx = tempCanvas.getContext("2d")!
		ctx.drawImage(this._game.canvas, x, y, width, height, 0, 0, width, height)
		return tempCanvas.toDataURL("image/png")
	}

	// ── Cleanup ──

	destroy(): void {
		this._testIdMap.clear()
		if ((window as any).appctl === this) {
			delete (window as any).appctl
		}
	}
}

/** Create and install AppController on `window.appctl`. */
export function createAppController(game: Phaser.Game): AppController {
	return new AppController({ game })
}
