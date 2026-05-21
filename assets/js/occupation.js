class OccupationManager {
    constructor() {
        this.storageKey = 'gibsysnet_occupation_data';
        this.versionKey = 'gibsysnet_occupation_versions';
        this.codeSourceKey = 'gibsysnet_occupation_code_source';
        this.createApiUrl = 'http://localhost:3001/api/occupations';
        this.listApiUrl = 'http://localhost:3001/api/occupations';
        this.currentPage = 1;
        this.pageSize = 8;
        this.searchTerm = '';
        this.pendingDeleteId = null;
        this.codeCatalog = [];

        this.impactTools = [
            { tool: 'Quotation Engine', impact: 'High', risk: 'Medium' },
            { tool: 'Underwriting Rules', impact: 'High', risk: 'Low' },
            { tool: 'Claims Scoring', impact: 'Medium', risk: 'Medium' },
            { tool: 'Report Generator', impact: 'Medium', risk: 'Low' }
        ];

        this.data = this.loadData();
        this.versions = this.loadVersions();

        this.bindElements();
        this.bindEvents();
        this.initialize();
    }

    bindElements() {
        this.form = document.getElementById('occupationForm');
        this.recordId = document.getElementById('recordId');
        this.occupId = document.getElementById('occupId');
        this.occCode2 = document.getElementById('occCode2');
        this.occCode3 = document.getElementById('occCode3');
        this.occCode46 = document.getElementById('occCode46');
        this.description = document.getElementById('description');
        this.class1Lower = document.getElementById('class1Lower');
        this.class1Upper = document.getElementById('class1Upper');
        this.class2Lower = document.getElementById('class2Lower');
        this.class2Upper = document.getElementById('class2Upper');
        this.class3Lower = document.getElementById('class3Lower');
        this.class3Upper = document.getElementById('class3Upper');

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
        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveRecord();
        });

        this.occCode2?.addEventListener('change', () => {
            this.populateOccCode3Options();
            this.populateOccCode46Options();
        });

        this.occCode3?.addEventListener('change', () => {
            this.populateOccCode46Options();
        });

        this.searchInput?.addEventListener('input', (event) => {
            this.searchTerm = (event.target.value || '').trim().toLowerCase();
            this.currentPage = 1;
            this.renderTable();
        });

        this.prevBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage -= 1;
                this.renderTable();
            }
        });

        this.nextBtn?.addEventListener('click', () => {
            const totalPages = this.getTotalPages();
            if (this.currentPage < totalPages) {
                this.currentPage += 1;
                this.renderTable();
            }
        });

        this.newBtnSidebar?.addEventListener('click', () => this.resetForm());
        this.saveBtnSidebar?.addEventListener('click', () => this.saveRecord());
        this.deleteBtnSidebar?.addEventListener('click', () => this.deleteSelectedRecord());
        this.exportBtnSidebar?.addEventListener('click', () => this.exportCsv());

        this.confirmCancel?.addEventListener('click', () => this.hideConfirmModal());
        this.confirmOk?.addEventListener('click', () => this.confirmDelete());
        this.messageOk?.addEventListener('click', () => this.hideMessageModal());

        document.addEventListener('click', (event) => {
            if (event.target === this.confirmModal) this.hideConfirmModal();
            if (event.target === this.messageModal) this.hideMessageModal();
        });
    }

    async initialize() {
        this.showLoading(true);
        await this.loadOccupationsFromApi();
        this.loadCodeCatalog();
        this.populateOccCode2Options();
        this.populateOccCode3Options();
        this.populateOccCode46Options();
        if (this.occupId) this.occupId.value = String(this.getNextOccupId());
        this.renderImpactTable();
        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
        this.showLoading(false);
    }

    mapApiCodeToDigits(code, fallback) {
        const rawCode = String(code || '').trim();
        const fallbackCode = String(fallback || '').padStart(4, '0');
        const occCode46 = rawCode || fallbackCode;

        const digits = occCode46.replace(/\D/g, '');
        const normalized = (digits || fallbackCode.replace(/\D/g, '')).padStart(3, '0');
        const occCode2 = normalized.slice(0, 2).padEnd(2, '0');
        const occCode3 = normalized.slice(0, 3).padEnd(3, '0');

        return { occCode2, occCode3, occCode46 };
    }

    mapApiOccupation(item, index) {
        const apiId = item?.id;
        const fallbackId = index + 1;
        const occupId = Number(apiId) || fallbackId;
        const codeFromApi = String(item?.occupation_code || '').trim();
        const codeDigits = this.mapApiCodeToDigits(codeFromApi, fallbackId);
        const now = new Date().toISOString();

        return {
            id: String(apiId || this.generateId()),
            occupId,
            occCode2: codeDigits.occCode2,
            occCode3: codeDigits.occCode3,
            occCode46: codeDigits.occCode46,
            description: String(item?.occupation_name || item?.description || '').trim(),
            class1Lower: 0,
            class1Upper: 0,
            class2Lower: 0,
            class2Upper: 0,
            class3Lower: 0,
            class3Upper: 0,
            status: 'active',
            version: 1,
            createdAt: item?.created_at || now,
            updatedAt: item?.created_at || now,
            createdBy: 'API',
            updatedBy: 'API',
            apiOccupationCode: codeFromApi,
            riskLevel: String(item?.risk_level || '').trim()
        };
    }

    async loadOccupationsFromApi() {
        try {
            const response = await fetch(this.listApiUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to load occupations from API (status ${response.status}).`);
            }

            const payload = await response.json();
            const rows = Array.isArray(payload?.data) ? payload.data : [];

            if (!payload?.success) {
                return false;
            }

            this.data = rows.map((item, index) => this.mapApiOccupation(item, index));
            this.saveData();
            return true;
        } catch (error) {
            console.error('Failed to load occupations from API:', error);
            return false;
        }
    }

    resolveApiOccupationId(recordId, localItem) {
        const rawId = String(recordId || '').trim();
        if (/^\d+$/.test(rawId)) return rawId;

        const fromItemId = String(localItem?.id || '').trim();
        if (/^\d+$/.test(fromItemId)) return fromItemId;

        const fromOccupId = String(localItem?.occupId || '').trim();
        if (/^\d+$/.test(fromOccupId)) return fromOccupId;

        return '';
    }

    async loadOccupationByIdFromApi(recordId, localItem) {
        const apiId = this.resolveApiOccupationId(recordId, localItem);
        if (!apiId) return null;

        const response = await fetch(`${this.listApiUrl}/${encodeURIComponent(apiId)}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to load occupation detail (status ${response.status}).`);
        }

        const payload = await response.json();
        if (!payload?.success || !payload?.data) {
            return null;
        }

        const mapped = this.mapApiOccupation(payload.data, Math.max(Number(apiId) - 1, 0));
        return {
            ...localItem,
            ...mapped,
            id: String(localItem?.id || mapped.id),
            occupId: Number(payload?.data?.id || mapped.occupId || localItem?.occupId || 0)
        };
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed) && parsed.length > 0) {
                const normalized = parsed.map((item) => ({
                    ...item,
                    id: String(item.id),
                    occupId: Number(item.occupId || 0),
                    class1Lower: Number(item.class1Lower || 0),
                    class1Upper: Number(item.class1Upper || 0),
                    class2Lower: Number(item.class2Lower || 0),
                    class2Upper: Number(item.class2Upper || 0),
                    class3Lower: Number(item.class3Lower || 0),
                    class3Upper: Number(item.class3Upper || 0)
                }));
                return normalized.map((item, index) => ({
                    ...item,
                    occupId: item.occupId > 0 ? item.occupId : (index + 1)
                }));
            }
        } catch (error) {
            return [];
        }

        const now = new Date().toISOString();
        return [
            {
                id: this.generateId(),
                occupId: 1,
                occCode2: '10',
                occCode3: '101',
                occCode46: '101001',
                description: 'Office Worker',
                class1Lower: 0.2,
                class1Upper: 0.4,
                class2Lower: 0.35,
                class2Upper: 0.6,
                class3Lower: 0.5,
                class3Upper: 0.8,
                status: 'active',
                version: 1,
                createdAt: now,
                updatedAt: now,
                createdBy: this.getCurrentUserName(),
                updatedBy: this.getCurrentUserName()
            }
        ];
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    loadVersions() {
        try {
            const raw = localStorage.getItem(this.versionKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) return parsed;
        } catch (error) {
            return [];
        }
        return [];
    }

    saveVersions() {
        localStorage.setItem(this.versionKey, JSON.stringify(this.versions));
    }

    generateId() {
        return `OCC-${Date.now().toString(36).toUpperCase()}`;
    }

    getNextOccupId() {
        const maxId = this.data.reduce((max, item) => Math.max(max, Number(item.occupId || 0)), 0);
        return maxId + 1;
    }

    loadCodeCatalog() {
        try {
            const raw = localStorage.getItem(this.codeSourceKey);
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
                this.codeCatalog = parsed;
                return;
            }
        } catch (error) {
        }

        const baseFromData = this.data.map((item) => ({
            code2: String(item.occCode2 || '').trim(),
            code3: String(item.occCode3 || '').trim(),
            code46: String(item.occCode46 || '').trim()
        })).filter((item) => item.code2 && item.code3 && item.code46);

        const defaults = [
            { code2: '10', code3: '101', code46: '101001' },
            { code2: '10', code3: '102', code46: '102001' },
            { code2: '20', code3: '201', code46: '201001' },
            { code2: '30', code3: '301', code46: '301001' }
        ];

        const combined = [...baseFromData, ...defaults];
        const seen = new Set();
        this.codeCatalog = combined.filter((item) => {
            const key = `${item.code2}|${item.code3}|${item.code46}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    populateSelectOptions(element, values, placeholder) {
        if (!element) return;
        element.innerHTML = `<option value="">${placeholder}</option>`;
        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            element.appendChild(option);
        });
    }

    populateOccCode2Options(selectedValue = '') {
        const code2Values = [...new Set(this.codeCatalog.map((item) => item.code2))].sort();
        this.populateSelectOptions(this.occCode2, code2Values, 'Select Occup.Code (2 digits)');
        if (selectedValue) this.occCode2.value = selectedValue;
    }

    populateOccCode3Options(selectedValue = '') {
        const code2 = this.occCode2?.value || '';
        const code3Values = [...new Set(
            this.codeCatalog
                .filter((item) => !code2 || item.code2 === code2)
                .map((item) => item.code3)
        )].sort();

        this.populateSelectOptions(this.occCode3, code3Values, 'Select Occup.Code (3 digits)');
        if (selectedValue && code3Values.includes(selectedValue)) this.occCode3.value = selectedValue;
    }

    populateOccCode46Options(selectedValue = '') {
        const code2 = this.occCode2?.value || '';
        const code3 = this.occCode3?.value || '';

        const code46Values = [...new Set(
            this.codeCatalog
                .filter((item) => (!code2 || item.code2 === code2) && (!code3 || item.code3 === code3))
                .map((item) => item.code46)
        )].sort();

        this.populateSelectOptions(this.occCode46, code46Values, 'Select Occup.Code (4-6 digits)');
        if (selectedValue && code46Values.includes(selectedValue)) this.occCode46.value = selectedValue;
    }

    parseNumberInput(element) {
        return Number.parseFloat(element?.value || '0') || 0;
    }

    validateTariffRange(lower, upper) {
        return lower <= upper;
    }

    buildApiOccupationCode(occupId) {
        return `OCC${String(occupId || 0).padStart(4, '0')}`;
    }

    getRiskLevelFromTariff(class1Upper, class2Upper, class3Upper) {
        const maxUpper = Math.max(
            Number(class1Upper || 0),
            Number(class2Upper || 0),
            Number(class3Upper || 0)
        );

        if (maxUpper <= 2) return 'Low';
        if (maxUpper <= 3.5) return 'Medium';
        return 'High';
    }

    buildCreateApiPayload(record) {
        return {
            occupation_code: this.buildApiOccupationCode(record.occupId),
            occupation_name: record.description,
            risk_level: this.getRiskLevelFromTariff(record.class1Upper, record.class2Upper, record.class3Upper),
            description: record.description
        };
    }

    resolveApiOccupationCode(record) {
        const codeFromApi = String(record?.apiOccupationCode || '').trim();
        if (codeFromApi) return codeFromApi;

        const codeFromForm = String(record?.occCode46 || '').trim();
        if (/^OCC/i.test(codeFromForm)) return codeFromForm;

        return this.buildApiOccupationCode(record?.occupId);
    }

    buildUpdateApiPayload(record) {
        return {
            occupation_code: this.resolveApiOccupationCode(record),
            occupation_name: record.description,
            risk_level: this.getRiskLevelFromTariff(record.class1Upper, record.class2Upper, record.class3Upper),
            description: record.description
        };
    }

    async createOccupationToApi(record) {
        const payload = this.buildCreateApiPayload(record);

        const response = await fetch(this.createApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `Failed to create occupation in API (status ${response.status}).`;
            try {
                const errorPayload = await response.json();
                const serverMessage = errorPayload?.message || errorPayload?.error;
                if (serverMessage) errorMessage = serverMessage;
            } catch (_) {
            }
            throw new Error(errorMessage);
        }

        try {
            return await response.json();
        } catch (_) {
            return null;
        }
    }

    async updateOccupationToApi(recordId, record) {
        const payload = this.buildUpdateApiPayload(record);

        const response = await fetch(`${this.listApiUrl}/${encodeURIComponent(recordId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `Failed to update occupation in API (status ${response.status}).`;
            try {
                const errorPayload = await response.json();
                const serverMessage = errorPayload?.message || errorPayload?.error;
                if (serverMessage) errorMessage = serverMessage;
            } catch (_) {
            }
            throw new Error(errorMessage);
        }

        try {
            return await response.json();
        } catch (_) {
            return null;
        }
    }

    async deleteOccupationFromApi(recordId) {
        const response = await fetch(`${this.listApiUrl}/${encodeURIComponent(recordId)}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            let errorMessage = `Failed to delete occupation in API (status ${response.status}).`;
            try {
                const errorPayload = await response.json();
                const serverMessage = errorPayload?.message || errorPayload?.error;
                if (serverMessage) errorMessage = serverMessage;
            } catch (_) {
            }
            throw new Error(errorMessage);
        }

        try {
            return await response.json();
        } catch (_) {
            return null;
        }
    }

    async saveRecord() {
        const id = (this.recordId?.value || '').trim();
        const occCode2 = String(this.occCode2?.value || '').trim();
        const occCode3 = String(this.occCode3?.value || '').trim();
        const occCode46 = String(this.occCode46?.value || '').trim();
        const description = (this.description?.value || '').trim();

        const class1Lower = this.parseNumberInput(this.class1Lower);
        const class1Upper = this.parseNumberInput(this.class1Upper);
        const class2Lower = this.parseNumberInput(this.class2Lower);
        const class2Upper = this.parseNumberInput(this.class2Upper);
        const class3Lower = this.parseNumberInput(this.class3Lower);
        const class3Upper = this.parseNumberInput(this.class3Upper);

        if (!occCode2 || !occCode3 || !occCode46 || !description) {
            this.showMessage('Occupation codes and description are required.');
            return;
        }

        if (!this.validateTariffRange(class1Lower, class1Upper) || !this.validateTariffRange(class2Lower, class2Upper) || !this.validateTariffRange(class3Lower, class3Upper)) {
            this.showMessage('Tariff lower value must be less than or equal to upper value for each construction class.');
            return;
        }

        const duplicate = this.data.find((item) =>
            item.status === 'active' &&
            item.occCode46 === occCode46 &&
            String(item.id) !== String(id)
        );

        if (duplicate) {
            this.showMessage('Occupation code (4-6 digits) already exists.');
            return;
        }

        this.showLoading(true);

        try {
            if (id) {
                const index = this.data.findIndex((item) => String(item.id) === String(id));
                if (index === -1) {
                    this.showMessage('Occupation record not found.');
                    return;
                }

                const existing = this.data[index];
                const updated = {
                    ...existing,
                    occCode2,
                    occCode3,
                    occCode46,
                    description,
                    class1Lower,
                    class1Upper,
                    class2Lower,
                    class2Upper,
                    class3Lower,
                    class3Upper,
                    version: (existing.version || 1) + 1,
                    updatedAt: new Date().toISOString(),
                    updatedBy: this.getCurrentUserName()
                };

                const apiId = this.resolveApiOccupationId(id, existing);
                if (!apiId) {
                    throw new Error('Cannot update API because record ID is not valid. Reload data from API first.');
                }

                const updateResult = await this.updateOccupationToApi(apiId, updated);
                const updatedApiData = updateResult?.data;
                if (updatedApiData) {
                    updated.apiOccupationCode = String(updatedApiData.occupation_code || this.resolveApiOccupationCode(updated));
                    updated.description = String(updatedApiData.occupation_name || updatedApiData.description || updated.description).trim();
                    updated.riskLevel = String(updatedApiData.risk_level || updated.riskLevel || '').trim();
                } else {
                    updated.apiOccupationCode = this.resolveApiOccupationCode(updated);
                }

                this.data[index] = updated;
                this.pushVersion('update', updated);
                this.showMessage('Occupation updated successfully and synced to API.');
            } else {
                const now = new Date().toISOString();
                const record = {
                    id: this.generateId(),
                    occupId: this.getNextOccupId(),
                    occCode2,
                    occCode3,
                    occCode46,
                    description,
                    class1Lower,
                    class1Upper,
                    class2Lower,
                    class2Upper,
                    class3Lower,
                    class3Upper,
                    status: 'active',
                    version: 1,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: this.getCurrentUserName(),
                    updatedBy: this.getCurrentUserName()
                };

                const createResult = await this.createOccupationToApi(record);
                const createdApiData = createResult?.data;

                record.apiOccupationCode = String(createdApiData?.occupation_code || this.resolveApiOccupationCode(record)).trim();
                if (createdApiData?.id !== undefined && createdApiData?.id !== null) {
                    const apiId = String(createdApiData.id).trim();
                    if (apiId) record.id = apiId;
                    const numericId = Number(createdApiData.id);
                    if (!Number.isNaN(numericId) && numericId > 0) {
                        record.occupId = numericId;
                    }
                }

                this.data.unshift(record);
                this.pushVersion('create', record);
                this.showMessage('Occupation saved successfully and synced to API.');
            }

            this.saveData();
            this.saveVersions();
            this.resetForm();
            this.renderTable();
            this.renderGovernancePanels();
            this.updateHealthMetrics();
        } catch (error) {
            this.showMessage(error?.message || 'Failed to save occupation data.');
        } finally {
            this.showLoading(false);
        }
    }

    pushVersion(action, record) {
        this.versions.unshift({
            id: `${record.id}-${Date.now()}`,
            recordId: record.id,
            occCode46: record.occCode46,
            action,
            version: record.version || 1,
            updatedAt: record.updatedAt || new Date().toISOString(),
            updatedBy: this.getCurrentUserName()
        });

        if (this.versions.length > 100) {
            this.versions = this.versions.slice(0, 100);
        }
    }

    deleteSelectedRecord() {
        const id = (this.recordId?.value || '').trim();
        if (!id) {
            this.showMessage('Select an occupation record before deleting.');
            return;
        }

        const item = this.data.find((record) => String(record.id) === String(id) && record.status === 'active');
        if (!item) {
            this.showMessage('Active occupation record not found.');
            return;
        }

        this.pendingDeleteId = id;
        if (this.confirmMessage) {
            this.confirmMessage.textContent = `Are you sure you want to soft delete occupation ${item.occCode46}?`;
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
            this.showMessage('Occupation record not found.');
            return;
        }

        this.showLoading(true);

        try {
            const existing = this.data[index];
            const apiId = this.resolveApiOccupationId(this.pendingDeleteId, existing);
            if (!apiId) {
                throw new Error('Cannot delete API because record ID is not valid. Reload data from API first.');
            }

            await this.deleteOccupationFromApi(apiId);

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
            this.showMessage('Occupation deleted in API and moved to soft delete successfully.');
        } catch (error) {
            this.showMessage(error?.message || 'Failed to delete occupation data.');
        } finally {
            this.showLoading(false);
        }
    }

    restoreRecord(recordId) {
        const index = this.data.findIndex((item) => String(item.id) === String(recordId) && item.status === 'inactive');
        if (index === -1) {
            this.showMessage('Soft deleted record not found.');
            return;
        }

        const existing = this.data[index];
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
        this.showMessage(`Occupation ${this.data[index].occCode46} restored successfully.`);
    }

    resetForm() {
        this.form?.reset();
        if (this.recordId) this.recordId.value = '';
        if (this.occupId) this.occupId.value = String(this.getNextOccupId());
        this.populateOccCode2Options();
        this.populateOccCode3Options();
        this.populateOccCode46Options();
        this.renderTable();
    }

    async editRecord(recordId) {
        const index = this.data.findIndex((record) => String(record.id) === String(recordId) && record.status === 'active');
        if (index === -1) {
            this.showMessage('Occupation record not found.');
            return;
        }

        let item = this.data[index];
        this.showLoading(true);

        try {
            const apiDetail = await this.loadOccupationByIdFromApi(recordId, item);
            if (apiDetail) {
                item = apiDetail;
                this.data[index] = item;
                this.saveData();
            }
        } catch (error) {
            console.error('Failed to load occupation detail from API:', error);
        } finally {
            this.showLoading(false);
        }

        if (this.recordId) this.recordId.value = item.id;
        if (this.occupId) this.occupId.value = String(item.occupId || '');
        this.populateOccCode2Options(item.occCode2);
        this.populateOccCode3Options(item.occCode3);
        this.populateOccCode46Options(item.occCode46);
        if (this.description) this.description.value = item.description;
        if (this.class1Lower) this.class1Lower.value = item.class1Lower;
        if (this.class1Upper) this.class1Upper.value = item.class1Upper;
        if (this.class2Lower) this.class2Lower.value = item.class2Lower;
        if (this.class2Upper) this.class2Upper.value = item.class2Upper;
        if (this.class3Lower) this.class3Lower.value = item.class3Lower;
        if (this.class3Upper) this.class3Upper.value = item.class3Upper;

        this.renderTable();
    }

    getFilteredActiveData() {
        return this.data
            .filter((item) => item.status === 'active')
            .filter((item) => {
                if (!this.searchTerm) return true;
                const bucket = [
                    item.occCode2,
                    item.occCode3,
                    item.occCode46,
                    item.description,
                    `${item.class1Lower}-${item.class1Upper}`,
                    `${item.class2Lower}-${item.class2Upper}`,
                    `${item.class3Lower}-${item.class3Upper}`
                ].join(' ').toLowerCase();
                return bucket.includes(this.searchTerm);
            });
    }

    getTotalPages() {
        const total = this.getFilteredActiveData().length;
        return Math.max(1, Math.ceil(total / this.pageSize));
    }

    formatRange(lower, upper) {
        return `${Number(lower).toFixed(3)} - ${Number(upper).toFixed(3)}`;
    }

    renderTable() {
        if (!this.tableBody) return;

        const filtered = this.getFilteredActiveData();
        const totalPages = this.getTotalPages();
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const start = (this.currentPage - 1) * this.pageSize;
        const pageItems = filtered.slice(start, start + this.pageSize);
        const activeId = String(this.recordId?.value || '');

        if (pageItems.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="px-4 py-6 text-center text-gray-500">No occupation data available</td>
                </tr>
            `;
        } else {
            this.tableBody.innerHTML = pageItems.map((item, index) => `
                <tr class="hover:bg-gray-50 ${activeId && activeId === String(item.id) ? 'partner-row-active' : ''}" data-row-id="${item.id}">
                    <td class="px-4 py-3 text-sm text-gray-700 text-center">${start + index + 1}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.occCode2)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.occCode3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700 font-medium">${this.escapeHtml(item.occCode46)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.description)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${Number(item.class1Lower).toFixed(3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${Number(item.class1Upper).toFixed(3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${Number(item.class2Lower).toFixed(3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${Number(item.class2Upper).toFixed(3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${Number(item.class3Lower).toFixed(3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${Number(item.class3Upper).toFixed(3)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">
                        <button type="button" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-action="edit" data-id="${item.id}"><i class="fas fa-pen mr-1"></i>Edit</button>
                    </td>
                </tr>
            `).join('');
        }

        this.tableBody.querySelectorAll('tr[data-row-id]').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target instanceof HTMLElement && event.target.closest('[data-action="edit"]')) return;
                this.editRecord(row.getAttribute('data-row-id'));
            });
        });

        this.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.editRecord(button.getAttribute('data-id'));
            });
        });

        if (this.rowCount) this.rowCount.textContent = String(filtered.length);
        if (this.pageInfo) this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        if (this.prevBtn) this.prevBtn.disabled = this.currentPage <= 1;
        if (this.nextBtn) this.nextBtn.disabled = this.currentPage >= totalPages;
    }

    renderImpactTable() {
        if (!this.impactTableBody) return;

        this.impactTableBody.innerHTML = this.impactTools.map((item) => `
            <tr class="border-t">
                <td class="py-2 text-gray-700">${item.tool}</td>
                <td class="py-2"><span class="px-2 py-1 rounded-full text-xs font-medium ${this.getImpactBadgeClass(item.impact)}">${item.impact}</span></td>
                <td class="py-2"><span class="px-2 py-1 rounded-full text-xs font-medium ${this.getRiskBadgeClass(item.risk)}">${item.risk}</span></td>
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

        this.versionList.innerHTML = this.versions.slice(0, 5).map((item) => `
            <div class="border rounded-lg p-3 mb-2 bg-gray-50">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-semibold uppercase text-blue-700">${item.action}</span>
                    <span class="text-xs text-gray-500">v${item.version}</span>
                </div>
                <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.occCode46)}</p>
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
                        <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.occCode46)} - ${this.escapeHtml(item.description)}</p>
                        <p class="text-xs text-gray-500">Deleted: ${this.formatDate(item.deletedAt || item.updatedAt)}</p>
                    </div>
                    <button class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200" data-action="restore" data-id="${item.id}">
                        <i class="fas fa-rotate-left mr-1"></i>Restore
                    </button>
                </div>
            </div>
        `).join('');

        this.softDeleteList.querySelectorAll('button[data-action="restore"]').forEach((button) => {
            button.addEventListener('click', () => this.restoreRecord(button.getAttribute('data-id')));
        });
    }

    renderDependencyList() {
        if (!this.dependencyList) return;

        const active = this.data.filter((item) => item.status === 'active');
        const cards = active.slice(0, 5).map((item) => {
            const usage = this.getDependencyUsage(item);
            return `
                <div class="border rounded-lg p-3 mb-2 bg-purple-50">
                    <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.occCode46)}</p>
                    <p class="text-xs text-gray-600">Connected modules: ${usage}</p>
                </div>
            `;
        });

        this.dependencyList.innerHTML = cards.length > 0
            ? cards.join('')
            : '<p class="text-sm text-gray-500">No dependency data available.</p>';
    }

    getDependencyUsage(item) {
        const spread = (item.class3Upper || 0) - (item.class1Lower || 0);
        if (spread > 0.8) return 4;
        if (spread > 0.4) return 3;
        return 2;
    }

    renderAiSuggestionList() {
        if (!this.aiSuggestionList) return;

        const active = this.data.filter((item) => item.status === 'active');
        const deleted = this.data.filter((item) => item.status === 'inactive');

        const invalidRanges = active.filter((item) =>
            item.class1Lower > item.class1Upper ||
            item.class2Lower > item.class2Upper ||
            item.class3Lower > item.class3Upper
        ).length;

        const suggestions = [
            `Maintain complete occupation code hierarchy (2/3/4-6 digits). Current active data: ${active.length}.`,
            deleted.length > 0
                ? `There are ${deleted.length} soft deleted occupations. Review and restore if still applicable.`
                : 'Soft delete queue is clean. Data lifecycle governance is healthy.',
            invalidRanges > 0
                ? `${invalidRanges} records have invalid tariff ranges. Review lower/upper values.`
                : 'All active tariff ranges are valid across construction classes.'
        ];

        this.aiSuggestionList.innerHTML = `
            <ul class="space-y-2 text-sm text-gray-700">
                ${suggestions.map((item) => `<li class="flex items-start"><i class="fas fa-lightbulb text-amber-500 mt-1 mr-2"></i><span>${item}</span></li>`).join('')}
            </ul>
        `;
    }

    updateHealthMetrics() {
        const active = this.data.filter((item) => item.status === 'active');
        const deleted = this.data.filter((item) => item.status === 'inactive');

        const dependencyHealth = active.length === 0 ? 0 : Math.min(100, Math.round((active.filter((item) => this.getDependencyUsage(item) >= 3).length / active.length) * 100));
        const quality = active.length === 0 ? 0 : Math.round((active.filter((item) => item.occCode2 && item.occCode3 && item.occCode46 && item.description).length / active.length) * 100);

        if (this.metricImpact) this.metricImpact.textContent = String(this.impactTools.filter((item) => item.impact === 'High').length);
        if (this.metricVersions) this.metricVersions.textContent = String(this.versions.length);
        if (this.metricSoftDelete) this.metricSoftDelete.textContent = String(deleted.length);
        if (this.metricDependency) this.metricDependency.textContent = `${dependencyHealth}%`;
        if (this.metricQuality) this.metricQuality.textContent = `${quality}%`;
    }

    exportCsv() {
        const active = this.data.filter((item) => item.status === 'active');
        if (active.length === 0) {
            this.showMessage('No active occupation data to export.');
            return;
        }

        const headers = [
            'Occupation Code (2)',
            'Occupation Code (3)',
            'Occupation Code (4-6)',
            'Description',
            'Class1 Lower',
            'Class1 Upper',
            'Class2 Lower',
            'Class2 Upper',
            'Class3 Lower',
            'Class3 Upper',
            'Version',
            'Updated At'
        ];

        const rows = active.map((item) => [
            item.occCode2,
            item.occCode3,
            item.occCode46,
            item.description,
            item.class1Lower,
            item.class1Upper,
            item.class2Lower,
            item.class2Upper,
            item.class3Lower,
            item.class3Upper,
            item.version || 1,
            this.formatDate(item.updatedAt)
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `occupation-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Occupation data exported successfully.');
    }

    showConfirmModal() {
        if (this.confirmModal) this.confirmModal.style.display = 'block';
    }

    hideConfirmModal() {
        if (this.confirmModal) this.confirmModal.style.display = 'none';
    }

    showMessage(message) {
        if (this.messageText) this.messageText.textContent = message;
        if (this.messageModal) this.messageModal.style.display = 'block';
    }

    hideMessageModal() {
        if (this.messageModal) this.messageModal.style.display = 'none';
    }

    showLoading(show) {
        if (!this.loadingIndicator) return;
        this.loadingIndicator.classList.toggle('hidden', !show);
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
    window.occupationManager = new OccupationManager();
});
