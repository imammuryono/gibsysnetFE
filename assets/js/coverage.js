class CoverageManager {
    constructor() {
        this.storageKey = 'gibsysnet_coverage_data';
        this.cobKey = 'gibsysnet_cob_products';
        this.apiBaseUrl = this.resolveApiBaseUrl();
        this.listApiUrl = `${this.apiBaseUrl}/coverage`;
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
        this.subCobLookup = [];

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
        this.populateSubCobDropdown();
        this.loadSubCobLookup();
        this.loadCoveragesFromApi().finally(() => {
            this.resetForm();
            this.applySearch();
        });
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
        this.tableBody.addEventListener('click', (event) => {
            const row = event.target.closest('tr[data-row-id]');
            if (!row) return;
            const clickedButton = event.target.closest('button[data-action]');
            if (clickedButton) return;
            const rowId = Number(row.getAttribute('data-row-id'));
            this.selectedId = rowId;
            this.highlightSelectedRow();
        });
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

    resolveApiBaseUrl() {
        const fromWindow = window.GibsyNetApi?.baseUrl;
        const fromStorage = localStorage.getItem('gibsynet_api_base');
        return String(fromWindow || fromStorage || 'http://localhost:3001/api').replace(/\/$/, '');
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

    normalizeSubCobRows(payload) {
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

                const cobName = String(
                    item.cob_name
                    ?? item.cobName
                    ?? item.cob
                    ?? item.cob_name_display
                    ?? ''
                ).trim();
                const subCobName = String(
                    item.sub_cob_name
                    ?? item.subCobName
                    ?? item.sub_cob
                    ?? item.subCob
                    ?? ''
                ).trim();

                if (!cobName && !subCobName) return null;

                return {
                    ...item,
                    cob_name: cobName,
                    sub_cob_name: subCobName
                };
            })
            .filter(Boolean);
    }

    async loadSubCobLookup() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sub-cob`);
            if (!response.ok) {
                throw new Error(`Failed to fetch sub_cob data (${response.status})`);
            }
            const payload = await response.json();
            this.subCobLookup = this.normalizeSubCobRows(payload);
            this.populateCobDropdown();
            this.populateSubCobDropdown();
        } catch (error) {
            console.error('Error loading sub_cob lookup:', error);
            this.subCobLookup = [];
            this.populateCobDropdown();
            this.populateSubCobDropdown();
        }
    }

    normalizeCoverageRecord(item, fallbackIndex = 0) {
        const now = new Date().toISOString();
        const normalizedId = item?.id ?? item?.coverage_id ?? item?.coverageId ?? item?.coverageID;

        return {
            id: normalizedId !== undefined && normalizedId !== null && normalizedId !== ''
                ? normalizedId
                : fallbackIndex + 1,
            coverage_code: item?.coverage_code ?? item?.coverageCode ?? '',
            type: item?.type ?? item?.coverage_type ?? '',
            cob_id: item?.cob_id ?? item?.cobId ?? item?.cob ?? '',
            sub_cob: item?.sub_cob ?? item?.subCob ?? item?.sub_cob_name ?? '',
            coverage: item?.coverage ?? item?.description ?? '',
            status: item?.status || 'active',
            version: Number(item?.version || 1),
            createdAt: item?.createdAt || item?.created_at || now,
            updatedAt: item?.updatedAt || item?.updated_at || now,
            deletedAt: item?.deletedAt || item?.deleted_at || null
        };
    }

    async loadCoveragesFromApi() {
        try {
            const response = await fetch(this.listApiUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to load coverage data (${response.status})`);
            }

            const payload = await response.json();
            const rows = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.result)
                        ? payload.result
                        : [];

            this.data = rows.map((item, index) => this.normalizeCoverageRecord(item, index));
            this.saveData();
            return true;
        } catch (error) {
            console.error('Failed to load coverage data from API:', error);
            this.data = this.loadData();
            return false;
        }
    }

    buildCoveragePayload(formData) {
        return {
            coverage_code: formData.coverage_code,
            type: formData.type,
            cob_id: formData.cob_id,
            sub_cob: formData.sub_cob,
            coverage: formData.coverage,
            status: formData.status || 'active'
        };
    }

    async createCoverageOnApi(payload) {
        const response = await fetch(this.listApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responsePayload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = responsePayload?.message || `Failed to create coverage. Status ${response.status}`;
            throw new Error(message);
        }

        return responsePayload;
    }

    async updateCoverageOnApi(id, payload) {
        const endpoint = `${this.listApiUrl}/${encodeURIComponent(id)}`;
        let response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let responsePayload = await response.json().catch(() => ({}));
        if (!response.ok && response.status === 404) {
            response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(payload)
            });
            responsePayload = await response.json().catch(() => ({}));
        }

        if (!response.ok) {
            const message = responsePayload?.message || `Failed to update coverage. Status ${response.status}`;
            throw new Error(message);
        }

        return responsePayload;
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
        const value = String(cobId || '').trim();
        if (!value) return '-';

        const lookup = this.subCobLookup.find((item) =>
            String(item.cob_name || '').trim() === value
            || String(item.cob_code || '').trim() === value
            || String(item.cob_id || '').trim() === value
        );
        if (lookup?.cob_name) return lookup.cob_name;

        const cobCode = value;
        const type = this.inferTypeByCob(cobCode);
        if (type && this.productData[type]?.cob[cobCode]) {
            return this.productData[type].cob[cobCode].name;
        }

        const product = this.cobProducts.find((item) => Number(item.id) === Number(cobId));
        return product ? product.name : value;
    }

    populateCobDropdown(selectedCob = '') {
        this.cob.innerHTML = '<option value="">Select COB</option>';

        const selected = this.normalizeText(selectedCob || this.cob.value);
        const uniqueCobNames = [...new Set(
            this.subCobLookup
                .map((item) => this.normalizeText(item.cob_name))
                .filter(Boolean)
        )];

        if (!uniqueCobNames.length) {
            const selectedType = this.normalizeText(this.type.value);
            if (selectedType && this.productData[selectedType]) {
                Object.entries(this.productData[selectedType].cob).forEach(([code, definition]) => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = definition.name;
                    this.cob.appendChild(option);
                });
            }
            if (selected) {
                this.cob.value = selected;
            }
            return;
        }

        uniqueCobNames.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.cob.appendChild(option);
        });

        if (selected && [...this.cob.options].some((option) => option.value === selected)) {
            this.cob.value = selected;
        }
    }

    populateSubCobDropdown(selectedSubCob = '') {
        const selectedCob = this.normalizeText(this.cob.value);
        this.subCob.innerHTML = '<option value="">Select Sub COB</option>';

        let subOptions = [];

        if (selectedCob) {
            subOptions = this.subCobLookup
                .filter((item) => this.normalizeText(item.cob_name) === selectedCob)
                .map((item) => this.normalizeText(item.sub_cob_name))
                .filter(Boolean);
        }

        if (!subOptions.length) {
            const selectedType = this.normalizeText(this.type.value);
            if (selectedType && this.productData[selectedType]?.cob?.[selectedCob]?.sub) {
                subOptions = this.productData[selectedType].cob[selectedCob].sub;
            }
        }

        const uniqueSubOptions = [...new Set(subOptions)];
        uniqueSubOptions.forEach((sub) => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            this.subCob.appendChild(option);
        });

        if (selectedSubCob && uniqueSubOptions.includes(selectedSubCob)) {
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

    async handleSave(event) {
        event.preventDefault();
        this.showLoading();

        const formData = this.getFormData();
        const validationError = this.validate(formData);

        if (validationError) {
            this.hideLoading();
            this.showMessage(validationError);
            return;
        }

        try {
            if (formData.id) {
                const payload = this.buildCoveragePayload(formData);
                await this.updateCoverageOnApi(formData.id, payload);
                await this.loadCoveragesFromApi();
                this.resetForm();
                this.applySearch();
                this.showMessage('Coverage record updated successfully.');
                return;
            }

            const payload = this.buildCoveragePayload(formData);
            await this.createCoverageOnApi(payload);
            await this.loadCoveragesFromApi();
            this.resetForm();
            this.applySearch();
            this.showMessage('Coverage record saved successfully.');
        } catch (error) {
            console.error('Failed to save coverage:', error);
            this.showMessage(error.message || 'Failed to save coverage record.');
        } finally {
            this.hideLoading();
        }
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

    async executeDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const coverageId = this.pendingDeleteId;
        this.pendingDeleteId = null;
        this.selectedId = null;
        this.hideConfirmModal();
        this.showLoading();

        try {
            const currentRecord = this.data.find((item) => item.id === coverageId);
            if (!currentRecord) {
                throw new Error('Selected coverage record is not available.');
            }

            const now = new Date().toISOString();
            const updatedRecord = {
                ...currentRecord,
                status: 'inactive',
                deletedAt: now,
                updatedAt: now
            };

            this.data = this.data.map((item) => item.id === coverageId ? updatedRecord : item);
            this.saveData();
            this.resetForm();
            this.applySearch();
            this.showMessage('Coverage record moved to soft delete.');

            const payload = this.buildCoveragePayload(updatedRecord);
            await this.updateCoverageOnApi(coverageId, {
                ...payload,
                deletedAt: now
            }).catch((apiError) => {
                console.warn('API sync failed for soft delete, but local change applied:', apiError);
            });
        } catch (error) {
            console.error('Failed to soft delete coverage:', error);
            this.showMessage(error.message || 'Failed to delete coverage record.');
        } finally {
            this.hideLoading();
        }
    }

    async restoreRecord(id) {
        const record = this.data.find((item) => item.id === id);
        if (!record) return;

        try {
            const payload = this.buildCoveragePayload({
                ...record,
                status: 'active'
            });
            await this.updateCoverageOnApi(id, {
                ...payload,
                deletedAt: null
            });
            await this.loadCoveragesFromApi();
            this.applySearch();
            this.showMessage('Coverage record restored successfully.');
        } catch (error) {
            console.error('Failed to restore coverage:', error);
            this.showMessage(error.message || 'Failed to restore coverage record.');
        }
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
        }).sort((a, b) => {
            const aVal = parseInt(String(a.coverage_code || '').replace(/\D/g, ''), 10) || 0;
            const bVal = parseInt(String(b.coverage_code || '').replace(/\D/g, ''), 10) || 0;
            return bVal - aVal;
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
