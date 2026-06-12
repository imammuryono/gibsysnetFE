// State
let classes = [];
let versionHistory = [];
let selectedClassId = null;
let currentPage = 1;
const rowsPerPage = 10;

// API endpoint - Node.js/Express API
const API_URL = 'http://localhost:3001/api/class-construction';
const SOFT_DELETE_STORAGE_KEY = 'gibsysnet_class_soft_deleted_cache';

// DOM Elements
const classIdInput = document.getElementById('classId');
const classCodeInput = document.getElementById('classCode');
const classCategoryInput = document.getElementById('classCategory');
const classNameInput = document.getElementById('className');
const classNameEngInput = document.getElementById('classNameEng');
const classTableBody = document.getElementById('classTableBody');
const searchInput = document.getElementById('searchInput');
const rowCountSpan = document.getElementById('rowCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
const messageModal = document.getElementById('messageModal');
const messageText = document.getElementById('messageText');
const messageOk = document.getElementById('messageOk');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadClasses();
    setupEventListeners();
});

function getElement(id) {
    return document.getElementById(id);
}

function showLoading(show) {
    const loading = getElement('loadingIndicator');
    if (!loading) return;
    loading.classList.toggle('hidden', !show);
}

function setupEventListeners() {
    // Buttons
    const newButton = document.getElementById('newBtnSidebar') || document.getElementById('newBtn');
    const saveButton = document.getElementById('saveBtnSidebar') || document.getElementById('saveBtn');
    const deleteButton = document.getElementById('deleteBtnSidebar') || document.getElementById('deleteBtn');
    const exportButton = document.getElementById('exportBtnSidebar');

    if (newButton) {
        newButton.addEventListener('click', handleNew);
    }

    if (saveButton) {
        saveButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleEdit();
        });
    }

    if (deleteButton) {
        deleteButton.addEventListener('click', handleDelete);
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            exportClasses();
        });
    }

    document.getElementById('classForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleEdit();
    });

    // Search
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });

    // Pagination
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredClasses().length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    // Modal buttons
    confirmCancel.addEventListener('click', () => closeModal(confirmModal));
    confirmOk.addEventListener('click', confirmDelete);
    messageOk.addEventListener('click', () => closeModal(messageModal));

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeModal(confirmModal);
        if (e.target === messageModal) closeModal(messageModal);
    });

    getElement('softDeleteList')?.addEventListener('click', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const restoreButton = target.closest('[data-restore]');
        if (!restoreButton) return;
        const classId = Number(restoreButton.getAttribute('data-restore'));
        restoreSoftDeletedClass(classId);
    });
}

function normalizeClass(item) {
    return {
        id: Number(item.id),
        classCode: item.classCode || item.class_code || '',
        classCategory: item.classCategory || item.class_category || '',
        className: item.className || item.class_name || '',
        classNameEng: item.classNameEng || item.class_name_eng || '',
        status: item.status || 'active',
        deletedAt: item.deletedAt || item.deleted_at || '',
        updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
    };
}

function getRowsFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.classes)) return payload.classes;
    return [];
}

function loadSoftDeleteCache() {
    try {
        const raw = localStorage.getItem(SOFT_DELETE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map(normalizeClass) : [];
    } catch (_) {
        return [];
    }
}

function saveSoftDeleteCache(records) {
    const byId = new Map();
    records.map(normalizeClass).forEach((record) => {
        if (!record.id) return;
        byId.set(String(record.id), record);
    });
    localStorage.setItem(SOFT_DELETE_STORAGE_KEY, JSON.stringify(Array.from(byId.values())));
}

function upsertSoftDeleteCache(record) {
    const normalized = normalizeClass({ ...record, status: 'inactive' });
    const records = loadSoftDeleteCache().filter((item) => String(item.id) !== String(normalized.id));
    records.unshift(normalized);
    saveSoftDeleteCache(records);
}

function removeSoftDeleteCache(classId) {
    saveSoftDeleteCache(loadSoftDeleteCache().filter((item) => String(item.id) !== String(classId)));
}

function mergeClassRecords(primaryRecords, secondaryRecords) {
    const byId = new Map();
    [...primaryRecords, ...secondaryRecords].forEach((record) => {
        const normalized = normalizeClass(record);
        if (!normalized.id) return;
        byId.set(String(normalized.id), {
            ...(byId.get(String(normalized.id)) || {}),
            ...normalized
        });
    });
    return Array.from(byId.values());
}

function getRecordFromPayload(payload) {
    if (Array.isArray(payload?.data)) return payload.data[0] || null;
    const record = payload?.data || payload?.class || payload || null;
    if (!record || typeof record !== 'object') return null;
    if (record.classCode || record.class_code || record.className || record.class_name) return record;
    return null;
}

async function parseApiError(response, fallbackMessage) {
    try {
        const payload = await response.json();
        return payload?.message || payload?.error || fallbackMessage;
    } catch (_) {
        return fallbackMessage;
    }
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        cache: 'no-store',
        ...options
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, `API request failed. Status ${response.status}`));
    }

    return response.json().catch(() => null);
}

