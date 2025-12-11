// History Management Module (Undo/Redo)

// Save current state to history
export function saveState(state, updateUIFn, updateLayersPanelFn = null, composeLayersFn = null) {
    if (!state) return;
    
    // Remove any states after current index
    state.history = state.history.slice(0, state.historyIndex + 1);
    
    // Save current state
    const layerStates = state.layers.map(layer => {
        const canvas = document.createElement('canvas');
        canvas.width = layer.canvas.width;
        canvas.height = layer.canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(layer.canvas, 0, 0);
        return {
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            isBackground: layer.isBackground,
            duration: layer.duration,
            offsetX: layer.offsetX || 0,
            offsetY: layer.offsetY || 0,
            imageData: canvas
        };
    });
    
    state.history.push({
        layers: layerStates,
        activeLayerIndex: state.activeLayerIndex,
        canvasWidth: state.canvas.width,
        canvasHeight: state.canvas.height
    });
    
    // Limit history size
    if (state.history.length > state.maxHistory) {
        state.history.shift();
    } else {
        state.historyIndex++;
    }
    
    if (updateUIFn) updateUIFn(state);
}

// Undo the last action
export function undo(state, updateLayersPanelFn, composeLayersFn, updateUIFn) {
    if (!state || state.historyIndex <= 0) return;
    
    state.historyIndex--;
    restoreState(state, state.history[state.historyIndex], updateLayersPanelFn, composeLayersFn, updateUIFn);
}

// Redo the last undone action
export function redo(state, updateLayersPanelFn, composeLayersFn, updateUIFn) {
    if (!state || state.historyIndex >= state.history.length - 1) return;
    
    state.historyIndex++;
    restoreState(state, state.history[state.historyIndex], updateLayersPanelFn, composeLayersFn, updateUIFn);
}

// Restore state from history
export function restoreState(state, historyState, updateLayersPanelFn, composeLayersFn, updateUIFn) {
    if (!state || !historyState) return;
    
    // Restore canvas size
    state.canvas.width = historyState.canvasWidth;
    state.canvas.height = historyState.canvasHeight;
    
    // Restore layers
    state.layers = historyState.layers.map((layerState, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = layerState.imageData.width;
        canvas.height = layerState.imageData.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(layerState.imageData, 0, 0);
        
        return {
            id: index,
            name: layerState.name,
            canvas: canvas,
            ctx: ctx,
            visible: layerState.visible,
            opacity: layerState.opacity,
            isBackground: layerState.isBackground,
            duration: layerState.duration || 100,
            offsetX: layerState.offsetX || 0,
            offsetY: layerState.offsetY || 0
        };
    });
    
    state.activeLayerIndex = historyState.activeLayerIndex;
    
    if (updateLayersPanelFn) updateLayersPanelFn();
    if (composeLayersFn) composeLayersFn(state);
    if (updateUIFn) updateUIFn(state);
}
