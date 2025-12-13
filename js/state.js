// State Management Module

// Global state for managing workspaces
export const globalState = {
    workspaces: new Map(),
    activeWorkspaceId: 'start',
    nextWorkspaceId: 1
};

// Create a workspace state object
export function createWorkspaceState(canvas, ctx) {
    return {
        canvas: canvas,
        ctx: ctx,
        layers: [],
        activeLayerIndex: 0,
        tool: 'pointer',
        isDrawing: false,
        startX: 0,
        startY: 0,
        foregroundColor: '#000000',
        backgroundColor: '#FFFFFF',
        brushSize: 10,
        opacity: 1.0,
        fillTolerance: 32,
        gradientType: 'linear',
        history: [],
        historyIndex: -1,
        maxHistory: 50,
        metadata: {
            // Basic fields
            title: '',
            author: '',
            description: '',
            copyright: '',
            // Standard EXIF fields
            artist: '',
            software: 'Pura',
            dateTime: '',
            make: '',
            model: '',
            orientation: '',
            xResolution: '',
            yResolution: '',
            resolutionUnit: '',
            keywords: '',
            comment: ''
        },
        customMetadataFields: [], // Array of custom field names
        previewCanvas: null,
        previewCtx: null,
        moveOffsetX: 0,
        moveOffsetY: 0,
        // Selection state
        selection: null, // {x, y, width, height, imageData}
        selectionPath: null, // For freeform selection (array of points)
        selectionType: 'rect', // 'rect' or 'freeform'
        // Zoom state
        zoom: 1.0,
        zoomMin: 0.1,
        zoomMax: 10.0,
        // Text tool state
        fontSize: 24,
        fontFamily: 'Arial'
    };
}

// Get current workspace state
export function getState() {
    return globalState.workspaces.get(globalState.activeWorkspaceId);
}

// Application state (for backwards compatibility, now points to active workspace)
export let state = null;

export function setState(newState) {
    state = newState;
}
