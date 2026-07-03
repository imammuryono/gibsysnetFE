class CurrencyManager {
    constructor() {
        this.storageKey = 'gibsysnet_currency_data';
        this.apiBaseUrl = this.resolveApiBaseUrl();
        this.listApiUrl = window.GibsyNetApi?.endpoints?.currency || `${this.apiBaseUrl}/currency`;

        this.data = [];
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.filteredData = [];
        this.selectedId = null;
        this.pendingDeleteId = null;

        this.initializeElements();
        this.bindEvents();
        this.loadCurrenciesFromApi().then((loaded) => {
            if (!loaded) {
                this.showMessage('Unable to reach API server. Showing cached local data.');
            }
            this.resetForm();
            this.applySearch();
        });
    }

    initializeElements() {
        this.form = document.getElementById('currencyForm');
        this.recordId = document.getElementById('recordId');
        this.currencyId = document.getElementById('currencyId');
        this.currencyAutoId = document.getElementById('currencyAutoId');
        this.isoAlpha3 = document.getElementById('isoAlpha3');
        this.country = document.getElementById('country');
        this.currencyCode = document.getElementById('currencyCode');
        this.currencyName = document.getElementById('currencyName');
        this.currencySymbol = document.getElementById('currencySymbol');
        this.note = document.getElementById('note');

        this.searchInput = document.getElementById('searchInput');
        this.tableBody = document.getElementById('tableBody');
        this.rowCount = document.getElementById('rowCount');
        this.pageInfo = document.getElementById('pageInfo');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        this.newBtn = document.getElementById('newBtnSidebar');
        this.saveBtn = document.getElementById('saveBtnSidebar');
        this.deleteBtn = document.getElementById('deleteBtnSidebar');
        this.exportBtn = document.getElementById('exportBtnSidebar');

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

    resolveApiBaseUrl() {
        const fromWindow = window.GibsyNetApi?.baseUrl;
        const fromStorage = localStorage.getItem('gibsynet_api_base');
        return String(fromWindow || fromStorage || 'http://localhost:3001/api').replace(/\/$/, '');
    }

    normalizeCurrencyRecord(item, fallbackIndex = 0) {
        const now = new Date().toISOString();
        const normalizedId = item?.id ?? item?.currency_id ?? item?.currencyId ?? item?.currencyID ?? fallbackIndex + 1;

        return {
            id: normalizedId,
            currencyId: item?.currencyId ?? item?.currency_id ?? '',
            autoId: item?.autoId ?? item?.currency_auto_id ?? `CUR-${String(fallbackIndex + 1).padStart(3, '0')}`,
            isoAlpha3: item?.isoAlpha3 ?? item?.iso_alpha_3 ?? '',
            country: item?.country ?? '',
            currencyCode: item?.currencyCode ?? item?.currency_code ?? '',
            currencyName: item?.currencyName ?? item?.currency_name ?? '',
            currencySymbol: item?.currencySymbol ?? item?.currency_symbol ?? '',
            note: item?.note ?? '',
            status: item?.status || 'active',
            version: Number(item?.version || 1),
            createdAt: item?.createdAt || item?.created_at || now,
            updatedAt: item?.updatedAt || item?.updated_at || now,
            deletedAt: item?.deletedAt || item?.deleted_at || null
        };
    }

    async loadCurrenciesFromApi() {
        try {
            const response = await fetch(this.listApiUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to load currency data (${response.status})`);
            }

            const payload = await response.json();
            const rows = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.result)
                        ? payload.result
                        : [];

            this.data = rows.map((item, index) => this.normalizeCurrencyRecord(item, index));
            this.saveData();
            return true;
        } catch (error) {
            console.error('Failed to load currency data from API:', error);
            this.data = this.loadData();
            return false;
        }
    }

    buildCurrencyPayload(formData) {
        return {
            currencyId: formData.currencyId,
            autoId: formData.autoId,
            isoAlpha3: formData.isoAlpha3,
            country: formData.country,
            currencyCode: formData.currencyCode,
            currencyName: formData.currencyName,
            currencySymbol: formData.currencySymbol,
            note: formData.note,
            status: formData.status || 'active'
        };
    }

    async createCurrencyOnApi(payload) {
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
            const message = responsePayload?.message || `Failed to create currency. Status ${response.status}`;
            throw new Error(message);
        }

        return responsePayload;
    }

    async updateCurrencyOnApi(id, payload) {
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
            const message = responsePayload?.message || `Failed to update currency. Status ${response.status}`;
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

    getFormData() {
        const existingId = this.currencyId?.value || this.recordId?.value;

        return {
            id: existingId ? Number(existingId) : null,
            currencyId: this.normalizeText(this.currencyId?.value || this.currencyAutoId?.value || ''),
            autoId: this.normalizeText(this.currencyAutoId?.value || ''),
            isoAlpha3: this.normalizeText(this.isoAlpha3?.value || ''),
            country: this.normalizeText(this.country?.value || ''),
            currencyCode: this.normalizeText(this.currencyCode?.value || ''),
            currencyName: this.normalizeText(this.currencyName?.value || ''),
            currencySymbol: this.normalizeText(this.currencySymbol?.value || ''),
            note: this.normalizeText(this.note?.value || '')
        };
    }

    validate(data) {
        if (!data.currencyName) return 'Currency Name is required.';
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
                const payload = this.buildCurrencyPayload(formData);
                await this.updateCurrencyOnApi(formData.id, payload);
                await this.loadCurrenciesFromApi();
                this.resetForm();
                this.applySearch();
                this.showMessage('Currency record updated successfully.');
                return;
            }

            const payload = this.buildCurrencyPayload(formData);
            await this.createCurrencyOnApi(payload);
            await this.loadCurrenciesFromApi();
            this.resetForm();
            this.applySearch();
            this.showMessage('Currency record saved successfully.');
        } catch (error) {
            console.error('Failed to save currency:', error);
            this.showMessage(error.message || 'Failed to save currency record.');
        } finally {
            this.hideLoading();
        }
    }

    handleDeleteSelected() {
        if (!this.selectedId) {
            this.showMessage('Please select a currency record first.');
            return;
        }

        this.pendingDeleteId = this.selectedId;
        this.confirmMessage.textContent = 'Are you sure you want to soft delete this currency record?';
        this.showConfirmModal();
    }

    async executeDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const currencyId = this.pendingDeleteId;
        this.pendingDeleteId = null;
        this.selectedId = null;
        this.hideConfirmModal();
        this.showLoading();

        try {
            const currentRecord = this.data.find((item) => item.id === currencyId);
            if (!currentRecord) {
                throw new Error('Selected currency record is not available.');
            }

            const now = new Date().toISOString();
            const payload = this.buildCurrencyPayload({
                ...currentRecord,
                status: 'inactive'
            });
            await this.updateCurrencyOnApi(currencyId, {
                ...payload,
                deletedAt: now
            });
            await this.loadCurrenciesFromApi();
            this.resetForm();
            this.applySearch();
            this.showMessage('Currency record moved to soft delete.');
        } catch (error) {
            console.error('Failed to soft delete currency:', error);
            this.showMessage(error.message || 'Failed to delete currency record.');
        } finally {
            this.hideLoading();
        }
    }

    async restoreRecord(id) {
        const record = this.data.find((item) => item.id === id);
        if (!record) return;

        try {
            const payload = this.buildCurrencyPayload({
                ...record,
                status: 'active'
            });
            await this.updateCurrencyOnApi(id, {
                ...payload,
                deletedAt: null
            });
            await this.loadCurrenciesFromApi();
            this.applySearch();
            this.showMessage('Currency record restored successfully.');
        } catch (error) {
            console.error('Failed to restore currency:', error);
            this.showMessage(error.message || 'Failed to restore currency record.');
        }
    }

    resetForm() {
        this.form.reset();
        if (this.recordId) this.recordId.value = '';
        if (this.currencyId) this.currencyId.value = '';
        if (this.currencyAutoId) this.currencyAutoId.value = this.generateNextCurrencyId();
        this.selectedId = null;
        this.highlightSelectedRow();
    }

    setFormData(record) {
        if (this.recordId) this.recordId.value = record.id;
        if (this.currencyId) this.currencyId.value = record.currencyId || '';
        if (this.currencyAutoId) this.currencyAutoId.value = record.autoId || '';
        if (this.isoAlpha3) this.isoAlpha3.value = record.isoAlpha3 || '';
        if (this.country) this.country.value = record.country || '';
        if (this.currencyCode) this.currencyCode.value = record.currencyCode || '';
        if (this.currencyName) this.currencyName.value = record.currencyName || '';
        if (this.currencySymbol) this.currencySymbol.value = record.currencySymbol || '';
        if (this.note) this.note.value = record.note || '';
        this.selectedId = record.id;
        this.highlightSelectedRow();
    }

    generateNextCurrencyId() {
        const maxNumber = this.data.reduce((max, item) => {
            const value = String(item.autoId || '');
            const match = value.match(/(\d+)$/);
            const number = match ? Number(match[1]) : 0;
            return number > max ? number : max;
        }, 0);

        return `CUR-${String(maxNumber + 1).padStart(3, '0')}`;
    }

    applySearch() {
        const keyword = this.searchInput.value.trim().toLowerCase();
        this.filteredData = this.data.filter((item) => {
            const isActive = (item.status || 'active') === 'active';
            if (!isActive) return false;

            const haystack = [
                item.currencyName,
                item.currencyCode,
                item.isoAlpha3,
                item.country,
                item.currencySymbol
            ].join(' ').toLowerCase();

            return haystack.includes(keyword);
        }).sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
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
                    <td colspan="5" class="px-4 py-6 text-center text-gray-500">No currency records found.</td>
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
                    <td class="px-4 py-3 text-sm text-gray-700">${record.currencyName || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.currencyCode || record.currencySymbol || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.country || '-'}</td>
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
        if (!button) {
            const row = event.target.closest('tr[data-row-id]');
            if (row) {
                this.selectedId = Number(row.getAttribute('data-row-id'));
                this.highlightSelectedRow();
            }
            return;
        }

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

        const rows = [
            { tool: 'Quotation Mapping', impact: active.length, risk: active.length > 20 ? 'Medium' : 'Low' },
            { tool: 'Rate Engine Sync', impact: active.length, risk: 'Low' },
            { tool: 'Country Dependency', impact: active.length, risk: active.some((item) => !item.country) ? 'High' : 'Low' }
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
                <p class="text-sm font-semibold text-gray-700">${record.currencyName || '-'} - v${record.version || 1}</p>
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
                <p class="text-sm font-semibold text-gray-700">${record.currencyName || '-'} (${record.currencyCode || '-'})</p>
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
        const missingCountry = active.filter((item) => !item.country).length;
        const missingCode = active.filter((item) => !item.currencyCode).length;

        this.dependencyList.innerHTML = `
            <div class="space-y-2 text-sm text-gray-700">
                <p><span class="font-semibold">Active Currencies:</span> ${active.length}</p>
                <p><span class="font-semibold">Missing Country:</span> ${missingCountry}</p>
                <p><span class="font-semibold">Missing Currency Code:</span> ${missingCode}</p>
                <p><span class="font-semibold">Dependency Status:</span> ${missingCountry + missingCode > 0 ? 'Needs Review' : 'Healthy'}</p>
            </div>
        `;
    }

    renderAISuggestions() {
        if (!this.aiSuggestionList) return;

        const active = this.data.filter((item) => item.status !== 'inactive');
        const suggestions = [];

        if (!active.length) {
            suggestions.push('Start by adding baseline currency records.');
        }

        const duplicates = new Set();
        const seen = new Set();
        active.forEach((item) => {
            const key = String(item.currencyCode || '').toLowerCase();
            if (seen.has(key)) duplicates.add(key);
            seen.add(key);
        });

        if (duplicates.size > 0) {
            suggestions.push('Potential duplicate currency codes detected. Consider consolidation.');
        }

        if (active.some((item) => !item.isoAlpha3)) {
            suggestions.push('Some currencies are missing ISO Alpha-3 codes. Add for standardization.');
        }

        if (!suggestions.length) {
            suggestions.push('Currency configuration looks healthy. Continue periodic review.');
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
            ? Math.round((this.data.filter((item) => item.currencyName && item.currencyCode).length / total) * 100)
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
        const headers = ['Currency Name', 'Currency Code', 'ISO Alpha-3', 'Country', 'Symbol', 'Status'];
        const rows = this.filteredData.map((item) => [
            item.currencyName,
            item.currencyCode,
            item.isoAlpha3,
            item.country,
            item.currencySymbol,
            item.status || 'active'
        ]);

        const csv = [headers, ...rows]
            .map((columns) => columns.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `currency-data-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Currency data exported successfully.');
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
    window.currencyManager = new CurrencyManager();
});
