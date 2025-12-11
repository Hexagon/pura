// File I/O operations module
import { Image } from './constants.js';
import { MULTI_FRAME_FORMATS } from './constants.js';

export async function openImage(createWorkspace, createLayerObject, globalState, mergeMetadata, updateLayersPanel, updateMetadataTable, composeLayers, saveState) {
    const input = document.getElementById('fileInput');
    input.click();
}

export async function handleFileUpload(e, createWorkspace, createLayerObject, globalState, mergeMetadata, updateLayersPanel, updateMetadataTable, composeLayers, saveState) {
    const file = e.target.files[0];
    if (!file) return;
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    try {
        const image = await Image.read(uint8Array);
        
        // Check if image has multiple frames
        const isMultiFrame = image.frames && image.frames.length > 1;
        
        let width, height;
        
        if (isMultiFrame) {
            // Find largest frame dimensions
            let maxWidth = 0;
            let maxHeight = 0;
            for (const frame of image.frames) {
                if (frame.width > maxWidth) maxWidth = frame.width;
                if (frame.height > maxHeight) maxHeight = frame.height;
            }
            width = maxWidth;
            height = maxHeight;
        } else {
            width = image.width;
            height = image.height;
        }
        
        // Create new workspace
        const workspaceId = createWorkspace(file.name, width, height, 'transparent');
        const workspaceState = globalState.workspaces.get(workspaceId);
        
        // Clear the default background layer
        workspaceState.layers = [];
        
        if (isMultiFrame) {
            // Load each frame as a separate layer
            for (const [i, frame] of image.frames.entries()) {
                const layer = createLayerObject(workspaceState, `${file.name} - Frame ${i + 1}`);
                
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
                
                workspaceState.layers.push(layer);
            }
            workspaceState.activeLayerIndex = 0;
        } else {
            // Single frame image - create layer with the loaded image
            const newLayer = createLayerObject(workspaceState, file.name);
            
            // Convert image data to ImageData and draw
            const imageData = new ImageData(
                new Uint8ClampedArray(image.data),
                image.width,
                image.height
            );
            newLayer.ctx.putImageData(imageData, 0, 0);
            
            workspaceState.layers.push(newLayer);
            workspaceState.activeLayerIndex = 0;
        }
        
        // Re-index layers
        workspaceState.layers.forEach((layer, index) => {
            layer.id = index;
        });
        
        // Load metadata from image if available
        if (image.metadata) {
            workspaceState.metadata = mergeMetadata(workspaceState.metadata, image.metadata);
        }
        
        updateLayersPanel();
        updateMetadataTable();
        composeLayers();
        saveState();
    } catch (error) {
        console.error('Error loading image:', error);
        alert('Error loading image. Please try a different file.');
    }
}

export async function importAsLayer(globalState) {
    // Check if we're in a workspace
    if (globalState.activeWorkspaceId === 'start') {
        alert('Please create or open an image first before importing layers.');
        return;
    }
    
    const input = document.getElementById('importLayerInput');
    input.click();
}

export async function handleImportLayer(e, globalState, createLayer, composeLayers, saveState) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if we're in a workspace
    if (globalState.activeWorkspaceId === 'start') {
        alert('Please create or open an image first before importing layers.');
        return;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    try {
        const image = await Image.read(uint8Array);
        
        // Check if image has multiple frames
        const isMultiFrame = image.frames && image.frames.length > 1;
        
        if (isMultiFrame) {
            // Import each frame as a separate layer
            for (const [i, frame] of image.frames.entries()) {
                const layer = createLayer(`${file.name} - Frame ${i + 1}`);
                
                // Set duration if available
                if (frame.duration !== undefined) {
                    layer.duration = frame.duration;
                }
                
                // Convert frame data to ImageData and draw
                // Note: We don't change canvas dimensions, just draw the image
                const imageData = new ImageData(
                    new Uint8ClampedArray(frame.data),
                    frame.width,
                    frame.height
                );
                
                // Create temporary canvas to hold the image
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = frame.width;
                tempCanvas.height = frame.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);
                
                // Draw onto layer canvas (may be clipped if image is larger)
                layer.ctx.drawImage(tempCanvas, 0, 0);
            }
        } else {
            // Single frame image - create layer with the loaded image
            const newLayer = createLayer(file.name);
            
            // Convert image data to ImageData
            const imageData = new ImageData(
                new Uint8ClampedArray(image.data),
                image.width,
                image.height
            );
            
            // Create temporary canvas to hold the image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = image.width;
            tempCanvas.height = image.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(imageData, 0, 0);
            
            // Draw onto layer canvas (may be clipped if image is larger)
            newLayer.ctx.drawImage(tempCanvas, 0, 0);
        }
        
        composeLayers();
        saveState();
    } catch (error) {
        console.error('Error importing layer:', error);
        alert('Error importing layer. Please try a different file.');
    }
    
    // Clear the input so the same file can be imported again
    e.target.value = '';
}

export async function saveImage() {
    // Show save dialog instead of immediately saving
    const modal = document.getElementById('saveModal');
    modal.classList.add('active');
}

export async function applySaveImage(state, hasMetadata, cleanMetadataForExport, closeModal) {
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
                    frameMetadata: {
                        delay: layer.duration
                    }
                });
            }
            
            // Create MultiFrameImageData object
            const multiFrameImageData = {
                width: state.canvas.width,
                height: state.canvas.height,
                frames: frames,
                metadata: hasMetadata(state.metadata) ? cleanMetadataForExport(state.metadata) : undefined
            };
            
            // Encode based on format using Image.encodeFrames
            if (format === 'gif') {
                fileData = await Image.encodeFrames('gif', multiFrameImageData);
                mimeType = 'image/gif';
                extension = 'gif';
            } else if (format === 'apng') {
                fileData = await Image.encodeFrames('apng', multiFrameImageData);
                mimeType = 'image/apng';
                extension = 'apng';
            } else if (format === 'tiff') {
                fileData = await Image.encodeFrames('tiff', multiFrameImageData);
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
            
            // Apply metadata if available using setMetadata method
            if (hasMetadata(state.metadata)) {
                // Clean metadata - remove null/undefined/empty values
                const cleanMetadata = cleanMetadataForExport(state.metadata);
                image.setMetadata(cleanMetadata, false);
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
                case 'heic':
                    fileData = await image.save('heic', { quality: quality / 100 });
                    mimeType = 'image/heic';
                    extension = 'heic';
                    break;
                case 'avif':
                    fileData = await image.save('avif', { quality: quality / 100 });
                    mimeType = 'image/avif';
                    extension = 'avif';
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
