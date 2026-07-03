class CommissionManager {
    constructor() {
        this.storageKey = 'gibsysnet_commission_data';
        this.createApiUrl = 'http://localhost:3001/api/commissions';
        this.listApiUrl = 'http://localhost:3001/api/commissions';
        this.detailApiBaseUrl = 'http://localhost:3001/api/commissions';
        this.data = this.loadData();
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.filteredData = [...this.data];
        this.selectedId = null;
        this.pendingDeleteId = null;

        this.initializeElements();
        this.bindEvents();
        this.initialize();
    }

    initializeElements() {
        this.form = document.getElementById('commissionForm');
        this.commissionId = document.getElementById('commissionId');
        this.marketingNameInput = document.getElementById('marketingName');
        this.lowerRange = document.getElementById('lowerRange');
        this.upperRange = document.getElementById('upperRange');
        this.commCodeInput = document.getElementById('commCode');
        this.yearI = document.getElementById('yearI');
        this.yearII = document.getElementById('yearII');
        this.yearIII = document.getElementById('yearIII');

        this.searchInput = document.getElementById('searchInput');
        this.tableBody = document.getElementById('commissionTableBody');
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
        if (!this.form || !this.tableBody) {
            console.error('CommissionManager: required elements are missing.');
            return;
        }

        this.bindFieldFormatters();

        this.form.addEventListener('submit', (event) => this.handleSave(event));

        if (this.newBtn) {
            this.newBtn.addEventListener('click', () => this.resetForm());
        }

        if (this.saveBtn && this.saveBtn !== this.form.querySelector('[type="submit"]')) {
            this.saveBtn.addEventListener('click', () => {
                if (typeof this.form.requestSubmit === 'function') {
                    this.form.requestSubmit();
                    return;
                }

                this.handleSave({
                    preventDefault() {
                    }
                });
            });
        }

        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this.handleDeleteSelected());
        }

        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportData());
        }

        this.searchInput?.addEventListener('input', () => this.applySearch());
        this.prevBtn?.addEventListener('click', () => this.changePage(-1));
        this.nextBtn?.addEventListener('click', () => this.changePage(1));

        this.confirmCancel?.addEventListener('click', () => this.hideConfirmModal());
        this.confirmOk?.addEventListener('click', () => this.executeDelete());
        this.messageOk?.addEventListener('click', () => this.hideMessageModal());

        this.tableBody.addEventListener('click', (event) => this.handleTableAction(event));
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed)
                ? parsed.map(item => ({
                    ...item,
                    id: Number(item.id || 0),
                    marketing_id: this.normalizeMarketingId(item.marketing_id ?? item.marketingId),
                    marketing_name: String(item.marketing_name ?? item.marketingName ?? '').trim(),
                    lower_range: this.normalizeNumber(item.lower_range ?? item.lowerRange),
                    upper_range: this.normalizeNumber(item.upper_range ?? item.upperRange),
                    year_1: this.normalizeNumber(item.year_1 ?? item.year_I),
                    year_2: this.normalizeNumber(item.year_2 ?? item.year_II),
                    year_3: this.normalizeNumber(item.year_3 ?? item.year_III)
                }))
                : [];
        } catch (_) {
            return [];
        }
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    async initialize() {
        this.showLoading();

        try {
            await this.loadCommissionsFromApi();
        } catch (error) {
            console.error('Failed to initialize commission data:', error);
        } finally {
            try {
                this.filteredData = [...this.data];
                this.renderAll();
                this.resetForm();
            } catch (error) {
                console.error('Failed to render commission page:', error);
            } finally {
                this.hideLoading();
            }
        }
    }

    normalizeNumber(value) {
        if (value === '' || value === null || value === undefined) return 0;

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        const normalized = this.normalizeNumericInputString(value);
        if (!normalized) return 0;

        const parsed = Number(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    normalizeNumericInputString(value) {
        const raw = String(value ?? '').trim();
        if (!raw) return '';

        const noPercent = raw.replace(/%/g, '');
        const cleaned = noPercent.replace(/\s+/g, '');
        if (!cleaned) return '';

        if (cleaned.includes(',') && cleaned.includes('.')) {
            return cleaned.replace(/,/g, '');
        }

        if (cleaned.includes(',') && !cleaned.includes('.')) {
            const commaCount = (cleaned.match(/,/g) || []).length;
            if (commaCount > 1) {
                return cleaned.replace(/,/g, '');
            }

            const [left = '', right = ''] = cleaned.split(',');
            if (right.length === 3 && left.length > 0) {
                return `${left}${right}`;
            }

            return `${left}.${right}`;
        }

        return cleaned;
    }

    toPlainNumberString(value) {
        const normalized = this.normalizeNumber(value);
        if (!Number.isFinite(normalized)) return '';

        const stringValue = normalized.toString();
        return stringValue.includes('e')
            ? normalized.toFixed(6).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
            : stringValue;
    }

    formatRangeInputValue(value) {
        const normalized = this.normalizeNumber(value);
        if (normalized === 0 && String(value ?? '').trim() === '') return '';
        return this.formatNumber(normalized);
    }

    formatPercentInputValue(value) {
        const normalized = this.normalizeNumber(value);
        if (normalized === 0 && String(value ?? '').trim() === '') return '';
        return `${this.formatNumber(normalized)}%`;
    }

    setupFormattedInput(inputElement, formatter) {
        if (!inputElement || typeof formatter !== 'function') return;

        inputElement.addEventListener('focus', () => {
            const raw = String(inputElement.value ?? '').trim();
            if (!raw) return;
            inputElement.value = this.toPlainNumberString(raw);
        });

        inputElement.addEventListener('blur', () => {
            const raw = String(inputElement.value ?? '').trim();
            if (!raw) {
                inputElement.value = '';
                return;
            }
            inputElement.value = formatter.call(this, raw);
        });
    }

    bindFieldFormatters() {
        this.setupFormattedInput(this.lowerRange, this.formatRangeInputValue);
        this.setupFormattedInput(this.upperRange, this.formatRangeInputValue);
        this.setupFormattedInput(this.yearI, this.formatPercentInputValue);
        this.setupFormattedInput(this.yearII, this.formatPercentInputValue);
        this.setupFormattedInput(this.yearIII, this.formatPercentInputValue);
    }

    normalizeMarketingId(value) {
        if (value === '' || value === null || value === undefined) return '';
        return String(value).trim();
    }

    isInactiveCommissionRecord(record) {
        if (!record) return false;

        const status = String(record.status || '').trim().toLowerCase();
        return status === 'inactive'
            || status === 'deleted'
            || Boolean(record.deletedAt)
            || Boolean(record.deleted_at)
            || record.is_deleted === true
            || record.is_deleted === 1;
    }

    getCommissionRecordKeys(record) {
        const keys = [];
        const apiId = Number(record?.api_id || record?.id || record?.commission_id || record?.commissionId || 0) || null;
        const marketingId = this.normalizeMarketingId(record?.marketing_id ?? record?.marketingId);
        const commCode = String(record?.comm_code ?? record?.commCode ?? record?.commcode ?? '').trim();

        if (apiId) {
            keys.push(`api:${apiId}`);
            keys.push(`id:${apiId}`);
        }

        if (marketingId && commCode) {
            keys.push(`mk:${marketingId}|${commCode}`);
        }

        if (record?.id) {
            keys.push(`row:${record.id}`);
        }

        return Array.from(new Set(keys));
    }

    mergeCommissionRecords(primaryRecords, secondaryRecords) {
        const merged = [];

        const findMatchIndex = (record) => {
            const keys = this.getCommissionRecordKeys(record);
            return merged.findIndex((existing) => this.getCommissionRecordKeys(existing).some((key) => keys.includes(key)));
        };

        const upsert = (record) => {
            if (!record) return;

            const normalized = {
                ...record,
                id: Number(record.id || 0) || Number(record.api_id || 0) || 0
            };
            const existingIndex = findMatchIndex(normalized);

            if (existingIndex === -1) {
                merged.push(normalized);
                return;
            }

            const existing = merged[existingIndex];
            const updated = {
                ...existing,
                ...normalized
            };

            if (this.isInactiveCommissionRecord(existing) && !this.isInactiveCommissionRecord(normalized)) {
                updated.status = 'active';
                updated.deletedAt = null;
            }

            if (!this.isInactiveCommissionRecord(existing) && this.isInactiveCommissionRecord(normalized)) {
                updated.status = 'inactive';
                updated.deletedAt = normalized.deletedAt || normalized.deleted_at || existing.deletedAt || new Date().toISOString();
            }

            merged[existingIndex] = updated;
        };

        primaryRecords.forEach(upsert);
        secondaryRecords.forEach(upsert);
        return merged;
    }

    getNextMarketingId() {
        const usedIds = this.data
            .map((item) => Number(item?.marketing_id))
            .filter((id) => Number.isInteger(id) && id > 0);

        const maxUsedId = usedIds.length ? Math.max(...usedIds) : 0;
        return String(maxUsedId + 1);
    }

    isCommissionRecordShape(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

        return [
            value.marketingId,
            value.marketing_id,
            value.marketing_name,
            value.lowerRange,
            value.lower_range,
            value.upperRange,
            value.upper_range,
            value.commCode,
            value.comm_code,
            value.year_1,
            value.year_I,
            value.year_2,
            value.year_II,
            value.year_3,
            value.year_III
        ].some((field) => field !== undefined && field !== null && field !== '');
    }

    getCommissionRowsFromApiPayload(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.commissions)) return payload.commissions;
        if (Array.isArray(payload?.rows)) return payload.rows;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
        if (this.isCommissionRecordShape(payload?.data)) return [payload.data];
        if (this.isCommissionRecordShape(payload)) return [payload];
        return [];
    }

    getStoredCommissionState() {
        const rows = this.loadData();
        const map = new Map();

        rows.forEach((item) => {
            if (!item || item.status !== 'inactive') return;

            const keys = [
                item.api_id ? `api:${item.api_id}` : '',
                item.id ? `id:${item.id}` : '',
                item.marketing_id && item.comm_code ? `mk:${item.marketing_id}|${item.comm_code}` : ''
            ].filter(Boolean);

            keys.forEach((key) => {
                map.set(key, String(item.deletedAt || ''));
            });
        });

        return map;
    }

    mapApiCommission(item, index, storedState) {
        const apiId = Number(item?.id || item?.commissionId || item?.commission_id || 0) || null;
        const marketingId = this.normalizeMarketingId(
            item?.marketingId ?? item?.marketing_id ?? item?.marketingid
        );
        const marketingName = String(item?.marketing_name ?? item?.marketingName ?? '').trim();
        const commCode = String(item?.commCode ?? item?.comm_code ?? item?.commcode ?? '').trim();
        const fallbackId = apiId || (index + 1);
        const deletedAtFromApi = item?.deletedAt || item?.deleted_at || null;
        const statusRaw = String(item?.status || '').trim().toLowerCase();
        const isDeletedFlag = item?.is_deleted === true
            || item?.is_deleted === 1
            || String(item?.is_deleted || '').toLowerCase() === 'true';

        const stateKeys = [
            apiId ? `api:${apiId}` : '',
            fallbackId ? `id:${fallbackId}` : '',
            marketingId && commCode ? `mk:${marketingId}|${commCode}` : ''
        ].filter(Boolean);

        const storedDeletedAt = stateKeys.reduce((result, key) => result || storedState.get(key) || '', '');
        const isInactive = statusRaw === 'inactive'
            || statusRaw === 'deleted'
            || isDeletedFlag
            || Boolean(deletedAtFromApi)
            || Boolean(storedDeletedAt);

        return {
            id: fallbackId,
            api_id: apiId,
            marketing_id: marketingId || String(fallbackId),
            marketing_name: marketingName,
            lower_range: this.normalizeNumber(item?.lowerRange ?? item?.lower_range),
            upper_range: this.normalizeNumber(item?.upperRange ?? item?.upper_range),
            comm_code: commCode,
            year_1: this.normalizeNumber(item?.year_1 ?? item?.year_I),
            year_2: this.normalizeNumber(item?.year_2 ?? item?.year_II),
            year_3: this.normalizeNumber(item?.year_3 ?? item?.year_III),
            status: isInactive ? 'inactive' : 'active',
            version: Number(item?.version || 1),
            createdAt: item?.created_at || item?.createdAt || new Date().toISOString(),
            updatedAt: item?.updated_at || item?.updatedAt || new Date().toISOString(),
            deletedAt: storedDeletedAt || deletedAtFromApi || null
        };
    }

    async loadCommissionsFromApi() {
        try {
            const storedRecords = this.loadData();
            const response = await fetch(this.listApiUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to load commissions. Status ${response.status}`);
            }

            const payload = await response.json();
            if (payload?.success === false) {
                return false;
            }

            const storedState = this.getStoredCommissionState();
            const rows = this.getCommissionRowsFromApiPayload(payload);
            const apiRecords = rows
                .map((item, index) => this.mapApiCommission(item, index, storedState))
                .filter((item) => Number.isInteger(item.id) && item.id > 0);
            const mergedRecords = this.mergeCommissionRecords(storedRecords, apiRecords);
            this.data = mergedRecords.filter((item) => Number.isInteger(item.id) && item.id > 0);
            this.saveData();
            return true;
        } catch (error) {
            console.error('Failed to load commissions from API:', error);
            return false;
        }
    }

    mapApiCommissionDetail(item, fallbackRecord = {}) {
        const fallback = fallbackRecord || {};
        const marketingId = this.normalizeMarketingId(
            item?.marketingId ?? item?.marketing_id ?? item?.marketingid ?? fallback.marketing_id
        );
        const marketingName = String(
            item?.marketing_name ?? item?.marketingName ?? fallback.marketing_name ?? ''
        ).trim();
        const hasLowerRange = item?.lowerRange !== undefined || item?.lower_range !== undefined;
        const hasUpperRange = item?.upperRange !== undefined || item?.upper_range !== undefined;
        const hasYear1 = item?.year_1 !== undefined || item?.year_I !== undefined;
        const hasYear2 = item?.year_2 !== undefined || item?.year_II !== undefined;
        const hasYear3 = item?.year_3 !== undefined || item?.year_III !== undefined;
        const commCode = String(item?.commCode ?? item?.comm_code ?? item?.commcode ?? fallback.comm_code ?? '').trim();
        const apiId = Number(
            item?.id ?? item?.commissionId ?? item?.commission_id ?? fallback.api_id ?? fallback.id ?? 0
        ) || null;

        return {
            ...fallback,
            id: apiId || fallback.id,
            api_id: apiId || fallback.api_id || null,
            marketing_id: marketingId || fallback.marketing_id || String(apiId || fallback.id || this.getNextMarketingId()),
            marketing_name: marketingName || fallback.marketing_name || '',
            lower_range: hasLowerRange
                ? this.normalizeNumber(item?.lowerRange ?? item?.lower_range)
                : this.normalizeNumber(fallback.lower_range),
            upper_range: hasUpperRange
                ? this.normalizeNumber(item?.upperRange ?? item?.upper_range)
                : this.normalizeNumber(fallback.upper_range),
            comm_code: commCode || fallback.comm_code || '',
            year_1: hasYear1 ? this.normalizeNumber(item?.year_1 ?? item?.year_I) : this.normalizeNumber(fallback.year_1),
            year_2: hasYear2 ? this.normalizeNumber(item?.year_2 ?? item?.year_II) : this.normalizeNumber(fallback.year_2),
            year_3: hasYear3 ? this.normalizeNumber(item?.year_3 ?? item?.year_III) : this.normalizeNumber(fallback.year_3),
            status: String(item?.status || fallback.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : (fallback.status || 'active'),
            version: Number(item?.version || fallback.version || 1),
            createdAt: item?.created_at || item?.createdAt || fallback.createdAt || new Date().toISOString(),
            updatedAt: item?.updated_at || item?.updatedAt || fallback.updatedAt || new Date().toISOString(),
            deletedAt: item?.deleted_at || item?.deletedAt || fallback.deletedAt || null
        };
    }

    async loadCommissionByIdFromApi(record) {
        const apiId = this.resolveApiCommissionId(record);
        if (!apiId) {
            return null;
        }

        const response = await fetch(`${this.detailApiBaseUrl}/${encodeURIComponent(String(apiId))}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to load commission detail from API (status ${response.status}).`);
        }

        const payload = await response.json();
        if (payload?.success === false) {
            return null;
        }

        const firstRow = this.getCommissionRowsFromApiPayload(payload)[0] || null;
        if (!firstRow) {
            return null;
        }

        return this.mapApiCommissionDetail(firstRow, record);
    }

    getFormData() {
        return {
            id: this.commissionId?.value ? Number(this.commissionId.value) : null,
            marketing_name: String(this.marketingNameInput?.value || '').trim(),
            lower_range: this.normalizeNumber(this.lowerRange?.value),
            upper_range: this.normalizeNumber(this.upperRange?.value),
            comm_code: String(this.commCodeInput?.value || '').trim(),
            year_1: this.normalizeNumber(this.yearI?.value),
            year_2: this.normalizeNumber(this.yearII?.value),
            year_3: this.normalizeNumber(this.yearIII?.value)
        };
    }

    validate(data) {
        if (!data.marketing_name) return 'Marketing Name is required.';
        if (!data.comm_code) return 'Commission code is required.';
        if (data.upper_range < data.lower_range) return 'Upper Range must be greater than or equal to Lower Range.';
        return null;
    }

    buildCreatePayload(record) {
        const mktId = this.normalizeMarketingId(record.marketing_id);
        return {
            marketing_id: mktId,
            marketingId: mktId,
            marketing_name: record.marketing_name,
            marketingName: record.marketing_name,
            comm_code: record.comm_code,
            commCode: record.comm_code,
            lower_range: record.lower_range,
            lowerRange: record.lower_range,
            upper_range: record.upper_range,
            upperRange: record.upper_range,
            year_I: record.year_1,
            year_II: record.year_2,
            year_III: record.year_3
        };
    }

    buildUpdatePayload(record, overrides = {}) {
        const mktId = this.normalizeMarketingId(record.marketing_id);
        return {
            marketing_id: mktId,
            marketingId: mktId,
            marketing_name: record.marketing_name,
            marketingName: record.marketing_name,
            comm_code: record.comm_code,
            commCode: record.comm_code,
            lower_range: record.lower_range,
            lowerRange: record.lower_range,
            upper_range: record.upper_range,
            upperRange: record.upper_range,
            year_I: record.year_1,
            year_II: record.year_2,
            year_III: record.year_3,
            ...overrides
        };
    }

    isNetworkFetchError(error) {
        const message = String(error?.message || '').toLowerCase();
        return error instanceof TypeError || message.includes('failed to fetch') || message.includes('networkerror');
    }

    async parseApiResponse(response, fallbackMessage) {
        let payload = null;
        try {
            payload = await response.json();
        } catch (_) {
            payload = null;
        }

        if (!response.ok) {
            const message = payload?.message || payload?.error || fallbackMessage;
            throw new Error(message);
        }

        if (payload?.success === false) {
            throw new Error(payload?.message || fallbackMessage);
        }

        return payload;
    }

    resolveApiCommissionId(record) {
        const candidates = [
            record?.api_id,
            record?.id,
            record?.commission_id,
            record?.commissionId
        ];

        for (const candidate of candidates) {
            const value = Number(candidate);
            if (Number.isInteger(value) && value > 0) {
                return value;
            }
        }

        return null;
    }

    async updateCommissionOnApi(record) {
        const apiId = this.resolveApiCommissionId(record);
        if (!apiId) {
            throw new Error('Cannot sync commission update because API identifier is missing.');
        }

        const endpoint = `${this.listApiUrl}/${encodeURIComponent(String(apiId))}`;
        let response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(this.buildUpdatePayload(record))
        });

        if (response.status === 405 || response.status === 404) {
            response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(this.buildUpdatePayload(record))
            });
        }

        return await this.parseApiResponse(response, `Failed to update commission. Status ${response.status}`);
    }

    async deleteCommissionOnApi(record) {
        const apiId = this.resolveApiCommissionId(record);
        if (!apiId) {
            throw new Error('Cannot sync commission delete because API identifier is missing.');
        }

        const endpoint = `${this.listApiUrl}/${encodeURIComponent(String(apiId))}`;
        const deletedAt = record.deletedAt || new Date().toISOString();
        let response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(this.buildUpdatePayload(record, {
                status: 'inactive',
                is_deleted: true,
                deleted_at: deletedAt,
                deletedAt
            }))
        });

        if (response.status === 405 || response.status === 404) {
            response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(this.buildUpdatePayload(record, {
                    status: 'inactive',
                    is_deleted: true,
                    deleted_at: deletedAt,
                    deletedAt
                }))
            });
        }

        return await this.parseApiResponse(response, `Failed to soft delete commission. Status ${response.status}`);
    }

    async restoreCommissionOnApi(record) {
        const apiId = this.resolveApiCommissionId(record);
        if (!apiId) {
            throw new Error('Cannot sync commission restore because API identifier is missing.');
        }

        const endpoint = `${this.listApiUrl}/${encodeURIComponent(String(apiId))}`;
        let response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(this.buildUpdatePayload(record, {
                status: 'active',
                is_deleted: false,
                deleted_at: null,
                deletedAt: null
            }))
        });

        if (response.status === 405 || response.status === 404) {
            response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(this.buildUpdatePayload(record, {
                    status: 'active',
                    is_deleted: false,
                    deleted_at: null,
                    deletedAt: null
                }))
            });
        }

        return await this.parseApiResponse(response, `Failed to restore commission. Status ${response.status}`);
    }

    async createCommissionOnApi(record) {
        const response = await fetch(this.createApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(this.buildCreatePayload(record))
        });

        return await this.parseApiResponse(response, `Failed to create commission. Status ${response.status}`);
    }

    createLocalRecord(formData, apiPayload) {
        const nextId = this.data.length ? Math.max(...this.data.map(item => Number(item.id) || 0)) + 1 : 1;
        const apiRecord = apiPayload?.data && !Array.isArray(apiPayload.data) ? apiPayload.data : null;
        const now = new Date().toISOString();
        const apiId = Number(apiRecord?.id || apiPayload?.id || 0) || null;

        return {
            ...formData,
            id: apiId || nextId,
            api_id: apiId,
            marketing_id: this.normalizeMarketingId(
                apiRecord?.marketingId ?? apiRecord?.marketing_id ?? formData.marketing_id ?? this.getNextMarketingId()
            ),
            marketing_name: String(apiRecord?.marketing_name ?? apiRecord?.marketingName ?? formData.marketing_name ?? '').trim(),
            lower_range: this.normalizeNumber(apiRecord?.lowerRange ?? apiRecord?.lower_range ?? formData.lower_range),
            upper_range: this.normalizeNumber(apiRecord?.upperRange ?? apiRecord?.upper_range ?? formData.upper_range),
            comm_code: String((apiRecord?.commCode ?? apiRecord?.comm_code ?? formData.comm_code) || '').trim(),
            year_1: this.normalizeNumber(apiRecord?.year_1 ?? apiRecord?.year_I ?? formData.year_1),
            year_2: this.normalizeNumber(apiRecord?.year_2 ?? apiRecord?.year_II ?? formData.year_2),
            year_3: this.normalizeNumber(apiRecord?.year_3 ?? apiRecord?.year_III ?? formData.year_3),
            status: 'active',
            version: 1,
            createdAt: apiRecord?.created_at || apiRecord?.createdAt || now,
            updatedAt: apiRecord?.updated_at || apiRecord?.updatedAt || now,
            deletedAt: null
        };
    }

    async handleSave(event) {
        event.preventDefault();
        this.showLoading();

        try {
            const formData = this.getFormData();
            const validationError = this.validate(formData);

            if (validationError) {
                this.showMessage(validationError);
                return;
            }

            if (formData.id) {
                const idx = this.data.findIndex(item => item.id === formData.id);
                if (idx > -1) {
                    const previousVersion = this.data[idx].version || 1;
                    const updatedRecord = {
                        ...this.data[idx],
                        ...formData,
                        marketing_id: this.normalizeMarketingId(this.data[idx].marketing_id || this.getNextMarketingId()),
                        status: this.data[idx].status || 'active',
                        version: previousVersion + 1,
                        updatedAt: new Date().toISOString(),
                        deletedAt: this.data[idx].deletedAt || null
                    };

                    let updatedWithLocalFallback = false;
                    try {
                        await this.updateCommissionOnApi(updatedRecord);
                    } catch (error) {
                        const message = String(error?.message || '');
                        const canFallback = this.isNetworkFetchError(error)
                            || message.includes('API identifier is missing')
                            || message.includes('Failed to fetch');
                        if (!canFallback) {
                            throw error;
                        }
                        updatedWithLocalFallback = true;
                    }

                    this.data[idx] = updatedRecord;
                    this.saveData();

                    if (!updatedWithLocalFallback) {
                        await this.loadCommissionsFromApi();
                    }

                    this.showMessage(updatedWithLocalFallback
                        ? 'Commission record updated locally. API sync is pending.'
                        : 'Commission record updated successfully.');
                }
            } else {
                const createRecord = {
                    ...formData,
                    marketing_id: this.getNextMarketingId()
                };
                const apiPayload = await this.createCommissionOnApi(createRecord);
                const loadedFromApi = await this.loadCommissionsFromApi();
                if (!loadedFromApi) {
                    this.data.push(this.createLocalRecord(createRecord, apiPayload));
                }
                this.showMessage('Commission record saved successfully.');
            }

            this.saveData();
            this.resetForm();
            this.applySearch();
        } catch (error) {
            console.error('Failed to save commission:', error);
            this.showMessage(error.message || 'Failed to save commission data.');
        } finally {
            this.hideLoading();
        }
    }

    handleDeleteSelected() {
        if (!this.selectedId) {
            this.showMessage('Please select a commission record first.');
            return;
        }

        this.pendingDeleteId = this.selectedId;
        this.confirmMessage.textContent = 'Are you sure you want to delete this commission record?';
        this.showConfirmModal();
    }

    async executeDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const targetId = this.pendingDeleteId;
        const idx = this.data.findIndex(item => item.id === targetId);

        this.pendingDeleteId = null;
        this.selectedId = null;
        this.hideConfirmModal();

        if (idx === -1) {
            this.resetForm();
            this.applySearch();
            return;
        }

        this.showLoading();

        try {
            const targetRecord = this.data[idx];
            const apiId = this.resolveApiCommissionId(targetRecord);
            const now = new Date().toISOString();
            const softDeletedRecord = {
                ...targetRecord,
                status: 'inactive',
                deletedAt: now,
                version: (targetRecord.version || 1) + 1,
                updatedAt: now
            };
            let apiDeleteMessage = '';
            let deletedWithLocalFallback = false;
            let deleteSyncSucceeded = false;

            if (apiId) {
                try {
                    const deletePayload = await this.deleteCommissionOnApi(softDeletedRecord);
                    apiDeleteMessage = String(deletePayload?.message || '').trim();

                    this.data[idx] = softDeletedRecord;
                    this.saveData();

                    const refreshed = await this.loadCommissionsFromApi();
                    if (!refreshed) {
                        deletedWithLocalFallback = true;
                    }
                    deleteSyncSucceeded = true;
                } catch (error) {
                    const message = String(error?.message || '');
                    const canFallback = this.isNetworkFetchError(error)
                        || message.includes('API identifier is missing')
                        || message.includes('Failed to fetch');
                    if (!canFallback) {
                        throw error;
                    }
                    deletedWithLocalFallback = true;
                }
            } else {
                deletedWithLocalFallback = true;
            }

            if (deleteSyncSucceeded || deletedWithLocalFallback) {
                this.data[idx] = softDeletedRecord;
                this.saveData();
            }

            this.resetForm();
            this.applySearch();
            this.showMessage(apiId
                ? (apiDeleteMessage || 'Commission record soft deleted successfully.')
                : 'Commission record soft deleted locally.');
        } catch (error) {
            console.error('Failed to delete commission:', error);
            this.showMessage(error.message || 'Failed to delete commission.');
        } finally {
            this.hideLoading();
        }
    }

    async restoreRecord(id) {
        const idx = this.data.findIndex(item => item.id === id);
        if (idx === -1) return;

        this.showLoading();

        try {
            const restoredRecord = {
                ...this.data[idx],
                status: 'active',
                deletedAt: null,
                version: (this.data[idx].version || 1) + 1,
                updatedAt: new Date().toISOString()
            };

            let restoredWithLocalFallback = false;
            try {
                await this.restoreCommissionOnApi(restoredRecord);
            } catch (error) {
                const message = String(error?.message || '');
                const canFallback = this.isNetworkFetchError(error)
                    || message.includes('API identifier is missing')
                    || message.includes('Failed to fetch');
                if (!canFallback) {
                    throw error;
                }
                restoredWithLocalFallback = true;
            }

            this.data[idx] = restoredRecord;
            this.saveData();

            if (!restoredWithLocalFallback) {
                await this.loadCommissionsFromApi();
            }

            this.applySearch();
            this.showMessage(restoredWithLocalFallback
                ? 'Commission record restored locally. API sync is pending.'
                : 'Commission record restored successfully.');
        } catch (error) {
            console.error('Failed to restore commission:', error);
            this.showMessage(error.message || 'Failed to restore commission.');
        } finally {
            this.hideLoading();
        }
    }

    resetForm() {
        this.form.reset();
        this.commissionId.value = '';
        this.selectedId = null;
        this.highlightSelectedRow();
    }

    setFormData(record) {
        this.commissionId.value = record.id;
        this.marketingNameInput.value = record.marketing_name ?? '';
        this.lowerRange.value = this.formatRangeInputValue(record.lower_range);
        this.upperRange.value = this.formatRangeInputValue(record.upper_range);
        this.commCodeInput.value = record.comm_code || '';
        this.yearI.value = this.formatPercentInputValue(record.year_1);
        this.yearII.value = this.formatPercentInputValue(record.year_2);
        this.yearIII.value = this.formatPercentInputValue(record.year_3);

        this.selectedId = record.id;
        this.highlightSelectedRow();
    }

    applySearch() {
        const keyword = this.searchInput.value.trim().toLowerCase();
        this.filteredData = this.data.filter(item => {
            if (this.isInactiveCommissionRecord(item)) return false;

            const haystack = [
                item.marketing_name,
                item.comm_code,
                String(item.lower_range),
                String(item.upper_range),
                String(item.year_1),
                String(item.year_2),
                String(item.year_3)
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

    formatNumber(value) {
        return Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatPercent(value) {
        return `${this.formatNumber(value)}%`;
    }

    renderTable() {
        const records = this.getCurrentPageData();

        if (!records.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-4 py-6 text-center text-gray-500">No commission records found.</td>
                </tr>
            `;
            this.rowCount.textContent = '0';
            this.highlightSelectedRow();
            return;
        }

        this.tableBody.innerHTML = records.map((record, index) => {
            const statusClass = record.status === 'inactive' ? 'text-red-600' : 'text-gray-900';
            const rowClass = record.status === 'inactive' ? 'bg-red-50' : '';
            const rowNumber = (this.currentPage - 1) * this.rowsPerPage + index + 1;

            return `
                <tr class="hover:bg-blue-50 ${rowClass}" data-row-id="${record.id}">
                    <td class="px-4 py-3 text-sm ${statusClass}">${rowNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.marketing_name || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${record.comm_code || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.formatNumber(record.lower_range)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.formatNumber(record.upper_range)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.formatPercent(record.year_1)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.formatPercent(record.year_2)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.formatPercent(record.year_3)}</td>
                    <td class="px-4 py-3 text-sm">
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
        const totalPages = this.getTotalPages();
        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        this.prevBtn.disabled = this.currentPage === 1;
        this.nextBtn.disabled = this.currentPage === totalPages;
    }

    highlightSelectedRow() {
        const rows = this.tableBody.querySelectorAll('tr[data-row-id]');
        rows.forEach(row => {
            const rowId = Number(row.getAttribute('data-row-id'));
            if (this.selectedId && rowId === this.selectedId) {
                row.classList.add('ring-2', 'ring-blue-300');
            } else {
                row.classList.remove('ring-2', 'ring-blue-300');
            }
        });
    }

    async handleTableAction(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            const row = event.target.closest('tr[data-row-id]');
            if (!row) return;

            const selectedId = Number(row.getAttribute('data-row-id'));
            const selectedRecord = this.data.find(item => item.id === selectedId);
            if (!selectedRecord) return;

            this.setFormData(selectedRecord);
            return;
        }

        const action = button.getAttribute('data-action');
        const id = Number(button.getAttribute('data-id'));
        const record = this.data.find(item => item.id === id);
        if (!record) return;

        if (action === 'edit') {
            this.setFormData(record);
            this.showLoading();
            try {
                const detailedRecord = await this.loadCommissionByIdFromApi(record);
                if (detailedRecord) {
                    const index = this.data.findIndex((item) => item.id === id);
                    if (index > -1) {
                        this.data[index] = {
                            ...this.data[index],
                            ...detailedRecord
                        };
                        this.saveData();
                    }
                    this.setFormData(detailedRecord);
                } else {
                    this.setFormData(record);
                }
            } catch (error) {
                console.error('Failed to load commission detail:', error);
                this.setFormData(record);
            } finally {
                this.hideLoading();
            }
            return;
        }

        if (action === 'restore') {
            this.restoreRecord(id);
        }
    }

    renderImpactAnalysis() {
        if (!this.impactTableBody) return;

        const activeCount = this.data.filter(item => item.status !== 'inactive').length;
        const highRisk = this.data.filter(item => item.upper_range > 1000000 && item.status !== 'inactive').length;
        const mediumRisk = this.data.filter(item => item.upper_range > 100000 && item.upper_range <= 1000000 && item.status !== 'inactive').length;

        const rows = [
            { tool: 'Commission Rules', impact: activeCount, risk: highRisk > 0 ? 'High' : 'Low' },
            { tool: 'Range Validation', impact: activeCount, risk: mediumRisk > 0 ? 'Medium' : 'Low' },
            { tool: 'Rate Structure', impact: activeCount, risk: activeCount > 15 ? 'Medium' : 'Low' }
        ];

        this.impactTableBody.innerHTML = rows.map(row => `
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

        this.versionList.innerHTML = topRecords.map(record => `
            <div class="py-2 border-b last:border-b-0">
                <p class="text-sm font-semibold text-gray-700">${record.marketing_name || '-'} (${record.comm_code || '-'}) - v${record.version || 1}</p>
                <p class="text-xs text-gray-500">Updated: ${this.formatDateTime(record.updatedAt)}</p>
            </div>
        `).join('');
    }

    renderSoftDeletePanel() {
        if (!this.softDeleteList) return;

        const deleted = this.data.filter(item => item.status === 'inactive').slice(-5).reverse();

        if (!deleted.length) {
            this.softDeleteList.innerHTML = '<p class="text-sm text-gray-500">No soft deleted data.</p>';
            return;
        }

        this.softDeleteList.innerHTML = deleted.map(record => `
            <div class="py-2 border-b last:border-b-0">
                <p class="text-sm font-semibold text-gray-700">${record.marketing_name || '-'} (${record.comm_code || '-'})</p>
                <p class="text-xs text-gray-500 mb-2">Deleted: ${this.formatDateTime(record.deletedAt)}</p>
                <button class="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700" data-action="restore" data-id="${record.id}">
                    Restore
                </button>
            </div>
        `).join('');

        this.softDeleteList.querySelectorAll('button[data-action="restore"]').forEach(button => {
            button.addEventListener('click', () => {
                const id = Number(button.getAttribute('data-id'));
                this.restoreRecord(id);
            });
        });
    }

    renderDependencyControl() {
        if (!this.dependencyList) return;

        const active = this.data.filter(item => item.status !== 'inactive').length;
        const inactive = this.data.filter(item => item.status === 'inactive').length;
        const duplicateCodes = new Set();
        const seen = new Set();

        this.data.forEach(item => {
            const key = String(item.comm_code || '').toLowerCase();
            if (!key) return;
            if (seen.has(key)) duplicateCodes.add(key);
            seen.add(key);
        });

        this.dependencyList.innerHTML = `
            <div class="space-y-2 text-sm text-gray-700">
                <p><span class="font-semibold">Active Rules:</span> ${active}</p>
                <p><span class="font-semibold">Inactive Rules:</span> ${inactive}</p>
                <p><span class="font-semibold">Duplicate Comm. Codes:</span> ${duplicateCodes.size}</p>
                <p><span class="font-semibold">Dependency Status:</span> ${duplicateCodes.size > 0 ? 'Needs Review' : 'Healthy'}</p>
            </div>
        `;
    }

    renderAISuggestions() {
        if (!this.aiSuggestionList) return;

        const suggestions = [];
        const active = this.data.filter(item => item.status !== 'inactive');

        if (!active.length) {
            suggestions.push('Start by adding baseline commission ranges for each marketing channel.');
        }

        const normalizedRanges = active
            .map((item) => ({
                lower: this.normalizeNumber(item.lower_range),
                upper: this.normalizeNumber(item.upper_range)
            }))
            .filter((item) => item.upper >= item.lower)
            .sort((a, b) => a.lower - b.lower);

        let hasOverlap = false;
        for (let i = 1; i < normalizedRanges.length; i += 1) {
            const prev = normalizedRanges[i - 1];
            const curr = normalizedRanges[i];
            if (curr.lower < prev.upper) {
                hasOverlap = true;
                break;
            }
        }

        if (hasOverlap) {
            suggestions.push('Potential overlapping ranges detected. Consider refining lower and upper boundaries.');
        }

        const extremeSpread = active.filter(item => (item.upper_range - item.lower_range) > 1000000).length;
        if (extremeSpread > 0) {
            suggestions.push('Large range spreads found. Consider tiered range segmentation for better accuracy.');
        }

        if (!suggestions.length) {
            suggestions.push('Commission configuration looks stable. Continue periodic validation and version checks.');
        }

        this.aiSuggestionList.innerHTML = suggestions.map(text => `
            <div class="py-2 border-b last:border-b-0 text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-lightbulb text-yellow-500 mt-0.5"></i>
                <span>${text}</span>
            </div>
        `).join('');
    }

    updateHealthDashboard() {
        const total = this.data.length;
        const active = this.data.filter(item => item.status !== 'inactive').length;
        const deleted = this.data.filter(item => item.status === 'inactive').length;
        const avgVersion = total ? this.data.reduce((sum, item) => sum + (item.version || 1), 0) / total : 0;
        const quality = total ? Math.max(0, Math.round((active / total) * 100)) : 0;
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
        const headers = [
            'Marketing Name',
            'Comm. Code',
            'Lower Range',
            'Upper Range',
            'Year I',
            'Year II',
            'Year III',
            'Status',
            'Version',
            'Updated At'
        ];

        const rows = this.filteredData.map(item => [
            item.marketing_name,
            item.comm_code,
            this.formatNumber(item.lower_range),
            this.formatNumber(item.upper_range),
            this.formatPercent(item.year_1),
            this.formatPercent(item.year_2),
            this.formatPercent(item.year_3),
            item.status || 'active',
            item.version || 1,
            this.formatDateTime(item.updatedAt)
        ]);

        const csv = [headers, ...rows]
            .map(columns => columns.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `commission-data-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Commission data exported successfully.');
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
        if (!this.messageModal || !this.messageText) {
            alert(message);
            return;
        }

        this.messageText.textContent = message;
        this.messageModal.style.display = 'block';
    }

    hideMessageModal() {
        if (this.messageModal) {
            this.messageModal.style.display = 'none';
        }
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
    try {
        window.commissionManager = new CommissionManager();
    } catch (error) {
        console.error('Failed to initialize CommissionManager:', error);
        alert('Commission page failed to initialize. Please reload the page.');
    }
});
