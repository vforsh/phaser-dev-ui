/**
 * Playground scene that showcases all debug UI primitives.
 *
 * Creates one instance of each component type so they can be
 * visually inspected and interacted with during development.
 * Content is split into pages with a bottom-center paginator.
 */

import {
	createDebugPanel,
	createDebugLabel,
	createDebugButton,
	createDebugBadge,
	createDebugProgressBar,
	createDebugSwitchButton,
	createDebugScrollContainer,
	createRowContainer,
	createColumnContainer,
	createGridContainer,
} from "../src/index.js"
import { createAppController } from "./AppController.js"

import type { DebugProgressBar } from "../src/DebugProgressBar.js"
import type { DebugImageIconOptions } from "../src/index.js"

const PAGINATOR_Y_OFFSET = 120
const PANEL_WIDTH = 340
const PANEL_HEIGHT = 400
const PANEL_TITLE_Y = -160

export class PlaygroundScene extends Phaser.Scene {
	private _progressBar!: DebugProgressBar
	private _progressDirection = 1
	private _pages: Phaser.GameObjects.Container[] = []
	private _currentPage = 0
	private _pageLabel!: Phaser.GameObjects.Text

	constructor() {
		super({ key: "PlaygroundScene" })
	}

	preload(): void {
		// Lucide icons rendered to PNGs via `icns` (playground-only assets).
		this.load.image("icon-settings", "icons/settings.png")
		this.load.image("icon-check", "icons/check.png")
		this.load.image("icon-x", "icons/x.png")
		this.load.image("icon-info", "icons/info.png")
		this.load.image("icon-triangle-alert", "icons/triangle-alert.png")
	}

