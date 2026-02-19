export interface LayoutAutoTarget {
	layout(): unknown
}

export interface LayoutAutoOptions {
	/** Scene event used for flushing dirty targets (default: "preupdate"). */
	flushEvent?: "preupdate" | "postupdate"
}

export interface LayoutAutoScheduler {
	markDirty(target: LayoutAutoTarget): this
	markDirtyMany(targets: LayoutAutoTarget[]): this
	remove(target: LayoutAutoTarget): this
	clear(): this
	flush(): this
	destroy(): void
	isDestroyed(): boolean
	getDirtyCount(): number
}

/**
 * Frame-batched layout scheduler for row/column/grid/scroll containers.
 *
 * Call `markDirty(...)` after mutating children/options.
 * Pending targets are laid out once per frame.
 */
export function layoutAuto(scene: Phaser.Scene, options: LayoutAutoOptions = {}): LayoutAutoScheduler {
	const { flushEvent = "preupdate" } = options
	const dirty = new Set<LayoutAutoTarget>()
	let destroyed = false
	let isFlushing = false

	const onFlushEvent = (): void => {
		if (destroyed || dirty.size === 0) return
		flushNow()
	}

	scene.events.on(flushEvent, onFlushEvent)
	scene.events.once("shutdown", () => {
		destroyScheduler()
	})

	const flushNow = (): void => {
		if (destroyed || dirty.size === 0 || isFlushing) return
		isFlushing = true

		const queue = Array.from(dirty)
		dirty.clear()

		for (const target of queue) {
			if (destroyed) break
			target.layout()
		}

		isFlushing = false
	}

	const destroyScheduler = (): void => {
		if (destroyed) return
		destroyed = true
		dirty.clear()
		scene.events.off(flushEvent, onFlushEvent)
	}

	return {
		markDirty(target: LayoutAutoTarget): LayoutAutoScheduler {
			if (destroyed) return this
			dirty.add(target)
			return this
		},
		markDirtyMany(targets: LayoutAutoTarget[]): LayoutAutoScheduler {
			if (destroyed || targets.length === 0) return this
			for (const target of targets) dirty.add(target)
			return this
		},
		remove(target: LayoutAutoTarget): LayoutAutoScheduler {
			if (destroyed) return this
			dirty.delete(target)
			return this
		},
		clear(): LayoutAutoScheduler {
			if (destroyed) return this
			dirty.clear()
			return this
		},
		flush(): LayoutAutoScheduler {
			flushNow()
			return this
		},
		destroy: destroyScheduler,
		isDestroyed: () => destroyed,
		getDirtyCount: () => dirty.size,
	}
}
