# Agent Guidelines for Pura

## Project Overview

Pura is a client-side image editor built with vanilla JavaScript. It runs entirely in the browser with no build process.

## Architecture Principles

### Keep It Simple
- **No frameworks**: Pure vanilla JavaScript only
- **No build process**: Direct browser execution via ES6 modules
- **No bundling**: CDN dependencies loaded directly

### Core Components
- `index.html` - Application structure and UI layout
- `styles.css` - Dark theme styling
- `app.js` - Main application entry point (1091 lines, reduced from 1764 via modularization)
- `js/` - Modular JavaScript files:
  - `constants.js` - Shared constants and imports (Image library, multi-frame formats)
  - `state.js` - State management and workspace handling
  - `layers.js` - Layer operations and management
  - `drawing.js` - Drawing tools and canvas operations (brush, eraser, shapes, move)
  - `file-io.js` - File import/export operations (open, save, import layer, multi-frame support)
  - `effects.js` - Image effects and transforms (resize, rotate, flip, grayscale, invert, blur, brightness, contrast)
  - `history.js` - Undo/redo functionality
  - `ui.js` - UI updates and event handling

### State Management
Single global `globalState` object in `app.js` containing:
- Workspaces map (each workspace ID -> workspace state)
- Active workspace ID
- Next workspace ID counter

Each workspace state contains:
- Canvas and context references
- Layer array with off-screen canvases
- Active tool and drawing parameters
- History stack for undo/redo
- Metadata object (title, author, description, copyright)

### Layer Architecture
- Each layer is an off-screen `<canvas>` element
- Layers compose onto main canvas on-demand
- Bottom-to-top rendering order
- Each layer has a duration property (milliseconds) for animation export

### Module Architecture
The application uses ES6 modules for code organization:
- **No build process**: Modules load directly in the browser via `type="module"`
- **Clean separation**: Each module has a focused responsibility
- **Import/export**: Standard ES6 import/export syntax
- **Shared state**: The `state` object is imported where needed
- **Entry point**: `app.js` initializes and coordinates all modules
- **Completed modularization**: All major features have been extracted into focused modules, reducing app.js from 1764 to 1091 lines (38% reduction)

Module dependencies flow:
```
app.js (main - 1091 lines)
  ├── js/constants.js (8 lines - shared constants)
  ├── js/state.js (65 lines - core state, no dependencies)
  ├── js/layers.js (104 lines - depends on state)
  ├── js/drawing.js (179 lines - drawing tools)
  ├── js/file-io.js (340 lines - file operations)
  ├── js/effects.js (240 lines - effects and transforms)
  ├── js/history.js (93 lines - depends on state, layers)
  └── js/ui.js (79 lines - UI helpers)
```

## Code Style

### JavaScript
- ES6+ syntax (modules, async/await, arrow functions)
- Functional approach where possible
- Clear, descriptive function names
- Minimal comments (code should be self-documenting)

### Canvas Operations
- Always use `{ willReadFrequently: true }` context option
- Compose layers via `globalAlpha` for opacity
- Clear and redraw on each operation

### Event Handling
- Use event delegation where appropriate
- Mouse events for drawing: `mousedown`, `mousemove`, `mouseup`, `mouseleave`
- Keyboard shortcuts via `keydown` with modifier checks

## Dependencies

### External Libraries
- **cross-image@0.4.0**: Image processing (resize, format conversion)
  - Load from: `https://cdn.jsdelivr.net/npm/cross-image@0.4.0/esm/mod.js`
  - Trust CDN availability - no vendor fallbacks
  - Use for: resize operations, image I/O (PNG/JPEG/WebP/GIF/APNG/TIFF/BMP)
  - Supports multi-frame images (animated GIF, APNG, multi-page TIFF)

### No Additional Dependencies
Do not add:
- UI frameworks (React, Vue, etc.)
- Build tools (webpack, vite, etc.)
- Utility libraries (lodash, jQuery, etc.)
- CSS frameworks (Bootstrap, Tailwind, etc.)

## Feature Development

### Adding Drawing Tools
1. Add button to tools panel in `index.html`
2. Update tool selection in event listeners
3. Implement in `startDrawing`, `draw`, and `stopDrawing` functions
4. Use active layer canvas, then call `composeLayers()`

### Adding Effects
1. Add button to effects panel
2. Create effect function that operates on `ImageData`
3. Apply to active layer via `layer.ctx.putImageData()`
4. Call `composeLayers()` and `saveState()`

### Adding Transforms
1. Add button to transforms panel
2. Create temporary canvas for transformation
3. Apply transform, update layer canvas
4. Call `composeLayers()` and `saveState()`

## History Management

- Always call `saveState()` after user actions
- Limit: 50 history entries (configurable via `state.maxHistory`)
- Store complete layer snapshots (canvas copies)
- Update UI buttons on history changes

## UI Guidelines

### Dark Theme
- Background: `#1e1e1e`, `#252525`, `#2d2d2d`
- Text: `#e0e0e0`, `#b0b0b0`, `#a0a0a0`
- Accent: `#0066cc` (active states)
- Maintain existing color palette

### Layout
- Three-column: tools (left), canvas (center), layers/effects (right)
- Top toolbar for file operations and undo/redo
- Tab bar for workspace management (below toolbar)
- Modals for dialogs (new image, resize, effects with sliders, save options, metadata)
- Collapsible sidebars with toggle buttons (state persisted in localStorage)

