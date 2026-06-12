// API Configuration
function resolveApiBaseUrl() {
    const fromWindow = window.GibsyNetApi?.baseUrl;
    const fromStorage = localStorage.getItem('gibsynet_api_base');
    return String(fromWindow || fromStorage || 'http://localhost:3001/api').replace(/\/$/, '');
}

const API_BASE_URL = resolveApiBaseUrl();
const COB_ENDPOINT = window.GibsyNetApi?.endpoints?.cob || `${API_BASE_URL}/cob`;

// Global Variables
let currentSubCobId = null;
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let subcobData = [];
let cobData = [];
let versionHistory = [];
let softDeletedSubcobs = [];

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const subcobForm = document.getElementById('subcobForm');
const subcobIdInput = document.getElementById('subcobId');
const cobCodeSelect = document.getElementById('cobCode');
const cobNameInput = document.getElementById('cobName');
const subCobCodeInput = document.getElementById('subCobCode');
const subCobNameInput = document.getElementById('subCobName');
const subcobTableBody = document.getElementById('subcobTableBody');
const searchInput = document.getElementById('searchInput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const rowCount = document.getElementById('rowCount');
const newBtnSidebar = document.getElementById('newBtnSidebar');
const saveBtnSidebar = document.getElementById('saveBtnSidebar');
const deleteBtnSidebar = document.getElementById('deleteBtnSidebar');
const exportBtnSidebar = document.getElementById('exportBtnSidebar');

// Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
const messageModal = document.getElementById('messageModal');
const messageText = document.getElementById('messageText');
const messageOk = document.getElementById('messageOk');

// Helper Functions
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showMessage(message, isError = false) {
    messageText.textContent = message;
    if (isError) {
        messageText.style.color = '#ef4444';
        document.querySelector('#messageModal h3 i').className = 'fas fa-exclamation-circle text-red-500 mr-2';
    } else {
        messageText.style.color = '#374151';
        document.querySelector('#messageModal h3 i').className = 'fas fa-check-circle text-green-500 mr-2';
    }
    messageModal.classList.add('show');
}

function closeMessageModal() {
    messageModal.classList.remove('show');
}

function showConfirm(message, onConfirm) {
    confirmMessage.textContent = message;
    confirmModal.classList.add('show');
    
    const handleConfirm = () => {
        onConfirm();
        confirmModal.classList.remove('show');
        confirmOk.removeEventListener('click', handleConfirm);
        confirmCancel.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        confirmModal.classList.remove('show');
        confirmOk.removeEventListener('click', handleConfirm);
        confirmCancel.removeEventListener('click', handleCancel);
    };
    
    confirmOk.addEventListener('click', handleConfirm);
    confirmCancel.addEventListener('click', handleCancel);
}

function resetForm() {
    currentSubCobId = null;
    subcobIdInput.value = '';
    cobCodeSelect.value = '';
    cobNameInput.value = '';
    subCobNameInput.value = '';
    subCobCodeInput.value = '';
    subCobNameInput.focus();
}

function toThreeChars(value) {
    const cleaned = String(value || '').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned.slice(0, 3);
}

function generateSubCobCode(cobName, subCobName) {
    const cobPart = toThreeChars(cobName);
    const subPart = toThreeChars(subCobName);

    if (!cobPart && !subPart) return '';
    return `${cobPart}${subPart}`;
}

function syncSubCobCodeFromName() {
    subCobCodeInput.value = generateSubCobCode(cobNameInput.value, subCobNameInput.value);
}

async function parseErrorMessage(response, fallbackMessage) {
    try {
        const payload = await response.json();
        const message = payload?.message || payload?.error || payload?.details;
        if (message) return String(message);
    } catch (_) {
    }

    try {
        const text = await response.text();
        if (text) return text;
    } catch (_) {
    }

    return fallbackMessage;
}

function isSubCobInactive(item) {
    if (!item || typeof item !== 'object') return false;

    const status = String(item.status || '').trim().toLowerCase();
    const isDeletedFlag = item.is_deleted === true
        || item.is_deleted === 1
        || String(item.is_deleted || '').toLowerCase() === 'true';
    const hasDeletedAt = Boolean(item.deletedAt || item.deleted_at);

    return status === 'inactive'
        || status === 'deleted'
        || item._deleted === true
        || isDeletedFlag
        || hasDeletedAt;
}

function getSubCobRecordKey(itemOrId) {
    if (!itemOrId) return '';
    if (typeof itemOrId === 'object') {
        return String(
            itemOrId.sub_cob_id
            ?? itemOrId.subcob_id
            ?? itemOrId.subCobId
            ?? itemOrId.id
            ?? ''
        ).trim();
    }

    return String(itemOrId).trim();
}

function isTrackedSoftDeleted(itemOrId) {
    const key = getSubCobRecordKey(itemOrId);
    if (!key) return false;
    return softDeletedSubcobs.some((item) => getSubCobRecordKey(item) === key);
}

function upsertSoftDeletedSubCob(record) {
    const key = getSubCobRecordKey(record);
    if (!key) return null;

    const deletedRecord = {
        ...record,
        sub_cob_id: key,
        subcob_id: key,
        status: 'inactive',
        is_deleted: true,
        _deleted: true,
        deletedAt: record.deletedAt || record.deleted_at || new Date().toISOString(),
        deleted_at: record.deleted_at || record.deletedAt || new Date().toISOString()
    };

    const existingIndex = softDeletedSubcobs.findIndex((item) => getSubCobRecordKey(item) === key);
    if (existingIndex >= 0) {
        softDeletedSubcobs[existingIndex] = deletedRecord;
    } else {
        softDeletedSubcobs.unshift(deletedRecord);
    }

    return deletedRecord;
}

function removeSoftDeletedSubCob(itemOrId) {
    const key = getSubCobRecordKey(itemOrId);
    if (!key) return;
    softDeletedSubcobs = softDeletedSubcobs.filter((item) => getSubCobRecordKey(item) !== key);
}

function normalizeSubCOBRows(payload) {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.rows)
                ? payload.rows
                : Array.isArray(payload?.result)
                    ? payload.result
                    : [];

    return rows
        .map((item) => {
            if (!item || typeof item !== 'object') return null;

            const cobCode = String(item.cob_code ?? item.cob ?? item.cobCode ?? '').trim();
            const cobName = String(item.cob_name ?? item.cobName ?? '').trim();
            const subCobId = String(item.sub_cob_id ?? item.subcob_id ?? item.subCobId ?? item.id ?? '').trim();
            const subCobCode = String(item.sub_cob_code ?? item.subCobCode ?? item.subcob_code ?? item.subcobCode ?? '').trim();
            const subCobName = String(item.sub_cob_name ?? item.subCobName ?? item.sub_cob ?? item.subCob ?? '').trim();
            const deletedAt = String(item.deletedAt ?? item.deleted_at ?? '').trim();
            const inactive = isSubCobInactive(item);

            return {
                ...item,
                sub_cob_id: subCobId,
                subcob_id: subCobId,
                cob_code: cobCode,
                cob_name: cobName,
                sub_cob_code: subCobCode,
                sub_cob_name: subCobName,
                status: inactive ? 'inactive' : String(item.status || 'active').trim().toLowerCase() || 'active',
                is_deleted: inactive,
                _deleted: inactive,
                deletedAt: deletedAt || (inactive ? String(item.deletedAt || item.deleted_at || new Date().toISOString()) : ''),
                deleted_at: deletedAt || (inactive ? String(item.deleted_at || item.deletedAt || new Date().toISOString()) : '')
            };
        })
        .filter(Boolean);
}