async function loadSoftDeletedClassesFromApi() {
    try {
        const payload = await requestJson(`${API_URL}/soft-delete`);
        return getRowsFromPayload(payload).map(normalizeClass);
    } catch (_) {
        return [];
    }
}

async function loadClasses() {
    showLoading(true);
    try {
        const payload = await requestJson(API_URL);
        const apiRows = getRowsFromPayload(payload).map(normalizeClass);
        const activeApiIds = new Set(apiRows.filter((item) => item.status !== 'inactive').map((item) => String(item.id)));
        const apiSoftDeleted = apiRows.filter((item) => item.status === 'inactive');
        const endpointSoftDeleted = await loadSoftDeletedClassesFromApi();
        const cachedSoftDeleted = loadSoftDeleteCache().filter((item) => !activeApiIds.has(String(item.id)));
        const softDeleted = mergeClassRecords(apiSoftDeleted, mergeClassRecords(endpointSoftDeleted, cachedSoftDeleted));

        if (softDeleted.length) {
            saveSoftDeleteCache(softDeleted);
        }

        classes = mergeClassRecords(apiRows, softDeleted);
        renderTable();
        renderGovernancePanels();
    } catch (error) {
        console.error('Failed to load class data:', error);
        showMessage(error.message || 'Failed to load class data.', 'error');
    } finally {
        showLoading(false);
    }
}

// Filter berdasarkan pencarian
function filteredClasses() {
    const keyword = searchInput.value.toLowerCase();
    return classes.filter((item) => {
        const isActive = item.status !== 'inactive';
        if (!isActive) return false;

        return (item.classCode || '').toLowerCase().includes(keyword) ||
            (item.classCategory || '').toLowerCase().includes(keyword) ||
            (item.className || '').toLowerCase().includes(keyword) ||
            (item.classNameEng && item.classNameEng.toLowerCase().includes(keyword));
    });
}

function getSoftDeletedClasses() {
    return classes.filter((item) => item.status === 'inactive');
}

function generateNextClassCode() {
    const highestNumber = classes.reduce((maxNumber, item) => {
        const numericPart = parseInt(String(item.classCode || '').replace(/\D/g, ''), 10);
        if (Number.isNaN(numericPart)) {
            return maxNumber;
        }
        return Math.max(maxNumber, numericPart);
    }, 0);

    const nextNumber = highestNumber + 1;
    return `CLS${String(nextNumber).padStart(3, '0')}`;
}

function incrementClassCode(classCode) {
    const numericPart = parseInt(String(classCode || '').replace(/\D/g, ''), 10);
    const nextNumber = Number.isNaN(numericPart) ? 1 : numericPart + 1;
    return `CLS${String(nextNumber).padStart(3, '0')}`;
}

function isDuplicateClassCodeError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('duplicate entry') ||
        message.includes('already exists') ||
        message.includes('class code');
}

function getCreateClassPayload(classData) {
    return {
        class_code: classData.classCode,
        class_category: classData.classCategory,
        class_name: classData.className,
        class_name_eng: classData.classNameEng,
        status: classData.status
    };
}

function getUpdateClassPayload(classData) {
    return getCreateClassPayload(classData);
}

async function createClassOnApi(payload) {
    return requestJson(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function createClassWithAvailableCode(classData) {
    let payload = getCreateClassPayload(classData);
    let lastError = null;

    for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
            return await createClassOnApi(payload);
        } catch (error) {
            if (!isDuplicateClassCodeError(error)) {
                throw error;
            }

            lastError = error;
            classData.classCode = incrementClassCode(classData.classCode);
            classCodeInput.value = classData.classCode;
            payload = getCreateClassPayload(classData);
        }
    }

    throw lastError || new Error('Unable to generate an available Class Code.');
}

