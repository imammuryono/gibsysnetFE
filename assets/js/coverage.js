class CoverageManager {
    constructor() {
        this.storageKey = 'gibsysnet_coverage_data';
        this.cobKey = 'gibsysnet_cob_products';
        this.productData = {
            LI: {
                cob: {
                    IL: { name: 'Individual Life', sub: ['Term Life', 'Whole Life', 'Endowment', 'Unit Link'] },
                    GL: { name: 'Group Life', sub: ['Group Term Life', 'Group Credit Life', 'Employee Benefit Scheme'] },
                    SH: { name: 'Sharia Life', sub: ['Sharia Protection Plan', 'Sharia Unit Link'] },
                    AP: { name: 'Annuity & Pension', sub: ['Immediate Annuity', 'Deferred Annuity', 'DPLK Scheme'] }
                }
            },
            GI: {
                cob: {
                    PROP: { name: 'Property', sub: ['Fire Insurance', 'Property All Risks (PAR)', 'Industrial All Risks (IAR)'] },
                    MAR: { name: 'Marine', sub: ['Marine Cargo', 'Marine Hull', 'Freight Insurance'] },
                    MOT: { name: 'Motor', sub: ['Comprehensive', 'Total Loss Only (TLO)'] },
                    ENG: { name: 'Engineering', sub: ['CAR', 'EAR', 'Machinery Breakdown', 'Electronic Equipment Insurance'] },
                    LIAB: { name: 'Liability', sub: ['Public Liability', 'Product Liability', 'Professional Indemnity', 'Directors & Officers'] },
                    MISC: { name: 'Miscellaneous', sub: ['Personal Accident', 'Travel Insurance', 'Money Insurance', 'Burglary'] },
                    CRED: { name: 'Credit & Suretyship', sub: ['Trade Credit Insurance', 'Surety Bond', 'Performance Bond'] },
                    ENER: { name: 'Energy & Specialized Risk', sub: ['Oil & Gas', 'Mining', 'Power Plant', 'Aviation'] },
                    HEAL: { name: 'Health', sub: ['Individual Health', 'Group Health', 'Critical Illness'] }
                }
            }
        };
        this.defaultCobProducts = [
            { id: 1, name: 'Motor Vehicle' },
            { id: 2, name: 'Property All Risk' },
            { id: 3, name: 'Marine Cargo' },
            { id: 4, name: 'Health Insurance' }
        ];

        this.data = this.loadData();
        this.cobProducts = this.loadCobProducts();
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.filteredData = [...this.data];
        this.selectedId = null;
        this.pendingDeleteId = null;

        this.initializeElements();
        this.bindEvents();
        this.populateCobDropdown();
        this.resetForm();
        this.applySearch();
    }

    initializeElements() {
        this.form = document.getElementById('coverageForm');
        this.coverId = document.getElementById('coverId');
        this.coverageCode = document.getElementById('coverageCode');
        this.type = document.getElementById('type');
        this.cob = document.getElementById('cob');
        this.subCob = document.getElementById('subCob');
        this.coverage = document.getElementById('coverage');

        this.searchInput = document.getElementById('searchInput');
        this.tableBody = document.getElementById('coveragesTableBody');
        this.rowCount = document.getElementById('rowCount');
        this.pageInfo = document.getElementById('pageInfo');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        this.newBtn = document.getElementById('newBtn') || document.getElementById('newBtnSidebar');
        this.saveBtn = document.getElementById('saveBtn') || document.getElementById('saveBtnSidebar');
        this.deleteBtn = document.getElementById('deleteBtn') || document.getElementById('deleteBtnSidebar');
        this.exportBtn = document.getElementById('exportBtn') || document.getElementById('exportBtnSidebar');

        this.confirmModal = document.getElementById('confirmModal');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmCancel = document.getElementById('confirmCancel');
        this.confirmOk = document.getElementById('confirmOk');

        this.messageModal = document.getElementById('messageModal');
        this.messageText = document.getElementById('messageText');
        this.messageOk = document.getElementById('messageOk');

        this.loadingIndicator = document.getElementById('loadingIndicator');

        this.impactTableBody = document.getElementById('impactTableBody');
        this.versionList = document.getElementById('versionList');
        this.softDeleteList = document.getElementById('softDeleteList');
        this.dependencyList = document.getElementById('dependencyList');
        this.aiSuggestionList = document.getElementById('aiSuggestionList');

        this.metricImpact = document.getElementById('metricImpact');
        this.metricVersions = document.getElementById('metricVersions');
        this.metricSoftDelete = document.getElementById('metricSoftDelete');
        this.metricDependency = document.getElementById('metricDependency');
        this.metricQuality = document.getElementById('metricQuality');
    }

    bindEvents() {
        this.form.addEventListener('submit', (event) => this.handleSave(event));

        if (this.newBtn) {
            this.newBtn.addEventListener('click', () => this.resetForm());
        }

        if (this.saveBtn && this.saveBtn !== this.form.querySelector('[type="submit"]')) {
            this.saveBtn.addEventListener('click', () => this.form.requestSubmit());
        }

        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this.handleDeleteSelected());
        }

        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportData());
        }

        this.searchInput.addEventListener('input', () => this.applySearch());
        this.type.addEventListener('change', () => {
            this.populateCobDropdown();
            this.populateSubCobDropdown();
        });
        this.cob.addEventListener('change', () => this.populateSubCobDropdown());
        this.prevBtn.addEventListener('click', () => this.changePage(-1));
        this.nextBtn.addEventListener('click', () => this.changePage(1));

        this.confirmCancel.addEventListener('click', () => this.hideConfirmModal());
        this.confirmOk.addEventListener('click', () => this.executeDelete());
        this.messageOk.addEventListener('click', () => this.hideMessageModal());

        this.tableBody.addEventListener('click', (event) => this.handleTableAction(event));
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed)
                ? parsed.map((item) => ({
                    ...item,
                    status: item.status || 'active',
                    version: item.version || 1,
                    deletedAt: item.deletedAt || null
                }))
                : [];
        } catch (_) {
            return [];
        }
    }

    loadCobProducts() {
        const stored = localStorage.getItem(this.cobKey);
        if (!stored) return this.defaultCobProducts;

        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) && parsed.length ? parsed : this.defaultCobProducts;
        } catch (_) {
            return this.defaultCobProducts;
        }
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    normalizeText(value) {
        return String(value || '').trim();
    }

    inferTypeByCob(cobCode) {
        if (!cobCode) return '';
        const entries = Object.entries(this.productData);
        const found = entries.find(([, typeData]) => Boolean(typeData.cob[cobCode]));
        return found ? found[0] : '';
    }

    getCobNameById(cobId) {
        const cobCode = String(cobId);
        const type = this.inferTypeByCob(cobCode);
        if (type && this.productData[type]?.cob[cobCode]) {
            return this.productData[type].cob[cobCode].name;
        }

        const product = this.cobProducts.find((item) => Number(item.id) === Number(cobId));
        return product ? product.name : '-';
    }

    populateCobDropdown() {
        const selectedType = this.normalizeText(this.type.value);
        this.cob.innerHTML = '<option value="">Select COB</option>';

        if (!selectedType || !this.productData[selectedType]) {
            return;
        }

        Object.entries(this.productData[selectedType].cob).forEach(([code, definition]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = definition.name;
            this.cob.appendChild(option);
        });
    }

    populateSubCobDropdown(selectedSubCob = '') {
        const selectedType = this.normalizeText(this.type.value);
        const selectedCob = this.normalizeText(this.cob.value);
        this.subCob.innerHTML = '<option value="">Select Sub COB</option>';

        const subOptions = this.productData[selectedType]?.cob?.[selectedCob]?.sub || [];
        subOptions.forEach((sub) => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            this.subCob.appendChild(option);
        });

        if (selectedSubCob && subOptions.includes(selectedSubCob)) {
            this.subCob.value = selectedSubCob;
        }
    }

    generateNextCoverageCode() {
        const maxNumber = this.data.reduce((max, item) => {
            const value = String(item.coverage_code || '');
            const match = value.match(/(\d+)$/);
            const number = match ? Number(match[1]) : 0;
            return number > max ? number : max;
        }, 0);

        return `COV${String(maxNumber + 1).padStart(3, '0')}`;
    }

    getFormData() {
        const existingCode = this.normalizeText(this.coverageCode.value);

        return {
            id: this.coverId.value ? Number(this.coverId.value) : null,
            coverage_code: existingCode || this.generateNextCoverageCode(),
            type: this.normalizeText(this.type.value),
            cob_id: this.normalizeText(this.cob.value),
            sub_cob: this.normalizeText(this.subCob.value),
            coverage: this.normalizeText(this.coverage.value)
        };
    }

    validate(data) {
        if (!data.type) return 'Type is required.';
        if (!data.cob_id) return 'COB is required.';
        if (!data.sub_cob) return 'Sub COB is required.';
        if (!data.coverage) return 'Coverage is required.';
        return null;
    }

    handleSave(event) {
        event.preventDefault();
        this.showLoading();

        const formData = this.getFormData();
        const validationError = this.validate(formData);

        if (validationError) {
            this.hideLoading();
            this.showMessage(validationError);
            return;
        }

        if (formData.id) {
            const idx = this.data.findIndex((item) => item.id === formData.id);
            if (idx > -1) {
                const previousVersion = this.data[idx].version || 1;
                this.data[idx] = {
                    ...this.data[idx],
                    ...formData,
                    status: this.data[idx].status || 'active',
                    version: previousVersion + 1,
                    updatedAt: new Date().toISOString(),
                    deletedAt: this.data[idx].deletedAt || null
                };
                this.showMessage('Coverage record updated successfully.');
            }
        } else {
            const nextId = this.data.length ? Math.max(...this.data.map((item) => item.id)) + 1 : 1;
            this.data.push({
                ...formData,
                status: 'active',
                version: 1,
                id: nextId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            });
            this.showMessage('Coverage record saved successfully.');
        }

        this.saveData();
        this.resetForm();
        this.applySearch();
        this.hideLoading();
    }

    handleDeleteSelected() {
        if (!this.selectedId) {
            this.showMessage('Please select a coverage record first.');
            return;
        }

        this.pendingDeleteId = this.selectedId;
        this.confirmMessage.textContent = 'Are you sure you want to soft delete this coverage record?';
        this.showConfirmModal();
    }

    executeDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const idx = this.data.findIndex((item) => item.id === this.pendingDeleteId);
        if (idx > -1) {
            this.data[idx] = {
                ...this.data[idx],
                status: 'inactive',
                deletedAt: new Date().toISOString(),
                version: (this.data[idx].version || 1) + 1,
                updatedAt: new Date().toISOString()
            };
            this.saveData();
            this.showMessage('Coverage record moved to soft delete.');
        }

        this.pendingDeleteId = null;
        this.selectedId = null;
        this.hideConfirmModal();
        this.resetForm();
        this.applySearch();
    }

    restoreRecord(id) {
        const idx = this.data.findIndex((item) => item.id === id);
        if (idx === -1) return;

        this.data[idx] = {
            ...this.data[idx],
            status: 'active',
            deletedAt: null,
            version: (this.data[idx].version || 1) + 1,
            updatedAt: new Date().toISOString()
        };

        this.saveData();
        this.applySearch();
        this.showMessage('Coverage record restored successfully.');
    }

    resetForm() {
        this.form.reset();
        this.coverId.value = '';
        this.coverageCode.value = this.generateNextCoverageCode();
        this.type.value = '';
        this.populateCobDropdown();
        this.populateSubCobDropdown();
        this.selectedId = null;
        this.highlightSelectedRow();
    }

    setFormData(record) {
        this.coverId.value = record.id;
        this.coverageCode.value = record.coverage_code || '';
        this.type.value = record.type || this.inferTypeByCob(record.cob_id) || '';
        this.populateCobDropdown();
        this.cob.value = String(record.cob_id || '');
        this.populateSubCobDropdown(record.sub_cob || '');
        this.coverage.value = record.coverage || '';
        this.selectedId = record.id;
        this.highlightSelectedRow();
    }

    applySearch() {
        const keyword = this.searchInput.value.trim().toLowerCase();
        this.filteredData = this.data.filter((item) => {
            const isActive = (item.status || 'active') === 'active';
            if (!isActive) return false;

            const haystack = [
                item.type,
                item.coverage_code,
                this.getCobNameById(item.cob_id),
                item.sub_cob,
                item.coverage
            ].join(' ').toLowerCase();

            return haystack.includes(keyword);
        });

        this.currentPage = 1;
        this.renderAll();
    }

    changePage(step) {
        const totalPages = this.getTotalPages();
        const nextPage = this.currentPage + step;
        if (nextPage < 1 || nextPage > totalPages) return;

        this.currentPage = nextPage;
        this.renderTable();
        this.renderPagination();
    }

    getTotalPages() {
        return Math.max(1, Math.ceil(this.filteredData.length / this.rowsPerPage));
    }

    getCurrentPageData() {
        const start = (this.currentPage - 1) * this.rowsPerPage;
        return this.filteredData.slice(start, start + this.rowsPerPage);
    }

    renderTable() {
        const records = this.getCurrentPageData();

        if (!records.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-6 text-center text-gray-500">No coverage records found.</td>
                </tr>
            `;
            this.rowCount.textContent = '0';
            this.highlightSelectedRow();
            return;
        }

        this.tableBody.innerHTML = records.map((record, index) => {
            const rowNumber = ((this.currentPage - 1) * this.rowsPerPage) + index + 1;

            return `
                <tr class="hover:bg-blue-50" data-row-id="${record.id}">
                    <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">${rowNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">${record.coverage_code || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.getCobNameById(record.cob_id)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.sub_cob || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.coverage || '-'}</td>
                    <td class="px-4 py-3 text-sm whitespace-nowrap">
                        <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-action="edit" data-id="${record.id}">
                            <i class="fas fa-pen mr-1"></i>Edit
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.rowCount.textContent = String(this.filteredData.length);
        this.highlightSelectedRow();
    }

    renderPagination() {
        const totalPages = this.getTotalPages();
        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        this.prevBtn.disabled = this.currentPage === 1;
        this.nextBtn.disabled = this.currentPage === totalPages;
    }

    highlightSelectedRow() {
        const rows = this.tableBody.querySelectorAll('tr[data-row-id]');
        rows.forEach((row) => {
            const rowId = Number(row.getAttribute('data-row-id'));
            if (this.selectedId && rowId === this.selectedId) {
                row.classList.add('ring-2', 'ring-blue-300');
            } else {
                row.classList.remove('ring-2', 'ring-blue-300');
            }
        });
    }

    handleTableAction(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.getAttribute('data-action');
        const id = Number(button.getAttribute('data-id'));
        const record = this.data.find((item) => item.id === id);
        if (!record) return;

        if (action === 'edit') {
            this.setFormData(record);
            return;
        }

        if (action === 'restore') {
            this.restoreRecord(id);
        }
    }

    renderImpactAnalysis() {
        if (!this.impactTableBody) return;

        const active = this.data.filter((item) => item.status !== 'inactive');
        const longCoverage = active.filter((item) => (item.coverage || '').length > 150).length;

        const rows = [
            { tool: 'Quotation Mapping', impact: active.length, risk: active.length > 20 ? 'Medium' : 'Low' },
            { tool: 'Policy Clause Sync', impact: active.length, risk: longCoverage > 0 ? 'Medium' : 'Low' },
            { tool: 'COB Dependency', impact: active.length, risk: active.some((item) => !item.cob_id) ? 'High' : 'Low' }
        ];

        this.impactTableBody.innerHTML = rows.map((row) => `
            <tr>
                <td class="py-2 text-gray-700">${row.tool}</td>
                <td class="py-2 text-gray-700">${row.impact}</td>
                <td class="py-2 text-gray-700">${row.risk}</td>
            </tr>
        `).join('');
    }

    renderVersioning() {
        if (!this.versionList) return;

        const topRecords = [...this.data]
            .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
            .slice(0, 5);

        if (!topRecords.length) {
            this.versionList.innerHTML = '<p class="text-sm text-gray-500">No versions available.</p>';
            return;
        }

        this.versionList.innerHTML = topRecords.map((record) => `
            <div class="py-2 border-b last:border-b-0">
                <p class="text-sm font-semibold text-gray-700">${record.coverage_code || '-'} - v${record.version || 1}</p>
                <p class="text-xs text-gray-500">Updated: ${this.formatDateTime(record.updatedAt)}</p>
            </div>
        `).join('');
    }

    renderSoftDeletePanel() {
        if (!this.softDeleteList) return;

        const deleted = this.data.filter((item) => item.status === 'inactive').slice(-5).reverse();

        if (!deleted.length) {
            this.softDeleteList.innerHTML = '<p class="text-sm text-gray-500">No soft deleted data.</p>';
            return;
        }

        this.softDeleteList.innerHTML = deleted.map((record) => `
            <div class="py-2 border-b last:border-b-0">
                <p class="text-sm font-semibold text-gray-700">${record.coverage_code || '-'} (${this.getCobNameById(record.cob_id)})</p>
                <p class="text-xs text-gray-500 mb-2">Deleted: ${this.formatDateTime(record.deletedAt)}</p>
                <button class="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700" data-action="restore" data-id="${record.id}">Restore</button>
            </div>
        `).join('');

        this.softDeleteList.querySelectorAll('button[data-action="restore"]').forEach((button) => {
            button.addEventListener('click', () => {
                const id = Number(button.getAttribute('data-id'));
                this.restoreRecord(id);
            });
        });
    }

    renderDependencyControl() {
        if (!this.dependencyList) return;

        const active = this.data.filter((item) => item.status !== 'inactive');
        const missingCob = active.filter((item) => !item.cob_id).length;
        const missingCoverage = active.filter((item) => !item.coverage).length;

        this.dependencyList.innerHTML = `
            <div class="space-y-2 text-sm text-gray-700">
                <p><span class="font-semibold">Active Coverage:</span> ${active.length}</p>
                <p><span class="font-semibold">Missing COB Mapping:</span> ${missingCob}</p>
                <p><span class="font-semibold">Missing Coverage Text:</span> ${missingCoverage}</p>
                <p><span class="font-semibold">Dependency Status:</span> ${missingCob + missingCoverage > 0 ? 'Needs Review' : 'Healthy'}</p>
            </div>
        `;
    }

    renderAISuggestions() {
        if (!this.aiSuggestionList) return;

        const active = this.data.filter((item) => item.status !== 'inactive');
        const suggestions = [];

        if (!active.length) {
            suggestions.push('Start by adding baseline coverage records for each COB class.');
        }

        const duplicateCoverage = new Set();
        const seen = new Set();
        active.forEach((item) => {
            const key = `${item.cob_id}-${(item.coverage || '').toLowerCase()}`;
            if (seen.has(key)) duplicateCoverage.add(key);
            seen.add(key);
        });

        if (duplicateCoverage.size > 0) {
            suggestions.push('Potential duplicate coverage descriptions detected within the same COB. Consider consolidation.');
        }

        if (active.some((item) => (item.coverage || '').length < 15)) {
            suggestions.push('Some coverage descriptions are short. Add more detail to improve underwriting clarity.');
        }

        if (!suggestions.length) {
            suggestions.push('Coverage configuration looks healthy. Continue periodic review with COB owners.');
        }

        this.aiSuggestionList.innerHTML = suggestions.map((text) => `
            <div class="py-2 border-b last:border-b-0 text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-lightbulb text-yellow-500 mt-0.5"></i>
                <span>${text}</span>
            </div>
        `).join('');
    }

    updateHealthDashboard() {
        const total = this.data.length;
        const active = this.data.filter((item) => item.status !== 'inactive').length;
        const deleted = this.data.filter((item) => item.status === 'inactive').length;
        const avgVersion = total ? this.data.reduce((sum, item) => sum + (item.version || 1), 0) / total : 0;
        const quality = total
            ? Math.round((this.data.filter((item) => item.cob_id && item.coverage).length / total) * 100)
            : 0;
        const dependency = Math.max(0, Math.min(100, 100 - (deleted * 5)));

        if (this.metricImpact) this.metricImpact.textContent = String(active);
        if (this.metricVersions) this.metricVersions.textContent = avgVersion.toFixed(1);
        if (this.metricSoftDelete) this.metricSoftDelete.textContent = String(deleted);
        if (this.metricDependency) this.metricDependency.textContent = `${dependency}%`;
        if (this.metricQuality) this.metricQuality.textContent = `${quality}%`;
    }

    renderGovernancePanels() {
        this.renderImpactAnalysis();
        this.renderVersioning();
        this.renderSoftDeletePanel();
        this.renderDependencyControl();
        this.renderAISuggestions();
        this.updateHealthDashboard();
    }

    renderAll() {
        this.renderTable();
        this.renderPagination();
        this.renderGovernancePanels();
    }

    formatDateTime(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    exportData() {
        const headers = ['Coverage ID', 'COB', 'Sub COB', 'Coverage', 'Status', 'Version', 'Updated At'];
        const rows = this.filteredData.map((item) => [
            item.coverage_code,
            this.getCobNameById(item.cob_id),
            item.sub_cob,
            item.coverage,
            item.status || 'active',
            item.version || 1,
            this.formatDateTime(item.updatedAt)
        ]);

        const csv = [headers, ...rows]
            .map((columns) => columns.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `coverage-data-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Coverage data exported successfully.');
    }

    showConfirmModal() {
        this.confirmModal.style.display = 'block';
    }

    hideConfirmModal() {
        this.confirmModal.style.display = 'none';
    }

    showMessage(message) {
        this.messageText.textContent = message;
        this.messageModal.style.display = 'block';
    }

    hideMessageModal() {
        this.messageModal.style.display = 'none';
    }

    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.coverageManager = new CoverageManager();
});
