// Effects and transforms module
import { Image } from './constants.js';
import { createCanvas } from './layers.js';
import * as Selection from './selection.js';

// Adjustable effects shown in the effect dialog (values are in user-facing units)
export const EFFECTS = {
    brightness: { label: 'Brightness', min: -100, max: 100, value: 0, apply: (img, v) => img.brightness(v / 100) },
    contrast: { label: 'Contrast', min: -100, max: 100, value: 0, apply: (img, v) => img.contrast(v / 100) },
    exposure: { label: 'Exposure', min: -100, max: 100, value: 0, apply: (img, v) => img.exposure(v / 100) },
    saturation: { label: 'Saturation', min: -100, max: 100, value: 0, apply: (img, v) => img.saturation(v / 100) },
    hue: { label: 'Hue', unit: '°', min: -180, max: 180, value: 0, apply: (img, v) => img.hue(v) },
    blur: { label: 'Box Blur', unit: 'px', min: 1, max: 20, value: 2, apply: (img, v) => img.blur(v) },
    gaussianBlur: { label: 'Gaussian Blur', unit: 'px', min: 1, max: 20, value: 3, apply: (img, v) => img.gaussianBlur(v) },
    medianFilter: { label: 'Median Filter', unit: 'px', min: 1, max: 5, value: 1, apply: (img, v) => img.medianFilter(v) },
    sharpen: { label: 'Sharpen', unit: '%', min: 0, max: 100, value: 50, apply: (img, v) => img.sharpen(v / 100) },
    threshold: { label: 'Threshold', min: 0, max: 255, value: 128, raw: threshold },
    posterize: { label: 'Posterize', unit: ' levels', min: 2, max: 16, value: 4, raw: posterize },
    pixelate: { label: 'Pixelate', unit: 'px', min: 2, max: 64, value: 8, raw: pixelate }
};

// One-click effects
export const INSTANT_EFFECTS = {
    grayscale: { label: 'Grayscale', apply: img => img.grayscale() },
    sepia: { label: 'Sepia', apply: img => img.sepia() },
    invert: { label: 'Invert', apply: img => img.invert() },
    autoLevels: { label: 'Auto Levels', raw: autoLevels }
};

function threshold(data, w, h, v) {
    for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = lum >= v ? 255 : 0;
    }
}

function posterize(data, w, h, levels) {
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(Math.round(data[i + c] / step) * step);
    }
}

function pixelate(data, w, h, size) {
    for (let by = 0; by < h; by += size) {
        for (let bx = 0; bx < w; bx += size) {
            const sum = [0, 0, 0, 0];
            let n = 0;
            const ex = Math.min(bx + size, w);
            const ey = Math.min(by + size, h);
            for (let y = by; y < ey; y++) {
                for (let x = bx; x < ex; x++) {
                    const o = (y * w + x) * 4;
                    for (let c = 0; c < 4; c++) sum[c] += data[o + c];
                    n++;
                }
            }
            for (let y = by; y < ey; y++) {
                for (let x = bx; x < ex; x++) {
                    const o = (y * w + x) * 4;
                    for (let c = 0; c < 4; c++) data[o + c] = sum[c] / n;
                }
            }
        }
    }
}

// Stretch each colour channel to the full 0-255 range (ignoring transparent pixels)
function autoLevels(data) {
    const lo = [255, 255, 255];
    const hi = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        for (let c = 0; c < 3; c++) {
            if (data[i + c] < lo[c]) lo[c] = data[i + c];
            if (data[i + c] > hi[c]) hi[c] = data[i + c];
        }
    }
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const range = hi[c] - lo[c];
            if (range > 0) data[i + c] = ((data[i + c] - lo[c]) * 255) / range;
        }
    }
}

// Run an effect on a copy of imageData and return the processed ImageData
export function processImageData(imageData, effect, value) {
    const { width, height } = imageData;
    if (effect.raw) {
        const out = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
        effect.raw(out.data, width, height, value);
        return out;
    }
    const image = Image.fromRGBA(width, height, new Uint8Array(imageData.data));
    effect.apply(image, value);
    return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}