async function updateClassOnApi(classId, payload) {
    return requestJson(`${API_URL}/${encodeURIComponent(String(classId))}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

async function deleteClassOnApi(classId) {
    return requestJson(`${API_URL}/${encodeURIComponent(String(classId))}`, {
        method: 'DELETE'
    });
}

async function restoreClassOnApi(classId, payload) {
    try {
        return await requestJson(`${API_URL}/${encodeURIComponent(String(classId))}/restore`, {
            method: 'PUT'
        });
    } catch (_) {
        return updateClassOnApi(classId, payload);
    }
}

// Render tabel dengan pagination
function renderTable() {
    const filtered = filteredClasses();
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginated = filtered.slice(start, end);
    
    classTableBody.innerHTML = '';
    paginated.forEach(cls => {
        const row = document.createElement('tr');
        row.dataset.id = cls.id;
        if (selectedClassId === cls.id) row.classList.add('selected');
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">${cls.classCode}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${cls.classCategory || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${cls.className}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${cls.classNameEng || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" onclick="event.stopPropagation(); selectRow(${cls.id})"><i class="fas fa-pen mr-1"></i>Edit</button>
            </td>
        `;
        
        row.addEventListener('click', () => selectRow(cls.id));
        classTableBody.appendChild(row);
    });
    
    rowCountSpan.textContent = filtered.length;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    renderGovernancePanels();
}

function renderGovernancePanels() {
    renderImpactAnalysis();
    renderVersioning();
    renderSoftDeletePanel();
    renderDependencyControl();
    renderAISuggestions();
    updateHealthDashboard();
}

function renderImpactAnalysis() {
    const tbody = getElement('impactTableBody');
    const metric = getElement('metricImpact');
    if (!tbody) return;

    const filtered = filteredClasses();
    const marketRiskCount = filtered.filter((item) => item.className === 'Market Risk').length;
    const rows = [
        { tool: 'Quotation Engine', impact: Math.min(100, filtered.length * 8), risk: filtered.length > 12 ? 'High' : 'Medium' },
        { tool: 'Compliance Sync', impact: marketRiskCount > 0 ? 84 : 66, risk: marketRiskCount > 0 ? 'High' : 'Low' },
        { tool: 'Policy Mapping', impact: Math.min(96, filtered.length * 10), risk: filtered.length > 8 ? 'Medium' : 'Low' }
    ];

    tbody.innerHTML = rows
        .map((item) => `<tr><td class="py-2">${item.tool}</td><td class="py-2">${item.impact}%</td><td class="py-2">${item.risk}</td></tr>`)
        .join('');

    if (metric) {
        const average = Math.round(rows.reduce((sum, item) => sum + item.impact, 0) / rows.length);
        metric.textContent = String(average);
    }
}

function renderVersioning() {
    const versionListElement = getElement('versionList');
    const metricVersions = getElement('metricVersions');
    if (metricVersions) metricVersions.textContent = String(versionHistory.length);
    if (!versionListElement) return;

    if (!versionHistory.length) {
        versionListElement.innerHTML = '<p class="text-sm text-gray-500">No data changes yet.</p>';
        return;
    }

    versionListElement.innerHTML = versionHistory
        .map(
            (item) => `
                <div class="version-item">
                    <div class="font-semibold text-sm text-gray-800">${item.action} - ${item.classCode}</div>
                    <div class="text-sm text-gray-600">${item.className}</div>
                    <div class="version-meta">${item.actor} • ${item.time}</div>
                </div>
            `
        )
        .join('');
}

function renderSoftDeletePanel() {
    const container = getElement('softDeleteList');
    const metricSoftDelete = getElement('metricSoftDelete');
    const softDeletedClasses = getSoftDeletedClasses();
    if (!container) return;
    if (metricSoftDelete) metricSoftDelete.textContent = String(softDeletedClasses.length);

    if (!softDeletedClasses.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No records in Soft Delete.</p>';
        return;
    }

    container.innerHTML = softDeletedClasses
        .map((item) => `
            <div class="dependency-item">
                <div class="font-semibold text-sm text-gray-800">${item.classCode} - ${item.className}</div>
                <div class="dependency-meta">Deleted at: ${formatDisplayDate(item.deletedAt)}</div>
                <button class="action-link mt-1" data-restore="${item.id}">Restore</button>
            </div>
        `)
        .join('');
}

