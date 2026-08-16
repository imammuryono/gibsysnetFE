class QuotationManager {
    constructor() {
        this.versionKey = 'gibsysnet_quotation_versions';
        this.cobLookupKey = 'cob_products_v4';
        this.partnerLookupKey = 'gibsysnet_partners_data';
        this.currencyLookupKey = 'gibsysnet_currency_data';
        this.cobProductsEndpointCandidates = this.getCobProductsEndpointCandidates();
        // FIXED: Backend on port 3001 only, no alternates
        this.quotationApiUrl = 'http://localhost:3001/api/quotations';
        this.pageSize = 10;
        this.currentPage = 1;
        this.searchTerm = '';
        this.currentDeleteId = null;
        this.cobProducts = [];
        this.partnerRows = [];
        this.currencyRows = [];
        this.installments = [];
        this.coinsurances = [];
        this.manualFieldOverrides = {
            endors: false,
            quotationLate: false,
            conversionTo: false,
            wpcClient: false,
            wpcInsurance: false
        };
        this.currentQuotationCreatedAt = '';
        this.isNewClicked = false;
        this.activeRiskTemplateType = null;

        this.quotations = [];
        this.versions = this.loadVersions();

        this.initializeElements();
        this.configureAuditFields();
        this.initializeLookups();
        this.bindEvents();
        this.bindRiskDetailBridge();
        this.renderAll();
        this.attachments = [];
        this.initInsuranceTab();
        this.initAttachmentTab();
        this.applyAuditDefaultsForNewRecord();
        this.applyRequiredQuotationDefaults();
        this.syncAutoQuotationFields(true);
        this.updateRiskTabState();
        this.readyPromise = this.initializeData();
    }

    initializeElements() {
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.form = document.getElementById('quotationForm');

        this.quotationId = document.getElementById('quotationId');
        this.typeIns = document.getElementById('typeIns');
        this.cob = document.getElementById('cob');
        this.cobName = document.getElementById('cobName');
        this.subCob = document.getElementById('subCob');
        this.subCobName = document.getElementById('subCobName');
        this.quotationYear = document.getElementById('quotationYear');
        this.regNo = document.getElementById('regNo');
        this.endors = document.getElementById('endors');
        this.client = document.getElementById('client');
        this.clientQQ = document.getElementById('clientQQ');
        this.address = document.getElementById('address');
        this.marketing = document.getElementById('marketing');
        this.agent = document.getElementById('agent');
        this.paymentType = document.getElementById('paymentType');
        this.accept = document.getElementById('accept');
        this.periode = document.getElementById('periode');
        this.conversionTo = document.getElementById('conversionTo');
        this.currency = document.getElementById('currency');
        this.rate = document.getElementById('rate');
        this.policyNo = document.getElementById('policyNo');
        this.effectiveDate = document.getElementById('effectiveDate');
        this.wpcClient = document.getElementById('wpcClient');

        this.quotationLate = document.getElementById('quotationLate');
        this.closingStatus = document.getElementById('closingStatus');
        this.status = document.getElementById('status');
        this.premium = document.getElementById('premium');
        this.tsi = document.getElementById('tsi');
        this.rateType = document.getElementById('rateType');
        this.endorsNota = document.getElementById('endorsNota');
        this.wpcInsurance = document.getElementById('wpcInsurance');

        this.userEntry = document.getElementById('userEntry');
        this.entryDate = document.getElementById('entryDate');
        this.userUpdate = document.getElementById('userUpdate');
        this.updateDate = document.getElementById('updateDate');
        this.userClose = document.getElementById('userClose');
        this.closeDate = document.getElementById('closeDate');

        this.tableBody = document.getElementById('quotationTableBody');
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

        this.installmentTableBody = document.getElementById('installmentTableBody');
        this.premiumDisplay = document.getElementById('premiumDisplay');
        this.installmentTotalSpan = document.getElementById('installmentTotal');
        this.installmentTotalFoot = document.getElementById('installmentTotalFoot');
        this.installmentDiff = document.getElementById('installmentDiff');
        this.installmentDiffVal = document.getElementById('installmentDiffVal');
        this.installmentOk = document.getElementById('installmentOk');

        // Insurance tab elements
        this.coInsurance = document.getElementById('coInsurance');
        this.singleInsuranceSection = document.getElementById('singleInsuranceSection');
        this.multiInsuranceSection = document.getElementById('multiInsuranceSection');
        this.insCompanySingle = document.getElementById('insCompanySingle');
        this.coinsuranceTableBody = document.getElementById('coinsuranceTableBody');
        this.coShareBadge = document.getElementById('coShareBadge');
        this.coShareTotalFoot = document.getElementById('coShareTotalFoot');
        this.insPremi = document.getElementById('insPremi');
        this.insBiayaPolis = document.getElementById('insBiayaPolis');
        this.insMaterai = document.getElementById('insMaterai');
        this.insDiskonPct = document.getElementById('insDiskonPct');
        this.insDiskon = document.getElementById('insDiskon');
        this.insBrokeragePct = document.getElementById('insBrokeragePct');
        this.insBrokerage = document.getElementById('insBrokerage');
        this.insPphPct = document.getElementById('insPphPct');
        this.insPph = document.getElementById('insPph');
        this.insPpnPct = document.getElementById('insPpnPct');
        this.insPpnMode = document.getElementById('insPpnMode');
        this.insPpn = document.getElementById('insPpn');
        this.insTotalPayable = document.getElementById('insTotalPayable');
        this.insPremiNet = document.getElementById('insPremiNet');
        this.quotClientStatus = document.getElementById('quotClientStatus');
        this.openQuotClientTemplateBtn = document.getElementById('openQuotClientTemplateBtn');

    }

    bindEvents() {
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach((tab) => {
            tab.addEventListener('click', (e) => {
                if (tab.classList.contains('disabled')) return;

                // Intercept Risk tab to toggle custom dropdown
                if (tab.id === 'tab-risk-btn') {
                    e.stopPropagation();
                    const dropdown = document.getElementById('tab-risk-dropdown');
                    if (dropdown) {
                        dropdown.classList.toggle('hidden');
                    }
                    return;
                }

                // Hide Risk dropdown when clicking other tabs
                const dropdown = document.getElementById('tab-risk-dropdown');
                if (dropdown) dropdown.classList.add('hidden');

                tabItems.forEach((item) => item.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.getAttribute('data-tab');
                document.querySelectorAll('.quot-tab-panel').forEach((p) => p.classList.add('hidden'));
                const panel = document.getElementById(target);
                if (panel) panel.classList.remove('hidden');
                if (target === 'tab-installment') this.refreshInstallmentSummary();
                if (target === 'tab-insurance') this.syncInsurancePremiumFromQuotationPremium(true);
                if (target === 'tab-wordquot') this.openWordQuotationTemplate();
                if (target === 'tab-quotclient') this.renderQuotationClientFromStorage();
            });
        });

        // Event listeners for options inside Risk tab dropdown
        const riskDropdown = document.getElementById('tab-risk-dropdown');
        if (riskDropdown) {
            riskDropdown.querySelectorAll('button[data-risk-type]').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const type = btn.getAttribute('data-risk-type');
                    
                    // Set Risk tab to active & switch panel
                    tabItems.forEach((item) => item.classList.remove('active'));
                    const riskBtn = document.getElementById('tab-risk-btn');
                    if (riskBtn) riskBtn.classList.add('active');

                    document.querySelectorAll('.quot-tab-panel').forEach((p) => p.classList.add('hidden'));
                    const panel = document.getElementById('tab-risk');
                    if (panel) panel.classList.remove('hidden');

                    // Load specific risk type
                    this.loadRiskType(type);

                    // Hide dropdown
                    riskDropdown.classList.add('hidden');
                });
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('tab-risk-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
        });

        // Also restore basic info panel when switching away from Risk tab
        document.querySelectorAll('.tab-item:not(#tab-risk-btn)').forEach((tab) => {
            tab.addEventListener('click', () => {
                this._showBasicInfoPanel();
            });
        });

        document.getElementById('addInstallmentRow')?.addEventListener('click', () => this.addInstallmentRow());
        document.getElementById('distributeInstallment')?.addEventListener('click', () => this.autoDistributeInstallments());
        document.getElementById('clearInstallment')?.addEventListener('click', () => this.clearInstallmentRows());

        // Insurance tab events
        if (this.coInsurance) {
            this.coInsurance.addEventListener('change', () => this.toggleCoInsuranceMode());
        }
        document.getElementById('addCoinsuranceRow')?.addEventListener('click', () => this.addCoinsuranceRow());
        document.querySelectorAll('.ins-calc-field').forEach((el) => {
            el.addEventListener('input', () => this.calcInsPremiNet());
        });
        // Format-on-blur for editable amount fields
        ['insPremi', 'insBiayaPolis', 'insMaterai'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('focus', () => {
                const n = parseFloat(el.value.replace(/,/g, ''));
                el.value = isNaN(n) || n === 0 ? '' : n.toString();
            });
            el.addEventListener('blur', () => {
                const n = parseFloat(el.value.replace(/,/g, ''));
                if (!isNaN(n)) el.value = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                this.calcInsPremiNet();
            });
        });

        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.saveQuotation();
            });

            this.form.addEventListener('input', () => {
                this.previewAuditForEdit();
                this.saveQuotationTemplateState();
            });

            this.form.addEventListener('change', () => {
                this.saveQuotationTemplateState();
            });
        }

        if (this.premium) {
            this.premium.addEventListener('input', () => {
                this.refreshInstallmentSummary();
                this.syncInsurancePremiumFromQuotationPremium();
            });
        }

        if (this.status) {
            this.status.addEventListener('change', () => {
                this.syncClosingStatusFrom('status');
            });
        }

        if (this.closingStatus) {
            this.closingStatus.addEventListener('change', () => {
                this.syncClosingStatusFrom('closingStatus');
            });
        }

        if (this.typeIns) {
            this.typeIns.addEventListener('change', () => {
                this.populateCobOptions('');
                this.handleCobSelectionChange();
                this.updateCobNameFields();
                this.updateRiskTabState();
            });
        }

        if (this.cob) {
            this.cob.addEventListener('change', () => {
                this.handleCobSelectionChange();
                this.updateCobNameFields();
                this.updateRiskTabState();
            });
        }

        if (this.subCob) {
            this.subCob.addEventListener('change', () => {
                this.autoGenerateRegNo();
                this.updateCobNameFields();
                this.updateRiskTabState();
            });
        }

        if (this.client) {
            this.client.addEventListener('change', () => {
                const selectedClientName = this.client.value;
                const clientEntry = this.partnerRows.find(
                    (p) => p.name === selectedClientName && p.category === 'client'
                );
                if (clientEntry && this.address) {
                    const addressParts = [
                        clientEntry.address,
                        clientEntry.city,
                        clientEntry.province,
                        clientEntry.postalCode
                    ].map(s => String(s || '').trim()).filter(Boolean);
                    this.address.value = addressParts.join(', ');
                }
            });
        }

        if (this.effectiveDate) {
            this.effectiveDate.addEventListener('change', () => {
                this.handleIssueDateChange();
                this.updateRiskTabState();
            });
            this.effectiveDate.addEventListener('input', () => {
                this.handleIssueDateChange();
                this.updateRiskTabState();
            });
        }

        if (this.periode) {
            this.periode.addEventListener('change', () => {
                this.syncAutoQuotationFields();
            });
            this.periode.addEventListener('input', () => {
                this.syncAutoQuotationFields();
            });
        }

        if (this.conversionTo) {
            this.conversionTo.addEventListener('input', () => {
                this.manualFieldOverrides.conversionTo = true;
            });
        }

        if (this.endors) {
            this.endors.addEventListener('input', () => {
                this.manualFieldOverrides.endors = true;
            });
        }

        if (this.quotationLate) {
            this.quotationLate.addEventListener('input', () => {
                this.manualFieldOverrides.quotationLate = true;
            });
        }

        if (this.wpcClient) {
            this.wpcClient.addEventListener('input', () => {
                this.manualFieldOverrides.wpcClient = true;
            });
        }

        if (this.wpcInsurance) {
            this.wpcInsurance.addEventListener('input', () => {
                this.manualFieldOverrides.wpcInsurance = true;
            });
        }

        // Watch required fields for basic info completeness
        ['client', 'status'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', () => this.updateRiskTabState());
        });

        if (this.newBtnSidebar) this.newBtnSidebar.addEventListener('click', async () => await this.resetForm());
        if (this.saveBtnSidebar) this.saveBtnSidebar.addEventListener('click', () => this.saveQuotation());
        if (this.deleteBtnSidebar) this.deleteBtnSidebar.addEventListener('click', () => this.promptDeleteFromForm());
        if (this.exportBtnSidebar) this.exportBtnSidebar.addEventListener('click', () => this.exportData());

        this.openQuotClientTemplateBtn?.addEventListener('click', () => this.openQuotationClientDocument());
        document.getElementById('openWordQuotationBtn')?.addEventListener('click', () => this.openWordQuotationTemplate());

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
                this.softDeleteQuotation(this.currentDeleteId);
                this.currentDeleteId = null;
                this.hideConfirm();
            });
        }

        if (this.messageOk) this.messageOk.addEventListener('click', () => this.hideMessage());

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            this.hideConfirm();
            this.hideMessage();
        });

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


    getQuotationFormSnapshot() {
        if (!this.form) return {};

        const snapshot = {};
        this.form.querySelectorAll('input, select, textarea').forEach((field) => {
            if (!field.name || field.disabled) return;
            const value = field.type === 'checkbox' ? field.checked : field.value;
            snapshot[field.name] = value;
        });

        return snapshot;
    }

    saveQuotationTemplateState() {
        try {
            const payload = {
                version: 1,
                savedAt: new Date().toISOString(),
                templatePath: this.getWordTemplatePathForCurrentRisk(),
                riskType: this.getRiskTemplateTypeFromSelection(),
                formData: this.getQuotationFormSnapshot()
            };
            localStorage.setItem('quotation_word_template_state', JSON.stringify(payload));
            return payload;
        } catch (error) {
            console.warn('Unable to save quotation template state:', error);
            return null;
        }
    }

    getQuotationTemplateState() {
        try {
            const raw = localStorage.getItem('quotation_word_template_state');
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Unable to read quotation template state:', error);
            return null;
        }
    }

    renderQuotationClientFromStorage() {
        const panel = document.getElementById('tab-quotclient');
        if (!panel) return;

        // Save current form state
        this.saveQuotationTemplateState();

        // Get quotation ID from form (if a record is selected)
        const quotId = this.getCurrentQuotationIdFromForm ? this.getCurrentQuotationIdFromForm() : null;

        panel.innerHTML = `
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden" style="box-shadow: 0 2px 16px rgba(0,0,0,0.06);">
                <!-- Header Bar -->
                <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width:44px; height:44px; background: rgba(255,255,255,0.18); border-radius:10px; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-file-word" style="font-size:22px; color:#fff;"></i>
                        </div>
                        <div>
                            <div style="color:#fff; font-size:17px; font-weight:700; letter-spacing:0.3px;">Quotation Client — QSMV</div>
                            <div style="color:rgba(255,255,255,0.75); font-size:12px; margin-top:2px;">Dokumen quotation untuk dikirim ke klien</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button id="qclient-refresh-btn" type="button"
                            style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:#fff; border-radius:8px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:7px; transition:background 0.2s;"
                            onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                            <i class="fas fa-sync-alt"></i> Refresh Data
                        </button>
                        <button id="qclient-generate-btn" type="button"
                            style="background:#fff; border:none; color:#1e40af; border-radius:8px; padding:9px 22px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 2px 8px rgba(0,0,0,0.12); transition:all 0.2s;"
                            onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='#fff'">
                            <i class="fas fa-file-pdf"></i> Generate &amp; Download QSMV.pdf
                        </button>
                    </div>
                </div>

                <!-- Status Banner -->
                <div id="qclient-status-bar" style="padding:10px 24px; background:#f0f9ff; border-bottom:1px solid #bae6fd; display:flex; align-items:center; gap:8px; font-size:12.5px; color:#0369a1; display:none;">
                    <i class="fas fa-info-circle"></i>
                    <span id="qclient-status-text"></span>
                </div>

                <!-- Loading State -->
                <div id="qclient-loading" style="padding:48px; text-align:center; display:none;">
                    <div style="width:44px;height:44px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 14px;"></div>
                    <div style="color:#6b7280; font-size:13px;">Mengambil data dari server...</div>
                </div>

                <!-- Data Preview -->
                <div id="qclient-data-panel" style="padding: 24px;">
                    <!-- Summary Cards Row -->
                    <div id="qclient-summary-cards" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:14px; margin-bottom:24px;"></div>

                    <!-- Detail Table -->
                    <div style="background:#f8fafc; border-radius:10px; border:1px solid #e5e7eb; overflow:hidden;">
                        <div style="padding:12px 18px; background:#f1f5f9; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-table-list" style="color:#3b82f6;"></i>
                            <span style="font-size:13px; font-weight:700; color:#374151;">Data Preview (dari Local Storage)</span>
                        </div>
                        <div id="qclient-detail-table" style="padding:16px;"></div>
                    </div>

                    <!-- Template Info -->
                    <div style="margin-top:16px; padding:12px 16px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-lightbulb" style="color:#f59e0b;"></i>
                        <div style="font-size:12px; color:#92400e;">
                            <strong>Template:</strong> QSMV.docx &nbsp;|&nbsp;
                            <strong>Path:</strong> template/QSMV.docx &nbsp;|&nbsp;
                            Data disinkronisasikan dari: <code style="background:#fef3c7; padding:1px 5px; border-radius:3px;">Formulir Lokal (localStorage)</code>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>`;

        // Bind buttons
        document.getElementById('qclient-refresh-btn')?.addEventListener('click', () => {
            this._loadQuotClientData(quotId);
        });
        document.getElementById('qclient-generate-btn')?.addEventListener('click', () => {
            this.generateQSMVDocx();
        });

        // Auto-load data
        this._loadQuotClientData(quotId);
    }

    _showQuotClientStatus(msg, type = 'info') {
        const bar = document.getElementById('qclient-status-bar');
        const txt = document.getElementById('qclient-status-text');
        if (!bar || !txt) return;
        const colors = {
            info: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', icon: 'fa-info-circle' },
            success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: 'fa-check-circle' },
            error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: 'fa-exclamation-circle' }
        };
        const c = colors[type] || colors.info;
        bar.style.background = c.bg;
        bar.style.borderBottomColor = c.border;
        bar.style.color = c.text;
        bar.style.display = 'flex';
        bar.querySelector('i').className = `fas ${c.icon}`;
        txt.textContent = msg;
    }

    async _loadQuotClientData(quotId = null) {
        const loading = document.getElementById('qclient-loading');
        const dataPanel = document.getElementById('qclient-data-panel');
        if (!loading || !dataPanel) return;

        loading.style.display = 'block';
        dataPanel.style.display = 'none';

        try {
            // Save state immediately to ensure localstorage is up-to-date
            this.saveQuotationTemplateState();
            const state = this.getQuotationTemplateState();
            const formData = state?.formData || this.getQuotationFormSnapshot();

            // Map localstorage form data to matches template structure
            const localData = {
                reg_no: formData.reg_no || formData.regNo,
                cob: formData.cob,
                sub_cob: formData.sub_cob || formData.subCob,
                client: formData.client,
                client_qq: formData.client_qq || formData.clientQQ,
                address: formData.address,
                policy_no: formData.policy_no || formData.policyNo,
                periode: formData.periode,
                conversion_to: formData.conversion_to || formData.conversionTo,
                effective_date: formData.effective_date || formData.effectiveDate,
                currency: formData.currency,
                tsi: formData.tsi,
                premium: formData.premium,
                rate: formData.rate,
                ins_premi: formData.ins_premi || formData.insPremi,
                ins_biaya_polis: formData.ins_biaya_polis || formData.insBiayaPolis,
                ins_materai: formData.ins_materai || formData.insMaterai,
                ins_diskon: formData.ins_diskon || formData.insDiskon,
                ins_brokerage: formData.ins_brokerage || formData.insBrokerage,
                ins_ppn: formData.ins_ppn || formData.insPpn,
                ins_pph: formData.ins_pph || formData.insPph,
                ins_total_payable: formData.ins_total_payable || formData.insTotalPayable || formData.premium,
                endors: formData.endors,
                marketing: formData.marketing,
                agent: formData.agent,
                quotation_status: formData.status
            };

            this._lastQuotClientData = localData;

            // Render
            this._renderQuotClientDataPreview(localData);
            this._showQuotClientStatus('Data Preview dimuat dari form local storage.', 'success');

        } catch (err) {
            console.error('[QuotClient] Load error:', err);
            this._showQuotClientStatus(`Gagal memuat data preview: ${err.message}`, 'error');
        } finally {
            loading.style.display = 'none';
            dataPanel.style.display = 'block';
        }
    }

    _renderQuotClientDataPreview(data) {
        if (!data) return;

        const fmt = (v) => (v === null || v === undefined || v === '') ? '-' : String(v);
        const fmtNum = (v) => {
            const n = parseFloat(v);
            return isNaN(n) ? '-' : n.toLocaleString('id-ID');
        };

        // Summary cards
        const summaryCards = [
            { label: 'Reg. Number', value: fmt(data.reg_no), icon: 'fas fa-hashtag', color: '#3b82f6' },
            { label: 'Client', value: fmt(data.client), icon: 'fas fa-user-tie', color: '#8b5cf6' },
            { label: 'COB', value: fmt(data.cob), icon: 'fas fa-tag', color: '#10b981' },
            { label: 'Status', value: fmt(data.quotation_status ?? data.status), icon: 'fas fa-circle-check', color: '#f59e0b' },
        ];

        const cardsEl = document.getElementById('qclient-summary-cards');
        if (cardsEl) {
            cardsEl.innerHTML = summaryCards.map(c => `
                <div style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:12px; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                    <div style="width:38px;height:38px;border-radius:8px;background:${c.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="${c.icon}" style="color:${c.color};font-size:16px;"></i>
                    </div>
                    <div style="min-width:0;">
                        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${c.label}</div>
                        <div style="font-size:14px;color:#111827;font-weight:700;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${this.escapeHtml(c.value)}">${this.escapeHtml(c.value)}</div>
                    </div>
                </div>`).join('');
        }

        // Detail table
        const fields = [
            ['Reg. Number', fmt(data.reg_no)],
            ['Client (Tertanggung)', fmt(data.client)],
            ['Client QQ', fmt(data.client_qq ?? data.clientQQ)],
            ['Address', fmt(data.address)],
            ['COB', fmt(data.cob)],
            ['Sub COB', fmt(data.sub_cob ?? data.subCob)],
            ['Policy No', fmt(data.policy_no ?? data.policyNo)],
            ['Endors', fmt(data.endors)],
            ['Inception Date', fmt(data.periode)],
            ['Expiry Date', fmt(data.conversion_to ?? data.conversionTo)],
            ['Effective Date', fmt(data.effective_date ?? data.effectiveDate)],
            ['Currency', fmt(data.currency)],
            ['TSI', fmtNum(data.tsi)],
            ['Rate', fmt(data.rate)],
            ['Premium', fmtNum(data.premium)],
            ['Insurance Premium', fmtNum(data.ins_premi ?? data.insPremi)],
            ['Policy Cost', fmtNum(data.ins_biaya_polis ?? data.insBiayaPolis)],
            ['Stamp Duty (Materai)', fmtNum(data.ins_materai ?? data.insMaterai)],
            ['Discount', fmtNum(data.ins_diskon ?? data.insDiskon)],
            ['Brokerage', fmtNum(data.ins_brokerage ?? data.insBrokerage)],
            ['PPN', fmtNum(data.ins_ppn ?? data.insPpn)],
            ['PPH', fmtNum(data.ins_pph ?? data.insPph)],
            ['Total Payable', fmtNum(data.ins_total_payable ?? data.insTotalPayable)],
            ['Marketing', fmt(data.marketing)],
            ['Agent', fmt(data.agent)],
            ['Status', fmt(data.quotation_status ?? data.status)],
        ];

        const tableEl = document.getElementById('qclient-detail-table');
        if (tableEl) {
            tableEl.innerHTML = `
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    ${fields.map(([label, value], i) => `
                        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                            <td style="padding:8px 12px; color:#6b7280; font-weight:600; width:45%; border-bottom:1px solid #f1f5f9;">${label}</td>
                            <td style="padding:8px 12px; color:#111827; border-bottom:1px solid #f1f5f9;">${this.escapeHtml(value)}</td>
                        </tr>`).join('')}
                </table>`;
        }
    }

    async generateQSMVDocx() {
        const btn = document.getElementById('qclient-generate-btn');

        // Check libraries — the local build exposes window.docxtemplater (lowercase)
        const DocxtemplaterClass = (typeof Docxtemplater !== 'undefined') ? Docxtemplater
            : (typeof docxtemplater !== 'undefined') ? (docxtemplater.default || docxtemplater)
            : null;
        if (typeof PizZip === 'undefined' || !DocxtemplaterClass) {
            this.showMessage('Library DOCX belum siap. Coba refresh halaman (F5).');
            return;
        }

        // Set button loading state
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        }

        try {
            // 1) Get current form data from localstorage (saved immediately when switching/viewing tab or typing)
            this.saveQuotationTemplateState();
            const state = this.getQuotationTemplateState();
            const formData = state?.formData || this.getQuotationFormSnapshot();

            // Map localstorage form data to data object matching template structure
            const data = {
                reg_no: formData.reg_no || formData.regNo,
                cob: formData.cob,
                sub_cob: formData.sub_cob || formData.subCob,
                client: formData.client,
                address: formData.address,
                policy_no: formData.policy_no || formData.policyNo,
                periode: formData.periode,
                conversion_to: formData.conversion_to || formData.conversionTo,
                currency: formData.currency,
                tsi: formData.tsi,
                premium: formData.premium,
                rate: formData.rate,
                ins_premi: formData.ins_premi || formData.insPremi,
                ins_biaya_polis: formData.ins_biaya_polis || formData.insBiayaPolis,
                ins_materai: formData.ins_materai || formData.insMaterai,
                ins_diskon: formData.ins_diskon || formData.insDiskon,
                ins_brokerage: formData.ins_brokerage || formData.insBrokerage,
                ins_ppn: formData.ins_ppn || formData.insPpn,
                ins_pph: formData.ins_pph || formData.insPph,
                ins_total_payable: formData.ins_total_payable || formData.insTotalPayable || formData.premium,
                endors: formData.endors,
                ins_company_single: formData.ins_company_single || formData.insCompanySingle,
                coinsurances: formData.coinsurances,
                quotation_status: formData.status
            };

            // 2) Fetch QSMV.docx template as ArrayBuffer
            const templateUrl = 'template/QSMV.docx';
            const templateRes = await fetch(templateUrl);
            if (!templateRes.ok) throw new Error(`Template tidak ditemukan: ${templateUrl} (HTTP ${templateRes.status})`);
            const templateBuffer = await templateRes.arrayBuffer();

            // 3) Build docxtemplater data payload (matching QSMV.docx placeholders)
            const fmtNum = (v) => {
                const n = parseFloat(v);
                if (isNaN(n) || n === 0) return '-';
                return n.toLocaleString('id-ID');
            };
            const fmt = (v) => (v === null || v === undefined || v === '') ? '-' : String(v);

            // Indonesian date format for tgl field
            const now = new Date();
            const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            const tglStr = `${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;

            // Insurer from coinsurances or single company
            let insurer = '-';
            try {
                const coins = data.coinsurances ? JSON.parse(data.coinsurances) : [];
                if (Array.isArray(coins) && coins.length > 0) {
                    insurer = coins.map(c => c.company || c.name || '').filter(Boolean).join(', ') || '-';
                } else if (data.ins_company_single) {
                    insurer = data.ins_company_single;
                }
            } catch (e) { insurer = fmt(data.ins_company_single); }

            const templateData = {
                // Header
                judul: `QUOTATION - ${fmt(data.reg_no)}`,
                // Insurance info
                cob: fmt(data.cob),
                sub_cob: fmt(data.sub_cob ?? data.subCob),
                reg_no: fmt(data.reg_no),
                insurer: insurer,
                endors: fmt(data.endors),
                no_polis: fmt(data.policy_no ?? data.policyNo),
                client: fmt(data.client),
                address: fmt(data.address),
                inception_date: fmt(data.periode),
                expiry_date: fmt(data.conversion_to ?? data.conversionTo),
                // Financial
                currency: fmt(data.currency),
                tsi: fmtNum(data.tsi),
                rate: fmt(data.rate),
                brokerage: fmtNum(data.ins_brokerage ?? data.insBrokerage),
                security: insurer,
                tot_security: '100%',
                premi: fmtNum(data.ins_premi ?? data.insPremi ?? data.premium),
                biaya_pol: fmtNum(data.ins_biaya_polis ?? data.insBiayaPolis),
                materai: fmtNum(data.ins_materai ?? data.insMaterai),
                biaya_lain: '-',
                diskon: fmtNum(data.ins_diskon ?? data.insDiskon),
                ppn: fmtNum(data.ins_ppn ?? data.insPpn),
                pph: fmtNum(data.ins_pph ?? data.insPph),
                tot_premi: fmtNum(data.ins_total_payable ?? data.insTotalPayable ?? data.premium),
                // Date
                tgl: tglStr
            };

            // 4) Generate filled DOCX
            const zip = new PizZip(templateBuffer);

            // Pre-process: fix [JUDUL] bracket-style placeholder in document.xml
            const docXmlFile = zip.files['word/document.xml'];
            if (docXmlFile) {
                let xmlContent = docXmlFile.asText();
                // Replace [JUDUL] with the title value (bracket notation → direct text)
                xmlContent = xmlContent.replace(/\[JUDUL\]/g, this.escapeHtml(templateData.judul));
                
                // Fix malformed {{currency} di XML secara presisi:
                xmlContent = xmlContent.replace(/currency<\/w:t><\/w:r><w:r\s+w:rsidR="[0-9a-fA-F]+"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"\/><w:b\/><w:bCs\/><\/w:rPr><w:t>\}/g, 'currency}}');

                // Fix malformed [tsi
                xmlContent = xmlContent.replace(/\[tsi/g, 'tsi');

                // Fix malformed {{tgl}} di XML secara presisi:
                xmlContent = xmlContent.replace(/\{<\/w:t><\/w:r><w:proofErr w:type="gramEnd"\/><w:r\s+w:rsidR="[0-9a-fA-F]+"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"\/><\/w:rPr><w:t>\{/g, '{{');

                zip.file('word/document.xml', xmlContent);
            }

            let doc;
            try {
                doc = new DocxtemplaterClass(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    nullGetter: () => '-'
                });
                doc.render(templateData);
            } catch (renderErr) {
                // Log detailed error from docxtemplater
                if (renderErr.properties && renderErr.properties.errors) {
                    console.warn('[QSMV] Template render warnings:', renderErr.properties.errors);
                }
                // Re-throw so outer catch handles it
                throw renderErr;
            }

            const outputBlob = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                compression: 'DEFLATE'
            });

            // 5) Convert to HTML via Mammoth.js and print to PDF via html2pdf.js
            const fileReader = new FileReader();
            fileReader.onload = async (event) => {
                const arrayBuffer = event.target.result;
                try {
                    // Mammoth rendering options
                    const options = {
                        styleMap: [
                            "p[style-name='Heading 1'] => h1:safe",
                            "p[style-name='Heading 2'] => h2:safe",
                            "table => table.pdf-table:safe"
                        ]
                    };

                    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);
                    const htmlResult = result.value; // The generated HTML

                    // Create a hidden container for rendering the PDF layout
                    const optContainer = document.createElement('div');
                    optContainer.style.padding = '40px';
                    optContainer.style.fontFamily = 'Arial, sans-serif';
                    optContainer.style.color = '#333';
                    optContainer.style.lineHeight = '1.5';
                    optContainer.innerHTML = `
                        <style>
                            h1, h2, h3 { text-align: center; color: #111; margin-bottom: 20px; font-weight: bold; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
                            th { background-color: #f2f2f2; font-weight: bold; }
                            p { font-size: 13px; margin: 8px 0; }
                        </style>
                        ${htmlResult}
                    `;

                    // Generate PDF from the HTML content
                    const pdfFileName = `QSMV_${fmt(data.reg_no).replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
                    const pdfOptions = {
                        margin:       [15, 15, 15, 15],
                        filename:     pdfFileName,
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    await html2pdf().set(pdfOptions).from(optContainer).save();
                    this._showQuotClientStatus(`✓ Dokumen PDF "${pdfFileName}" berhasil digenerate dan diunduh.`, 'success');

                } catch (mammothErr) {
                    console.error('[QSMV] PDF Convert error:', mammothErr);
                    // Fallback to downloading DOCX if PDF fails
                    const fileNameDocx = `QSMV_${fmt(data.reg_no).replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
                    saveAs(outputBlob, fileNameDocx);
                    this._showQuotClientStatus(`Gagal convert ke PDF, mendownload DOCX sebagai cadangan.`, 'warning');
                }
            };
            fileReader.readAsArrayBuffer(outputBlob);

        } catch (err) {
            console.error('[QSMV] Generate error:', err);
            // Provide user-friendly error with details if available
            let errMsg = err.message || 'Unknown error';
            if (err.properties && err.properties.errors && err.properties.errors.length > 0) {
                const details = err.properties.errors.map(e => e.message || e.id || '').filter(Boolean).slice(0, 3).join('; ');
                errMsg = `Template error: ${details}`;
            }
            this._showQuotClientStatus(`Gagal generate dokumen: ${errMsg}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generate &amp; Download QSMV.pdf';
            }
        }
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getWordTemplateOpenUrls(templatePath = null) {
        const resolvedPath = templatePath || this.getWordTemplatePathForCurrentRisk();
        const absoluteUrl = new URL(resolvedPath, window.location.href).toString();
        return {
            wordAppUrl: `ms-word:ofe|u|${absoluteUrl}`,
            directUrl: absoluteUrl
        };
    }

    openWordDocument(templatePath = null) {
        const { wordAppUrl, directUrl } = this.getWordTemplateOpenUrls(templatePath);

        try {
            const popup = window.open(wordAppUrl, '_blank', 'noopener,noreferrer');
            if (!popup) {
                window.open(directUrl, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.warn('Unable to open template via Word app:', error);
            window.open(directUrl, '_blank', 'noopener,noreferrer');
        }
    }

    async openWordTemplateInEditor(templatePath = null) {
        const resolvedPath = templatePath || this.getWordTemplatePathForCurrentRisk();
        const templateName = resolvedPath.split('/').pop();
        const panel = document.getElementById('tab-wordquot');
        if (!panel) return;

        const previewContainer = panel.querySelector('[data-role="document-preview"]');
        if (!previewContainer) return;

        // Tampilkan loading spinner
        previewContainer.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <div style="width:30px;height:30px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 10px;"></div>
                <div class="text-xs">Membaca preview template ${this.escapeHtml(templateName)}...</div>
            </div>`;

        try {
            // Fetch berkas QSMV.docx asli
            const res = await fetch(resolvedPath);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();

            // Render ke HTML menggunakan Mammoth.js
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            const htmlResult = result.value;

            // Render preview dengan gaya visual terformat rapi sesuai gambar
            previewContainer.innerHTML = `
                <div class="p-3 border border-blue-100 rounded-lg bg-blue-50 text-xs text-blue-700 mb-3 flex items-center gap-2">
                    <i class="fas fa-eye"></i>
                    <span>Preview Teks Template Dokumen Asli (${this.escapeHtml(templateName)})</span>
                </div>
                <div class="word-docx-rendered-preview" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:24px; font-family:Arial, sans-serif; font-size:13px; line-height:1.6; color:#334155; max-height:400px; overflow-y:auto; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                    <style>
                        .word-docx-rendered-preview h1, .word-docx-rendered-preview h2 { text-align: center; font-weight: bold; color: #0f172a; margin-bottom: 16px; }
                        .word-docx-rendered-preview table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                        .word-docx-rendered-preview td, .word-docx-rendered-preview th { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                        .word-docx-rendered-preview p { margin: 8px 0; }
                    </style>
                    ${htmlResult}
                </div>`;

        } catch (err) {
            console.error('[WordQuot] Preview error:', err);
            previewContainer.innerHTML = `
                <div class="p-3 border border-red-100 rounded-lg bg-red-50 text-xs text-red-700">
                    <i class="fas fa-exclamation-circle mr-1"></i> Gagal memuat pratinjau teks: ${this.escapeHtml(err.message)}
                </div>`;
        }
    }

    getWordQuotationDraftContent(formData = null) {
        const data = formData || this.getQuotationFormSnapshot();
        const regNo = data.reg_no || data.regNo || 'Auto-generated';
        const cob = data.cob || '-';
        const subCob = data.sub_cob || data.subCob || '-';
        const client = data.client || '-';
        const premium = data.premium || '-';
        const tsi = data.tsi || '-';
        const effectiveDate = data.effective_date || data.effectiveDate || '-';
        const templateName = this.getWordTemplateFileNameForCurrentRisk();

        return `GIBSYSNET - Quotation Draft\n\nTemplate: ${templateName}\nReg Number: ${regNo}\nCOB: ${cob}\nSub COB: ${subCob}\nInsured: ${client}\nEffective Date: ${effectiveDate}\nPremium: ${premium}\nTSI: ${tsi}\n\nThis document is prepared as a DMS draft and can be synced with the backend through the quotation API.`;
    }

    getWordQuotationEditorState() {
        try {
            const raw = localStorage.getItem('quotation_word_editor_state');
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Unable to read quotation editor state:', error);
            return null;
        }
    }

    saveWordQuotationEditorState(content) {
        try {
            const state = this.getQuotationTemplateState() || {};
            const payload = {
                ...state,
                documentContent: content,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('quotation_word_editor_state', JSON.stringify(payload));
            return payload;
        } catch (error) {
            console.warn('Unable to save quotation editor state:', error);
            return null;
        }
    }

    getWordQuotationDocumentContent() {
        const panel = document.getElementById('tab-wordquot');
        if (!panel) return '';
        const editor = panel.querySelector('#dmsDocumentEditor');
        return editor ? editor.value : '';
    }

    bindWordQuotationEditorEvents() {
        const panel = document.getElementById('tab-wordquot');
        if (!panel) return;

        panel.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
            await this.saveWordQuotationDocument();
        });

        panel.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
            const editor = panel.querySelector('#dmsDocumentEditor');
            if (editor) {
                editor.focus();
                editor.setSelectionRange(0, editor.value.length);
            }
        });

        panel.querySelector('[data-action="export"]')?.addEventListener('click', () => {
            this.exportWordQuotationDocument();
        });

        panel.querySelector('[data-action="generate"]')?.addEventListener('click', () => {
            const editor = panel.querySelector('#dmsDocumentEditor');
            if (editor) {
                editor.value = this.getWordQuotationDraftContent(this.getQuotationFormSnapshot());
                this.saveWordQuotationEditorState(editor.value);
            }
        });

        panel.querySelector('#dmsDocumentEditor')?.addEventListener('input', () => {
            this.saveWordQuotationEditorState(this.getWordQuotationDocumentContent());
        });
    }

    async saveWordQuotationDocument(content = this.getWordQuotationDocumentContent()) {
        const payload = {
            quotationId: this.getCurrentQuotationIdFromForm() || null,
            content,
            mode: 'draft',
            formData: this.getQuotationFormSnapshot(),
            savedAt: new Date().toISOString()
        };

        this.saveWordQuotationEditorState(content);

        const endpointCandidates = [
            `${this.quotationApiUrl}/${payload.quotationId || 'draft'}/documents`,
            `${this.quotationApiUrl}/${payload.quotationId || 'draft'}/word`,
            'http://localhost:3001/api/documents',
            'http://localhost:3001/api/quotations/documents'
        ];

        for (const url of endpointCandidates) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    this.showMessage('Document draft saved and synced to the backend when the DMS endpoint is available.');
                    return true;
                }
            } catch (error) {
                console.warn(`Unable to sync document draft to ${url}:`, error);
            }
        }

        this.showMessage('Document draft saved locally. Backend sync will be used when the DMS API endpoint is available.');
        return false;
    }

    exportWordQuotationDocument(content = this.getWordQuotationDocumentContent()) {
        try {
            const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `quotation-draft-${Date.now()}.txt`;
            link.click();
            URL.revokeObjectURL(downloadUrl);

            const printWindow = window.open('', '_blank', 'width=980,height=760');
            if (printWindow) {
                printWindow.document.write(`<!doctype html><html><head><title>Quotation Draft</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;line-height:1.6;}pre{white-space:pre-wrap;}</style></head><body><pre>${this.escapeHtml(content || '')}</pre></body></html>`);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 300);
            }

            this.showMessage('Document draft prepared for export. The browser print dialog can be used to save as PDF.');
        } catch (error) {
            console.warn('Unable to export quotation document:', error);
            this.showMessage('Unable to export the document draft.');
        }
    }

    getWordTemplateFileNameForCurrentRisk() {
        return this.getWordTemplatePathForCurrentRisk().split('/').pop();
    }

    renderWordQuotationEditor() {
        const panel = document.getElementById('tab-wordquot');
        if (!panel) return;

        const editorState = this.getWordQuotationEditorState();
        const formData = this.getQuotationFormSnapshot();
        const draftContent = editorState?.documentContent || this.getWordQuotationDraftContent(formData);
        const quotationId = this.getCurrentQuotationIdFromForm();
        const templatePath = this.getWordTemplatePathForCurrentRisk();
        const templateName = this.getWordTemplateFileNameForCurrentRisk();

        panel.innerHTML = `
            <div class="word-quot-editor-shell">
                <div class="word-quot-topbar">
                    <div class="word-quot-topbar-left">
                        <div class="word-quot-brand">GIBSYSNET</div>
                        <div class="word-quot-status"><span class="dot"></span> Draft</div>
                    </div>
                    <div class="word-quot-topbar-actions">
                        <button type="button" class="word-quot-action-btn word-quot-action-btn-secondary" data-action="save"><i class="fas fa-save"></i> Save</button>
                        <button type="button" class="word-quot-action-btn word-quot-action-btn-primary" data-action="edit"><i class="fas fa-edit"></i> Edit</button>
                        <button type="button" class="word-quot-action-btn word-quot-action-btn-accent" data-action="export"><i class="fas fa-file-export"></i> Export PDF</button>
                    </div>
                </div>

                <div class="word-quot-ribbon">
                    <div class="word-quot-ribbon-item">Home</div>
                    <div class="word-quot-ribbon-item">Insert</div>
                    <div class="word-quot-ribbon-item">Layout</div>
                    <div class="word-quot-ribbon-item">References</div>
                    <div class="word-quot-ribbon-item">Review</div>
                    <div class="word-quot-ribbon-item">View</div>
                </div>

                <div class="word-quot-toolbar">
                    <button type="button"><i class="fas fa-bold"></i></button>
                    <button type="button"><i class="fas fa-italic"></i></button>
                    <button type="button"><i class="fas fa-underline"></i></button>
                    <button type="button"><i class="fas fa-list-ul"></i></button>
                    <button type="button"><i class="fas fa-align-left"></i></button>
                    <button type="button"><i class="fas fa-table"></i></button>
                    <button type="button"><i class="fas fa-image"></i></button>
                </div>

                <div class="word-quot-main">
                    <aside class="word-quot-sidebar">
                        <div class="word-quot-sidebar-card">
                            <h4>INFORMASI</h4>
                            <ul class="word-quot-info-list">
                                <li>Reg Number <span>${this.escapeHtml(formData.reg_no || formData.regNo || '-')}</span></li>
                                <li>COB <span>${this.escapeHtml(formData.cob || '-')}</span></li>
                                <li>SCOB <span>${this.escapeHtml(formData.sub_cob || formData.subCob || '-')}</span></li>
                                <li>Insured <span>${this.escapeHtml(formData.client || '-')}</span></li>
                                <li>Period <span>${this.escapeHtml(formData.effective_date || formData.effectiveDate || '-')}</span></li>
                                <li>Premium <span>${this.escapeHtml(formData.premium || '-')}</span></li>
                                <li>TSI <span>${this.escapeHtml(formData.tsi || '-')}</span></li>
                            </ul>
                        </div>
                        <div class="word-quot-sidebar-card">
                            <h4>Generate</h4>
                            <button type="button" class="word-quot-generate-btn" data-action="generate">Generate Current Content</button>
                        </div>
                        <div class="word-quot-sidebar-card">
                            <h4>Status</h4>
                            <p class="text-sm text-gray-600">${this.escapeHtml(quotationId ? `Quotation ID: ${quotationId}` : 'Draft is ready to be saved to the DMS backend.')}</p>
                        </div>
                    </aside>

                    <section class="word-quot-document-pane">
                        <div class="word-quot-document-header">
                            <div>A4 DOCUMENT</div>
                            <div class="word-quot-document-meta">${this.escapeHtml(quotationId ? `Quotation ${quotationId}` : 'Draft quotation')}</div>
                        </div>
                        <div class="text-xs text-blue-700 font-semibold mb-1">Template aktif: ${this.escapeHtml(templateName)}</div>
                        <div class="text-xs text-gray-500 mb-2">Path: ${this.escapeHtml(templatePath)}</div>
                        <div class="word-quot-document-frame">
                            <div data-role="document-preview" class="space-y-2">
                                <div class="p-3 border border-blue-100 rounded-lg bg-blue-50 text-sm text-blue-700">
                                    <i class="fas fa-file-word mr-2"></i>Previewing ${this.escapeHtml(templateName)}
                                </div>
                                <iframe class="word-quot-preview-frame" src="${this.escapeHtml(templatePath)}"></iframe>
                            </div>
                            <textarea id="dmsDocumentEditor" class="word-quot-editor-textarea mt-3">${this.escapeHtml(draftContent)}</textarea>
                        </div>
                    </section>
                </div>
            </div>`;

        this.bindWordQuotationEditorEvents();
    }

    openWordQuotationTemplate() {
        this.saveQuotationTemplateState();
        const templatePath = this.getWordTemplatePathForCurrentRisk();
        const templateName = this.getWordTemplateFileNameForCurrentRisk();

        this.renderWordQuotationEditor();
        this.openWordTemplateInEditor(templatePath);

        if (this.quotClientStatus) {
            this.quotClientStatus.innerHTML = `
                <div class="text-blue-700">
                    <i class="fas fa-check-circle mr-2"></i>${this.escapeHtml(templateName)} opened for ${this.escapeHtml(this.getRiskTemplateTypeFromSelection() === 'property' ? 'Property Risk' : 'Vehicle Risk')}.
                </div>`;
        }
    }

    openQuotationClientDocument() {
        this.saveQuotationTemplateState();
        this.openWordDocument();

        if (this.quotClientStatus) {
            this.quotClientStatus.innerHTML = `
                <div class="text-blue-700">
                    <i class="fas fa-check-circle mr-2"></i>Template QSMV.docx sudah dibuka.
                </div>`;
        }
    }

    async initializeData() {
        try {
            this.quotations = await this.loadQuotationsFromBackend();
        } catch (error) {
            console.error('Failed to load quotations from backend:', error);
            this.quotations = [];
            this.showMessage('Unable to load quotations from backend.');
        }

        this.renderAll();
        this.updateRiskTabState();
    }

    getQuotationApiCandidates() {
        // FIXED: Only single endpoint on port 3001, no fallback
        return ['http://localhost:3001/api/quotations'];
    }

    async loadQuotationsFromBackend() {
        // FIXED: Backend on port 3001 only
        const primaryUrl = 'http://localhost:3001/api/quotations';
        const response = await fetch(primaryUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load quotations: ${response.status}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        return rows.map((row) => this.mapQuotationRowToRecord(row));
    }

    mapQuotationRowToRecord(row) {
        // Helper function to safely parse JSON arrays
        const parseJsonArray = (value) => {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    return [];
                }
            }
            return [];
        };

        return {
            id: String(row.quotation_id ?? row.id ?? row.quotationId ?? ''),
            cob: row.cob ?? '',
            subCob: row.sub_cob ?? row.subCob ?? '',
            quotationYear: row.quotation_year ?? row.quotationYear ?? '',
            regNo: row.reg_no ?? row.regNo ?? '',
            endors: row.endors ?? '',
            client: row.client ?? '',
            clientQQ: row.client_qq ?? row.clientQQ ?? '',
            address: row.address ?? '',
            marketing: row.marketing ?? '',
            agent: row.agent ?? '',
            paymentType: row.payment_type ?? row.paymentType ?? '',
            accept: row.accept_status ?? row.accept ?? '',
            periode: row.periode ?? '',
            conversionTo: row.conversion_to ?? row.conversionTo ?? '',
            currency: row.currency ?? '',
            rate: row.rate ?? 0,
            policyNo: row.policy_no ?? row.policyNo ?? '',
            effectiveDate: row.effective_date ?? row.effectiveDate ?? '',
            wpcClient: row.wpc_client ?? row.wpcClient ?? '',
            quotationLate: row.quotation_late ?? row.quotationLate ?? '',
            closingStatus: row.closing_status ?? row.closingStatus ?? '',
            status: row.quotation_status ?? row.status ?? '',
            premium: row.premium ?? 0,
            tsi: row.tsi ?? 0,
            rateType: row.rate_type ?? row.rateType ?? '',
            endorsNota: row.endors_nota ?? row.endorsNota ?? '',
            wpcInsurance: row.wpc_insurance ?? row.wpcInsurance ?? '',
            statusRecord: row.status_record ?? row.statusRecord ?? 'active',
            isDeleted: Number(row.is_deleted ?? row.isDeleted ?? 0) === 1,
            deletedReason: row.deleted_reason ?? row.deletedReason ?? '',
            userEntry: row.user_entry ?? row.userEntry ?? '',
            entryDate: row.entry_date ?? row.entryDate ?? '',
            userUpdate: row.user_update ?? row.userUpdate ?? '',
            updateDate: row.update_date ?? row.updateDate ?? '',
            userClose: row.user_close ?? row.userClose ?? '',
            closeDate: row.close_date ?? row.closeDate ?? '',
            createdBy: row.created_by ?? row.createdBy ?? '',
            createdAt: row.created_at ?? row.createdAt ?? '',
            updatedBy: row.updated_by ?? row.updatedBy ?? '',
            updatedAt: row.updated_at ?? row.updatedAt ?? '',
            deletedBy: row.deleted_by ?? row.deletedBy ?? '',
            deletedAt: row.deleted_at ?? row.deletedAt ?? '',
            installments: parseJsonArray(row.installments ?? row.installments),
            coinsurances: parseJsonArray(row.coinsurances ?? row.coinsurances),
            coInsurance: row.co_insurance ?? row.coInsurance ?? 'No',
            insCompanySingle: row.ins_company_single ?? row.insCompanySingle ?? '',
            insPremi: row.ins_premi ?? row.insPremi ?? 0,
            insBiayaPolis: row.ins_biaya_polis ?? row.insBiayaPolis ?? 0,
            insMaterai: row.ins_materai ?? row.insMaterai ?? 0,
            insDiskonPct: row.ins_diskon_pct ?? row.insDiskonPct ?? 0,
            insDiskon: row.ins_diskon ?? row.insDiskon ?? 0,
            insBrokeragePct: row.ins_brokerage_pct ?? row.insBrokeragePct ?? 0,
            insBrokerage: row.ins_brokerage ?? row.insBrokerage ?? 0,
            insPphPct: row.ins_pph_pct ?? row.insPphPct ?? 0,
            insPph: row.ins_pph ?? row.insPph ?? 0,
            insPpnPct: row.ins_ppn_pct ?? row.insPpnPct ?? 0,
            insPpnMode: row.ins_ppn_mode ?? row.insPpnMode ?? '',
            insPpn: row.ins_ppn ?? row.insPpn ?? 0,
            insTotalPayable: row.ins_total_payable ?? row.insTotalPayable ?? 0,
            insPremiNet: row.ins_premi_net ?? row.insPremiNet ?? 0
        };
    }

    mapFormPayloadToQuotationBody(payload, statusRecord = 'active') {
        const normalizedStatus = String(payload.status || payload.quotation_status || '').trim();
        const normalizedQuotationId = String(payload.id || payload.quotation_id || '').trim();
        const normalizedRegNo = String(payload.regNo || payload.reg_no || '').trim();

        return {
            quotation_id: normalizedQuotationId,
            reg_no: normalizedRegNo,
            cob: payload.cob || '',
            sub_cob: payload.subCob || payload.sub_cob || '',
            quotation_year: payload.quotationYear || payload.quotation_year || '',
            endors: payload.endors || '',
            client: payload.client || '',
            client_qq: payload.clientQQ || payload.client_qq || '',
            address: payload.address || '',
            marketing: payload.marketing || '',
            agent: payload.agent || '',
            payment_type: payload.paymentType || payload.payment_type || '',
            accept_status: payload.accept || payload.accept_status || '',
            inception_date: payload.inceptionDate || payload.inception_date || '',
            expiry_date: payload.expiryDate || payload.expiry_date || '',
            periode: payload.periode || '',
            conversion_to: payload.conversionTo || payload.conversion_to || '',
            currency: payload.currency || '',
            rate: payload.rate || 0,
            policy_no: payload.policyNo || payload.policy_no || '',
            effective_date: payload.effectiveDate || payload.effective_date || '',
            wpc_client: payload.wpcClient || payload.wpc_client || '',
            quotation_late: payload.quotationLate || payload.quotation_late || '',
            closing_status: payload.closingStatus || payload.closing_status || '',
            quotation_status: normalizedStatus,
            premium: payload.premium || 0,
            tsi: payload.tsi || 0,
            rate_type: payload.rateType || payload.rate_type || '',
            endors_nota: payload.endorsNota || payload.endors_nota || '',
            wpc_insurance: payload.wpcInsurance || payload.wpc_insurance || '',
            status_record: statusRecord,
            is_deleted: statusRecord !== 'active' ? 1 : 0,
            deleted_reason: payload.deletedReason || payload.deleted_reason || '',
            user_entry: payload.userEntry || payload.user_entry || '',
            entry_date: payload.entryDate || payload.entry_date || '',
            user_update: payload.userUpdate || payload.user_update || '',
            update_date: payload.updateDate || payload.update_date || '',
            user_close: payload.userClose || payload.user_close || '',
            close_date: payload.closeDate || payload.close_date || '',
            created_by: payload.createdBy || payload.created_by || '',
            updated_by: payload.updatedBy || payload.updated_by || '',
            deleted_by: payload.deletedBy || payload.deleted_by || '',
            created_at: payload.createdAt || payload.created_at || '',
            updated_at: payload.updatedAt || payload.updated_at || '',
            // Insurance and installment data stored as JSON
            co_insurance: payload.coInsurance || 'No',
            ins_company_single: payload.insCompanySingle || '',
            ins_premi: payload.insPremi || 0,
            ins_biaya_polis: payload.insBiayaPolis || 0,
            ins_materai: payload.insMaterai || 0,
            ins_diskon_pct: payload.insDiskonPct || 0,
            ins_diskon: payload.insDiskon || 0,
            ins_brokerage_pct: payload.insBrokeragePct || 0,
            ins_brokerage: payload.insBrokerage || 0,
            ins_pph_pct: payload.insPphPct || 0,
            ins_pph: payload.insPph || 0,
            ins_ppn_pct: payload.insPpnPct || 0,
            ins_ppn_mode: payload.insPpnMode || '',
            ins_ppn: payload.insPpn || 0,
            ins_total_payable: payload.insTotalPayable || 0,
            ins_premi_net: payload.insPremiNet || 0,
            installments: JSON.stringify(payload.installments || []),
            coinsurances: JSON.stringify(payload.coinsurances || [])
        };
    }

    async postQuotationWithSchemaFallback(initialBody) {
        let body = { ...initialBody };
        const maxAttempts = 8;
        // FIXED: Backend on port 3001 only
        const primaryUrl = 'http://localhost:3001/api/quotations';

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                const response = await fetch(primaryUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                const responsePayload = await response.json().catch(() => ({}));
                if (response.ok) {
                    return { responsePayload, body };
                }

                const message = String(responsePayload?.message || responsePayload?.error || `Failed to save quotation: ${response.status}`);
                const unknownColumnMatch = message.match(/Unknown column '([^']+)' in 'field list'/i);
                const unknownColumn = unknownColumnMatch?.[1];

                if (!unknownColumn || !(unknownColumn in body)) {
                    throw new Error(message);
                }

                delete body[unknownColumn];
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
            }
        }

        throw new Error('Failed to save quotation: payload does not match backend columns');
    }

    async putQuotationWithSchemaFallback(initialBody, quotationId) {
        let body = { ...initialBody };
        const maxAttempts = 8;
        const normalizedQuotationId = String(quotationId || body.quotation_id || '').trim();
        if (!normalizedQuotationId) {
            throw new Error('Failed to update quotation: quotation_id is required');
        }

        // FIXED: Backend on port 3001 only
        const primaryUrl = `http://localhost:3001/api/quotations/update/${encodeURIComponent(normalizedQuotationId)}`;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                const response = await fetch(primaryUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                const responsePayload = await response.json().catch(() => ({}));
                if (response.ok) {
                    return { responsePayload, body };
                }

                const message = String(responsePayload?.message || responsePayload?.error || `Failed to update quotation: ${response.status}`);
                const unknownColumnMatch = message.match(/Unknown column '([^']+)' in 'field list'/i);
                const unknownColumn = unknownColumnMatch?.[1];

                if (!unknownColumn || !(unknownColumn in body)) {
                    throw new Error(message);
                }

                delete body[unknownColumn];
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
            }
        }

        throw new Error('Failed to update quotation: payload does not match backend columns');
    }

    async saveQuotationToBackend(payload, statusRecord = 'active') {
        const initialBody = this.mapFormPayloadToQuotationBody(payload, statusRecord);
        const quotationId = String(payload.id || payload.quotation_id || '').trim();
        const useUpdateEndpoint = Boolean(quotationId) && !payload.isNew;
        const { responsePayload, body } = useUpdateEndpoint
            ? await this.putQuotationWithSchemaFallback(initialBody, quotationId)
            : await this.postQuotationWithSchemaFallback(initialBody);

        const savedQuotationId = String(responsePayload.quotation_id ?? body.quotation_id ?? quotationId ?? '').trim();
        const savedRecord = {
            ...payload,
            id: savedQuotationId,
            statusRecord,
            isDeleted: statusRecord !== 'active'
        };

        if (!savedRecord.regNo && responsePayload.reg_no) {
            savedRecord.regNo = responsePayload.reg_no;
        }

        return savedRecord;
    }

    loadVersions() {
        try {
            const data = localStorage.getItem(this.versionKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    }

    persistVersions() {
        localStorage.setItem(this.versionKey, JSON.stringify(this.versions));
    }

    showLoading(show) {
        if (!this.loadingIndicator) return;
        this.loadingIndicator.classList.toggle('hidden', !show);
    }

    generateRecordId() {
        return `QUOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    getCurrentUserName() {
        try {
            const userData = localStorage.getItem('gibsysnet_user');
            if (!userData) return 'Administrator';

            const user = JSON.parse(userData);
            return (user?.full_name || user?.username || user?.email || 'Administrator').toString().trim();
        } catch (error) {
            return 'Administrator';
        }
    }

    getTodayDateValue() {
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 10);
    }

    configureAuditFields() {
        const auditFields = [
            this.userEntry,
            this.entryDate,
            this.userUpdate,
            this.updateDate,
            this.userClose,
            this.closeDate
        ];

        auditFields.forEach((field) => {
            if (!field) return;
            field.readOnly = true;
            field.setAttribute('readonly', 'readonly');
        });
    }

    initializeLookups() {
        this.loadCobLookupData();
        this.loadPartnerLookupData();
        this.loadCurrencyLookupData();
        this.populateTypeInsOptions();
        this.populateCobOptions();
        this.populateSubCobOptions('');
        this.populatePartnerOptions();
        this.populateCurrencyOptions();
        this.updateQuotationYearFromIssueDate();
        this.autoGenerateRegNo();

        // Keep local data as fallback, then hydrate from database endpoint when available.
        this.refreshCobLookupFromDatabase();
        this.refreshPartnerLookupFromDatabase();
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

    loadCobLookupData() {
        const rows = this.parseStorageArray(this.cobLookupKey);
        const normalized = this.normalizeCobProducts(rows);

        if (normalized.length) {
            this.cobProducts = normalized;
            return;
        }

        if (Array.isArray(this.cobProducts) && this.cobProducts.length) return;

        this.cobProducts = [
            { cob: 'MOT', cobName: 'Motor', subCob: 'Comprehensive', subCobName: 'Comprehensive', typeLabel: 'General Insurance' },
            { cob: 'MOT', cobName: 'Motor', subCob: 'Total Loss Only (TLO)', subCobName: 'Total Loss Only (TLO)', typeLabel: 'General Insurance' },
            { cob: 'MAR', cobName: 'Marine', subCob: 'Marine Cargo', subCobName: 'Marine Cargo', typeLabel: 'General Insurance' },
            { cob: 'PROP', cobName: 'Property', subCob: 'Fire Insurance', subCobName: 'Fire Insurance', typeLabel: 'General Insurance' },
            { cob: 'IL', cobName: 'Individual Life', subCob: 'Term Life', subCobName: 'Term Life', typeLabel: 'Life Insurance' }
        ];
    }

    getCobProductsEndpointCandidates() {
        const fromWindowConfig = String(window?.GibsyNetApi?.endpoints?.cob || window?.GIBSYSNET_API?.COB_PRODUCTS_ENDPOINT || '').trim();
        const candidates = [fromWindowConfig, 'http://localhost:3001/api/cob'].filter(Boolean);

        return Array.from(new Set(candidates));
    }

    normalizeCobProducts(rows = []) {
        if (!Array.isArray(rows)) return [];

        const normalizedRows = rows
            .map((item) => {
                if (!item || typeof item !== 'object') return null;

                const status = String(item.status ?? item.record_status ?? '').trim().toLowerCase();
                if (status === 'inactive') return null;

                // cob code: prefer item.cob (code stored by cob.js), fallback to other API fields
                const cobValue = String(
                    item.cob
                    ?? item.cob_code
                    ?? item.cob_id
                    ?? item.cob_name
                    ?? ''
                ).trim();

                // cob display name: prefer cobName (stored by cob.js), fallback to cob_name from API
                const cobDisplayName = String(
                    item.cobName
                    ?? item.cob_name
                    ?? cobValue
                ).trim();

                const subCobValue = String(
                    item.subCob
                    ?? item.sub_cob
                    ?? item.sub_cob_name
                    ?? item.sub_cob_code
                    ?? item.subcob
                    ?? ''
                ).trim();

                if (!cobValue) return null;

                const typeLabelVal = String(
                    item.typeLabel
                    ?? item.type_label
                    ?? (item.type === 'LI' || item.cob_type === 'LI' ? 'Life Insurance' : (item.type === 'GI' || item.cob_type === 'GI' ? 'General Insurance' : ''))
                ).trim();

                return {
                    cob: cobValue,
                    cobName: cobDisplayName || cobValue,
                    subCob: subCobValue,
                    subCobName: subCobValue,
                    typeLabel: typeLabelVal || (cobValue === 'IL' ? 'Life Insurance' : 'General Insurance')
                };
            })
            .filter(Boolean);

        const seen = new Set();
        return normalizedRows.filter((item) => {
            const key = `${item.cob}::${item.subCob}`;
            if (seen.has(key)) return false;
            seen.add(key);
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
                // Continue to the next candidate endpoint.
            }
        }

        return null;
    }

    async refreshCobLookupFromDatabase() {
        const selectedCob = this.cob?.value || '';
        const selectedSubCob = this.subCob?.value || '';
        const rowsFromDatabase = await this.fetchCobProductsFromDatabase();

        if (!rowsFromDatabase) return;

        this.cobProducts = rowsFromDatabase;
        try {
            localStorage.setItem(this.cobLookupKey, JSON.stringify(rowsFromDatabase));
        } catch (e) {
            console.warn('Failed to persist cob products to localStorage:', e);
        }
        const cobEntry = this.cobProducts.find(item => item.cob === selectedCob);
        const resolvedTypeLabel = cobEntry ? cobEntry.typeLabel : (this.typeIns?.value || '');
        this.populateTypeInsOptions(resolvedTypeLabel);
        this.populateCobOptions(selectedCob);

        const cobValue = this.cob?.value || selectedCob;
        this.populateSubCobOptions(cobValue, selectedSubCob);
        this.autoGenerateRegNo();
    }

    loadPartnerLookupData(rows = null) {
        const sourceRows = Array.isArray(rows) ? rows : this.parseStorageArray(this.partnerLookupKey);

        this.partnerRows = Array.isArray(sourceRows)
            ? sourceRows
                .filter((item) => item && item.status !== 'inactive')
                .map((item) => ({
                    partnerId: String(item.partnerId || item.partner_id || item.partnerid || '').trim(),
                    name: String(item.name || '').trim(),
                    category: String(item.category || '').trim().toLowerCase(),
                    address: String(item.address ?? '').trim(),
                    city: String(item.city ?? '').trim(),
                    province: String(item.province ?? '').trim(),
                    postalCode: String(item.postal_code ?? item.postalCode ?? '').trim()
                }))
                .filter((item) => item.name)
            : [];

        if (this.partnerRows.length) return;

        this.partnerRows = [
            { partnerId: 'IND-CLI-001', name: 'Budi Santoso', category: 'client' },
            { partnerId: 'COR-AGT-001', name: 'PT Nusantara Broker', category: 'agent' }
        ];
    }

    async fetchPartnerRowsFromDatabase() {
        const endpoint = window.GibsyNetApi?.endpoints?.partners || 'http://localhost:3001/api/partners';
        console.debug('[Partner Lookup] fetching from backend:', endpoint);
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            console.debug('[Partner Lookup] backend response status:', response.status);
            if (!response.ok) {
                throw new Error(`Failed to load partners from backend: ${response.status}`);
            }

            const payload = await response.json();
            const rows = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.partners)
                        ? payload.partners
                        : [];

            console.debug('[Partner Lookup] backend rows count:', rows.length);
            return rows;
        } catch (error) {
            console.warn('Partner lookup refresh failed:', error.message);
            return [];
        }
    }

    async refreshPartnerLookupFromDatabase() {
        const rows = await this.fetchPartnerRowsFromDatabase();
        if (!Array.isArray(rows) || !rows.length) {
            console.debug('[Partner Lookup] no backend rows available, keeping existing lookup values.');
            return;
        }

        try {
            localStorage.setItem(this.partnerLookupKey, JSON.stringify(rows));
        } catch (err) {
            console.warn('[Partner Lookup] failed to persist backend rows to localStorage:', err);
        }

        this.loadPartnerLookupData(rows);
        this.populatePartnerOptions();
    }

    loadCurrencyLookupData() {
        const rows = this.parseStorageArray(this.currencyLookupKey);
        this.currencyRows = rows
            .filter((item) => item && item.status !== 'inactive')
            .map((item) => {
                const id = String(item.currency_id || item.code || item.id || '').trim().toUpperCase();
                const name = String(item.currency_name || item.name || '').trim();
                return {
                    id,
                    label: name ? `${id} - ${name}` : id
                };
            })
            .filter((item) => item.id);

        if (this.currencyRows.length) return;

        this.currencyRows = [
            { id: 'IDR', label: 'IDR - Indonesian Rupiah' },
            { id: 'USD', label: 'USD - United States Dollar' }
        ];
    }

    uniqueByValue(items = []) {
        const map = new Map();
        items.forEach((item) => {
            const value = String(item.value || '').trim();
            if (!value || map.has(value)) return;
            map.set(value, item.label || value);
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }

    rebuildSelectOptions(selectElement, options = [], placeholder = '-- Select --', selectedValue = '') {
        if (!selectElement) return;

        const selected = String(selectedValue || '').trim();
        const uniqueOptions = this.uniqueByValue(options);
        let html = `<option value="">${this.escapeHtml(placeholder)}</option>`;

        uniqueOptions.forEach((item) => {
            const isSelected = selected && item.value === selected;
            html += `<option value="${this.escapeHtml(item.value)}"${isSelected ? ' selected' : ''}>${this.escapeHtml(item.label)}</option>`;
        });

        if (selected && !uniqueOptions.some((item) => item.value === selected)) {
            html += `<option value="${this.escapeHtml(selected)}" selected>${this.escapeHtml(selected)}</option>`;
        }

        selectElement.innerHTML = html;
    }

    populateTypeInsOptions(selectedValue = '') {
        const uniqueTypes = Array.from(new Set(this.cobProducts.map(p => p.typeLabel).filter(Boolean)));
        const options = uniqueTypes.map(type => ({ value: type, label: type }));
        this.rebuildSelectOptions(this.typeIns, options, '-- Select Type Ins. --', selectedValue);
    }

    populateCobOptions(selectedCob = '') {
        const selectedType = this.typeIns?.value || '';
        const filteredCobProducts = selectedType
            ? this.cobProducts.filter(item => item.typeLabel === selectedType)
            : this.cobProducts;

        const options = filteredCobProducts.map((item) => ({ value: item.cob, label: item.cobName || item.cob }));
        this.rebuildSelectOptions(this.cob, options, '-- Select COB (Lookup) --', selectedCob);
    }

    async populateSubCobOptions(cobValue = '', selectedSubCob = '') {
        const selectedCob = String(cobValue || '').trim();

        // Reset Sub COB dropdown saat COB belum dipilih
        if (!selectedCob) {
            this.rebuildSelectOptions(this.subCob, [], '-- Select Sub COB (Lookup) --', '');
            if (this.subCobName) this.subCobName.value = '';
            return;
        }

        try {
            const apiBase = this.quotationApiUrl.replace('/api/quotations', '');
            const res = await fetch(`${apiBase}/api/sub-cob?cob_code=${encodeURIComponent(selectedCob)}`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const payload = await res.json();
            const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);

            const options = rows.map((item) => ({
                value: item.sub_cob_code || item.sub_cob_name || '',
                label: item.sub_cob_name || item.sub_cob_code || ''
            })).filter((o) => o.value);

            this.rebuildSelectOptions(this.subCob, options, '-- Select Sub COB (Lookup) --', selectedSubCob);

            // Update sub_cob_name readonly field
            if (this.subCobName) {
                const matched = rows.find((r) =>
                    (r.sub_cob_code || r.sub_cob_name) === (this.subCob?.value || '')
                );
                this.subCobName.value = matched ? (matched.sub_cob_name || '') : '';
            }
        } catch (err) {
            console.warn('[SubCOB] Gagal fetch dari API, fallback ke data lokal:', err.message);
            // Fallback: filter dari cobProducts (data lokal/hardcoded)
            const options = this.cobProducts
                .filter((item) => item.cob === selectedCob)
                .map((item) => ({ value: item.subCob, label: item.subCobName || item.subCob }))
                .filter((item) => item.value);
            this.rebuildSelectOptions(this.subCob, options, '-- Select Sub COB (Lookup) --', selectedSubCob);
        }
    }

    getPartnerOptionsByCategory(category = '') {
        const categoryNormalized = this.normalizePartnerCategory(category);
        const filtered = this.partnerRows.filter((item) => {
            if (!categoryNormalized) return true;
            return this.normalizePartnerCategory(item.category) === categoryNormalized;
        });

        return filtered.map((item) => ({
            value: item.name,
            label: item.name
        }));
    }

    normalizePartnerCategory(category = '') {
        const normalized = String(category || '').trim().toLowerCase();
        if (normalized === 'agen') return 'agent';
        return normalized;
    }

    populatePartnerOptions(selected = {}) {
        const clientOptions = this.getPartnerOptionsByCategory('client');
        const marketingOptions = this.getPartnerOptionsByCategory('marketing');
        const agentOptions = this.getPartnerOptionsByCategory('agent');

        this.rebuildSelectOptions(
            this.client,
            clientOptions,
            '-- Select Client (Lookup) --',
            selected.client || ''
        );

        this.rebuildSelectOptions(
            this.marketing,
            marketingOptions,
            '-- Select Marketing (Lookup) --',
            selected.marketing || ''
        );

        this.rebuildSelectOptions(
            this.agent,
            agentOptions,
            '-- Select Agent (Lookup) --',
            selected.agent || ''
        );
    }

    populateCurrencyOptions(selectedCurrency = '') {
        const options = this.currencyRows.map((item) => ({ value: item.id, label: item.label }));
        const resolvedSelection = String(selectedCurrency || this.currency?.value || '').trim() || 'IDR';
        this.rebuildSelectOptions(this.currency, options, '-- Select Currency (Lookup) --', resolvedSelection);
    }

    getIssueDateParts() {
        const fallbackDate = new Date();
        const sourceDate = this.effectiveDate?.value ? new Date(this.effectiveDate.value) : fallbackDate;
        const finalDate = Number.isNaN(sourceDate.getTime()) ? fallbackDate : sourceDate;
        const year = String(finalDate.getFullYear());
        const month = String(finalDate.getMonth() + 1).padStart(2, '0');

        return {
            year,
            month,
            yearMonth: `${year}${month}`
        };
    }

    parseDateValue(value) {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    formatDateInputValue(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    addDaysToDateValue(dateValue, daysToAdd) {
        const sourceDate = this.parseDateValue(dateValue);
        if (!sourceDate) return '';
        sourceDate.setDate(sourceDate.getDate() + Number(daysToAdd || 0));
        return this.formatDateInputValue(sourceDate);
    }

    addYearsToDateValue(dateValue, yearsToAdd) {
        const sourceDate = this.parseDateValue(dateValue);
        if (!sourceDate) return '';
        sourceDate.setFullYear(sourceDate.getFullYear() + Number(yearsToAdd || 0));
        return this.formatDateInputValue(sourceDate);
    }

    getQuotationCreationDateValue() {
        const creationDate = this.parseDateValue(this.currentQuotationCreatedAt)
            || this.parseDateValue(this.entryDate?.value || '')
            || this.parseDateValue(this.getTodayDateValue());
        return creationDate ? this.formatDateInputValue(creationDate) : this.getTodayDateValue();
    }

    getQuotationLateValue() {
        const creationDate = this.parseDateValue(this.getQuotationCreationDateValue());
        if (!creationDate) return '00';

        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - creationDate.getTime());
        const diffDays = Math.floor(diffMs / 86400000);
        return String(diffDays).padStart(2, '0');
    }

    syncAutoQuotationFields(force = false) {
        if (this.endors && (force || !this.manualFieldOverrides.endors)) {
            this.endors.value = (this.endors.value || '').trim() || '00';
        }

        if (this.quotationLate && (force || !this.manualFieldOverrides.quotationLate)) {
            this.quotationLate.value = this.getQuotationLateValue();
        }

        const effectiveDateValue = (this.effectiveDate?.value || '').trim();
        if (this.wpcClient && (force || !this.manualFieldOverrides.wpcClient)) {
            this.wpcClient.value = effectiveDateValue ? this.addDaysToDateValue(effectiveDateValue, 14) : '';
        }

        if (this.wpcInsurance && (force || !this.manualFieldOverrides.wpcInsurance)) {
            this.wpcInsurance.value = effectiveDateValue ? this.addDaysToDateValue(effectiveDateValue, 30) : '';
        }

        const inceptionDateValue = (this.periode?.value || '').trim();
        if (this.conversionTo && (force || !this.manualFieldOverrides.conversionTo)) {
            this.conversionTo.value = inceptionDateValue ? this.addYearsToDateValue(inceptionDateValue, 1) : '';
        }
    }

    toCodeSegment(text, fallback = 'GEN') {
        const cleaned = String(text || '').toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').trim();
        if (!cleaned) return fallback;

        const parts = cleaned.split(/\s+/).filter(Boolean);
        if (!parts.length) return fallback;
        if (parts.length === 1) return parts[0].slice(0, 3);

        return parts.map((part) => part[0]).join('').slice(0, 3) || fallback;
    }

    updateQuotationYearFromIssueDate() {
        if (!this.quotationYear) return;
        const issue = this.getIssueDateParts();
        this.quotationYear.value = issue.year;
    }

    generateRegNo() {
        const cobValue = String(this.cob?.value || 'GEN').trim().toUpperCase();
        const cobCode = cobValue.slice(-3);
        const issue = this.getIssueDateParts();
        const prefix = `QS-${cobCode}-${issue.year}`;

        const maxSequence = this.quotations.reduce((max, item) => {
            const regNo = String(item.regNo || '').trim();
            if (!regNo.startsWith(`${prefix}-`)) return max;
            const parts  = regNo.split('-');
            const parsed = Number(parts[parts.length - 1]);
            if (!Number.isFinite(parsed)) return max;
            return Math.max(max, parsed);
        }, 0);

        const nextSequence = String(maxSequence + 1).padStart(4, '0');
        return `${prefix}-${nextSequence}`;
    }

    autoGenerateRegNo() {
        if (!this.regNo) return;
        const currentId  = (this.quotationId?.value || '').trim();
        const currentRegNo = (this.regNo.value || '').trim();

        // Allow update if: no ID yet, or the current regNo is still a temporary placeholder (QS-YEAR-XXXX without COB code)
        const isTempRegNo = /^QS-\d{4}-\d+$/.test(currentRegNo);
        if (currentId && !isTempRegNo) return;   // editing existing saved record — don't overwrite

        const cobValue = String(this.cob?.value || '').trim();
        if (!cobValue) {
            if (!currentId) this.regNo.value = '';
            return;
        }

        this.regNo.value = this.generateRegNo();
    }

    async handleCobSelectionChange() {
        const selectedCob = this.cob?.value || '';
        await this.populateSubCobOptions(selectedCob);
        this.autoGenerateRegNo();
        this._riskDetailLoaded = null; // reset so content reloads on COB change
    }

    /* ── Risk Tab dynamic loading ───────────────────────────────── */

    isBasicInfoComplete() {
        const v = (id) => (document.getElementById(id)?.value || '').trim();
        return !!(v('cob') && v('subCob') && v('client') && v('status') && v('effectiveDate'));
    }

    isCurrentQuotationSaved() {
        return !!this.getCurrentWorkingQuotation();
    }

    getCurrentQuotationIdFromForm() {
        const idValue = (this.quotationId?.value || '').trim();
        if (idValue) {
            return idValue;
        }

        const currentRecord = this.getCurrentWorkingQuotation();
        return currentRecord?.id ? String(currentRecord.id).trim() : '';
    }

    getCurrentWorkingQuotation() {
        const currentId = (this.quotationId?.value || '').trim();
        if (currentId) {
            const byId = this.quotations.find((item) => item.id === currentId && item.statusRecord !== 'inactive');
            if (byId) return byId;
        }

        const currentRegNo = (this.regNo?.value || '').trim().toLowerCase();
        if (!currentRegNo) return null;

        return this.quotations.find((item) => (
            item.statusRecord !== 'inactive' &&
            String(item.regNo || '').trim().toLowerCase() === currentRegNo
        )) || null;
    }

    isRiskTabUnlocked() {
        return this.isBasicInfoComplete() && this.isCurrentQuotationSaved();
    }

    updateRiskTabState() {
        const btn = document.getElementById('tab-risk-btn');
        if (!btn) return;
        // Always enable the Risk tab button
        btn.classList.remove('disabled');
        btn.title = '';
        // Lock fields in risk tab unless New has been clicked.
        this.lockRiskFields(!this.isNewClicked);
    }

    lockRiskFields(lock) {
        const riskPanel = document.getElementById('tab-risk');
        if (!riskPanel) return;
        const inputs = riskPanel.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (lock) {
                input.setAttribute('disabled', 'disabled');
            } else {
                input.removeAttribute('disabled');
            }
        });
    }

    isRiskTabActive() {
        const riskBtn = document.getElementById('tab-risk-btn');
        return !!riskBtn && riskBtn.classList.contains('active');
    }

    getRiskTemplateTypeFromSelection() {
        if (this.activeRiskTemplateType === 'property') return 'property';
        if (this.activeRiskTemplateType === 'vehicle') return 'vehicle';

        const cobVal = String(this.cob?.value || '').trim();
        const cobEntry = this.cobProducts.find((item) => item.cob === cobVal);
        const cobLabel = String(cobEntry?.cobName || cobVal).toLowerCase();
        const subCobCode = String(this.subCob?.value || '').trim().toLowerCase();
        const subCobLabel = String(this.subCobName?.value || '').trim().toLowerCase();
        const codeUpper = cobVal.toUpperCase();

        const isMotor = ['MOT', 'MOTOR', 'KEND'].includes(codeUpper)
            || /motor|vehicle|kendaraan/i.test(cobLabel)
            || /motor|vehicle|kendaraan/i.test(subCobCode)
            || /motor|vehicle|kendaraan/i.test(subCobLabel);
        const isProperty = ['PROP', 'FIRE'].includes(codeUpper)
            || /property|properti|fire/i.test(cobLabel)
            || /property|properti|fire/i.test(subCobCode)
            || /property|properti|fire/i.test(subCobLabel);

        if (isMotor) return 'vehicle';
        if (isProperty) return 'property';
        return null;
    }

    getWordTemplatePathForCurrentRisk() {
        const riskType = this.getRiskTemplateTypeFromSelection();
        if (riskType === 'property') return 'template/QSPRO.docx';
        return 'template/QSMV.docx';
    }

    loadRiskTabContent(cobVal) {
        // Resolve display name alongside code for flexible matching
        const cobEntry  = this.cobProducts.find((item) => item.cob === cobVal);
        const cobLabel  = String(cobEntry?.cobName || cobVal).toLowerCase();
        const subCobCode = String(this.subCob?.value || '').trim().toLowerCase();
        const subCobLabel = String(this.subCobName?.value || '').trim().toLowerCase();
        const codeUpper = cobVal.toUpperCase();
        const riskKey = `${cobVal}|${this.subCob?.value || ''}`;

        let srcFile = null;
        // Motor: code MOT / MOTOR / KEND, or display name contains "motor" / "vehicle" / "kendaraan"
        const isMotor = ['MOT', 'MOTOR', 'KEND'].includes(codeUpper)
            || /motor|vehicle|kendaraan/i.test(cobLabel)
            || /motor|vehicle|kendaraan/i.test(subCobCode)
            || /motor|vehicle|kendaraan/i.test(subCobLabel);
        // Property: code PROP / FIRE, or display name contains "property" / "fire" / "properti"
        const isProperty = ['PROP', 'FIRE'].includes(codeUpper)
            || /property|properti|fire/i.test(cobLabel)
            || /property|properti|fire/i.test(subCobCode)
            || /property|properti|fire/i.test(subCobLabel);
        // Vessel / Marine Hull: code VESSEL / HULL / MAR / MARINE, or display name contains vessel/hull/marine
        const isVessel = ['VESSEL', 'HULL', 'MAR', 'MARINE'].includes(codeUpper)
            || /vessel|hull|marine|ship/i.test(cobLabel)
            || /vessel|hull|marine|ship/i.test(subCobCode)
            || /vessel|hull|marine|ship/i.test(subCobLabel);
        // Employee Benefit / Health: code HLT / HEALTH / EMP / BENEFIT / EB, or display name contains health/employee benefit
        const isHealth = ['HLT', 'HEALTH', 'EMP', 'BENEFIT', 'EB'].includes(codeUpper)
            || /health|employee benefit|benefit/i.test(cobLabel)
            || /health|employee benefit|benefit/i.test(subCobCode)
            || /health|employee benefit|benefit/i.test(subCobLabel);

        if (isMotor) {
            srcFile = 'riskvehicle.html';
            this.activeRiskTemplateType = 'vehicle';
        } else if (isProperty) {
            srcFile = 'riskproperty.html';
            this.activeRiskTemplateType = 'property';
        } else if (isVessel) {
            srcFile = 'riskvessel.html';
            this.activeRiskTemplateType = null;
        } else if (isHealth) {
            srcFile = 'healthrisk.html';
            this.activeRiskTemplateType = null;
        } else {
            this.activeRiskTemplateType = null;
        }

        if (!srcFile) {
            // COB has no dedicated risk form — stay on basic info panel
            this._showBasicInfoPanel();
            return;
        }

        const frame = document.getElementById('riskDetailFrame');
        if (!frame) return;

        const frameUrl = new URL(srcFile, window.location.href);
        const currentRecord = this.getCurrentWorkingQuotation();
        frameUrl.searchParams.set('regNo', currentRecord?.regNo || this.regNo?.value || '');
        frameUrl.searchParams.set('quotationId', currentRecord?.id || this.quotationId?.value || '');
        frameUrl.searchParams.set('loadExisting', 'false');

        // Only reload iframe when COB changes
        if (this._riskDetailLoaded !== riskKey) {
            frame.src = frameUrl.toString();
            this._riskDetailLoaded = riskKey;
        }

        this._showRiskDetailPanel();
    }

    loadRiskType(type) {
        let srcFile = 'riskproperty.html';
        if (type === 'vehicle') {
            srcFile = 'riskvehicle.html';
            this.activeRiskTemplateType = 'vehicle';
        } else if (type === 'property') {
            srcFile = 'riskproperty.html';
            this.activeRiskTemplateType = 'property';
        } else if (type === 'vessel') {
            srcFile = 'riskvessel.html';
            this.activeRiskTemplateType = null;
        } else if (type === 'health' || type === 'employee_benefit') {
            srcFile = 'healthrisk.html';
            this.activeRiskTemplateType = null;
        } else {
            this.activeRiskTemplateType = null;
        }
        const frame = document.getElementById('riskDetailFrame');
        if (!frame) return;

        const frameUrl = new URL(srcFile, window.location.href);
        const currentRecord = this.getCurrentWorkingQuotation();
        frameUrl.searchParams.set('regNo', currentRecord?.regNo || this.regNo?.value || '');
        frameUrl.searchParams.set('quotationId', currentRecord?.id || this.quotationId?.value || '');
        frameUrl.searchParams.set('loadExisting', 'false');

        frame.src = frameUrl.toString();
        this._riskDetailLoaded = type;

        this._showRiskDetailPanel();
    }



    bindRiskDetailBridge() {
        window.addEventListener('message', (event) => {
            if (!event || !event.data) return;

            if (event.data.type === 'riskvehicle:totals' || event.data.type === 'healthrisk:totals') {
                const totals = event.data.payload || {};
                this.applyRiskVehicleTotals(totals);
                return;
            }

            if (event.data.type === 'riskvehicle:returnToQuotation' || event.data.type === 'healthrisk:returnToQuotation') {
                const payload = event.data.payload || {};
                if (String(payload.action || '').toLowerCase() === 'save') {
                    this.applyRiskVehicleTotals(payload);
                }
                this._riskDetailLoaded = null;
                this._showBasicInfoPanel();
                this.updateRiskTabState();
            }
        });
    }

    applyRiskVehicleTotals(totals = {}) {
        const sumInsured = Number(totals.totalSumInsured || 0);
        const totalPremium = Number(totals.totalPremium || 0);
        const premiumFixed = Number.isFinite(totalPremium) ? totalPremium.toFixed(2) : '0.00';

        if (this.tsi) {
            this.tsi.value = Number.isFinite(sumInsured) ? sumInsured.toFixed(2) : '0.00';
        }

        if (this.premium) {
            this.premium.value = premiumFixed;
        }

        this.syncInsurancePremiumFromQuotationPremium(true);

        this.refreshInstallmentSummary();
        this.calcInsPremiNet();
    }

    syncInsurancePremiumFromQuotationPremium(force = false) {
        if (!this.insPremi || !this.premium) return;

        const premiumValue = this.toNumber(this.premium.value);
        const currentInsPremi = parseFloat(String(this.insPremi.value || '').replace(/,/g, '')) || 0;
        if (!force && Math.abs(currentInsPremi - premiumValue) < 0.005) return;

        this.insPremi.value = premiumValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        this.calcInsPremiNet();
    }

    _showRiskDetailPanel() {
        // Keep basic info visible, and show the risk detail iframe below it (vertical flow)
        const basicInfo = document.getElementById('basicInfoPanel');
        const detail    = document.getElementById('tab-risk-detail');
        if (basicInfo) basicInfo.classList.remove('hidden');
        if (detail)    detail.classList.remove('hidden');
    }

    _showBasicInfoPanel() {
        // Restore basic info (hide iframe panel)
        const basicInfo = document.getElementById('basicInfoPanel');
        const detail    = document.getElementById('tab-risk-detail');
        if (basicInfo) basicInfo.classList.remove('hidden');
        if (detail)    detail.classList.add('hidden');
    }

    handleCobSelectionChange() {
        const selectedCob = this.cob?.value || '';
        this.populateSubCobOptions(selectedCob, '');
        this.autoGenerateRegNo();
    }

    updateCobNameFields() {
        const cobVal = String(this.cob?.value || '').trim();
        const subCobVal = String(this.subCob?.value || '').trim();

        // COB name: lookup dari cobProducts lokal
        const match = this.cobProducts.find((item) => item.cob === cobVal);
        if (this.cobName) this.cobName.value = match ? (match.cobName || cobVal) : cobVal;

        // Sub COB name: ambil dari selected option text (sudah dari API)
        if (this.subCobName) {
            const selectedOption = this.subCob?.options[this.subCob.selectedIndex];
            const optionLabel = selectedOption ? selectedOption.text : '';
            this.subCobName.value = (optionLabel && optionLabel !== '-- Select Sub COB (Lookup) --')
                ? optionLabel
                : subCobVal;
        }
    }

    handleIssueDateChange() {
        this.updateQuotationYearFromIssueDate();
        this.autoGenerateRegNo();
        this.syncAutoQuotationFields();
    }

    applyAuditDefaultsForNewRecord() {
        const currentUser = this.getCurrentUserName();
        const today = this.getTodayDateValue();

        if (this.userEntry) this.userEntry.value = currentUser;
        if (this.entryDate) this.entryDate.value = today;
        if (this.userUpdate) this.userUpdate.value = '';
        if (this.updateDate) this.updateDate.value = '';
        if (this.userClose) this.userClose.value = '';
        if (this.closeDate) this.closeDate.value = '';
    }
    applyRequiredQuotationDefaults() {
        const today = this.getTodayDateValue();

        if (this.status && !String(this.status.value || '').trim()) {
            this.status.value = 'Not Closed';
        }

        if (this.closingStatus && !String(this.closingStatus.value || '').trim()) {
            this.closingStatus.value = 'Not Closed';
        }

        if (this.effectiveDate && !String(this.effectiveDate.value || '').trim()) {
            this.effectiveDate.value = today;
        }

        if (this.currency && !String(this.currency.value || '').trim()) {
            this.currency.value = 'IDR';
        }
    }

    isClosedValue(value) {
        return (value || '').toString().trim().toLowerCase() === 'closed';
    }

    isQuotationClosed(payload = {}) {
        return this.isClosedValue(payload.status) || this.isClosedValue(payload.closingStatus);
    }

    normalizeClosingFields(payload = {}) {
        const normalized = { ...payload };
        const closed = this.isQuotationClosed(normalized);

        if (closed) {
            normalized.status = 'Closed';
            normalized.closingStatus = 'Closed';
            return normalized;
        }

        if (!normalized.status || this.isClosedValue(normalized.status)) {
            normalized.status = 'Not Closed';
        }

        if (!normalized.closingStatus || this.isClosedValue(normalized.closingStatus)) {
            normalized.closingStatus = 'Not Closed';
        }

        return normalized;
    }

    previewAuditForEdit() {
        const currentId = (this.quotationId?.value || '').trim();
        if (!currentId) return;

        const currentUser = this.getCurrentUserName();
        const today = this.getTodayDateValue();

        if (this.userUpdate) this.userUpdate.value = currentUser;
        if (this.updateDate) this.updateDate.value = today;

        const closed = this.isQuotationClosed({
            status: this.status?.value || '',
            closingStatus: this.closingStatus?.value || ''
        });

        if (closed) {
            if (this.userClose) this.userClose.value = currentUser;
        } else {
            if (this.userClose) this.userClose.value = '';
            if (this.closeDate) this.closeDate.value = '';
        }
    }

    syncClosingStatusFrom(sourceField) {
        if (sourceField === 'status' && this.status && this.closingStatus) {
            this.closingStatus.value = this.isClosedValue(this.status.value) ? 'Closed' : 'Not Closed';
        }

        if (sourceField === 'closingStatus' && this.closingStatus && this.status) {
            this.status.value = this.isClosedValue(this.closingStatus.value) ? 'Closed' : 'Not Closed';
        }

        this.previewAuditForEdit();
    }

    applyAuditValuesToPayload(payload, previous = null) {
        const normalizedPayload = this.normalizeClosingFields(payload);
        const currentUser = this.getCurrentUserName();
        const today = this.getTodayDateValue();
        const isClosed = this.isQuotationClosed(normalizedPayload);

        if (previous) {
            normalizedPayload.userEntry = previous.userEntry || currentUser;
            normalizedPayload.entryDate = previous.entryDate || today;
            normalizedPayload.userUpdate = currentUser;
            normalizedPayload.updateDate = today;

            if (isClosed) {
                normalizedPayload.userClose = currentUser;
                normalizedPayload.closeDate = previous.closeDate || normalizedPayload.closeDate || today;
            } else {
                normalizedPayload.userClose = '';
                normalizedPayload.closeDate = '';
            }

            return normalizedPayload;
        }

        normalizedPayload.userEntry = currentUser;
        normalizedPayload.entryDate = today;
        normalizedPayload.userUpdate = '';
        normalizedPayload.updateDate = '';

        if (isClosed) {
            normalizedPayload.userClose = currentUser;
            normalizedPayload.closeDate = today;
        } else {
            normalizedPayload.userClose = '';
            normalizedPayload.closeDate = '';
        }

        return normalizedPayload;
    }

    /* ── Installment methods ─────────────────────────────────────── */

    renderInstallmentRows() {
        if (!this.installmentTableBody) return;
        this.installmentTableBody.innerHTML = '';
        this.installments.forEach((row, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-3 py-1 text-center text-sm text-gray-500">${idx + 1}</td>
                <td class="px-2 py-1">
                    <input type="text" class="inst-label border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        value="${this.escHtml(row.installmentLabel)}" placeholder="Installment ${idx + 1}" data-idx="${idx}">
                </td>
                <td class="px-2 py-1">
                    <input type="date" class="inst-date border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        value="${row.dueDate}" data-idx="${idx}">
                </td>
                <td class="px-2 py-1">
                    <input type="number" class="inst-nominal border border-gray-300 rounded px-2 py-1 text-sm w-full text-right"
                        value="${row.nominal || ''}" min="0" step="0.01" placeholder="0" data-idx="${idx}">
                </td>
                <td class="px-2 py-1 text-center">
                    <button type="button" class="inst-remove text-red-500 hover:text-red-700 text-sm font-bold" data-idx="${idx}" title="Remove row">
                        <i class="fas fa-times"></i>
                    </button>
                </td>`;
            this.installmentTableBody.appendChild(tr);

            tr.querySelector('.inst-label').addEventListener('input', (e) => {
                this.installments[+e.target.dataset.idx].installmentLabel = e.target.value;
            });
            tr.querySelector('.inst-date').addEventListener('change', (e) => {
                this.installments[+e.target.dataset.idx].dueDate = e.target.value;
            });
            tr.querySelector('.inst-nominal').addEventListener('input', (e) => {
                this.installments[+e.target.dataset.idx].nominal = parseFloat(e.target.value) || 0;
                this.refreshInstallmentSummary();
            });
            tr.querySelector('.inst-remove').addEventListener('click', (e) => {
                this.removeInstallmentRow(+e.currentTarget.dataset.idx);
            });
        });
        this.refreshInstallmentSummary();
    }

    addInstallmentRow() {
        if (this.installments.length >= 12) {
            this.showMessage('Maximum 12 installment rows allowed.');
            return;
        }
        this.installments.push({ installmentLabel: '', dueDate: '', nominal: 0 });
        this.renderInstallmentRows();
    }

    removeInstallmentRow(idx) {
        this.installments.splice(idx, 1);
        this.renderInstallmentRows();
    }

    clearInstallmentRows() {
        this.installments = [];
        this.renderInstallmentRows();
    }

    getInstallmentTotal() {
        return this.installments.reduce((sum, r) => sum + (parseFloat(r.nominal) || 0), 0);
    }

    getPremiumValue() {
        return parseFloat(this.premium?.value) || 0;
    }

    autoDistributeInstallments() {
        const count = this.installments.length;
        if (!count) {
            this.showMessage('Add at least one installment row first.');
            return;
        }
        const total = this.getPremiumValue();
        const base = Math.floor((total / count) * 100) / 100;
        const remainder = Math.round((total - base * count) * 100) / 100;
        this.installments.forEach((row, idx) => {
            row.nominal = idx === count - 1 ? +(base + remainder).toFixed(2) : base;
        });
        this.renderInstallmentRows();
    }

    refreshInstallmentSummary() {
        const premium = this.getPremiumValue();
        const instTotal = this.getInstallmentTotal();
        const diff = Math.round((instTotal - premium) * 100) / 100;
        const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (this.premiumDisplay) this.premiumDisplay.textContent = fmt(premium);
        if (this.installmentTotalSpan) this.installmentTotalSpan.textContent = fmt(instTotal);
        if (this.installmentTotalFoot) this.installmentTotalFoot.textContent = fmt(instTotal);

        if (this.installmentDiff && this.installmentDiffVal && this.installmentOk) {
            if (diff !== 0) {
                this.installmentDiffVal.textContent = fmt(Math.abs(diff));
                this.installmentDiff.style.display = '';
                this.installmentOk.style.display = 'none';
            } else {
                this.installmentDiff.style.display = 'none';
                this.installmentOk.style.display = '';
            }
        }
    }

    escHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ── Insurance Tab ──────────────────────────────────────────── */

    populateInsuranceCompanyDropdown(selectEl, selectedValue = '') {
        const insurancePartners = this.partnerRows.filter(
            (p) => !p.category || p.category === 'insurance'
        );
        const options = (insurancePartners.length ? insurancePartners : this.partnerRows).map((p) => ({
            value: p.name,
            label: p.partnerId ? `${p.name} (${p.partnerId})` : p.name
        }));
        this.rebuildSelectOptions(selectEl, options, '-- Select Company --', selectedValue);
    }

    initInsuranceTab() {
        this.populateInsuranceCompanyDropdown(this.insCompanySingle);
        this.toggleCoInsuranceMode();
        this.calcInsPremiNet();
    }

    initAttachmentTab() {
        const dropZone = document.getElementById('attachmentDropZone');
        const fileInput = document.getElementById('attachmentFileInput');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            // Drag and drop events
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-blue-500', 'bg-blue-50');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.handleAttachmentFiles(e.dataTransfer.files);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleAttachmentFiles(e.target.files);
                }
            });
        }
    }

    handleAttachmentFiles(files) {
        const errorDiv = document.getElementById('attachmentError');
        if (errorDiv) errorDiv.classList.add('hidden');

        Array.from(files).forEach((file) => {
            // Check size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                this.showAttachmentError(`File "${file.name}" exceeds 10MB limit.`);
                return;
            }

            // Check type (PDF, JPG, JPEG)
            const fileType = file.type;
            const fileName = file.name.toLowerCase();
            const isValidType = fileType === 'application/pdf' || 
                                fileType === 'image/jpeg' || 
                                fileType === 'image/jpg' ||
                                fileName.endsWith('.pdf') ||
                                fileName.endsWith('.jpg') ||
                                fileName.endsWith('.jpeg');

            if (!isValidType) {
                this.showAttachmentError(`File "${file.name}" has invalid format. Only PDF and JPG are allowed.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Prevent duplicate files by checking name and size
                const exists = this.attachments.some(att => att.name === file.name && att.size === file.size);
                if (exists) return;

                this.attachments.push({
                    id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: file.size,
                    type: file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                    data: e.target.result // Base64 data
                });
                this.renderAttachments();
            };
            reader.readAsDataURL(file);
        });
    }

    showAttachmentError(msg) {
        const errorDiv = document.getElementById('attachmentError');
        const errorText = document.getElementById('attachmentErrorText');
        if (errorDiv && errorText) {
            errorText.textContent = msg;
            errorDiv.classList.remove('hidden');
        }
    }

    renderAttachments() {
        const listContainer = document.getElementById('attachmentList');
        const countSpan = document.getElementById('attachmentCount');
        if (!listContainer) return;

        if (countSpan) {
            countSpan.textContent = `${this.attachments.length} file${this.attachments.length !== 1 ? 's' : ''}`;
        }

        if (this.attachments.length === 0) {
            listContainer.innerHTML = `
                <div id="noAttachments" class="text-center py-6 border border-dashed border-gray-100 rounded-lg bg-gray-50 text-gray-400 text-xs">
                    <i class="far fa-folder-open text-xl mb-1 block"></i>
                    No documents uploaded yet.
                </div>
            `;
            return;
        }

        // Render attachment list items with a preview (eye icon) and delete (trash icon)
        listContainer.innerHTML = this.attachments.map((att) => {
            const sizeKB = (att.size / 1024).toFixed(1);
            const isPdf = att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
            const iconClass = isPdf ? 'fa-file-pdf text-red-500' : 'fa-file-image text-green-500';

            return `
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-all" data-id="${att.id}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded bg-gray-50 flex items-center justify-center border border-gray-100">
                            <i class="fas ${iconClass} text-lg"></i>
                        </div>
                        <div>
                            <div class="text-xs font-semibold text-gray-800 truncate max-w-[200px] md:max-w-md" title="${att.name}">${att.name}</div>
                            <div class="text-[10px] text-gray-400">${sizeKB} KB • ${isPdf ? 'PDF Document' : 'JPEG Image'}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" class="btn-preview-attachment p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Preview File">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn-delete-attachment p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete File">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind delete action
        listContainer.querySelectorAll('.btn-delete-attachment').forEach((btn, i) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.attachments.splice(i, 1);
                this.renderAttachments();
            });
        });

        // Bind preview action
        listContainer.querySelectorAll('.btn-preview-attachment').forEach((btn, i) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const att = this.attachments[i];
                const win = window.open();
                if (win) {
                    win.document.write(`
                        <html>
                        <head><title>Preview - ${att.name}</title></head>
                        <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#525659;">
                            ${att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf')
                                ? `<iframe src="${att.data}" frameborder="0" style="border:0; width:100%; height:100vh;"></iframe>`
                                : `<img src="${att.data}" style="max-width:100%; max-height:100vh; object-fit:contain; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" />`
                            }
                        </body>
                        </html>
                    `);
                    win.document.close();
                } else {
                    alert("Please allow popups to preview files.");
                }
            });
        });
    }

    toggleCoInsuranceMode() {
        const isCoins = this.coInsurance?.value === 'Yes';
        if (this.singleInsuranceSection) this.singleInsuranceSection.classList.toggle('hidden', isCoins);
        if (this.multiInsuranceSection) this.multiInsuranceSection.classList.toggle('hidden', !isCoins);
        const breakdownSection = document.getElementById('coinsPremiumBreakdownSection');
        if (breakdownSection) breakdownSection.classList.toggle('hidden', !isCoins);
        if (isCoins) this.renderCoinsPremiumBreakdown();
    }

    addCoinsuranceRow() {
        if (this.coinsurances.length >= 10) {
            this.showMessage('Maximum 10 coinsurance companies allowed.');
            return;
        }
        const defaultStatus = this.coinsurances.length === 0 ? 'Leader' : 'Member';
        this.coinsurances.push({ company: '', share: 0, status: defaultStatus });
        this.renderCoinsuranceRows();
    }

    removeCoinsuranceRow(idx) {
        this.coinsurances.splice(idx, 1);
        this.renderCoinsuranceRows();
    }

    renderCoinsuranceRows() {
        if (!this.coinsuranceTableBody) return;
        this.coinsuranceTableBody.innerHTML = '';

        this.coinsurances.forEach((row, idx) => {
            const optionsHtml = this.partnerRows.map((p) => {
                const val = this.escHtml(p.name);
                const selected = row.company === p.name ? ' selected' : '';
                return `<option value="${val}"${selected}>${this.escHtml(p.partnerId ? `${p.name} (${p.partnerId})` : p.name)}</option>`;
            }).join('');

            const rowStatus = row.status || 'Member';
            const net = parseFloat(this.insPremiNet?.value) || 0;
            const rowPremium = net * ((parseFloat(row.share) || 0) / 100);
            const fmtPremium = rowPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const statusBadgeClass = rowStatus === 'Leader'
                ? 'coins-status border border-yellow-400 rounded px-2 py-1 text-sm w-full bg-yellow-50 text-yellow-800 font-semibold'
                : 'coins-status border border-gray-300 rounded px-2 py-1 text-sm w-full';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-3 py-1 text-center text-sm text-gray-500">${idx + 1}</td>
                <td class="px-2 py-1">
                    <select class="coins-company border border-gray-300 rounded px-2 py-1 text-sm w-full" data-idx="${idx}">
                        <option value="">-- Select Company --</option>
                        ${optionsHtml}
                    </select>
                </td>
                <td class="px-2 py-1">
                    <input type="number" class="coins-share border border-gray-300 rounded px-2 py-1 text-sm w-full text-right"
                        value="${row.share || ''}" min="0" max="100" step="0.01" placeholder="0.00" data-idx="${idx}">
                </td>
                <td class="px-2 py-1 text-center">
                    <select class="${statusBadgeClass}" data-idx="${idx}">
                        <option value="Leader"${rowStatus === 'Leader' ? ' selected' : ''}>&#9733; Leader</option>
                        <option value="Member"${rowStatus === 'Member' ? ' selected' : ''}>Member</option>
                    </select>
                </td>
                <td class="px-2 py-1">
                    <input type="text" class="coins-premium border border-blue-100 rounded px-2 py-1 text-sm w-full text-right bg-blue-50 text-blue-700 font-semibold"
                        readonly value="${fmtPremium}" data-idx="${idx}">
                </td>
                <td class="px-2 py-1 text-center">
                    <button type="button" class="coins-remove text-red-500 hover:text-red-700 text-sm font-bold" data-idx="${idx}" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </td>`;
            this.coinsuranceTableBody.appendChild(tr);

            tr.querySelector('.coins-company').addEventListener('change', (e) => {
                this.coinsurances[+e.target.dataset.idx].company = e.target.value;
            });
            tr.querySelector('.coins-share').addEventListener('input', (e) => {
                const i = +e.target.dataset.idx;
                let val = parseFloat(e.target.value) || 0;
                if (val < 0) val = 0;
                const otherSum = this.coinsurances.reduce((s, r, j) => j !== i ? s + (parseFloat(r.share) || 0) : s, 0);
                const maxShare = Math.max(0, parseFloat((100 - otherSum).toFixed(4)));
                if (val > maxShare) {
                    val = maxShare;
                    e.target.value = val.toFixed(2);
                    e.target.style.borderColor = '#f87171';
                    e.target.title = 'Total share cannot exceed 100%. Value has been capped at ' + val.toFixed(2) + '%.';
                    this.showMessage('Total share cannot exceed 100%. Share value has been capped at ' + val.toFixed(2) + '%.');
                } else {
                    e.target.style.borderColor = '';
                    e.target.title = '';
                }
                this.coinsurances[i].share = val;
                this.refreshCoShareTotal();
            });
            tr.querySelector('.coins-status').addEventListener('change', (e) => {
                const i = +e.target.dataset.idx;
                this.coinsurances[i].status = e.target.value;
                const isLeader = e.target.value === 'Leader';
                e.target.className = isLeader
                    ? 'coins-status border border-yellow-400 rounded px-2 py-1 text-sm w-full bg-yellow-50 text-yellow-800 font-semibold'
                    : 'coins-status border border-gray-300 rounded px-2 py-1 text-sm w-full';
            });
            tr.querySelector('.coins-remove').addEventListener('click', (e) => {
                this.removeCoinsuranceRow(+e.currentTarget.dataset.idx);
            });
        });

        this.refreshCoShareTotal();
    }

    refreshCoShareTotal() {
        const total = this.coinsurances.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0);
        const isExact = Math.abs(total - 100) < 0.01;
        const isOver  = total > 100 + 0.001;
        const fmt = total.toFixed(2) + '%';
        if (this.coShareBadge) {
            this.coShareBadge.textContent = fmt;
            this.coShareBadge.style.color = isExact ? '#16a34a' : '#dc2626';
        }
        if (this.coShareTotalFoot) {
            this.coShareTotalFoot.textContent = fmt;
            this.coShareTotalFoot.style.color = isOver ? '#dc2626' : (isExact ? '#16a34a' : '#d97706');
            this.coShareTotalFoot.style.fontWeight = isOver ? '700' : '';
        }
        this.refreshCoinsPremiums();
    }

    refreshCoinsPremiums() {
        const net = parseFloat((this.insPremiNet?.value || '').replace(/,/g, '')) || 0;
        const fmtNum = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const rows = this.coinsuranceTableBody?.querySelectorAll('tr') || [];
        let premiumTotal = 0;
        rows.forEach((tr, idx) => {
            const share = parseFloat(this.coinsurances[idx]?.share) || 0;
            const premium = net * (share / 100);
            premiumTotal += premium;
            const cell = tr.querySelector('.coins-premium');
            if (cell) cell.value = fmtNum(premium);
        });
        const footEl = document.getElementById('coinsPremiumTotalFoot');
        if (footEl) footEl.textContent = fmtNum(premiumTotal);
        this.renderCoinsPremiumBreakdown();
    }

    renderCoinsPremiumBreakdown() {
        const tbody = document.getElementById('coinsPremiumBreakdownBody');
        if (!tbody) return;
        if (this.coInsurance?.value !== 'Yes') return;

        const parse      = (id) => parseFloat((document.getElementById(id)?.value || this[id.replace('ins','ins').replace(/([A-Z])/g, m => m)]?.value || '').replace(/,/g, '')) || 0;
        const netToIns   = parseFloat((this.insPremiNet?.value  || '').replace(/,/g, '')) || 0;
        const totalBrok  = parseFloat((this.insBrokerage?.value || '').replace(/,/g, '')) || 0;
        const totalPph   = parseFloat((this.insPph?.value       || '').replace(/,/g, '')) || 0;
        const totalPpn   = parseFloat((this.insPpn?.value       || '').replace(/,/g, '')) || 0;
        // Premium After Discount (Premi_Net) = Net to Insurer + Brokerage_Gross
        const premiNetAfterDiskon = netToIns + totalBrok;
        const fmtNum = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let totShare = 0, totPremiNet = 0, totBrokerage = 0, totPph = 0, totPpn = 0, totNet = 0;
        tbody.innerHTML = '';

        this.coinsurances.forEach((row, idx) => {
            const share        = parseFloat(row.share) || 0;
            const rowPremiNet  = premiNetAfterDiskon * (share / 100);  // Premium After Discount
            const rowBrokerage = totalBrok  * (share / 100);
            const rowPph       = totalPph   * (share / 100);
            const rowPpn       = totalPpn   * (share / 100);
            const rowNet       = rowPremiNet - rowBrokerage;           // Net to Insurer
            totShare     += share;
            totPremiNet  += rowPremiNet;
            totBrokerage += rowBrokerage;
            totPph       += rowPph;
            totPpn       += rowPpn;
            totNet       += rowNet;

            const isLeader = (row.status || 'Member') === 'Leader';
            const statusHtml = isLeader
                ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">&#9733; Leader</span>'
                : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Member</span>';
            const rowBg = idx % 2 === 0 ? '' : 'style="background:#f8fafc"';
            const companyLabel = this.escHtml(row.company || '\u2014');

            tbody.insertAdjacentHTML('beforeend', `
                <tr ${rowBg}>
                    <td class="px-3 py-1.5 text-center text-sm text-gray-500">${idx + 1}</td>
                    <td class="px-3 py-1.5 text-sm text-gray-800 font-medium">${companyLabel}</td>
                    <td class="px-3 py-1.5 text-center">${statusHtml}</td>
                    <td class="px-3 py-1.5 text-right text-sm text-gray-700">${share.toFixed(2)}%</td>
                    <td class="px-3 py-1.5 text-right text-sm text-blue-700 font-semibold font-mono">${fmtNum(rowPremiNet)}</td>
                    <td class="px-3 py-1.5 text-right text-sm text-orange-600 font-mono">${fmtNum(rowBrokerage)}</td>
                    <td class="px-3 py-1.5 text-right text-sm text-red-600 font-mono">${fmtNum(rowPph)}</td>
                    <td class="px-3 py-1.5 text-right text-sm text-purple-700 font-mono">${fmtNum(rowPpn)}</td>
                    <td class="px-3 py-1.5 text-right text-sm text-green-700 font-bold font-mono">${fmtNum(rowNet)}</td>
                </tr>`);
        });

        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('coBreakdownTotalShare',     totShare.toFixed(2) + '%');
        setText('coBreakdownTotalPremiNet',  fmtNum(totPremiNet));
        setText('coBreakdownTotalBrokerage', fmtNum(totBrokerage));
        setText('coBreakdownTotalPph',       fmtNum(totPph));
        setText('coBreakdownTotalPpn',       fmtNum(totPpn));
        setText('coBreakdownTotalNet',       fmtNum(totNet));
    }

    calcInsPremiNet() {
        const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const v = (id) => parseFloat((document.getElementById(id)?.value || '').replace(/,/g, '')) || 0;
        const base     = v('insPremi');
        const diskon   = base * v('insDiskonPct') / 100;
        const premiNet = base - diskon;                        // Premi_Net = P - D
        const kPct     = v('insBrokeragePct') / 100;
        const pphPct   = v('insPphPct') / 100;
        const ppnPct   = v('insPpnPct') / 100;
        const ppnIncluded = (this.insPpnMode?.value || 'exclude') === 'include';
        const komisi   = premiNet * kPct;                      // Komisi target = Premi_Net × K%
        let brokerageGross, pph, ppn;
        if (ppnIncluded) {
            // Gross-up: Komisi_Gross = Komisi / (1 - PPh% - PPN%)
            const divisor  = 1 - pphPct - ppnPct;
            brokerageGross = divisor > 0 ? komisi / divisor : komisi;
            pph            = brokerageGross * pphPct;
            ppn            = brokerageGross * ppnPct;
        } else {
            brokerageGross = komisi;
            pph            = komisi * pphPct;
            ppn            = 0;
        }
        const netToInsurer  = premiNet - brokerageGross;        // Netto_Asuransi
        const totalPayable  = premiNet + v('insBiayaPolis') + v('insMaterai'); // Total = Premi_Net + BP + M
        if (this.insDiskon)        this.insDiskon.value        = fmt(diskon);
        if (this.insBrokerage)     this.insBrokerage.value     = fmt(brokerageGross);
        if (this.insPph)           this.insPph.value           = fmt(pph);
        if (this.insPpn)           this.insPpn.value           = fmt(ppn);
        if (this.insTotalPayable)  this.insTotalPayable.value  = fmt(totalPayable);
        if (this.insPremiNet)      this.insPremiNet.value      = fmt(netToInsurer);
        this.refreshCoinsPremiums();
    }

    /* ─────────────────────────────────────────────────────────────── */

    getFormPayload() {
        const payload = {
            id: (this.quotationId?.value || '').trim(),
            cob: this.cob?.value || '',
            subCob: this.subCob?.value || '',
            quotationYear: (this.quotationYear?.value || '').trim(),
            regNo: (this.regNo?.value || '').trim(),
            endors: (this.endors?.value || '').trim(),
            client: (this.client?.value || '').trim(),
            clientQQ: (this.clientQQ?.value || '').trim(),
            address: (this.address?.value || '').trim(),
            marketing: this.marketing?.value || '',
            agent: this.agent?.value || '',
            paymentType: this.paymentType?.value || '',
            accept: this.accept?.value || '',
            periode: this.periode?.value || '',
            conversionTo: this.conversionTo?.value || '',
            currency: this.currency?.value || '',
            rate: this.toNumber(this.rate?.value),
            policyNo: (this.policyNo?.value || '').trim(),
            effectiveDate: this.effectiveDate?.value || '',
            wpcClient: this.wpcClient?.value || '',

            quotationLate: (this.quotationLate?.value || '').trim(),
            closingStatus: this.closingStatus?.value || '',
            status: this.status?.value || '',
            premium: this.toNumber(this.premium?.value),
            tsi: this.toNumber(this.tsi?.value),
            rateType: this.rateType?.value || '',
            endorsNota: (this.endorsNota?.value || '').trim(),
            wpcInsurance: this.wpcInsurance?.value || '',

            userEntry: (this.userEntry?.value || '').trim(),
            entryDate: this.entryDate?.value || '',
            userUpdate: (this.userUpdate?.value || '').trim(),
            updateDate: this.updateDate?.value || '',
            userClose: (this.userClose?.value || '').trim(),
            closeDate: this.closeDate?.value || '',
            installments: this.installments.map((r) => ({ ...r })),
            coInsurance: this.coInsurance?.value || 'No',
            insCompanySingle: this.insCompanySingle?.value || '',
            insPremi: this.toNumber((this.insPremi?.value || '').replace(/,/g, '')),
            insBiayaPolis: this.toNumber((this.insBiayaPolis?.value || '').replace(/,/g, '')),
            insMaterai: this.toNumber((this.insMaterai?.value || '').replace(/,/g, '')),
            insDiskonPct: this.toNumber(this.insDiskonPct?.value),
            insDiskon: this.toNumber((this.insDiskon?.value || '').replace(/,/g, '')),
            insBrokeragePct: this.toNumber(this.insBrokeragePct?.value),
            insBrokerage: this.toNumber((this.insBrokerage?.value || '').replace(/,/g, '')),
            insPphPct: this.toNumber(this.insPphPct?.value),
            insPph: this.toNumber((this.insPph?.value || '').replace(/,/g, '')),
            insPpnPct: this.toNumber(this.insPpnPct?.value),
            insPpnMode: this.insPpnMode?.value || '',
            insPpn: this.toNumber((this.insPpn?.value || '').replace(/,/g, '')),
            insTotalPayable: this.toNumber((this.insTotalPayable?.value || '').replace(/,/g, '')),
            insPremiNet: this.toNumber((this.insPremiNet?.value || '').replace(/,/g, '')),
            coinsurances: this.coinsurances.map((r) => ({ ...r }))
        };

        return payload;
    }

    isDuplicateRegNo(regNo, excludeId = null) {
        const normalized = (regNo || '').trim().toLowerCase();
        return this.quotations.some((item) => (
            item.statusRecord !== 'inactive' &&
            item.id !== excludeId &&
            (item.regNo || '').trim().toLowerCase() === normalized
        ));
    }

    validateForm(payload) {
        if (!payload.regNo || !payload.client || !payload.cob || !payload.status || !payload.effectiveDate) {
            this.showMessage('Reg No, Client, COB, Status, and Effective Date are required.');
            return false;
        }

        if (this.isDuplicateRegNo(payload.regNo, payload.id || null)) {
            this.showMessage('Reg No already exists. Please use a unique registration number.');
            return false;
        }

        return true;
    }

    async saveQuotation() {
        if (this.readyPromise) {
            await this.readyPromise;
        }

        this.applyRequiredQuotationDefaults();

        if (!this.form || !this.form.checkValidity()) {
            this.form?.reportValidity();
            return;
        }

        this.updateQuotationYearFromIssueDate();
        this.autoGenerateRegNo();
    this.syncAutoQuotationFields();

        const payload = this.getFormPayload();
        if (!this.validateForm(payload)) return;

        this.showLoading(true);

        try {
            const now = new Date().toISOString();
            if (payload.id) {
                const index = this.quotations.findIndex((item) => item.id === payload.id);
                if (index !== -1) {
                    this.addVersionLog('UPDATE', payload, this.quotations[index]);
                }
            } else {
                this.addVersionLog('CREATE', payload);
            }

            const previousRecord = payload.id ? this.quotations.find((item) => item.id === payload.id) : null;
            const normalizedPayload = this.applyAuditValuesToPayload(payload, previousRecord);
            const savedRecord = await this.saveQuotationToBackend({ ...normalizedPayload, updatedAt: now }, 'active');

            this.quotations = await this.loadQuotationsFromBackend();
            const resolvedRecord = this.quotations.find((item) => (
                item.statusRecord !== 'inactive' &&
                String(item.regNo || '').trim().toLowerCase() === String(savedRecord.regNo || payload.regNo || '').trim().toLowerCase()
            ));

            if (this.quotationId) this.quotationId.value = resolvedRecord?.id || savedRecord.id || '';
            if (this.regNo) this.regNo.value = resolvedRecord?.regNo || savedRecord.regNo || payload.regNo || '';

            this.persistVersions();
            this.renderAll();
            this.updateRiskTabState();

            const riskTabBtn = document.getElementById('tab-risk-btn');
            const cobVal = (this.cob?.value || '').trim();
            if (riskTabBtn && this.isRiskTabUnlocked() && cobVal) {
                riskTabBtn.classList.add('active');
                document.querySelectorAll('.tab-item').forEach((item) => {
                    if (item !== riskTabBtn) item.classList.remove('active');
                });
                document.querySelectorAll('.quot-tab-panel').forEach((panel) => panel.classList.add('hidden'));
                const riskPanel = document.getElementById('tab-risk');
                if (riskPanel) riskPanel.classList.remove('hidden');
                this._riskDetailLoaded = null;
                this.loadRiskTabContent(cobVal);
            }

            this.showMessage('Quotation saved successfully.');

            // Sync to risk_vehicle if COB is Motor
            const cobValue = (this.cob?.value || '').trim().toUpperCase();
            if (cobValue === 'MOT') {
                const regNoValue = resolvedRecord?.regNo || savedRecord.regNo || payload.regNo || '';
                const quotationIdValue = resolvedRecord?.id || savedRecord.id || '';
                if (regNoValue && quotationIdValue) {
                    await this.syncToRiskVehicle(regNoValue, quotationIdValue);
                }
            }
        } catch (error) {
            console.error('Failed to save quotation:', error);
            this.showMessage(`Failed to save quotation to backend: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    editQuotation(id) {
        const quotation = this.quotations.find((item) => item.id === id && item.statusRecord !== 'inactive');
        if (!quotation) {
            this.showMessage('Quotation data not found.');
            return;
        }

        // If quotation has regNo, load full data including risk vehicles
        if (quotation.regNo) {
            this.loadFullQuotationData(quotation.regNo);
        } else {
            this.populateQuotationForm(quotation);
        }
    }

    async loadFullQuotationData(regNo) {
        try {
            const response = await fetch(`http://localhost:3001/api/full-quotation-by-regno?regNo=${encodeURIComponent(regNo)}`);
            if (!response.ok) {
                throw new Error(`Failed to load full quotation data: ${response.status}`);
            }
            const data = await response.json();
            this.populateQuotationForm(data.quotation);
            // Risk vehicles will be loaded by the iframe when risk tab is activated
        } catch (error) {
            console.error('Failed to load full quotation data:', error);
            // Fallback to basic quotation data
            const quotation = this.quotations.find((item) => item.regNo === regNo && item.statusRecord !== 'inactive');
            if (quotation) {
                this.populateQuotationForm(quotation);
            } else {
                this.showMessage('Failed to load quotation data.');
            }
        }
    }

    populateQuotationForm(quotation) {
        this.loadCobLookupData();
        this.loadPartnerLookupData();
        this.loadCurrencyLookupData();
        const cobEntry = this.cobProducts.find(item => item.cob === quotation.cob);
        const resolvedTypeLabel = cobEntry ? cobEntry.typeLabel : '';
        this.populateTypeInsOptions(resolvedTypeLabel);
        this.populateCobOptions(quotation.cob || '');
        this.populateSubCobOptions(quotation.cob || '', quotation.subCob || '');
        this.populatePartnerOptions({
            client: quotation.client || '',
            marketing: quotation.marketing || '',
            agent: quotation.agent || ''
        });
        this.populateCurrencyOptions(quotation.currency || '');

        if (this.quotationId) this.quotationId.value = quotation.id || '';
        if (this.cob) this.cob.value = quotation.cob || '';
        if (this.subCob) this.subCob.value = quotation.subCob || '';
        this.updateCobNameFields();
        if (this.quotationYear) this.quotationYear.value = quotation.quotationYear || '';
        if (this.regNo) this.regNo.value = quotation.regNo || '';
        if (this.endors) this.endors.value = quotation.endors || '';
        if (this.client) this.client.value = quotation.client || '';
        if (this.clientQQ) this.clientQQ.value = quotation.clientQQ || '';
        if (this.address) this.address.value = quotation.address || '';
        if (this.marketing) this.marketing.value = quotation.marketing || '';
        if (this.agent) this.agent.value = quotation.agent || '';
        if (this.paymentType) this.paymentType.value = quotation.paymentType || '';
        if (this.accept) this.accept.value = quotation.accept || '';
        if (this.periode) this.periode.value = quotation.periode || '';
        if (this.conversionTo) this.conversionTo.value = quotation.conversionTo || '';
        if (this.currency) this.currency.value = quotation.currency || 'IDR';
        if (this.rate) this.rate.value = quotation.rate ?? '';
        if (this.policyNo) this.policyNo.value = quotation.policyNo || '';
        if (this.effectiveDate) this.effectiveDate.value = quotation.effectiveDate || '';
        if (this.wpcClient) this.wpcClient.value = quotation.wpcClient || '';

        if (this.quotationLate) this.quotationLate.value = quotation.quotationLate || '';
        if (this.closingStatus) this.closingStatus.value = quotation.closingStatus || '';
        if (this.status) this.status.value = quotation.status || '';
        if (this.premium) this.premium.value = quotation.premium ?? '';
        this.syncInsurancePremiumFromQuotationPremium(true);
        if (this.tsi) this.tsi.value = quotation.tsi ?? '';
        if (this.rateType) this.rateType.value = quotation.rateType || '';
        if (this.endorsNota) this.endorsNota.value = quotation.endorsNota || '';
        if (this.wpcInsurance) this.wpcInsurance.value = quotation.wpcInsurance || '';
        this.currentQuotationCreatedAt = quotation.createdAt || quotation.created_at || '';
        this.manualFieldOverrides = {
            endors: String(quotation.endors || '').trim() !== '',
            quotationLate: String(quotation.quotationLate || '').trim() !== '',
            conversionTo: String(quotation.conversionTo || '').trim() !== '',
            wpcClient: String(quotation.wpcClient || '').trim() !== '',
            wpcInsurance: String(quotation.wpcInsurance || '').trim() !== ''
        };
        this.syncAutoQuotationFields(true);

        if (this.userEntry) this.userEntry.value = quotation.userEntry || '';
        if (this.entryDate) this.entryDate.value = quotation.entryDate || '';
        if (this.userUpdate) this.userUpdate.value = quotation.userUpdate || '';
        if (this.updateDate) this.updateDate.value = quotation.updateDate || '';
        if (this.userClose) this.userClose.value = quotation.userClose || '';
        if (this.closeDate) this.closeDate.value = quotation.closeDate || '';

        // Load installment data
        this.installments = Array.isArray(quotation.installments) ? quotation.installments.map((r) => ({ ...r })) : [];
        this.renderInstallmentRows();

        // Load insurance/coinsurance data
        if (this.coInsurance) this.coInsurance.value = quotation.coInsurance || 'No';
        if (this.insCompanySingle) this.insCompanySingle.value = quotation.insCompanySingle || '';
        if (this.insPremi) this.insPremi.value = (quotation.insPremi || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insBiayaPolis) this.insBiayaPolis.value = (quotation.insBiayaPolis || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insMaterai) this.insMaterai.value = (quotation.insMaterai || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insDiskonPct) this.insDiskonPct.value = quotation.insDiskonPct || 0;
        if (this.insDiskon) this.insDiskon.value = (quotation.insDiskon || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insBrokeragePct) this.insBrokeragePct.value = quotation.insBrokeragePct || 0;
        if (this.insBrokerage) this.insBrokerage.value = (quotation.insBrokerage || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insPphPct) this.insPphPct.value = quotation.insPphPct || 0;
        if (this.insPph) this.insPph.value = (quotation.insPph || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insPpnPct) this.insPpnPct.value = quotation.insPpnPct || 0;
        if (this.insPpnMode) this.insPpnMode.value = quotation.insPpnMode || '';
        if (this.insPpn) this.insPpn.value = (quotation.insPpn || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insTotalPayable) this.insTotalPayable.value = (quotation.insTotalPayable || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.insPremiNet) this.insPremiNet.value = (quotation.insPremiNet || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Load coinsurance data
        this.coinsurances = Array.isArray(quotation.coinsurances) ? quotation.coinsurances.map((r) => ({ ...r })) : [];
        this.toggleCoInsuranceMode();
        this.renderCoinsuranceRows();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    promptDeleteFromForm() {
        const currentRecord = this.getCurrentWorkingQuotation();
        if (!currentRecord?.id) {
            this.showMessage('Select quotation data first from the list.');
            return;
        }
        this.confirmDelete(currentRecord.id);
    }

    confirmDelete(id) {
        this.currentDeleteId = id;
        if (this.confirmMessage) this.confirmMessage.textContent = 'Are you sure you want to soft delete this quotation record?';
        this.showConfirm();
    }

    async softDeleteQuotation(id) {
        const index = this.quotations.findIndex((item) => item.id === id);
        if (index === -1) {
            this.showMessage('Quotation data not found.');
            return;
        }

        const previous = { ...this.quotations[index] };
        previous.statusRecord = 'inactive';

        this.showLoading(true);
        try {
            await this.saveQuotationToBackend(previous, 'inactive');
            this.addVersionLog('SOFT_DELETE', previous, this.quotations[index]);
            this.quotations = await this.loadQuotationsFromBackend();
            this.persistVersions();

            const currentId = (this.quotationId?.value || '').trim();
            if (currentId === id) this.resetForm();

            this.renderAll();
            this.updateRiskTabState();
            this.showMessage('Quotation moved to soft delete list.');
        } catch (error) {
            console.error('Failed to soft delete quotation:', error);
            this.showMessage(`Failed to delete quotation in backend: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async restoreQuotation(id) {
        const index = this.quotations.findIndex((item) => item.id === id);
        if (index === -1) return;

        const previous = { ...this.quotations[index] };
        previous.statusRecord = 'active';

        this.showLoading(true);
        try {
            await this.saveQuotationToBackend(previous, 'active');
            this.addVersionLog('RESTORE', previous, this.quotations[index]);
            this.quotations = await this.loadQuotationsFromBackend();
            this.persistVersions();
            this.renderAll();
            this.updateRiskTabState();
            this.showMessage('Quotation restored successfully.');
        } catch (error) {
            console.error('Failed to restore quotation:', error);
            this.showMessage(`Failed to restore quotation in backend: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    addVersionLog(action, record, previous = null) {
        const log = {
            id: `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            action,
            timestamp: new Date().toISOString(),
            quotationId: record.id,
            regNo: record.regNo,
            client: record.client,
            status: record.status,
            statusRecord: record.statusRecord,
            before: previous
                ? {
                    regNo: previous.regNo,
                    client: previous.client,
                    status: previous.status,
                    statusRecord: previous.statusRecord
                }
                : null
        };

        this.versions.unshift(log);
        if (this.versions.length > 300) {
            this.versions = this.versions.slice(0, 300);
        }
    }

    getFilteredQuotations() {
        const activeRows = this.quotations.filter((item) => item.statusRecord !== 'inactive');
        
        // Sort activeRows by ID or createdAt descending (newest at the top)
        const sortedRows = activeRows.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (aTime && bTime && aTime !== bTime) {
                return bTime - aTime;
            }
            return String(b.id || '').localeCompare(String(a.id || ''));
        });

        if (!this.searchTerm) return sortedRows;

        return sortedRows.filter((item) => {
            const content = [item.regNo, item.client, item.cob, item.status, item.effectiveDate].join(' ').toLowerCase();
            return content.includes(this.searchTerm);
        });
    }

    getTotalPages() {
        const totalRows = this.getFilteredQuotations().length;
        return Math.max(1, Math.ceil(totalRows / this.pageSize));
    }

    renderTable() {
        if (!this.tableBody) return;

        const rows = this.getFilteredQuotations();
        const totalPages = this.getTotalPages();

        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const start = (this.currentPage - 1) * this.pageSize;
        const pageRows = rows.slice(start, start + this.pageSize);

        if (!pageRows.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-4 py-6 text-center text-gray-500">No quotation data found.</td>
                </tr>
            `;
        } else {
            this.tableBody.innerHTML = pageRows.map((item, idx) => {
                const rowNo = start + idx + 1;
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-900 font-medium">${rowNo}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 font-medium">${this.escapeHtml(item.regNo)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.client)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.cob)}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.effectiveDate || '-')}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${this.escapeHtml(item.status || '-')}</td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex items-center gap-2">
                                <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-action="edit" data-id="${item.id}"><i class="fas fa-pen mr-1"></i>Edit</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        this.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
            button.addEventListener('click', () => this.editQuotation(button.getAttribute('data-id')));
        });

        this.tableBody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
            button.addEventListener('click', () => this.confirmDelete(button.getAttribute('data-id')));
        });

        if (this.rowCount) this.rowCount.textContent = String(rows.length);
        if (this.pageInfo) this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        if (this.prevBtn) this.prevBtn.disabled = this.currentPage <= 1;
        if (this.nextBtn) this.nextBtn.disabled = this.currentPage >= totalPages;
    }

    renderImpactAnalysis() {
        if (!this.impactTableBody) return;

        const activeRows = this.quotations.filter((item) => item.statusRecord !== 'inactive');
        const closedRows = activeRows.filter((item) => this.isQuotationClosed(item)).length;
        const notClosedRows = activeRows.length - closedRows;

        const items = [
            {
                tool: 'Quotation Validation',
                impact: `${Math.min(100, activeRows.length * 4)}%`,
                risk: activeRows.length > 40 ? 'High' : 'Medium'
            },
            {
                tool: 'Closing Control',
                impact: `${Math.min(100, closedRows * 8)}%`,
                risk: closedRows < notClosedRows ? 'Medium' : 'Low'
            },
            {
                tool: 'Premium Consistency',
                impact: `${Math.min(100, activeRows.length * 3)}%`,
                risk: 'Low'
            }
        ];

        this.impactTableBody.innerHTML = items.map((item) => {
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

        this.versionList.innerHTML = this.versions.slice(0, 6).map((log) => {
            return `
                <div class="version-item">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-semibold text-blue-700">${this.escapeHtml(log.action)}</span>
                        <span class="text-xs text-gray-500">${this.formatDateTime(log.timestamp)}</span>
                    </div>
                    <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(log.regNo || '-')} - ${this.escapeHtml(log.client || '-')}</p>
                    <p class="version-meta">Status: ${this.escapeHtml(log.status || '-')}</p>
                </div>
            `;
        }).join('');
    }

    renderSoftDeleteList() {
        if (!this.softDeleteList) return;

        const deletedRows = this.quotations.filter((item) => item.statusRecord === 'inactive');

        if (!deletedRows.length) {
            this.softDeleteList.innerHTML = '<p class="text-sm text-gray-500">No soft deleted records.</p>';
            return;
        }

        this.softDeleteList.innerHTML = deletedRows.slice(0, 6).map((item) => {
            return `
                <div class="border rounded-lg p-3 mb-2 bg-red-50 border-red-100">
                    <div class="flex justify-between items-center gap-2">
                        <div>
                            <p class="text-sm font-semibold text-red-700">${this.escapeHtml(item.regNo || '-')}</p>
                            <p class="text-xs text-gray-600">${this.escapeHtml(item.client || '-')}</p>
                        </div>
                        <button class="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700" data-action="restore" data-id="${item.id}">Restore</button>
                    </div>
                </div>
            `;
        }).join('');

        this.softDeleteList.querySelectorAll('button[data-action="restore"]').forEach((button) => {
            button.addEventListener('click', () => this.restoreQuotation(button.getAttribute('data-id')));
        });
    }

    renderDependencyControl() {
        if (!this.dependencyList) return;

        const activeRows = this.quotations.filter((item) => item.statusRecord !== 'inactive');
        const uniqueCob = new Set(activeRows.map((item) => (item.cob || '').trim().toLowerCase()).filter(Boolean)).size;
        const uniqueClients = new Set(activeRows.map((item) => (item.client || '').trim().toLowerCase()).filter(Boolean)).size;
        const dependencyScore = activeRows.length
            ? Math.round(((uniqueCob + uniqueClients) / (activeRows.length * 2)) * 100)
            : 100;

        this.dependencyList.innerHTML = `
            <div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-600">Active Quotations</span><span class="font-semibold text-gray-800">${activeRows.length}</span></div>
                <div class="flex justify-between"><span class="text-gray-600">COB Diversity</span><span class="font-semibold text-gray-800">${uniqueCob}</span></div>
                <div class="flex justify-between"><span class="text-gray-600">Client Diversity</span><span class="font-semibold text-gray-800">${uniqueClients}</span></div>
                <div class="flex justify-between"><span class="text-gray-600">Dependency Score</span><span class="font-semibold text-gray-800">${dependencyScore}%</span></div>
            </div>
        `;
    }

    renderAISuggestions() {
        if (!this.aiSuggestionList) return;

        const activeRows = this.quotations.filter((item) => item.statusRecord !== 'inactive');
        const suggestions = [];

        if (!activeRows.length) {
            suggestions.push('Create your first quotation to activate intelligent recommendations.');
        }

        const missingPremium = activeRows.filter((item) => Number(item.premium) <= 0).length;
        if (missingPremium > 0) {
            suggestions.push(`${missingPremium} quotations have no premium value. Review premium completion.`);
        }

        const missingRate = activeRows.filter((item) => Number(item.rate) <= 0).length;
        if (missingRate > 0) {
            suggestions.push(`${missingRate} quotations have no exchange rate value. Validate currency conversion settings.`);
        }

        const closedWithoutCloseDate = activeRows.filter((item) => {
            return this.isQuotationClosed(item) && !item.closeDate;
        }).length;
        if (closedWithoutCloseDate > 0) {
            suggestions.push(`${closedWithoutCloseDate} closed quotations have no close date. Improve audit completion.`);
        }

        if (!suggestions.length) {
            suggestions.push('Quotation data quality is healthy. Continue periodic governance monitoring.');
        }

        this.aiSuggestionList.innerHTML = `
            <ul class="space-y-2 text-sm text-gray-700">
                ${suggestions.map((text) => `<li class="flex items-start gap-2"><i class="fas fa-lightbulb text-amber-500 mt-0.5"></i><span>${this.escapeHtml(text)}</span></li>`).join('')}
            </ul>
        `;
    }

    updateHealthMetrics() {
        const activeRows = this.quotations.filter((item) => item.statusRecord !== 'inactive');
        const deletedRows = this.quotations.filter((item) => item.statusRecord === 'inactive');

        const impact = Math.min(100, activeRows.length * 3);

        const validRows = activeRows.filter((item) => {
            return item.regNo && item.client && item.cob && item.status && item.effectiveDate;
        }).length;

        const quality = activeRows.length ? Math.round((validRows / activeRows.length) * 100) : 100;
        const dependency = activeRows.length
            ? Math.round((new Set(activeRows.map((item) => (item.cob || '').trim().toLowerCase())).size / activeRows.length) * 100)
            : 100;

        if (this.metricImpact) this.metricImpact.textContent = String(impact);
        if (this.metricVersions) this.metricVersions.textContent = String(this.versions.length);
        if (this.metricSoftDelete) this.metricSoftDelete.textContent = String(deletedRows.length);
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

    async resetForm() {
        this.isNewClicked = true;
        this.form?.reset();
        this.currentQuotationCreatedAt = '';
        this.manualFieldOverrides = {
            endors: false,
            quotationLate: false,
            conversionTo: false,
            wpcClient: false,
            wpcInsurance: false
        };
        this.loadCobLookupData();
        this.loadPartnerLookupData();
        this.loadCurrencyLookupData();
        this.populateTypeInsOptions();
        this.populateCobOptions();
        this.populateSubCobOptions('');
        this.populatePartnerOptions();
        this.populateCurrencyOptions();

        await this.createNewQuotation();

        this.updateQuotationYearFromIssueDate();
        this.syncAutoQuotationFields(true);
        this.applyRequiredQuotationDefaults();
        this.applyAuditDefaultsForNewRecord();
        this.installments = [];
        this.renderInstallmentRows();
        this.coinsurances = [];
        this.renderCoinsuranceRows();
        this.initInsuranceTab();
        this.updateRiskTabState();
    }

    async createNewQuotation() {
        try {
            console.log('Creating new quotation...');
            // Generate minimal payload for new quotation
            const regNo = this.generateTemporaryRegNo();
            const today = this.getTodayDateValue();
            const payload = {
                id: this.generateRecordId(),
                isNew: true,
                regNo: regNo,
                quotation_year: new Date().getFullYear().toString(),
                status: 'Open',
                statusRecord: 'active',
                client: '1', // Default client ID
                cob: 'MOT', // Default COB
                effectiveDate: today,
                closingStatus: 'Not Closed'
            };
            console.log('Payload:', payload);
            const savedRecord = await this.saveQuotationToBackend(payload, 'active');
            console.log('Saved record:', savedRecord);
            if (this.quotationId) this.quotationId.value = savedRecord.id || '';
            if (this.regNo) this.regNo.value = savedRecord.regNo || regNo;
            // Insert to risk tables
            await this.insertRiskTables(savedRecord.id);
            console.log('Risk tables inserted');
        } catch (error) {
            console.error('Error creating new quotation:', error);
            this.showMessage('Failed to create new quotation: ' + error.message);
        }
    }

    generateTemporaryRegNo() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `QS-${year}-${random}`;
    }

    async insertRiskTables(quotationId) {
        if (!quotationId) return;
        try {
            const regNo = this.regNo?.value || '';
            const baseUrl = window.GibsyNetApi?.baseUrl || 'http://localhost:3001/api';

            const riskVehiclePayload = { data: [{ quotation_id: quotationId, reg_no: regNo }] };
            const objectPayload = { data: [{ quotation_id: quotationId, reg_no: regNo, risk_no: 1 }] };
            const coveragePayload = { data: [{ quotation_id: quotationId, reg_no: regNo, risk_no: 1 }] };

            await fetch(`${baseUrl}/risk-vehicle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(riskVehiclePayload)
            });

            await fetch(`${baseUrl}/risk-vehicle-object`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(objectPayload)
            });

            await fetch(`${baseUrl}/risk-vehicle-coverage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(coveragePayload)
            });
        } catch (error) {
            console.error('Error inserting to risk tables:', error);
        }
    }

    async syncToRiskVehicle(regNo, quotationId) {
        if (!regNo || !quotationId) return;

        try {
            const baseUrl = window.GibsyNetApi?.baseUrl || 'http://localhost:3001/api';
            const payload = {
                data: [{
                    reg_no: regNo,
                    quotation_id: quotationId,
                    risk_no: 1,
                    status_record: 'ACTIVE'
                }]
            };

            const response = await fetch(`${baseUrl}/risk-vehicle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || errorData?.error || `HTTP ${response.status}`);
            }

            await fetch(`${baseUrl}/risk-vehicle-object`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ data: [{ quotation_id: quotationId, reg_no: regNo, risk_no: 1 }] })
            });

            await fetch(`${baseUrl}/risk-vehicle-coverage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ data: [{ quotation_id: quotationId, reg_no: regNo, risk_no: 1 }] })
            });

            console.log('Successfully synced quotation to risk_vehicle and related object/coverage records');
        } catch (error) {
            console.error('Failed to sync to risk_vehicle and related records:', error);
            // Don't throw error to avoid breaking quotation save
        }
    }

    exportData() {
        if (!this.quotations.length) {
            this.showMessage('No data available to export.');
            return;
        }

        const header = [
            'Reg No',
            'Client',
            'COB',
            'Sub COB',
            'Effective Date',
            'Status',
            'Premium',
            'TSI',
            'Currency',
            'Rate',
            'Record Status'
        ];

        const rows = this.quotations.map((item) => [
            item.regNo,
            item.client,
            item.cob,
            item.subCob,
            item.effectiveDate,
            item.status,
            item.premium,
            item.tsi,
            item.currency,
            item.rate,
            item.statusRecord || 'active'
        ]);

        const csv = [header, ...rows].map((row) => row.map((value) => this.toCsvValue(value)).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotation-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Quotation data exported successfully.');
    }

    toCsvValue(value) {
        const text = String(value ?? '');
        return `"${text.replace(/"/g, '""')}"`;
    }

    toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
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
        this.currentDeleteId = null;
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

    async syncToRiskVehicle(regNo, quotationId) {
        if (!regNo || !quotationId) return;

        try {
            const payload = {
                data: [{
                    reg_no: regNo,
                    quotation_id: quotationId,
                    risk_no: 1,
                    status_record: 'ACTIVE'
                }]
            };

            const response = await fetch('http://localhost:3001/api/risk-vehicle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || errorData?.error || `HTTP ${response.status}`);
            }

            console.log('Successfully synced quotation to risk_vehicle');
        } catch (error) {
            console.error('Failed to sync to risk_vehicle:', error);
            // Don't throw error to avoid breaking quotation save
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.quotationManager = new QuotationManager();
});
