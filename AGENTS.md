# Agent Guidelines for Pura

Read this first — it is meant to be enough context to work on Pura without re-exploring the repo.

## Project Overview

Pura is a client-side image editor in vanilla JavaScript (ES modules, no build step), deployed as static
files to GitHub Pages (`https://puraeditor.com/`, workflow `.github/workflows/pages.yml`, triggers on
push to `main`). Everything runs in the browser; nothing is uploaded.

```
index.html      UI markup: SVG icon sprite (<symbol id="i-*">), top bar, tab bar, options bar,
                tool rail, canvas area, inspector (right sidebar), status bar, all modals
styles.css      Dark theme built on CSS custom properties (see "Design system")
app.js          Entry point: workspaces, rendering glue, layers panel, tools, pointer/keyboard input,
                zoom/pan, clipboard, file drop, image ops, all event wiring
js/
  constants.js  Image library import (+ MIN_LAYER_DURATION, MULTI_FRAME_FORMATS, OPENABLE_EXTENSIONS)
  state.js      globalState (workspaces map), createWorkspaceState(), SHARED_TOOL_SETTINGS
  layers.js     Layer objects, compositing (offset/opacity/blend), duplicate/move/merge/flatten,
                pickLayerAt, thumbnails, createCanvas/cloneCanvas helpers, BLEND_MODES
  drawing.js    Tools: brush/eraser (snapshot-based strokes), fill (typed-array flood fill),
                gradient, rect/ellipse/line, text, eyedropper, pointer (pick layer), move
                (layer or floating selection), rect/lasso selection; startDrawing/draw/stopDrawing
  selection.js  Selection model, clipToSelection(), getSelectionCanvas(), marching ants
  effects.js    EFFECTS (slider effects) / INSTANT_EFFECTS tables, live-preview effect session,
                layer transforms, whole-image ops (crop, canvas resize w/ anchor, scale, rotate, flip)
  file-io.js    Open (multi-frame aware), import as layers, encode/save, FORMATS table
  history.js    Undo/redo snapshots (max 50)
  metadata.js   Metadata helpers + property-grid editor in the inspector
  ui.js         Modals, toasts, sidebar/panel collapse persistence, undo/redo button state
```

## Architecture

