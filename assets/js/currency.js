class CurrencyManager {
    constructor() {
        this.storageKey = 'gibsysnet_currency_data';
        this.versionKey = 'gibsysnet_currency_versions';
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchTerm = '';
        this.pendingDeleteId = null;
        this.apiBaseUrl = this.resolveApiBaseUrl();
        this.currencyEndpoint = window.GibsyNetApi?.endpoints?.currencies || `${this.apiBaseUrl}/currencies/`;

        this.currencyCatalog = [
            { id: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', country: 'Indonesia' },
            { id: 'USD', name: 'United States Dollar', symbol: '$', country: 'United States' },
            { id: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
            { id: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore' },
            { id: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
            { id: 'GBP', name: 'British Pound Sterling', symbol: '£', country: 'United Kingdom' },
            { id: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
            { id: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' },
            { id: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', country: 'Malaysia' },
            { id: 'THB', name: 'Thai Baht', symbol: '฿', country: 'Thailand' }
        ];

        this.impactTools = [
            { tool: 'Quotation Engine', impact: 'High', risk: 'Medium' },
            { tool: 'Pricing Matrix', impact: 'High', risk: 'Low' },
            { tool: 'Claims Settlement', impact: 'Medium', risk: 'Low' },
            { tool: 'Report Generator', impact: 'Medium', risk: 'Low' }
        ];

        this.data = this.normalizeData(this.loadData());
        this.versions = this.loadVersions();
        this.bindElements();
        this.bindEvents();
        this.initialize();
    }

    normalizeData(records) {
        if (!Array.isArray(records)) return [];

        return records.map((item) => {
            const currencyId = item.currency_id || item.code || '';
            const currencyName = item.currency_name || item.name || '';
            const currencySymbol = item.currency_symbol || item.symbol || '';
            const isoAlpha3 = item.iso_alpha_3 || item.currency_alpha3 || item.iso3 || item.code || currencyId || '';
            const country = item.country || item.country_name || '';

            return {
                id: String(item.id || this.generateId()),
                currency_id: String(currencyId).toUpperCase(),
                currency_name: currencyName,
                currency_symbol: currencySymbol,
                iso_alpha_3: String(isoAlpha3).toUpperCase(),
                country: country,
                note: item.note || '',
                status: item.status === 'inactive' ? 'inactive' : 'active',
                version: Number(item.version) > 0 ? Number(item.version) : 1,
                createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
                updatedAt: item.updatedAt || new Date().toISOString(),
                deletedAt: item.deletedAt || null,
                createdBy: item.createdBy || this.getCurrentUserName(),
                updatedBy: item.updatedBy || this.getCurrentUserName()
            };
        });
    }

    bindElements() {
        this.form = document.getElementById('currencyForm');
        this.recordId = document.getElementById('recordId');
        this.currencyIdInput = document.getElementById('currencyId');
        this.currencyAutoIdInput = document.getElementById('currencyAutoId');
        this.isoAlpha3Input = document.getElementById('isoAlpha3');
        this.countryInput = document.getElementById('country');
        this.currencyNameInput = document.getElementById('currencyName');
        this.currencyNameDataList = document.getElementById('currencyNameList');
        this.currencyCode = document.getElementById('currencyCode');
        this.currencySymbol = document.getElementById('currencySymbol');
        this.note = document.getElementById('note');

        this.tableBody = document.getElementById('tableBody');
        this.searchInput = document.getElementById('searchInput');
        this.rowCount = document.getElementById('rowCount');
        this.pageInfo = document.getElementById('pageInfo');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        this.newBtnSidebar = document.getElementById('newBtnSidebar');
        this.saveBtnSidebar = document.getElementById('saveBtnSidebar');
        this.deleteBtnSidebar = document.getElementById('deleteBtnSidebar');
        this.exportBtnSidebar = document.getElementById('exportBtnSidebar');

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
        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.saveCurrency();
            });
        }

        if (this.currencyNameInput) {
            this.currencyNameInput.addEventListener('input', () => this.handleCurrencySelection());
        }

        if (this.isoAlpha3Input) {
            this.isoAlpha3Input.addEventListener('input', () => this.handleCurrencySelection());
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (event) => {
                this.searchTerm = (event.target.value || '').trim().toLowerCase();
                this.currentPage = 1;
                this.renderTable();
            });
        }

        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage -= 1;
                    this.renderTable();
                }
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                const totalPages = this.getTotalPages();
                if (this.currentPage < totalPages) {
                    this.currentPage += 1;
                    this.renderTable();
                }
            });
        }

        if (this.newBtnSidebar) {
            this.newBtnSidebar.addEventListener('click', () => this.resetForm());
        }

        if (this.saveBtnSidebar) {
            this.saveBtnSidebar.addEventListener('click', () => this.saveCurrency());
        }

        if (this.deleteBtnSidebar) {
            this.deleteBtnSidebar.addEventListener('click', () => this.deleteSelectedCurrency());
        }

        if (this.exportBtnSidebar) {
            this.exportBtnSidebar.addEventListener('click', () => this.exportCsv());
        }

        if (this.confirmCancel) {
            this.confirmCancel.addEventListener('click', () => this.hideConfirmModal());
        }

        if (this.confirmOk) {
            this.confirmOk.addEventListener('click', () => this.confirmDelete());
        }

        if (this.messageOk) {
            this.messageOk.addEventListener('click', () => this.hideMessageModal());
        }

        document.addEventListener('click', (event) => {
            if (event.target === this.confirmModal) {
                this.hideConfirmModal();
            }
            if (event.target === this.messageModal) {
                this.hideMessageModal();
            }
        });
    }

    async initialize() {
        this.showLoading(true);
        // Use local cache only (restore pre-API behavior)
        const cached = this.loadData();
        if (cached && cached.length) {
            this.data = this.normalizeData(cached);
        } else {
            // seed from local catalog when no cached data exists
            const seeded = this.currencyCatalog.map((c) => ({
                id: this.generateId(),
                currency_id: c.id,
                currency_name: c.name,
                currency_symbol: c.symbol,
                iso_alpha_3: c.id,
                country: c.country || '',
                note: '',
                status: 'active',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: this.getCurrentUserName(),
                updatedBy: this.getCurrentUserName()
            }));

            this.data = this.normalizeData(seeded);
            this.saveData();
        }

        this.populateCurrencyOptions();
        this.renderImpactTable();
        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
        this.showLoading(false);
    }

    resolveApiBaseUrl() {
        const fromWindow = window.GibsyNetApi?.baseUrl;
        const fromStorage = localStorage.getItem('gibsysnet_api_base');
        return String(fromWindow || fromStorage || 'http://localhost:3001/api').replace(/\/$/, '');
    }

    async apiRequest(method, path = '', body = null) {
        const url = path ? `${this.currencyEndpoint.replace(/\/$/, '')}/${path}` : this.currencyEndpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(text || `API request failed with status ${response.status}`);
        }

        return response.json().catch(() => null);
    }

    buildApiPayload(record) {
        const currencyId = String(record.currency_id || record.code || '').trim();
        const currencyName = String(record.currency_name || record.name || '').trim();
        const currencySymbol = String(record.currency_symbol || record.symbol || '').trim();
        const isoAlpha3 = String(record.iso_alpha_3 || record.isoAlpha3 || record.iso_alpha3 || record.iso3 || record.isoAlpha || record.code || currencyId || '').trim();
        const isoAlpha3Alt = String(record.iso_alpha3 || record.isoAlpha3 || '').trim();
        const country = String(record.country || record.country_name || '').trim();

        // Send common variants so backend accepts either naming convention
        const payload = {
            // currency id / code variants
            currency_id: currencyId,
            currency_code: currencyId,
            code: currencyId,

            // name variants
            name: currencyName,
            currency_name: currencyName,

            // symbol variants
            symbol: currencySymbol,
            currency_symbol: currencySymbol,

            // iso variants (underscore and non-underscore)
            iso_alpha_3: isoAlpha3,
            iso_alpha3: isoAlpha3,
            isoAlpha3: isoAlpha3,
            iso_alpha3_alt: isoAlpha3Alt,

            // country
            country: country
        };

        if (record.note) {
            payload.note = String(record.note).trim();
        }

        if (record.status) {
            payload.status = record.status;
        }

        return payload;
    }

    findDataArray(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (payload && typeof payload === 'object') {
            for (const key of Object.keys(payload)) {
                const value = payload[key];
                if (Array.isArray(value)) {
                    return value;
                }
                if (value && typeof value === 'object') {
                    const nested = this.findDataArray(value);
                    if (Array.isArray(nested) && nested.length) {
                        return nested;
                    }
                }
            }
        }

        return [];
    }

    async fetchCurrencies() {
        // Legacy compatibility: load from localStorage only
        try {
            const cached = this.loadData();
            this.data = this.normalizeData(cached);
        } catch (error) {
            console.error('Failed to load cached currencies:', error);
            this.data = [];
        }
    }

    populateCurrencyOptions() {
        if (!this.currencyNameDataList) return;

        const options = this.currencyCatalog.map((currency) => `
            <option value="${currency.name}"></option>
        `);

        this.currencyNameDataList.innerHTML = options.join('');
    }

    handleCurrencySelection() {
        if (!this.currencyNameInput || !this.currencyIdInput || !this.isoAlpha3Input || !this.currencyCode || !this.currencySymbol) return;

        const typedValue = (this.currencyNameInput.value || this.isoAlpha3Input.value || '').trim();
        if (!typedValue) {
            this.currencyIdInput.value = '';
            this.isoAlpha3Input.value = '';
            this.currencyCode.value = '';
            this.currencySymbol.value = '';
            if (this.countryInput) {
                this.countryInput.value = '';
            }
            return;
        }

        const normalized = typedValue.toLowerCase();
        const match = this.currencyCatalog.find((currency) =>
            currency.name.toLowerCase() === normalized || currency.id.toLowerCase() === normalized
        );

        if (match) {
            this.currencyIdInput.value = match.id;
            this.isoAlpha3Input.value = match.id;
            this.currencyCode.value = match.id;
            this.currencySymbol.value = match.symbol;
            if (this.countryInput) {
                this.countryInput.value = match.country || '';
            }
        } else {
            const codeCandidate = typedValue.toUpperCase();
            this.currencyIdInput.value = codeCandidate;
            this.isoAlpha3Input.value = codeCandidate;
            this.currencyCode.value = codeCandidate;
            this.currencySymbol.value = '';
            if (this.countryInput) {
                this.countryInput.value = '';
            }
        }
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch (error) {
            return [];
        }
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    loadVersions() {
        try {
            const raw = localStorage.getItem(this.versionKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch (error) {
            return [];
        }
    }

    saveVersions() {
        localStorage.setItem(this.versionKey, JSON.stringify(this.versions));
    }

    async saveCurrency() {
        const currencyId = (this.currencyIdInput?.value || '').trim();
        const isoAlpha3 = (this.isoAlpha3Input?.value || '').trim();
        const country = (this.countryInput?.value || '').trim();
        const currencyName = (this.currencyNameInput?.value || '').trim();
        const currencySymbol = (this.currencySymbol?.value || '').trim();
        const note = (this.note?.value || '').trim();
        const recordId = (this.recordId?.value || '').trim();

        if (!isoAlpha3 || !currencyName || !currencySymbol) {
            this.showMessage('ISO Alpha-3, Currency Name, and Symbol are required.');
            return;
        }

        const duplicate = this.data.find((item) =>
            item.status === 'active' &&
            item.currency_id.toLowerCase() === currencyId.toLowerCase() &&
            String(item.id) !== String(recordId)
        );

        if (duplicate) {
            this.showMessage('Currency ID already exists. Please choose another one.');
            return;
        }

        // Local-only save (no backend integration)
        if (recordId) {
            const index = this.data.findIndex((item) => String(item.id) === String(recordId));
            if (index === -1) {
                this.showMessage('Currency record not found.');
                return;
            }

            const existing = this.data[index];
            const updatedRecord = {
                ...existing,
                currency_id: currencyId,
                iso_alpha_3: isoAlpha3,
                country,
                currency_name: currencyName,
                currency_symbol: currencySymbol,
                note,
                version: (existing.version || 1) + 1,
                updatedAt: new Date().toISOString(),
                updatedBy: this.getCurrentUserName(),
                status: 'active'
            };

            this.data[index] = updatedRecord;
            this.pushVersion('update', updatedRecord);
            this.saveData();
            this.saveVersions();
            this.showMessage('Currency updated successfully.');
        } else {
            const newRecord = {
                id: this.generateId(),
                currency_id: currencyId,
                iso_alpha_3: isoAlpha3,
                country,
                currency_name: currencyName,
                currency_symbol: currencySymbol,
                note,
                status: 'active',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: this.getCurrentUserName(),
                updatedBy: this.getCurrentUserName()
            };

            this.data.unshift(this.normalizeData([newRecord])[0]);
            this.pushVersion('create', newRecord);
            this.saveData();
            this.saveVersions();
            this.showMessage('Currency saved successfully.');
        }

        this.resetForm();
        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
    }

    generateId() {
        return `CUR-${Date.now().toString(36).toUpperCase()}`;
    }

    pushVersion(action, record) {
        this.versions.unshift({
            id: `${record.id}-${Date.now()}`,
            recordId: record.id,
            currency_id: record.currency_id,
            action,
            version: record.version || 1,
            updatedAt: record.updatedAt || new Date().toISOString(),
            updatedBy: this.getCurrentUserName()
        });

        if (this.versions.length > 100) {
            this.versions = this.versions.slice(0, 100);
        }
    }

    resetForm() {
        if (!this.form) return;

        this.form.reset();
        this.recordId.value = '';
        if (this.currencyAutoIdInput) {
            this.currencyAutoIdInput.value = '';
        }
        if (this.currencyIdInput) {
            this.currencyIdInput.value = '';
        }
        if (this.isoAlpha3Input) {
            this.isoAlpha3Input.value = '';
        }
        if (this.countryInput) {
            this.countryInput.value = '';
        }
        if (this.currencyNameInput) {
            this.currencyNameInput.value = '';
        }
        if (this.currencyCode) {
            this.currencyCode.value = '';
        }
        if (this.currencySymbol) {
            this.currencySymbol.value = '';
        }
        if (this.note) {
            this.note.value = '';
        }
    }

    deleteSelectedCurrency() {
        const recordId = (this.recordId?.value || '').trim();
        if (!recordId) {
            this.showMessage('Select a currency from the list before deleting.');
            return;
        }

        const item = this.data.find((record) => String(record.id) === String(recordId) && record.status === 'active');
        if (!item) {
            this.showMessage('Active currency record not found.');
            return;
        }

        this.pendingDeleteId = recordId;
        if (this.confirmMessage) {
            this.confirmMessage.textContent = `Are you sure you want to soft delete currency ${item.currency_id}?`;
        }
        this.showConfirmModal();
    }

    async confirmDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const index = this.data.findIndex((item) => String(item.id) === String(this.pendingDeleteId));
        if (index === -1) {
            this.hideConfirmModal();
            this.showMessage('Currency record not found.');
            return;
        }

        const existing = this.data[index];

        // Local-only soft delete
        this.data[index] = {
            ...existing,
            status: 'inactive',
            version: (existing.version || 1) + 1,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: this.getCurrentUserName()
        };

        this.pushVersion('soft-delete', this.data[index]);
        this.saveData();
        this.saveVersions();

        this.pendingDeleteId = null;
        this.hideConfirmModal();
        this.resetForm();
        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
        this.showMessage('Currency has been moved to soft delete list.');
    }

    async restoreCurrency(recordId) {
        const index = this.data.findIndex((item) => String(item.id) === String(recordId) && item.status === 'inactive');
        if (index === -1) {
            this.showMessage('Soft deleted record not found.');
            return;
        }

        const existing = this.data[index];

        // Local-only restore
        this.data[index] = {
            ...existing,
            status: 'active',
            version: (existing.version || 1) + 1,
            deletedAt: null,
            updatedAt: new Date().toISOString(),
            updatedBy: this.getCurrentUserName()
        };

        this.pushVersion('restore', this.data[index]);
        this.saveData();
        this.saveVersions();

        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
        this.showMessage(`Currency ${this.data[index].currency_id} restored successfully.`);
    }

    getFilteredData() {
        return this.data
            .filter((item) => {
                if (!this.searchTerm) return true;
                const target = `${item.currency_id} ${item.iso_alpha_3 || ''} ${item.country || ''} ${item.currency_name} ${item.currency_symbol}`.toLowerCase();
                return target.includes(this.searchTerm);
            });
    }

    getTotalPages() {
        const total = this.getFilteredData().length;
        return Math.max(1, Math.ceil(total / this.pageSize));
    }

    renderTable() {
        if (!this.tableBody) return;

        const filtered = this.getFilteredData();
        const totalPages = this.getTotalPages();

        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        const start = (this.currentPage - 1) * this.pageSize;
        const pageItems = filtered.slice(start, start + this.pageSize);

        if (pageItems.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-6 text-center text-gray-500">No currency data available</td>
                </tr>
            `;
        } else {
            const activeRecordId = String(this.recordId?.value || '');
            this.tableBody.innerHTML = pageItems.map((item, index) => {
                const isActive = activeRecordId && String(item.id) === activeRecordId;
                const rowNumber = start + index + 1;
                return `
                    <tr class="hover:bg-gray-50 ${isActive ? 'partner-row-active' : ''}" data-row-id="${item.id}">
                        <td class="px-4 py-3 text-sm text-gray-700">${rowNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.currency_name)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.currency_symbol)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">
                            <button type="button" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-action="edit" data-id="${item.id}"><i class="fas fa-pen mr-1"></i>Edit</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        this.tableBody.querySelectorAll('tr[data-row-id]').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target instanceof HTMLElement && event.target.closest('[data-action="edit"]')) {
                    return;
                }
                this.editCurrency(row.getAttribute('data-row-id'));
            });
        });

        this.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.editCurrency(button.getAttribute('data-id'));
            });
        });

        if (this.rowCount) {
            this.rowCount.textContent = String(filtered.length);
        }
        if (this.pageInfo) {
            this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentPage <= 1;
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    editCurrency(recordId) {
        const item = this.data.find((record) => String(record.id) === String(recordId) && record.status === 'active');
        if (!item) {
            this.showMessage('Currency record not found.');
            return;
        }

        this.recordId.value = item.id;
        if (this.currencyAutoIdInput) {
            this.currencyAutoIdInput.value = item.id;
        }
        if (this.currencyIdInput) {
            this.currencyIdInput.value = item.currency_id;
        }
        if (this.isoAlpha3Input) {
            this.isoAlpha3Input.value = item.iso_alpha_3 || item.currency_id || '';
        }
        if (this.countryInput) {
            this.countryInput.value = item.country || '';
        }
        if (this.currencyNameInput) {
            this.currencyNameInput.value = item.currency_name || item.currency_id;
        }
        if (this.currencyCode) {
            this.currencyCode.value = item.currency_id;
        }
        if (this.currencySymbol) {
            this.currencySymbol.value = item.currency_symbol;
        }
        if (this.note) {
            this.note.value = item.note || '';
        }
    }

    renderImpactTable() {
        if (!this.impactTableBody) return;

        this.impactTableBody.innerHTML = this.impactTools.map((item) => `
            <tr class="border-t">
                <td class="py-2 text-gray-700">${item.tool}</td>
                <td class="py-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${this.getImpactBadgeClass(item.impact)}">${item.impact}</span>
                </td>
                <td class="py-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${this.getRiskBadgeClass(item.risk)}">${item.risk}</span>
                </td>
            </tr>
        `).join('');
    }

    renderGovernancePanels() {
        this.renderVersionList();
        this.renderSoftDeleteList();
        this.renderDependencyList();
        this.renderAiSuggestionList();
    }

    renderVersionList() {
        if (!this.versionList) return;

        if (this.versions.length === 0) {
            this.versionList.innerHTML = '<p class="text-sm text-gray-500">No version history yet.</p>';
            return;
        }

        const latest = this.versions.slice(0, 5);
        this.versionList.innerHTML = latest.map((item) => `
            <div class="border rounded-lg p-3 mb-2 bg-gray-50">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-semibold uppercase text-blue-700">${item.action}</span>
                    <span class="text-xs text-gray-500">v${item.version}</span>
                </div>
                <p class="text-sm font-medium text-gray-800">${item.currency_id}</p>
                <p class="text-xs text-gray-500">${this.formatDate(item.updatedAt)} • ${item.updatedBy || 'System'}</p>
            </div>
        `).join('');
    }

    renderSoftDeleteList() {
        if (!this.softDeleteList) return;

        const deleted = this.data.filter((item) => item.status === 'inactive');

        if (deleted.length === 0) {
            this.softDeleteList.innerHTML = '<p class="text-sm text-gray-500">No soft deleted data.</p>';
            return;
        }

        this.softDeleteList.innerHTML = deleted.slice(0, 5).map((item) => `
            <div class="border rounded-lg p-3 mb-2 bg-red-50">
                <div class="flex justify-between items-center gap-3">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.currency_id)} - ${this.escapeHtml(item.currency_name)}</p>
                        <p class="text-xs text-gray-500">Deleted: ${this.formatDate(item.deletedAt || item.updatedAt)}</p>
                    </div>
                    <button class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200" data-action="restore" data-id="${item.id}">
                        <i class="fas fa-rotate-left mr-1"></i>Restore
                    </button>
                </div>
            </div>
        `).join('');

        this.softDeleteList.querySelectorAll('button[data-action="restore"]').forEach((button) => {
            button.addEventListener('click', () => this.restoreCurrency(button.getAttribute('data-id')));
        });
    }

    renderDependencyList() {
        if (!this.dependencyList) return;

        const active = this.data.filter((item) => item.status === 'active');
        const dependencyItems = active.slice(0, 5).map((item) => {
            const impactCount = this.getDependencyUsage(item.currency_id);
            return `
                <div class="border rounded-lg p-3 mb-2 bg-purple-50">
                    <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.currency_id)} • ${this.escapeHtml(item.currency_name)}</p>
                    <p class="text-xs text-gray-600">Connected modules: ${impactCount}</p>
                </div>
            `;
        });

        this.dependencyList.innerHTML = dependencyItems.length > 0
            ? dependencyItems.join('')
            : '<p class="text-sm text-gray-500">No dependency data available.</p>';
    }

    renderAiSuggestionList() {
        if (!this.aiSuggestionList) return;

        const activeCount = this.data.filter((item) => item.status === 'active').length;
        const deletedCount = this.data.filter((item) => item.status === 'inactive').length;
        const duplicatedIds = this.findDuplicateIds();

        const suggestions = [];

        suggestions.push(`Maintain at least 3 active currencies for stable quotation operations. Current active data: ${activeCount}.`);

        if (deletedCount > 0) {
            suggestions.push(`There are ${deletedCount} soft deleted currencies. Review and restore if still relevant.`);
        } else {
            suggestions.push('Soft delete queue is clean. Data lifecycle governance is healthy.');
        }

        if (duplicatedIds.length > 0) {
            suggestions.push(`Detected duplicate Currency IDs in historical records: ${duplicatedIds.join(', ')}. Consider cleanup.`);
        } else {
            suggestions.push('No duplicate Currency IDs detected in active records.');
        }

        this.aiSuggestionList.innerHTML = `
            <ul class="space-y-2 text-sm text-gray-700">
                ${suggestions.map((item) => `<li class="flex items-start"><i class="fas fa-lightbulb text-amber-500 mt-1 mr-2"></i><span>${item}</span></li>`).join('')}
            </ul>
        `;
    }

    updateHealthMetrics() {
        const active = this.data.filter((item) => item.status === 'active');
        const deleted = this.data.filter((item) => item.status === 'inactive');
        const dependencyCoverage = active.length === 0 ? 0 : Math.min(100, Math.round((active.length / this.currencyCatalog.length) * 100));
        const quality = active.length === 0
            ? 0
            : Math.round((active.filter((item) => item.currency_id && item.currency_name && item.currency_symbol).length / active.length) * 100);

        if (this.metricImpact) {
            this.metricImpact.textContent = String(this.impactTools.filter((item) => item.impact === 'High').length);
        }
        if (this.metricVersions) {
            this.metricVersions.textContent = String(this.versions.length);
        }
        if (this.metricSoftDelete) {
            this.metricSoftDelete.textContent = String(deleted.length);
        }
        if (this.metricDependency) {
            this.metricDependency.textContent = `${dependencyCoverage}%`;
        }
        if (this.metricQuality) {
            this.metricQuality.textContent = `${quality}%`;
        }
    }

    getDependencyUsage(currencyId) {
        const highImpactModules = ['Quotation Engine', 'Pricing Matrix'];
        const mediumImpactModules = ['Claims Settlement', 'Report Generator'];

        if (currencyId === 'IDR' || currencyId === 'USD') return highImpactModules.length + mediumImpactModules.length;
        if (currencyId === 'EUR' || currencyId === 'SGD') return highImpactModules.length;
        return mediumImpactModules.length;
    }

    findDuplicateIds() {
        const active = this.data.filter((item) => item.status === 'active');
        const map = new Map();

        active.forEach((item) => {
            const key = (item.currency_id || '').toLowerCase();
            if (!key) return;
            map.set(key, (map.get(key) || 0) + 1);
        });

        return Array.from(map.entries())
            .filter(([, value]) => value > 1)
            .map(([key]) => key.toUpperCase());
    }

    exportCsv() {
        const active = this.data.filter((item) => item.status === 'active');
        if (active.length === 0) {
            this.showMessage('No active currency data to export.');
            return;
        }

        const headers = ['Currency ID', 'Currency Name', 'Currency Symbol', 'Note', 'Version', 'Updated At'];
        const rows = active.map((item) => [
            item.currency_id,
            item.currency_name,
            item.currency_symbol,
            item.note || '',
            String(item.version || 1),
            this.formatDate(item.updatedAt)
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `currency-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Currency data exported successfully.');
    }

    getCurrentUserName() {
        const userData = localStorage.getItem('gibsysnet_user');
        if (!userData) return 'System';

        try {
            const user = JSON.parse(userData);
            return user?.full_name || user?.username || 'System';
        } catch (error) {
            return 'System';
        }
    }

    formatDate(value) {
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

    getImpactBadgeClass(level) {
        if (level === 'High') return 'bg-red-100 text-red-700';
        if (level === 'Medium') return 'bg-amber-100 text-amber-700';
        return 'bg-green-100 text-green-700';
    }

    getRiskBadgeClass(level) {
        if (level === 'High') return 'bg-red-100 text-red-700';
        if (level === 'Medium') return 'bg-amber-100 text-amber-700';
        return 'bg-green-100 text-green-700';
    }

    showConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.style.display = 'block';
        }
    }

    hideConfirmModal() {
        if (this.confirmModal) {
            this.confirmModal.style.display = 'none';
        }
    }

    showMessage(message) {
        if (this.messageText) {
            this.messageText.textContent = message;
        }
        if (this.messageModal) {
            this.messageModal.style.display = 'block';
        }
    }

    hideMessageModal() {
        if (this.messageModal) {
            this.messageModal.style.display = 'none';
        }
    }

    showLoading(isVisible) {
        if (!this.loadingIndicator) return;
        if (isVisible) {
            this.loadingIndicator.classList.remove('hidden');
        } else {
            this.loadingIndicator.classList.add('hidden');
        }
    }

    escapeHtml(value) {
        const text = String(value ?? '');
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.currencyManager = new CurrencyManager();
});