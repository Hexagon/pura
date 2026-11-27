// Drawing tools module
import * as Selection from './selection.js';
import { cloneCanvas, createCanvas, pickLayerAt } from './layers.js';

export const ALLOWED_FONTS = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
    'Georgia', 'Verdana', 'Comic Sans MS', 'Impact'
];

const SHAPE_TOOLS = ['rect', 'circle', 'line'];

export function getMousePos(state, e) {
    const rect = state.canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (state.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (state.canvas.height / rect.height)
    };
}

function toLayerCoords(layer, x, y) {
    return { x: x - (layer.offsetX || 0), y: y - (layer.offsetY || 0) };
}

function clearPreview(state) {
    state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
}

export function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

export function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Shift constrains: rect -> square, ellipse -> circle, line -> 45° steps
function constrainEnd(tool, x0, y0, x1, y1, shift) {
    if (!shift) return { x: x1, y: y1 };
    const dx = x1 - x0;
    const dy = y1 - y0;
    if (tool === 'line') {
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(dx, dy);
        return { x: x0 + Math.cos(angle) * len, y: y0 + Math.sin(angle) * len };
    }
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: x0 + Math.sign(dx || 1) * size, y: y0 + Math.sign(dy || 1) * size };
}

function traceShape(ctx, tool, x0, y0, x1, y1, fromCenter) {
    ctx.beginPath();
    if (tool === 'line') {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        return;
    }
    let left, top, w, h;
    if (fromCenter) {
        w = Math.abs(x1 - x0) * 2;
        h = Math.abs(y1 - y0) * 2;
        left = x0 - w / 2;
        top = y0 - h / 2;
    } else {
        left = Math.min(x0, x1);
        top = Math.min(y0, y1);
        w = Math.abs(x1 - x0);
        h = Math.abs(y1 - y0);
    }
    if (tool === 'rect') {
        ctx.rect(left, top, w, h);
    } else {
        ctx.ellipse(left + w / 2, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    }
}

function paintShape(ctx, state, x0, y0, x1, y1, e) {
    const end = constrainEnd(state.tool, x0, y0, x1, y1, e.shiftKey);
    traceShape(ctx, state.tool, x0, y0, end.x, end.y, e.altKey && state.tool !== 'line');
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = state.tool === 'rect' ? 'miter' : 'round';
    ctx.globalAlpha = state.opacity;
    const mode = state.tool === 'line' ? 'stroke' : state.shapeFill;
    if (mode === 'fill' || mode === 'both') {
        ctx.fillStyle = mode === 'both' ? state.backgroundColor : state.foregroundColor;
        ctx.fill();
    }
    if (mode === 'stroke' || mode === 'both') {
        ctx.strokeStyle = state.foregroundColor;
        ctx.stroke();
    }
}

function paintGradient(ctx, state, x0, y0, x1, y1, width, height) {
    let gradient;
    if (state.gradientType === 'radial') {
        gradient = ctx.createRadialGradient(x0, y0, 0, x0, y0, Math.max(1, Math.hypot(x1 - x0, y1 - y0)));
    } else {
        gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    }
    gradient.addColorStop(0, state.foregroundColor);
    gradient.addColorStop(1, state.backgroundColor);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = state.opacity;
    ctx.fillRect(0, 0, width, height);
}

// Re-render the whole brush/eraser stroke over the pre-stroke snapshot so that
// opacity does not accumulate where the stroke overlaps itself
function renderStroke(state, layer) {
    const ctx = layer.ctx;
    const pts = state.strokePoints;
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(state.strokeSnapshot, 0, 0);
    ctx.restore();

    const stroke = state.strokeCanvas;
    const sctx = stroke.getContext('2d');
    sctx.clearRect(0, 0, stroke.width, stroke.height);
    sctx.strokeStyle = sctx.fillStyle = state.tool === 'eraser' ? '#000000' : state.foregroundColor;
    sctx.lineWidth = state.brushSize;
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';
    if (pts.length === 1) {
        sctx.beginPath();
        sctx.arc(pts[0].x, pts[0].y, state.brushSize / 2, 0, Math.PI * 2);
        sctx.fill();
    } else {
        sctx.beginPath();
        sctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2;
            const my = (pts[i].y + pts[i + 1].y) / 2;
            sctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1];
        sctx.lineTo(last.x, last.y);
        sctx.stroke();
    }

    ctx.save();
    Selection.clipToSelection(ctx, state);
    ctx.globalAlpha = state.opacity;
    ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.drawImage(stroke, 0, 0);
    ctx.restore();
}

