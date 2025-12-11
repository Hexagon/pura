<div align="center">
  <img src="img/pura.png" alt="Pura Logo" height="50%">
</div>

# Pura - Image Editor

A powerful, client-side image editor built with vanilla JavaScript and the [cross-image](https://github.com/cross-org/image) library.

## Features

- **Layer Management**: Create, delete, reorder, and toggle visibility of multiple layers
- **Drawing Tools**: 
  - Brush and eraser with adjustable size and opacity
  - Shape tools (rectangle, circle, line)
  - Text tool (coming soon)
- **Transform Operations**:
  - Resize layers with cross-image integration
  - Rotate 90 degrees
  - Flip horizontal/vertical
- **Image Effects**:
  - Grayscale
  - Invert colors
  - Brightness adjustment
  - Contrast adjustment
  - Blur effect
- **File Operations**:
  - Open images (PNG, JPEG, WebP)
  - Save as PNG
  - Create new canvas
- **History**: Undo/Redo support

## Live Demo

Visit [https://hexagon.github.io/pura/](https://hexagon.github.io/pura/) to try it out!

## Usage

1. Click "Open" to load an image, or "New" to create a blank canvas
2. Select a tool from the left sidebar
3. Adjust brush size, opacity, and colors as needed
4. Use the layers panel on the right to manage layers
5. Apply effects and transforms from the right sidebar
6. Save your work using the "Save" button

## Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`: Redo
- `Ctrl/Cmd + S`: Save image
- `Ctrl/Cmd + O`: Open image

## Technology

- Pure vanilla JavaScript (no frameworks)
- ES6 modules for clean code organization
- [cross-image@0.2.2](https://github.com/cross-org/image) for image processing
- HTML5 Canvas API for rendering
- CSS3 for modern UI styling

## Architecture

Pura uses a modular architecture with ES6 modules:
- **No build process**: Modules load directly in the browser
- **8 focused modules**: Each handles a specific responsibility
- **1,091 line main file**: Down from 1,764 (38% reduction)

```
js/
├── constants.js    - Shared constants and library imports
├── state.js        - State management and workspace handling
├── layers.js       - Layer operations and composition
├── drawing.js      - Drawing tools (brush, eraser, shapes)
├── file-io.js      - File import/export with multi-frame support
├── effects.js      - Image effects and transforms
├── history.js      - Undo/redo functionality
└── ui.js           - UI helpers and updates
```

For more details, see [IMPROVEMENTS.md](IMPROVEMENTS.md).

## Development

Simply open `index.html` in a modern web browser. No build step required!

## License

MIT