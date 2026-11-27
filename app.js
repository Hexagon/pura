// Pura - main entry point: wires modules, workspaces, UI and input together
import { MIN_LAYER_DURATION, MULTI_FRAME_FORMATS, OPENABLE_EXTENSIONS } from './js/constants.js';
import { globalState, createWorkspaceState, SHARED_TOOL_SETTINGS } from './js/state.js';
import * as Layers from './js/layers.js';
import * as History from './js/history.js';
import * as UI from './js/ui.js';
import * as Drawing from './js/drawing.js';
import * as FileIO from './js/file-io.js';
import * as Effects from './js/effects.js';
import * as Selection from './js/selection.js';
import * as Metadata from './js/metadata.js';

let state = null;
let clipboard = null; // { canvas, x, y }
let spaceHeld = false;
let panning = null;
let selectionAnimationId = null;
let nudgeSaveTimer = null;

const ZOOM_STEPS = [0.05, 0.1, 0.25, 1 / 3, 0.5, 2 / 3, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];
const SIZE_TOOLS = ['brush', 'eraser'];

const hasWorkspace = () => !!state && globalState.activeWorkspaceId !== 'start' && state.layers.length > 0;
const activeLayer = () => state.layers[state.activeLayerIndex];
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function init() {
    const canvas = document.createElement('canvas');
    const startState = createWorkspaceState(canvas, canvas.getContext('2d', { willReadFrequently: true }));
    globalState.workspaces.set('start', startState);
    state = startState;

    Metadata.initMetadata(() => state);
    populateDynamicControls();
    disableUnsupportedEncoders();
    setupEventListeners();
    UI.restoreUIState();
    setTool(state.tool);
    updateTabBar();
    showStartScreen();
}

function populateDynamicControls() {
    const blend = $('layerBlendMode');
    for (const [value, label] of Layers.BLEND_MODES) {
        blend.add(new Option(label, value));
    }

    const effectButtons = $('effectButtons');
    const addButton = (label, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.textContent = label;
        btn.addEventListener('click', () => { if (hasWorkspace()) onClick(); });
        effectButtons.appendChild(btn);
    };
    for (const [key, effect] of Object.entries(Effects.INSTANT_EFFECTS)) {
        addButton(effect.label, () => runSafely(() => Effects.applyInstantEffect(state, key, composeLayers, saveState)));
    }
    for (const [key, effect] of Object.entries(Effects.EFFECTS)) {
        addButton(`${effect.label}…`, () => {
            Effects.showEffectModal(state, key);
            Effects.updateEffectPreview(composeLayers);
        });
    }
}

// AVIF/HEIC encoding relies on the browser's canvas encoder, which most browsers lack
function disableUnsupportedEncoders() {
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    for (const format of ['avif', 'heic']) {
        probe.toBlob((blob) => {
            if (blob?.type === `image/${format}`) return;
            const option = document.querySelector(`#saveFormat option[value="${format}"]`);
            option.disabled = true;
            option.textContent += ' – not supported by this browser';
        }, `image/${format}`);
    }
}

function runSafely(fn) {
    try {
        fn();
    } catch (error) {
        console.error(error);
        UI.toast(error.message, 'error');
    }
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

function showStartScreen() {
    $('startScreen').style.display = 'flex';
    $('canvasWrapper').style.display = 'none';
    document.body.classList.add('no-workspace');
}

function hideStartScreen() {
    $('startScreen').style.display = 'none';
    $('canvasWrapper').style.display = 'block';
    document.body.classList.remove('no-workspace');
}

function makeOverlay(width, height, className) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.className = `ws-canvas overlay-canvas ${className}`;
    return canvas;
}

function createWorkspace(name, width = 800, height = 600, bgColor = '#FFFFFF') {
    const workspaceId = `workspace-${globalState.nextWorkspaceId++}`;

    const canvas = document.createElement('canvas');
    canvas.className = 'ws-canvas main-canvas';
    canvas.width = width;
    canvas.height = height;

    const ws = createWorkspaceState(canvas, canvas.getContext('2d', { willReadFrequently: true }));
    ws.name = name;
    ws.previewCanvas = makeOverlay(width, height, 'preview-canvas');
    ws.previewCtx = ws.previewCanvas.getContext('2d', { willReadFrequently: true });
    ws.selectionCanvas = makeOverlay(width, height, 'selection-canvas');
    ws.selectionCtx = ws.selectionCanvas.getContext('2d');

    ws.layers.push(Layers.createLayerObject(ws, 'Background', true));
    Layers.fillLayerInWorkspace(ws, 0, bgColor);

    globalState.workspaces.set(workspaceId, ws);
    switchWorkspace(workspaceId);
    saveState();
    ws.dirty = false;
    fitToScreen(true);
    return workspaceId;
}

function switchWorkspace(workspaceId) {
    const next = globalState.workspaces.get(workspaceId);
    if (!next) return;
    if (state?.isDrawing) Drawing.stopDrawing(state, null, drawingApi());

    // Tool settings follow the user across tabs
    if (state && state !== next) {
        for (const key of SHARED_TOOL_SETTINGS) next[key] = state[key];
    }

    globalState.activeWorkspaceId = workspaceId;
    state = next;

    const wrapper = $('canvasWrapper');
    wrapper.querySelectorAll('.ws-canvas').forEach(c => c.remove());

    if (workspaceId === 'start') {
        showStartScreen();
        $('layersPanel').innerHTML = '';
    } else {
        hideStartScreen();
        wrapper.prepend(state.canvas, state.previewCanvas, state.selectionCanvas);
        refresh();
        applyZoom();
        Metadata.updateMetadataTable();
        if (state.selection) startSelectionAnimation();
    }
    updateTabBar();
    updateStatus();
}