function renderAISuggestions() {
    const container = getElement('aiSuggestionList');
    if (!container) return;

    const filtered = filteredClasses();
    const missingEng = filtered.filter((item) => !item.classNameEng).length;
    const marketRiskCount = filtered.filter((item) => item.className === 'Market Risk').length;

    const suggestions = [
        `${filtered.length} class records are available for underwriting and quotation mapping.`,
        missingEng > 0
            ? `Complete English class names for ${missingEng} records to improve reporting consistency.`
            : 'English naming is complete. Keep naming standards consistent across all updates.',
        marketRiskCount > 0
            ? `Review ${marketRiskCount} Market Risk entries for compliance rule alignment.`
            : 'No Market Risk entries detected. Add when required by underwriting policy.',
        'Future Ready: Use class trend scoring to improve pricing and risk dependency decisions.'
    ];

    container.innerHTML = suggestions
        .map(
            (item) => `
                <div class="version-item">
                    <div class="font-semibold text-sm text-gray-800"><i class="fas fa-lightbulb text-sky-600 mr-2"></i>Suggestion</div>
                    <div class="version-meta">${item}</div>
                </div>
            `
        )
        .join('');
}

function renderDependencyControl() {
    const container = getElement('dependencyList');
    const metricDependency = getElement('metricDependency');
    if (!container) return;

    const filtered = filteredClasses();
    const missingEngCount = filtered.filter((item) => !item.classNameEng).length;
    const dependencyItems = [
        { name: 'Class-Policy Link', status: filtered.length ? 'healthy' : 'warning', detail: `${filtered.length} mapped records` },
        { name: 'Quotation Dependency', status: filtered.length > 2 ? 'healthy' : 'warning', detail: 'Class mapping readiness' },
        { name: 'Bilingual Naming', status: missingEngCount > 0 ? 'warning' : 'healthy', detail: `${filtered.length - missingEngCount}/${filtered.length || 0} complete` }
    ];

    container.innerHTML = dependencyItems
        .map(
            (item) => `
                <div class="dependency-item">
                    <div class="font-semibold text-sm text-gray-800">${item.name}</div>
                    <div class="dependency-meta">${item.detail} • ${item.status.toUpperCase()}</div>
                </div>
            `
        )
        .join('');

    const healthyCount = dependencyItems.filter((item) => item.status === 'healthy').length;
    if (metricDependency) metricDependency.textContent = `${Math.round((healthyCount / dependencyItems.length) * 100)}%`;
}

function updateHealthDashboard() {
    const filtered = filteredClasses();
    const completeRecords = filtered.filter((item) => item.classCode && item.className).length;
    const quality = filtered.length ? Math.round((completeRecords / filtered.length) * 100) : 0;
    const qualityMetric = getElement('metricQuality');
    if (qualityMetric) qualityMetric.textContent = `${quality}%`;
}

function addVersionHistory(action, record) {
    versionHistory.unshift({
        action,
        classCode: record.classCode,
        className: record.className,
        actor: 'System',
        time: new Date().toLocaleString('en-US')
    });
    versionHistory = versionHistory.slice(0, 10);
}

// Pilih baris
function selectRow(id) {
    selectedClassId = id;
    const cls = classes.find(c => c.id === id);
    if (cls) {
        classIdInput.value = cls.id;
        classCodeInput.value = cls.classCode;
        classCategoryInput.value = cls.classCategory || '';
        classNameInput.value = cls.className;
        classNameEngInput.value = cls.classNameEng || '';
    }
    renderTable(); // untuk menyorot baris terpilih
}

// Reset form
function resetForm() {
    classIdInput.value = '';
    classCodeInput.value = '';
    classCategoryInput.value = '';
    classNameInput.value = '';
    classNameEngInput.value = '';
    selectedClassId = null;
    renderTable();
}

// Validasi form
function validateForm() {
    if (!classCategoryInput.value.trim()) {
        showMessage('Class Category is required.', 'error');
        return false;
    }

    if (!classNameInput.value.trim()) {
        showMessage('Class Name is required.', 'error');
        return false;
    }
    return true;
}

// Handle New
function handleNew() {
    resetForm();
    classNameInput.focus();
}

