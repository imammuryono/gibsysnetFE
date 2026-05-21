class TargetManager {
    constructor() {
        this.storageKey = 'gibsysnet_target_data';
        this.versionKey = 'gibsysnet_target_versions';
        this.cobLookupKey = 'cob_products_v2';
        this.cobProductsEndpointCandidates = this.getCobProductsEndpointCandidates();
        this.pageSize = 8;
        this.currentPage = 1;
        this.searchTerm = '';
        this.currentDeleteId = null;
        this.cobOptions = [];

        this.targets = this.loadTargets();
        this.versions = this.loadVersions();

        this.initializeElements();
        this.initializeCobLookup();
        this.bindEvents();
        this.renderAll();
    }

    initializeElements() {
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.form = document.getElementById('targetForm');
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

        this.recordId = document.getElementById('recordId');
        this.targetID = document.getElementById('targetID');
        this.cob = document.getElementById('cob');
        this.premium = document.getElementById('premium');
        this.brokerage = document.getElementById('brokerage');

        this.metricImpact = document.getElementById('metricImpact');
        this.metricVersions = document.getElementById('metricVersions');
        this.metricSoftDelete = document.getElementById('metricSoftDelete');
        this.metricDependency = document.getElementById('metricDependency');
        this.metricQuality = document.getElementById('metricQuality');

        this.impactTableBody = document.getElementById('impactTableBody');
        this.versionList = document.getElementById('versionList');
        this.softDeleteList = document.getElementById('softDeleteList');
        this.dependencyList = document.getElementById('dependencyList');
        this.aiSuggestionList = document.getElementById('aiSuggestionList');
    }

    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.saveTarget();
            });
        }

        if (this.cob) {
            this.cob.addEventListener('change', () => {
                this.generateTargetIdForCurrentCob();
            });
        }

        if (this.newBtnSidebar) this.newBtnSidebar.addEventListener('click', () => this.resetForm());
        if (this.saveBtnSidebar) this.saveBtnSidebar.addEventListener('click', () => this.saveTarget());
        if (this.deleteBtnSidebar) this.deleteBtnSidebar.addEventListener('click', () => this.promptDeleteFromForm());
        if (this.exportBtnSidebar) this.exportBtnSidebar.addEventListener('click', () => this.exportData());

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

        if (this.confirmCancel) this.confirmCancel.addEventListener('click', () => this.hideConfirm());
        if (this.confirmOk) {
            this.confirmOk.addEventListener('click', () => {
                if (!this.currentDeleteId) {
                    this.hideConfirm();
                    return;
                }
                this.softDeleteTarget(this.currentDeleteId);
                this.currentDeleteId = null;
                this.hideConfirm();
            });
        }

        if (this.messageOk) this.messageOk.addEventListener('click', () => this.hideMessage());

        if (this.confirmModal) {
            this.confirmModal.addEventListener('click', (event) => {
                if (event.target === this.confirmModal) this.hideConfirm();
            });
        }

        if (this.messageModal) {
            this.messageModal.addEventListener('click', (event) => {
                if (event.target === this.messageModal) this.hideMessage();
            });
        }
    }

    loadTargets() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    }

    loadVersions() {
        try {
            const data = localStorage.getItem(this.versionKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    }

    persistTargets() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.targets));
    }

    persistVersions() {
        localStorage.setItem(this.versionKey, JSON.stringify(this.versions));
    }

    showLoading(show) {
        if (!this.loadingIndicator) return;
        this.loadingIndicator.classList.toggle('hidden', !show);
    }

    generateRecordId() {
        return `TGT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    getCobProductsEndpointCandidates() {
        const fromWindowConfig = String(window?.GIBSYSNET_API?.COB_PRODUCTS_ENDPOINT || '').trim();
        const candidates = [fromWindowConfig].filter(Boolean);

        return Array.from(new Set(candidates));
    }

    parseStorageArray(key) {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    normalizeCobProducts(rows = []) {
        if (!Array.isArray(rows)) return [];

        const normalizedRows = rows
            .map((item) => {
                if (!item || typeof item !== 'object') return null;

                const status = String(item.status ?? item.record_status ?? '').trim().toLowerCase();
                if (status === 'inactive') return null;

                const cobValue = String(
                    item.cob_name
                    ?? item.cob
                    ?? item.cob_code
                    ?? item.cob_id
                    ?? ''
                ).trim();

                if (!cobValue) return null;
                return { cob: cobValue };
            })
            .filter(Boolean);

        const seen = new Set();
        return normalizedRows.filter((item) => {
            if (seen.has(item.cob)) return false;
            seen.add(item.cob);
            return true;
        });
    }

    getCobRowsFromApiPayload(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        return [];
    }

    async fetchCobProductsFromDatabase() {
        for (const endpoint of this.cobProductsEndpointCandidates) {
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json'
                    },
                    cache: 'no-store'
                });

                if (!response.ok) continue;

                const payload = await response.json();
                const rows = this.getCobRowsFromApiPayload(payload);
                return this.normalizeCobProducts(rows);
            } catch (error) {
                // Continue to next candidate endpoint.
            }
        }

        return null;
    }

    initializeCobLookup() {
        const localRows = this.parseStorageArray(this.cobLookupKey);
        this.cobOptions = this.normalizeCobProducts(localRows);

        this.populateCobDropdown();
        this.refreshCobLookupFromDatabase();
    }

    async refreshCobLookupFromDatabase() {
        const selectedCob = this.cob?.value || '';
        const dbRows = await this.fetchCobProductsFromDatabase();
        if (!dbRows || !dbRows.length) return;

        this.cobOptions = dbRows;
        this.populateCobDropdown(selectedCob);
        this.generateTargetIdForCurrentCob();
    }

    populateCobDropdown(selectedCob = '') {
        if (!this.cob) return;

        const selected = String(selectedCob || '').trim();
        let html = '<option value="">Select COB</option>';

        this.cobOptions.forEach((item) => {
            const value = item.cob;
            const isSelected = selected && value === selected;
            html += `<option value="${this.escapeHtml(value)}"${isSelected ? ' selected' : ''}>${this.escapeHtml(value)}</option>`;
        });

        this.cob.innerHTML = html;

        if (selected && !this.cobOptions.some((item) => item.cob === selected)) {
            const option = document.createElement('option');
            option.value = selected;
            option.textContent = selected;
            option.selected = true;
            this.cob.appendChild(option);
        }
    }

    getCobPrefix(cobName) {
        const cleaned = String(cobName || '').toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').trim();
        if (!cleaned) return 'TGT';

        const parts = cleaned.split(/\s+/).filter(Boolean);
        if (!parts.length) return 'TGT';
        if (parts.length === 1) return parts[0].slice(0, 3) || 'TGT';

        return parts.map((part) => part[0]).join('').slice(0, 4) || 'TGT';
    }

    generateTargetIdByCob(cobName, excludeRecordId = null) {
        const prefix = this.getCobPrefix(cobName);

        const maxSequence = this.targets.reduce((max, target) => {
            if (target.status === 'inactive') return max;
            if (excludeRecordId && target.id === excludeRecordId) return max;

            const targetCode = String(target.targetID || '').trim();
            if (!targetCode.startsWith(`${prefix}-`)) return max;

            const parts = targetCode.split('-');
            const sequence = Number(parts[parts.length - 1]);
            if (!Number.isFinite(sequence)) return max;
            return Math.max(max, sequence);
        }, 0);

        return `${prefix}-${String(maxSequence + 1).padStart(4, '0')}`;
    }

    generateTargetIdForCurrentCob() {
        const recordId = (this.recordId?.value || '').trim();
        if (recordId) return;

        const cobName = (this.cob?.value || '').trim();
        if (!cobName) {
            if (this.targetID) this.targetID.value = '';
            return;
        }

        if (this.targetID) {
            this.targetID.value = this.generateTargetIdByCob(cobName);
        }
    }

    isDuplicateTargetID(targetID, excludeId = null) {
        const normalized = (targetID || '').trim().toLowerCase();
        return this.targets.some(target => (
            target.status !== 'inactive' &&
            target.id !== excludeId &&
            (target.targetID || '').trim().toLowerCase() === normalized
        ));
    }

    validateForm() {
        const cob = (this.cob?.value || '').trim();
        const recordId = (this.recordId?.value || '').trim() || null;
        let targetID = (this.targetID?.value || '').trim();
        const premium = parseFloat(this.premium?.value || '0');
        const brokerage = parseFloat(this.brokerage?.value || '0');

        if (!cob) {
            this.showMessage('COB is required.');
            return null;
        }

        if (!targetID) {
            targetID = this.generateTargetIdByCob(cob, recordId);
            if (this.targetID) this.targetID.value = targetID;
        }

        if (Number.isNaN(premium) || Number.isNaN(brokerage) || premium < 0 || brokerage < 0) {
            this.showMessage('Premium and Brokerage must be valid positive numbers.');
            return null;
        }

        if (this.isDuplicateTargetID(targetID, recordId)) {
            this.showMessage('Target ID already exists. Please use a unique Target ID.');
            return null;
        }

        return {
            id: recordId,
            targetID,
            cob,
            premium,
            brokerage
        };
    }

    saveTarget() {
        const data = this.validateForm();
        if (!data) return;

        this.showLoading(true);

        const now = new Date().toISOString();
        const isEdit = !!data.id;

        if (isEdit) {
            const index = this.targets.findIndex(target => target.id === data.id);
            if (index === -1) {
                this.showLoading(false);
                this.showMessage('Target record not found.');
                return;
            }

            const previous = this.targets[index];
            const updated = {
                ...previous,
                targetID: data.targetID,
                cob: data.cob,
                premium: data.premium,
                brokerage: data.brokerage,
                updatedAt: now,
                status: 'active'
            };

            this.targets[index] = updated;
            this.addVersionLog('UPDATE', updated, previous);
            this.showMessage('Target updated successfully.');
        } else {
            const created = {
                id: this.generateRecordId(),
                targetID: data.targetID,
                cob: data.cob,
                premium: data.premium,
                brokerage: data.brokerage,
                createdAt: now,
                updatedAt: now,
                status: 'active'
            };

            this.targets.unshift(created);
            this.addVersionLog('CREATE', created);
            this.showMessage('Target saved successfully.');
        }

        this.persistTargets();
        this.persistVersions();
        this.resetForm();
        this.renderAll();
        this.showLoading(false);
    }

    promptDeleteFromForm() {
        const id = (this.recordId?.value || '').trim();
        if (!id) {
            this.showMessage('Select a target from the list first.');
            return;
        }
        this.confirmDelete(id);
    }

    confirmDelete(id) {
        this.currentDeleteId = id;
        if (this.confirmMessage) {
            this.confirmMessage.textContent = 'Are you sure you want to soft delete this target record?';
        }
        this.showConfirm();
    }

    softDeleteTarget(id) {
        const index = this.targets.findIndex(target => target.id === id);
        if (index === -1) {
            this.showMessage('Target record not found.');
            return;
        }

        const previous = { ...this.targets[index] };
        this.targets[index].status = 'inactive';
        this.targets[index].updatedAt = new Date().toISOString();

        this.addVersionLog('SOFT_DELETE', this.targets[index], previous);
        this.persistTargets();
        this.persistVersions();

        const currentId = (this.recordId?.value || '').trim();
        if (currentId === id) this.resetForm();

        this.renderAll();
        this.showMessage('Target moved to soft delete list.');
    }

    restoreTarget(id) {
        const index = this.targets.findIndex(target => target.id === id);
        if (index === -1) return;

        const previous = { ...this.targets[index] };
        this.targets[index].status = 'active';
        this.targets[index].updatedAt = new Date().toISOString();

        this.addVersionLog('RESTORE', this.targets[index], previous);
        this.persistTargets();
        this.persistVersions();

        this.renderAll();
        this.showMessage('Target restored successfully.');
    }

    addVersionLog(action, record, previous = null) {
        const log = {
            id: `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            action,
            timestamp: new Date().toISOString(),
            targetId: record.id,
            targetCode: record.targetID,
            after: {
                targetID: record.targetID,
                cob: record.cob,
                premium: record.premium,
                brokerage: record.brokerage,
                status: record.status
            },
            before: previous
                ? {
                    targetID: previous.targetID,
                    cob: previous.cob,
                    premium: previous.premium,
                    brokerage: previous.brokerage,
                    status: previous.status
                }
                : null
        };

        this.versions.unshift(log);
        if (this.versions.length > 200) {
            this.versions = this.versions.slice(0, 200);
        }
    }

    getFilteredTargets() {
        const activeTargets = this.targets.filter(target => target.status !== 'inactive');
        if (!this.searchTerm) return activeTargets;

        return activeTargets.filter(target => {
            const joined = [
                target.targetID,
                target.cob,
                target.premium,
                target.brokerage
            ].join(' ').toLowerCase();
            return joined.includes(this.searchTerm);
        });
    }

    getTotalPages() {
        const totalRows = this.getFilteredTargets().length;
        return Math.max(1, Math.ceil(totalRows / this.pageSize));
    }

    renderTable() {
        if (!this.tableBody) return;

        const filtered = this.getFilteredTargets();
        const totalPages = this.getTotalPages();

        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const pageRows = filtered.slice(startIndex, startIndex + this.pageSize);

        if (!pageRows.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-6 text-center text-gray-500">No target data found.</td>
                </tr>
            `;
        } else {
            this.tableBody.innerHTML = pageRows.map(target => {
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">${this.escapeHtml(target.targetID)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(target.cob)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.formatNumber(target.premium)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.formatNumber(target.brokerage)}</td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex items-center gap-2">
                                <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-action="edit" data-id="${target.id}"><i class="fas fa-pen mr-1"></i>Edit</button>
                                <button class="text-red-600 hover:text-red-800" data-action="delete" data-id="${target.id}" title="Soft Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        this.tableBody.querySelectorAll('button[data-action="edit"]').forEach(button => {
            button.addEventListener('click', () => this.editTarget(button.getAttribute('data-id')));
        });

        this.tableBody.querySelectorAll('button[data-action="delete"]').forEach(button => {
            button.addEventListener('click', () => this.confirmDelete(button.getAttribute('data-id')));
        });

        if (this.rowCount) this.rowCount.textContent = String(filtered.length);
        if (this.pageInfo) this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

        if (this.prevBtn) this.prevBtn.disabled = this.currentPage <= 1;
        if (this.nextBtn) this.nextBtn.disabled = this.currentPage >= totalPages;
    }

    editTarget(id) {
        const record = this.targets.find(target => target.id === id && target.status !== 'inactive');
        if (!record) {
            this.showMessage('Target record not found.');
            return;
        }

        this.populateCobDropdown(record.cob || '');
        if (this.recordId) this.recordId.value = record.id;
        if (this.targetID) this.targetID.value = record.targetID || '';
        if (this.cob) this.cob.value = record.cob || '';
        if (this.premium) this.premium.value = record.premium ?? '';
        if (this.brokerage) this.brokerage.value = record.brokerage ?? '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetForm() {
        if (this.form) this.form.reset();
        if (this.recordId) this.recordId.value = '';
        if (this.targetID) this.targetID.value = '';
        this.populateCobDropdown();
    }

    renderImpactAnalysis() {
        if (!this.impactTableBody) return;

        const activeCount = this.targets.filter(target => target.status !== 'inactive').length;
        const deletedCount = this.targets.filter(target => target.status === 'inactive').length;

        const items = [
            { tool: 'Target Engine', impact: `${Math.min(100, activeCount * 7)}%`, risk: activeCount > 20 ? 'High' : 'Medium' },
            { tool: 'Premium Control', impact: `${Math.min(100, activeCount * 5)}%`, risk: 'Medium' },
            { tool: 'Brokerage Rules', impact: `${Math.min(100, activeCount * 4)}%`, risk: deletedCount > 10 ? 'Medium' : 'Low' }
        ];

        this.impactTableBody.innerHTML = items.map(item => {
            const riskClass = item.risk === 'High'
                ? 'text-red-600'
                : item.risk === 'Medium'
                    ? 'text-amber-600'
                    : 'text-green-600';

            return `
                <tr class="border-t">
                    <td class="py-2 text-gray-700">${item.tool}</td>
                    <td class="py-2 font-semibold text-gray-800">${item.impact}</td>
                    <td class="py-2 font-semibold ${riskClass}">${item.risk}</td>
                </tr>
            `;
        }).join('');
    }

    renderVersioning() {
        if (!this.versionList) return;

        if (!this.versions.length) {
            this.versionList.innerHTML = '<p class="text-sm text-gray-500">No version logs available.</p>';
            return;
        }

        const rows = this.versions.slice(0, 6);
        this.versionList.innerHTML = rows.map(row => {
            return `
                <div class="border rounded-lg p-3 mb-2 bg-gray-50">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-semibold text-blue-700">${row.action}</span>
                        <span class="text-xs text-gray-500">${this.formatDateTime(row.timestamp)}</span>
                    </div>
                    <p class="text-sm text-gray-700">${this.escapeHtml(row.targetCode || '-')}</p>
                </div>
            `;
        }).join('');
    }

    renderSoftDeleteList() {
        if (!this.softDeleteList) return;

        const deletedRows = this.targets.filter(target => target.status === 'inactive');

        if (!deletedRows.length) {
            this.softDeleteList.innerHTML = '<p class="text-sm text-gray-500">No soft deleted records.</p>';
            return;
        }

        this.softDeleteList.innerHTML = deletedRows.slice(0, 6).map(row => {
            return `
                <div class="border rounded-lg p-3 mb-2 bg-red-50 border-red-100">
                    <div class="flex justify-between items-center gap-2">
                        <div>
                            <p class="text-sm font-semibold text-red-700">${this.escapeHtml(row.targetID)}</p>
                            <p class="text-xs text-gray-600">${this.escapeHtml(row.cob)}</p>
                        </div>
                        <button class="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700" data-action="restore" data-id="${row.id}">Restore</button>
                    </div>
                </div>
            `;
        }).join('');

        this.softDeleteList.querySelectorAll('button[data-action="restore"]').forEach(button => {
            button.addEventListener('click', () => this.restoreTarget(button.getAttribute('data-id')));
        });
    }

    renderDependencyControl() {
        if (!this.dependencyList) return;

        const activeTargets = this.targets.filter(target => target.status !== 'inactive');
        const uniqueCob = new Set(activeTargets.map(target => (target.cob || '').trim().toLowerCase()).filter(Boolean)).size;
        const dependencyScore = activeTargets.length
            ? Math.round((uniqueCob / activeTargets.length) * 100)
            : 100;

        this.dependencyList.innerHTML = `
            <div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-600">Active Targets</span><span class="font-semibold text-gray-800">${activeTargets.length}</span></div>
                <div class="flex justify-between"><span class="text-gray-600">COB Diversity</span><span class="font-semibold text-gray-800">${uniqueCob}</span></div>
                <div class="flex justify-between"><span class="text-gray-600">Dependency Score</span><span class="font-semibold text-gray-800">${dependencyScore}%</span></div>
            </div>
        `;
    }

    renderAISuggestions() {
        if (!this.aiSuggestionList) return;

        const activeTargets = this.targets.filter(target => target.status !== 'inactive');
        const suggestions = [];

        if (!activeTargets.length) {
            suggestions.push('Create your first production target to activate automated recommendation insights.');
        }

        const highPremium = activeTargets.filter(target => Number(target.premium) > 100000000).length;
        if (highPremium > 0) {
            suggestions.push(`${highPremium} targets have premium above 100,000,000. Consider adding review checkpoints.`);
        }

        const lowBrokerage = activeTargets.filter(target => Number(target.brokerage) < 1).length;
        if (lowBrokerage > 0) {
            suggestions.push(`${lowBrokerage} targets have brokerage below 1%. Validate brokerage policy consistency.`);
        }

        if (!suggestions.length) {
            suggestions.push('Data pattern is healthy. Keep monitoring updates to preserve governance quality.');
        }

        this.aiSuggestionList.innerHTML = `
            <ul class="space-y-2 text-sm text-gray-700">
                ${suggestions.map(text => `<li class="flex items-start gap-2"><i class="fas fa-lightbulb text-amber-500 mt-0.5"></i><span>${this.escapeHtml(text)}</span></li>`).join('')}
            </ul>
        `;
    }

    updateHealthMetrics() {
        const activeTargets = this.targets.filter(target => target.status !== 'inactive');
        const deletedTargets = this.targets.filter(target => target.status === 'inactive');
        const impact = Math.min(100, activeTargets.length * 6);
        const uniqueCobCount = new Set(
            activeTargets.map(target => (target.cob || '').trim().toLowerCase()).filter(Boolean)
        ).size;
        const dependency = activeTargets.length
            ? Math.round((uniqueCobCount / activeTargets.length) * 100)
            : 100;

        const validRows = activeTargets.filter(target => {
            return target.targetID && target.cob && Number(target.premium) >= 0 && Number(target.brokerage) >= 0;
        }).length;
        const quality = activeTargets.length ? Math.round((validRows / activeTargets.length) * 100) : 100;

        if (this.metricImpact) this.metricImpact.textContent = String(impact);
        if (this.metricVersions) this.metricVersions.textContent = String(this.versions.length);
        if (this.metricSoftDelete) this.metricSoftDelete.textContent = String(deletedTargets.length);
        if (this.metricDependency) this.metricDependency.textContent = `${dependency}%`;
        if (this.metricQuality) this.metricQuality.textContent = `${quality}%`;
    }

    renderAll() {
        this.renderTable();
        this.renderImpactAnalysis();
        this.renderVersioning();
        this.renderSoftDeleteList();
        this.renderDependencyControl();
        this.renderAISuggestions();
        this.updateHealthMetrics();
    }

    exportData() {
        const rows = this.targets.map(target => ({
            targetID: target.targetID,
            cob: target.cob,
            premium: target.premium,
            brokerage: target.brokerage,
            status: target.status || 'active',
            updatedAt: target.updatedAt || ''
        }));

        if (!rows.length) {
            this.showMessage('No data available to export.');
            return;
        }

        const header = ['Target ID', 'COB', 'Premium', 'Brokerage', 'Status', 'Updated At'];
        const csvRows = [header.join(',')].concat(rows.map(row => {
            return [
                this.toCsvValue(row.targetID),
                this.toCsvValue(row.cob),
                this.toCsvValue(row.premium),
                this.toCsvValue(row.brokerage),
                this.toCsvValue(row.status),
                this.toCsvValue(row.updatedAt)
            ].join(',');
        }));

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `production-target-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Target data exported successfully.');
    }

    toCsvValue(value) {
        const text = String(value ?? '');
        return `"${text.replace(/"/g, '""')}"`;
    }

    formatNumber(value) {
        const num = Number(value || 0);
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatDateTime(value) {
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

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    showConfirm() {
        if (!this.confirmModal) return;
        this.confirmModal.style.display = 'flex';
    }

    hideConfirm() {
        if (!this.confirmModal) return;
        this.confirmModal.style.display = 'none';
    }

    showMessage(message) {
        if (!this.messageModal || !this.messageText) {
            alert(message);
            return;
        }
        this.messageText.textContent = message;
        this.messageModal.style.display = 'flex';
    }

    hideMessage() {
        if (!this.messageModal) return;
        this.messageModal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.targetManager = new TargetManager();
});
