// Drawing tools module

// Import selection functions
import * as Selection from './selection.js';

export function getMousePos(state, e) {
    const rect = state.canvas.getBoundingClientRect();
    // getBoundingClientRect accounts for CSS transforms (including zoom)
    return {
        x: (e.clientX - rect.left) * (state.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (state.canvas.height / rect.height)
    };
}

// Convert workspace coordinates to layer-local coordinates
function toLayerCoords(layer, x, y) {
    const offsetX = layer.offsetX || 0;
    const offsetY = layer.offsetY || 0;
    return {
        x: x - offsetX,
        y: y - offsetY
    };
}

// Flood fill algorithm
function floodFill(imageData, x, y, fillColor, tolerance) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    x = Math.floor(x);
    y = Math.floor(y);
    
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    const startPos = (y * width + x) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];
    
    // Parse fill color
    const r = parseInt(fillColor.slice(1, 3), 16);
    const g = parseInt(fillColor.slice(3, 5), 16);
    const b = parseInt(fillColor.slice(5, 7), 16);
    
    // Check if already the same color
    if (startR === r && startG === g && startB === b && startA === 255) {
        return;
    }
    
    const stack = [[x, y]];
    const visited = new Set();
    
    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const key = `${cx},${cy}`;
        
        if (visited.has(key)) continue;
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
        
        const pos = (cy * width + cx) * 4;
        const cr = data[pos];
        const cg = data[pos + 1];
        const cb = data[pos + 2];
        const ca = data[pos + 3];
        
        // Check if color matches within tolerance
        const dr = Math.abs(cr - startR);
        const dg = Math.abs(cg - startG);
        const db = Math.abs(cb - startB);
        const da = Math.abs(ca - startA);
        
        if (dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance) {
            visited.add(key);
            
            // Fill pixel
            data[pos] = r;
            data[pos + 1] = g;
            data[pos + 2] = b;
            data[pos + 3] = 255;
            
            // Add neighbors
            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }
    }
}