function closeWorkspace(workspaceId) {
    if (workspaceId === 'start' || !globalState.workspaces.has(workspaceId)) return;
    const ws = globalState.workspaces.get(workspaceId);
    if (ws.dirty && !confirm(`Close "${ws.name}"? Unsaved changes will be lost.`)) return;

    const ids = Array.from(globalState.workspaces.keys());
    const index = ids.indexOf(workspaceId);
    globalState.workspaces.delete(workspaceId);

    if (globalState.activeWorkspaceId === workspaceId) {
        const remaining = Array.from(globalState.workspaces.keys());
        switchWorkspace(remaining[Math.min(index, remaining.length - 1)] || 'start');
    }
    updateTabBar();
}

function updateTabBar() {
    const tabBar = $('tabBar');
    tabBar.innerHTML = '';

    for (const [workspaceId, ws] of globalState.workspaces.entries()) {
        const isStart = workspaceId === 'start';
        const tab = document.createElement('div');
        tab.className = 'tab' + (isStart ? ' start-tab' : '') + (globalState.activeWorkspaceId === workspaceId ? ' active' : '');
        tab.dataset.tabId = workspaceId;
        tab.title = isStart ? 'Start' : `${ws.name} (${ws.canvas.width} × ${ws.canvas.height})`;

        const tabName = document.createElement('span');
        tabName.className = 'tab-name';
        tabName.textContent = isStart ? 'Start' : `${ws.dirty ? '• ' : ''}${ws.name}`;
        tab.appendChild(tabName);

        if (!isStart) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '×';
            closeBtn.title = 'Close';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeWorkspace(workspaceId);
            });
            tab.appendChild(closeBtn);
            tab.addEventListener('auxclick', (e) => { if (e.button === 1) closeWorkspace(workspaceId); });
        }
        tab.addEventListener('click', () => switchWorkspace(workspaceId));
        tabBar.appendChild(tab);
    }

    document.title = hasWorkspace() ? `${state.dirty ? '• ' : ''}${state.name} – Pura` : 'Pura - Free Online Image Editor';
}

// ---------------------------------------------------------------------------
// Rendering & history
// ---------------------------------------------------------------------------

function syncOverlaySize() {
    for (const overlay of [state.previewCanvas, state.selectionCanvas]) {
        if (overlay && (overlay.width !== state.canvas.width || overlay.height !== state.canvas.height)) {
            overlay.width = state.canvas.width;
            overlay.height = state.canvas.height;
        }
    }
}

function composeLayers() {
    if (!hasWorkspace()) return;
    Layers.composeLayers(state);
    updateLayerBounds();
}

// Full refresh after structural changes (layers added, canvas resized, undo...)
function refresh() {
    if (!hasWorkspace()) return;
    syncOverlaySize();
    composeLayers();
    updateLayersPanel();
    applyZoom();
    UI.updateUI(state);
    updateStatus();
}

function saveState() {
    if (!hasWorkspace()) return;
    const wasDirty = state.dirty;
    History.saveState(state, UI.updateUI);
    updateThumbnails();
    if (wasDirty !== state.dirty) updateTabBar();
}

function afterHistoryChange() {
    stopSelectionAnimation();
    state.selectionCtx?.clearRect(0, 0, state.selectionCanvas.width, state.selectionCanvas.height);
    refresh();
    updateTabBar();
}

function undo() {
    if (hasWorkspace() && History.undo(state)) afterHistoryChange();
}

function redo() {
    if (hasWorkspace() && History.redo(state)) afterHistoryChange();
}

function updateLayerBounds() {
    const el = $('layerBounds');
    const layer = hasWorkspace() ? activeLayer() : null;
    const matchesCanvas = layer && layer.offsetX === 0 && layer.offsetY === 0 &&
        layer.canvas.width === state.canvas.width && layer.canvas.height === state.canvas.height;
    if (!layer || matchesCanvas) {
        el.style.display = 'none';
        return;
    }
    const z = state.zoom;
    el.style.display = 'block';
    el.style.left = `${layer.offsetX * z}px`;
    el.style.top = `${layer.offsetY * z}px`;
    el.style.width = `${layer.canvas.width * z}px`;
    el.style.height = `${layer.canvas.height * z}px`;
}

function updateStatus(pos) {
    if (!hasWorkspace()) {
        $('statusPos').textContent = '–';
        $('statusSize').textContent = '–';
        $('statusSelection').textContent = '';
        $('statusLayer').textContent = '';
        return;
    }
    if (pos) $('statusPos').textContent = `${Math.floor(pos.x)}, ${Math.floor(pos.y)}`;
    $('statusSize').textContent = `${state.canvas.width} × ${state.canvas.height} px`;
    const s = state.selection;
    $('statusSelection').textContent = s ? `Selection ${s.width} × ${s.height} @ ${s.x}, ${s.y}` : '';
    const layer = activeLayer();
    $('statusLayer').textContent = `Layer: ${layer.name}`;
}

// ---------------------------------------------------------------------------
// Layers panel
// ---------------------------------------------------------------------------

