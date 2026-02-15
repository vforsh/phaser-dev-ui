/**
 * Playground entry point.
 *
 * Imports Phaser as an ES module and exposes it as `window.Phaser`
 * before loading any game code that depends on the Phaser global.
 */

import * as Phaser from "phaser"

;(window as any).Phaser = Phaser

// Parse ?page=N (1-based) for initial playground page
const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
const pageParam = params.get("page")
const startPage = pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0
;(window as any).__PLAYGROUND_START_PAGE = startPage

// Dynamic import so PlaygroundScene evaluates after Phaser global is set.
const { PlaygroundScene } = await import("./PlaygroundScene.js")

const config: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 1080,
	height: 1920,
	parent: "game-container",
	backgroundColor: "#1a1a2e",
	scene: [PlaygroundScene],
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
}

new Phaser.Game(config)
