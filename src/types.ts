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

export type IconSide = "left" | "right"

/**
 * Image-based icon config (Phaser texture key + optional layout/tint settings).
 *
 * Intended for monochrome (usually white) PNGs so tinting works predictably.
 */
export interface DebugImageIconOptions {
	/** Texture key (must be preloaded in the Scene). */
	key: string
	/** Optional texture frame (atlas / spritesheet). */
	frame?: string | number
	/** Icon side relative to text (default: "left"). */
	side?: IconSide
	/** Gap between icon and text in px (default: 8). */
	gap?: number
	/** Icon tint (default: follow text color for the current state). */
	tint?: HexColor
	/** Hover-state icon tint override (button only). */
	hoverTint?: HexColor
	/** Disabled-state icon tint override (button only). */
	disabledTint?: HexColor
	/** Alpha multiplier applied after tint alpha (default: 1). */
	alpha?: number
}