function updateLayersPanel() {
    const panel = $('layersPanel');
    panel.innerHTML = '';
    if (!hasWorkspace()) return;

    state.layers.forEach((layer, index) => {
        const item = document.createElement('div');
        item.className = 'layer-item' + (index === state.activeLayerIndex ? ' active' : '') + (layer.visible ? '' : ' hidden-layer');
        item.dataset.layerIndex = index;
        item.draggable = true;

        const eye = document.createElement('button');
        eye.className = 'layer-visibility';
        eye.innerHTML = `<svg class="icon"><use href="#i-${layer.visible ? 'eye' : 'eye-off'}"/></svg>`;
        eye.title = layer.visible ? 'Hide layer' : 'Show layer';
        eye.addEventListener('click', (e) => {
            e.stopPropagation();
            Layers.toggleLayerVisibility(state, index);
            composeLayers();
            updateLayersPanel();
            saveState();
        });

        const thumb = document.createElement('canvas');
        thumb.className = 'layer-thumb';
        thumb.width = 40;
        thumb.height = 30;
        Layers.drawThumbnail(layer, thumb);

        const info = document.createElement('div');
        info.className = 'layer-info';

        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = layer.name;
        name.title = 'Double-click to rename';
        name.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startRename(name, index);
        });

        const meta = document.createElement('span');
        meta.className = 'layer-meta';
        const blendLabel = Layers.BLEND_MODES.find(([v]) => v === layer.blendMode)?.[1] || 'Normal';
        const opacity = document.createElement('span');
        opacity.textContent = `${Math.round(layer.opacity * 100)}%${blendLabel !== 'Normal' ? ' · ' + blendLabel : ''}`;
        const duration = document.createElement('span');
        duration.className = 'layer-duration';
        duration.textContent = `${layer.duration}ms`;
        duration.title = 'Frame duration – click to edit';
        duration.addEventListener('click', (e) => {
            e.stopPropagation();
            showLayerDurationModal(index);
        });
        meta.append(opacity, duration);

        info.append(name, meta);
        item.append(eye, thumb, info);

        item.addEventListener('click', () => setActiveLayer(index));
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-pura-layer', String(index));
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));
        item.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('application/x-pura-layer')) {
                e.preventDefault();
                item.classList.add('drag-over');
            }
        });
        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
        item.addEventListener('drop', (e) => {
            const from = e.dataTransfer.getData('application/x-pura-layer');
            if (from === '') return;
            e.preventDefault();
            e.stopPropagation();
            if (Layers.moveLayer(state, Number(from), index)) {
                refresh();
                saveState();
            }
        });

        panel.appendChild(item);
    });

    const layer = activeLayer();
    $('layerBlendMode').value = layer.blendMode || 'source-over';
    $('layerOpacity').value = Math.round(layer.opacity * 100);
    $('layerOpacityValue').textContent = Math.round(layer.opacity * 100);
    $('layerUpBtn').disabled = state.activeLayerIndex >= state.layers.length - 1;
    $('layerDownBtn').disabled = state.activeLayerIndex <= 0;
    $('mergeLayersBtn').disabled = state.activeLayerIndex <= 0;
    $('deleteLayerBtn').disabled = state.layers.length <= 1;
    $('flattenBtn').disabled = state.layers.length <= 1;
}

function updateThumbnails() {
    document.querySelectorAll('#layersPanel .layer-item').forEach(item => {
        const layer = state.layers[Number(item.dataset.layerIndex)];
        const thumb = item.querySelector('.layer-thumb');
        if (layer && thumb) Layers.drawThumbnail(layer, thumb);
    });
}

function startRename(nameEl, index) {
    const input = document.createElement('input');
    input.className = 'layer-rename';
    input.value = state.layers[index].name;
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (commit) => {
        if (done) return;
        done = true;
        const value = input.value.trim();
        if (commit && value && value !== state.layers[index].name) {
            state.layers[index].name = value;
            saveState();
        }
        updateLayersPanel();
        updateStatus();
    };
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
        e.stopPropagation();
    });
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('click', e => e.stopPropagation());
}

function setActiveLayer(index) {
    if (index === state.activeLayerIndex) return;
    Layers.setActiveLayer(state, index);
    deselect();
    updateLayersPanel();
    updateLayerBounds();
    updateStatus();
}

function layerAction(fn) {
    if (!hasWorkspace()) return;
    if (fn() !== false) {
        deselect();
        refresh();
        saveState();
    }
}

const addLayer = () => layerAction(() => Layers.createLayer(state));
const duplicateLayer = () => layerAction(() => Layers.duplicateLayer(state, state.activeLayerIndex));
const moveLayerUp = () => layerAction(() => Layers.moveLayer(state, state.activeLayerIndex, state.activeLayerIndex + 1));
const moveLayerDown = () => layerAction(() => Layers.moveLayer(state, state.activeLayerIndex, state.activeLayerIndex - 1));
const mergeDown = () => layerAction(() => Layers.mergeDown(state));
const flatten = () => layerAction(() => state.layers.length > 1 && (Layers.flattenLayers(state), true));
function deleteActiveLayer() {
    if (!hasWorkspace()) return;
    if (state.layers.length <= 1) {
        UI.toast('An image needs at least one layer');
        return;
    }
    layerAction(() => Layers.deleteLayer(state, state.activeLayerIndex));
}

function showLayerDurationModal(index) {
    state.tempLayerIndex = index;
    $('layerDurationInput').value = state.layers[index].duration;
    $('layerDurationAll').checked = false;
    UI.showModal('layerDurationModal');
}

