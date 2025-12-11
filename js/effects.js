// Effects and transforms module
import { Image } from './constants.js';

export async function resizeLayer(state) {
    const layer = state.layers[state.activeLayerIndex];
    document.getElementById('resizeWidth').value = layer.canvas.width;
    document.getElementById('resizeHeight').value = layer.canvas.height;
    
    const modal = document.getElementById('resizeModal');
    modal.classList.add('active');
}

export async function applyResize(state, composeLayers, saveState, closeModal) {
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

export function rotateLayer(state, composeLayers, saveState) {
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

export function flipLayerHorizontal(state, composeLayers, saveState) {
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

export function flipLayerVertical(state, composeLayers, saveState) {
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

export function applyGrayscale(state, composeLayers, saveState) {
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

export function applyInvert(state, composeLayers, saveState) {
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

export function showEffectModal(effectName, effectFunction) {
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

export function applyEffect(state, composeLayers, saveState, closeModal) {
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

export function applyBoxBlur(imageData, radius) {
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
