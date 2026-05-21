class ObjectGroupManager {
    constructor() {
        this.storageKey = 'gibsysnet_object_group_data';
        this.versionKey = 'gibsysnet_object_group_versions';
        this.currentPage = 1;
        this.pageSize = 8;
        this.searchTerm = '';
        this.pendingDeleteId = null;

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

        this.impactTools = [
            { tool: 'Quotation Engine', impact: 'High', risk: 'Medium' },
            { tool: 'Coverage Mapper', impact: 'High', risk: 'Low' },
            { tool: 'Policy Issuance', impact: 'Medium', risk: 'Low' },
            { tool: 'Report Generator', impact: 'Medium', risk: 'Low' }
        ];

        this.data = this.loadData();
        this.versions = this.loadVersions();

        this.bindElements();
        this.bindEvents();
        this.initialize();
    }

    bindElements() {
        this.form = document.getElementById('objectGroupForm');
        this.recordId = document.getElementById('recordId');
        this.type = document.getElementById('type');
        this.cob = document.getElementById('cob');
        this.subCob = document.getElementById('subCob');
        this.objectGroupIdDisplay = document.getElementById('objectGroupIdDisplay');
        this.objectGroupName = document.getElementById('objectGroupName');
        this.objectGroupNameEng = document.getElementById('objectGroupNameEng');
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
        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveRecord();
        });

        this.type?.addEventListener('change', () => {
            this.populateCobOptions();
            this.populateSubCobOptions();
            this.updateGeneratedIdPreview();
        });

        this.cob?.addEventListener('change', () => {
            this.populateSubCobOptions();
            this.updateGeneratedIdPreview();
        });

        this.subCob?.addEventListener('change', () => this.updateGeneratedIdPreview());

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

    initialize() {
        this.showLoading(true);
        this.populateCobOptions();
        this.populateSubCobOptions();
        this.updateGeneratedIdPreview();
        this.renderImpactTable();
        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
        this.showLoading(false);
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item) => ({ ...item, id: String(item.id) }));
            }
        } catch (error) {
            return [];
        }

        return [
            {
                id: this.generateId(),
                object_group_id: 'OBJ-GI-PROP-FIR-001',
                type: 'GI',
                cob: 'PROP',
                sub_cob: 'Fire Insurance',
                object_group_name: 'Property Building',
                object_group_name_eng: 'Property Building',
                note: 'Default sample object group',
                status: 'active',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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

    getCobMapByType(type) {
        return this.productData[type]?.cob || {};
    }

    getCobLabel(type, cobCode) {
        return this.getCobMapByType(type)[cobCode]?.name || cobCode || '-';
    }

    populateCobOptions() {
        if (!this.cob) return;

        const type = this.type?.value || '';
        const cobMap = this.getCobMapByType(type);

        this.cob.innerHTML = '<option value="">Select COB</option>';
        Object.keys(cobMap).forEach((code) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = cobMap[code].name;
            this.cob.appendChild(option);
        });
    }

    populateSubCobOptions() {
        if (!this.subCob) return;

        const type = this.type?.value || '';
        const cob = this.cob?.value || '';
        const subList = this.getCobMapByType(type)[cob]?.sub || [];

        this.subCob.innerHTML = '<option value="">Select Sub COB</option>';
        subList.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.subCob.appendChild(option);
        });
    }

    generateId() {
        return `OBJ-${Date.now().toString(36).toUpperCase()}`;
    }

    generateObjectGroupCode(type, cob, subCob, excludeId = '') {
        const prefixType = (type || 'NA').toUpperCase();
        const prefixCob = (cob || 'NA').toUpperCase();
        const prefixSub = (subCob || 'NA').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'NA';

        const samePrefixCount = this.data.filter((item) =>
            item.status === 'active' &&
            item.type === type &&
            item.cob === cob &&
            item.sub_cob === subCob &&
            String(item.id) !== String(excludeId)
        ).length + 1;

        return `OBJ-${prefixType}-${prefixCob}-${prefixSub}-${String(samePrefixCount).padStart(3, '0')}`;
    }

    updateGeneratedIdPreview() {
        if (!this.objectGroupIdDisplay) return;

        const editingId = this.recordId?.value || '';
        if (editingId) {
            const existing = this.data.find((item) => String(item.id) === String(editingId));
            this.objectGroupIdDisplay.value = existing?.object_group_id || '';
            return;
        }

        const type = this.type?.value || '';
        const cob = this.cob?.value || '';
        const subCob = this.subCob?.value || '';

        if (!type || !cob || !subCob) {
            this.objectGroupIdDisplay.value = '';
            return;
        }

        this.objectGroupIdDisplay.value = this.generateObjectGroupCode(type, cob, subCob);
    }

    saveRecord() {
        const id = (this.recordId?.value || '').trim();
        const type = (this.type?.value || '').trim();
        const cob = (this.cob?.value || '').trim();
        const subCob = (this.subCob?.value || '').trim();
        const objectGroupName = (this.objectGroupName?.value || '').trim();
        const objectGroupNameEng = (this.objectGroupNameEng?.value || '').trim();
        const note = (this.note?.value || '').trim();

        if (!type || !cob || !subCob || !objectGroupName) {
            this.showMessage('Type, COB, Sub COB, and Object Group Name are required.');
            return;
        }

        const duplicate = this.data.find((item) =>
            item.status === 'active' &&
            item.type === type &&
            item.cob === cob &&
            item.sub_cob === subCob &&
            item.object_group_name.toLowerCase() === objectGroupName.toLowerCase() &&
            String(item.id) !== String(id)
        );

        if (duplicate) {
            this.showMessage('Duplicate object group found for selected Type/COB/Sub COB.');
            return;
        }

        if (id) {
            const index = this.data.findIndex((item) => String(item.id) === String(id));
            if (index === -1) {
                this.showMessage('Object group record not found.');
                return;
            }

            const existing = this.data[index];
            const updated = {
                ...existing,
                type,
                cob,
                sub_cob: subCob,
                object_group_name: objectGroupName,
                object_group_name_eng: objectGroupNameEng,
                note,
                version: (existing.version || 1) + 1,
                updatedAt: new Date().toISOString(),
                updatedBy: this.getCurrentUserName()
            };

            this.data[index] = updated;
            this.pushVersion('update', updated);
            this.showMessage('Object group updated successfully.');
        } else {
            const record = {
                id: this.generateId(),
                object_group_id: this.generateObjectGroupCode(type, cob, subCob),
                type,
                cob,
                sub_cob: subCob,
                object_group_name: objectGroupName,
                object_group_name_eng: objectGroupNameEng,
                note,
                status: 'active',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: this.getCurrentUserName(),
                updatedBy: this.getCurrentUserName()
            };

            this.data.unshift(record);
            this.pushVersion('create', record);
            this.showMessage('Object group saved successfully.');
        }

        this.saveData();
        this.saveVersions();
        this.resetForm();
        this.renderTable();
        this.renderGovernancePanels();
        this.updateHealthMetrics();
    }

    pushVersion(action, record) {
        this.versions.unshift({
            id: `${record.id}-${Date.now()}`,
            recordId: record.id,
            object_group_id: record.object_group_id,
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
        this.form?.reset();
        if (this.recordId) this.recordId.value = '';
        if (this.objectGroupIdDisplay) this.objectGroupIdDisplay.value = '';

        this.populateCobOptions();
        this.populateSubCobOptions();
        this.updateGeneratedIdPreview();
        this.renderTable();
    }

    deleteSelectedRecord() {
        const id = (this.recordId?.value || '').trim();
        if (!id) {
            this.showMessage('Select an object group from the list before deleting.');
            return;
        }

        const item = this.data.find((record) => String(record.id) === String(id) && record.status === 'active');
        if (!item) {
            this.showMessage('Active object group record not found.');
            return;
        }

        this.pendingDeleteId = id;
        if (this.confirmMessage) {
            this.confirmMessage.textContent = `Are you sure you want to soft delete ${item.object_group_id}?`;
        }
        this.showConfirmModal();
    }

    confirmDelete() {
        if (!this.pendingDeleteId) {
            this.hideConfirmModal();
            return;
        }

        const index = this.data.findIndex((item) => String(item.id) === String(this.pendingDeleteId));
        if (index === -1) {
            this.hideConfirmModal();
            this.showMessage('Object group record not found.');
            return;
        }

        const existing = this.data[index];
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
        this.showMessage('Object group moved to soft delete successfully.');
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
        this.showMessage(`Object group ${this.data[index].object_group_id} restored successfully.`);
    }

    editRecord(recordId) {
        const item = this.data.find((record) => String(record.id) === String(recordId) && record.status === 'active');
        if (!item) {
            this.showMessage('Object group record not found.');
            return;
        }

        if (this.recordId) this.recordId.value = item.id;
        if (this.type) this.type.value = item.type;

        this.populateCobOptions();

        if (this.cob) this.cob.value = item.cob;

        this.populateSubCobOptions();

        if (this.subCob) this.subCob.value = item.sub_cob;
        if (this.objectGroupIdDisplay) this.objectGroupIdDisplay.value = item.object_group_id;
        if (this.objectGroupName) this.objectGroupName.value = item.object_group_name;
        if (this.objectGroupNameEng) this.objectGroupNameEng.value = item.object_group_name_eng || '';
        if (this.note) this.note.value = item.note || '';

        this.renderTable();
    }

    getFilteredActiveData() {
        return this.data
            .filter((item) => item.status === 'active')
            .filter((item) => {
                if (!this.searchTerm) return true;
                const bucket = [
                    item.object_group_id,
                    item.type,
                    this.getCobLabel(item.type, item.cob),
                    item.sub_cob,
                    item.object_group_name,
                    item.object_group_name_eng,
                    item.note
                ].join(' ').toLowerCase();

                return bucket.includes(this.searchTerm);
            });
    }

    getTotalPages() {
        const total = this.getFilteredActiveData().length;
        return Math.max(1, Math.ceil(total / this.pageSize));
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
                    <td colspan="7" class="px-4 py-6 text-center text-gray-500">No object group data available</td>
                </tr>
            `;
        } else {
            this.tableBody.innerHTML = pageItems.map((item, index) => `
                <tr class="hover:bg-gray-50 ${activeId && activeId === String(item.id) ? 'partner-row-active' : ''}" data-row-id="${item.id}">
                    <td class="px-4 py-3 text-sm text-gray-500">${start + index + 1}</td>
                    <td class="px-4 py-3 text-sm text-gray-800 font-medium">${this.escapeHtml(item.object_group_id)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.type === 'LI' ? 'Life Insurance' : 'General Insurance')}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(this.getCobLabel(item.type, item.cob))}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.sub_cob)}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.object_group_name)}</td>
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
                <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.object_group_id)}</p>
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
                        <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.object_group_id)} - ${this.escapeHtml(item.object_group_name)}</p>
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
            const usage = this.getDependencyUsage(item.type, item.cob);
            return `
                <div class="border rounded-lg p-3 mb-2 bg-purple-50">
                    <p class="text-sm font-medium text-gray-800">${this.escapeHtml(item.object_group_id)}</p>
                    <p class="text-xs text-gray-600">Connected modules: ${usage}</p>
                </div>
            `;
        });

        this.dependencyList.innerHTML = cards.length > 0
            ? cards.join('')
            : '<p class="text-sm text-gray-500">No dependency data available.</p>';
    }

    getDependencyUsage(type, cob) {
        if (type === 'GI' && ['PROP', 'MAR', 'MOT'].includes(cob)) return 4;
        if (type === 'LI') return 3;
        return 2;
    }

    renderAiSuggestionList() {
        if (!this.aiSuggestionList) return;

        const active = this.data.filter((item) => item.status === 'active');
        const deleted = this.data.filter((item) => item.status === 'inactive');

        const suggestions = [];
        suggestions.push(`Maintain at least 5 active object groups for better underwriting mapping. Current active data: ${active.length}.`);

        if (deleted.length > 0) {
            suggestions.push(`There are ${deleted.length} soft deleted object groups. Review and restore if needed.`);
        } else {
            suggestions.push('Soft delete queue is clean. Data lifecycle governance is healthy.');
        }

        const missingEnglish = active.filter((item) => !item.object_group_name_eng).length;
        if (missingEnglish > 0) {
            suggestions.push(`${missingEnglish} active records are missing English names. Consider completing bilingual metadata.`);
        } else {
            suggestions.push('All active records have English naming metadata.');
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

        const dependencyHealth = active.length === 0 ? 0 : Math.min(100, Math.round((active.filter((item) => this.getDependencyUsage(item.type, item.cob) >= 3).length / active.length) * 100));
        const quality = active.length === 0 ? 0 : Math.round((active.filter((item) => item.type && item.cob && item.sub_cob && item.object_group_name).length / active.length) * 100);

        if (this.metricImpact) this.metricImpact.textContent = String(this.impactTools.filter((item) => item.impact === 'High').length);
        if (this.metricVersions) this.metricVersions.textContent = String(this.versions.length);
        if (this.metricSoftDelete) this.metricSoftDelete.textContent = String(deleted.length);
        if (this.metricDependency) this.metricDependency.textContent = `${dependencyHealth}%`;
        if (this.metricQuality) this.metricQuality.textContent = `${quality}%`;
    }

    exportCsv() {
        const active = this.data.filter((item) => item.status === 'active');
        if (active.length === 0) {
            this.showMessage('No active object group data to export.');
            return;
        }

        const headers = ['Object Group ID', 'Type', 'COB', 'Sub COB', 'Object Group Name', 'Object Group Name (English)', 'Note', 'Version', 'Updated At'];
        const rows = active.map((item) => [
            item.object_group_id,
            item.type === 'LI' ? 'Life Insurance' : 'General Insurance',
            this.getCobLabel(item.type, item.cob),
            item.sub_cob,
            item.object_group_name,
            item.object_group_name_eng || '',
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
        link.download = `object-group-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Object group data exported successfully.');
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
    window.objectGroupManager = new ObjectGroupManager();
});
