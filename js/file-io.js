// File I/O operations module
import { Image, MULTI_FRAME_FORMATS } from './constants.js';
import { createLayerObject, createLayer, getFlattenedCanvas, createCanvas, reindexLayers } from './layers.js';

export const FORMATS = {
    png: { mime: 'image/png', ext: 'png' },
    jpeg: { mime: 'image/jpeg', ext: 'jpg', quality: true },
    webp: { mime: 'image/webp', ext: 'webp', quality: true },
    gif: { mime: 'image/gif', ext: 'gif' },
    apng: { mime: 'image/apng', ext: 'apng' },
    tiff: { mime: 'image/tiff', ext: 'tiff' },
    bmp: { mime: 'image/bmp', ext: 'bmp' },
    heic: { mime: 'image/heic', ext: 'heic', quality: true },
    avif: { mime: 'image/avif', ext: 'avif', quality: true },
    ico: { mime: 'image/x-icon', ext: 'ico' },
    qoi: { mime: 'image/qoi', ext: 'qoi' },
    pcx: { mime: 'image/x-pcx', ext: 'pcx' },
    ppm: { mime: 'image/x-portable-pixmap', ext: 'ppm' },
    pgm: { mime: 'image/x-portable-graymap', ext: 'pgm' },
    pbm: { mime: 'image/x-portable-bitmap', ext: 'pbm' }
};

function frameToCanvas(frame) {
    const canvas = createCanvas(frame.width, frame.height);
    canvas.getContext('2d').putImageData(
        new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height), 0, 0);
    return canvas;
}

function framesOf(image) {
    return image.frames && image.frames.length > 1 ? image.frames : [image];
}

// Frames of animated/multi-page files are positioned inside the logical canvas
function frameOffset(frame) {
    return { x: frame.frameMetadata?.left || 0, y: frame.frameMetadata?.top || 0 };
}

function frameDuration(frame) {
    return frame.duration ?? frame.frameMetadata?.delay;
}

// Decode a file, returning { width, height, frames, metadata } for multi-frame
// files (GIF, APNG, multi-page TIFF) and a single Image otherwise
async function decodeFile(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    try {
        const multi = await Image.readFrames(data);
        if (multi.frames.length > 1) return multi;
    } catch {
        // Not a multi-frame format
    }
    return Image.read(data);
}

export function openImage() {
    document.getElementById('fileInput').click();
}

// Open each file in its own workspace (app: createWorkspace, getState, mergeMetadata, refresh, fitToScreen)
export async function openFiles(files, app) {
    for (const file of files) {
        try {
            const image = await decodeFile(file);
            const frames = framesOf(image);
            const width = image.width || Math.max(...frames.map(f => f.width + frameOffset(f).x));
            const height = image.height || Math.max(...frames.map(f => f.height + frameOffset(f).y));

            app.createWorkspace(file.name, width, height, 'transparent');
            const ws = app.getState();
            ws.layers = frames.map((frame, i) => {
                const name = frames.length > 1 ? `Frame ${i + 1}` : file.name;
                const layer = createLayerObject(ws, name, i === 0);
                if (frameDuration(frame) !== undefined) layer.duration = frameDuration(frame);
                const { x, y } = frameOffset(frame);
                layer.ctx.drawImage(frameToCanvas(frame), x, y);
                return layer;
            });
            reindexLayers(ws);
            ws.activeLayerIndex = ws.layers.length - 1;
            if (image.metadata) ws.metadata = app.mergeMetadata(ws.metadata, image.metadata);

            ws.history = [];
            ws.historyIndex = -1;
            app.refresh();
            app.saveState();
            ws.dirty = false;
            app.fitToScreen(true);
        } catch (error) {
            console.error('Error loading image:', error);
            app.toast(`Could not open "${file.name}": ${error.message || 'unsupported file'}`, 'error');
        }
    }
}

export function importAsLayer() {
    document.getElementById('importLayerInput').click();
}

