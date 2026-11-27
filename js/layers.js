// Layer Management Module

export const BLEND_MODES = [
    ['source-over', 'Normal'],
    ['multiply', 'Multiply'],
    ['screen', 'Screen'],
    ['overlay', 'Overlay'],
    ['darken', 'Darken'],
    ['lighten', 'Lighten'],
    ['color-dodge', 'Color Dodge'],
    ['color-burn', 'Color Burn'],
    ['hard-light', 'Hard Light'],
    ['soft-light', 'Soft Light'],
    ['difference', 'Difference'],
    ['exclusion', 'Exclusion'],
    ['hue', 'Hue'],
    ['saturation', 'Saturation'],
    ['color', 'Color'],
    ['luminosity', 'Luminosity']
];

export function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
}

export function cloneCanvas(source) {
    const canvas = createCanvas(source.width, source.height);
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(source, 0, 0);
    return canvas;
}

// Create a layer object for a workspace (not added to the layer list)
export function createLayerObject(workspaceState, name, isBackground = false, width, height) {
    const canvas = createCanvas(width ?? workspaceState.canvas.width, height ?? workspaceState.canvas.height);
    return {
        id: workspaceState.layers.length,
        name: name || `Layer ${workspaceState.layers.length + 1}`,
        canvas,
        ctx: canvas.getContext('2d', { willReadFrequently: true }),
        visible: true,
        opacity: 1.0,
        blendMode: 'source-over',
        isBackground,
        duration: 100,
        offsetX: 0,
        offsetY: 0
    };
}

export function fillLayerInWorkspace(workspaceState, layerIndex, color) {
    if (!color || color === 'transparent') return;
    const layer = workspaceState.layers[layerIndex];
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
}

export const fillLayer = fillLayerInWorkspace;

// Create a layer and insert it above the active layer
export function createLayer(state, name, isBackground = false, width, height) {
    const layer = createLayerObject(state, name || `Layer ${state.layers.length + 1}`, isBackground, width, height);
    const insertAt = state.layers.length === 0 ? 0 : state.activeLayerIndex + 1;
    state.layers.splice(insertAt, 0, layer);
    state.activeLayerIndex = insertAt;
    reindexLayers(state);
    return layer;
}

export function reindexLayers(state) {
    state.layers.forEach((layer, index) => { layer.id = index; });
}

export function deleteLayer(state, layerIndex) {
    if (state.layers.length <= 1) return false;
    state.layers.splice(layerIndex, 1);
    if (state.activeLayerIndex >= state.layers.length || state.activeLayerIndex > layerIndex) {
        state.activeLayerIndex = Math.max(0, state.activeLayerIndex - 1);
    }
    reindexLayers(state);
    return true;
}

export function duplicateLayer(state, layerIndex) {
    const source = state.layers[layerIndex];
    const canvas = cloneCanvas(source.canvas);
    const copy = {
        ...source,
        name: `${source.name} copy`,
        canvas,
        ctx: canvas.getContext('2d', { willReadFrequently: true }),
        isBackground: false
    };
    state.layers.splice(layerIndex + 1, 0, copy);
    state.activeLayerIndex = layerIndex + 1;
    reindexLayers(state);
    return copy;
}

export function moveLayer(state, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= state.layers.length || fromIndex === toIndex) return false;
    const [layer] = state.layers.splice(fromIndex, 1);
    state.layers.splice(toIndex, 0, layer);
    state.activeLayerIndex = toIndex;
    reindexLayers(state);
    return true;
}

// Merge the layer at index into the one below it, keeping the union of both bounds
export function mergeDown(state, layerIndex = state.activeLayerIndex) {
    if (layerIndex <= 0) return false;
    const top = state.layers[layerIndex];
    const below = state.layers[layerIndex - 1];

    const minX = Math.min(below.offsetX, top.offsetX);
    const minY = Math.min(below.offsetY, top.offsetY);
    const maxX = Math.max(below.offsetX + below.canvas.width, top.offsetX + top.canvas.width);
    const maxY = Math.max(below.offsetY + below.canvas.height, top.offsetY + top.canvas.height);

    const canvas = createCanvas(maxX - minX, maxY - minY);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(below.canvas, below.offsetX - minX, below.offsetY - minY);
    if (top.visible) {
        ctx.globalAlpha = top.opacity;
        ctx.globalCompositeOperation = top.blendMode || 'source-over';
        ctx.drawImage(top.canvas, top.offsetX - minX, top.offsetY - minY);
    }

    below.canvas = canvas;
    below.ctx = canvas.getContext('2d', { willReadFrequently: true });
    below.offsetX = minX;
    below.offsetY = minY;

    state.layers.splice(layerIndex, 1);
    state.activeLayerIndex = layerIndex - 1;
    reindexLayers(state);
    return true;
}

// Flatten all visible layers into a single background layer
export function flattenLayers(state) {
    const flat = getFlattenedCanvas(state);
    const layer = createLayerObject(state, 'Background', true);
    layer.ctx.drawImage(flat, 0, 0);
    layer.duration = state.layers[0]?.duration ?? 100;
    state.layers = [layer];
    state.activeLayerIndex = 0;
    reindexLayers(state);
}

export function toggleLayerVisibility(state, layerIndex) {
    state.layers[layerIndex].visible = !state.layers[layerIndex].visible;
}

export function setActiveLayer(state, layerIndex) {
    state.activeLayerIndex = layerIndex;
}

// Draw all visible layers (bottom to top) onto ctx, honouring offset, opacity and blend mode
export function renderComposite(state, ctx) {
    for (const layer of state.layers) {
        if (!layer.visible || layer.opacity <= 0) continue;
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode || 'source-over';
        ctx.drawImage(layer.canvas, layer.offsetX || 0, layer.offsetY || 0);
    }
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

export function getFlattenedCanvas(state) {
    const canvas = createCanvas(state.canvas.width, state.canvas.height);
    renderComposite(state, canvas.getContext('2d', { willReadFrequently: true }));
    return canvas;
}

// Compose all visible layers onto the display canvas (no overlays are drawn here,
// so the display canvas always holds the true image)
export function composeLayers(state) {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    renderComposite(state, state.ctx);
}

// Find the topmost visible layer that has a non-transparent pixel at workspace (x, y)
export function pickLayerAt(state, x, y) {
    for (let i = state.layers.length - 1; i >= 0; i--) {
        const layer = state.layers[i];
        if (!layer.visible) continue;
        const lx = Math.floor(x - layer.offsetX);
        const ly = Math.floor(y - layer.offsetY);
        if (lx < 0 || ly < 0 || lx >= layer.canvas.width || ly >= layer.canvas.height) continue;
        if (layer.ctx.getImageData(lx, ly, 1, 1).data[3] > 0) return i;
    }
    return -1;
}

export function drawThumbnail(layer, thumbCanvas) {
    const ctx = thumbCanvas.getContext('2d');
    const { width: tw, height: th } = thumbCanvas;
    ctx.clearRect(0, 0, tw, th);
    const scale = Math.min(tw / layer.canvas.width, th / layer.canvas.height);
    const w = layer.canvas.width * scale;
    const h = layer.canvas.height * scale;
    ctx.drawImage(layer.canvas, (tw - w) / 2, (th - h) / 2, w, h);
}
