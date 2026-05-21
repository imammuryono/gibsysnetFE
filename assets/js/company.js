class CompanyManager {
    constructor() {
        this.companiesApiEndpoint = 'http://localhost:3001/api/companies/?page=1';
        this.createCompanyApiEndpoint = 'http://localhost:3001/api/companies';
        this.usingRemoteData = false;
        this.remoteTotalPages = 1;
        this.remoteTotalRows = 0;

        this.storageKey = 'gibsysnet_company_data';
        this.softDeleteIdsKey = 'gibsysnet_company_soft_deleted_ids';
        this.data = this.loadData();
        this.softDeletedIds = this.loadSoftDeletedIds();
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.remoteRowsPerPage = this.rowsPerPage;
        this.filteredData = [...this.data];
        this.selectedId = null;
        this.pendingDeleteId = null;

        this.initializeElements();
        this.bindEvents();
        this.resetForm();
        this.renderAll();
        this.initializeDataSource();
    }

    async initializeDataSource() {
        this.showLoading();
        await this.loadCompaniesFromApi(1);
        this.hideLoading();
    }

    initializeElements() {
        this.form = document.getElementById('companyForm');
        this.recordId = document.getElementById('recordId');
        this.companyId = document.getElementById('companyId');
        this.name = document.getElementById('name');
        this.nib = document.getElementById('nib');
        this.address = document.getElementById('address');
        this.city = document.getElementById('city');
        this.province = document.getElementById('province');
        this.postalCode = document.getElementById('postalCode');
        this.phone = document.getElementById('phone');
        this.npwp = document.getElementById('npwp');
        this.website = document.getElementById('website');
        this.email = document.getElementById('email');
        this.ojk = document.getElementById('ojk');
        this.apparindo = document.getElementById('apparindo');
        this.bankPremi = document.getElementById('bankPremi');
        this.accountPremi = document.getElementById('accountPremi');
        this.bankOpex = document.getElementById('bankOpex');
        this.bankAccount = document.getElementById('bankAccount');
        this.note = document.getElementById('note');

        this.searchInput = document.getElementById('searchInput');
        this.tableBody = document.getElementById('companiesTableBody');
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
        this.prevBtn.addEventListener('click', () => this.changePage(-1));
        this.nextBtn.addEventListener('click', () => this.changePage(1));

        this.confirmCancel.addEventListener('click', () => this.hideConfirmModal());
        this.confirmOk.addEventListener('click', () => this.executeDelete());
        this.messageOk.addEventListener('click', () => this.hideMessageModal());

        this.tableBody.addEventListener('click', (event) => this.handleTableAction(event));
    }

    hasActiveCompany() {
        return this.getVisibleCompanies(this.data).length > 0;
    }

    updateNewButtonState() {
        if (!this.newBtn) return;

        const shouldDisable = this.hasActiveCompany();
        this.newBtn.disabled = shouldDisable;
        this.newBtn.classList.toggle('opacity-50', shouldDisable);
        this.newBtn.classList.toggle('cursor-not-allowed', shouldDisable);
        this.newBtn.title = shouldDisable
            ? 'New dinonaktifkan karena sudah ada data company active. Kosongkan data active terlebih dahulu.'
            : 'Create new company';
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return [];
            return parsed.map((item) => ({
                ...item,
                status: item.status || 'active',
                version: item.version || 1,
                deletedAt: item.deletedAt || null
            }));
        } catch (_) {
            return [];
        }
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    loadSoftDeletedIds() {
        const stored = localStorage.getItem(this.softDeleteIdsKey);
        if (!stored) return new Set();

        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Set();
            return new Set(parsed.map((id) => String(id).trim()).filter(Boolean));
        } catch (_) {
            return new Set();
        }
    }

    saveSoftDeletedIds() {
        localStorage.setItem(this.softDeleteIdsKey, JSON.stringify([...this.softDeletedIds]));
    }

    normalizeId(value) {
        return String(value ?? '').trim();
    }

    getCompanyRowsFromApiPayload(payload) {
        if (Array.isArray(payload)) return payload;

        if (!payload || typeof payload !== 'object') {
            return [];
        }

        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.companies)) return payload.companies;
        if (Array.isArray(payload.rows)) return payload.rows;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.results)) return payload.results;

        if (payload.data && typeof payload.data === 'object') {
            if (Array.isArray(payload.data.companies)) return payload.data.companies;
            if (Array.isArray(payload.data.rows)) return payload.data.rows;
            if (Array.isArray(payload.data.items)) return payload.data.items;
            if (Array.isArray(payload.data.results)) return payload.data.results;
        }

        return [];
    }

    toNumberOrDefault(value, defaultValue) {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : defaultValue;
    }

    getPaginationFromApiPayload(payload, fallbackPage, fallbackCount) {
        const pagination = payload?.pagination || payload?.meta || payload?.data?.pagination || payload?.data?.meta || {};

        const currentPage = this.toNumberOrDefault(
            pagination.currentPage
            ?? pagination.current_page
            ?? pagination.page
            ?? payload?.currentPage
            ?? payload?.current_page
            ?? payload?.page,
            fallbackPage
        );

        const totalPages = this.toNumberOrDefault(
            pagination.totalPages
            ?? pagination.total_pages
            ?? pagination.total_page
            ?? pagination.lastPage
            ?? pagination.last_page
            ?? payload?.totalPages
            ?? payload?.total_pages
            ?? payload?.total_page
            ?? payload?.lastPage
            ?? payload?.last_page,
            1
        );

        const totalRows = this.toNumberOrDefault(
            pagination.totalRows
            ?? pagination.total_rows
            ?? pagination.total_record
            ?? pagination.total
            ?? payload?.totalRows
            ?? payload?.total_rows
            ?? payload?.total_record
            ?? payload?.total,
            fallbackCount
        );

        const pageSize = this.toNumberOrDefault(
            pagination.perPage
            ?? pagination.per_page
            ?? pagination.pageSize
            ?? pagination.page_size
            ?? pagination.limit
            ?? payload?.perPage
            ?? payload?.per_page
            ?? payload?.pageSize
            ?? payload?.page_size
            ?? payload?.limit,
            this.remoteRowsPerPage || this.rowsPerPage
        );

        return {
            currentPage,
            totalPages,
            totalRows,
            pageSize
        };
    }

    normalizeCompanyRowsFromApi(rows = []) {
        if (!Array.isArray(rows)) return [];

        return rows.map((item, index) => {
            const fallbackId = index + 1;
            const rawId = item?.id ?? item?.company_id ?? item?.companyId ?? fallbackId;
            const parsedId = Number(rawId);
            const id = Number.isFinite(parsedId) ? parsedId : fallbackId;
            const deletedAt = item?.deletedAt || item?.deleted_at || null;
            const isDeletedByFlag = this.isDeletedFlagTrue(item?.is_deleted ?? item?.isDeleted);
            const statusRaw = this.normalizeText(item?.status || '').toLowerCase();
            const isDeleted = isDeletedByFlag || Boolean(deletedAt) || statusRaw === 'inactive' || statusRaw === 'deleted';

            return {
                id,
                company_id: 'COM.' + String(index + 1).padStart(4, '0'),
                name: this.normalizeText(item?.name),
                nib: this.normalizeText(item?.nib),
                address: this.normalizeText(item?.address),
                city: this.normalizeText(item?.city),
                province: this.normalizeText(item?.province),
                postal_code: this.normalizeText(item?.postal_code ?? item?.postalCode),
                phone: this.normalizeText(item?.phone),
                npwp: this.normalizeText(item?.npwp),
                website: this.normalizeText(item?.website),
                email: this.normalizeText(item?.email),
                ojk_number: this.normalizeText(item?.ojk_number ?? item?.ojkNumber),
                apparindo_number: this.normalizeText(item?.apparindo_number ?? item?.apparindoNumber),
                bank_premi: this.normalizeText(item?.bank_premi ?? item?.bankPremi),
                account_premi: this.normalizeText(item?.account_premi ?? item?.accountPremi),
                bank_opex: this.normalizeText(item?.bank_opex ?? item?.bankOpex),
                bank_account: this.normalizeText(item?.bank_account ?? item?.bankAccount),
                note: this.normalizeText(item?.note),
                status: isDeleted ? 'inactive' : (statusRaw || 'active'),
                is_deleted: isDeleted,
                version: Number(item?.version) || 1,
                createdAt: item?.createdAt || item?.created_at || null,
                updatedAt: item?.updatedAt || item?.updated_at || null,
                deletedAt
            };
        });
    }

    isDeletedFlagTrue(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;

        const normalized = String(value || '').trim().toLowerCase();
        return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
    }

    isSoftDeleted(item) {
        if (!item || typeof item !== 'object') return false;

        const status = String(item.status || '').trim().toLowerCase();
        const deletedFlag = this.isDeletedFlagTrue(item.is_deleted ?? item.isDeleted);
        const deletedByLocalState = this.softDeletedIds.has(this.normalizeId(item.id));

        return status === 'inactive' || status === 'deleted' || deletedFlag || Boolean(item.deletedAt) || deletedByLocalState;
    }

    markRecordAsSoftDeletedLocal(id) {
        const idx = this.data.findIndex((item) => item.id === id);
        if (idx === -1) return;

        const deletedAt = new Date().toISOString();
        const normalizedId = this.normalizeId(id);

        this.data[idx] = {
            ...this.data[idx],
            status: 'inactive',
            is_deleted: true,
            deletedAt,
            updatedAt: deletedAt,
            version: (this.data[idx].version || 1) + 1
        };

        if (normalizedId) {
            this.softDeletedIds.add(normalizedId);
            this.saveSoftDeletedIds();
        }

        this.filteredData = this.getVisibleCompanies(this.data);
        this.saveData();
    }

    getVisibleCompanies(rows = this.data) {
        if (!Array.isArray(rows)) return [];
        return rows.filter((item) => !this.isSoftDeleted(item));
    }

    async loadCompaniesFromApi(page = 1) {
        try {
            const endpointUrl = new URL(this.companiesApiEndpoint);
            endpointUrl.searchParams.set('page', String(page));

            const response = await fetch(endpointUrl.toString(), {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch companies. Status ${response.status}`);
            }

            const payload = await response.json();
            const rows = this.getCompanyRowsFromApiPayload(payload);
            const normalizedRows = this.normalizeCompanyRowsFromApi(rows);
            const pagination = this.getPaginationFromApiPayload(payload, page, normalizedRows.length);

            this.data = normalizedRows;
            this.filteredData = this.getVisibleCompanies(normalizedRows);
            this.currentPage = pagination.currentPage;
            this.remoteTotalPages = pagination.totalPages;
            this.remoteTotalRows = pagination.totalRows;
            this.remoteRowsPerPage = pagination.pageSize;
            this.usingRemoteData = true;

            this.renderAll();
            return true;
        } catch (error) {
            this.usingRemoteData = false;
            this.remoteTotalPages = this.getTotalPages();
            this.remoteTotalRows = this.filteredData.length;
            this.remoteRowsPerPage = this.rowsPerPage;
            console.error('Failed to load companies from API:', error);
            this.renderAll();
            return false;
        }
    }

    normalizeText(value) {
        return String(value || '').trim();
    }

    generateNextCompanyId() {
        const maxNumber = this.data.reduce((max, item) => {
            const value = String(item.company_id || '');
            const match = value.match(/(\d+)$/);
            const number = match ? Number(match[1]) : 0;
            return number > max ? number : max;
        }, 0);

        return `COMP${String(maxNumber + 1).padStart(3, '0')}`;
    }

    getFormData() {
        const existingCode = this.normalizeText(this.companyId.value);

        return {
            id: this.recordId.value ? Number(this.recordId.value) : null,
            company_id: existingCode || this.generateNextCompanyId(),
            name: this.normalizeText(this.name.value),
            nib: this.normalizeText(this.nib.value),
            address: this.normalizeText(this.address.value),
            city: this.normalizeText(this.city.value),
            province: this.normalizeText(this.province.value),
            postal_code: this.normalizeText(this.postalCode.value),
            phone: this.normalizeText(this.phone.value),
            npwp: this.normalizeText(this.npwp.value),
            website: this.normalizeText(this.website.value),
            email: this.normalizeText(this.email.value),
            ojk_number: this.normalizeText(this.ojk.value),
            apparindo_number: this.normalizeText(this.apparindo.value),
            bank_premi: this.normalizeText(this.bankPremi.value),
            account_premi: this.normalizeText(this.accountPremi.value),
            bank_opex: this.normalizeText(this.bankOpex.value),
            bank_account: this.normalizeText(this.bankAccount.value),
            note: this.normalizeText(this.note.value)
        };
    }

    validate(data) {
        if (!data.name) return 'Company name is required.';
        if (!data.nib) return 'NIB is required.';
        if (!data.address) return 'Address is required.';
        if (!data.city) return 'City is required.';
        if (!data.province) return 'Province is required.';
        if (!data.postal_code) return 'Postal Code is required.';
        if (!data.phone) return 'Phone is required.';
        if (!data.npwp) return 'NPWP is required.';
        if (!data.email) return 'Email is required.';
        return null;
    }

    getCreateCompanyPayload(formData) {
        return {
            name: formData.name,
            nib: formData.nib,
            address: formData.address,
            city: formData.city,
            province: formData.province,
            postal_code: formData.postal_code,
            phone: formData.phone,
            npwp: formData.npwp,
            website: formData.website,
            email: formData.email,
            ojk_number: formData.ojk_number,
            apparindo_number: formData.apparindo_number,
            bank_premi: formData.bank_premi,
            account_premi: formData.account_premi,
            bank_opex: formData.bank_opex,
            bank_account: formData.bank_account,
            note: formData.note
        };
    }

    async createCompanyOnApi(payload) {
        const response = await fetch(this.createCompanyApiEndpoint, {
            method: 'POST',
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
            const message = responsePayload?.message || `Failed to save company. Status ${response.status}`;
            throw new Error(message);
        }

        return responsePayload;
    }

    getUpdateCompanyApiEndpoint(companyId) {
        return `${this.createCompanyApiEndpoint}/${encodeURIComponent(String(companyId))}`;
    }

    async updateCompanyOnApi(companyId, payload) {
        const endpoint = this.getUpdateCompanyApiEndpoint(companyId);

        let response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Some backends expose PATCH instead of PUT for updates.
        if (response.status === 405 || response.status === 404) {
            response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        }

        let responsePayload = null;
        try {
            responsePayload = await response.json();
        } catch (_) {
            responsePayload = null;
        }

        if (!response.ok) {
            const message = responsePayload?.message || `Failed to update company. Status ${response.status}`;
            throw new Error(message);
        }

        return responsePayload;
    }

    async softDeleteCompanyOnApi(companyId) {
        const record = this.data.find((item) => item.id === companyId);
        if (!record) {
            throw new Error('Selected company record is not available.');
        }

        const deletedAt = new Date().toISOString();
        const payload = {
            ...this.getCreateCompanyPayload(record),
            status: 'inactive',
            is_deleted: true,
            deleted_at: deletedAt,
            deletedAt
        };

        return await this.updateCompanyOnApi(companyId, payload);
    }

    async handleSave(event) {
        event.preventDefault();
        this.showLoading();

        const formData = this.getFormData();

        if (!formData.id && this.hasActiveCompany()) {
            this.hideLoading();
            this.showMessage('Hanya 1 data company active yang diperbolehkan. Silakan kosongkan data active terlebih dahulu.');
            return;
        }

        const validationError = this.validate(formData);

        if (validationError) {
            this.hideLoading();
            this.showMessage(validationError);
            return;
        }

        try {
            if (formData.id) {
                const payload = this.getCreateCompanyPayload(formData);
                await this.updateCompanyOnApi(formData.id, payload);
                const pageToReload = this.currentPage;
                this.resetForm();
                this.searchInput.value = '';
                await this.loadCompaniesFromApi(pageToReload);
                this.showMessage('Company record updated successfully.');
                return;
            }

            const payload = this.getCreateCompanyPayload(formData);
            await this.createCompanyOnApi(payload);
            this.resetForm();
            this.searchInput.value = '';
            await this.loadCompaniesFromApi(1);
            this.showMessage('Company record saved successfully.');
        } catch (error) {
            console.error('Failed to create company:', error);
            this.showMessage(error.message || 'Failed to save company record.');
        } finally {
            this.hideLoading();
        }
    }

    handleDeleteSelected() {
        if (!this.selectedId) {
            this.showMessage('Please select a company record first.');
            return;
        }

        this.pendingDeleteId = this.selectedId;
        this.confirmMessage.textContent = 'Are you sure you want to soft delete this company record?';
        this.showConfirmModal();
    }

    async executeDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const companyId = this.pendingDeleteId;
        this.pendingDeleteId = null;
        this.selectedId = null;
        this.hideConfirmModal();
        this.showLoading();

        try {
            await this.softDeleteCompanyOnApi(companyId);
            this.markRecordAsSoftDeletedLocal(companyId);
            this.resetForm();
            this.searchInput.value = '';

            const pageBeforeReload = this.currentPage;
            await this.loadCompaniesFromApi(pageBeforeReload);

            if (this.data.length === 0 && pageBeforeReload > 1) {
                await this.loadCompaniesFromApi(pageBeforeReload - 1);
            }

            this.showMessage('Company record moved to soft delete successfully.');
        } catch (error) {
            console.error('Failed to soft delete company:', error);
            this.showMessage(error.message || 'Failed to soft delete company record.');
        } finally {
            this.hideLoading();
        }
    }

    restoreRecord(id) {
        const idx = this.data.findIndex((item) => item.id === id);
        if (idx === -1) return;

        const normalizedId = this.normalizeId(id);
        if (normalizedId) {
            this.softDeletedIds.delete(normalizedId);
            this.saveSoftDeletedIds();
        }

        this.data[idx] = {
            ...this.data[idx],
            status: 'active',
            is_deleted: false,
            deletedAt: null,
            version: (this.data[idx].version || 1) + 1,
            updatedAt: new Date().toISOString()
        };

        this.saveData();
        this.applySearch();
        this.showMessage('Company record restored successfully.');
    }

    resetForm() {
        this.form.reset();
        this.recordId.value = '';
        this.companyId.value = this.generateNextCompanyId();
        this.selectedId = null;
        this.highlightSelectedRow();
    }

    setFormData(record) {
        this.recordId.value = record.id;
        this.companyId.value = record.company_id || '';
        this.name.value = record.name || '';
        this.nib.value = record.nib || '';
        this.address.value = record.address || '';
        this.city.value = record.city || '';
        this.province.value = record.province || '';
        this.postalCode.value = record.postal_code || '';
        this.phone.value = record.phone || '';
        this.npwp.value = record.npwp || '';
        this.website.value = record.website || '';
        this.email.value = record.email || '';
        this.ojk.value = record.ojk_number || '';
        this.apparindo.value = record.apparindo_number || '';
        this.bankPremi.value = record.bank_premi || '';
        this.accountPremi.value = record.account_premi || '';
        this.bankOpex.value = record.bank_opex || '';
        this.bankAccount.value = record.bank_account || '';
        this.note.value = record.note || '';

        this.selectedId = record.id;
        this.highlightSelectedRow();
    }

    applySearch() {
        const keyword = this.searchInput.value.trim().toLowerCase();
        this.filteredData = this.getVisibleCompanies().filter((item) => {
            const haystack = [
                item.company_id,
                item.name,
                item.nib,
                item.city,
                item.phone,
                item.email,
                item.npwp,
                item.address
            ].join(' ').toLowerCase();

            return haystack.includes(keyword);
        });

        this.currentPage = 1;
        this.renderAll();
    }

    async changePage(step) {
        const isRemotePaging = this.usingRemoteData && !this.searchInput.value.trim();
        if (isRemotePaging) {
            const totalPages = Math.max(1, this.remoteTotalPages);
            const nextPage = this.currentPage + step;
            if (nextPage < 1 || nextPage > totalPages) return;

            this.showLoading();
            await this.loadCompaniesFromApi(nextPage);
            this.hideLoading();
            return;
        }

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
        const isRemotePaging = this.usingRemoteData && !this.searchInput.value.trim();
        const pageSize = isRemotePaging ? this.remoteRowsPerPage || this.rowsPerPage : this.rowsPerPage;
        const pageStart = (this.currentPage - 1) * pageSize;

        if (!records.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-4 py-6 text-center text-gray-500">No company records found.</td>
                </tr>
            `;
            this.rowCount.textContent = '0';
            this.highlightSelectedRow();
            return;
        }

        this.tableBody.innerHTML = records.map((record, index) => {
            const rowClass = record.status === 'inactive' ? 'bg-red-50' : '';
            const nameClass = record.status === 'inactive' ? 'text-red-600' : 'text-gray-900';
            const rowNumber = pageStart + index + 1;

            return `
                <tr class="hover:bg-blue-50 ${rowClass}" data-row-id="${record.id}">
                    <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">${rowNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-700 font-mono whitespace-nowrap">${record.company_id}</td>
                    <td class="px-4 py-3 text-sm font-medium ${nameClass}">${record.name || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.nib || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.city || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.phone || '-'}</td>
                    <td class="px-4 py-3 text-sm whitespace-nowrap">
                        <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-action="edit" data-id="${record.id}">
                            <i class="fas fa-pen mr-1"></i>Edit
                        </button>
                        ${record.status === 'inactive'
                            ? `<button class="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors" data-action="restore" data-id="${record.id}"><i class="fas fa-undo mr-1"></i>Restore</button>`
                            : ''}
                    </td>
                </tr>
            `;
        }).join('');

        this.rowCount.textContent = String(this.filteredData.length);
        this.highlightSelectedRow();
    }

    renderPagination() {
        const isRemotePaging = this.usingRemoteData && !this.searchInput.value.trim();
        const totalPages = isRemotePaging ? Math.max(1, this.remoteTotalPages) : this.getTotalPages();
        const totalRows = this.filteredData.length;

        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        this.rowCount.textContent = String(totalRows);
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
            if (!row) return;

            const rowId = Number(row.getAttribute('data-row-id'));
            if (!Number.isFinite(rowId)) return;

            this.selectedId = rowId;
            this.highlightSelectedRow();
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

        if (action === 'delete') {
            this.selectedId = id;
            this.handleDeleteSelected();
            return;
        }

        if (action === 'restore') {
            this.restoreRecord(id);
        }
    }

    renderImpactAnalysis() {
        if (!this.impactTableBody) return;

        const active = this.getVisibleCompanies();
        const missingContacts = active.filter((item) => !item.phone || !item.email).length;
        const rows = [
            { tool: 'Quotation Integration', impact: active.length, risk: active.length > 20 ? 'Medium' : 'Low' },
            { tool: 'Compliance Registry', impact: active.length, risk: missingContacts > 0 ? 'Medium' : 'Low' },
            { tool: 'Financial Mapping', impact: active.length, risk: active.some((item) => !item.bank_account) ? 'High' : 'Low' }
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
                <p class="text-sm font-semibold text-gray-700">${record.name || '-'} (${record.company_id || '-'}) - v${record.version || 1}</p>
                <p class="text-xs text-gray-500">Updated: ${this.formatDateTime(record.updatedAt)}</p>
            </div>
        `).join('');
    }

    renderSoftDeletePanel() {
        if (!this.softDeleteList) return;

        const deleted = this.data.filter((item) => this.isSoftDeleted(item)).slice(-5).reverse();

        if (!deleted.length) {
            this.softDeleteList.innerHTML = '<p class="text-sm text-gray-500">No soft deleted data.</p>';
            return;
        }

        this.softDeleteList.innerHTML = deleted.map((record) => `
            <div class="py-2 border-b last:border-b-0">
                <p class="text-sm font-semibold text-gray-700">${record.name || '-'} (${record.company_id || '-'})</p>
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

        const active = this.getVisibleCompanies();
        const missingBank = active.filter((item) => !item.bank_account).length;
        const missingAddress = active.filter((item) => !item.address || !item.city || !item.province).length;

        this.dependencyList.innerHTML = `
            <div class="space-y-2 text-sm text-gray-700">
                <p><span class="font-semibold">Active Companies:</span> ${active.length}</p>
                <p><span class="font-semibold">Missing Bank Account:</span> ${missingBank}</p>
                <p><span class="font-semibold">Incomplete Address:</span> ${missingAddress}</p>
                <p><span class="font-semibold">Dependency Status:</span> ${missingBank + missingAddress > 0 ? 'Needs Review' : 'Healthy'}</p>
            </div>
        `;
    }

    renderAISuggestions() {
        if (!this.aiSuggestionList) return;

        const active = this.getVisibleCompanies();
        const suggestions = [];

        if (!active.length) {
            suggestions.push('Start by adding core company profiles for underwriting and policy issuance workflows.');
        }

        if (active.some((item) => !item.ojk_number)) {
            suggestions.push('Some records do not contain OJK numbers. Complete licenses to strengthen compliance readiness.');
        }

        if (active.some((item) => !item.bank_account)) {
            suggestions.push('Bank account information is incomplete for several companies. Validate payment destination mapping.');
        }

        if (!suggestions.length) {
            suggestions.push('Company master data looks healthy. Continue periodic review of legal and payment attributes.');
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
        const active = this.getVisibleCompanies().length;
        const deleted = this.data.filter((item) => this.isSoftDeleted(item)).length;
        const avgVersion = total ? this.data.reduce((sum, item) => sum + (item.version || 1), 0) / total : 0;
        const quality = total
            ? Math.round(
                (this.data.filter((item) => item.name && item.nib && item.email && item.phone && item.address).length / total) * 100
            )
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
        this.updateNewButtonState();
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
        const headers = [
            'Company ID',
            'Name',
            'NIB',
            'Address',
            'City',
            'Province',
            'Postal Code',
            'Phone',
            'NPWP',
            'Website',
            'Email',
            'OJK Number',
            'Apparindo Number',
            'Bank Premi',
            'Account Premi',
            'Bank Opex',
            'Bank Account',
            'Note',
            'Status',
            'Version',
            'Updated At'
        ];

        const rows = this.filteredData.map((item) => [
            item.company_id,
            item.name,
            item.nib,
            item.address,
            item.city,
            item.province,
            item.postal_code,
            item.phone,
            item.npwp,
            item.website,
            item.email,
            item.ojk_number,
            item.apparindo_number,
            item.bank_premi,
            item.account_premi,
            item.bank_opex,
            item.bank_account,
            item.note,
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
        link.setAttribute('download', `company-data-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Company data exported successfully.');
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
    window.companyManager = new CompanyManager();
});
