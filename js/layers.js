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
        duration: 100,
        offsetX: 0,
        offsetY: 0
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
        duration: 100,
        offsetX: 0,
        offsetY: 0
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
    
    // Draw layers from bottom to top at their offset positions
    state.layers.forEach((layer, index) => {
        if (layer.visible) {
            state.ctx.globalAlpha = layer.opacity;
            const offsetX = layer.offsetX || 0;
            const offsetY = layer.offsetY || 0;
            state.ctx.drawImage(layer.canvas, offsetX, offsetY);
        }
    });
    
    state.ctx.globalAlpha = 1.0;
    
    // Draw dashed border around active layer bounds (always show when layer exists)
    if (state.activeLayerIndex !== undefined && state.layers[state.activeLayerIndex]) {
        const activeLayer = state.layers[state.activeLayerIndex];
        const offsetX = activeLayer.offsetX || 0;
        const offsetY = activeLayer.offsetY || 0;
        
        // Compensate line width for zoom to keep visual thickness constant
        const zoom = state.zoom || 1;
        const compensatedLineWidth = 2 / zoom;
        const compensatedDashPattern = [8 / zoom, 8 / zoom];
        
        state.ctx.save();
        state.ctx.strokeStyle = '#ff0000';
        state.ctx.lineWidth = compensatedLineWidth;
        state.ctx.setLineDash(compensatedDashPattern);
        state.ctx.strokeRect(offsetX, offsetY, activeLayer.canvas.width, activeLayer.canvas.height);
        state.ctx.restore();
    }
}