### Workspace System
- Multiple independent workspaces with tabs
- Start tab: welcome screen, cannot be closed, no canvas/layers
- Workspace tabs: created via New/Open, closeable, independent state
- Each workspace has: canvas, layers, history, metadata, tools state
- Import Layer: adds images to current workspace without changing dimensions

## Testing

### Manual Testing Required
- Test in modern browsers (Chrome, Firefox, Safari, Edge)
- Verify drawing tools work on canvas
- Check layer composition and visibility
- Test effects on individual layers
- Verify undo/redo functionality
- Test file open/save operations

### No Automated Tests
The project has no test infrastructure. Manual testing only.

## Deployment

### GitHub Pages
- Automatic deployment via `.github/workflows/pages.yml`
- Triggers on push to `main` branch
- No build step - deploys static files as-is
- URL: `https://puraeditor.com/`

### Local Development
```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

## File Operations

### Opening Images
1. User selects file via `<input type="file">`
2. Read as `ArrayBuffer`, convert to `Uint8Array`
3. Use `cross-image` to parse format
4. For multi-frame images (GIF, APNG, TIFF), load each frame as a separate layer
5. For single-frame images, create new layer with image data
6. Adjust canvas size if needed

### Saving Images
1. User opens save dialog with format selection
2. Formats supported: PNG, JPEG, WebP, GIF, APNG, TIFF, BMP
3. Quality slider available for JPEG and WebP (0-100)
4. Multi-frame export option for GIF, APNG, and TIFF
5. Get `ImageData` from composed main canvas or individual layers
6. Create `cross-image` instance with `Image.fromRGBA()`
7. For animations, use layer durations (default: 100ms)
8. Save with selected format using `image.save(format, options)`
9. Create blob and trigger download

### Multi-Frame Support
- **Opening**: Multi-frame TIFF, GIF, and APNG files are automatically detected and loaded as separate layers
- **Saving**: Enable "Export as animation/multi-page" checkbox in save dialog
  - GIF/APNG: Uses layer durations for frame timing
  - TIFF: Saves layers as multi-page document
  - Only visible layers are included in export

## Common Patterns

### Workspace Management
```javascript
// Create a new workspace
const workspaceId = createWorkspace('Workspace Name', 800, 600, '#FFFFFF');

// Switch to a workspace
switchWorkspace(workspaceId);

// Close a workspace (except start tab)
closeWorkspace(workspaceId);

// Get current workspace state
const currentState = getState(); // or use global 'state' variable

// Update tab bar after changes
updateTabBar();
```

### Import Layer Pattern
```javascript
// Import image as layer (doesn't change canvas dimensions)
async function handleImportLayer(e) {
    const file = e.target.files[0];
    const image = await Image.read(uint8Array);
    
    // For single-frame: create one layer
    const layer = createLayer(file.name);
    // Draw image onto layer (clipped if larger than canvas)
    layer.ctx.drawImage(tempCanvas, 0, 0);
    
    // For multi-frame: create multiple layers
    for (const frame of image.frames) {
        const layer = createLayer(`${file.name} - Frame ${i + 1}`);
        layer.duration = frame.duration;
        layer.ctx.drawImage(frameCanvas, 0, 0);
    }
}
```

### Creating UI Elements
```javascript
const button = document.createElement('button');
button.className = 'tool-btn';
button.textContent = 'Tool Name';
button.addEventListener('click', handleClick);
```

### Layer Operations
```javascript
const layer = state.layers[state.activeLayerIndex];
const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
// Modify imageData.data...
layer.ctx.putImageData(imageData, 0, 0);
composeLayers();
saveState();
```

### Save Dialog Pattern
```javascript
// Show save dialog
function saveImage() {
    document.getElementById('saveModal').classList.add('active');
}

// Apply save with user's selections
async function applySaveImage() {
    const format = document.getElementById('saveFormat').value;
    const quality = parseInt(document.getElementById('saveQuality').value);
    const multiFrame = document.getElementById('saveMultiFrame').checked;
    // ... encode and download
}
```

### Metadata Management
```javascript
// Metadata stored in state.metadata object
state.metadata = {
    title: '',
    author: '',
    description: '',
    copyright: ''
};

// Applied to images during save
if (state.metadata.title) {
    image.metadata = { ...state.metadata };
}
```

### Collapsible Sidebars
```javascript
function toggleSidebar(sidebarId) {
    const sidebar = document.getElementById(sidebarId);
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(`${sidebarId}-collapsed`, sidebar.classList.contains('collapsed'));
}

// Restore on init
function restoreUIState() {
    const isCollapsed = localStorage.getItem('leftSidebar-collapsed') === 'true';
    if (isCollapsed) {
        document.getElementById('leftSidebar').classList.add('collapsed');
    }
}
```

### Modal Interactions
```javascript
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
```

## What NOT to Do

❌ Add build tools or compilation steps  
❌ Introduce frameworks or large libraries  
❌ Vendor dependencies locally  
❌ Add backend/server functionality  
❌ Use TypeScript or JSX  
❌ Add CSS preprocessors  
❌ Add linting configs (keep it simple)  

## Performance Considerations

- Use `composeLayers()` sparingly - only after changes
- Limit history snapshots to prevent memory issues
- Canvas operations are synchronous - keep them fast
- For large images, consider showing loading indicators

## Browser Compatibility

Target modern browsers with ES6 module support:
- Chrome/Edge 61+
- Firefox 60+
- Safari 11+

No polyfills or transpilation needed.
