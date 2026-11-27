// State Management Module

export const globalState = {
    workspaces: new Map(),
    activeWorkspaceId: 'start',
    nextWorkspaceId: 1
};

// Tool settings that carry over when switching between workspaces
export const SHARED_TOOL_SETTINGS = [
    'tool', 'foregroundColor', 'backgroundColor', 'brushSize', 'opacity',
    'fillTolerance', 'gradientType', 'shapeFill', 'fontSize', 'fontFamily',
    'fontBold', 'fontItalic'
];

export function createWorkspaceState(canvas, ctx) {
    return {
        name: 'Untitled',
        canvas,
        ctx,
        layers: [],
        activeLayerIndex: 0,
        tool: 'brush',
        isDrawing: false,
        startX: 0,
        startY: 0,
        foregroundColor: '#000000',
        backgroundColor: '#FFFFFF',
        brushSize: 10,
        opacity: 1.0,
        fillTolerance: 32,
        gradientType: 'linear',
        shapeFill: 'stroke',
        history: [],
        historyIndex: -1,
        maxHistory: 50,
        dirty: false,
        metadata: {
            title: '',
            author: '',
            description: '',
            copyright: '',
            software: 'Pura'
        },
        previewCanvas: null,
        previewCtx: null,
        selectionCanvas: null,
        selectionCtx: null,
        // Selection (coordinates are local to the active layer)
        selection: null, // {x, y, width, height, imageData}
        selectionPath: null, // freeform polygon points
        selectionType: 'rect',
        zoom: 1.0,
        zoomMin: 0.05,
        zoomMax: 32.0,
        fontSize: 24,
        fontFamily: 'Arial',
        fontBold: false,
        fontItalic: false
    };
}

export function getState() {
    return globalState.workspaces.get(globalState.activeWorkspaceId);
}