// Add each file (and each frame) as a new layer, centred on the canvas, keeping its full size
export async function importFilesAsLayers(files, state, app) {
    for (const file of files) {
        try {
            const image = await decodeFile(file);
            const frames = framesOf(image);
            frames.forEach((frame, i) => {
                const name = frames.length > 1 ? `${file.name} - Frame ${i + 1}` : file.name;
                let source = frameToCanvas(frame);
                if (frames.length > 1) {
                    const full = createCanvas(image.width, image.height);
                    const { x, y } = frameOffset(frame);
                    full.getContext('2d').drawImage(source, x, y);
                    source = full;
                }
                addCanvasAsLayer(state, source, name, frameDuration(frame));
            });
            app.refresh();
            app.saveState();
        } catch (error) {
            console.error('Error importing layer:', error);
            app.toast(`Could not import "${file.name}": ${error.message || 'unsupported file'}`, 'error');
        }
    }
}

export function addCanvasAsLayer(state, source, name, duration, x, y) {
    const layer = createLayer(state, name, false, source.width, source.height);
    layer.ctx.drawImage(source, 0, 0);
    layer.offsetX = Math.round(x ?? (state.canvas.width - source.width) / 2);
    layer.offsetY = Math.round(y ?? (state.canvas.height - source.height) / 2);
    if (duration !== undefined) layer.duration = duration;
    return layer;
}

export function saveImage(state) {
    const base = (state.name || 'pura-export').replace(/\.[a-z0-9]+$/i, '');
    const filenameInput = document.getElementById('saveFilename');
    if (!filenameInput.dataset.userEdited) filenameInput.value = base;
    document.getElementById('saveModal').classList.add('active');
}

function buildTiffOptions() {
    const compression = document.getElementById('tiffCompression').value;
    const options = {};
    if (compression && compression !== 'none') options.compression = compression;
    if (document.getElementById('tiffGrayscale').checked) options.grayscale = true;
    else if (document.getElementById('tiffRGB').checked) options.rgb = true;
    return options;
}

function encodeOptions(format, quality) {
    if (format === 'tiff') return buildTiffOptions();
    if (FORMATS[format]?.quality) return { quality: quality / 100 };
    return undefined;
}

// Render one layer at its position into a full-canvas-sized frame
function layerFrame(state, layer) {
    const canvas = createCanvas(state.canvas.width, state.canvas.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.canvas, layer.offsetX || 0, layer.offsetY || 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function encodeImage(state, { format, quality = 90, multiFrame = false, metadata }) {
    const info = FORMATS[format] || FORMATS.png;
    const options = encodeOptions(format, quality);

    if (multiFrame && MULTI_FRAME_FORMATS.includes(format)) {
        const visible = state.layers.filter(l => l.visible);
        if (!visible.length) throw new Error('No visible layers to export');
        const frames = visible.map(layer => {
            const data = layerFrame(state, layer);
            return {
                width: data.width,
                height: data.height,
                data: new Uint8Array(data.data.buffer),
                frameMetadata: { delay: layer.duration }
            };
        });
        const data = await Image.encodeFrames(format, {
            width: state.canvas.width,
            height: state.canvas.height,
            frames,
            metadata
        }, options);
        return { data, ...info };
    }

    const flat = getFlattenedCanvas(state);
    const imageData = flat.getContext('2d').getImageData(0, 0, flat.width, flat.height);
    const image = Image.fromRGBA(flat.width, flat.height, new Uint8Array(imageData.data.buffer));
    if (metadata) image.setMetadata(metadata, false);
    const data = await image.save(format in FORMATS ? format : 'png', options);
    return { data, ...info };
}

export async function applySaveImage(state, hasMetadata, cleanMetadataForExport, closeModal, toast) {
    const button = document.getElementById('applySaveBtn');
    try {
        button.disabled = true;
        button.textContent = 'Saving…';
        const format = document.getElementById('saveFormat').value;
        const filename = document.getElementById('saveFilename').value.trim() || 'pura-export';
        const { data, mime, ext } = await encodeImage(state, {
            format,
            quality: parseInt(document.getElementById('saveQuality').value),
            multiFrame: document.getElementById('saveMultiFrame').checked,
            metadata: hasMetadata(state.metadata) ? cleanMetadataForExport(state.metadata) : undefined
        });

        const url = URL.createObjectURL(new Blob([data], { type: mime }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        state.dirty = false;
        closeModal('saveModal');
        toast?.(`Saved ${filename}.${ext} (${formatBytes(data.length)})`);
    } catch (error) {
        console.error('Error saving image:', error);
        toast?.('Error saving image: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Save';
    }
}

function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
