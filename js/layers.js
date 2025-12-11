// Layer Management Module

// Create a layer object for a workspace
export function createLayerObject(workspaceState, name, isBackground = false) {
    const canvas = document.createElement('canvas');
    canvas.width = workspaceState.canvas.width;
    canvas.height = workspaceState.canvas.height;
    
    return {
        id: workspaceState.layers.length,
        name: name || `Layer ${workspaceState.layers.length + 1}`,
        canvas: canvas,
        ctx: canvas.getContext('2d', { willReadFrequently: true }),
        visible: true,
        opacity: 1.0,
        isBackground: isBackground,
        duration: 100
    };
}

// Fill a layer with a solid color
export function fillLayerInWorkspace(workspaceState, layerIndex, color) {
    const layer = workspaceState.layers[layerIndex];
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
}

// Create and add a new layer to the current workspace
export function createLayer(state, name = 'Layer', isBackground = false) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    
    const layer = {
        id: state.layers.length,
        name: name || `Layer ${state.layers.length + 1}`,
        canvas: canvas,
        ctx: canvas.getContext('2d', { willReadFrequently: true }),
        visible: true,
        opacity: 1.0,
        isBackground: isBackground,
        duration: 100
    };
    
    state.layers.push(layer);
    state.activeLayerIndex = state.layers.length - 1;
    
    return layer;
}

// Fill a layer with a solid color
export function fillLayer(state, layerIndex, color) {
    const layer = state.layers[layerIndex];
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
}

// Delete a layer
export function deleteLayer(state, layerIndex) {
    if (state.layers.length <= 1) {
        alert('Cannot delete the last layer!');
        return false;
    }
    
    state.layers.splice(layerIndex, 1);
    
    // Adjust active layer index
    if (state.activeLayerIndex >= state.layers.length) {
        state.activeLayerIndex = state.layers.length - 1;
    }
    
    // Re-index layers
    state.layers.forEach((layer, index) => {
        layer.id = index;
    });
    
    return true;
}

// Toggle layer visibility
export function toggleLayerVisibility(state, layerIndex) {
    state.layers[layerIndex].visible = !state.layers[layerIndex].visible;
}

// Set the active layer
export function setActiveLayer(state, layerIndex) {
    state.activeLayerIndex = layerIndex;
}

// Compose all visible layers onto the main canvas
export function composeLayers(state) {
    // Clear main canvas
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    // Draw layers from bottom to top
    state.layers.forEach(layer => {
        if (layer.visible) {
            state.ctx.globalAlpha = layer.opacity;
            state.ctx.drawImage(layer.canvas, 0, 0);
        }
    });
    
    state.ctx.globalAlpha = 1.0;
}

// Ensure layer is at least as large as the workspace canvas
export function ensureLayerSize(state, layerIndex) {
    const layer = state.layers[layerIndex];
    const workspaceWidth = state.canvas.width;
    const workspaceHeight = state.canvas.height;
    
    // Check if layer needs to be expanded
    if (layer.canvas.width < workspaceWidth || layer.canvas.height < workspaceHeight) {
        const newWidth = Math.max(layer.canvas.width, workspaceWidth);
        const newHeight = Math.max(layer.canvas.height, workspaceHeight);
        
        // Create temp canvas with current content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(layer.canvas, 0, 0);
        
        // Resize layer canvas
        layer.canvas.width = newWidth;
        layer.canvas.height = newHeight;
        
        // Redraw content
        layer.ctx.clearRect(0, 0, newWidth, newHeight);
        layer.ctx.drawImage(tempCanvas, 0, 0);
    }
}
