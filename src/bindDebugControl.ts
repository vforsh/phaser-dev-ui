export interface DebugControlAdapter<TControl, TValue> {
	read(control: TControl): TValue
	write(control: TControl, value: TValue): void
	subscribe?(control: TControl, onValue: (value: TValue) => void): (() => void) | void
}

export interface BindDebugControlOptions<TControl, TValue> {
	/** UI control instance to bind. */
	control: TControl
	/** Optional explicit scene (auto-detected from control.scene when omitted). */
	scene?: Phaser.Scene
	/** Model object used with `path` for get/set. */
	target?: Record<string, unknown>
	/** Dot/bracket path (e.g. "player.speed" / "items[0].enabled"). */
	path?: string
	/** Custom model getter (alternative to `target` + `path`). */
	getValue?: () => TValue
	/** Custom model setter (alternative to `target` + `path`). */
	setValue?: (value: TValue) => void
	/** Optional control adapter; inferred for known controls when omitted. */
	adapter?: Partial<DebugControlAdapter<TControl, TValue>>
	/** Compare model/control values (default: Object.is). */
	equals?: (a: TValue, b: TValue) => boolean
	/** Sync model -> control once at bind time (default: true). */
	syncFromModelOnBind?: boolean
	/** Poll model each frame and push updates to control (default: true). */
	syncFromModelEachFrame?: boolean
}

export interface DebugControlBinding<TValue> {
	syncFromModel(): void
	syncFromControl(): void
	getModelValue(): TValue
	destroy(): void
	isDestroyed(): boolean
}

interface ModelAccess<TValue> {
	get: () => TValue
	set: (value: TValue) => void
}

/**
 * Two-way data binding between a debug control and a model source.
 *
 * Control -> model updates happen via control events.
 * Model -> control updates happen on preupdate polling (or manual sync).
 */
export function bindDebugControl<TControl, TValue>(
	options: BindDebugControlOptions<TControl, TValue>,
): DebugControlBinding<TValue> {
	const {
		control,
		scene: sceneFromOptions,
		equals = Object.is,
		syncFromModelOnBind = true,
		syncFromModelEachFrame = true,
	} = options

	const scene = sceneFromOptions ?? getSceneFromControl(control)
	const model = resolveModelAccess(options)
	const adapter = resolveControlAdapter(control, options.adapter)

	let destroyed = false
	let pushingModelToControl = false
	let pushingControlToModel = false
	let hasLastModelValue = false
	let lastModelValue: TValue | null = null
	let unsubscribeControl: (() => void) | null = null

	const syncModelIntoControl = (): void => {
		if (destroyed || pushingControlToModel) return
		const modelValue = model.get()
		if (hasLastModelValue && equals(modelValue, lastModelValue as TValue)) return

		pushingModelToControl = true
		adapter.write(control, modelValue)
		pushingModelToControl = false

		lastModelValue = modelValue
		hasLastModelValue = true
	}

	const syncControlIntoModel = (): void => {
		if (destroyed || pushingModelToControl) return
		const controlValue = adapter.read(control)
		if (hasLastModelValue && equals(controlValue, lastModelValue as TValue)) return

		pushingControlToModel = true
		model.set(controlValue)
		pushingControlToModel = false

		lastModelValue = controlValue
		hasLastModelValue = true
	}

	if (adapter.subscribe) {
		const maybeUnsub = adapter.subscribe(control, (value) => {
			if (destroyed || pushingModelToControl) return
			if (hasLastModelValue && equals(value, lastModelValue as TValue)) return

			pushingControlToModel = true
			model.set(value)
			pushingControlToModel = false

			lastModelValue = value
			hasLastModelValue = true
		})
		if (typeof maybeUnsub === "function") {
			unsubscribeControl = maybeUnsub
		}
	}

	const preupdate = (): void => {
		if (!syncFromModelEachFrame) return
		syncModelIntoControl()
	}

	if (scene) {
		scene.events.on("preupdate", preupdate)
		scene.events.once("shutdown", destroyBinding)
	}

	attachAutoDestroy(control, () => {
		destroyBinding()
	})

	if (syncFromModelOnBind) {
		syncModelIntoControl()
	}

	function destroyBinding(): void {
		if (destroyed) return
		destroyed = true

		if (scene) {
			scene.events.off("preupdate", preupdate)
			scene.events.off("shutdown", destroyBinding)
		}

		if (unsubscribeControl) {
			unsubscribeControl()
			unsubscribeControl = null
		}
	}

	return {
		syncFromModel: syncModelIntoControl,
		syncFromControl: syncControlIntoModel,
		getModelValue: model.get,
		destroy: destroyBinding,
		isDestroyed: () => destroyed,
	}
}

function resolveModelAccess<TControl, TValue>(
	options: BindDebugControlOptions<TControl, TValue>,
): ModelAccess<TValue> {
	if (options.getValue && options.setValue) {
		return {
			get: options.getValue,
			set: options.setValue,
		}
	}

	const { target, path } = options
	if (!target || !path) {
		throw new Error('bindDebugControl: provide either `getValue`+`setValue` or `target`+`path`')
	}

	const tokens = parsePath(path)
	if (tokens.length === 0) {
		throw new Error("bindDebugControl: path cannot be empty")
	}

	return {
		get: () => getValueAtPath(target, tokens) as TValue,
		set: (value: TValue) => {
			setValueAtPath(target, tokens, value)
		},
	}
}

