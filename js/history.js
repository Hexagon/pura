// History Management Module (Undo/Redo)
import { cloneCanvas } from './layers.js';

function snapshotLayer(layer) {
    return {
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode || 'source-over',
        isBackground: layer.isBackground,
        duration: layer.duration,
        offsetX: layer.offsetX || 0,
        offsetY: layer.offsetY || 0,
        imageData: cloneCanvas(layer.canvas)
    };
}

export function saveState(state, updateUIFn) {
    if (!state || !state.layers.length) return;

    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push({
        layers: state.layers.map(snapshotLayer),
        activeLayerIndex: state.activeLayerIndex,
        canvasWidth: state.canvas.width,
        canvasHeight: state.canvas.height
    });

    if (state.history.length > state.maxHistory) {
        state.history.shift();
    }
    state.historyIndex = state.history.length - 1;
    state.dirty = state.history.length > 1;

    if (updateUIFn) updateUIFn(state);
}

export function undo(state, updateLayersPanelFn, composeLayersFn, updateUIFn) {
    if (!state || state.historyIndex <= 0) return false;
    state.historyIndex--;
    restoreState(state, state.history[state.historyIndex], updateLayersPanelFn, composeLayersFn, updateUIFn);
    return true;
}

export function redo(state, updateLayersPanelFn, composeLayersFn, updateUIFn) {
    if (!state || state.historyIndex >= state.history.length - 1) return false;
    state.historyIndex++;
    restoreState(state, state.history[state.historyIndex], updateLayersPanelFn, composeLayersFn, updateUIFn);
    return true;
}

export function restoreState(state, historyState, updateLayersPanelFn, composeLayersFn, updateUIFn) {
    if (!state || !historyState) return;

    state.canvas.width = historyState.canvasWidth;
    state.canvas.height = historyState.canvasHeight;

    state.layers = historyState.layers.map((layerState, index) => {
        const canvas = cloneCanvas(layerState.imageData);
        return {
            id: index,
            name: layerState.name,
            canvas,
            ctx: canvas.getContext('2d', { willReadFrequently: true }),
            visible: layerState.visible,
            opacity: layerState.opacity,
            blendMode: layerState.blendMode,
            isBackground: layerState.isBackground,
            duration: layerState.duration || 100,
            offsetX: layerState.offsetX,
            offsetY: layerState.offsetY
        };
    });

    state.activeLayerIndex = Math.min(historyState.activeLayerIndex, state.layers.length - 1);
    state.selection = null;
    state.selectionPath = null;

    if (updateLayersPanelFn) updateLayersPanelFn();
    if (composeLayersFn) composeLayersFn(state);
    if (updateUIFn) updateUIFn(state);
}