function buildSubCobApiPayload(record = {}, overrides = {}) {
    const source = record && typeof record === 'object' ? record : {};
    const subCobName = String(source.sub_cob_name || source.subCobName || source.sub_cob || source.subCob || '').trim();
    const cobCode = String(source.cob_code || source.cobCode || source.cob || '').trim();
    const cobName = String(source.cob_name || source.cobName || '').trim();
    const subCobCode = String(source.sub_cob_code || source.subCobCode || '').trim();
    const subCobId = String(source.sub_cob_id || source.subcob_id || source.subCobId || source.id || '').trim();

    return {
        id: subCobId,
        sub_cob_id: subCobId,
        subcob_id: subCobId,
        subCobId,
        cob_code: cobCode,
        cobCode: cobCode,
        cob: cobCode,
        cob_name: cobName,
        cobName,
        sub_cob_code: subCobCode,
        subCobCode,
        sub_cob_name: subCobName,
        subCobName: subCobName,
        sub_cob: subCobName,
        subCob: subCobName,
        status: 'active',
        is_deleted: false,
        _deleted: false,
        deleted_at: null,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
        ...overrides
    };
}

// API Calls
async function fetchCOBData() {
    try {
        const response = await fetch(COB_ENDPOINT);
        if (!response.ok) throw new Error('Failed to fetch COB data');
        const payload = await response.json();
        cobData = normalizeCOBRows(payload);
        populateCOBSelect();
    } catch (error) {
        console.error('Error fetching COB:', error);
        showMessage('Failed to load COB data', true);
    }
}

