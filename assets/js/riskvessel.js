// riskvessel.js
document.addEventListener('DOMContentLoaded', () => {
    // ---------- DOM Elements ----------
    const riskBadge = document.getElementById('riskBadge');
    const riskListDiv = document.getElementById('riskList');
    const addRiskBtn = document.getElementById('addRiskBtn');
    const saveBtn = document.getElementById('saveBtn');
    const vesselMainFields = document.getElementById('vesselMainFields');
    const vesselDetailRows = document.getElementById('vesselDetailRows');
    const coverageRowsContainer = document.getElementById('coverageRows');
    const addAssetRowBtn = document.getElementById('addAssetRowBtn');
    const addCoverageRowBtn = document.getElementById('addCoverageRowBtn');

    const activeAssetTotalDisplay = document.getElementById('activeAssetTotalDisplay');
    const activeRateDisplay = document.getElementById('activeRateDisplay');
    const premiumDisplay = document.getElementById('premiumDisplay');
    const formulaDisplay = document.getElementById('formulaDisplay');
    const globalSumInsuredDisplay = document.getElementById('globalSumInsuredDisplay');
    const globalPremiumDisplay = document.getElementById('globalPremiumDisplay');
    const riskPremiumBreakdown = document.getElementById('riskPremiumBreakdown');

    // ---------- Data Model ----------
    let risks = [];           // array of vessel risk objects
    let activeRiskIndex = 0;

    // Lookup data (could be fetched from API)
    let typeOfShipOptions = ['Cargo', 'Tanker', 'Passenger', 'Fishing', 'Tugboat', 'Container', 'Bulk Carrier', 'Other'];
    let materialOptions = ['Steel', 'Aluminium', 'Fiberglass', 'Wood', 'Other'];
    let classStatusOptions = ['Classed', 'Unclassed', 'Suspended', 'Expired'];
    let objectNameOptions = ['Hull', 'Machinery', 'Equipment', 'Cargo', 'Furniture & Fixture', 'Navigation Instrument', 'Safety Equipment', 'Other'];

    // Helper functions
    const formatMoney = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const formatRate = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val);
    const parseNumber = (val) => {
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        let cleaned = String(val).trim().replace(/\./g, '').replace(',', '.');
        let num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    // Default risk (vessel)
    function createDefaultRisk() {
        return {
            registerNo: '',
            imoNo: '',
            shipName: '',
            yearBuilt: new Date().getFullYear(),
            minGT: 0,
            maxGT: 0,
            flag: '',
            typeOfShip: 'Cargo',
            material: 'Steel',
            classStatus: 'Classed',
            assets: [
                { assetName: 'Hull', value: 0 },
                { assetName: 'Machinery', value: 0 }
            ],
            coverages: [
                { coverage: 'Hull & Machinery', ratePerMil: '1.5' }
            ]
        };
    }

    function getActiveRisk() {
        return risks[activeRiskIndex];
    }

    // Calculate total asset value for a risk
    function getTotalAssetValue(risk) {
        return risk.assets.reduce((sum, a) => sum + parseNumber(a.value), 0);
    }

    // Calculate total rate for a risk
    function getTotalRate(risk) {
        return risk.coverages.reduce((sum, c) => sum + (parseFloat(c.ratePerMil) || 0), 0);
    }

    // Calculate premium for a risk
    function getPremium(risk) {
        const assetTotal = getTotalAssetValue(risk);
        const totalRate = getTotalRate(risk);
        return assetTotal * (totalRate / 100);
    }

    // Recalculate all risks totals and update UI
    function recalculateAll() {
        let globalAssetTotal = 0;
        let globalPremiumTotal = 0;
        const riskPremiums = [];

        risks.forEach((risk, idx) => {
            const assetVal = getTotalAssetValue(risk);
            const rateVal = getTotalRate(risk);
            const premium = assetVal * (rateVal / 100);
            globalAssetTotal += assetVal;
            globalPremiumTotal += premium;
            riskPremiums.push({ idx, assetVal, rateVal, premium });
        });

        globalSumInsuredDisplay.textContent = formatMoney(globalAssetTotal);
        globalPremiumDisplay.textContent = formatMoney(globalPremiumTotal);

        const active = getActiveRisk();
        if (active) {
            const activeAsset = getTotalAssetValue(active);
            const activeRate = getTotalRate(active);
            const activePremium = activeAsset * (activeRate / 100);
            activeAssetTotalDisplay.textContent = formatMoney(activeAsset);
            activeRateDisplay.textContent = formatRate(activeRate);
            premiumDisplay.textContent = formatMoney(activePremium);
            formulaDisplay.textContent = `${formatMoney(activeAsset)} × (${formatRate(activeRate)} / 100)`;
        }

        // Render per-risk breakdown table
        if (riskPremiums.length) {
            let html = `<table><thead><tr><th>Vessel No</th><th>Total Asset (Rp)</th><th>Total Rate (%)</th><th>Premium (Rp)</th></tr></thead><tbody>`;
            riskPremiums.forEach(rp => {
                const activeClass = (rp.idx === activeRiskIndex) ? ' style="background:#dbeafe;font-weight:bold"' : '';
                html += `<tr${activeClass}>
                            <td>Vessel ${rp.idx+1}</td>
                            <td align="right">${formatMoney(rp.assetVal)}</td>
                            <td align="right">${formatRate(rp.rateVal)}</td>
                            <td align="right">${formatMoney(rp.premium)}</td>
                         </tr>`;
            });
            html += `</tbody></table>`;
            riskPremiumBreakdown.innerHTML = html;
        } else {
            riskPremiumBreakdown.innerHTML = '<p>No vessels added.</p>';
        }
    }

    // Render risk switcher pills
    function renderRiskList() {
        riskListDiv.innerHTML = risks.map((_, idx) => `<button type="button" class="risk-pill ${idx === activeRiskIndex ? 'active' : ''}" data-risk-index="${idx}">Vessel ${idx+1}</button>`).join('');
        riskBadge.textContent = `Risk No: ${activeRiskIndex+1}/${risks.length}`;
    }

    // Render main vessel fields (grid)
    function renderMainFields() {
        const risk = getActiveRisk();
        if (!risk) return;
        vesselMainFields.innerHTML = `
            <div class="info-item"><span class="info-label">Register No.</span><input type="text" id="registerNo" class="risk-input" value="${escapeHtml(risk.registerNo)}"></div>
            <div class="info-item"><span class="info-label">IMO No.</span><input type="text" id="imoNo" class="risk-input" value="${escapeHtml(risk.imoNo)}"></div>
            <div class="info-item"><span class="info-label">Ship Name</span><input type="text" id="shipName" class="risk-input" value="${escapeHtml(risk.shipName)}"></div>
            <div class="info-item"><span class="info-label">Tahun Dibangun</span><input type="number" id="yearBuilt" class="risk-input" value="${risk.yearBuilt}" min="1800" max="${new Date().getFullYear()}"></div>
            <div class="info-item"><span class="info-label">Min GT</span><input type="number" id="minGT" class="risk-input" value="${risk.minGT}" min="0"></div>
            <div class="info-item"><span class="info-label">Max GT</span><input type="number" id="maxGT" class="risk-input" value="${risk.maxGT}" min="0"></div>
            <div class="info-item"><span class="info-label">Flag</span><input type="text" id="flag" class="risk-input" value="${escapeHtml(risk.flag)}"></div>
            <div class="info-item"><span class="info-label">Type of Ship</span><select id="typeOfShip" class="risk-input">${typeOfShipOptions.map(opt => `<option value="${opt}" ${risk.typeOfShip === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select></div>
            <div class="info-item"><span class="info-label">Material</span><select id="material" class="risk-input">${materialOptions.map(opt => `<option value="${opt}" ${risk.material === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select></div>
            <div class="info-item"><span class="info-label">Class Status</span><select id="classStatus" class="risk-input">${classStatusOptions.map(opt => `<option value="${opt}" ${risk.classStatus === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select></div>
        `;
        // attach event listeners
        const mainInputs = ['registerNo','imoNo','shipName','yearBuilt','minGT','maxGT','flag','typeOfShip','material','classStatus'];
        mainInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', (e) => {
                const riskObj = getActiveRisk();
                if (!riskObj) return;
                if (id === 'registerNo') riskObj.registerNo = e.target.value;
                if (id === 'imoNo') riskObj.imoNo = e.target.value;
                if (id === 'shipName') riskObj.shipName = e.target.value;
                if (id === 'yearBuilt') riskObj.yearBuilt = parseInt(e.target.value) || new Date().getFullYear();
                if (id === 'minGT') riskObj.minGT = parseNumber(e.target.value);
                if (id === 'maxGT') riskObj.maxGT = parseNumber(e.target.value);
                if (id === 'flag') riskObj.flag = e.target.value;
                if (id === 'typeOfShip') riskObj.typeOfShip = e.target.value;
                if (id === 'material') riskObj.material = e.target.value;
                if (id === 'classStatus') riskObj.classStatus = e.target.value;
                recalculateAll();
            });
        });
    }

    // Render asset rows (Hull, Machinery, Equipment, etc.)
    function renderAssetRows() {
        const risk = getActiveRisk();
        if (!risk) return;
        vesselDetailRows.innerHTML = risk.assets.map((asset, idx) => `
            <div class="entry-row" data-asset-index="${idx}">
                <div class="field-group">
                    <label>Object Name</label>
                    <select class="asset-name risk-input">${objectNameOptions.map(opt => `<option value="${opt}" ${asset.assetName === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select>
                </div>
                <div class="field-group">
                    <label>Value (Rp)</label>
                    <input type="text" class="asset-value" value="${formatMoney(asset.value)}" placeholder="0,00">
                </div>
                <div class="row-action"><button class="btn-icon remove-asset">&#x2715;</button></div>
            </div>
        `).join('');
        // attach events
        document.querySelectorAll('.asset-name').forEach((inp, i) => {
            inp.addEventListener('change', (e) => { getActiveRisk().assets[i].assetName = e.target.value; recalculateAll(); });
        });
        document.querySelectorAll('.asset-value').forEach((inp, i) => {
            inp.addEventListener('input', (e) => { getActiveRisk().assets[i].value = parseNumber(e.target.value); recalculateAll(); });
            inp.addEventListener('blur', (e) => { inp.value = formatMoney(parseNumber(e.target.value)); recalculateAll(); });
        });
        document.querySelectorAll('.remove-asset').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                if (getActiveRisk().assets.length > 1) {
                    getActiveRisk().assets.splice(i, 1);
                    renderAssetRows();
                    recalculateAll();
                } else alert("Minimum one asset required");
            });
        });
    }

    // Render coverage rows
    function renderCoverageRows() {
        const risk = getActiveRisk();
        if (!risk) return;
        coverageRowsContainer.innerHTML = risk.coverages.map((cov, idx) => `
            <div class="entry-row" data-cov-index="${idx}">
                <div class="field-group">
                    <label>Coverage Name</label>
                    <input type="text" class="coverage-name" value="${escapeHtml(cov.coverage)}" placeholder="e.g., Hull & Machinery">
                </div>
                <div class="field-group">
                    <label>Rate (%)</label>
                    <input type="text" class="coverage-rate" value="${cov.ratePerMil}" placeholder="e.g., 2.5">
                </div>
                <div class="row-action"><button class="btn-icon remove-coverage">&#x2715;</button></div>
            </div>
        `).join('');
        // attach events
        document.querySelectorAll('.coverage-name').forEach((inp, i) => {
            inp.addEventListener('input', (e) => { getActiveRisk().coverages[i].coverage = e.target.value; recalculateAll(); });
        });
        document.querySelectorAll('.coverage-rate').forEach((inp, i) => {
            inp.addEventListener('input', (e) => { getActiveRisk().coverages[i].ratePerMil = e.target.value; recalculateAll(); });
        });
        document.querySelectorAll('.remove-coverage').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                if (getActiveRisk().coverages.length > 1) {
                    getActiveRisk().coverages.splice(i, 1);
                    renderCoverageRows();
                    recalculateAll();
                } else alert("Minimum one coverage required");
            });
        });
    }

    // Render all UI for active risk
    function renderAll() {
        renderRiskList();
        renderMainFields();
        renderAssetRows();
        renderCoverageRows();
        recalculateAll();
    }

    // Validation
    function validateRisk(risk) {
        if (!risk.shipName.trim()) return "Ship Name required";
        if (!risk.typeOfShip) return "Type of Ship required";
        if (getTotalAssetValue(risk) <= 0) return "Total asset value must be > 0";
        for (let cov of risk.coverages) {
            if (!cov.coverage.trim()) return "Coverage name required";
            if (parseNumber(cov.ratePerMil) <= 0) return "Rate must be > 0";
        }
        return null;
    }

    function validateAllRisks() {
        for (let i=0; i<risks.length; i++) {
            const err = validateRisk(risks[i]);
            if (err) return { valid: false, index: i, message: err };
        }
        return { valid: true };
    }

    // ---------- API Integration Example (Save to backend) ----------
    async function saveToAPI() {
        const validation = validateAllRisks();
        if (!validation.valid) {
            activeRiskIndex = validation.index;
            renderAll();
            alert(`Validation error on Vessel ${validation.index+1}: ${validation.message}`);
            return;
        }

        // Prepare payload
        const payload = { risks: risks };
        try {
            // Node.js API endpoint for vessel data
            const response = await fetch('http://localhost:3001/api/risk-vessel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('API error');
            const result = await response.json();
            alert('Data saved successfully!');
            console.log('API response:', result);
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save data. Check console or backend connection.');
        }
    }

    // ---------- Event Listeners ----------
    addRiskBtn.addEventListener('click', () => {
        risks.push(createDefaultRisk());
        activeRiskIndex = risks.length - 1;
        renderAll();
    });

    saveBtn.addEventListener('click', () => {
        saveToAPI();
    });

    riskListDiv.addEventListener('click', (e) => {
        const btn = e.target.closest('.risk-pill');
        if (btn && btn.dataset.riskIndex !== undefined) {
            activeRiskIndex = parseInt(btn.dataset.riskIndex);
            renderAll();
        }
    });

    addAssetRowBtn.addEventListener('click', () => {
        getActiveRisk().assets.push({ assetName: 'Hull', value: 0 });
        renderAssetRows();
        recalculateAll();
    });

    addCoverageRowBtn.addEventListener('click', () => {
        getActiveRisk().coverages.push({ coverage: 'New Coverage', ratePerMil: '0.0' });
        renderCoverageRows();
        recalculateAll();
    });

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Initialize with one default vessel
    risks.push(createDefaultRisk());
    activeRiskIndex = 0;
    renderAll();
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}