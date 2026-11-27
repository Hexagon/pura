// Selection tools module (selection coordinates are local to the active layer)
import { createCanvas } from './layers.js';

function activeLayer(state) {
    return state.layers[state.activeLayerIndex];
}

function tracePath(ctx, path) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.closePath();
}

// Add the selection shape as the current path on ctx (in layer coordinates)
export function traceSelection(ctx, state) {
    if (state.selectionType === 'freeform' && state.selectionPath) {
        tracePath(ctx, state.selectionPath);
    } else {
        const s = state.selection;
        ctx.beginPath();
        ctx.rect(s.x, s.y, s.width, s.height);
    }
}

// Restrict subsequent drawing on ctx to the selection. Caller must save/restore.
export function clipToSelection(ctx, state) {
    if (!state.selection) return;
    traceSelection(ctx, state);
    ctx.clip();
}

export function createRectSelection(state, x, y, width, height) {
    const layer = activeLayer(state);
    const x0 = Math.round(Math.min(x, x + width));
    const y0 = Math.round(Math.min(y, y + height));
    const x1 = Math.round(Math.max(x, x + width));
    const y1 = Math.round(Math.max(y, y + height));

    const cx0 = Math.max(0, x0);
    const cy0 = Math.max(0, y0);
    const cx1 = Math.min(layer.canvas.width, x1);
    const cy1 = Math.min(layer.canvas.height, y1);

    if (cx1 - cx0 <= 0 || cy1 - cy0 <= 0) {
        clearSelection(state);
        return;
    }

    state.selection = { x: cx0, y: cy0, width: cx1 - cx0, height: cy1 - cy0, imageData: null };
    state.selectionPath = null;
    state.selectionType = 'rect';
    refreshSelectionPixels(state);
}

export function createFreeformSelection(state, path) {
    if (!path || path.length < 3) {
        clearSelection(state);
        return;
    }
    const layer = activeLayer(state);
    const xs = path.map(p => p.x);
    const ys = path.map(p => p.y);
    const minX = Math.max(0, Math.floor(Math.min(...xs)));
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxX = Math.min(layer.canvas.width, Math.ceil(Math.max(...xs)));
    const maxY = Math.min(layer.canvas.height, Math.ceil(Math.max(...ys)));

    if (maxX - minX <= 0 || maxY - minY <= 0) {
        clearSelection(state);
        return;
    }

    state.selection = { x: minX, y: minY, width: maxX - minX, height: maxY - minY, imageData: null };
    state.selectionPath = path;
    state.selectionType = 'freeform';
    refreshSelectionPixels(state);
}

// Canvas containing only the selected pixels, sized to the selection bounds
export function getSelectionCanvas(state, layer = activeLayer(state)) {
    const s = state.selection;
    const canvas = createCanvas(s.width, s.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.translate(-s.x, -s.y);
    clipToSelection(ctx, state);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
    return canvas;
}

// Re-read the selected pixels from the layer (call before using selection.imageData)
export function refreshSelectionPixels(state) {
    if (!state.selection) return;
    const s = state.selection;
    s.imageData = getSelectionCanvas(state)
        .getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, s.width, s.height);
}

export function translateSelection(state, dx, dy) {
    if (!state.selection) return;
    state.selection.x += dx;
    state.selection.y += dy;
    if (state.selectionPath) {
        state.selectionPath = state.selectionPath.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }
}

export function selectAll(state) {
    const layer = activeLayer(state);
    if (!layer) return;
    createRectSelection(state, 0, 0, layer.canvas.width, layer.canvas.height);
}

export function clearSelection(state) {
    state.selection = null;
    state.selectionPath = null;
    if (state.selectionCtx) {
        state.selectionCtx.clearRect(0, 0, state.selectionCanvas.width, state.selectionCanvas.height);
    }
}

// Erase the selected pixels from the active layer
export function eraseSelectionArea(state, layer = activeLayer(state)) {
    layer.ctx.save();
    clipToSelection(layer.ctx, state);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.restore();
}

export function deleteSelection(state, composeLayers, saveState) {
    if (!state.selection) return false;
    eraseSelectionArea(state);
    composeLayers();
    saveState();
    return true;
}

export function fillSelection(state, color, composeLayers, saveState) {
    if (!state.selection) return false;
    const layer = activeLayer(state);
    layer.ctx.save();
    clipToSelection(layer.ctx, state);
    layer.ctx.globalAlpha = state.opacity;
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.restore();
    composeLayers();
    saveState();
    return true;
}

// Marching ants on the selection overlay (overlay is in workspace coordinates)
export function drawSelectionOutline(state, timestamp = 0) {
    const ctx = state.selectionCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, state.selectionCanvas.width, state.selectionCanvas.height);
    if (!state.selection) return;

    const layer = activeLayer(state);
    const dashOffset = -(timestamp / 50) % 16;
    // Keep the outline 1 screen pixel wide regardless of zoom
    const lineWidth = 1 / (state.zoom || 1);

    ctx.save();
    ctx.translate((layer?.offsetX || 0) + 0.5 * lineWidth, (layer?.offsetY || 0) + 0.5 * lineWidth);
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([4 * lineWidth, 4 * lineWidth]);
    for (const [color, offset] of [['#ffffff', 0], ['#000000', 4]]) {
        ctx.strokeStyle = color;
        ctx.lineDashOffset = (dashOffset + offset) * lineWidth;
        traceSelection(ctx, state);
        ctx.stroke();
    }
    ctx.restore();
}

export function isPointInSelection(state, x, y) {
    if (!state.selection) return false;
    const ctx = state.selectionCtx || createCanvas(1, 1).getContext('2d');
    traceSelection(ctx, state);
    return ctx.isPointInPath(x, y);
}