function normalizeCOBRows(payload) {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.rows)
                ? payload.rows
                : Array.isArray(payload?.result)
                    ? payload.result
                    : [];

    return rows
        .map((item) => {
            if (!item || typeof item !== 'object') return null;

            const cobCode = String(
                item.cob_code
                ?? item.cobCode
                ?? item.code
                ?? item.id
                ?? ''
            ).trim();
            const cobName = String(
                item.cob_name
                ?? item.cobName
                ?? item.name
                ?? item.description
                ?? cobCode
                ?? ''
            ).trim();

            if (!cobCode && !cobName) return null;

            return {
                ...item,
                cob_code: cobCode || cobName,
                cob_name: cobName || cobCode
            };
        })
        .filter(Boolean);
}

function extractFirstObject(payload) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
        if (payload.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) return payload.result;
    }

    return payload;
}

function resolveSubCobId(item) {
    if (!item || typeof item !== 'object') return '';
    return String(
        item.sub_cob_id
        ?? item.subcob_id
        ?? item.subCobId
        ?? item.id
        ?? ''
    ).trim();
}

function populateSubCobForm(record, idFallback = '') {
    const data = record && typeof record === 'object' ? record : {};
    currentSubCobId = resolveSubCobId(data) || String(idFallback || '').trim();
    subcobIdInput.value = currentSubCobId;
    cobCodeSelect.value = String(data.cob_code || '').trim();

    const event = new Event('change');
    cobCodeSelect.dispatchEvent(event);

    subCobCodeInput.value = String(data.sub_cob_code || '').trim();
    subCobNameInput.value = String(data.sub_cob_name || '').trim();
}

function populateCOBSelect() {
    cobCodeSelect.innerHTML = '<option value="">Select COB Code</option>';
    cobData.forEach(cob => {
        const option = document.createElement('option');
        option.value = String(cob.cob_code || cob.cobCode || cob.code || '').trim();
        const cobName = String(cob.cob_name || cob.cobName || cob.name || option.value).trim();
        option.textContent = `${option.value} - ${cobName}`;
        option.dataset.cobName = cobName;
        cobCodeSelect.appendChild(option);
    });
}

// When COB is selected, auto-fill COB Name
cobCodeSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption && selectedOption.dataset.cobName) {
        cobNameInput.value = selectedOption.dataset.cobName;
    } else {
        cobNameInput.value = '';
    }

    syncSubCobCodeFromName();
});

subCobNameInput.addEventListener('input', syncSubCobCodeFromName);

