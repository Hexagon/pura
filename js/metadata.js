// Metadata module: helpers and the property-grid editor
import { closeModal, showModal } from './ui.js';

let current = () => null;

export function initMetadata(getState) {
    current = getState;
}

// Metadata Helper Functions
export function hasMetadata(metadata) {
    // Check if any metadata field has a non-empty value
    for (const key in metadata) {
        if (key === 'custom') {
            if (metadata.custom && Object.keys(metadata.custom).length > 0) {
                return true;
            }
        } else {
            const value = metadata[key];
            if (value !== null && value !== undefined && value !== '') {
                return true;
            }
        }
    }
    return false;
}

export function cleanMetadataForExport(metadata) {
    const cleaned = {};
    
    // Copy non-empty values
    for (const key in metadata) {
        if (key === 'custom') {
            // Handle custom fields separately
            if (metadata.custom && Object.keys(metadata.custom).length > 0) {
                cleaned.custom = { ...metadata.custom };
            }
        } else {
            const value = metadata[key];
            // Only include non-null, non-undefined, non-empty values
            if (value !== null && value !== undefined && value !== '') {
                cleaned[key] = value;
            }
        }
    }
    
    return cleaned;
}

export function mergeMetadata(existingMetadata, newMetadata) {
    // Create a merged metadata object, preserving existing structure
    const merged = { ...existingMetadata };
    
    // Merge all fields from newMetadata
    for (const key in newMetadata) {
        if (key === 'custom') {
            // Merge custom fields
            if (newMetadata.custom) {
                merged.custom = {
                    ...(merged.custom || {}),
                    ...newMetadata.custom
                };
            }
        } else if (newMetadata[key] !== null && newMetadata[key] !== undefined && newMetadata[key] !== '') {
            merged[key] = newMetadata[key];
        }
    }
    
    return merged;
}

// Metadata Editor
export function updateMetadataTable() {
    const tbody = document.getElementById('metadataTableBody');
    tbody.innerHTML = '';
    
    // Metadata field groups
    const metadataGroups = [
        {
            name: 'Basic Information',
            fields: [
                { key: 'title', label: 'Title', type: 'text' },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'author', label: 'Author', type: 'text' },
                { key: 'copyright', label: 'Copyright', type: 'text' },
                { key: 'software', label: 'Software', type: 'text' },
                { key: 'userComment', label: 'User Comment', type: 'textarea' },
                { key: 'creationDate', label: 'Creation Date', type: 'datetime' }
            ]
        },
        {
            name: 'GPS Location',
            fields: [
                { key: 'latitude', label: 'Latitude', type: 'number' },
                { key: 'longitude', label: 'Longitude', type: 'number' }
            ]
        },
        {
            name: 'Camera Settings',
            fields: [
                { key: 'cameraMake', label: 'Camera Make', type: 'text' },
                { key: 'cameraModel', label: 'Camera Model', type: 'text' },
                { key: 'lensMake', label: 'Lens Make', type: 'text' },
                { key: 'lensModel', label: 'Lens Model', type: 'text' },
                { key: 'iso', label: 'ISO', type: 'number' },
                { key: 'exposureTime', label: 'Exposure Time (s)', type: 'number' },
                { key: 'fNumber', label: 'F-Number', type: 'number' },
                { key: 'focalLength', label: 'Focal Length (mm)', type: 'number' },
                { key: 'flash', label: 'Flash', type: 'number' },
                { key: 'whiteBalance', label: 'White Balance', type: 'number' },
                { key: 'orientation', label: 'Orientation', type: 'number' }
            ]
        },
        {
            name: 'Technical',
            fields: [
                { key: 'format', label: 'Format', type: 'text', readOnly: true },
                { key: 'compression', label: 'Compression', type: 'text', readOnly: true },
                { key: 'frameCount', label: 'Frame Count', type: 'number', readOnly: true },
                { key: 'bitDepth', label: 'Bit Depth', type: 'number', readOnly: true },
                { key: 'colorType', label: 'Color Type', type: 'text', readOnly: true },
                { key: 'dpiX', label: 'DPI X', type: 'number' },
                { key: 'dpiY', label: 'DPI Y', type: 'number' },
                { key: 'physicalWidth', label: 'Physical Width (in)', type: 'number' },
                { key: 'physicalHeight', label: 'Physical Height (in)', type: 'number' }
            ]
        }
    ];
    
    // Add each group
    metadataGroups.forEach(group => {
        addMetadataGroup(tbody, group.name, group.fields);
    });
    
    // Add custom fields group
    if (current().metadata.custom && Object.keys(current().metadata.custom).length > 0) {
        const customFields = Object.keys(current().metadata.custom).map(key => ({
            key: key,
            label: key,
            type: 'text',
            isCustom: true
        }));
        addMetadataGroup(tbody, 'Custom Fields', customFields);
    }
}

