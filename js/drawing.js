// Drawing tools module

export function getMousePos(state, e) {
    const rect = state.canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (state.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (state.canvas.height / rect.height)
    };
}

export function startDrawing(state, e, composeLayers) {
    const pos = getMousePos(state, e);
    state.startX = pos.x;
    state.startY = pos.y;
    state.isDrawing = true;
    
    const layer = state.layers[state.activeLayerIndex];
    
    if (state.tool === 'move') {
        // Store the offset for moving the layer
        state.moveOffsetX = 0;
        state.moveOffsetY = 0;
        return;
    }
    
    layer.ctx.strokeStyle = state.foregroundColor;
    layer.ctx.fillStyle = state.foregroundColor;
    layer.ctx.lineWidth = state.brushSize;
    layer.ctx.lineCap = 'round';
    layer.ctx.lineJoin = 'round';
    layer.ctx.globalAlpha = state.opacity;
    
    if (state.tool === 'brush') {
        layer.ctx.beginPath();
        layer.ctx.moveTo(state.startX, state.startY);
    } else if (state.tool === 'eraser') {
        layer.ctx.globalCompositeOperation = 'destination-out';
        layer.ctx.beginPath();
        layer.ctx.moveTo(state.startX, state.startY);
    }
}

export function draw(state, e, composeLayers) {
    const pos = getMousePos(state, e);
    
    if (!state.isDrawing) {
        // Clear preview for non-drawing state
        state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
        return;
    }
    
    const layer = state.layers[state.activeLayerIndex];
    
    switch (state.tool) {
        case 'brush':
            layer.ctx.lineTo(pos.x, pos.y);
            layer.ctx.stroke();
            composeLayers();
            break;
            
        case 'eraser':
            layer.ctx.lineTo(pos.x, pos.y);
            layer.ctx.stroke();
            composeLayers();
            break;
            
        case 'rect':
        case 'circle':
        case 'line':
        case 'select':
            // Draw preview
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.strokeStyle = state.foregroundColor;
            state.previewCtx.lineWidth = state.brushSize;
            state.previewCtx.globalAlpha = 0.7;
            state.previewCtx.setLineDash([5, 5]);
            
            if (state.tool === 'rect' || state.tool === 'select') {
                const width = pos.x - state.startX;
                const height = pos.y - state.startY;
                state.previewCtx.strokeRect(state.startX, state.startY, width, height);
            } else if (state.tool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(pos.x - state.startX, 2) + 
                    Math.pow(pos.y - state.startY, 2)
                );
                state.previewCtx.beginPath();
                state.previewCtx.arc(state.startX, state.startY, radius, 0, 2 * Math.PI);
                state.previewCtx.stroke();
            } else if (state.tool === 'line') {
                state.previewCtx.beginPath();
                state.previewCtx.moveTo(state.startX, state.startY);
                state.previewCtx.lineTo(pos.x, pos.y);
                state.previewCtx.stroke();
            }
            
            state.previewCtx.setLineDash([]);
            state.previewCtx.globalAlpha = 1.0;
            break;
            
        case 'move':
            // Move the layer
            state.moveOffsetX = pos.x - state.startX;
            state.moveOffsetY = pos.y - state.startY;
            
            // Clear preview and show moved layer
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.globalAlpha = 0.7;
            state.previewCtx.drawImage(layer.canvas, state.moveOffsetX, state.moveOffsetY);
            state.previewCtx.globalAlpha = 1.0;
            break;
    }
}

export function stopDrawing(state, e, composeLayers, saveState) {
    if (!state.isDrawing) return;
    
    const pos = getMousePos(state, e);
    const layer = state.layers[state.activeLayerIndex];
    
    // Clear preview
    state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
    
    switch (state.tool) {
        case 'brush':
        case 'eraser':
            // Already handled in draw()
            break;
            
        case 'rect':
            const width = pos.x - state.startX;
            const height = pos.y - state.startY;
            layer.ctx.strokeRect(state.startX, state.startY, width, height);
            break;
            
        case 'circle':
            const radius = Math.sqrt(
                Math.pow(pos.x - state.startX, 2) + 
                Math.pow(pos.y - state.startY, 2)
            );
            layer.ctx.beginPath();
            layer.ctx.arc(state.startX, state.startY, radius, 0, 2 * Math.PI);
            layer.ctx.stroke();
            break;
            
        case 'line':
            layer.ctx.beginPath();
            layer.ctx.moveTo(state.startX, state.startY);
            layer.ctx.lineTo(pos.x, pos.y);
            layer.ctx.stroke();
            break;
            
        case 'move':
            // Apply the move to the layer
            if (state.moveOffsetX !== 0 || state.moveOffsetY !== 0) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = layer.canvas.width;
                tempCanvas.height = layer.canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(layer.canvas, 0, 0);
                
                layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                layer.ctx.drawImage(tempCanvas, state.moveOffsetX, state.moveOffsetY);
            }
            break;
            
        case 'select':
            // Select tool doesn't draw, just shows selection
            break;
    }
    
    // Reset composite operation
    layer.ctx.globalCompositeOperation = 'source-over';
    layer.ctx.globalAlpha = 1.0;
    
    state.isDrawing = false;
    composeLayers();
    saveState();
}