async function fetchSubCOBData() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/sub-cob`);
        if (!response.ok) throw new Error('Failed to fetch Sub COB data');
        const payload = await response.json();
        subcobData = normalizeSubCOBRows(payload);
        totalRecords = subcobData.length;
        renderTable();
        updateMetrics();
    } catch (error) {
        console.error('Error fetching Sub COB:', error);
        subcobData = [];
        totalRecords = subcobData.length;
        renderTable();
        updateMetrics();
    } finally {
        hideLoading();
    }
}

async function saveSubCOB() {
    // Validate form
    if (!cobCodeSelect.value || !subCobCodeInput.value || !subCobNameInput.value) {
        showMessage('Please fill all required fields', true);
        return;
    }
    
    const subcob = {
        cob_code: cobCodeSelect.value,
        cob: cobCodeSelect.value,
        cob_name: cobNameInput.value,
        sub_cob_code: subCobCodeInput.value,
        sub_cob_name: subCobNameInput.value,
        sub_cob: subCobNameInput.value
    };
    const payload = buildSubCobApiPayload({
        ...subcob,
        sub_cob_id: currentSubCobId,
        subcob_id: currentSubCobId,
        subCobId: currentSubCobId,
        id: currentSubCobId
    }, {
        ...subcob,
        status: 'active',
        is_deleted: false,
        _deleted: false,
        deleted_at: null,
        deletedAt: null
    });
    
    showLoading();
    try {
        let response;
        if (currentSubCobId) {
            // Update existing
            response = await fetch(`${API_BASE_URL}/sub-cob/${encodeURIComponent(currentSubCobId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create new
            response = await fetch(`${API_BASE_URL}/sub-cob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        if (!response.ok) {
            const fallbackMessage = `Failed to save Sub COB (status ${response.status})`;
            const message = await parseErrorMessage(response, fallbackMessage);
            throw new Error(message);
        }

        const result = await response.json().catch(() => null);
        const record = result?.data || result?.result || result || payload;

        addVersion(currentSubCobId ? 'Updated' : 'Created', record);

        showMessage(currentSubCobId ? 'Sub COB updated successfully' : 'Sub COB created successfully');
        resetForm();
        await fetchSubCOBData();
    } catch (error) {
        console.error('Error saving Sub COB:', error);
        showMessage(String(error?.message || 'Failed to save Sub COB'), true);
    } finally {
        hideLoading();
    }
}

async function deleteSubCOB() {
    if (!currentSubCobId) {
        showMessage('Please select a record to delete', true);
        return;
    }
    
    showConfirm('Are you sure you want to delete this Sub COB?', async () => {
        showLoading();
        try {
            const record = subcobData.find((item) => resolveSubCobId(item) === String(currentSubCobId).trim());
            if (!record) {
                throw new Error('Selected Sub COB record is not available');
            }

            const deletedAt = new Date().toISOString();
            const payload = buildSubCobApiPayload(record, {
                status: 'inactive',
                is_deleted: true,
                _deleted: true,
                deleted_at: deletedAt,
                deletedAt,
                updatedAt: deletedAt
            });

            const response = await fetch(`${API_BASE_URL}/sub-cob/${encodeURIComponent(currentSubCobId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const fallbackMessage = `Failed to soft delete Sub COB (status ${response.status})`;
                const message = await parseErrorMessage(response, fallbackMessage);
                throw new Error(message);
            }

            const resJson = await response.json().catch(() => null);
            const deletedRecord = resJson?.data || resJson?.result || resJson || payload;
            upsertSoftDeletedSubCob({ ...deletedRecord, ...payload });
            addVersion('Deleted', deletedRecord);
            showMessage('Sub COB moved to Soft Delete successfully');
            resetForm();
            await fetchSubCOBData();
        } catch (error) {
            console.error('Error deleting Sub COB:', error);
            showMessage(String(error?.message || 'Failed to delete Sub COB'), true);
        } finally {
            hideLoading();
        }
    });
}

// Table Rendering
function renderTable() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredData = subcobData.filter((item) => !isSubCobInactive(item) && !isTrackedSoftDeleted(item));
    filteredData = filteredData.filter(item => 
        String(item.sub_cob_code || '').toLowerCase().includes(searchTerm) ||
        String(item.sub_cob_name || '').toLowerCase().includes(searchTerm) ||
        String(item.cob_code || '').toLowerCase().includes(searchTerm) ||
        String(item.cob_name || '').toLowerCase().includes(searchTerm)
    );
    
    totalRecords = filteredData.length;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredData.slice(startIndex, endIndex);
    subcobTableBody.innerHTML = '';
    pageData.forEach((item, index) => {
        const row = subcobTableBody.insertRow();
        const subCobId = resolveSubCobId(item) || String(index + 1);
        const safeSubCobId = String(subCobId).replace(/"/g, '&quot;');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm">${startIndex + index + 1}</td>
            <td class="px-4 py-3 text-sm font-mono">${item.cob_code}</td>
            <td class="px-4 py-3 text-sm">${item.cob_name}</td>
            <td class="px-4 py-3 text-sm font-mono">${item.sub_cob_code}</td>
            <td class="px-4 py-3 text-sm">${item.sub_cob_name}</td>
            <td class="px-4 py-3 text-sm">
                <button type="button" class="text-blue-600 hover:text-blue-800 mr-2" data-edit-subcob="${safeSubCobId}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
    });
    
    rowCount.textContent = totalRecords;
    const totalPages = Math.ceil(totalRecords / pageSize);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Edit function (global for onclick)
window.editSubCOB = async function(id) {
    showLoading();
    try {
        const normalizedId = String(id || '').trim();
        const record = subcobData.find((item) => resolveSubCobId(item) === normalizedId) || null;
        if (!record) {
            throw new Error('Failed to fetch Sub COB details');
        }

        populateSubCobForm(record, normalizedId);
    } catch (error) {
        console.error('Error fetching Sub COB details:', error);
        showMessage('Failed to load record details', true);
    } finally {
        hideLoading();
    }
};

window.deleteSubCOBById = function(id) {
    currentSubCobId = id;
    deleteSubCOB();
};

subcobTableBody.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-subcob]');
    if (!editButton) return;

    const subCobId = editButton.getAttribute('data-edit-subcob') || '';
    if (!subCobId) return;

    window.editSubCOB(subCobId);
});