function applyLayerDuration() {
    const duration = parseInt($('layerDurationInput').value);
    if (!(duration >= MIN_LAYER_DURATION)) {
        UI.toast(`Duration must be at least ${MIN_LAYER_DURATION} ms`, 'error');
        return;
    }
    const targets = $('layerDurationAll').checked ? state.layers : [state.layers[state.tempLayerIndex]];
    targets.forEach(layer => { layer.duration = duration; });
    updateLayersPanel();
    saveState();
    UI.closeModal('layerDurationModal');
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function setTool(tool) {
    if (state.isDrawing) return;
    state.tool = tool;
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    document.querySelectorAll('.tool-options-group[data-for]').forEach(group => {
        group.style.display = group.dataset.for.split(' ').includes(tool) ? 'flex' : 'none';
    });
    const button = document.querySelector(`[data-tool="${tool}"]`);
    $('optionsToolName').textContent = button ? button.title.split(' (')[0] : tool;
    $('canvasWrapper').dataset.tool = tool;
    const hints = {
        pointer: 'Click a pixel to activate the layer it belongs to',
        move: 'Drag to move the layer (or the selection). Arrow keys nudge.',
        rectSelect: 'Drag to select. Shift = square. Click to deselect.',
        freeformSelect: 'Drag a freehand outline to select',
        brush: 'Alt+click to pick a colour. [ and ] change size.',
        eraser: '[ and ] change size',
        fill: 'Click to flood fill. Alt+click to pick a colour.',
        gradient: 'Drag from foreground to background colour',
        rect: 'Shift = square, Alt = from centre',
        circle: 'Shift = circle, Alt = from centre',
        line: 'Shift snaps to 45°',
        text: 'Click where the text should start',
        eyedropper: 'Click to pick foreground, Alt+click for background'
    };
    $('statusHint').textContent = hints[tool] || '';
}

function syncToolSettingsUI() {
    $('brushSize').value = state.brushSize;
    $('brushSizeValue').textContent = state.brushSize;
    $('foregroundColor').value = state.foregroundColor.toLowerCase();
    $('backgroundColor').value = state.backgroundColor.toLowerCase();
}

function setColor(hex, background = false) {
    state[background ? 'backgroundColor' : 'foregroundColor'] = hex;
    syncToolSettingsUI();
}

function swapColors() {
    [state.foregroundColor, state.backgroundColor] = [state.backgroundColor, state.foregroundColor];
    syncToolSettingsUI();
}

function resetColors() {
    state.foregroundColor = '#000000';
    state.backgroundColor = '#ffffff';
    syncToolSettingsUI();
}

function setBrushSize(size) {
    state.brushSize = Math.max(1, Math.min(200, Math.round(size)));
    syncToolSettingsUI();
    updateBrushCursor();
}

function drawingApi() {
    return {
        composeLayers,
        saveState,
        pickColor: setColor,
        selectLayer: setActiveLayer,
        selectionChanged: () => {
            if (state.selection) startSelectionAnimation();
            else stopSelectionAnimation();
            updateStatus();
        },
        requestText: (pos) => {
            state.pendingTextPosition = pos;
            $('textInput').value = '';
            UI.showModal('textModal');
        },
        layerMoved: () => updateStatus()
    };
}

// ---------------------------------------------------------------------------
// Pointer input on the canvas
// ---------------------------------------------------------------------------

let lastPointer = null;

function onPointerDown(e) {
    if (!hasWorkspace()) return;
    const container = $('canvasContainer');
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
        e.preventDefault();
        panning = { x: e.clientX, y: e.clientY, left: container.scrollLeft, top: container.scrollTop };
        $('canvasWrapper').setPointerCapture(e.pointerId);
        $('canvasWrapper').classList.add('panning');
        return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    $('canvasWrapper').setPointerCapture(e.pointerId);
    Drawing.startDrawing(state, e, drawingApi());
}

function onPointerMove(e) {
    if (!hasWorkspace()) return;
    lastPointer = { clientX: e.clientX, clientY: e.clientY };
    if (panning) {
        const container = $('canvasContainer');
        container.scrollLeft = panning.left - (e.clientX - panning.x);
        container.scrollTop = panning.top - (e.clientY - panning.y);
        return;
    }
    const pos = Drawing.getMousePos(state, e);
    updateStatus(pos);
    updateBrushCursor();
    // Coalesced events give smoother strokes on fast pointer movement
    const events = state.isDrawing && e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (events.length ? events : [e])) {
        Drawing.draw(state, ev, drawingApi());
    }
}

function onPointerUp(e) {
    if (panning) {
        panning = null;
        $('canvasWrapper').classList.remove('panning');
        return;
    }
    if (!hasWorkspace() || !state.isDrawing) return;
    Drawing.stopDrawing(state, e, drawingApi());
    updateStatus();
}

function updateBrushCursor() {
    const cursor = $('brushCursor');
    if (!hasWorkspace() || !lastPointer || !SIZE_TOOLS.includes(state.tool) || spaceHeld) {
        cursor.style.display = 'none';
        return;
    }
    const rect = $('canvasWrapper').getBoundingClientRect();
    const size = state.brushSize * state.zoom;
    cursor.style.display = size >= 4 ? 'block' : 'none';
    cursor.style.width = cursor.style.height = `${size}px`;
    cursor.style.left = `${lastPointer.clientX - rect.left - size / 2}px`;
    cursor.style.top = `${lastPointer.clientY - rect.top - size / 2}px`;
}

// ---------------------------------------------------------------------------
// Zoom
// ---------------------------------------------------------------------------

function applyZoom() {
    if (!hasWorkspace()) return;
    const w = `${state.canvas.width * state.zoom}px`;
    const h = `${state.canvas.height * state.zoom}px`;
    for (const c of [state.canvas, state.previewCanvas, state.selectionCanvas]) {
        c.style.width = w;
        c.style.height = h;
    }
    $('canvasWrapper').classList.toggle('pixelated', state.zoom >= 2);
    $('zoomLevel').textContent = `${Math.round(state.zoom * 100)}%`;
    updateLayerBounds();
}

// Zoom keeping the image point under (clientX, clientY) fixed on screen
function zoomTo(zoom, clientX, clientY) {
    if (!hasWorkspace()) return;
    const container = $('canvasContainer');
    const crect = container.getBoundingClientRect();
    clientX ??= crect.left + crect.width / 2;
    clientY ??= crect.top + crect.height / 2;
    const before = state.canvas.getBoundingClientRect();
    const px = (clientX - before.left) / state.zoom;
    const py = (clientY - before.top) / state.zoom;

    state.zoom = Math.max(state.zoomMin, Math.min(state.zoomMax, zoom));
    applyZoom();

    const after = state.canvas.getBoundingClientRect();
    container.scrollLeft += after.left + px * state.zoom - clientX;
    container.scrollTop += after.top + py * state.zoom - clientY;
    updateBrushCursor();
}

function zoomStep(direction, clientX, clientY) {
    const z = state.zoom;
    const next = direction > 0
        ? ZOOM_STEPS.find(s => s > z + 1e-6) ?? state.zoomMax
        : [...ZOOM_STEPS].reverse().find(s => s < z - 1e-6) ?? state.zoomMin;
    zoomTo(next, clientX, clientY);
}