// Handle Edit (berfungsi sebagai Save)
async function handleEdit() {
    if (!validateForm()) return;

    const generatedClassCode = selectedClassId
        ? (classes.find(c => c.id === selectedClassId)?.classCode || classCodeInput.value || generateNextClassCode())
        : generateNextClassCode();

    classCodeInput.value = generatedClassCode;
    
    const classData = {
        classCode: generatedClassCode,
        classCategory: classCategoryInput.value.trim(),
        className: classNameInput.value.trim(),
        classNameEng: classNameEngInput.value.trim() || null,
        status: 'active',
        deletedAt: '',
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (selectedClassId) {
            const payload = getUpdateClassPayload(classData);
            const updateResult = await updateClassOnApi(selectedClassId, payload);
            const updatedRecord = getRecordFromPayload(updateResult);

            const index = classes.findIndex(c => c.id === selectedClassId);
            if (index !== -1) {
                classes[index] = updatedRecord
                    ? normalizeClass(updatedRecord)
                    : { ...classes[index], ...classData };
                addVersionHistory('Updated', classes[index]);
                showMessage('Class has been updated successfully.');
            }
        } else {
            const createResult = await createClassWithAvailableCode(classData);
            const createdRecord = getRecordFromPayload(createResult);

            const newClass = createdRecord
                ? normalizeClass(createdRecord)
                : { id: classes.length ? Math.max(...classes.map(c => c.id)) + 1 : 1, ...classData };
            classes.push(newClass);
            addVersionHistory('Created', newClass);
            showMessage('Class has been added successfully.');
        }

        await loadClasses();
        resetForm();
    } catch (error) {
        console.error('Failed to save class data:', error);
        showMessage(error.message || 'Failed to save class data.', 'error');
    }
}

// Handle Delete
function handleDelete() {
    if (!selectedClassId) {
        showMessage('Please select a class record to delete.', 'error');
        return;
    }
    
    confirmMessage.textContent = 'Are you sure you want to delete this class?';
    confirmModal.style.display = 'block';
}

// Confirm Delete
async function confirmDelete() {
    closeModal(confirmModal);

    if (!selectedClassId) {
        showMessage('Please select a class record to delete.', 'error');
        return;
    }

    showLoading(true);
    
    try {
        const deleteResult = await deleteClassOnApi(selectedClassId);
        const deletedRecord = getRecordFromPayload(deleteResult);

        // Keep local state in soft delete panel after backend delete call.
        const target = classes.find(c => c.id === selectedClassId);
        if (target) {
            Object.assign(target, deletedRecord ? normalizeClass(deletedRecord) : {
                status: 'inactive',
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            upsertSoftDeleteCache(target);
            addVersionHistory('Deleted', target);
        }
        
        showMessage('Class moved to Soft Delete successfully.');
        await loadClasses();
        resetForm();
    } catch (error) {
        showMessage(error.message || 'Failed to delete class data.', 'error');
    } finally {
        showLoading(false);
    }
}

async function restoreSoftDeletedClass(classId) {
    const softDeletedClasses = getSoftDeletedClasses();
    const index = softDeletedClasses.findIndex((item) => item.id === classId);
    if (index === -1) return;

    const restored = softDeletedClasses[index];
    showLoading(true);

    try {
        const payload = getUpdateClassPayload({
            ...restored,
            status: 'active',
            deletedAt: '',
            updatedAt: new Date().toISOString()
        });
        const restoreResult = await restoreClassOnApi(classId, payload);
        const restoredRecord = getRecordFromPayload(restoreResult);

        Object.assign(restored, restoredRecord ? normalizeClass(restoredRecord) : {
            status: 'active',
            deletedAt: '',
            updatedAt: new Date().toISOString()
        });
        removeSoftDeleteCache(classId);
        addVersionHistory('Restored', restored);
        showMessage(`Class ${restored.classCode} has been restored successfully.`);
        await loadClasses();
    } catch (error) {
        showMessage(error.message || 'Failed to restore class data.', 'error');
    } finally {
        showLoading(false);
    }
}

function exportClasses() {
    const filtered = filteredClasses();
    if (!filtered.length) {
        showMessage('No data available for export.');
        return;
    }

    const rows = [
        ['Class Code', 'Class Category', 'Class Name', 'Class Name (Eng)'],
        ...filtered.map((item) => [item.classCode, item.classCategory || '', item.className, item.classNameEng || ''])
    ];

    const csvContent = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `class-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage('Class data exported successfully.');
}

function formatDisplayDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Utility: show message
function showMessage(msg, type = 'success') {
    messageText.textContent = msg;
    messageModal.style.display = 'block';
}

// Utility: close modal
function closeModal(modal) {
    modal.style.display = 'none';
}
