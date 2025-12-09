# CrimShop - Client-Side Image Editor

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

Visit [https://hexagon.github.io/crimshop/](https://hexagon.github.io/crimshop/) to try it out!

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
- [cross-image@0.2.2](https://github.com/cross-org/image) for image processing
- HTML5 Canvas API for rendering
- CSS3 for modern UI styling

## Development

Simply open `index.html` in a modern web browser. No build step required!

## License

MIT