// Restore handler for soft-delete list (event delegation)
document.addEventListener('click', async (e) => {
    const restoreBtn = e.target.closest && e.target.closest('[data-restore]');
    if (!restoreBtn) return;
    const id = restoreBtn.getAttribute('data-restore');
    if (!id) return;

    showLoading();
    try {
        const payload = buildSubCobApiPayload(
            subcobData.find((s) => String(s.subcob_id || s.id) === String(id)) || { sub_cob_id: id },
            { status: 'active', is_deleted: false, _deleted: false, deletedAt: null, deleted_at: null, updatedAt: new Date().toISOString() }
        );
        let response = await fetch(`${API_BASE_URL}/sub-cob/${encodeURIComponent(id)}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!response || !response.ok) {
            response = await fetch(`${API_BASE_URL}/sub-cob/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => null);
        }

        if (response && response.ok) {
            const restoredRecord = softDeletedSubcobs.find((s) => String(s.subcob_id || s.id) === String(id))
                || subcobData.find((s) => String(s.subcob_id || s.id) === String(id))
                || { subcob_id: id };
            removeSoftDeletedSubCob(id);
            addVersion('Restored', restoredRecord);
            showMessage('Sub COB restored successfully');
            await fetchSubCOBData();
        } else {
            throw new Error('Failed to restore record');
        }
    } catch (err) {
        console.error('Failed to restore:', err);
        showMessage('Failed to restore record', true);
    } finally {
        hideLoading();
    }
});

// Metrics Update - implement similar logic to cob.js
function addVersion(action, product) {
    versionHistory.unshift({
        action,
        productId: product.subcob_id || product.id || '',
        label: `${product.cob_code} - ${product.sub_cob_name || product.sub_cob_code}`,
        actor: 'System',
        time: new Date().toLocaleString('en-US')
    });

    versionHistory = versionHistory.slice(0, 10);
}

function getSoftDeletedSubcobs() {
    return softDeletedSubcobs;
}

function renderImpactAnalysis() {
    const tbody = document.getElementById('impactTableBody');
    const metric = document.getElementById('metricImpact');
    if (!tbody) return;

    const active = subcobData.filter((i) => !isSubCobInactive(i));
    const rows = [
        { tool: 'Quotation Engine', impact: Math.min(100, active.length * 8), risk: active.length > 14 ? 'High' : 'Medium' },
        { tool: 'Policy Admin', impact: active.length > 3 ? 82 : 65, risk: active.length > 3 ? 'High' : 'Low' },
        { tool: 'Reporting Engine', impact: Math.min(96, active.length * 10), risk: active.length > 8 ? 'Medium' : 'Low' }
    ];

    tbody.innerHTML = rows
        .map((item) => `<tr><td class="py-2">${item.tool}</td><td>${item.impact}%</td><td>${item.risk}</td></tr>`)
        .join('');

    if (metric) {
        const average = Math.round(rows.reduce((sum, item) => sum + item.impact, 0) / rows.length);
        metric.textContent = String(average);
    }
}

function renderVersioning() {
    const container = document.getElementById('versionList');
    const metric = document.getElementById('metricVersions');
    if (metric) metric.textContent = String(versionHistory.length);
    if (!container) return;

    if (!versionHistory.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No data changes yet.</p>';
        return;
    }

    container.innerHTML = versionHistory
        .map((item) => `
            <div class="version-item">
                <div class="font-semibold text-sm text-gray-800">${item.action} - ${item.productId}</div>
                <div class="text-sm text-gray-600">${item.label}</div>
                <div class="version-meta">${item.actor} • ${item.time}</div>
            </div>
        `)
        .join('');
}

