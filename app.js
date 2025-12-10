// Import cross-image from jsdelivr CDN
import { Image } from 'https://cdn.jsdelivr.net/npm/cross-image@0.2.2/esm/mod.js';

// Constants
const MIN_LAYER_DURATION = 10;
const MULTI_FRAME_FORMATS = ['gif', 'apng', 'tiff'];

// Application state
const state = {
    canvas: null,
    ctx: null,
    layers: [],
    activeLayerIndex: 0,
    tool: 'select',
    isDrawing: false,
    startX: 0,
    startY: 0,
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    brushSize: 10,
    opacity: 1.0,
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    metadata: {
        title: '',
        author: '',
        description: '',
        copyright: ''
    }
};

// Initialize the application
function init() {
    state.canvas = document.getElementById('mainCanvas');
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    
    // Set default canvas size
    state.canvas.width = 800;
    state.canvas.height = 600;
    
    // Create initial background layer
    createLayer('Background', true);
    fillLayer(0, '#FFFFFF');
    
    setupEventListeners();
    restoreUIState();
    updateUI();
    saveState();
}

// Layer Management
function createLayer(name = 'Layer', isBackground = false) {
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
        duration: 100 // Default duration in milliseconds for animations
    };
    
    state.layers.push(layer);
    state.activeLayerIndex = state.layers.length - 1;
    
    updateLayersPanel();
    composeLayers();
    return layer;
}

function fillLayer(layerIndex, color) {
    const layer = state.layers[layerIndex];
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
}

function deleteLayer(layerIndex) {
    if (state.layers.length <= 1) {
        alert('Cannot delete the last layer!');
        return;
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
    
    updateLayersPanel();
    composeLayers();
    saveState();
}

function toggleLayerVisibility(layerIndex) {
    state.layers[layerIndex].visible = !state.layers[layerIndex].visible;
    composeLayers();
}

function setActiveLayer(layerIndex) {
    state.activeLayerIndex = layerIndex;
    updateLayersPanel();
}

function composeLayers() {
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

function updateLayersPanel() {
    const panel = document.getElementById('layersPanel');
    panel.innerHTML = '';
    
    state.layers.forEach((layer, index) => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item' + (index === state.activeLayerIndex ? ' active' : '');
        layerItem.dataset.layerId = index;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.visible;
        checkbox.className = 'layer-visibility';
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLayerVisibility(index);
        });
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'layer-name';
        nameSpan.textContent = layer.name;
        
        const durationSpan = document.createElement('span');
        durationSpan.className = 'layer-duration';
        durationSpan.textContent = `${layer.duration}ms`;
        durationSpan.title = 'Click to edit duration';
        durationSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            showLayerDurationModal(index);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'layer-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLayer(index);
        });
        
        layerItem.appendChild(checkbox);
        layerItem.appendChild(nameSpan);
        layerItem.appendChild(durationSpan);
        if (!layer.isBackground || state.layers.length > 1) {
            layerItem.appendChild(deleteBtn);
        }
        
        layerItem.addEventListener('click', () => setActiveLayer(index));
        
        panel.appendChild(layerItem);
    });
}

// Drawing Functions
function getMousePos(e) {
    const rect = state.canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (state.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (state.canvas.height / rect.height)
    };
}

function startDrawing(e) {
    const pos = getMousePos(e);
    state.startX = pos.x;
    state.startY = pos.y;
    state.isDrawing = true;
    
    const layer = state.layers[state.activeLayerIndex];
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

function draw(e) {
    if (!state.isDrawing) return;
    
    const pos = getMousePos(e);
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
    }
}

function stopDrawing(e) {
    if (!state.isDrawing) return;
    
    const pos = getMousePos(e);
    const layer = state.layers[state.activeLayerIndex];
    
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
    }
    
    // Reset composite operation
    layer.ctx.globalCompositeOperation = 'source-over';
    layer.ctx.globalAlpha = 1.0;
    
    state.isDrawing = false;
    composeLayers();
    saveState();
}

