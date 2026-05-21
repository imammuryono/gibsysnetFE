// State
let classes = [];
let versionHistory = [];
let selectedClassId = null;
let currentPage = 1;
const rowsPerPage = 10;

// API endpoint - Node.js API (port 3001)
const API_URL = 'http://localhost:3001/api/classes';
const CLASS_CREATE_API_URL = 'http://localhost:3001/api/classes';
const CLASS_DELETE_API_BASE_URL = 'http://localhost:3001/api/classes';

// DOM Elements
const classIdInput = document.getElementById('classId');
const classCodeInput = document.getElementById('classCode');
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

// Load data (simulasi API, ganti dengan fetch jika perlu)
async function loadClasses() {
    showLoading(true);
    try {
        // Simulasi data dummy, ganti dengan fetch ke API
        // const response = await fetch(API_URL);
        // classes = await response.json();
        
        // Data dummy
        classes = [
            { id: 1, classCode: 'CLS001', className: '1st Class Construction', classNameEng: 'First Class Construction', status: 'active', deletedAt: '', updatedAt: new Date().toISOString() },
            { id: 2, classCode: 'CLS002', className: '2nd Class Construction', classNameEng: 'Second Class Construction', status: 'active', deletedAt: '', updatedAt: new Date().toISOString() },
            { id: 3, classCode: 'CLS003', className: '3rd Class Construction', classNameEng: 'Third Class Construction', status: 'active', deletedAt: '', updatedAt: new Date().toISOString() },
            { id: 4, classCode: 'CLS004', className: '4th Class Construction', classNameEng: 'Fourth Class Construction', status: 'active', deletedAt: '', updatedAt: new Date().toISOString() },
            { id: 5, classCode: 'CLS005', className: 'Market Risk', classNameEng: 'Market Risk', status: 'active', deletedAt: '', updatedAt: new Date().toISOString() },
        ];
        
        renderTable();
        renderGovernancePanels();
    } catch (error) {
        showMessage('Failed to load class data.', 'error');
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

        return item.classCode.toLowerCase().includes(keyword) ||
            item.className.toLowerCase().includes(keyword) ||
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

function getCreateClassPayload(classData) {
    return {
        class_code: classData.classCode,
        class_name: classData.className
    };
}

async function createClassOnApi(payload) {
    const response = await fetch(CLASS_CREATE_API_URL, {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    let responsePayload = null;
    try {
        responsePayload = await response.json();
    } catch (_) {
        responsePayload = null;
    }

    if (!response.ok) {
        const message = responsePayload?.message || `Failed to create class data. Status ${response.status}`;
        throw new Error(message);
    }

    return responsePayload;
}

async function deleteClassOnApi(classId) {
    const endpoint = `${CLASS_DELETE_API_BASE_URL}/${encodeURIComponent(String(classId))}`;
    const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
            Accept: 'application/json'
        }
    });

    let responsePayload = null;
    try {
        responsePayload = await response.json();
    } catch (_) {
        responsePayload = null;
    }

    if (!response.ok) {
        const message = responsePayload?.message || `Failed to delete class data. Status ${response.status}`;
        throw new Error(message);
    }

    return responsePayload;
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
                <div class="dependency-meta">Deleted at: ${item.deletedAt}</div>
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
        classNameInput.value = cls.className;
        classNameEngInput.value = cls.classNameEng || '';
    }
    renderTable(); // untuk menyorot baris terpilih
}

// Reset form
function resetForm() {
    classIdInput.value = '';
    classCodeInput.value = '';
    classNameInput.value = '';
    classNameEngInput.value = '';
    selectedClassId = null;
    renderTable();
}

// Validasi form
function validateForm() {
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
        className: classNameInput.value.trim(),
        classNameEng: classNameEngInput.value.trim() || null,
        status: 'active',
        deletedAt: '',
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (selectedClassId) {
            // Update
            // await fetch(`${API_URL}/${selectedClassId}`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(classData)
            // });
            // Simulasi update
            const index = classes.findIndex(c => c.id === selectedClassId);
            if (index !== -1) {
                classes[index] = { ...classes[index], ...classData };
                addVersionHistory('Updated', classes[index]);
                showMessage('Class has been updated successfully.');
            }
        } else {
            // Create
            const payload = getCreateClassPayload(classData);
            await createClassOnApi(payload);

            const newId = classes.length ? Math.max(...classes.map(c => c.id)) + 1 : 1;
            const newClass = { id: newId, ...classData };
            classes.push(newClass);
            addVersionHistory('Created', newClass);
            showMessage('Class has been added successfully.');
        }
        
        renderTable();
        resetForm();
    } catch (error) {
        showMessage('Failed to save class data.', 'error');
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
        await deleteClassOnApi(selectedClassId);

        // Keep local state in soft delete panel after backend delete call.
        const target = classes.find(c => c.id === selectedClassId);
        if (target) {
            target.status = 'inactive';
            target.deletedAt = new Date().toISOString();
            target.updatedAt = new Date().toISOString();
            addVersionHistory('Deleted', target);
        }
        
        showMessage('Class moved to Soft Delete successfully.');
        resetForm();
        renderTable();
    } catch (error) {
        showMessage(error.message || 'Failed to delete class data.', 'error');
    } finally {
        showLoading(false);
    }
}

function restoreSoftDeletedClass(classId) {
    const softDeletedClasses = getSoftDeletedClasses();
    const index = softDeletedClasses.findIndex((item) => item.id === classId);
    if (index === -1) return;

    const restored = softDeletedClasses[index];
    restored.status = 'active';
    restored.deletedAt = '';
    restored.updatedAt = new Date().toISOString();
    addVersionHistory('Restored', restored);
    showMessage(`Class ${restored.classCode} has been restored successfully.`);
    renderTable();
}

function exportClasses() {
    const filtered = filteredClasses();
    if (!filtered.length) {
        showMessage('No data available for export.');
        return;
    }

    const rows = [
        ['Class Code', 'Class Name', 'Class Name (Eng)'],
        ...filtered.map((item) => [item.classCode, item.className, item.classNameEng || ''])
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

// Utility: show message
function showMessage(msg, type = 'success') {
    messageText.textContent = msg;
    messageModal.style.display = 'block';
}

// Utility: close modal
function closeModal(modal) {
    modal.style.display = 'none';
}