function fitToScreen(onlyShrink = false) {
    if (!hasWorkspace()) return;
    const container = $('canvasContainer');
    const availW = container.clientWidth - 40;
    const availH = container.clientHeight - 40;
    let zoom = Math.min(availW / state.canvas.width, availH / state.canvas.height);
    if (onlyShrink) zoom = Math.min(1, zoom);
    state.zoom = Math.max(state.zoomMin, Math.min(state.zoomMax, zoom));
    applyZoom();
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function selectAll() {
    if (!hasWorkspace()) return;
    Selection.selectAll(state);
    startSelectionAnimation();
    updateStatus();
}

function deselect() {
    if (!hasWorkspace()) return;
    Selection.clearSelection(state);
    stopSelectionAnimation();
    updateStatus();
}

function deleteSelection() {
    if (!hasWorkspace() || !state.selection) return;
    Selection.deleteSelection(state, composeLayers, saveState);
}

function fillSelectionWithForeground() {
    if (!hasWorkspace()) return;
    if (!state.selection) {
        UI.toast('Make a selection first');
        return;
    }
    Selection.fillSelection(state, state.foregroundColor, composeLayers, saveState);
}

function startSelectionAnimation() {
    if (selectionAnimationId) return;
    const animate = (timestamp) => {
        if (hasWorkspace() && state.selection) {
            Selection.drawSelectionOutline(state, timestamp);
            selectionAnimationId = requestAnimationFrame(animate);
        } else {
            selectionAnimationId = null;
        }
    };
    selectionAnimationId = requestAnimationFrame(animate);
}

function stopSelectionAnimation() {
    if (selectionAnimationId) cancelAnimationFrame(selectionAnimationId);
    selectionAnimationId = null;
    if (state?.selectionCtx) state.selectionCtx.clearRect(0, 0, state.selectionCanvas.width, state.selectionCanvas.height);
}

// Arrow-key nudging with the move tool
function nudge(dx, dy) {
    const layer = activeLayer();
    if (state.selection) {
        const floating = Selection.getSelectionCanvas(state, layer);
        Selection.eraseSelectionArea(state, layer);
        layer.ctx.drawImage(floating, state.selection.x + dx, state.selection.y + dy);
        Selection.translateSelection(state, dx, dy);
        Selection.refreshSelectionPixels(state);
    } else {
        layer.offsetX += dx;
        layer.offsetY += dy;
    }
    composeLayers();
    updateStatus();
    clearTimeout(nudgeSaveTimer);
    nudgeSaveTimer = setTimeout(saveState, 400);
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

async function copy(cut = false) {
    if (!hasWorkspace()) return;
    const layer = activeLayer();
    let canvas, x, y;
    if (state.selection) {
        canvas = Selection.getSelectionCanvas(state, layer);
        x = state.selection.x + layer.offsetX;
        y = state.selection.y + layer.offsetY;
    } else {
        canvas = Layers.cloneCanvas(layer.canvas);
        x = layer.offsetX;
        y = layer.offsetY;
    }
    clipboard = { canvas, x, y };

    if (cut) {
        if (state.selection) Selection.eraseSelectionArea(state, layer);
        else layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        composeLayers();
        saveState();
    }

    // Mirror to the system clipboard when the browser allows it
    try {
        if (navigator.clipboard?.write && window.ClipboardItem) {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        }
    } catch {
        // Internal clipboard still works
    }
    UI.toast(cut ? 'Cut to clipboard' : 'Copied to clipboard');
}

async function pasteImageFile(file, internalMatch) {
    const bitmap = await createImageBitmap(file);
    const canvas = Layers.createCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    // Prefer our own clipboard when it holds the same image, so the position is kept
    if (internalMatch && clipboard && clipboard.canvas.width === bitmap.width && clipboard.canvas.height === bitmap.height) {
        pasteCanvas(clipboard.canvas, clipboard.x, clipboard.y);
        return;
    }
    if (!hasWorkspace()) {
        createWorkspace('Pasted image', bitmap.width, bitmap.height, 'transparent');
        activeLayer().ctx.drawImage(canvas, 0, 0);
        activeLayer().name = 'Pasted';
        refresh();
        saveState();
        state.dirty = true;
        updateTabBar();
        return;
    }
    pasteCanvas(canvas);
}

function pasteCanvas(canvas, x, y) {
    if (!hasWorkspace()) return;
    deselect();
    FileIO.addCanvasAsLayer(state, canvas, 'Pasted', undefined, x, y);
    refresh();
    saveState();
}

async function pasteFromButton() {
    try {
        if (navigator.clipboard?.read) {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const type = item.types.find(t => t.startsWith('image/'));
                if (type) {
                    await pasteImageFile(await item.getType(type), true);
                    return;
                }
            }
        }
    } catch {
        // Fall back to the internal clipboard
    }
    if (clipboard) pasteCanvas(clipboard.canvas, clipboard.x, clipboard.y);
    else UI.toast('Clipboard has no image');
}

function onPaste(e) {
    if (isTypingTarget(e.target)) return;
    const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
    e.preventDefault();
    if (file) {
        pasteImageFile(file, true).catch(err => UI.toast('Paste failed: ' + err.message, 'error'));
    } else if (clipboard) {
        pasteCanvas(clipboard.canvas, clipboard.x, clipboard.y);
    }
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

function fileApp() {
    return {
        createWorkspace,
        getState: () => state,
        mergeMetadata: Metadata.mergeMetadata,
        refresh: () => {
            refresh();
            Metadata.updateMetadataTable();
            updateTabBar();
        },
        saveState,
        fitToScreen,
        toast: UI.toast
    };
}

function openFiles(files) {
    return FileIO.openFiles(Array.from(files), fileApp());
}

function importFiles(files) {
    if (!hasWorkspace()) return openFiles(files);
    deselect();
    return FileIO.importFilesAsLayers(Array.from(files), state, fileApp());
}

function showSaveDialog() {
    if (!hasWorkspace()) return;
    FileIO.saveImage(state);
    updateSaveOptions();
}

function updateSaveOptions() {
    const format = $('saveFormat').value;
    $('qualityLabel').style.display = FileIO.FORMATS[format]?.quality ? 'block' : 'none';
    $('tiffOptions').style.display = format === 'tiff' ? 'block' : 'none';
    const multi = MULTI_FRAME_FORMATS.includes(format) && hasWorkspace() && state.layers.length > 1;
    $('multiFrameLabel').style.display = multi ? 'block' : 'none';
}

async function applySave() {
    await FileIO.applySaveImage(state, Metadata.hasMetadata, Metadata.cleanMetadataForExport, UI.closeModal, UI.toast);
    updateTabBar();
}

function showNewImageDialog() {
    UI.showModal('newImageModal');
}

function applyNewImage() {
    const width = parseInt($('newWidth').value);
    const height = parseInt($('newHeight').value);
    if (!(width > 0 && height > 0 && width <= 16384 && height <= 16384)) {
        UI.toast('Width and height must be between 1 and 16384', 'error');
        return;
    }
    const bg = $('newTransparent').checked ? 'transparent' : $('newBgColor').value;
    UI.closeModal('newImageModal');
    createWorkspace(`Untitled-${globalState.nextWorkspaceId}`, width, height, bg);
}

// ---------------------------------------------------------------------------
// Image operations
// ---------------------------------------------------------------------------

function imageOp(fn) {
    if (!hasWorkspace()) return;
    runSafely(() => {
        if (fn() === false) return;
        stopSelectionAnimation();
        refresh();
        saveState();
        updateTabBar();
    });
}

function cropToSelection() {
    if (!hasWorkspace()) return;
    if (!state.selection) {
        UI.toast('Make a selection to crop to');
        return;
    }
    imageOp(() => Effects.cropToSelection(state));
}

function showImageDimensionsModal() {
    if (!hasWorkspace()) return;
    $('imageDimWidth').value = state.canvas.width;
    $('imageDimHeight').value = state.canvas.height;
    $('imageDimensionsModal').dataset.aspect = state.canvas.width / state.canvas.height;
    $('imageDimAnchorLabel').style.display = $('imageDimMode').value === 'canvas' ? 'block' : 'none';
    UI.showModal('imageDimensionsModal');
}

function applyImageDimensions() {
    const width = parseInt($('imageDimWidth').value);
    const height = parseInt($('imageDimHeight').value);
    if (!(width > 0 && height > 0 && width <= 16384 && height <= 16384)) {
        UI.toast('Width and height must be between 1 and 16384', 'error');
        return;
    }
    const mode = $('imageDimMode').value;
    const [ax, ay] = $('imageDimAnchor').value.split(',').map(Number);
    UI.closeModal('imageDimensionsModal');
    imageOp(() => {
        if (width === state.canvas.width && height === state.canvas.height) return false;
        if (mode === 'scale') {
            Effects.scaleImage(state, width, height);
        } else {
            const dx = Math.round((width - state.canvas.width) * ax);
            const dy = Math.round((height - state.canvas.height) * ay);
            Selection.clearSelection(state);
            Effects.resizeCanvasAll(state, width, height, dx, dy);
        }
    });
}

function linkAspect(widthId, heightId, checkboxId, modalId) {
    const w = $(widthId);
    const h = $(heightId);
    const ratio = () => Number($(modalId).dataset.aspect) || 1;
    w.addEventListener('input', () => {
        if ($(checkboxId).checked && w.value) h.value = Math.max(1, Math.round(w.value / ratio()));
    });
    h.addEventListener('input', () => {
        if ($(checkboxId).checked && h.value) w.value = Math.max(1, Math.round(h.value * ratio()));
    });
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' && !['checkbox', 'range', 'color', 'button'].includes(el.type) ||
        el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

const MODAL_CANCEL = {
    effectModal: () => Effects.cancelEffect(composeLayers, UI.closeModal),
    textModal: () => { UI.closeModal('textModal'); state.pendingTextPosition = null; }
};

function handleModalKeys(e, modal) {
    if (e.key === 'Escape') {
        e.preventDefault();
        (MODAL_CANCEL[modal.id] || (() => UI.closeModal(modal.id)))();
    } else if (e.key === 'Enter' && !(e.target.tagName === 'TEXTAREA' && e.shiftKey) && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        modal.querySelector('.modal-buttons button')?.click();
    }
}

const TOOL_KEYS = { a: 'pointer', v: 'move', m: 'rectSelect', l: 'freeformSelect', b: 'brush', e: 'eraser', g: 'fill', u: 'rect', o: 'circle', n: 'line', t: 'text', i: 'eyedropper' };

function onKeyDown(e) {
    const modal = UI.getOpenModal();
    if (modal) {
        handleModalKeys(e, modal);
        return;
    }
    if (isTypingTarget(e.target)) return;

    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    if (mod) {
        const actions = {
            z: () => (e.shiftKey ? redo() : undo()),
            y: redo,
            s: showSaveDialog,
            o: () => (e.shiftKey ? FileIO.importAsLayer() : FileIO.openImage()),
            a: selectAll,
            d: deselect,
            c: () => copy(false),
            x: () => (e.shiftKey ? cropToSelection() : copy(true)),
            j: duplicateLayer,
            e: () => (e.shiftKey ? flatten() : mergeDown()),
            ']': moveLayerUp,
            '[': moveLayerDown,
            '=': () => zoomStep(1),
            '+': () => zoomStep(1),
            '-': () => zoomStep(-1),
            '0': () => fitToScreen(),
            '1': () => zoomTo(1)
        };
        // Let the browser deliver a real paste event (handled in onPaste)
        if (key === 'v') return;
        if (actions[key]) {
            e.preventDefault();
            actions[key]();
        }
        return;
    }

    if (e.altKey) {
        if (key === 'n') {
            e.preventDefault();
            showNewImageDialog();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            fillSelectionWithForeground();
        }
        return;
    }

    if (e.key === ' ') {
        e.preventDefault();
        if (!spaceHeld) {
            spaceHeld = true;
            $('canvasWrapper').classList.add('pan-ready');
            updateBrushCursor();
        }
        return;
    }

    if (e.key === 'Escape') {
        deselect();
        return;
    }
    if (e.key === '?') {
        UI.showModal('shortcutsModal');
        return;
    }
    if (!hasWorkspace() && !TOOL_KEYS[key] && !'xd'.includes(key)) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && hasWorkspace()) {
        e.preventDefault();
        deleteSelection();
        return;
    }

    if (e.key.startsWith('Arrow') && state.tool === 'move' && hasWorkspace()) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        nudge(...delta);
        return;
    }

    if (key === 'g' && e.shiftKey) return setTool('gradient');
    if (key === 'n' && e.shiftKey) return addLayer();
    if (TOOL_KEYS[key] && !e.shiftKey) return setTool(TOOL_KEYS[key]);
    if (key === 'x') return swapColors();
    if (key === 'd') return resetColors();
    if (e.key === '[') return setBrushSize(state.brushSize > 10 ? state.brushSize * 0.8 : state.brushSize - 1);
    if (e.key === ']') return setBrushSize(state.brushSize >= 10 ? state.brushSize * 1.25 : state.brushSize + 1);
}

function onKeyUp(e) {
    if (e.key === ' ') {
        spaceHeld = false;
        $('canvasWrapper').classList.remove('pan-ready');
        updateBrushCursor();
    }
}

// ---------------------------------------------------------------------------
// Drag & drop of files
// ---------------------------------------------------------------------------

function setupFileDrop() {
    let depth = 0;
    const overlay = $('dropOverlay');
    const hasFiles = e => e.dataTransfer?.types?.includes('Files');

    document.addEventListener('dragenter', (e) => {
        if (!hasFiles(e)) return;
        depth++;
        overlay.classList.add('active');
    });
    document.addEventListener('dragleave', (e) => {
        if (!hasFiles(e)) return;
        depth = Math.max(0, depth - 1);
        if (!depth) overlay.classList.remove('active');
    });
    document.addEventListener('dragover', (e) => {
        if (hasFiles(e)) e.preventDefault();
    });
    document.addEventListener('drop', (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth = 0;
        overlay.classList.remove('active');
        const extensions = OPENABLE_EXTENSIONS.split(',');
        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('image/') || extensions.some(ext => f.name.toLowerCase().endsWith(ext)));
        if (!files.length) return;
        if (e.shiftKey && hasWorkspace()) importFiles(files);
        else openFiles(files);
    });
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function on(id, event, handler) {
    $(id).addEventListener(event, handler);
}

function setupEventListeners() {
    const wrapper = $('canvasWrapper');
    wrapper.addEventListener('pointerdown', onPointerDown);
    wrapper.addEventListener('pointermove', onPointerMove);
    wrapper.addEventListener('pointerup', onPointerUp);
    wrapper.addEventListener('pointercancel', onPointerUp);
    wrapper.addEventListener('pointerleave', () => {
        lastPointer = null;
        updateBrushCursor();
    });
    wrapper.addEventListener('contextmenu', e => e.preventDefault());

    $('canvasContainer').addEventListener('wheel', (e) => {
        if (!hasWorkspace() || !(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        zoomTo(state.zoom * factor, e.clientX, e.clientY);
    }, { passive: false });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => onKeyUp({ key: ' ' }));
    document.addEventListener('paste', onPaste);
    window.addEventListener('resize', updateLayerBounds);
    window.addEventListener('beforeunload', (e) => {
        if ([...globalState.workspaces.values()].some(ws => ws.dirty)) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
    setupFileDrop();

    // Start screen & file
    on('startNewBtn', 'click', showNewImageDialog);
    on('startOpenBtn', 'click', FileIO.openImage);
    on('newBtn', 'click', showNewImageDialog);
    on('openBtn', 'click', FileIO.openImage);
    on('importLayerBtn', 'click', () => hasWorkspace() && FileIO.importAsLayer());
    on('saveBtn', 'click', showSaveDialog);
    on('fileInput', 'change', async (e) => {
        await openFiles(e.target.files);
        e.target.value = '';
    });
    on('importLayerInput', 'change', async (e) => {
        await importFiles(e.target.files);
        e.target.value = '';
    });

    // Edit
    on('undoBtn', 'click', undo);
    on('redoBtn', 'click', redo);
    on('copyBtn', 'click', () => copy(false));
    on('pasteBtn', 'click', pasteFromButton);
    on('cropBtn', 'click', cropToSelection);
    on('shortcutsBtn', 'click', () => UI.showModal('shortcutsModal'));
    on('closeShortcutsBtn', 'click', () => UI.closeModal('shortcutsModal'));

    // Zoom
    on('zoomInBtn', 'click', () => zoomStep(1));
    on('zoomOutBtn', 'click', () => zoomStep(-1));
    on('zoomResetBtn', 'click', () => zoomTo(1));
    on('zoomFitBtn', 'click', () => fitToScreen());

    // Tools
    document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });
    on('selectAllBtn', 'click', selectAll);
    on('deselectBtn', 'click', deselect);
    on('swapColorsBtn', 'click', swapColors);
    on('resetColorsBtn', 'click', resetColors);

    on('foregroundColor', 'input', e => { state.foregroundColor = e.target.value; });
    on('backgroundColor', 'input', e => { state.backgroundColor = e.target.value; });
    on('brushSize', 'input', e => setBrushSize(parseInt(e.target.value)));
    on('opacity', 'input', (e) => {
        state.opacity = parseInt(e.target.value) / 100;
        $('opacityValue').textContent = e.target.value;
    });
    on('fillTolerance', 'input', (e) => {
        state.fillTolerance = parseInt(e.target.value);
        $('fillToleranceValue').textContent = state.fillTolerance;
    });
    on('gradientType', 'change', e => { state.gradientType = e.target.value; });
    on('shapeFill', 'change', e => { state.shapeFill = e.target.value; });
    on('fontSize', 'input', (e) => {
        state.fontSize = parseInt(e.target.value);
        $('fontSizeValue').textContent = state.fontSize;
    });
    on('fontFamily', 'change', e => { state.fontFamily = e.target.value; });
    on('fontBold', 'change', e => { state.fontBold = e.target.checked; });
    on('fontItalic', 'change', e => { state.fontItalic = e.target.checked; });

    // Text dialog
    on('applyTextBtn', 'click', () => {
        const text = $('textInput').value;
        UI.closeModal('textModal');
        if (hasWorkspace() && text.trim() && state.pendingTextPosition) {
            const { x, y } = state.pendingTextPosition;
            Drawing.renderText(state, text, x, y, composeLayers, saveState);
        }
        state.pendingTextPosition = null;
    });
    on('cancelTextBtn', 'click', MODAL_CANCEL.textModal);

    // Layers
    on('addLayerBtn', 'click', addLayer);
    on('duplicateLayerBtn', 'click', duplicateLayer);
    on('layerUpBtn', 'click', moveLayerUp);
    on('layerDownBtn', 'click', moveLayerDown);
    on('mergeLayersBtn', 'click', mergeDown);
    on('flattenBtn', 'click', flatten);
    on('deleteLayerBtn', 'click', deleteActiveLayer);
    on('layerBlendMode', 'change', (e) => {
        if (!hasWorkspace()) return;
        activeLayer().blendMode = e.target.value;
        composeLayers();
        updateLayersPanel();
        saveState();
    });
    on('layerOpacity', 'input', (e) => {
        if (!hasWorkspace()) return;
        activeLayer().opacity = parseInt(e.target.value) / 100;
        $('layerOpacityValue').textContent = e.target.value;
        composeLayers();
    });
    on('layerOpacity', 'change', () => {
        if (!hasWorkspace()) return;
        updateLayersPanel();
        saveState();
    });
    on('applyLayerDurationBtn', 'click', applyLayerDuration);
    on('cancelLayerDurationBtn', 'click', () => UI.closeModal('layerDurationModal'));

    // Image & layer transforms
    on('imageDimensionsBtn', 'click', showImageDimensionsModal);
    on('cropSelectionBtn', 'click', cropToSelection);
    document.querySelectorAll('[data-image-transform]').forEach(btn => {
        btn.addEventListener('click', () => imageOp(() => Effects.transformImage(state, btn.dataset.imageTransform)));
    });
    document.querySelectorAll('[data-layer-transform]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!hasWorkspace()) return;
            stopSelectionAnimation();
            Effects.transformLayer(state, btn.dataset.layerTransform, composeLayers, saveState);
            refresh();
        });
    });
    on('resizeBtn', 'click', () => hasWorkspace() && (Effects.resizeLayer(state), UI.showModal('resizeModal')));
    on('applyResizeBtn', 'click', () => {
        stopSelectionAnimation();
        Effects.applyResize(state, composeLayers, saveState, UI.closeModal);
        refresh();
    });
    on('cancelResizeBtn', 'click', () => UI.closeModal('resizeModal'));
    linkAspect('resizeWidth', 'resizeHeight', 'maintainAspect', 'resizeModal');
    linkAspect('imageDimWidth', 'imageDimHeight', 'imageDimAspect', 'imageDimensionsModal');
    on('imageDimMode', 'change', (e) => {
        $('imageDimAnchorLabel').style.display = e.target.value === 'canvas' ? 'block' : 'none';
    });
    on('applyImageDimensionsBtn', 'click', applyImageDimensions);
    on('cancelImageDimensionsBtn', 'click', () => UI.closeModal('imageDimensionsModal'));

    // Effects dialog
    on('effectSlider', 'input', () => Effects.updateEffectPreview(composeLayers));
    on('effectPreview', 'change', () => Effects.updateEffectPreview(composeLayers));
    on('applyEffectBtn', 'click', () => Effects.applyEffect(state, composeLayers, saveState, UI.closeModal));
    on('cancelEffectBtn', 'click', MODAL_CANCEL.effectModal);

    // New image dialog
    on('newPreset', 'change', (e) => {
        if (!e.target.value) return;
        const [w, h] = e.target.value.split('x');
        $('newWidth').value = w;
        $('newHeight').value = h;
    });
    for (const id of ['newWidth', 'newHeight']) on(id, 'input', () => { $('newPreset').value = ''; });
    on('newTransparent', 'change', e => { $('newBgColor').disabled = e.target.checked; });
    on('createNewBtn', 'click', applyNewImage);
    on('cancelNewBtn', 'click', () => UI.closeModal('newImageModal'));

    // Save dialog
    on('saveFormat', 'change', updateSaveOptions);
    on('saveQuality', 'input', e => { $('qualityValue').textContent = e.target.value; });
    on('saveFilename', 'input', e => { e.target.dataset.userEdited = '1'; });
    on('applySaveBtn', 'click', applySave);
    on('cancelSaveBtn', 'click', () => UI.closeModal('saveModal'));

    // Metadata
    on('addMetadataFieldBtn', 'click', () => hasWorkspace() && Metadata.showAddMetadataFieldModal());
    on('applyAddMetadataFieldBtn', 'click', Metadata.applyAddMetadataField);
    on('cancelAddMetadataFieldBtn', 'click', () => UI.closeModal('addMetadataFieldModal'));

    // Panels & sidebars
    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('click', () => UI.togglePanelSection(header.dataset.panel));
    });
    on('rightCollapseToggle', 'click', () => UI.toggleSidebar('rightSidebar'));

    // Clicking the dimmed backdrop closes a dialog
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('mousedown', (e) => {
            if (e.target === modal) (MODAL_CANCEL[modal.id] || (() => UI.closeModal(modal.id)))();
        });
    });
}

init();