function resolveControlAdapter<TControl, TValue>(
	control: TControl,
	partial?: Partial<DebugControlAdapter<TControl, TValue>>,
): DebugControlAdapter<TControl, TValue> {
	const inferred = inferAdapter(control)
	const read = (partial?.read ?? inferred?.read) as ((control: TControl) => TValue) | undefined
	const write = (partial?.write ?? inferred?.write) as ((control: TControl, value: TValue) => void) | undefined
	const subscribe = (partial?.subscribe ?? inferred?.subscribe) as
		| ((control: TControl, onValue: (value: TValue) => void) => (() => void) | void)
		| undefined

	if (!read || !write) {
		throw new Error(
			"bindDebugControl: could not infer control adapter. Provide adapter.read + adapter.write (and adapter.subscribe for two-way).",
		)
	}

	return {
		read,
		write,
		subscribe,
	}
}

function inferAdapter<TControl, TValue>(control: TControl): Partial<DebugControlAdapter<TControl, TValue>> | null {
	const anyControl = control as unknown as Record<string, unknown>

	const hasSwitchApi =
		typeof anyControl.getCurrentOption === "function" &&
		typeof anyControl.setOptionByKey === "function" &&
		typeof anyControl.on === "function" &&
		typeof anyControl.off === "function"

	if (hasSwitchApi) {
		return {
			read: (ctrl) => {
				const c = ctrl as unknown as { getCurrentOption: () => { key: TValue } | null }
				return (c.getCurrentOption()?.key ?? null) as TValue
			},
			write: (ctrl, value) => {
				const c = ctrl as unknown as {
					setOptionByKey?: (key: TValue) => void
					setOptionIndex?: (index: number) => void
				}
				if (typeof c.setOptionByKey === "function") {
					c.setOptionByKey(value)
					return
				}
				if (typeof c.setOptionIndex === "function" && typeof (value as unknown) === "number") {
					c.setOptionIndex(value as unknown as number)
				}
			},
			subscribe: (ctrl, onValue) => {
				const c = ctrl as unknown as {
					on: (eventName: string, cb: (option: { key: TValue }) => void) => void
					off: (eventName: string, cb: (option: { key: TValue }) => void) => void
				}
				const handler = (option: { key: TValue }) => onValue(option.key)
				c.on("option-changed", handler)
				return () => c.off("option-changed", handler)
			},
		} as Partial<DebugControlAdapter<TControl, TValue>>
	}

	const hasValueApi = typeof anyControl.getValue === "function" && typeof anyControl.setValue === "function"
	if (hasValueApi) {
		const canSubscribe = typeof anyControl.on === "function" && typeof anyControl.off === "function"
		return {
			read: (ctrl) => {
				const c = ctrl as unknown as { getValue: () => TValue }
				return c.getValue()
			},
			write: (ctrl, value) => {
				const c = ctrl as unknown as { setValue: (nextValue: TValue) => void }
				c.setValue(value)
			},
			subscribe: canSubscribe
				? (ctrl, onValue) => {
						const c = ctrl as unknown as {
							on: (event: string, cb: (value: TValue) => void) => void
							off: (event: string, cb: (value: TValue) => void) => void
						}
						const handler = (value: TValue) => onValue(value)
						c.on("value-changed", handler)
						return () => c.off("value-changed", handler)
					}
				: undefined,
		} as Partial<DebugControlAdapter<TControl, TValue>>
	}

	return null
}

function attachAutoDestroy(control: unknown, onDestroy: () => void): void {
	const maybeEmitter = control as { once?: (event: string, cb: () => void) => void }
	if (typeof maybeEmitter.once !== "function") return
	maybeEmitter.once("destroy", onDestroy)
}

function getSceneFromControl(control: unknown): Phaser.Scene | null {
	const maybeScene = (control as { scene?: Phaser.Scene }).scene
	return maybeScene ?? null
}

function parsePath(path: string): Array<string | number> {
	const tokens: Array<string | number> = []
	const re = /[^.[\]]+|\[(\d+)\]/g
	let match: RegExpExecArray | null
	while ((match = re.exec(path)) !== null) {
		const indexValue = match[1]
		if (indexValue !== undefined) {
			tokens.push(Number(indexValue))
			continue
		}

		const key = match[0]
		if (key) tokens.push(key)
	}
	return tokens
}

function getValueAtPath(obj: unknown, tokens: Array<string | number>): unknown {
	let cursor: unknown = obj
	for (const token of tokens) {
		if (cursor === null || cursor === undefined) return undefined
		if (typeof token === "number") {
			if (!Array.isArray(cursor)) return undefined
			cursor = cursor[token]
			continue
		}
		cursor = (cursor as Record<string, unknown>)[token]
	}
	return cursor
}

function setValueAtPath(obj: unknown, tokens: Array<string | number>, value: unknown): void {
	if (tokens.length === 0) return

	let cursor: unknown = obj
	for (let i = 0; i < tokens.length - 1; i++) {
		const token = tokens[i]
		const nextToken = tokens[i + 1]
		if (token === undefined || nextToken === undefined) return

		if (typeof token === "number") {
			if (!Array.isArray(cursor)) return
			const nextValue = cursor[token]
			if (nextValue === null || nextValue === undefined) {
				cursor[token] = typeof nextToken === "number" ? [] : {}
			}
			cursor = cursor[token]
			continue
		}

		const record = cursor as Record<string, unknown>
		const nextValue = record[token]
		if (nextValue === null || nextValue === undefined) {
			record[token] = typeof nextToken === "number" ? [] : {}
		}
		cursor = record[token]
	}

	const lastToken = tokens[tokens.length - 1]
	if (lastToken === undefined) return

	if (typeof lastToken === "number") {
		if (!Array.isArray(cursor)) return
		cursor[lastToken] = value
		return
	}

	;(cursor as Record<string, unknown>)[lastToken] = value
}