// File Operations
async function openImage() {
    const input = document.getElementById('fileInput');
    input.click();
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    try {
        const image = await Image.read(uint8Array);
        
        // Check if image has multiple frames
        const isMultiFrame = image.frames && image.frames.length > 1;
        
        if (isMultiFrame) {
            // Load each frame as a separate layer
            state.canvas.width = image.width;
            state.canvas.height = image.height;
            
            // Clear existing layers
            state.layers = [];
            
            for (const [i, frame] of image.frames.entries()) {
                const layer = createLayer(`${file.name} - Frame ${i + 1}`);
                
                // Set duration if available
                if (frame.duration !== undefined) {
                    layer.duration = frame.duration;
                }
                
                // Convert frame data to ImageData and draw
                const imageData = new ImageData(
                    new Uint8ClampedArray(frame.data),
                    frame.width,
                    frame.height
                );
                layer.ctx.putImageData(imageData, 0, 0);
            }
        } else {
            // Single frame image
            // Resize canvas to fit image
            state.canvas.width = image.width;
            state.canvas.height = image.height;
            
            // Resize all existing layers
            state.layers.forEach(layer => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = image.width;
                tempCanvas.height = image.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(layer.canvas, 0, 0);
                
                layer.canvas.width = image.width;
                layer.canvas.height = image.height;
                layer.ctx.drawImage(tempCanvas, 0, 0);
            });
            
            // Create new layer with the loaded image
            const newLayer = createLayer(file.name);
            
            // Convert image data to ImageData and draw
            const imageData = new ImageData(
                new Uint8ClampedArray(image.data),
                image.width,
                image.height
            );
            newLayer.ctx.putImageData(imageData, 0, 0);
        }
        
        composeLayers();
        saveState();
    } catch (error) {
        console.error('Error loading image:', error);
        alert('Error loading image. Please try a different file.');
    }
}

async function saveImage() {
    // Show save dialog instead of immediately saving
    const modal = document.getElementById('saveModal');
    modal.classList.add('active');
}

