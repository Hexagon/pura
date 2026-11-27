// UI Utilities Module

export function updateUI(state) {
    if (!state) return;
    document.getElementById('undoBtn').disabled = state.historyIndex <= 0;
    document.getElementById('redoBtn').disabled = state.historyIndex >= state.history.length - 1;
}

// On phones the inspector is a bottom sheet over the canvas: it starts closed and its
// open/closed state is not persisted, so it never overrides the desktop preference
export const compactLayout = window.matchMedia('(max-width: 760px)');

export function toggleSidebar(sidebarId, collapsed) {
    const sidebar = document.getElementById(sidebarId);
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    if (!compactLayout.matches) {
        localStorage.setItem(`${sidebarId}-collapsed`, sidebar.classList.contains('collapsed'));
    }
}

function applySidebarState() {
    for (const id of ['rightSidebar']) {
        const collapsed = compactLayout.matches || localStorage.getItem(`${id}-collapsed`) === 'true';
        document.getElementById(id)?.classList.toggle('collapsed', collapsed);
    }
}

export function restoreUIState() {
    applySidebarState();
    compactLayout.addEventListener('change', applySidebarState);
    restorePanelStates();
}

export function togglePanelSection(panelName) {
    const header = document.querySelector(`[data-panel="${panelName}"]`);
    const section = header?.closest('.panel-section');
    if (!section) return;
    section.classList.toggle('collapsed');
    localStorage.setItem(`panel-${panelName}-collapsed`, section.classList.contains('collapsed'));
}

export function restorePanelStates() {
    document.querySelectorAll('[data-panel]').forEach(header => {
        const stored = localStorage.getItem(`panel-${header.dataset.panel}-collapsed`);
        if (stored === null) return;
        header.closest('.panel-section')?.classList.toggle('collapsed', stored === 'true');
    });
}

export function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    const focusable = modal.querySelector('textarea, input:not([type="checkbox"]):not([type="range"]), select');
    focusable?.focus();
    focusable?.select?.();
}

export function getOpenModal() {
    return document.querySelector('.modal.active');
}

export function toast(message, type = 'info') {
    const container = document.getElementById('toasts');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.classList.add('hide'), type === 'error' ? 5000 : 2500);
    setTimeout(() => el.remove(), type === 'error' ? 5400 : 2900);
}
