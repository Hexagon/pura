// Selection tools module

// Create a rectangular selection
export function createRectSelection(state, x, y, width, height) {
    const layer = state.layers[state.activeLayerIndex];
    
    // Normalize coordinates (handle negative width/height)
    const normalizedX = width < 0 ? x + width : x;
    const normalizedY = height < 0 ? y + height : y;
    const normalizedWidth = Math.abs(width);
    const normalizedHeight = Math.abs(height);
    
    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(normalizedX, layer.canvas.width));
    const clampedY = Math.max(0, Math.min(normalizedY, layer.canvas.height));
    const clampedWidth = Math.min(normalizedWidth, layer.canvas.width - clampedX);
    const clampedHeight = Math.min(normalizedHeight, layer.canvas.height - clampedY);
    
    if (clampedWidth <= 0 || clampedHeight <= 0) {
        state.selection = null;
        return;
    }
    
    // Store selection bounds and image data
    state.selection = {
        x: clampedX,
        y: clampedY,
        width: clampedWidth,
        height: clampedHeight,
        imageData: layer.ctx.getImageData(clampedX, clampedY, clampedWidth, clampedHeight)
    };
    state.selectionType = 'rect';
}

// Create a freeform selection
export function createFreeformSelection(state, path) {
    if (!path || path.length < 3) {
        state.selection = null;
        state.selectionPath = null;
        return;
    }
    
    const layer = state.layers[state.activeLayerIndex];
    
    // Calculate bounding box
    let minX = path[0].x, maxX = path[0].x;
    let minY = path[0].y, maxY = path[0].y;
    
    for (const point of path) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    if (width <= 0 || height <= 0) {
        state.selection = null;
        state.selectionPath = null;
        return;
    }
    
    // Get the full bounding box image data
    const imageData = layer.ctx.getImageData(minX, minY, width, height);
    
    // Create a temporary canvas to mask the selection
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Draw the path as a mask
    tempCtx.beginPath();
    tempCtx.moveTo(path[0].x - minX, path[0].y - minY);
    for (let i = 1; i < path.length; i++) {
        tempCtx.lineTo(path[i].x - minX, path[i].y - minY);
    }
    tempCtx.closePath();
    tempCtx.fill();
    
    // Apply the mask to the image data
    const maskData = tempCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (maskData.data[i + 3] === 0) {
            // Outside the selection path - make transparent
            imageData.data[i + 3] = 0;
        }
    }
    
    state.selection = {
        x: minX,
        y: minY,
        width: width,
        height: height,
        imageData: imageData
    };
    state.selectionPath = path;
    state.selectionType = 'freeform';
}

// Select all (entire layer)
export function selectAll(state) {
    const layer = state.layers[state.activeLayerIndex];
    createRectSelection(state, 0, 0, layer.canvas.width, layer.canvas.height);
}

// Clear selection
export function clearSelection(state) {
    state.selection = null;
    state.selectionPath = null;
}

// Delete selected area
export function deleteSelection(state, composeLayers, saveState) {
    if (!state.selection) return false;
    
    const layer = state.layers[state.activeLayerIndex];
    
    if (state.selectionType === 'rect') {
        // Clear rectangular area
        layer.ctx.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    } else if (state.selectionType === 'freeform' && state.selectionPath) {
        // Clear freeform area
        layer.ctx.save();
        layer.ctx.globalCompositeOperation = 'destination-out';
        layer.ctx.beginPath();
        layer.ctx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
        for (let i = 1; i < state.selectionPath.length; i++) {
            layer.ctx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
        }
        layer.ctx.closePath();
        layer.ctx.fill();
        layer.ctx.restore();
    }
    
    clearSelection(state);
    composeLayers();
    saveState();
    
    return true;
}

// Draw selection outline (marching ants effect)
export function drawSelectionOutline(state, timestamp = 0) {
    if (!state.selection) return;
    
    const ctx = state.previewCtx;
    ctx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
    
    // Marching ants effect
    const dashOffset = -(timestamp / 50) % 16; // Animate dash offset
    
    // Compensate line width for zoom to keep visual thickness constant
    const zoom = state.zoom || 1;
    const compensatedLineWidth = 1 / zoom;
    const compensatedDashPattern = [8 / zoom, 8 / zoom];
    
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = compensatedLineWidth;
    ctx.setLineDash(compensatedDashPattern);
    ctx.lineDashOffset = dashOffset / zoom;
    
    if (state.selectionType === 'rect') {
        ctx.strokeRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    } else if (state.selectionType === 'freeform' && state.selectionPath) {
        ctx.beginPath();
        ctx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
        for (let i = 1; i < state.selectionPath.length; i++) {
            ctx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    // Draw white outline underneath for contrast
    ctx.strokeStyle = '#ffffff';
    ctx.lineDashOffset = (dashOffset + 8) / zoom;
    
    if (state.selectionType === 'rect') {
        ctx.strokeRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    } else if (state.selectionType === 'freeform' && state.selectionPath) {
        ctx.beginPath();
        ctx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
        for (let i = 1; i < state.selectionPath.length; i++) {
            ctx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    ctx.restore();
}

// Check if point is inside selection
export function isPointInSelection(state, x, y) {
    if (!state.selection) return false;
    
    if (state.selectionType === 'rect') {
        return x >= state.selection.x && x <= state.selection.x + state.selection.width &&
               y >= state.selection.y && y <= state.selection.y + state.selection.height;
    } else if (state.selectionType === 'freeform' && state.selectionPath) {
        // Use point-in-polygon algorithm
        let inside = false;
        const path = state.selectionPath;
        for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
            const xi = path[i].x, yi = path[i].y;
            const xj = path[j].x, yj = path[j].y;
            
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    return false;
}