// Write processed pixels back to the layer, limited to the selection if there is one
function writeResult(state, layer, original, result) {
    if (!state.selection) {
        layer.ctx.putImageData(result, 0, 0);
        return;
    }
    const temp = createCanvas(result.width, result.height);
    temp.getContext('2d').putImageData(result, 0, 0);
    layer.ctx.putImageData(original, 0, 0);
    layer.ctx.save();
    Selection.clipToSelection(layer.ctx, state);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(temp, 0, 0);
    layer.ctx.restore();
}

function activeLayer(state) {
    return state.layers[state.activeLayerIndex];
}

function readLayer(layer) {
    return layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
}

export function applyInstantEffect(state, key, composeLayers, saveState) {
    const layer = activeLayer(state);
    const original = readLayer(layer);
    writeResult(state, layer, original, processImageData(original, INSTANT_EFFECTS[key], 0));
    composeLayers();
    saveState();
}

// --- Effect dialog with live preview ---

let session = null;
let previewTimer = null;

export function showEffectModal(state, key) {
    const effect = EFFECTS[key];
    const layer = activeLayer(state);
    session = { state, key, layer, original: readLayer(layer), previewed: null };

    document.getElementById('effectTitle').textContent = effect.label;
    const slider = document.getElementById('effectSlider');
    slider.min = effect.min;
    slider.max = effect.max;
    slider.step = 1;
    slider.value = effect.value;
    document.getElementById('effectValue').textContent = `${effect.value}${effect.unit || ''}`;
    document.getElementById('effectModal').classList.add('active');
}

export function updateEffectPreview(composeLayers) {
    if (!session) return;
    const value = Number(document.getElementById('effectSlider').value);
    const effect = EFFECTS[session.key];
    document.getElementById('effectValue').textContent = `${value}${effect.unit || ''}`;

    clearTimeout(previewTimer);
    const enabled = document.getElementById('effectPreview').checked;
    if (!enabled) {
        if (session.previewed !== null) {
            session.layer.ctx.putImageData(session.original, 0, 0);
            session.previewed = null;
            composeLayers();
        }
        return;
    }
    previewTimer = setTimeout(() => {
        if (!session) return;
        try {
            writeResult(session.state, session.layer, session.original,
                processImageData(session.original, effect, value));
            session.previewed = value;
            composeLayers();
        } catch (error) {
            console.error('Effect preview failed:', error);
        }
    }, 40);
}

export function applyEffect(state, composeLayers, saveState, closeModal) {
    if (!session) return;
    clearTimeout(previewTimer);
    const value = Number(document.getElementById('effectSlider').value);
    try {
        if (session.previewed !== value) {
            writeResult(session.state, session.layer, session.original,
                processImageData(session.original, EFFECTS[session.key], value));
        }
        composeLayers();
        saveState();
    } catch (error) {
        console.error('Error applying effect:', error);
        session.layer.ctx.putImageData(session.original, 0, 0);
        composeLayers();
        alert('Error applying effect: ' + error.message);
    }
    session = null;
    closeModal('effectModal');
}

export function cancelEffect(composeLayers, closeModal) {
    clearTimeout(previewTimer);
    if (session) {
        session.layer.ctx.putImageData(session.original, 0, 0);
        composeLayers();
        session = null;
    }
    closeModal('effectModal');
}

export function isEffectSessionActive() {
    return session !== null;
}

// --- Layer transforms ---

function replaceLayerCanvas(layer, canvas) {
    layer.canvas = canvas;
    layer.ctx = canvas.getContext('2d', { willReadFrequently: true });
}

