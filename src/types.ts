export interface Position {
	x?: number
	y?: number
}

export interface Size {
	width: number
	height: number
}

/** Hex color string like "#ff0000" or "#ff000080" (with alpha). */
export type HexColor = string

/** Callback receiving the component instance. */
export type ClickHandler<T> = (component: T) => void
