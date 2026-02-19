# phaser-dev-ui — Agent Instructions

Pure-code debug UI primitives library for Phaser 3. Bun + TypeScript.

---

## General Rules

- **Runtime**: Bun for all tooling (`bun run`, `bun test`, `bunx`). No Node/npm/npx.
- **File size**: Keep files under ~500 LOC; split/refactor as needed.
- **No assets**: Everything renders via `Phaser.GameObjects.Graphics` + `Text`. No sprites, atlases, or image files.
- **Phaser as peer dep**: Phaser is a `peerDependency`, not bundled. All source files reference global `Phaser` namespace via `src/phaser-types.d.ts`.
- **Options objects**: 3+ arguments → use options object named `CreateDebugXxxOptions`.
- **Guard clauses**: Return early; reduce nesting.
- **Function ordering**: Caller before callee; helpers near their callsite.
- **Chainable API**: All setter methods return `this`. Factory functions return the component instance.
- **Factory + class**: Every primitive has both `createDebugXxx(scene, options)` factory function and `new DebugXxx(scene, options)` class constructor.
- **Scene parameter**: Factory functions take `Phaser.Scene` as first arg. The constructor calls `scene.add.existing(this)`.
- **Dark theme defaults**: Black backgrounds, `#a3a3a3` strokes/text, Verdana font. Match existing primitives.
- **Coordinate system**: Phaser's top-left origin, Y-down. All primitives use origin `(0.5, 0.5)`.
- **Git diff**: Always `git --no-pager diff` or `git diff | cat`.

---

## Build / Test

- **Typecheck**: `bun run typecheck` — runs `tsc --noEmit`.
- **Build**: `bun run build` — cleans `dist/`, runs `tsc`, emits ESM `.js` + `.d.ts` + source maps.
- **No lint/format configured yet** — add when needed.

---

## Git

- **Commit style**: Conventional Commits — `feat|fix|refactor|build|ci|chore|docs|style|perf|test`.
- **Branch**: `main` is the primary branch.

---

## Repo Tour

```
src/                     Library source (TypeScript)
  index.ts               Barrel re-exports
  types.ts               Shared types (Position, Size, HexColor, ClickHandler)
  utils.ts               Color parsing, text width estimation
  phaser-types.d.ts      Triple-slash reference for Phaser global types
  DebugPanel.ts           Rounded rect container with bg/stroke/shadow
  DebugLabel.ts           Text label with dark-theme defaults
  DebugButton.ts          Interactive button with normal/hover/disabled states
  DebugBadge.ts           Compact auto-sizing text badge
  DebugProgressBar.ts     Horizontal 0–1 progress bar
  DebugSwitchButton.ts    Cycling option selector with arrow navigation
  DebugScrollContainer.ts Masked vertical scroll viewport + optional scrollbar
  DebugRowContainer.ts    Horizontal layout container
  DebugColumnContainer.ts Vertical layout container
  DebugGridContainer.ts   Grid layout container

scripts/
  build.ts               Build script (rm dist + tsc)

playground/              Dev playground (not in dist)
docs/
  playground-argus.md    Debugging/inspecting the playground with Argus CLI

dist/                    Build output (git-ignored)
```

---

## AppController (Playground)

`playground/AppController.ts` — E2E/debug helper, playground-only (not in dist).

- **Setup**: `createAppController(game)` installs on `window.appctl`.
- **Test IDs**: `registerNode(testId, go)` to register nodes. Query scene graph, canvas bounds, snapshots, perf stats, screenshots.
- **Automation**: `advanceFrames`, `emitClick`, `emitKeyDown` for E2E-style flows.

---

## Playground Debugging (Argus)

Use the Argus CLI to inspect, screenshot, and automate the playground via CDP. Full guide: [`docs/playground-argus.md`](docs/playground-argus.md).

```bash
bun run playground                                    # start dev server (prints port)
argus start --id pg --url localhost:<port>             # launch Chrome + watcher (background)
argus eval-until pg "document.querySelector('canvas')" --total-timeout 10s
argus eval pg "window.appctl.getScene('PlaygroundScene')._goToPage(3)"
argus screenshot pg --out shot.png
argus logs pg --levels error,warning
```

- `window.appctl` exposes `getNodeById`, `getSnapshot`, `emitKeyDown`, `emitClick`, `getPerfStats`, etc.
- All registered primitives have test IDs — list with `window.appctl.getRegisteredTestIds()`.
- Use `--no-page-indicator` flag for clean screenshots.

---

## Contracts / Invariants

- **Phaser version**: Peer dep 3.88.2.
- **ESM only**: Package type is `"module"`. No CJS output.
- **No runtime deps**: Zero dependencies beyond Phaser peer.
- **All primitives extend Phaser game objects**: `DebugPanel`/`DebugButton`/`DebugBadge`/`DebugSwitchButton`/`DebugScrollContainer`/containers extend `Container`; `DebugLabel` extends `Text`; `DebugProgressBar` extends `Container`.
- **Color format**: All color params accept hex strings (`"#rrggbb"` or `"#rrggbbaa"`). Internal parsing via `hexToColorAlpha()`.
- **Layout containers require `.layout()` call**: After adding items, call `.layout()` to reposition children.

---

## Publishing

Package: `@vforsh/phaser-dev-ui` on npm. `prepublishOnly` runs `bun run build` automatically.

```bash
npm publish --access public --//registry.npmjs.org/:_authToken=$NPM_TOKEN
```

Bump `version` in `package.json` before publishing a new release.

---

## Adding a New Primitive

1. Create `src/DebugXxx.ts` with class extending appropriate Phaser game object.
2. Export both `class DebugXxx` and `function createDebugXxx(scene, options)`.
3. Define `CreateDebugXxxOptions` interface with JSDoc on each field.
4. Add re-exports to `src/index.ts`.
5. Add entry to docs and repo tour above.
6. Add one or more usage examples for the new primitive in `playground/PlaygroundScene.ts`.
7. Run `bun run build` to verify.