// Scanline-free stack flood fill using typed arrays; returns a mask of filled pixels
function floodFillMask(imageData, startX, startY, tolerance) {
    const { width, height, data } = imageData;
    const mask = new Uint8Array(width * height);
    const x0 = Math.floor(startX);
    const y0 = Math.floor(startY);
    if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return mask;

    const p = (y0 * width + x0) * 4;
    const sr = data[p], sg = data[p + 1], sb = data[p + 2], sa = data[p + 3];
    const matches = (i) => {
        const o = i * 4;
        return Math.abs(data[o] - sr) <= tolerance &&
            Math.abs(data[o + 1] - sg) <= tolerance &&
            Math.abs(data[o + 2] - sb) <= tolerance &&
            Math.abs(data[o + 3] - sa) <= tolerance;
    };

    const stack = [y0 * width + x0];
    mask[stack[0]] = 1;
    while (stack.length) {
        const i = stack.pop();
        const x = i % width;
        const neighbors = [
            x > 0 ? i - 1 : -1,
            x < width - 1 ? i + 1 : -1,
            i - width,
            i + width
        ];
        for (const n of neighbors) {
            if (n < 0 || n >= mask.length || mask[n]) continue;
            if (matches(n)) {
                mask[n] = 1;
                stack.push(n);
            }
        }
    }
    return mask;
}

function performFill(state, layer, pos) {
    const lp = toLayerCoords(layer, pos.x, pos.y);
    if (lp.x < 0 || lp.y < 0 || lp.x >= layer.canvas.width || lp.y >= layer.canvas.height) return false;
    if (state.selection && !Selection.isPointInSelection(state, lp.x, lp.y)) return false;

    const { width, height } = layer.canvas;
    const imageData = layer.ctx.getImageData(0, 0, width, height);
    const mask = floodFillMask(imageData, lp.x, lp.y, state.fillTolerance ?? 32);
    const { r, g, b } = hexToRgb(state.foregroundColor);

    const fill = new ImageData(width, height);
    for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        const o = i * 4;
        fill.data[o] = r;
        fill.data[o + 1] = g;
        fill.data[o + 2] = b;
        fill.data[o + 3] = 255;
    }
    const fillCanvas = createCanvas(width, height);
    fillCanvas.getContext('2d').putImageData(fill, 0, 0);

    layer.ctx.save();
    Selection.clipToSelection(layer.ctx, state);
    layer.ctx.globalAlpha = state.opacity;
    layer.ctx.drawImage(fillCanvas, 0, 0);
    layer.ctx.restore();
    return true;
}

export function sampleColor(state, pos) {
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (x < 0 || y < 0 || x >= state.canvas.width || y >= state.canvas.height) return null;
    const [r, g, b, a] = state.ctx.getImageData(x, y, 1, 1).data;
    if (a === 0) return null;
    return rgbToHex(r, g, b);
}