async function applySaveImage() {
    try {
        const format = document.getElementById('saveFormat').value;
        const quality = parseInt(document.getElementById('saveQuality').value);
        const multiFrame = document.getElementById('saveMultiFrame').checked;
        const filename = document.getElementById('saveFilename').value || 'crimshop-export';
        
        let fileData;
        let mimeType;
        let extension;
        
        if (multiFrame && MULTI_FRAME_FORMATS.includes(format)) {
            // Multi-frame export
            const frames = [];
            
            for (const layer of state.layers) {
                if (!layer.visible) continue;
                
                // Create a temporary canvas to render this layer
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = state.canvas.width;
                tempCanvas.height = state.canvas.height;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                
                // Draw the layer
                tempCtx.globalAlpha = layer.opacity;
                tempCtx.drawImage(layer.canvas, 0, 0);
                tempCtx.globalAlpha = 1.0;
                
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                
                frames.push({
                    width: tempCanvas.width,
                    height: tempCanvas.height,
                    data: new Uint8Array(imageData.data),
                    duration: layer.duration
                });
            }
            
            // Create multi-frame image
            const image = Image.fromRGBA(
                frames[0].width,
                frames[0].height,
                frames[0].data
            );
            
            // Add additional frames
            try {
                for (let i = 1; i < frames.length; i++) {
                    image.addFrame(frames[i].data, frames[i].duration);
                }
            } catch (frameError) {
                console.error('Error adding frame:', frameError);
                throw new Error(`Failed to add frame ${i}: ${frameError.message}`);
            }
            
            // Encode based on format
            if (format === 'gif') {
                fileData = await image.save('gif');
                mimeType = 'image/gif';
                extension = 'gif';
            } else if (format === 'apng') {
                fileData = await image.save('apng');
                mimeType = 'image/apng';
                extension = 'apng';
            } else if (format === 'tiff') {
                fileData = await image.save('tiff');
                mimeType = 'image/tiff';
                extension = 'tiff';
            }
        } else {
            // Single frame export - compose all layers
            const imageData = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
            
            // Create Image instance from canvas data
            const image = Image.fromRGBA(
                state.canvas.width,
                state.canvas.height,
                new Uint8Array(imageData.data)
            );
            
            // Apply metadata if available
            if (state.metadata.title || state.metadata.author || state.metadata.description) {
                image.metadata = { ...state.metadata };
            }
            
            // Save in selected format
            switch (format) {
                case 'png':
                    fileData = await image.save('png');
                    mimeType = 'image/png';
                    extension = 'png';
                    break;
                case 'jpeg':
                    fileData = await image.save('jpeg', { quality: quality / 100 });
                    mimeType = 'image/jpeg';
                    extension = 'jpg';
                    break;
                case 'webp':
                    fileData = await image.save('webp', { quality: quality / 100 });
                    mimeType = 'image/webp';
                    extension = 'webp';
                    break;
                case 'gif':
                    fileData = await image.save('gif');
                    mimeType = 'image/gif';
                    extension = 'gif';
                    break;
                case 'apng':
                    fileData = await image.save('apng');
                    mimeType = 'image/apng';
                    extension = 'apng';
                    break;
                case 'tiff':
                    fileData = await image.save('tiff');
                    mimeType = 'image/tiff';
                    extension = 'tiff';
                    break;
                case 'bmp':
                    fileData = await image.save('bmp');
                    mimeType = 'image/bmp';
                    extension = 'bmp';
                    break;
                default:
                    fileData = await image.save('png');
                    mimeType = 'image/png';
                    extension = 'png';
            }
        }
        
        // Create download link
        const blob = new Blob([fileData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        closeModal('saveModal');
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Error saving image: ' + error.message);
    }
}

function createNewImage() {
    const modal = document.getElementById('newImageModal');
    modal.classList.add('active');
}

function applyNewImage() {
    const width = parseInt(document.getElementById('newWidth').value);
    const height = parseInt(document.getElementById('newHeight').value);
    const bgColor = document.getElementById('newBgColor').value;
    
    if (width > 0 && height > 0) {
        state.canvas.width = width;
        state.canvas.height = height;
        
        // Clear layers
        state.layers = [];
        
        // Create new background layer
        createLayer('Background', true);
        fillLayer(0, bgColor);
        
        composeLayers();
        saveState();
    }
    
    closeModal('newImageModal');
}

// Transform Operations
async function resizeLayer() {
    const layer = state.layers[state.activeLayerIndex];
    document.getElementById('resizeWidth').value = layer.canvas.width;
    document.getElementById('resizeHeight').value = layer.canvas.height;
    
    const modal = document.getElementById('resizeModal');
    modal.classList.add('active');
}

async function applyResize() {
    const width = parseInt(document.getElementById('resizeWidth').value);
    const height = parseInt(document.getElementById('resizeHeight').value);
    
    if (width > 0 && height > 0) {
        const layer = state.layers[state.activeLayerIndex];
        
        try {
            // Get current layer data
            const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
            
            // Create Image instance
            const image = Image.fromRGBA(
                layer.canvas.width,
                layer.canvas.height,
                new Uint8Array(imageData.data)
            );
            
            // Resize using cross-image
            image.resize({ width, height });
            
            // Update layer canvas
            layer.canvas.width = width;
            layer.canvas.height = height;
            
            const resizedImageData = new ImageData(
                new Uint8ClampedArray(image.data),
                width,
                height
            );
            layer.ctx.putImageData(resizedImageData, 0, 0);
            
            composeLayers();
            saveState();
        } catch (error) {
            console.error('Error resizing:', error);
            alert('Error resizing layer: ' + error.message);
        }
    }
    
    closeModal('resizeModal');
}

function rotateLayer() {
    const layer = state.layers[state.activeLayerIndex];
    
    // Create temporary canvas for rotation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.canvas.height;
    tempCanvas.height = layer.canvas.width;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Rotate 90 degrees clockwise
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(layer.canvas, -layer.canvas.width / 2, -layer.canvas.height / 2);
    
    // Update layer canvas
    layer.canvas.width = tempCanvas.width;
    layer.canvas.height = tempCanvas.height;
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(tempCanvas, 0, 0);
    
    composeLayers();
    saveState();
}

function flipLayerHorizontal() {
    const layer = state.layers[state.activeLayerIndex];
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.canvas.width;
    tempCanvas.height = layer.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(layer.canvas, 0, 0);
    
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(tempCanvas, 0, 0);
    
    composeLayers();
    saveState();
}

function flipLayerVertical() {
    const layer = state.layers[state.activeLayerIndex];
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.canvas.width;
    tempCanvas.height = layer.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.translate(0, tempCanvas.height);
    tempCtx.scale(1, -1);
    tempCtx.drawImage(layer.canvas, 0, 0);
    
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(tempCanvas, 0, 0);
    
    composeLayers();
    saveState();
}

// Effects
function applyGrayscale() {
    const layer = state.layers[state.activeLayerIndex];
    const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
    }
    
    layer.ctx.putImageData(imageData, 0, 0);
    composeLayers();
    saveState();
}

function applyInvert() {
    const layer = state.layers[state.activeLayerIndex];
    const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
    
    layer.ctx.putImageData(imageData, 0, 0);
    composeLayers();
    saveState();
}

function showEffectModal(effectName, effectFunction) {
    const modal = document.getElementById('effectModal');
    const title = document.getElementById('effectTitle');
    const slider = document.getElementById('effectSlider');
    const valueDisplay = document.getElementById('effectValue');
    
    title.textContent = effectName;
    slider.value = 50;
    valueDisplay.textContent = '50';
    
    modal.classList.add('active');
    
    // Store effect function for apply button
    modal.dataset.effectFunction = effectFunction;
}

function applyEffect() {
    const modal = document.getElementById('effectModal');
    const slider = document.getElementById('effectSlider');
    const value = parseInt(slider.value);
    const effectName = modal.dataset.effectFunction;
    
    const layer = state.layers[state.activeLayerIndex];
    const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    
    switch (effectName) {
        case 'brightness':
            const brightnessFactor = (value - 50) * 2.55;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, Math.min(255, data[i] + brightnessFactor));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightnessFactor));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightnessFactor));
            }
            break;
            
        case 'contrast':
            const contrastFactor = (value / 50);
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, Math.min(255, ((data[i] - 128) * contrastFactor) + 128));
                data[i + 1] = Math.max(0, Math.min(255, ((data[i + 1] - 128) * contrastFactor) + 128));
                data[i + 2] = Math.max(0, Math.min(255, ((data[i + 2] - 128) * contrastFactor) + 128));
            }
            break;
            
        case 'blur':
            // Simple box blur
            applyBoxBlur(imageData, Math.floor(value / 10) + 1);
            break;
    }
    
    layer.ctx.putImageData(imageData, 0, 0);
    composeLayers();
    saveState();
    
    closeModal('effectModal');
}