export function startDrawing(state, e, composeLayers) {
    const pos = getMousePos(state, e);
    state.startX = pos.x;
    state.startY = pos.y;
    state.isDrawing = true;
    
    const layer = state.layers[state.activeLayerIndex];
    
    if (state.tool === 'fill') {
        // Convert workspace coordinates to layer-local coordinates
        const layerPos = toLayerCoords(layer, pos.x, pos.y);
        
        // Only fill if within layer bounds
        if (layerPos.x >= 0 && layerPos.x < layer.canvas.width && layerPos.y >= 0 && layerPos.y < layer.canvas.height) {
            // Perform flood fill immediately
            const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
            const tolerance = state.fillTolerance || 32;
            floodFill(imageData, layerPos.x, layerPos.y, state.foregroundColor, tolerance);
            layer.ctx.putImageData(imageData, 0, 0);
            composeLayers();
        }
        state.isDrawing = false;
        return;
    }
    
    if (state.tool === 'gradient') {
        // Just store start position, will draw on mouse up
        return;
    }
    
    if (state.tool === 'text') {
        // Text tool will open a modal for text input
        return;
    }
    
    if (state.tool === 'move') {
        // Store the offset for moving the layer
        state.moveOffsetX = 0;
        state.moveOffsetY = 0;
        return;
    }
    
    if (state.tool === 'select' || state.tool === 'rectSelect') {
        // Clear any existing selection when starting a new one
        Selection.clearSelection(state);
        return;
    }
    
    if (state.tool === 'freeformSelect') {
        // Start freeform selection path
        state.selectionPath = [{ x: pos.x, y: pos.y }];
        Selection.clearSelection(state);
        return;
    }
    
    if (state.tool === 'pointer') {
        // Pointer tool just selects, doesn't draw
        return;
    }
    
    layer.ctx.strokeStyle = state.foregroundColor;
    layer.ctx.fillStyle = state.foregroundColor;
    layer.ctx.lineWidth = state.brushSize;
    layer.ctx.lineCap = 'round';
    layer.ctx.lineJoin = 'round';
    layer.ctx.globalAlpha = state.opacity;
    
    // Set up clipping region to layer bounds
    layer.ctx.save();
    layer.ctx.beginPath();
    layer.ctx.rect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.clip();
    
    // Convert workspace coordinates to layer-local coordinates for drawing
    const layerStart = toLayerCoords(layer, state.startX, state.startY);
    
    if (state.tool === 'brush') {
        layer.ctx.beginPath();
        layer.ctx.moveTo(layerStart.x, layerStart.y);
    } else if (state.tool === 'eraser') {
        layer.ctx.globalCompositeOperation = 'destination-out';
        layer.ctx.beginPath();
        layer.ctx.moveTo(layerStart.x, layerStart.y);
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
    
    // Convert workspace coordinates to layer-local coordinates for drawing
    const layerPos = toLayerCoords(layer, pos.x, pos.y);
    
    switch (state.tool) {
        case 'brush':
            layer.ctx.lineTo(layerPos.x, layerPos.y);
            layer.ctx.stroke();
            composeLayers();
            break;
            
        case 'eraser':
            layer.ctx.lineTo(layerPos.x, layerPos.y);
            layer.ctx.stroke();
            composeLayers();
            break;
            
        case 'gradient':
            // Draw gradient preview
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            
            const gradientType = state.gradientType || 'linear';
            let gradient;
            
            if (gradientType === 'linear') {
                gradient = state.previewCtx.createLinearGradient(
                    state.startX, state.startY, pos.x, pos.y
                );
            } else {
                const radius = Math.sqrt(
                    Math.pow(pos.x - state.startX, 2) + 
                    Math.pow(pos.y - state.startY, 2)
                );
                gradient = state.previewCtx.createRadialGradient(
                    state.startX, state.startY, 0,
                    state.startX, state.startY, radius
                );
            }
            
            gradient.addColorStop(0, state.foregroundColor);
            gradient.addColorStop(1, state.backgroundColor);
            
            state.previewCtx.fillStyle = gradient;
            state.previewCtx.globalAlpha = 0.7;
            state.previewCtx.fillRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.globalAlpha = 1.0;
            
            // Draw line indicator
            state.previewCtx.strokeStyle = '#ffffff';
            state.previewCtx.lineWidth = 2;
            state.previewCtx.setLineDash([5, 5]);
            state.previewCtx.beginPath();
            state.previewCtx.moveTo(state.startX, state.startY);
            state.previewCtx.lineTo(pos.x, pos.y);
            state.previewCtx.stroke();
            state.previewCtx.setLineDash([]);
            break;
            
        case 'rect':
        case 'circle':
        case 'line':
            // Draw preview
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.strokeStyle = state.foregroundColor;
            state.previewCtx.lineWidth = state.brushSize;
            state.previewCtx.globalAlpha = 0.7;
            state.previewCtx.setLineDash([5, 5]);
            
            if (state.tool === 'rect') {
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
            
        case 'select':
        case 'rectSelect':
            // Draw selection preview
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.strokeStyle = '#000000';
            state.previewCtx.lineWidth = 1;
            state.previewCtx.setLineDash([8, 8]);
            
            const width = pos.x - state.startX;
            const height = pos.y - state.startY;
            state.previewCtx.strokeRect(state.startX, state.startY, width, height);
            
            // Draw white outline for contrast
            state.previewCtx.strokeStyle = '#ffffff';
            state.previewCtx.lineDashOffset = 8;
            state.previewCtx.strokeRect(state.startX, state.startY, width, height);
            
            state.previewCtx.setLineDash([]);
            state.previewCtx.lineDashOffset = 0;
            break;
            
        case 'freeformSelect':
            // Add point to path
            if (state.selectionPath) {
                state.selectionPath.push({ x: pos.x, y: pos.y });
                
                // Draw path preview
                state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
                state.previewCtx.strokeStyle = '#000000';
                state.previewCtx.lineWidth = 1;
                state.previewCtx.setLineDash([4, 4]);
                
                state.previewCtx.beginPath();
                state.previewCtx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
                for (let i = 1; i < state.selectionPath.length; i++) {
                    state.previewCtx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
                }
                state.previewCtx.stroke();
                
                // Draw white outline for contrast
                state.previewCtx.strokeStyle = '#ffffff';
                state.previewCtx.lineDashOffset = 4;
                state.previewCtx.beginPath();
                state.previewCtx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
                for (let i = 1; i < state.selectionPath.length; i++) {
                    state.previewCtx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
                }
                state.previewCtx.stroke();
                
                state.previewCtx.setLineDash([]);
                state.previewCtx.lineDashOffset = 0;
            }
            break;
            
        case 'pointer':
            // Pointer tool doesn't draw during drag
            break;
            
        case 'move':
            // Move the layer
            state.moveOffsetX = pos.x - state.startX;
            state.moveOffsetY = pos.y - state.startY;
            
            // Clear preview and show moved layer at its new offset position
            state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
            state.previewCtx.globalAlpha = 0.7;
            const currentOffsetX = (layer.offsetX || 0) + state.moveOffsetX;
            const currentOffsetY = (layer.offsetY || 0) + state.moveOffsetY;
            state.previewCtx.drawImage(layer.canvas, currentOffsetX, currentOffsetY);
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
            // Restore context (clipping was set in startDrawing)
            layer.ctx.restore();
            break;
            
        case 'gradient':
            // Apply gradient to layer (use layer-local coordinates)
            const gradientType = state.gradientType || 'linear';
            let gradient;
            
            const layerStart = toLayerCoords(layer, state.startX, state.startY);
            const layerEnd = toLayerCoords(layer, pos.x, pos.y);
            
            if (gradientType === 'linear') {
                gradient = layer.ctx.createLinearGradient(
                    layerStart.x, layerStart.y, layerEnd.x, layerEnd.y
                );
            } else {
                const radius = Math.sqrt(
                    Math.pow(layerEnd.x - layerStart.x, 2) + 
                    Math.pow(layerEnd.y - layerStart.y, 2)
                );
                gradient = layer.ctx.createRadialGradient(
                    layerStart.x, layerStart.y, 0,
                    layerStart.x, layerStart.y, radius
                );
            }
            
            gradient.addColorStop(0, state.foregroundColor);
            gradient.addColorStop(1, state.backgroundColor);
            
            layer.ctx.fillStyle = gradient;
            layer.ctx.globalAlpha = state.opacity;
            layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.ctx.globalAlpha = 1.0;
            break;
            
        case 'rect':
            const layerStartRect = toLayerCoords(layer, state.startX, state.startY);
            const layerPosRect = toLayerCoords(layer, pos.x, pos.y);
            const width = layerPosRect.x - layerStartRect.x;
            const height = layerPosRect.y - layerStartRect.y;
            layer.ctx.save();
            layer.ctx.beginPath();
            layer.ctx.rect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.ctx.clip();
            layer.ctx.strokeRect(layerStartRect.x, layerStartRect.y, width, height);
            layer.ctx.restore();
            break;
            
        case 'circle':
            const layerStartCircle = toLayerCoords(layer, state.startX, state.startY);
            const layerPosCircle = toLayerCoords(layer, pos.x, pos.y);
            const radius = Math.sqrt(
                Math.pow(layerPosCircle.x - layerStartCircle.x, 2) + 
                Math.pow(layerPosCircle.y - layerStartCircle.y, 2)
            );
            layer.ctx.save();
            layer.ctx.beginPath();
            layer.ctx.rect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.ctx.clip();
            layer.ctx.beginPath();
            layer.ctx.arc(layerStartCircle.x, layerStartCircle.y, radius, 0, 2 * Math.PI);
            layer.ctx.stroke();
            layer.ctx.restore();
            break;
            
        case 'line':
            const layerStartLine = toLayerCoords(layer, state.startX, state.startY);
            const layerPosLine = toLayerCoords(layer, pos.x, pos.y);
            layer.ctx.save();
            layer.ctx.beginPath();
            layer.ctx.rect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.ctx.clip();
            layer.ctx.beginPath();
            layer.ctx.moveTo(layerStartLine.x, layerStartLine.y);
            layer.ctx.lineTo(layerPosLine.x, layerPosLine.y);
            layer.ctx.stroke();
            layer.ctx.restore();
            break;
            
        case 'move':
            // Apply the move to the layer or selection
            if (state.selection) {
                // Move only the selection - clip to layer bounds
                if (state.moveOffsetX !== 0 || state.moveOffsetY !== 0) {
                    const newX = state.selection.x + state.moveOffsetX;
                    const newY = state.selection.y + state.moveOffsetY;
                    
                    // Clear the original selection area
                    if (state.selectionType === 'rect') {
                        layer.ctx.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
                    } else if (state.selectionType === 'freeform' && state.selectionPath) {
                        // Clear freeform selection area
                        layer.ctx.save();
                        layer.ctx.beginPath();
                        layer.ctx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
                        for (let i = 1; i < state.selectionPath.length; i++) {
                            layer.ctx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
                        }
                        layer.ctx.closePath();
                        layer.ctx.clip();
                        layer.ctx.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
                        layer.ctx.restore();
                    }
                    
                    // Put the selection at new location (will clip to layer bounds)
                    layer.ctx.putImageData(state.selection.imageData, newX, newY);
                    
                    // Update selection position
                    state.selection.x = newX;
                    state.selection.y = newY;
                    
                    // Clear selection path if it exists
                    state.selectionPath = null;
                }
            } else if (state.moveOffsetX !== 0 || state.moveOffsetY !== 0) {
                // Move the entire layer by adjusting its offset position
                // This preserves data even when moved outside workspace bounds
                layer.offsetX = (layer.offsetX || 0) + state.moveOffsetX;
                layer.offsetY = (layer.offsetY || 0) + state.moveOffsetY;
            }
            break;
            
        case 'select':
        case 'rectSelect':
            // Create rectangular selection (convert workspace coords to layer coords)
            const layerStartSel = toLayerCoords(layer, state.startX, state.startY);
            const layerPosSel = toLayerCoords(layer, pos.x, pos.y);
            const selWidth = layerPosSel.x - layerStartSel.x;
            const selHeight = layerPosSel.y - layerStartSel.y;
            Selection.createRectSelection(state, layerStartSel.x, layerStartSel.y, selWidth, selHeight);
            break;
            
        case 'freeformSelect':
            // Complete freeform selection (convert workspace coords to layer coords)
            if (state.selectionPath && state.selectionPath.length > 2) {
                const layerPath = state.selectionPath.map(p => {
                    const lp = toLayerCoords(layer, p.x, p.y);
                    return { x: lp.x, y: lp.y };
                });
                Selection.createFreeformSelection(state, layerPath);
            }
            break;
            
        case 'pointer':
            // Pointer tool doesn't modify the canvas
            break;
    }
    
    // Reset composite operation
    layer.ctx.globalCompositeOperation = 'source-over';
    layer.ctx.globalAlpha = 1.0;
    
    state.isDrawing = false;
    composeLayers();
    saveState();
}

// Render text to the active layer
export function renderText(state, text, x, y, composeLayers, saveState) {
    if (!state || !text || state.layers.length === 0) return;
    
    const layer = state.layers[state.activeLayerIndex];
    const layerPos = toLayerCoords(layer, x, y);
    
    // Whitelist of allowed font families
    const allowedFonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
        'Georgia', 'Verdana', 'Comic Sans MS', 'Impact'
    ];
    
    // Validate font family
    const fontFamily = allowedFonts.includes(state.fontFamily) ? state.fontFamily : 'Arial';
    
    // Set font properties
    layer.ctx.font = `${state.fontSize}px ${fontFamily}`;
    layer.ctx.fillStyle = state.foregroundColor;
    layer.ctx.textBaseline = 'top';
    layer.ctx.globalAlpha = state.opacity;
    
    // Clip to layer bounds
    layer.ctx.save();
    layer.ctx.beginPath();
    layer.ctx.rect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.clip();
    
    // Draw text
    layer.ctx.fillText(text, layerPos.x, layerPos.y);
    
    layer.ctx.restore();
    layer.ctx.globalAlpha = 1.0;
    
    composeLayers();
    if (saveState) saveState();
}