	create(): void {
		const appctl = createAppController(this.game)
		const { width, height } = this.scale
		const contentY = height / 2

		// ── Title ──
		const title = createDebugLabel(this, {
			text: "phaser-dev-ui Playground",
			fontSize: 28,
			isBold: true,
			position: { x: width / 2, y: 30 },
		})
		appctl.registerNode("title", title)

		// ── Page 1: Buttons ──
		const page1 = this.add.container(width / 2, contentY)
		const panel = createDebugPanel(this, {
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			cornerRadius: 12,
			position: { x: 0, y: 0 },
			blockInputEvents: true,
		})
		appctl.registerNode("main-panel", panel)

		const panelTitle = createDebugLabel(this, {
			text: "Button Showcase",
			fontSize: 20,
			isBold: true,
			position: { x: 0, y: PANEL_TITLE_Y },
		})
		panel.add(panelTitle)

		const normalBtn = createDebugButton(this, {
			text: "Normal",
			width: 140,
			height: 50,
			onClick: (btn) => {
				console.log("Normal button clicked!")
				btn.setText("Clicked!")
				this.time.delayedCall(800, () => btn.setText("Normal"))
			},
		})
		appctl.registerNode("btn-normal", normalBtn)

		const styledBtn = createDebugButton(this, {
			text: "Styled",
			width: 140,
			height: 50,
		})
		styledBtn.setBgColor("#1a3a5c", "#2a5a8c").setTextColor("#66aaff", "#99ccff")
		appctl.registerNode("btn-styled", styledBtn)

		const disabledBtn = createDebugButton(this, {
			text: "Disabled",
			width: 140,
			height: 50,
			enabled: false,
		})
		appctl.registerNode("btn-disabled", disabledBtn)

		const toggleBtn = createDebugButton(this, {
			text: "Toggle ↑",
			width: 140,
			height: 50,
			onClick: () => {
				const newState = !disabledBtn.isEnabled()
				disabledBtn.setEnabled(newState)
				toggleBtn.setText(newState ? "Toggle ↓" : "Toggle ↑")
			},
		})
		appctl.registerNode("btn-toggle", toggleBtn)

		const btnGrid = createGridContainer(this, {
			columns: 2,
			cellWidth: 150,
			cellHeight: 60,
			spacingX: 10,
			spacingY: 12,
		})
		btnGrid.addItems([normalBtn, styledBtn, disabledBtn, toggleBtn])
		btnGrid.layout()
		const gridW = btnGrid.getContentWidth()
		btnGrid.setPosition(-gridW / 2, -95)
		panel.add(btnGrid)

		normalBtn.add(
			createDebugBadge(this, {
				text: "NEW",
				bgColor: "#cc3333",
				position: { x: 55, y: -20 },
			}),
		)
		page1.add(panel)

		// ── Page 2: Switch + Progress ──
		const page2 = this.add.container(width / 2, contentY)
		const centerPanel = createDebugPanel(this, {
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			cornerRadius: 12,
			position: { x: 0, y: 0 },
		})
		appctl.registerNode("center-panel", centerPanel)

		const centerTitle = createDebugLabel(this, {
			text: "Controls",
			fontSize: 20,
			isBold: true,
			position: { x: 0, y: PANEL_TITLE_Y },
		})
		centerPanel.add(centerTitle)

		const qualitySwitch = createDebugSwitchButton(this, {
			options: [
				{ key: "low", value: "Low Quality" },
				{ key: "medium", value: "Medium Quality" },
				{ key: "high", value: "High Quality" },
				{ key: "ultra", value: "Ultra Quality" },
			],
			size: { width: 280, height: 44 },
			bgColor: "#333333",
			textColor: "#ffffff",
			arrowColor: "#ffffff",
			position: { x: 0, y: -95 },
		})
		qualitySwitch.onOptionChanged((opt, idx) => {
			console.log(`Quality → ${opt.key} (index ${idx})`)
		})
		centerPanel.add(qualitySwitch)
		appctl.registerNode("switch-quality", qualitySwitch)

		const themeSwitch = createDebugSwitchButton(this, {
			options: [
				{ key: "dark", value: "Dark Theme" },
				{ key: "light", value: "Light Theme" },
				{ key: "solarized", value: "Solarized" },
			],
			size: { width: 280, height: 44 },
			bgColor: "#1a1a2e",
			textColor: "#e0e0e0",
			arrowColor: "#7070ff",
			strokeColor: "#3030aa",
			strokeThickness: 2,
			position: { x: 0, y: -40 },
		})
		centerPanel.add(themeSwitch)
		appctl.registerNode("switch-theme", themeSwitch)

		const disabledSwitch = createDebugSwitchButton(this, {
			options: [
				{ key: "on", value: "Enabled" },
				{ key: "off", value: "Disabled" },
			],
			size: { width: 280, height: 44 },
			bgColor: "#333333",
			textColor: "#ffffff",
			arrowColor: "#ffffff",
			enabled: false,
			position: { x: 0, y: 15 },
		})
		centerPanel.add(disabledSwitch)
		appctl.registerNode("switch-disabled", disabledSwitch)

		const progressLabel = createDebugLabel(this, {
			text: "Progress Bars",
			fontSize: 16,
			color: "#999999",
			position: { x: 0, y: 72 },
		})
		centerPanel.add(progressLabel)

		this._progressBar = createDebugProgressBar(this, {
			width: 280,
			height: 12,
			fillColor: "#4caf50",
			position: { x: 0, y: 100 },
			value: 0.0,
		})
		centerPanel.add(this._progressBar)
		appctl.registerNode("progress-animated", this._progressBar)

		const halfBar = createDebugProgressBar(this, {
			width: 280,
			height: 8,
			fillColor: "#2196f3",
			trackColor: "#1a1a3a",
			value: 0.5,
			position: { x: 0, y: 126 },
		})
		centerPanel.add(halfBar)
		appctl.registerNode("progress-half", halfBar)

		const fullBar = createDebugProgressBar(this, {
			width: 280,
			height: 8,
			fillColor: "#ff9800",
			value: 1.0,
			position: { x: 0, y: 146 },
		})
		centerPanel.add(fullBar)
		appctl.registerNode("progress-full", fullBar)
		page2.add(centerPanel)

		// ── Page 3: Labels & Layout ──
		const page3 = this.add.container(width / 2, contentY)
		const rightPanel = createDebugPanel(this, {
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			cornerRadius: 12,
			position: { x: 0, y: 0 },
		})
		appctl.registerNode("right-panel", rightPanel)

		const rightTitle = createDebugLabel(this, {
			text: "Labels & Layout",
			fontSize: 20,
			isBold: true,
			position: { x: 0, y: PANEL_TITLE_Y },
		})
		rightPanel.add(rightTitle)

		const labelsColumn = createColumnContainer(this, { spacingY: 8 })
		const labels = [
			createDebugLabel(this, { text: "Default Label", fontSize: 16 }),
			createDebugLabel(this, { text: "Bold Label", fontSize: 16, isBold: true }),
			createDebugLabel(this, { text: "Italic Label", fontSize: 16, isItalic: true }),
			createDebugLabel(this, {
				text: "Colored Label",
				fontSize: 16,
				color: "#ff6b6b",
				isBold: true,
			}),
			createDebugLabel(this, {
				text: "Small Label",
				fontSize: 12,
				color: "#888888",
			}),
		]
		labelsColumn.addItems(labels)
		labelsColumn.layout()
		labelsColumn.setPosition(0, -98)
		rightPanel.add(labelsColumn)

		const badgesLabel = createDebugLabel(this, {
			text: "Badges",
			fontSize: 16,
			color: "#999999",
			position: { x: 0, y: 14 },
		})
		rightPanel.add(badgesLabel)

		const badgeRow = createRowContainer(this, { spacingX: 10 })
		const badges = [
			createDebugBadge(this, { text: "NEW", bgColor: "#cc3333" }),
			createDebugBadge(this, { text: "WIP", bgColor: "#cc8800" }),
			createDebugBadge(this, { text: "OK", bgColor: "#33aa33" }),
			createDebugBadge(this, { text: "v1.2", bgColor: "#3366cc" }),
			createDebugBadge(this, { text: "x5", bgColor: "#8833cc" }),
		]
		badgeRow.addItems(badges)
		badgeRow.layout()
		const rowW = badgeRow.getContentWidth()
		badgeRow.setPosition(-rowW / 2, 42)
		rightPanel.add(badgeRow)

		const rowLabel = createDebugLabel(this, {
			text: "Row Container",
			fontSize: 16,
			color: "#999999",
			position: { x: 0, y: 88 },
		})
		rightPanel.add(rowLabel)

		const demoRow = createRowContainer(this, { spacingX: 8 })
		for (let i = 0; i < 3; i++) {
			demoRow.addItem(
				createDebugButton(this, {
					text: `R${i + 1}`,
					width: 80,
					height: 36,
					fontSize: 14,
					onClick: () => console.log(`R${i + 1} clicked`),
				}),
			)
		}
		demoRow.layout()
		const demoRowW = demoRow.getContentWidth()
		demoRow.setPosition(-demoRowW / 2, 126)
		rightPanel.add(demoRow)
		page3.add(rightPanel)

		// ── Page 4: Scroll Container ──
		const page4 = this.add.container(width / 2, contentY)
		const scrollPanel = createDebugPanel(this, {
			width: PANEL_WIDTH,
			height: PANEL_HEIGHT,
			cornerRadius: 12,
			position: { x: 0, y: 0 },
			blockInputEvents: true,
		})
		appctl.registerNode("scroll-panel", scrollPanel)

		const scrollTitle = createDebugLabel(this, {
			text: "Scroll Container",
			fontSize: 20,
			isBold: true,
			position: { x: 0, y: PANEL_TITLE_Y },
		})
		scrollPanel.add(scrollTitle)

		const scrollHint = createDebugLabel(this, {
			text: "Mouse wheel over list or use controls",
			fontSize: 13,
			color: "#888888",
			position: { x: 0, y: -132 },
		})
		scrollPanel.add(scrollHint)

		const scrollView = createDebugScrollContainer(this, {
			width: 280,
			height: 210,
			position: { x: 0, y: -12 },
			bgColor: "#0a0a0a",
			strokeColor: "#3f3f3f",
			strokeThickness: 2,
			cornerRadius: 8,
			paddingLeft: 8,
			paddingRight: 12,
			paddingTop: 8,
			paddingBottom: 8,
			scrollbarEnabled: true,
			scrollbarWidth: 6,
			scrollbarColor: "#a3a3a3",
			scrollbarTrackColor: "#1f1f1f",
			wheelStep: 28,
		})
		appctl.registerNode("scroll-main", scrollView)
		scrollPanel.add(scrollView)

		const cx = 116 // center x for 216-wide items in 260-wide viewport
		let cursorY = 0
		const gap = 10
		const scrollItems: Phaser.GameObjects.GameObject[] = []

		// Section header
		const sectionHeader = createDebugLabel(this, {
			text: "Mixed Content",
			fontSize: 16,
			isBold: true,
			color: "#e0e0e0",
		})
		sectionHeader.setPosition(cx, cursorY + sectionHeader.displayHeight / 2)
		cursorY += sectionHeader.displayHeight + gap
		scrollItems.push(sectionHeader)

		// Standard buttons
		for (let i = 0; i < 4; i++) {
			const btn = createDebugButton(this, {
				text: `Action ${i + 1}`,
				width: 216,
				height: 34,
				fontSize: 14,
				onClick: () => console.log(`Scroll item clicked: ${i + 1}`),
			})
			btn.setPosition(cx, cursorY + 17)
			cursorY += 34 + gap
			scrollItems.push(btn)
			appctl.registerNode(`scroll-item-${i + 1}`, btn)
		}

		// Badges (individually positioned)
		const badgeData = [
			{ text: "Alpha", color: "#cc3333" },
			{ text: "Beta", color: "#cc8800" },
			{ text: "Stable", color: "#33aa33" },
		]
		let badgeX = 30
		for (const bd of badgeData) {
			const badge = createDebugBadge(this, { text: bd.text, bgColor: bd.color })
			badge.setPosition(badgeX + badge.displayWidth / 2, cursorY + badge.displayHeight / 2)
			badgeX += badge.displayWidth + 8
			scrollItems.push(badge)
		}
		cursorY += 24 + gap * 2

		// Subtitle
		const subtitle = createDebugLabel(this, {
			text: "Progress Indicators",
			fontSize: 14,
			color: "#888888",
		})
		subtitle.setPosition(cx, cursorY + subtitle.displayHeight / 2)
		cursorY += subtitle.displayHeight + gap
		scrollItems.push(subtitle)

		// Progress bars
		const scrollProgress1 = createDebugProgressBar(this, {
			width: 216,
			height: 10,
			fillColor: "#4caf50",
			value: 0.75,
		})
		scrollProgress1.setPosition(cx, cursorY + 5)
		cursorY += 10 + gap
		scrollItems.push(scrollProgress1)

		const scrollProgress2 = createDebugProgressBar(this, {
			width: 216,
			height: 10,
			fillColor: "#2196f3",
			value: 0.4,
		})
		scrollProgress2.setPosition(cx, cursorY + 5)
		cursorY += 10 + gap
		scrollItems.push(scrollProgress2)

		// Tall button
		const tallBtn = createDebugButton(this, {
			text: "Tall Button (64px)",
			width: 216,
			height: 64,
			fontSize: 16,
			onClick: () => console.log("Tall button clicked"),
		})
		tallBtn.setBgColor("#1a3a5c", "#2a5a8c").setTextColor("#66aaff", "#99ccff")
		tallBtn.setPosition(cx, cursorY + 32)
		cursorY += 64 + gap
		scrollItems.push(tallBtn)
		appctl.registerNode("scroll-item-tall", tallBtn)

		// More standard buttons
		for (let i = 5; i <= 12; i++) {
			const btn = createDebugButton(this, {
				text: `Item ${i}`,
				width: 216,
				height: 34,
				fontSize: 14,
				onClick: () => console.log(`Scroll item clicked: ${i}`),
			})
			btn.setPosition(cx, cursorY + 17)
			cursorY += 34 + gap
			scrollItems.push(btn)
			appctl.registerNode(`scroll-item-${i}`, btn)
		}

		// Footer label
		const footerLabel = createDebugLabel(this, {
			text: "— End of List —",
			fontSize: 12,
			color: "#555555",
		})
		footerLabel.setPosition(cx, cursorY + footerLabel.displayHeight / 2)
		scrollItems.push(footerLabel)

		scrollView.addItems(scrollItems)
		scrollView.layout()

		const controlsRow = createRowContainer(this, { spacingX: 12 })
		const toTopBtn = createDebugButton(this, {
			text: "Top",
			width: 90,
			height: 36,
			fontSize: 14,
			onClick: () => scrollView.scrollToTop(),
		})
		const downBtn = createDebugButton(this, {
			text: "+80",
			width: 90,
			height: 36,
			fontSize: 14,
			onClick: () => scrollView.scrollBy(80),
		})
		const toBottomBtn = createDebugButton(this, {
			text: "Bottom",
			width: 90,
			height: 36,
			fontSize: 14,
			onClick: () => scrollView.scrollToBottom(),
		})
		controlsRow.addItems([toTopBtn, downBtn, toBottomBtn])
		controlsRow.layout()
		const controlsW = controlsRow.getContentWidth()
		controlsRow.setPosition(-controlsW / 2, 132)
		scrollPanel.add(controlsRow)
		appctl.registerNode("scroll-top", toTopBtn)
		appctl.registerNode("scroll-down", downBtn)
		appctl.registerNode("scroll-bottom", toBottomBtn)

		page4.add(scrollPanel)

		// ── Page 5: Icons ──
		const page5 = this.add.container(width / 2, contentY)
		const ICON_PANEL_WIDTH = 1040
		const ICON_PANEL_HEIGHT = 900
		const ICON_TITLE_Y = -ICON_PANEL_HEIGHT / 2 + 56
		const iconPanel = createDebugPanel(this, {
			width: ICON_PANEL_WIDTH,
			height: ICON_PANEL_HEIGHT,
			cornerRadius: 12,
			position: { x: 0, y: 0 },
			blockInputEvents: true,
		})
		appctl.registerNode("icon-panel", iconPanel)

		const iconTitle = createDebugLabel(this, {
			text: "Text + Icon Combos",
			fontSize: 20,
			isBold: true,
			position: { x: 0, y: ICON_TITLE_Y },
		})
		iconPanel.add(iconTitle)

		const buttonsLabel = createDebugLabel(this, {
			text: "Buttons",
			fontSize: 14,
			color: "#999999",
			position: { x: 0, y: ICON_TITLE_Y + 38 },
		})
		iconPanel.add(buttonsLabel)

		const iconBtnGrid = createGridContainer(this, {
			columns: 4,
			cellWidth: 240,
			cellHeight: 96,
			spacingX: 16,
			spacingY: 14,
		})

		const mkBtn = (cfg: { text: string; icon?: DebugImageIconOptions; enabled?: boolean }) =>
			createDebugButton(this, {
				text: cfg.text,
				icon: cfg.icon,
				width: 200,
				height: 64,
				fontSize: 18,
				enabled: cfg.enabled ?? true,
				onClick: (b) => console.log("[icons] clicked:", b.getLabel().text),
			})

		const btnText = mkBtn({ text: "Text" })
		const btnLeft = mkBtn({
			text: "Left",
			icon: { key: "icon-settings", side: "left", gap: 10 },
		})
		const btnRight = mkBtn({
			text: "Right",
			icon: { key: "icon-info", side: "right", gap: 10 },
		})
		const btnIconOnly = mkBtn({
			text: "",
			icon: { key: "icon-check", side: "left" },
		}).setButtonSize(86, 64)

		const btnTextDisabled = mkBtn({ text: "Text", enabled: false })
		const btnLeftDisabled = mkBtn({
			text: "Left",
			enabled: false,
			icon: { key: "icon-settings", side: "left", gap: 10 },
		})
		const btnRightDisabled = mkBtn({
			text: "Right",
			enabled: false,
			icon: { key: "icon-info", side: "right", gap: 10 },
		})
		const btnIconOnlyDisabled = mkBtn({
			text: "",
			enabled: false,
			icon: { key: "icon-x", side: "left" },
		}).setButtonSize(86, 64)

		const btnRound = createDebugButton(this, {
			text: "",
			width: 64,
			height: 64,
			cornerRadius: 32,
			icon: { key: "icon-settings" },
			onClick: () => console.log("[icons] round button clicked"),
		}).setTextColor("#ffffff", "#ffffff")

		const btnRoundDisabled = createDebugButton(this, {
			text: "",
			width: 64,
			height: 64,
			cornerRadius: 32,
			enabled: false,
			icon: { key: "icon-x" },
		}).setTextColor("#ffffff", "#ffffff")

		const btnRoundHoverTint = createDebugButton(this, {
			text: "",
			width: 64,
			height: 64,
			cornerRadius: 32,
			icon: { key: "icon-info", hoverTint: "#4ade80" },
			onClick: () => console.log("[icons] round hoverTint clicked"),
		}).setTextColor("#ffffff", "#ffffff")

		const btnRoundAlt = createDebugButton(this, {
			text: "",
			width: 64,
			height: 64,
			cornerRadius: 32,
			icon: { key: "icon-check" },
			onClick: () => console.log("[icons] round alt clicked"),
		}).setTextColor("#ffffff", "#ffffff")

		iconBtnGrid.addItems([
			btnText,
			btnLeft,
			btnRight,
			btnIconOnly,
			btnTextDisabled,
			btnLeftDisabled,
			btnRightDisabled,
			btnIconOnlyDisabled,
			btnRound,
			btnRoundDisabled,
			btnRoundHoverTint,
			btnRoundAlt,
		])
		iconBtnGrid.layout()
		const iconBtnGridW = iconBtnGrid.getContentWidth()
		iconBtnGrid.setPosition(-iconBtnGridW / 2, ICON_TITLE_Y + 110)
		iconPanel.add(iconBtnGrid)

		const iconBadgesLabel = createDebugLabel(this, {
			text: "Badges",
			fontSize: 14,
			color: "#999999",
			position: { x: 0, y: ICON_TITLE_Y + 440 },
		})
		iconPanel.add(iconBadgesLabel)

		const badgeGrid = createGridContainer(this, {
			columns: 4,
			cellWidth: 240,
			cellHeight: 96,
			spacingX: 16,
			spacingY: 14,
		})

		const badgeText = createDebugBadge(this, {
			text: "Text",
			bgColor: "#333333",
			fontSize: 18,
			paddingX: 12,
			paddingY: 8,
			cornerRadius: 14,
		})
		const badgeLeft = createDebugBadge(this, {
			text: "Left",
			bgColor: "#333333",
			fontSize: 18,
			paddingX: 12,
			paddingY: 8,
			cornerRadius: 14,
			icon: { key: "icon-settings", side: "left", gap: 10 },
		})
		const badgeRight = createDebugBadge(this, {
			text: "Right",
			bgColor: "#333333",
			fontSize: 18,
			paddingX: 12,
			paddingY: 8,
			cornerRadius: 14,
			icon: { key: "icon-info", side: "right", gap: 10 },
		})
		const badgeIconOnly = createDebugBadge(this, {
			text: "",
			bgColor: "#333333",
			paddingX: 12,
			paddingY: 8,
			cornerRadius: 14,
			icon: { key: "icon-triangle-alert", side: "left" },
		})

		const badgeRound = createDebugBadge(this, {
			text: "",
			bgColor: "#333333",
			height: 50,
			minWidth: 50,
			paddingX: 9,
			paddingY: 8,
			cornerRadius: 30,
			icon: { key: "icon-settings" },
		})

		const badgeRoundTint = createDebugBadge(this, {
			text: "",
			bgColor: "#333333",
			height: 50,
			minWidth: 50,
			paddingX: 9,
			paddingY: 8,
			cornerRadius: 30,
			icon: { key: "icon-info", tint: "#4ade80" },
		})

		const badgePill = createDebugBadge(this, {
			text: "Pill",
			bgColor: "#333333",
			fontSize: 18,
			paddingX: 14,
			paddingY: 8,
			cornerRadius: 999,
			icon: { key: "icon-check", side: "left", gap: 10 },
		})

		const badgePillRight = createDebugBadge(this, {
			text: "Pill",
			bgColor: "#333333",
			fontSize: 18,
			paddingX: 14,
			paddingY: 8,
			cornerRadius: 999,
			icon: { key: "icon-x", side: "right", gap: 10 },
		})

		badgeGrid.addItems([badgeText, badgeLeft, badgeRight, badgeIconOnly, badgeRound, badgeRoundTint, badgePill, badgePillRight])
		badgeGrid.layout()
		const badgeGridW = badgeGrid.getContentWidth()
		badgeGrid.setPosition(-badgeGridW / 2, ICON_TITLE_Y + 490)
		iconPanel.add(badgeGrid)

		page5.add(iconPanel)

		this._pages = [page1, page2, page3, page4, page5]
		const startPage = Math.min(
			Math.max(0, (globalThis as any).__PLAYGROUND_START_PAGE ?? 0),
			this._pages.length - 1,
		)
		this._currentPage = startPage
		this._showPage(startPage)

		// ── Paginator (bottom center) ──
		const paginatorY = height - PAGINATOR_Y_OFFSET
		const prevBtn = createDebugButton(this, {
			text: "←",
			width: 80,
			height: 48,
			fontSize: 24,
			position: { x: width / 2 - 100, y: paginatorY },
			onClick: () => this._goToPage(this._currentPage - 1),
		})
		appctl.registerNode("paginator-prev", prevBtn)

		this._pageLabel = this.add.text(width / 2, paginatorY, `${this._currentPage + 1} / ${this._pages.length}`, {
			fontFamily: "Verdana",
			fontSize: 18,
			color: "#a3a3a3",
		})
		this._pageLabel.setOrigin(0.5)

		const nextBtn = createDebugButton(this, {
			text: "→",
			width: 80,
			height: 48,
			fontSize: 24,
			position: { x: width / 2 + 100, y: paginatorY },
			onClick: () => this._goToPage(this._currentPage + 1),
		})
		appctl.registerNode("paginator-next", nextBtn)

		// Arrow keys to switch pages
		const leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
		const rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
		leftKey.on("down", () => this._goToPage(this._currentPage - 1))
		rightKey.on("down", () => this._goToPage(this._currentPage + 1))

		// ── Bottom info ──
		createDebugLabel(this, {
			text: "window.appctl is available — open the console to interact",
			fontSize: 14,
			color: "#666666",
			position: { x: width / 2, y: height - 40 },
		})

		console.log("[playground] AppController installed on window.appctl")
		console.log("[playground] Registered test IDs:", appctl.getRegisteredTestIds())
	}

	private _goToPage(index: number): void {
		const maxPage = this._pages.length - 1
		if (index < 0 || index > maxPage) return
		this._currentPage = index
		this._showPage(index)
		this._pageLabel.setText(`${index + 1} / ${this._pages.length}`)
	}

	private _showPage(index: number): void {
		for (let i = 0; i < this._pages.length; i++) {
			this._pages[i].setVisible(i === index)
		}
	}

	update(_time: number, delta: number): void {
		if (!this._progressBar) return

		let val = this._progressBar.getValue()
		val += this._progressDirection * (delta / 3000)

		if (val >= 1) {
			val = 1
			this._progressDirection = -1
		} else if (val <= 0) {
			val = 0
			this._progressDirection = 1
		}

		this._progressBar.setValue(val)
	}
}