function applyBoxBlur(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const px = x + kx;
                    const py = y + ky;
                    
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = (py * width + px) * 4;
                        r += tempData[idx];
                        g += tempData[idx + 1];
                        b += tempData[idx + 2];
                        count++;
                    }
                }
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
}

// History (Undo/Redo)
function saveState() {
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
    
    updateUI();
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreState(state.history[state.historyIndex]);
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreState(state.history[state.historyIndex]);
    }
}

function restoreState(historyState) {
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
            duration: layerState.duration || 100
        };
    });
    
    state.activeLayerIndex = historyState.activeLayerIndex;
    
    updateLayersPanel();
    composeLayers();
    updateUI();
}

// UI Updates
function updateUI() {
    document.getElementById('undoBtn').disabled = state.historyIndex <= 0;
    document.getElementById('redoBtn').disabled = state.historyIndex >= state.history.length - 1;
}

// Metadata Editor
function showMetadataEditor() {
    document.getElementById('metaTitle').value = state.metadata.title || '';
    document.getElementById('metaAuthor').value = state.metadata.author || '';
    document.getElementById('metaDescription').value = state.metadata.description || '';
    document.getElementById('metaCopyright').value = state.metadata.copyright || '';
    
    const modal = document.getElementById('metadataModal');
    modal.classList.add('active');
}

