# Debugging the Playground with Argus

Use the [Argus CLI](https://github.com/vforsh/argus) to inspect, screenshot, and automate the playground via Chrome DevTools Protocol (CDP).

---

## Quick Start

```bash
# 1. Start the playground dev server
bun run playground
# prints: Playground -> http://localhost:<port>

# 2. Launch Chrome + Argus watcher (background process)
argus start --id pg --url localhost:<port>

# 3. Verify connection
argus eval pg "document.title"
```

> `argus start` is a long-running process. When scripting, run it in the background.

---

## Wait for Phaser Boot

The Phaser game takes a moment to initialize. Wait for the canvas before interacting:

```bash
argus eval-until pg "document.querySelector('canvas')" --total-timeout 10s
```

---

## Page Navigation

The playground has 6 pages. Navigate via `_goToPage(index)` on the scene (0-indexed):

```bash
# Go to page 4 (Scroll Container)
argus eval pg "window.appctl.getScene('PlaygroundScene')._goToPage(3)"

# Go to page 1 (Buttons)
argus eval pg "window.appctl.getScene('PlaygroundScene')._goToPage(0)"
```

Pages:

| Index | Title              |
|-------|--------------------|
| 0     | Button Showcase    |
| 1     | Controls           |
| 2     | Labels & Layout    |
| 3     | Scroll Container   |
| 4     | Text + Icon Combos |
| 5     | Panel Styles       |

---

## Screenshots

```bash
# Full page
argus screenshot pg --out shot.png

# Hide the Argus page indicator for clean screenshots
argus start --id pg --url localhost:<port> --no-page-indicator
```

---

## Console Logs & Errors

```bash
# Check for errors
argus logs pg --levels error,warning

# Stream all logs
argus logs tail pg
```

---

## AppController (`window.appctl`)

The playground installs an `AppController` on `window.appctl`. All registered UI primitives have test IDs.

### List Registered Test IDs

```bash
argus eval pg "window.appctl.getRegisteredTestIds()"
```

### Get a Node by Test ID

```bash
argus eval pg "window.appctl.getNodeById('btn-normal')"
argus eval pg "window.appctl.getNodeInfoById('btn-normal')"
```

### Inspect Node Canvas Bounds

```bash
argus eval pg "JSON.stringify(window.appctl.getNodeCanvasBoundsById('btn-normal'))"
```

### Scene Graph

```bash
argus eval pg "JSON.stringify(window.appctl.getCurrentSceneGraph(), null, 2)"
```

### Snapshot (Visible Buttons & Labels)

```bash
argus eval pg "JSON.stringify(window.appctl.getSnapshot(), null, 2)"
```

### Performance Stats

```bash
argus eval pg "JSON.stringify(window.appctl.getPerfStats())"
```

---

## Scroll Container Interaction

```bash
# Scroll to bottom
argus eval pg "window.appctl.getNodeById('scroll-main').scrollToBottom()"

# Scroll to specific position
argus eval pg "window.appctl.getNodeById('scroll-main').setScrollY(200)"

# Read current scroll state
argus eval pg "
  const sv = window.appctl.getNodeById('scroll-main');
  JSON.stringify({ scrollY: sv.getScrollY(), max: sv.getMaxScrollY(), height: sv.getContentHeight() })
"
```

---

## Input Simulation

```bash
# Keyboard
argus eval pg "window.appctl.emitKeyDown('ArrowRight')"

# Click at canvas coordinates
argus eval pg "window.appctl.emitClick(540, 960)"
```

---

## Inspecting Internal State

Since Argus eval runs in the page context, you can access private fields directly for debugging:

```bash
# Scroll container internals
argus eval pg "
  const sv = window.appctl.getNodeById('scroll-main');
  JSON.stringify({
    scrollY: sv._scrollY,
    contentMinY: sv._contentMinY,
    contentHeight: sv._contentHeight,
    contentX: sv._content.x,
    contentY: sv._content.y,
  })
"

# Game config
argus eval pg "
  const g = window.appctl.game;
  JSON.stringify({ width: g.config.width, height: g.config.height, scaleMode: g.scale.scaleMode })
"
```

---

## Full Automation Example

Navigate to the scroll page, scroll through content, and capture screenshots at each position:

```bash
# Boot
argus start --id pg --url localhost:4242 --no-page-indicator  # background

# Wait for Phaser
argus eval-until pg "document.querySelector('canvas')" --total-timeout 10s

# Navigate to scroll page
argus eval pg "window.appctl.getScene('PlaygroundScene')._goToPage(3)"

# Screenshot at top
argus eval pg "window.appctl.getNodeById('scroll-main').scrollToTop()"
argus screenshot pg --out scroll-top.png

# Screenshot at middle
argus eval pg "window.appctl.getNodeById('scroll-main').setScrollY(200)"
argus screenshot pg --out scroll-mid.png

# Screenshot at bottom
argus eval pg "window.appctl.getNodeById('scroll-main').scrollToBottom()"
argus screenshot pg --out scroll-bottom.png

# Check no errors occurred
argus logs pg --levels error,warning
```
