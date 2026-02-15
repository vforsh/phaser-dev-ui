# phaser-dev-ui

Pure-code debug UI primitives for Phaser 3 games — panels, buttons, labels, badges, progress bars, switch buttons, scroll containers, and layout containers. No assets required.

## Install

```bash
bun install
```

Requires [Phaser](https://phaser.io) 3.88.2 as a peer dependency.

## Quick Start

```bash
bun run build      # Build dist/
bun run playground # Run the playground (dev server with hot reload)
bun run typecheck  # TypeScript check
```

## Overview

A set of utility functions and classes for creating developer/debug UIs entirely through code in Phaser 3 games — no sprites, atlases, or external assets required. Everything is rendered with `Phaser.GameObjects.Graphics` and `Phaser.GameObjects.Text`.

The system is designed with a fluent, chainable API and dark-theme defaults matching typical dev-tool aesthetics.

## Available Components

### `createDebugPanel`

- **Description**: The foundational container for any debug UI. A rounded rectangle with customizable background color, border, corner radius, and optional drop shadow.
- **Usage**: Use as the root element for popups, toolbars, or floating UI. Extends `Phaser.GameObjects.Container`, so you can add children directly.

### `createDebugLabel`

- **Description**: A simple text label. Extends `Phaser.GameObjects.Text` with dark-theme defaults (white text, Verdana font).
- **Usage**: Titles, descriptions, status text, or any textual information in your debug UI.

### `createDebugButton`

- **Description**: An interactive button with built-in styling for normal, hover, and disabled states. Customizable size, text, colors (background, text, outline), and corner radius.
- **Usage**: Use for any action that requires a click — confirming an action, closing a panel, triggering a debug function.
- **Enabled contract**: Set `enabled: false` during creation or call `.setEnabled(false)` later. Disabled buttons are dimmed, ignore hover highlight, and are non-interactable.

### `createDebugBadge`

- **Description**: A compact, display-only text badge with a rounded background. Optimized for short labels (e.g. "NEW", "WIP", "x2"). Auto-sizes to fit text content.
- **Usage**: Overlay on top of debug buttons or panels to show state markers, counters, or tags.

### `createDebugSwitchButton`

- **Description**: A cycling button that navigates through a list of key-value options with left/right arrow triangles. Emits an `option-changed` event.
- **Usage**: Settings with predefined states — quality levels, difficulty, toggling modes.
- **Enabled contract**: Supports `enabled` at creation and runtime `.setEnabled()`. When disabled, arrows are non-interactable and the whole control is visually dimmed.

### `createDebugProgressBar`

- **Description**: A horizontal progress bar displaying a normalized 0–1 value. Track + fill with rounded corners.
- **Usage**: Loading progress, health, capacity, or any real-time metric.

### `createDebugScrollContainer`

- **Description**: A masked vertical scroll viewport with wheel scrolling and optional visual scrollbar.
- **Usage**: Long debug forms/lists inside a fixed panel area. Add items with `addItem()`/`addItems()`, then call `.layout()` after child bounds change.

### Layout Containers

- **`createRowContainer`**: Arranges children horizontally with configurable spacing, padding, and direction.
- **`createColumnContainer`**: Arranges children vertically with configurable spacing, padding, and direction.
- **`createGridContainer`**: Arranges children in a grid with configurable columns, cell size, and spacing.
- **Usage**: Group related UI elements. After adding items via `addItem()` or `addItems()`, call `.layout()` to reposition children. Containers are invisible positioning helpers and can be nested.

## Example: Creating a Settings Popup

```typescript
import {
	createDebugPanel,
	createDebugLabel,
	createDebugButton,
	createDebugBadge,
	createDebugSwitchButton,
	createDebugProgressBar,
	createRowContainer,
} from '@vforsh/phaser-dev-ui'

// 1. Create the main panel
const panel = createDebugPanel(this, {
	width: 500,
	height: 350,
	cornerRadius: 15,
	position: { x: 400, y: 300 },
	blockInputEvents: true,
})

// 2. Add a title label
const titleLabel = createDebugLabel(this, {
	text: 'Settings',
	fontSize: 32,
	isBold: true,
	position: { x: 0, y: -120 },
})
panel.add(titleLabel)

// 3. Add a switch button for quality settings
const qualitySwitch = createDebugSwitchButton(this, {
	options: [
		{ key: 'low', value: 'Low Quality' },
		{ key: 'medium', value: 'Medium Quality' },
		{ key: 'high', value: 'High Quality' },
	],
	size: { width: 300, height: 50 },
	bgColor: '#333333',
	textColor: '#ffffff',
	arrowColor: '#ffffff',
	position: { x: 0, y: -20 },
})

qualitySwitch.onOptionChanged((option) => {
	console.log(`Quality changed to: ${option.key}`)
})

panel.add(qualitySwitch)

// 4. Add a progress bar
const loadBar = createDebugProgressBar(this, {
	width: 300,
	height: 12,
	fillColor: '#4caf50',
	position: { x: 0, y: 40 },
})
loadBar.setValue(0.7)
panel.add(loadBar)

// 5. Create action buttons
const cancelButton = createDebugButton(this, {
	text: 'Cancel',
	width: 140,
	height: 60,
	enabled: false,
	onClick: () => panel.destroy(),
})

const saveButton = createDebugButton(this, {
	text: 'Save',
	width: 140,
	height: 60,
	onClick: () => {
		console.log('Settings saved!')
		panel.destroy()
	},
})

// 6. Add a badge overlay
const badge = createDebugBadge(this, {
	text: 'WIP',
	position: { x: 60, y: -20 },
})
cancelButton.add(badge)

// 7. Use a Row Container for button layout
const buttonRow = createRowContainer(this, { spacingX: 20 })
buttonRow.addItems([cancelButton, saveButton])
buttonRow.layout()
buttonRow.setPosition(0, 120)
panel.add(buttonRow)

// 8. Toggle disabled state at runtime
cancelButton.setEnabled(true)
qualitySwitch.setEnabled(true)
```

### Breakdown

1. **Panel Creation**: `DebugPanel` extends `Phaser.GameObjects.Container`. Set `blockInputEvents: true` for modal popups to prevent clicks from passing through.
2. **Title Label**: `DebugLabel` extends `Phaser.GameObjects.Text`. Add it to the panel container with `panel.add()`. Position with the `position` option (relative to panel center).
3. **Switch Button**: Created with options array. Use `.onOptionChanged()` to listen for changes.
4. **Progress Bar**: Normalized 0–1 value. Call `.setValue()` to update.
5. **Action Buttons**: Created with `onClick` handler. `enabled: false` starts the button disabled.
6. **Badge Overlay**: `DebugBadge` added as a child of a button — auto-sizes to text.
7. **Row Container**: Call `.addItems()` then `.layout()` to arrange children horizontally. Position the container itself within the panel.

## Coordinate System

All primitives use Phaser's coordinate system:
- Origin (0, 0) is at the **top-left** of the game canvas
- **Y increases downward**
- All primitives default to origin `(0.5, 0.5)` — position refers to the center

When adding children to a `DebugPanel`, positions are relative to the panel's center (0, 0).

## Best Practices

- **Use Layout Containers**: For groups of two or more elements, use `createRowContainer`, `createColumnContainer`, or `createGridContainer`. Call `.layout()` after adding all items.
- **Chainable API**: Most methods return `this` — chain style calls: `createDebugButton(scene, {...}).setBgColor('#f00').setTextColor('#fff')`.
- **Disabled semantics**: Disabled controls are dimmed, ignore hover, and block interaction.
- **Scene parameter**: Every factory function takes a `Phaser.Scene` as the first argument. The created game object is auto-added to the scene.
- **Event Handling**: Use `onClick` option for buttons, `.onOptionChanged()` for switch buttons. Direct Phaser events via `.on()` also work.
- **Cleanup**: Call `.destroy()` on any primitive to remove it and all its children from the scene.