function addMetadataGroup(tbody, groupName, fields) {
    // Add group header row
    const headerRow = document.createElement('tr');
    headerRow.className = 'metadata-group-header';
    const headerCell = document.createElement('td');
    headerCell.colSpan = 2;
    headerCell.textContent = groupName;
    headerRow.appendChild(headerCell);
    tbody.appendChild(headerRow);
    
    // Add fields in this group
    fields.forEach(field => {
        addMetadataRow(tbody, field.key, field.label, field.type, field.isCustom || false, field.readOnly || false);
    });
}

function addMetadataRow(tbody, key, label, type, isCustom, readOnly) {
    const tr = document.createElement('tr');
    
    const tdLabel = document.createElement('td');
    const labelDiv = document.createElement('div');
    labelDiv.className = 'metadata-field-name';
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelDiv.appendChild(labelText);
    
    if (isCustom) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'metadata-delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Remove field';
        deleteBtn.addEventListener('click', () => {
            removeCustomMetadataField(key);
        });
        labelDiv.appendChild(deleteBtn);
    }
    
    tdLabel.appendChild(labelDiv);
    
    const tdInput = document.createElement('td');
    let input;
    
    if (type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 2;
    } else {
        input = document.createElement('input');
        if (type === 'number') {
            input.type = 'number';
            input.step = 'any';
        } else if (type === 'datetime') {
            input.type = 'datetime-local';
        } else {
            input.type = 'text';
        }
    }
    
    input.className = 'metadata-input';
    
    // Get value from appropriate location (custom fields are in metadata.custom)
    let value;
    if (isCustom) {
        value = current().metadata.custom?.[key] || '';
    } else {
        value = current().metadata[key];
        // Handle date conversion
        if (type === 'datetime' && value instanceof Date) {
            // Convert Date to datetime-local format
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            const hours = String(value.getHours()).padStart(2, '0');
            const minutes = String(value.getMinutes()).padStart(2, '0');
            value = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else if (value === null || value === undefined) {
            value = '';
        }
    }
    
    input.value = value;
    input.placeholder = '';
    
    // Set read-only if specified
    if (readOnly) {
        input.readOnly = true;
        input.style.cursor = 'default';
        input.style.backgroundColor = 'transparent';
    }
    
    input.addEventListener('input', (e) => {
        let newValue = e.target.value;
        
        // Convert value based on type
        if (type === 'number') {
            newValue = newValue === '' ? null : parseFloat(newValue);
        } else if (type === 'datetime') {
            newValue = newValue === '' ? null : new Date(newValue);
        }
        
        // Store in appropriate location
        if (isCustom) {
            if (!current().metadata.custom) {
                current().metadata.custom = {};
            }
            current().metadata.custom[key] = newValue;
        } else {
            current().metadata[key] = newValue;
        }
    });
    
    tdInput.appendChild(input);
    
    tr.appendChild(tdLabel);
    tr.appendChild(tdInput);
    tbody.appendChild(tr);
}

export function showAddMetadataFieldModal() {
    document.getElementById('newMetadataFieldName').value = '';
    showModal('addMetadataFieldModal');
}

export function applyAddMetadataField() {
    const fieldName = document.getElementById('newMetadataFieldName').value.trim();
    
    if (!fieldName) {
        alert('Please enter a field name');
        return;
    }
    
    // Check if field already exists in standard fields or custom fields
    if (Object.prototype.hasOwnProperty.call(current().metadata, fieldName) || 
        (current().metadata.custom && Object.prototype.hasOwnProperty.call(current().metadata.custom, fieldName))) {
        alert('A field with this name already exists');
        return;
    }
    
    // Initialize custom object if needed
    if (!current().metadata.custom) {
        current().metadata.custom = {};
    }
    
    // Add to custom fields
    current().metadata.custom[fieldName] = '';
    
    updateMetadataTable();
    closeModal('addMetadataFieldModal');
}

function removeCustomMetadataField(fieldName) {
    if (confirm(`Remove field "${fieldName}"?`)) {
        // Remove from custom fields
        if (current().metadata.custom && Object.prototype.hasOwnProperty.call(current().metadata.custom, fieldName)) {
            delete current().metadata.custom[fieldName];
        }
        
        updateMetadataTable();
    }
}