// api: { composeLayers, saveState, pickColor(hex, isBackground), selectLayer(index),
//        selectionChanged(), requestText(pos), layerMoved() }
export function startDrawing(state, e, api) {
    const layer = state.layers[state.activeLayerIndex];
    if (!layer) return;
    const pos = getMousePos(state, e);
    state.startX = pos.x;
    state.startY = pos.y;
    state.lastEvent = e;

    // Alt+click with painting tools samples a colour, like most editors
    const tool = e.altKey && ['brush', 'fill'].includes(state.tool) ? 'eyedropper' : state.tool;

    switch (tool) {
        case 'eyedropper': {
            const color = sampleColor(state, pos);
            if (color) api.pickColor(color, state.tool === 'eyedropper' && e.altKey);
            state.isDrawing = state.tool === 'eyedropper';
            return;
        }
        case 'fill':
            if (performFill(state, layer, pos)) {
                api.composeLayers();
                api.saveState();
            }
            return;
        case 'text':
            api.requestText(pos);
            return;
        case 'pointer': {
            const index = pickLayerAt(state, pos.x, pos.y);
            if (index >= 0 && index !== state.activeLayerIndex) api.selectLayer(index);
            return;
        }
        case 'move': {
            const active = state.layers[state.activeLayerIndex];
            state.moveOrigin = { x: active.offsetX, y: active.offsetY };
            state.moveDelta = { x: 0, y: 0 };
            if (state.selection) {
                // Lift the selected pixels off the layer into a floating canvas
                state.floating = Selection.getSelectionCanvas(state, active);
                state.floatingOrigin = { x: state.selection.x, y: state.selection.y };
                state.moveSnapshot = cloneCanvas(active.canvas);
                Selection.eraseSelectionArea(state, active);
                api.composeLayers();
                state.previewCtx.drawImage(state.floating,
                    active.offsetX + state.floatingOrigin.x, active.offsetY + state.floatingOrigin.y);
            }
            state.isDrawing = true;
            return;
        }
        case 'rectSelect':
            state.isDrawing = true;
            return;
        case 'freeformSelect':
            state.lassoPath = [{ x: pos.x, y: pos.y }];
            state.isDrawing = true;
            return;
        case 'brush':
        case 'eraser': {
            const lp = toLayerCoords(layer, pos.x, pos.y);
            state.strokeSnapshot = cloneCanvas(layer.canvas);
            state.strokeCanvas = createCanvas(layer.canvas.width, layer.canvas.height);
            state.strokePoints = [lp];
            state.isDrawing = true;
            renderStroke(state, layer);
            api.composeLayers();
            return;
        }
        default:
            state.isDrawing = true;
    }
}