function applyMetadata() {
    state.metadata.title = document.getElementById('metaTitle').value;
    state.metadata.author = document.getElementById('metaAuthor').value;
    state.metadata.description = document.getElementById('metaDescription').value;
    state.metadata.copyright = document.getElementById('metaCopyright').value;
    
    closeModal('metadataModal');
}

// Layer Duration Editor
function showLayerDurationModal(layerIndex) {
    state.tempLayerIndex = layerIndex;
    const layer = state.layers[layerIndex];
    document.getElementById('layerDurationInput').value = layer.duration;
    
    const modal = document.getElementById('layerDurationModal');
    modal.classList.add('active');
}

function applyLayerDuration() {
    const duration = parseInt(document.getElementById('layerDurationInput').value);
    if (duration >= MIN_LAYER_DURATION) {
        state.layers[state.tempLayerIndex].duration = duration;
        updateLayersPanel();
        saveState();
    }
    closeModal('layerDurationModal');
}

// Collapsible Sidebar Functions
function toggleSidebar(sidebarId) {
    const sidebar = document.getElementById(sidebarId);
    sidebar.classList.toggle('collapsed');
    
    // Save state to localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem(`${sidebarId}-collapsed`, isCollapsed);
}

function restoreUIState() {
    // Restore sidebar collapse states
    ['leftSidebar', 'rightSidebar'].forEach(sidebarId => {
        const isCollapsed = localStorage.getItem(`${sidebarId}-collapsed`) === 'true';
        if (isCollapsed) {
            document.getElementById(sidebarId).classList.add('collapsed');
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Event Listeners
function setupEventListeners() {
    // Canvas events
    state.canvas.addEventListener('mousedown', startDrawing);
    state.canvas.addEventListener('mousemove', draw);
    state.canvas.addEventListener('mouseup', stopDrawing);
    state.canvas.addEventListener('mouseleave', stopDrawing);
    
    // File operations
    document.getElementById('newBtn').addEventListener('click', createNewImage);
    document.getElementById('openBtn').addEventListener('click', openImage);
    document.getElementById('saveBtn').addEventListener('click', saveImage);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // Undo/Redo
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    
    // Tools
    document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            state.tool = this.dataset.tool;
        });
    });
    
    // Color pickers
    document.getElementById('foregroundColor').addEventListener('change', (e) => {
        state.foregroundColor = e.target.value;
    });
    
    document.getElementById('backgroundColor').addEventListener('change', (e) => {
        state.backgroundColor = e.target.value;
    });
    
    // Brush settings
    document.getElementById('brushSize').addEventListener('input', (e) => {
        state.brushSize = parseInt(e.target.value);
        document.getElementById('brushSizeValue').textContent = state.brushSize;
    });
    
    document.getElementById('opacity').addEventListener('input', (e) => {
        state.opacity = parseInt(e.target.value) / 100;
        document.getElementById('opacityValue').textContent = e.target.value;
    });
    
    // Layer controls
    document.getElementById('addLayerBtn').addEventListener('click', () => {
        createLayer();
        saveState();
    });
    
    document.getElementById('mergeLayersBtn').addEventListener('click', () => {
        if (state.activeLayerIndex > 0) {
            const activeLayer = state.layers[state.activeLayerIndex];
            const belowLayer = state.layers[state.activeLayerIndex - 1];
            
            // Draw active layer onto layer below
            belowLayer.ctx.globalAlpha = activeLayer.opacity;
            belowLayer.ctx.drawImage(activeLayer.canvas, 0, 0);
            belowLayer.ctx.globalAlpha = 1.0;
            
            // Delete active layer
            deleteLayer(state.activeLayerIndex);
        }
    });
    
    // Transforms
    document.getElementById('resizeBtn').addEventListener('click', resizeLayer);
    document.getElementById('rotateBtn').addEventListener('click', rotateLayer);
    document.getElementById('flipHBtn').addEventListener('click', flipLayerHorizontal);
    document.getElementById('flipVBtn').addEventListener('click', flipLayerVertical);
    
    // Effects
    document.getElementById('grayscaleBtn').addEventListener('click', applyGrayscale);
    document.getElementById('invertBtn').addEventListener('click', applyInvert);
    document.getElementById('brightnessBtn').addEventListener('click', () => {
        showEffectModal('Brightness', 'brightness');
    });
    document.getElementById('contrastBtn').addEventListener('click', () => {
        showEffectModal('Contrast', 'contrast');
    });
    document.getElementById('blurBtn').addEventListener('click', () => {
        showEffectModal('Blur', 'blur');
    });
    
    // Modal buttons
    document.getElementById('createNewBtn').addEventListener('click', applyNewImage);
    document.getElementById('cancelNewBtn').addEventListener('click', () => closeModal('newImageModal'));
    
    document.getElementById('applyResizeBtn').addEventListener('click', applyResize);
    document.getElementById('cancelResizeBtn').addEventListener('click', () => closeModal('resizeModal'));
    
    document.getElementById('applyEffectBtn').addEventListener('click', applyEffect);
    document.getElementById('cancelEffectBtn').addEventListener('click', () => closeModal('effectModal'));
    
    // Effect slider update
    document.getElementById('effectSlider').addEventListener('input', (e) => {
        document.getElementById('effectValue').textContent = e.target.value;
    });
    
    // Save modal controls
    document.getElementById('saveFormat').addEventListener('change', (e) => {
        const format = e.target.value;
        const qualityLabel = document.getElementById('qualityLabel');
        
        // Show quality slider for JPEG and WebP
        if (format === 'jpeg' || format === 'webp') {
            qualityLabel.style.display = 'block';
        } else {
            qualityLabel.style.display = 'none';
        }
    });
    
    document.getElementById('saveQuality').addEventListener('input', (e) => {
        document.getElementById('qualityValue').textContent = e.target.value;
    });
    
    document.getElementById('applySaveBtn').addEventListener('click', applySaveImage);
    document.getElementById('cancelSaveBtn').addEventListener('click', () => closeModal('saveModal'));
    
    // Metadata modal controls
    document.getElementById('metadataBtn').addEventListener('click', showMetadataEditor);
    document.getElementById('applyMetadataBtn').addEventListener('click', applyMetadata);
    document.getElementById('cancelMetadataBtn').addEventListener('click', () => closeModal('metadataModal'));
    
    // Layer duration modal controls
    document.getElementById('applyLayerDurationBtn').addEventListener('click', applyLayerDuration);
    document.getElementById('cancelLayerDurationBtn').addEventListener('click', () => closeModal('layerDurationModal'));
    
    // Collapsible sidebar controls
    document.getElementById('leftCollapseToggle').addEventListener('click', () => {
        toggleSidebar('leftSidebar');
    });
    
    document.getElementById('rightCollapseToggle').addEventListener('click', () => {
        toggleSidebar('rightSidebar');
    });
    
    // Resize width/height linking
    const resizeWidth = document.getElementById('resizeWidth');
    const resizeHeight = document.getElementById('resizeHeight');
    const maintainAspect = document.getElementById('maintainAspect');
    let aspectRatio = 1;
    
    resizeWidth.addEventListener('focus', () => {
        if (maintainAspect.checked) {
            aspectRatio = resizeWidth.value / resizeHeight.value;
        }
    });
    
    resizeWidth.addEventListener('input', () => {
        if (maintainAspect.checked) {
            resizeHeight.value = Math.round(resizeWidth.value / aspectRatio);
        }
    });
    
    resizeHeight.addEventListener('input', () => {
        if (maintainAspect.checked) {
            resizeWidth.value = Math.round(resizeHeight.value * aspectRatio);
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 's':
                    e.preventDefault();
                    saveImage();
                    break;
                case 'o':
                    e.preventDefault();
                    openImage();
                    break;
            }
        }
    });
}

// Start the application
init();