function transformLayerWithImage(layer, op) {
    const imageData = readLayer(layer);
    const image = Image.fromRGBA(layer.canvas.width, layer.canvas.height, new Uint8Array(imageData.data));
    op(image);
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext('2d').putImageData(
        new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
    // Keep the layer centred on the same point
    layer.offsetX += Math.round((layer.canvas.width - image.width) / 2);
    layer.offsetY += Math.round((layer.canvas.height - image.height) / 2);
    replaceLayerCanvas(layer, canvas);
}

export function resizeLayer(state) {
    const layer = activeLayer(state);
    document.getElementById('resizeWidth').value = layer.canvas.width;
    document.getElementById('resizeHeight').value = layer.canvas.height;
    document.getElementById('resizeModal').dataset.aspect = layer.canvas.width / layer.canvas.height;
    document.getElementById('resizeModal').classList.add('active');
}

export function applyResize(state, composeLayers, saveState, closeModal) {
    const width = parseInt(document.getElementById('resizeWidth').value);
    const height = parseInt(document.getElementById('resizeHeight').value);
    if (width > 0 && height > 0) {
        try {
            const layer = activeLayer(state);
            const oldW = layer.canvas.width;
            const oldH = layer.canvas.height;
            transformLayerWithImage(layer, image => image.resize({ width, height }));
            // Resize anchors at the layer's top-left corner
            layer.offsetX -= Math.round((oldW - width) / 2);
            layer.offsetY -= Math.round((oldH - height) / 2);
            Selection.clearSelection(state);
            composeLayers();
            saveState();
        } catch (error) {
            console.error('Error resizing:', error);
            alert('Error resizing layer: ' + error.message);
        }
    }
    closeModal('resizeModal');
}

const LAYER_TRANSFORMS = {
    rotateCW: image => image.rotate90(),
    rotateCCW: image => image.rotate270(),
    rotate180: image => image.rotate180(),
    flipH: image => image.flipHorizontal(),
    flipV: image => image.flipVertical()
};

export function transformLayer(state, key, composeLayers, saveState) {
    try {
        transformLayerWithImage(activeLayer(state), LAYER_TRANSFORMS[key]);
        Selection.clearSelection(state);
        composeLayers();
        saveState();
    } catch (error) {
        console.error('Error transforming layer:', error);
        alert('Error transforming layer: ' + error.message);
    }
}

// --- Whole-image operations (affect every layer and the canvas size) ---

export function cropToSelection(state) {
    if (!state.selection) return false;
    const layer = activeLayer(state);
    const x = state.selection.x + layer.offsetX;
    const y = state.selection.y + layer.offsetY;
    const { width, height } = state.selection;
    resizeCanvasAll(state, width, height, -x, -y);
    Selection.clearSelection(state);
    return true;
}

// Give every layer a canvas of the new size, shifting content by (dx, dy)
export function resizeCanvasAll(state, width, height, dx, dy) {
    for (const layer of state.layers) {
        const canvas = createCanvas(width, height);
        canvas.getContext('2d').drawImage(layer.canvas, layer.offsetX + dx, layer.offsetY + dy);
        replaceLayerCanvas(layer, canvas);
        layer.offsetX = 0;
        layer.offsetY = 0;
    }
    state.canvas.width = width;
    state.canvas.height = height;
}

export function scaleImage(state, width, height) {
    const sx = width / state.canvas.width;
    const sy = height / state.canvas.height;
    for (const layer of state.layers) {
        const canvas = createCanvas(layer.canvas.width * sx, layer.canvas.height * sy);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height);
        replaceLayerCanvas(layer, canvas);
        layer.offsetX = Math.round(layer.offsetX * sx);
        layer.offsetY = Math.round(layer.offsetY * sy);
    }
    state.canvas.width = width;
    state.canvas.height = height;
    Selection.clearSelection(state);
}

// Rotate or flip the whole image, including every layer's position
export function transformImage(state, key) {
    const W = state.canvas.width;
    const H = state.canvas.height;
    for (const layer of state.layers) {
        const { width: w, height: h } = layer.canvas;
        const { offsetX: ox, offsetY: oy } = layer;
        const swap = key === 'rotateCW' || key === 'rotateCCW';
        const canvas = createCanvas(swap ? h : w, swap ? w : h);
        const ctx = canvas.getContext('2d');
        if (key === 'rotateCW') {
            ctx.translate(h, 0);
            ctx.rotate(Math.PI / 2);
            layer.offsetX = H - oy - h;
            layer.offsetY = ox;
        } else if (key === 'rotateCCW') {
            ctx.translate(0, w);
            ctx.rotate(-Math.PI / 2);
            layer.offsetX = oy;
            layer.offsetY = W - ox - w;
        } else if (key === 'flipH') {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            layer.offsetX = W - ox - w;
        } else if (key === 'flipV') {
            ctx.translate(0, h);
            ctx.scale(1, -1);
            layer.offsetY = H - oy - h;
        }
        ctx.drawImage(layer.canvas, 0, 0);
        replaceLayerCanvas(layer, canvas);
    }
    if (key === 'rotateCW' || key === 'rotateCCW') {
        state.canvas.width = H;
        state.canvas.height = W;
    }
    Selection.clearSelection(state);
}