function renderSoftDeletePanel() {
    const container = document.getElementById('softDeleteList');
    const metric = document.getElementById('metricSoftDelete');
    if (!container) return;

    const deleted = getSoftDeletedSubcobs();
    if (metric) metric.textContent = String(deleted.length);

    if (!deleted.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No records in Soft Delete.</p>';
        return;
    }

    container.innerHTML = deleted
        .map((item) => `
            <div class="dependency-item">
                <div class="font-semibold text-sm text-gray-800">${item.subcob_id || item.id} - ${item.sub_cob_name || item.sub_cob_code}</div>
                <div class="dependency-meta">Deleted at: ${item.deletedAt ? new Date(item.deletedAt).toLocaleString('en-US') : '-'}</div>
                <button class="action-link mt-1" data-restore="${item.subcob_id || item.id}">Restore</button>
            </div>
        `)
        .join('');
}

function renderDependencyControl() {
    const container = document.getElementById('dependencyList');
    const metric = document.getElementById('metricDependency');
    if (!container) return;

    const active = subcobData.filter((i) => !isSubCobInactive(i));
    const items = [
        { name: 'Product-Policy Link', status: active.length ? 'healthy' : 'warning', detail: `${active.length} mapped records` },
        { name: 'Quotation Dependency', status: active.length > 2 ? 'healthy' : 'warning', detail: 'Sub COB readiness score' }
    ];

    container.innerHTML = items
        .map((item) => `
            <div class="dependency-item">
                <div class="font-semibold text-sm text-gray-800">${item.name}</div>
                <div class="dependency-meta">${item.detail} • ${item.status.toUpperCase()}</div>
            </div>
        `)
        .join('');

    const healthy = items.filter((item) => item.status === 'healthy').length;
    if (metric) metric.textContent = `${Math.round((healthy / items.length) * 100)}%`;
}

function renderAISuggestions() {
    const container = document.getElementById('aiSuggestionList');
    if (!container) return;

    const active = subcobData.filter((i) => !isSubCobInactive(i));
    const noSubCob = active.filter((item) => !item.sub_cob_name).length;

    const suggestions = [
        `${active.length} active Sub COB records available for mapping.`,
        noSubCob > 0 ? `There are ${noSubCob} records missing subcategory mapping.` : 'Subcategory mapping present where available.',
        'Future: Use Sub COB trend scoring to optimize workflows.'
    ];

    container.innerHTML = suggestions
        .map((item) => `
            <div class="version-item">
                <div class="font-semibold text-sm text-gray-800"><i class="fas fa-lightbulb text-sky-600 mr-2"></i>Suggestion</div>
                <div class="version-meta">${item}</div>
            </div>
        `)
        .join('');
}

function updateHealthDashboard() {
    const active = subcobData.filter((i) => !isSubCobInactive(i));
    const complete = active.filter((item) => item.sub_cob_code && item.sub_cob_name && item.cob_code).length;
    const quality = active.length ? Math.round((complete / active.length) * 100) : 0;

    const qualityEl = document.getElementById('metricQuality');
    if (qualityEl) qualityEl.textContent = `${quality}%`;
}

function updateMetrics() {
    renderImpactAnalysis();
    renderVersioning();
    renderSoftDeletePanel();
    renderDependencyControl();
    renderAISuggestions();
    updateHealthDashboard();
}

// Export to CSV
function exportToCSV() {
    if (subcobData.length === 0) {
        showMessage('No data to export', true);
        return;
    }
    
    const headers = ['Sub COB ID', 'COB Code', 'COB Name', 'Sub COB Code', 'Sub COB Name'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    subcobData.forEach(item => {
        const row = [
            item.subcob_id || item.id,
            `"${item.cob_code}"`,
            `"${item.cob_name}"`,
            `"${item.sub_cob_code}"`,
            `"${item.sub_cob_name}"`
        ];
        csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subcob_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessage('Data exported successfully');
}

// Event Listeners
searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderTable();
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(totalRecords / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

newBtnSidebar.addEventListener('click', resetForm);
saveBtnSidebar.addEventListener('click', saveSubCOB);
deleteBtnSidebar.addEventListener('click', deleteSubCOB);
exportBtnSidebar.addEventListener('click', exportToCSV);
messageOk.addEventListener('click', closeMessageModal);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCOBData();
    await fetchSubCOBData();
});