export function draw(state, e, api) {
    if (!state.isDrawing) return;
    const pos = getMousePos(state, e);
    const layer = state.layers[state.activeLayerIndex];
    state.lastEvent = e;

    switch (state.tool) {
        case 'brush':
        case 'eraser': {
            const lp = toLayerCoords(layer, pos.x, pos.y);
            const last = state.strokePoints[state.strokePoints.length - 1];
            if (Math.hypot(lp.x - last.x, lp.y - last.y) < 0.5) return;
            state.strokePoints.push(lp);
            renderStroke(state, layer);
            api.composeLayers();
            break;
        }
        case 'eyedropper': {
            const color = sampleColor(state, pos);
            if (color) api.pickColor(color, e.altKey);
            break;
        }
        case 'gradient':
            clearPreview(state);
            state.previewCtx.save();
            state.previewCtx.translate(layer.offsetX, layer.offsetY);
            Selection.clipToSelection(state.previewCtx, state);
            state.previewCtx.translate(-layer.offsetX, -layer.offsetY);
            paintGradient(state.previewCtx, state, state.startX, state.startY, pos.x, pos.y,
                state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.restore();
            state.previewCtx.save();
            state.previewCtx.strokeStyle = '#ffffff';
            state.previewCtx.lineWidth = 1 / state.zoom;
            state.previewCtx.setLineDash([5 / state.zoom, 5 / state.zoom]);
            state.previewCtx.beginPath();
            state.previewCtx.moveTo(state.startX, state.startY);
            state.previewCtx.lineTo(pos.x, pos.y);
            state.previewCtx.stroke();
            state.previewCtx.restore();
            break;
        case 'rect':
        case 'circle':
        case 'line':
            clearPreview(state);
            state.previewCtx.save();
            paintShape(state.previewCtx, state, state.startX, state.startY, pos.x, pos.y, e);
            state.previewCtx.restore();
            break;
        case 'rectSelect': {
            clearPreview(state);
            const end = constrainEnd('rect', state.startX, state.startY, pos.x, pos.y, e.shiftKey);
            drawMarquee(state, ctx => ctx.rect(
                Math.min(state.startX, end.x), Math.min(state.startY, end.y),
                Math.abs(end.x - state.startX), Math.abs(end.y - state.startY)));
            break;
        }
        case 'freeformSelect':
            state.lassoPath.push({ x: pos.x, y: pos.y });
            clearPreview(state);
            drawMarquee(state, ctx => {
                ctx.moveTo(state.lassoPath[0].x, state.lassoPath[0].y);
                for (const p of state.lassoPath) ctx.lineTo(p.x, p.y);
            });
            break;
        case 'move': {
            const dx = Math.round(pos.x - state.startX);
            const dy = Math.round(pos.y - state.startY);
            state.moveDelta = { x: dx, y: dy };
            if (state.floating) {
                clearPreview(state);
                state.previewCtx.drawImage(state.floating,
                    layer.offsetX + state.floatingOrigin.x + dx,
                    layer.offsetY + state.floatingOrigin.y + dy);
            } else {
                layer.offsetX = state.moveOrigin.x + dx;
                layer.offsetY = state.moveOrigin.y + dy;
                api.composeLayers();
                api.layerMoved();
            }
            break;
        }
    }
}

function drawMarquee(state, trace) {
    const ctx = state.previewCtx;
    const lw = 1 / state.zoom;
    ctx.save();
    ctx.lineWidth = lw;
    ctx.setLineDash([4 * lw, 4 * lw]);
    for (const [color, offset] of [['#ffffff', 0], ['#000000', 4 * lw]]) {
        ctx.strokeStyle = color;
        ctx.lineDashOffset = offset;
        ctx.beginPath();
        trace(ctx);
        ctx.stroke();
    }
    ctx.restore();
}

export function stopDrawing(state, e, api) {
    if (!state.isDrawing) return;
    state.isDrawing = false;
    const layer = state.layers[state.activeLayerIndex];
    const pos = e && e.clientX !== undefined ? getMousePos(state, e) : { x: state.startX, y: state.startY };
    const evt = e || state.lastEvent || {};
    clearPreview(state);

    let changed = false;

    switch (state.tool) {
        case 'brush':
        case 'eraser':
            state.strokeSnapshot = null;
            state.strokeCanvas = null;
            state.strokePoints = null;
            changed = true;
            break;

        case 'gradient': {
            const a = toLayerCoords(layer, state.startX, state.startY);
            const b = toLayerCoords(layer, pos.x, pos.y);
            layer.ctx.save();
            Selection.clipToSelection(layer.ctx, state);
            paintGradient(layer.ctx, state, a.x, a.y, b.x, b.y, layer.canvas.width, layer.canvas.height);
            layer.ctx.restore();
            changed = true;
            break;
        }

        case 'rect':
        case 'circle':
        case 'line': {
            const a = toLayerCoords(layer, state.startX, state.startY);
            const b = toLayerCoords(layer, pos.x, pos.y);
            if (a.x === b.x && a.y === b.y) break;
            layer.ctx.save();
            Selection.clipToSelection(layer.ctx, state);
            paintShape(layer.ctx, state, a.x, a.y, b.x, b.y, evt);
            layer.ctx.restore();
            changed = true;
            break;
        }

        case 'move': {
            const { x: dx, y: dy } = state.moveDelta || { x: 0, y: 0 };
            if (state.floating) {
                if (dx === 0 && dy === 0) {
                    layer.ctx.save();
                    layer.ctx.globalCompositeOperation = 'copy';
                    layer.ctx.drawImage(state.moveSnapshot, 0, 0);
                    layer.ctx.restore();
                } else {
                    layer.ctx.drawImage(state.floating, state.floatingOrigin.x + dx, state.floatingOrigin.y + dy);
                    Selection.translateSelection(state, dx, dy);
                    Selection.refreshSelectionPixels(state);
                    changed = true;
                }
                state.floating = null;
                state.moveSnapshot = null;
                api.selectionChanged();
            } else {
                changed = dx !== 0 || dy !== 0;
            }
            break;
        }

        case 'rectSelect': {
            const end = constrainEnd('rect', state.startX, state.startY, pos.x, pos.y, evt.shiftKey);
            const a = toLayerCoords(layer, state.startX, state.startY);
            const b = toLayerCoords(layer, end.x, end.y);
            Selection.createRectSelection(state, a.x, a.y, b.x - a.x, b.y - a.y);
            api.selectionChanged();
            break;
        }

        case 'freeformSelect':
            if (state.lassoPath && state.lassoPath.length > 2) {
                Selection.createFreeformSelection(state, state.lassoPath.map(p => toLayerCoords(layer, p.x, p.y)));
            } else {
                Selection.clearSelection(state);
            }
            state.lassoPath = null;
            api.selectionChanged();
            break;
    }

    api.composeLayers();
    if (changed) api.saveState();
}

export function renderText(state, text, x, y, composeLayers, saveState) {
    if (!state || !text || !text.trim() || state.layers.length === 0) return;
    const layer = state.layers[state.activeLayerIndex];
    const lp = toLayerCoords(layer, x, y);
    const fontFamily = ALLOWED_FONTS.includes(state.fontFamily) ? state.fontFamily : 'Arial';
    const size = Math.max(1, Number(state.fontSize) || 24);
    const style = `${state.fontItalic ? 'italic ' : ''}${state.fontBold ? 'bold ' : ''}`;

    layer.ctx.save();
    Selection.clipToSelection(layer.ctx, state);
    layer.ctx.font = `${style}${size}px "${fontFamily}"`;
    layer.ctx.fillStyle = state.foregroundColor;
    layer.ctx.textBaseline = 'top';
    layer.ctx.globalAlpha = state.opacity;
    text.split('\n').forEach((line, i) => {
        layer.ctx.fillText(line, lp.x, lp.y + i * size * 1.2);
    });
    layer.ctx.restore();

    composeLayers();
    if (saveState) saveState();
}

export { SHAPE_TOOLS };

// Abort the gesture in progress without committing anything (e.g. a second finger
// touched down to pinch-zoom): restores the layer to how it was when the stroke began
export function cancelDrawing(state, api) {
    if (!state.isDrawing) return;
    state.isDrawing = false;
    const layer = state.layers[state.activeLayerIndex];
    const restore = (snapshot) => {
        layer.ctx.save();
        layer.ctx.globalCompositeOperation = 'copy';
        layer.ctx.drawImage(snapshot, 0, 0);
        layer.ctx.restore();
    };
    if ((state.tool === 'brush' || state.tool === 'eraser') && state.strokeSnapshot) {
        restore(state.strokeSnapshot);
    } else if (state.tool === 'move') {
        if (state.floating) {
            restore(state.moveSnapshot);
            api.selectionChanged();
        } else if (state.moveOrigin) {
            layer.offsetX = state.moveOrigin.x;
            layer.offsetY = state.moveOrigin.y;
            api.layerMoved();
        }
    }
    state.strokeSnapshot = state.strokeCanvas = state.strokePoints = null;
    state.floating = state.moveSnapshot = null;
    state.lassoPath = null;
    clearPreview(state);
    api.composeLayers();
}