### Workspaces
- `globalState.workspaces` maps id → workspace state; `'start'` is the welcome tab (no layers, can't close).
- **Each workspace owns its own display canvas** (`state.canvas`, class `.main-canvas`) plus two
  overlay canvases: `previewCanvas` (tool previews) and `selectionCanvas` (marching ants).
  `switchWorkspace()` swaps these elements in `#canvasWrapper`. Overlays are resized by `syncOverlaySize()`.
- `app.js` keeps a module-level `state` pointing at the active workspace. Guard actions with `hasWorkspace()`.
- Tool settings listed in `SHARED_TOOL_SETTINGS` are copied to the new workspace on tab switch.
- `state.dirty` drives the "•" tab marker, close confirmation and the `beforeunload` warning.

### Layers
- Layer: `{ id, name, canvas, ctx, visible, opacity, blendMode, isBackground, duration, offsetX, offsetY }`.
- A layer canvas may be a different size from the image and positioned via `offsetX/offsetY`
  (imports, pastes, rotated layers). Convert workspace → layer coords by subtracting the offset.
- `state.layers[0]` is the bottom. The panel uses `flex-direction: column-reverse` so the top layer shows first.
- `composeLayers()` draws only the true image onto the display canvas — never draw overlays there.
  Export and eyedropper read from it / `getFlattenedCanvas()`.
- Layer bounds outline is a CSS div (`#layerBounds`), shown only when the layer doesn't match the canvas.

### Selections
- `state.selection = { x, y, width, height, imageData }` in **active-layer coordinates**;
  `selectionType` is `'rect'` or `'freeform'` (`selectionPath` holds the polygon).
- Painting tools, fill, gradient, text and effects are clipped to the selection via
  `Selection.clipToSelection(ctx, state)` inside `ctx.save()/restore()`.
- Move tool with a selection lifts pixels into `state.floating`, previews on the overlay, drops on release.

### Rendering, zoom, input
- Zoom sets the CSS width/height of the three canvases (not a transform), so the container scrolls.
  `.canvas-wrapper { margin: auto }` centres small images. `zoomTo(z, clientX, clientY)` keeps the
  point under the cursor fixed. `.pixelated` is applied at ≥200%.
- Pointer events are bound on `#canvasWrapper` with pointer capture (strokes continue outside the canvas).
  Space+drag / middle-drag pans; Ctrl+wheel zooms.
- Touch: capture-phase listeners on `#canvasContainer` (`onTouchDown/Move/Up`) own multi-touch. A one-finger
  stroke starts after `TOUCH_START_DELAY` or `TOUCH_SLOP` px of movement, so a second finger turns it into a
  pinch-zoom/pan (`Drawing.cancelDrawing()` reverts a stroke already begun). Two-finger tap = undo; one finger
  on the backdrop pans. The container has `touch-action: none` while a workspace is open.
- Responsive: `@media (hover: none) and (pointer: coarse)` enlarges hit targets and toggles `.mouse-only` /
  `.touch-only`; `@media (max-width: 760px)` moves the tool rail to the bottom, turns the inspector into a
  bottom sheet (closed by default, state not persisted — see `UI.compactLayout`) and modals into bottom sheets.
- Keyboard: `onKeyDown` in app.js. It ignores typing targets (`isTypingTarget`). When a modal is open,
  Esc cancels and Enter clicks the first button in `.modal-buttons` (the primary action).

### History
- Call `saveState()` (app.js wrapper) after every user action that changes pixels or layer properties,
  and only then (no history for clicks that change nothing). It also refreshes thumbnails/dirty state.
- `undo()/redo()` restore snapshots and clear the selection; then `refresh()` rebuilds UI.

### Effects
- Add a slider effect by adding an entry to `EFFECTS` in `js/effects.js`
  (`{ label, unit?, min, max, value, apply(image, v) }` for @cross/image methods, or
  `raw(data, w, h, v)` for direct RGBA manipulation). Buttons are generated automatically.
- One-click effects go in `INSTANT_EFFECTS`. Effects respect the selection via `writeResult()`.
- The effect dialog (`.modal.floating`) has no backdrop so the live preview is visible; Cancel restores
  the original pixels.

### Files
- `openFiles()` tries `Image.readFrames()` (GIF/APNG/multi-page TIFF → one layer per frame, using
  `frameMetadata.left/top/delay`) and falls back to `Image.read()`.
- `encodeImage()` exports the flattened image, or one frame per visible layer for GIF/APNG/TIFF.
- Add an export format by extending `FORMATS` in `file-io.js` and the `#saveFormat` select.
- AVIF/HEIC encoding depends on the browser's canvas encoder; unsupported ones are disabled at startup.

## Dependencies

- **cross-image 0.5.1** (npm; same code as `@cross/image` on JSR), loaded in `js/constants.js` from
  `https://cdn.jsdelivr.net/npm/cross-image@0.5.1/esm/mod.js`. Trust CDN availability — no vendored fallback.
- Nothing else. Do not add frameworks, build tools, utility libraries, CSS frameworks, TypeScript,
  preprocessors or linting configs. Do not vendor dependencies.

## Design system

- Tokens live in `:root` in `styles.css` (`--bg-0..4`, `--border`, `--text`, `--text-2/3`, `--accent`,
  `--accent-grad`, radii, `--shadow`). Use tokens instead of raw colours.
- Brand: violet → blue gradient (`--accent-grad`, matches `img/pura.png`), near-black neutral surfaces.
- Icons: inline SVG sprite at the top of `<body>`; use `<svg class="icon"><use href="#i-name"/></svg>`.
  Draw new icons on a 24×24 grid with stroke `currentColor` (no emoji in the UI).
- Layout: top bar (file/edit/zoom pill) → tab bar → contextual options bar (`.tool-options-group[data-for="tool …"]`,
  shown by `setTool()`) → tool rail | canvas | inspector panels (`.panel-section`, collapsible, persisted in
  localStorage) → status bar.
- Button classes: `.icon-btn` (top bar), `.rail-btn` (tools), `.mini-btn` (small icon actions),
  `.chip-btn` (pill buttons), `.tool-btn` (labelled inspector buttons). Primary modal action = first button.

## Adding things (checklists)

- **Tool**: `.rail-btn[data-tool]` in index.html (title with shortcut) → optional options group with
  `data-for` → `TOOL_KEYS`/hint in app.js `setTool` → behaviour in `drawing.js` start/draw/stop
  (use layer coords, clip to selection, set `changed = true` so history is saved).
- **Layer/image operation**: implement in `layers.js` or `effects.js`, call through `layerAction()`
  or `imageOp()` in app.js (these refresh UI and save history).
- **Shortcut**: add to `onKeyDown` and to the `#shortcutsModal` list in index.html.

## Testing

No test infrastructure is committed; test manually in a browser (`python3 -m http.server 8000`).
For automated checks, Playwright works well: when the CDN isn't reachable, `npm pack cross-image@0.5.1`
and intercept `https://cdn.jsdelivr.net/npm/cross-image@0.5.1/esm/**` to serve files from `package/esm/`. Verify: drawing tools, selections + clipping, layers (reorder/merge/blend),
undo/redo, effects preview/cancel, open/save in several formats incl. animated GIF round-trip.

Target browsers: current Chrome, Edge, Firefox, Safari (ES modules, pointer events, `:has()`).
