// riskvehicle.js
function initRiskVehicle() {
    const queryParams = new URLSearchParams(window.location.search);
    const parentQueryParams = (window.parent && window.parent !== window && window.parent.location?.search)
        ? new URLSearchParams(window.parent.location.search)
        : new URLSearchParams();
    const quotationRegNo = String(queryParams.get('regNo') || parentQueryParams.get('regNo') || '').trim();
    const quotationId = String(queryParams.get('quotationId') || parentQueryParams.get('quotationId') || '').trim();
    const shouldLoadExistingData = String(queryParams.get('loadExisting') || parentQueryParams.get('loadExisting') || 'false').toLowerCase() === 'true';
    const baseApiUrl = (window.GibsyNetApi?.baseUrl || 'http://localhost:3001/api').replace(/\/$/, '');
    const riskVehicleApiUrl = window.GibsyNetApi?.endpoints?.riskVehicle || `${baseApiUrl}/risk-vehicle`;
    const riskVehicleObjectApiUrl = window.GibsyNetApi?.endpoints?.riskVehicleObject || `${baseApiUrl}/risk-vehicle-object`;
    const riskVehicleCoverageApiUrl = window.GibsyNetApi?.endpoints?.riskVehicleCoverage || `${baseApiUrl}/risk-vehicle-coverage`;
    const vehicleStorageKey = quotationRegNo ? `vehicle_risks_${quotationRegNo}` : 'vehicle_risks';

    function groupBy(array, keyFn) {
        return array.reduce((result, item) => {
            const key = keyFn(item);
            if (!key) return result;
            if (!result[key]) result[key] = [];
            result[key].push(item);
            return result;
        }, {});
    }

    function buildRowKey(row) {
        const riskNo = String(row.risk_no ?? row.riskNo ?? '').trim();
        const plate = String(row.plate_no ?? row.plateNo ?? row.reg_no ?? row.regNo ?? '').trim();
        const quotation = String((row.quotation_id ?? row.quotationId ?? quotationId) || '').trim();
        if (riskNo && plate) return `risk:${riskNo}|plate:${plate}`;
        if (riskNo) return `risk:${riskNo}`;
        if (plate) return `plate:${plate}`;
        return `quotation:${quotation}`;
    }

    function normalizeObjectRow(row) {
        return {
            group: String(row.object_group || row.object_group_code || row.group || '').trim(),
            description: String(row.object_description || row.object_description_text || row.description || '').trim(),
            value: parseNumber(row.object_value ?? row.value ?? 0)
        };
    }

    function normalizeCoverageRow(row) {
        return {
            coverage: String(row.coverage || row.coverage_code || row.code || '').trim(),
            ratePerMil: parseFloat(row.rate_percent ?? row.ratePercent ?? row.rate_per_mil ?? row.ratePerMil ?? 0) || 0
        };
    }

    // ── Model Risk API (Node.js) ──────────────────────────────────────────────
    const modelRiskNodeUrl = (window.GibsyNetApi?.baseUrl || 'http://localhost:3001/api').replace(/\/$/, '') + '/modelrisk';
    let _modelRiskAllRows = null;   // cached after first fetch

    async function fetchAllModelRiskRows() {
        if (_modelRiskAllRows !== null) return _modelRiskAllRows;
        try {
            const resp = await fetch(modelRiskNodeUrl, { headers: { Accept: 'application/json' } });
            if (!resp.ok) throw new Error(`modelrisk API error: ${resp.status}`);
            const payload = await resp.json();
            _modelRiskAllRows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        } catch (e) {
            console.warn('Failed to fetch modelrisk from Node API:', e);
            _modelRiskAllRows = [];
        }
        return _modelRiskAllRows;
    }

    function uniqueSortedValues(rows, accessor) {
        const seen = new Set();
        const result = [];
        rows.forEach(row => {
            const val = String(accessor(row) || '').trim();
            if (!val || val === '-' || val === 'null') return;
            const key = val.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            result.push({ code: val, name: val });
        });
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }

    let hasShownModelRiskError = false;

    function showConnectionWarning(message) {
        if (hasShownModelRiskError) return;
        hasShownModelRiskError = true;

        const notice = document.createElement('div');
        notice.className = 'api-warning-toast';
        notice.textContent = message;
        notice.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;background:#fee2e2;color:#991b1b;padding:10px 14px;border:1px solid #fecaca;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.12);font-size:13px;max-width:380px;line-height:1.4;';
        document.body.appendChild(notice);
    }

    // ---------- DOM Elements ----------
    const riskBadge = document.getElementById('riskBadge');
    const riskListDiv = document.getElementById('riskList');
    const addRiskBtn = document.getElementById('addRiskBtn');
    const delRiskBtn = document.getElementById('delRiskBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const updateBtn = document.getElementById('updateBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const vehicleFieldsContainer = document.getElementById('vehicleFieldsContainer');
    const coverageRowsContainer = document.getElementById('coverageRows');
    const addCoverageRowBtn = document.getElementById('addCoverageRowBtn');
    const objectRowsContainer = document.getElementById('objectRows');
    const addObjectRowBtn = document.getElementById('addObjectRowBtn');

    const activeSumInsuredDisplay = document.getElementById('activeSumInsuredDisplay');
    const activeRateDisplay = document.getElementById('activeRateDisplay');
    const premiumDisplay = document.getElementById('premiumDisplay');
    const formulaDisplay = document.getElementById('formulaDisplay');
    const globalSumInsuredDisplay = document.getElementById('globalSumInsuredDisplay');
    const globalPremiumDisplay = document.getElementById('globalPremiumDisplay');
    const riskPremiumBreakdown = document.getElementById('riskPremiumBreakdown');

    // ---------- Data Models ----------
    let risks = [];            // array of risk objects
    let activeRiskIndex = 0;

    // Default coverages lookup (fallback)
    const defaultCoverages = [
        { code: 'COMP', name: 'Comprehensive' },
        { code: 'TLO', name: 'Total Loss Only' },
        { code: 'TPL', name: 'Third Party Liability' },
        { code: 'PASS', name: 'Passenger Liability' }
    ];
    let coverageLookup = [...defaultCoverages];

    // Vehicle type lookup
    let vehicleTypes = [];
    const fallbackVehicleTypes = ['Sedan', 'SUV', 'MPV', 'Pickup', 'Truck', 'Motorcycle'];

    // Brand lookup
    let brandLookup = [];
    const fallbackBrands = [
        { code: 'TOY', name: 'Toyota' }, { code: 'HON', name: 'Honda' },
        { code: 'DAI', name: 'Daihatsu' }, { code: 'MIT', name: 'Mitsubishi' },
        { code: 'SUS', name: 'Suzuki' }, { code: 'NIS', name: 'Nissan' },
        { code: 'IAU', name: 'Isuzu' }, { code: 'BMW', name: 'BMW' },
        { code: 'MBZ', name: 'Mercedes-Benz' }, { code: 'HYU', name: 'Hyundai' },
        { code: 'KIA', name: 'KIA' }, { code: 'WUL', name: 'Wuling' }
    ];
    // Cascading lookup caches keyed by full parent chain to avoid cross-branch collisions.
    const modelLookupCache = {};     // { brand: [{code, name}] }
    const typeLookupCache = {};      // { brand||model: [{code, name}] }
    const seriesLookupCache = {};    // { brand||model||type: [{code, name}] }
    const subSeriesLookupCache = {}; // { brand||model||type||series: [{code, name}] }

    function buildCascadeKey(...parts) {
        return parts.map(part => String(part ?? '').trim()).join('||');
    }

    // Object group lookup
    let objectLookup = [];
    const fallbackObjectGroups = [
        { code: 'VEH', name: 'Vehicle Body' },
        { code: 'ACC', name: 'Accessories' },
        { code: 'MOD', name: 'Modification' },
        { code: 'EQP', name: 'Equipment' }
    ];

    // Region lookup (will be loaded from API)
    let regionLookup = [];
    const fallbackRegions = [
        { code: 'JAK', name: 'Jakarta' },
        { code: 'BGR', name: 'Bogor / Depok / Tangerang / Bekasi' },
        { code: 'JBR', name: 'Jawa Barat' },
        { code: 'JTG', name: 'Jawa Tengah' },
        { code: 'JTM', name: 'Jawa Timur' },
        { code: 'SUM', name: 'Sumatera' },
        { code: 'KAL', name: 'Kalimantan' },
        { code: 'SUL', name: 'Sulawesi' },
        { code: 'BAL', name: 'Bali & Nusa Tenggara' },
        { code: 'PAP', name: 'Papua & Maluku' }
    ];

    // Load region lookup from static fallback
    async function loadRegionLookup() {
        regionLookup = fallbackRegions;
    }

    function getModelRiskRowsFromLocalStorage() {
        try {
            const raw = localStorage.getItem('modelRiskEntries');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Invalid modelRiskEntries in localStorage:', error);
            return [];
        }
    }

    function uniqueLookupRows(values = []) {
        const seen = new Set();
        const result = [];

        values.forEach((value) => {
            const normalized = String(value || '').trim();
            if (!normalized) return;
            const key = normalized.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            result.push({ code: normalized, name: normalized });
        });

        return result;
    }

    function buildModelRiskFallbackLookup(field, queryParams = {}) {
        const rows = getModelRiskRowsFromLocalStorage();
        const brand = String(queryParams.brand || '').trim();
        const model = String(queryParams.model || '').trim();
        const type = String(queryParams.type || '').trim();
        const series = String(queryParams.series || '').trim();

        if (!rows.length) return [];

        if (field === 'brand') {
            return uniqueLookupRows(rows.map((row) => row.merkName || row.brand || row.brand_name));
        }

        if (field === 'model') {
            const filtered = rows.filter((row) => !brand || String(row.merkName || row.brand || '').trim() === brand);
            return uniqueLookupRows(filtered.map((row) => row.modelName || row.model || row.model_name));
        }

        if (field === 'type') {
            const filtered = rows.filter((row) => {
                const rowBrand = String(row.merkName || row.brand || '').trim();
                const rowModel = String(row.modelName || row.model || '').trim();
                return (!brand || rowBrand === brand) && (!model || rowModel === model);
            });
            return uniqueLookupRows(filtered.map((row) => row.typeName || row.type || row.vehicleType));
        }

        if (field === 'series') {
            const filtered = rows.filter((row) => {
                const rowBrand = String(row.merkName || row.brand || '').trim();
                const rowModel = String(row.modelName || row.model || '').trim();
                const rowType = String(row.typeName || row.type || row.vehicleType || '').trim();
                return (!brand || rowBrand === brand) && (!model || rowModel === model) && (!type || rowType === type);
            });
            return uniqueLookupRows(filtered.map((row) => row.seriesName || row.series || row.series_code));
        }

        if (field === 'subSeries') {
            const filtered = rows.filter((row) => {
                const rowBrand = String(row.merkName || row.brand || '').trim();
                const rowModel = String(row.modelName || row.model || '').trim();
                const rowType = String(row.typeName || row.type || row.vehicleType || '').trim();
                const rowSeries = String(row.seriesName || row.series || '').trim();
                return (!brand || rowBrand === brand) && (!model || rowModel === model) && (!type || rowType === type) && (!series || rowSeries === series);
            });
            return uniqueLookupRows(filtered.map((row) => row.subSeriesName || row.subSeries || row.sub_series));
        }

        return [];
    }

    async function fetchModelRiskLookup(field, queryParams = {}) {
        const allRows = await fetchAllModelRiskRows();
        if (!allRows.length) {
            const fallback = buildModelRiskFallbackLookup(field, queryParams);
            return fallback.length ? fallback : [];
        }

        const brand  = String(queryParams.brand  || '').trim();
        const model  = String(queryParams.model  || '').trim();
        const type   = String(queryParams.type   || '').trim();
        const series = String(queryParams.series || '').trim();

        const rowBrand = (r) => String(r.brand || r.merkName || r.brand_name || '').trim();
        const rowModel = (r) => String(r.model || r.modelName || r.model_name || '').trim();
        const rowType = (r) => String(r.type || r.typeName || r.vehicleType || '').trim();
        const rowSeries = (r) => String(r.series || r.seriesName || r.series_code || '').trim();
        const rowSubSeries = (r) => String(r.sub_series || r.subSeries || r.subSeriesName || '').trim();

        if (field === 'brand') {
            return uniqueSortedValues(allRows, r => rowBrand(r));
        }
        if (field === 'model') {
            const f = allRows.filter(r => !brand || rowBrand(r) === brand);
            return uniqueSortedValues(f, r => rowModel(r));
        }
        if (field === 'type') {
            const f = allRows.filter(r =>
                (!brand  || rowBrand(r) === brand) &&
                (!model  || rowModel(r) === model)
            );
            return uniqueSortedValues(f, r => rowType(r));
        }
        if (field === 'series') {
            const f = allRows.filter(r =>
                (!brand  || rowBrand(r) === brand) &&
                (!model  || rowModel(r) === model) &&
                (!type   || rowType(r) === type)
            );
            return uniqueSortedValues(f, r => rowSeries(r));
        }
        if (field === 'subSeries') {
            const f = allRows.filter(r =>
                (!brand  || rowBrand(r) === brand)  &&
                (!model  || rowModel(r) === model)  &&
                (!type   || rowType(r) === type)   &&
                (!series || rowSeries(r) === series)
            );
            return uniqueSortedValues(f, r => rowSubSeries(r));
        }
        return [];
    }

    async function loadBrandLookup() {
        try {
            const rows = await fetchModelRiskLookup('brand');
            if (rows.length) {
                brandLookup = rows;
                return;
            }
        } catch (error) {
            console.warn('Failed to load brand lookup from API:', error);
        }
        brandLookup = fallbackBrands;
    }

    // Load object group lookup from static fallback
    async function loadObjectGroups() {
        objectLookup = fallbackObjectGroups;
    }

    // Load coverage lookup from backend API for motor vehicle COB
    async function loadCoverageLookup() {
        try {
            const apiBase = (window.GibsyNetApi?.baseUrl || window.location.origin).replace(/\/$/, '');
            const url = `${apiBase}/coverage?cob_id=${encodeURIComponent('Motor Vehicle Insurance')}`;
            const resp = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!resp.ok) throw new Error(`coverage API error: ${resp.status}`);
            const payload = await resp.json();
            const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
            if (rows.length) {
                const desiredCob = 'motor vehicle insurance';
                const filteredRows = rows.filter(r => {
                    const cobId = String(r.cob_id ?? r.cobId ?? r.cob ?? '').trim().toLowerCase();
                    return cobId === desiredCob;
                });
                coverageLookup = filteredRows.map(r => {
                    const coverageText = String(r.coverage ?? r.coverage_code ?? r.code ?? r.name ?? '').trim();
                    return { code: coverageText, name: coverageText };
                }).filter(c => c.code);
                if (coverageLookup.length) return;
            }
        } catch (e) {
            console.warn('Failed to load coverage lookup from API:', e);
        }
        // fallback
        coverageLookup = [...defaultCoverages];
    }

    function safeParseJson(value) {
        if (typeof value !== 'string') return value;
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }

    async function resolveModelIdForRisk(risk) {
        const brand = String(risk?.brand || '').trim().toLowerCase();
        const model = String(risk?.model || '').trim().toLowerCase();

        const rows = [
            ...getModelRiskRowsFromLocalStorage(),
            ...(Array.isArray(_modelRiskAllRows) ? _modelRiskAllRows : [])
        ];

        const match = rows.find((row) => {
            const rowBrand = String(row?.merkName || row?.brand || row?.brand_name || row?.brandCode || '').trim().toLowerCase();
            const rowModel = String(row?.modelName || row?.model || row?.model_name || row?.modelCode || '').trim().toLowerCase();
            const rowModelId = String(row?.modelId || row?.model_id || row?.id || '').trim();
            if (!rowModelId) return false;
            const brandMatch = !brand || !rowBrand || rowBrand === brand;
            const modelMatch = !model || !rowModel || rowModel === model;
            return brandMatch && modelMatch;
        });

        return String(match?.modelId || match?.model_id || match?.id || risk?.model || '').trim();
    }

    function mapDbRowToRisk(row) {
        const objects = safeParseJson(row.objects ?? row.object_list ?? row.object_data ?? '');
        const coverages = safeParseJson(row.coverages ?? row.coverage_list ?? row.coverage_data ?? '');
        return {
            id: row.id ?? row.vehicle_id ?? null,
            brand: row.brand ?? row.brand_code ?? '',
            model: row.model ?? row.model_code ?? '',
            vehicleType: row.vehicle_type ?? row.vehicleType ?? '',
            series: row.series ?? row.series_code ?? '',
            subSeries: row.sub_series ?? row.sub_series_code ?? '',
            plateNo: row.plate_no ?? row.plateNo ?? '',
            chassisNo: row.chassis_no ?? row.chassisNo ?? '',
            engineNo: row.engine_no ?? row.engineNo ?? '',
            color: row.color ?? '',
            region: row.region ?? row.region_code ?? '',
            year: parseInt(row.year ?? row.vehicle_year, 10) || new Date().getFullYear(),
            sumInsured: parseNumber(row.sum_insured ?? row.sumInsured ?? row.sum_insured_amount ?? 0),
            objects: Array.isArray(objects) ? objects : [{ group: row.object_group ?? '', description: row.description ?? '', value: parseNumber(row.value ?? 0) }],
            coverages: Array.isArray(coverages) ? coverages : [{ coverage: 'COMP', ratePerMil: '' }]
        };
    }

    async function loadRiskVehicles() {
        let rows = [];
        let objectRows = [];
        let coverageRows = [];

        try {
            const backendUrl = new URL(riskVehicleApiUrl);
            if (quotationRegNo) backendUrl.searchParams.set('regNo', quotationRegNo);
            if (quotationId) backendUrl.searchParams.set('quotationId', quotationId);

            const response = await fetch(backendUrl.href, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load API data: ${response.status}`);
            }

            const payload = await response.json();
            rows = Array.isArray(payload?.data) ? payload.data : [];
        } catch (error) {
            console.warn('Failed to load risk_vehicle from API, fallback to localStorage:', error);
        }

        try {
            const objectUrl = new URL(riskVehicleObjectApiUrl);
            if (quotationRegNo) objectUrl.searchParams.set('regNo', quotationRegNo);
            if (quotationId) objectUrl.searchParams.set('quotationId', quotationId);
            const response = await fetch(objectUrl.href, { headers: { Accept: 'application/json' } });
            if (response.ok) {
                const payload = await response.json();
                objectRows = Array.isArray(payload?.data) ? payload.data : [];
            }
        } catch (error) {
            console.warn('Failed to load risk_vehicle_object from API:', error);
        }

        try {
            const coverageUrl = new URL(riskVehicleCoverageApiUrl);
            if (quotationRegNo) coverageUrl.searchParams.set('regNo', quotationRegNo);
            if (quotationId) coverageUrl.searchParams.set('quotationId', quotationId);
            const response = await fetch(coverageUrl.href, { headers: { Accept: 'application/json' } });
            if (response.ok) {
                const payload = await response.json();
                coverageRows = Array.isArray(payload?.data) ? payload.data : [];
            }
        } catch (error) {
            console.warn('Failed to load risk_vehicle_coverage from API:', error);
        }

        if (shouldLoadExistingData && rows.length > 0) {
            const objectGroups = groupBy(objectRows, buildRowKey);
            const coverageGroups = groupBy(coverageRows, buildRowKey);

            risks = rows.map((row) => {
                const risk = mapDbRowToRisk(row);
                const rowKey = buildRowKey(row);
                const objects = objectGroups[rowKey] || [];
                const coverages = coverageGroups[rowKey] || [];

                if (objects.length) {
                    risk.objects = objects.map(normalizeObjectRow);
                }
                if (coverages.length) {
                    risk.coverages = coverages.map(normalizeCoverageRow);
                }
                return risk;
            });
            activeRiskIndex = 0;
            saveRiskVehiclesToLocalStorage();
            console.debug('[Risk Vehicle] loaded rows for regNo=', quotationRegNo, 'id=', quotationId, 'count=', rows.length);
            return;
        }

        const stored = localStorage.getItem(vehicleStorageKey);
        if (stored && shouldLoadExistingData) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length) {
                    risks = parsed;
                    activeRiskIndex = 0;
                    return;
                }
            } catch (e) {
                console.warn('Invalid stored vehicle data', e);
            }
        }
        risks = [createDefaultRisk()];
        activeRiskIndex = 0;
    }

    function saveRiskVehiclesToLocalStorage() {
        localStorage.setItem(vehicleStorageKey, JSON.stringify(risks));
    }

    async function readApiErrorMessage(response, fallbackMessage) {
        try {
            const errorText = await response.text();
            if (!errorText) return fallbackMessage;
            try {
                const parsed = JSON.parse(errorText);
                return parsed?.message || parsed?.error || parsed?.detail || fallbackMessage;
            } catch {
                return errorText || fallbackMessage;
            }
        } catch {
            return fallbackMessage;
        }
    }

    async function saveRiskVehiclesToApi(sourceRisks = risks) {
        const payloadRows = [];

        for (let index = 0; index < sourceRisks.length; index += 1) {
            const risk = sourceRisks[index];
            const totalRatePercent = (risk.coverages || []).reduce((sum, cov) => sum + (parseFloat(cov.ratePerMil) || 0), 0);
            const sumInsured = parseNumber(risk.sumInsured);
            const premiumAmount = sumInsured * (totalRatePercent / 100);
            const modelId = await resolveModelIdForRisk(risk);

            payloadRows.push({
                vehicle_id: risk.id || undefined,
                quotation_id: quotationId || undefined,
                reg_no: quotationRegNo || undefined,
                risk_no: index + 1,
                plate_no: risk.plateNo || '',
                brand_code: risk.brand || '',
                model_code: risk.model || '',
                model_id: modelId || risk.model || undefined,
                vehicle_type: risk.vehicleType || '',
                series_code: risk.series || '',
                sub_series_code: risk.subSeries || '',
                chassis_no: risk.chassisNo || '',
                engine_no: risk.engineNo || '',
                color: risk.color || '',
                region_code: risk.region || '',
                vehicle_year: parseInt(risk.year, 10) || new Date().getFullYear(),
                sum_insured: sumInsured,
                total_rate_percent: totalRatePercent,
                premium_amount: premiumAmount,
                status_record: 'ACTIVE'
            });
        }

        const response = await fetch(riskVehicleApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                data: payloadRows,
                quotation_id: quotationId || undefined,
                reg_no: quotationRegNo || undefined,
                quotationId: quotationId || undefined,
                regNo: quotationRegNo || undefined
            })
        });

        if (!response.ok) {
            const message = await readApiErrorMessage(response, `Failed to save vehicle data: ${response.status}`);
            throw new Error(message);
        }

        const payload = await response.json();
        if (payload && payload.error) {
            throw new Error(String(payload.error));
        }

        return payload;
    }

    async function saveRiskVehicleObjectsToApi(sourceRisks = risks) {
        const payloadRows = [];
        for (let index = 0; index < sourceRisks.length; index += 1) {
            const risk = sourceRisks[index];
            const riskNo = index + 1;
            const modelId = await resolveModelIdForRisk(risk);
            const base = {
                quotation_id: quotationId || undefined,
                reg_no: quotationRegNo || undefined,
                risk_no: riskNo,
                model_id: modelId || risk.model || undefined
            };
            (risk.objects || []).forEach((obj) => {
                payloadRows.push({
                    ...base,
                    object_group: obj.group || '',
                    object_description: obj.description || '',
                    object_value: parseNumber(obj.value)
                });
            });
        }

        if (!payloadRows.length) return { processed: 0 };

        const response = await fetch(riskVehicleObjectApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                data: payloadRows,
                quotation_id: quotationId || undefined,
                reg_no: quotationRegNo || undefined,
                quotationId: quotationId || undefined,
                regNo: quotationRegNo || undefined
            })
        });

        if (!response.ok) {
            const message = await readApiErrorMessage(response, `Failed to save object data: ${response.status}`);
            throw new Error(message);
        }

        const payload = await response.json();
        if (payload && payload.error) {
            throw new Error(String(payload.error));
        }

        return payload;
    }

    async function saveRiskVehicleCoveragesToApi(sourceRisks = risks) {
        const payloadRows = [];
        for (let index = 0; index < sourceRisks.length; index += 1) {
            const risk = sourceRisks[index];
            const riskNo = index + 1;
            const modelId = await resolveModelIdForRisk(risk);
            const base = {
                quotation_id: quotationId || undefined,
                reg_no: quotationRegNo || undefined,
                risk_no: riskNo,
                model_id: modelId || risk.model || undefined
            };
            (risk.coverages || []).forEach((cov) => {
                payloadRows.push({
                    ...base,
                    coverage: cov.coverage || '',
                    rate_percent: parseFloat(cov.ratePerMil) || 0
                });
            });
        }

        if (!payloadRows.length) return { processed: 0 };

        const response = await fetch(riskVehicleCoverageApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                data: payloadRows,
                quotation_id: quotationId || undefined,
                reg_no: quotationRegNo || undefined,
                quotationId: quotationId || undefined,
                regNo: quotationRegNo || undefined
            })
        });

        if (!response.ok) {
            const message = await readApiErrorMessage(response, `Failed to save coverage data: ${response.status}`);
            throw new Error(message);
        }

        const payload = await response.json();
        if (payload && payload.error) {
            throw new Error(String(payload.error));
        }

        return payload;
    }

    async function loadModelRiskLookup(cache, cacheKey, field, queryParams = {}) {
        if (cache[cacheKey] !== undefined) return cache[cacheKey];
        let list = [];
        try {
            list = await fetchModelRiskLookup(field, queryParams);
        } catch (error) {
            console.warn(`Failed to load modelrisk lookup for ${field}:`, error);
            list = [];
        }
        cache[cacheKey] = list;
        return list;
    }

    // Cascade refresh helpers — update only the target <select> in place
    async function refreshModelSelect(brandCode) {
        const sel = document.getElementById('model');
        if (!sel) return;
        if (!brandCode) { sel.innerHTML = '<option value="">-- Select Brand first --</option>'; return; }
        const cacheKey = buildCascadeKey(brandCode);
        const list = await loadModelRiskLookup(modelLookupCache, cacheKey, 'model', { brand: brandCode });
        const risk = getActiveRisk();
        sel.innerHTML = `<option value="">-- Select Model --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.model === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    async function refreshTypeSelect(modelCode) {
        const sel = document.getElementById('vehicleType');
        if (!sel) return;
        if (!modelCode) { sel.innerHTML = '<option value="">-- Select Model first --</option>'; return; }
        const risk = getActiveRisk();
        const brandCode = risk?.brand || '';
        if (!brandCode) { sel.innerHTML = '<option value="">-- Select Brand first --</option>'; return; }
        const cacheKey = buildCascadeKey(brandCode, modelCode);
        const list = await loadModelRiskLookup(typeLookupCache, cacheKey, 'type', { brand: brandCode, model: modelCode });
        sel.innerHTML = `<option value="">-- Select Type --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.vehicleType === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    async function refreshSeriesSelect(typeCode) {
        const sel = document.getElementById('series');
        if (!sel) return;
        if (!typeCode) { sel.innerHTML = '<option value="">-- Select Type first --</option>'; return; }
        const risk = getActiveRisk();
        const brandCode = risk?.brand || '';
        const modelCode = risk?.model || '';
        if (!brandCode || !modelCode) { sel.innerHTML = '<option value="">-- Select Model first --</option>'; return; }
        const cacheKey = buildCascadeKey(brandCode, modelCode, typeCode);
        const list = await loadModelRiskLookup(seriesLookupCache, cacheKey, 'series', { brand: brandCode, model: modelCode, type: typeCode });
        sel.innerHTML = `<option value="">-- Select Series --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.series === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    async function refreshSubSeriesSelect(seriesCode) {
        const sel = document.getElementById('subSeries');
        if (!sel) return;
        if (!seriesCode) { sel.innerHTML = '<option value="">-- Select Series first --</option>'; return; }
        const risk = getActiveRisk();
        const brandCode = risk?.brand || '';
        const modelCode = risk?.model || '';
        const typeCode = risk?.vehicleType || '';
        if (!brandCode || !modelCode || !typeCode) { sel.innerHTML = '<option value="">-- Select Type first --</option>'; return; }
        const cacheKey = buildCascadeKey(brandCode, modelCode, typeCode, seriesCode);
        const list = await loadModelRiskLookup(subSeriesLookupCache, cacheKey, 'subSeries', { brand: brandCode, model: modelCode, type: typeCode, series: seriesCode });
        sel.innerHTML = `<option value="">-- Select Sub Series --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.subSeries === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    // Helper: number formatting (IDR)
    const formatMoney = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const formatMoneyNoDecimal = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    const formatRate = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const parseNumber = (val) => {
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        let cleaned = String(val).trim().replace(/\./g, '').replace(',', '.');
        let num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    // Create default risk object (single vehicle)
    function createDefaultRisk() {
        return {
            brand: '',
            model: '',
            vehicleType: '',
            series: '',
            subSeries: '',
            plateNo: '',
            chassisNo: '',
            engineNo: '',
            color: '',
            region: '',
            year: new Date().getFullYear(),
            sumInsured: 0,
            objects: [],
            coverages: [
                { coverage: 'COMP', ratePerMil: '' }
            ]
        };
    }

    // Get active risk
    function getActiveRisk() {
        return risks[activeRiskIndex];
    }

    // Recalculate totals for all risks
    function recalculateAll() {
        let totalSumInsured = 0;
        let totalPremium = 0;
        const riskPremiums = [];

        risks.forEach((risk, idx) => {
            const sumIns = risk.objects.reduce((sum, o) => sum + parseNumber(o.value), 0);
            risk.sumInsured = sumIns;
            const totalRate = risk.coverages.reduce((sum, cov) => sum + (parseFloat(cov.ratePerMil) || 0), 0);
            const premium = sumIns * (totalRate / 100);
            totalSumInsured += sumIns;
            totalPremium += premium;
            riskPremiums.push({ sumIns, totalRate, premium, idx, desc: risk.objects[0]?.description || '', plateNo: risk.plateNo || '', year: risk.year || new Date().getFullYear() });
        });

        // Update global displays
        globalSumInsuredDisplay.textContent = formatMoney(totalSumInsured);
        globalPremiumDisplay.textContent = formatMoney(totalPremium);

        // Update active risk display
        const active = getActiveRisk();
        if (active) {
            const activeSum = active.sumInsured;
            // sync readonly sum insured field in info-grid
            const sumInsEl = document.getElementById('sumInsured');
            if (sumInsEl) sumInsEl.value = formatMoney(activeSum);
            const activeRate = active.coverages.reduce((s, c) => s + (parseFloat(c.ratePerMil) || 0), 0);
            const activePremium = activeSum * (activeRate / 100);
            activeSumInsuredDisplay.textContent = formatMoney(activeSum);
            activeRateDisplay.textContent = formatRate(activeRate);
            premiumDisplay.textContent = formatMoney(activePremium);
            formulaDisplay.textContent = `${formatMoney(activeSum)} × (${formatRate(activeRate)} / 100)`;
        }

        // Render per-risk breakdown table
        if (riskPremiums.length) {
            let html = `<table border="0" style="width:100%"><thead><tr style="background:#1e3a8a;color:white"><th style="text-align:center;padding:6px 8px">Object Insured</th><th style="text-align:right;padding:6px 8px">Sum Insured</th><th style="text-align:right;padding:6px 8px">Total Rate (%)</th><th style="text-align:right;padding:6px 8px">Premium</th></tr></thead><tbody>`;
            riskPremiums.forEach(rp => {
                const activeClass = (rp.idx === activeRiskIndex) ? ' style="background:#dbeafe;font-weight:bold"' : '';
                     const baseLabel = [rp.desc, rp.plateNo].filter(Boolean).join(' : ')  || `Vehicle ${rp.idx + 1}`;
                     const objLabel = rp.year ? `${baseLabel}  - ${rp.year}` : baseLabel;
                     html += `<tr${activeClass}>
                                     <td style="text-align:left;padding:5px 8px">${escapeHtml(objLabel)}</td>
                            <td align="right" style="padding:5px 8px">${formatMoney(rp.sumIns)}</td>
                            <td align="right" style="padding:5px 8px">${formatRate(rp.totalRate)}</td>
                            <td align="right" style="padding:5px 8px">${formatMoney(rp.premium)}</td>
                         </tr>`;
            });
            html += `</tbody></table>`;
            riskPremiumBreakdown.innerHTML = html;
        } else {
            riskPremiumBreakdown.innerHTML = '<p>No vehicles added.</p>';
        }

        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'riskvehicle:totals',
                payload: {
                    totalSumInsured,
                    totalPremium
                }
            }, '*');
        }
    }

    // Render risk list pills
    function renderRiskList() {
        riskListDiv.innerHTML = risks.map((_, idx) => `<button type="button" class="risk-pill ${idx === activeRiskIndex ? 'active' : ''}" data-risk-index="${idx}">Vehicle ${idx+1}</button>`).join('');
    }

    // Build description string from vehicle identity fields
    function getVehicleDescription(risk) {
        const brandName = (brandLookup.find(b => b.code === risk.brand)?.name) || risk.brand;
        const modelName = (modelLookupCache[buildCascadeKey(risk.brand)] || []).find(m => m.code === risk.model)?.name || risk.model;
        const seriesName = (seriesLookupCache[buildCascadeKey(risk.brand, risk.model, risk.vehicleType)] || []).find(s => s.code === risk.series)?.name || risk.series;
        const subSeriesName = (subSeriesLookupCache[buildCascadeKey(risk.brand, risk.model, risk.vehicleType, risk.series)] || []).find(s => s.code === risk.subSeries)?.name || risk.subSeries;
        return [brandName, modelName, seriesName, subSeriesName].filter(Boolean).join(' ');
    }

    // Push auto-description into all objects of active risk
    function syncObjectDescriptions() {
        const r = getActiveRisk();
        if (!r || !r.objects.length) return;
        const desc = getVehicleDescription(r);
        r.objects.forEach((obj, i) => {
            obj.description = desc;
            const inp = objectRowsContainer?.querySelectorAll('.object-desc')[i];
            if (inp) inp.value = desc;
        });
    }

    // Render Vehicle Info fields into info-grid
    function renderVehicleFields() {
        const risk = getActiveRisk();
        if (!risk) return;

        const regionOptions = regionLookup.map(r =>
            `<option value="${escapeHtml(r.code)}" ${risk.region === r.code ? 'selected' : ''}>${escapeHtml(r.name)}</option>`
        ).join('');
        const modelOptions = modelLookupCache[buildCascadeKey(risk.brand)] || [];
        const typeOptions = typeLookupCache[buildCascadeKey(risk.brand, risk.model)] || [];
        const seriesOptions = seriesLookupCache[buildCascadeKey(risk.brand, risk.model, risk.vehicleType)] || [];
        const subSeriesOptions = subSeriesLookupCache[buildCascadeKey(risk.brand, risk.model, risk.vehicleType, risk.series)] || [];
        const vtOptions = (typeOptions.length ? typeOptions : fallbackVehicleTypes.map(v => ({ code: v, name: v })))
            .map(vt => `<option value="${escapeHtml(vt.code)}" ${risk.vehicleType === vt.code ? 'selected' : ''}>${escapeHtml(vt.name)}</option>`)
            .join('');
        const brandOptions = brandLookup.map(b =>
            `<option value="${escapeHtml(b.code)}" ${risk.brand === b.code ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
        ).join('');
        const modelOptionsHtml = modelOptions.length
            ? `<option value="">-- Select Model --</option>${modelOptions.map(o => `<option value="${escapeHtml(o.code)}" ${risk.model === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}`
            : '<option value="">-- Select Brand first --</option>';
        const seriesOptionsHtml = seriesOptions.length
            ? `<option value="">-- Select Series --</option>${seriesOptions.map(o => `<option value="${escapeHtml(o.code)}" ${risk.series === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}`
            : '<option value="">-- Select Type first --</option>';
        const subSeriesOptionsHtml = subSeriesOptions.length
            ? `<option value="">-- Select Sub Series --</option>${subSeriesOptions.map(o => `<option value="${escapeHtml(o.code)}" ${risk.subSeries === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}`
            : '<option value="">-- Select Series first --</option>';

        vehicleFieldsContainer.innerHTML = `
            <div class="info-item"><span class="info-label">Plate No</span><input type="text" id="plateNo" class="risk-input" value="${escapeHtml(risk.plateNo)}" placeholder="e.g. B 1234 ABC"></div>
            <div class="info-item"><span class="info-label">Brand</span><select id="brand" class="risk-input"><option value="">-- Select Brand --</option>${brandOptions}</select></div>
            <div class="info-item"><span class="info-label">Model</span><select id="model" class="risk-input">${modelOptionsHtml}</select></div>
            <div class="info-item"><span class="info-label">Vehicle Type</span><select id="vehicleType" class="risk-input"><option value="">-- Select Type --</option>${vtOptions}</select></div>
            <div class="info-item"><span class="info-label">Series</span><select id="series" class="risk-input">${seriesOptionsHtml}</select></div>
            <div class="info-item"><span class="info-label">Sub Series</span><select id="subSeries" class="risk-input">${subSeriesOptionsHtml}</select></div>
            <div class="info-item"><span class="info-label">Chassis No</span><input type="text" id="chassisNo" class="risk-input" value="${escapeHtml(risk.chassisNo)}" placeholder="VIN / Chassis No"></div>
            <div class="info-item"><span class="info-label">Engine No</span><input type="text" id="engineNo" class="risk-input" value="${escapeHtml(risk.engineNo)}" placeholder="Engine No"></div>
            <div class="info-item"><span class="info-label">Color</span><input type="text" id="color" class="risk-input" value="${escapeHtml(risk.color)}" placeholder="e.g. White"></div>
            <div class="info-item"><span class="info-label">Region (affects rate)</span><select id="region" class="risk-input"><option value="">-- Select Region --</option>${regionOptions}</select></div>
            <div class="info-item"><span class="info-label">Year</span><input type="number" id="year" class="risk-input" value="${risk.year}"></div>
            <div class="info-item"><span class="info-label">Sum Insured (Rp)</span><input type="text" id="sumInsured" class="risk-input" value="${formatMoney(risk.sumInsured)}" readonly style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;font-weight:700;font-family:'Courier New',monospace;"></div>
        `;

        const sync = () => {
            const r = getActiveRisk();
            if (!r) return;
            r.plateNo     = document.getElementById('plateNo')?.value || '';
            r.vehicleType = document.getElementById('vehicleType')?.value || '';
            r.chassisNo   = document.getElementById('chassisNo')?.value || '';
            r.engineNo    = document.getElementById('engineNo')?.value || '';
            r.color       = document.getElementById('color')?.value || '';
            r.region      = document.getElementById('region')?.value || '';
            r.year        = parseInt(document.getElementById('year')?.value) || new Date().getFullYear();
            recalculateAll();
        };

        const plainIds = ['plateNo','chassisNo','engineNo','color','year'];
        const selectIds = ['vehicleType','region'];
        plainIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', sync);
        });
        selectIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', sync);
        });

        // Cascading brand → model → type → series → subSeries
        const brandSel = document.getElementById('brand');
        if (brandSel) {
            brandSel.addEventListener('change', async (e) => {
                const r = getActiveRisk();
                if (!r) return;
                r.brand = e.target.value;
                r.model = ''; r.vehicleType = ''; r.series = ''; r.subSeries = '';
                await refreshModelSelect(r.brand);
                refreshTypeSelect('');
                refreshSeriesSelect('');
                refreshSubSeriesSelect('');
                sync();
                syncObjectDescriptions();
            });
        }

        const modelSel = document.getElementById('model');
        if (modelSel) {
            modelSel.addEventListener('change', async (e) => {
                const r = getActiveRisk();
                if (!r) return;
                r.model = e.target.value;
                r.vehicleType = ''; r.series = ''; r.subSeries = '';
                await refreshTypeSelect(r.model);
                refreshSeriesSelect('');
                refreshSubSeriesSelect('');
                sync();
                syncObjectDescriptions();
            });
        }

        const typeSel = document.getElementById('vehicleType');
        if (typeSel) {
            typeSel.addEventListener('change', async (e) => {
                const r = getActiveRisk();
                if (!r) return;
                r.vehicleType = e.target.value;
                r.series = ''; r.subSeries = '';
                await refreshSeriesSelect(r.vehicleType);
                refreshSubSeriesSelect('');
                sync();
                syncObjectDescriptions();
            });
        }

        const seriesSel = document.getElementById('series');
        if (seriesSel) {
            seriesSel.addEventListener('change', async (e) => {
                const r = getActiveRisk();
                if (!r) return;
                r.series = e.target.value;
                r.subSeries = '';
                await refreshSubSeriesSelect(r.series);
                sync();
                syncObjectDescriptions();
            });
        }

        const subSeriesSel = document.getElementById('subSeries');
        if (subSeriesSel) {
            subSeriesSel.addEventListener('change', (e) => {
                const r = getActiveRisk();
                if (r) r.subSeries = e.target.value;
                sync();
                syncObjectDescriptions();
            });
        }

        // Restore cascade state for the currently active risk
        refreshModelSelect(risk.brand).then(() => {
            if (risk.model) {
                refreshTypeSelect(risk.model).then(() => {
                    if (risk.vehicleType) {
                        refreshSeriesSelect(risk.vehicleType).then(() => {
                            if (risk.series) refreshSubSeriesSelect(risk.series);
                        });
                    }
                });
            }
        });

        sync();
    }

    // Render object rows for active risk
    function renderObjectRows() {
        const risk = getActiveRisk();
        if (!risk) return;
        if (!objectRowsContainer) return;
        objectRowsContainer.innerHTML = risk.objects.map((obj, idx) => `
            <div class="entry-row" style="grid-template-columns:minmax(160px,2fr) minmax(160px,1.5fr) minmax(120px,1fr) auto;" data-obj-index="${idx}">
                <div class="field-group">
                    <label>Object Group</label>
                    <select class="object-group-select">${objectLookup.map(g => `<option value="${escapeHtml(g.code)}" ${obj.group === g.code ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select>
                </div>
                <div class="field-group">
                    <label>Description</label>
                    <input type="text" class="object-desc" value="${escapeHtml(obj.description)}" placeholder="e.g. Toyota Avanza 1.3">
                </div>
                <div class="field-group">
                    <label>Value (Rp)</label>
                    <input type="text" class="object-value" value="${formatMoney(obj.value || 0)}" placeholder="0">
                </div>
                <div class="row-action">
                    <button class="btn-icon remove-object"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.object-group-select').forEach((sel, i) => {
            sel.addEventListener('change', (e) => {
                getActiveRisk().objects[i].group = e.target.value;
                recalculateAll();
            });
        });
        document.querySelectorAll('.object-desc').forEach((inp, i) => {
            inp.addEventListener('input', (e) => {
                getActiveRisk().objects[i].description = e.target.value;
            });
        });
        document.querySelectorAll('.object-value').forEach((inp, i) => {
            const el = inp;

            // When focused, show integer thousand-separated value (no decimals)
            el.addEventListener('focus', (e) => {
                const num = parseNumber(el.value);
                el.value = formatMoneyNoDecimal(num);
            });

            // While typing: keep thousand separators, no decimals
            el.addEventListener('input', (e) => {
                const num = parseNumber(el.value);
                getActiveRisk().objects[i].value = num;
                el.value = formatMoneyNoDecimal(num);
                recalculateAll();
            });

            // Enter key commits value (format with decimals)
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    el.blur();
                }
            });

            // On blur: format with 2 decimals for consistency
            el.addEventListener('blur', (e) => {
                const num = parseNumber(el.value);
                getActiveRisk().objects[i].value = num;
                el.value = formatMoney(num);
                recalculateAll();
            });
        });
        document.querySelectorAll('.remove-object').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                getActiveRisk().objects.splice(i, 1);
                renderObjectRows();
                recalculateAll();
            });
        });
    }

    function normalizeCoverageName(value) {
        return String(value || '').trim().toLowerCase();
    }

    function getMainCoverageType(value) {
        const norm = normalizeCoverageName(value);
        if (!norm) return null;
        if (norm === 'tlo' || norm.includes('total loss')) return 'TLO';
        if (norm === 'allrisks' || norm.includes('allrisk') || norm.includes('comprehensive')) return 'ALLRISKS';
        return null;
    }

    function getSelectedMainCoverageType(coverageRows) {
        for (const cov of coverageRows) {
            const type = getMainCoverageType(cov.coverage);
            if (type) return type;
        }
        return null;
    }

    function getSelectedMainCoverageTypeExcludingIndex(coverageRows, index) {
        for (let i = 0; i < coverageRows.length; i++) {
            if (i === index) continue;
            const type = getMainCoverageType(coverageRows[i].coverage);
            if (type) return type;
        }
        return null;
    }

    function getDefaultAdditionalCoverage() {
        return coverageLookup.find(o => !getMainCoverageType(o.code) && o.code)?.code
            || coverageLookup.find(o => !getMainCoverageType(o.name) && o.name)?.code
            || coverageLookup[0]?.code || '';
    }

    function sanitizeCoverageSelections() {
        const risk = getActiveRisk();
        if (!risk || !Array.isArray(risk.coverages)) return;

        const mainIndexes = risk.coverages
            .map((cov, idx) => ({ type: getMainCoverageType(cov.coverage), idx }))
            .filter(entry => entry.type);

        if (mainIndexes.length <= 1) return;

        const firstMainType = mainIndexes[0].type;
        const replacement = getDefaultAdditionalCoverage();

        for (let i = 1; i < mainIndexes.length; i++) {
            const idx = mainIndexes[i].idx;
            if (getMainCoverageType(risk.coverages[idx].coverage) !== firstMainType) {
                risk.coverages[idx].coverage = replacement;
            }
        }
    }

    function validateCoverageSelections(risk) {
        if (!risk || !Array.isArray(risk.coverages)) return null;
        const mainCoverages = risk.coverages
            .map(cov => getMainCoverageType(cov.coverage))
            .filter(Boolean);

        if (mainCoverages.length > 1) {
            return 'Hanya satu jaminan utama yang boleh dipilih: Comprehensive (Allrisks) atau Total Loss Only (TLO). Silakan hapus salah satu pilihan utama.';
        }
        return null;
    }

    // Render coverage rows for active risk
    function renderCoverageRows() {
        sanitizeCoverageSelections();
        const risk = getActiveRisk();
        if (!risk) return;
        const selectedMainType = getSelectedMainCoverageType(risk.coverages);
        const selectedMainIndex = risk.coverages.findIndex(cov => getMainCoverageType(cov.coverage));
        coverageRowsContainer.innerHTML = risk.coverages.map((cov, idx) => `
            <div class="entry-row" data-cov-index="${idx}">
                <div class="field-group">
                    <label>Coverage</label>
                    <select class="coverage-select">${coverageLookup.map(c => {
                        const optionType = getMainCoverageType(c.code);
                        let disabled = '';
                        if (selectedMainType) {
                            if (idx === selectedMainIndex) {
                                if (optionType && optionType !== selectedMainType) {
                                    disabled = ' disabled';
                                }
                            } else if (optionType) {
                                disabled = ' disabled';
                            }
                        }
                        return `<option value="${c.code}" ${cov.coverage === c.code ? 'selected' : ''}${disabled}>${c.name}</option>`;
                    }).join('')}</select>
                </div>
                <div class="field-group">
                    <label>Rate (%)</label>
                    <input type="number" class="coverage-rate" value="${parseFloat(cov.ratePerMil).toFixed(2)}" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="row-action"><button class="btn-icon remove-coverage"><i class="fas fa-times"></i></button></div>
            </div>
        `).join('');
        // attach events
        document.querySelectorAll('.coverage-select').forEach((sel, i) => {
            sel.addEventListener('change', (e) => {
                getActiveRisk().coverages[i].coverage = e.target.value;
                sanitizeCoverageSelections();
                renderCoverageRows();
                recalculateAll();
            });
        });
        document.querySelectorAll('.coverage-rate').forEach((inp, i) => {
            inp.addEventListener('input', (e) => {
                getActiveRisk().coverages[i].ratePerMil = parseFloat(e.target.value) || 0;
                recalculateAll();
            });
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
        renderVehicleFields();
        renderObjectRows();
        renderCoverageRows();
        recalculateAll();
        riskBadge.textContent = `Risk No: ${activeRiskIndex+1}/${risks.length}`;
    }

    // Validation
    function validateRisk(risk) {
        if (!risk.plateNo.trim()) return 'Plate No is required';
        if (!risk.brand.trim()) return 'Brand is required';
        if (!risk.model.trim()) return 'Model is required';
        if (!risk.region) return 'Region is required';
        if (parseNumber(risk.sumInsured) <= 0) return 'Sum Insured must be > 0';
        for (let cov of risk.coverages) {
            if (!cov.coverage) return 'Coverage type missing';
        }
        return null;
    }

    function validateAllRisks() {
        for (let i=0; i<risks.length; i++) {
            const err = validateRisk(risks[i]);
            if (err) return { valid: false, index: i, message: err };
            const coverageError = validateCoverageSelections(risks[i]);
            if (coverageError) return { valid: false, index: i, message: coverageError };
        }
        return { valid: true };
    }

    // Event listeners
    addRiskBtn.addEventListener('click', () => {
        risks.push(createDefaultRisk());
        activeRiskIndex = risks.length-1;
        renderAll();
    });

    if (delRiskBtn) {
        delRiskBtn.addEventListener('click', () => {
            if (!risks.length) return;

            if (risks.length === 1) {
                risks[0] = createDefaultRisk();
                activeRiskIndex = 0;
            } else {
                risks.splice(activeRiskIndex, 1);
                activeRiskIndex = Math.max(0, Math.min(activeRiskIndex, risks.length - 1));
            }

            renderAll();
        });
    }

    async function syncAllCrudEndpoints(actionLabel, options = {}) {
        const { skipValidation = false, clearData = false } = options;

        if (!skipValidation) {
            const validation = validateAllRisks();
            if (!validation.valid) {
                activeRiskIndex = validation.index;
                renderAll();
                alert(`Validation error on Vehicle ${validation.index+1}: ${validation.message}`);
                return false;
            }
        }

        if (clearData) {
            risks = [];
            activeRiskIndex = 0;
            saveRiskVehiclesToLocalStorage();
            renderAll();
        } else {
            saveRiskVehiclesToLocalStorage();
            recalculateAll();
        }

        try {
            const vehicleResult = await saveRiskVehiclesToApi(clearData ? [] : risks);
            await saveRiskVehicleObjectsToApi(clearData ? [] : risks);
            await saveRiskVehicleCoveragesToApi(clearData ? [] : risks);
            const processed = Number(vehicleResult?.processed ?? (clearData ? 0 : risks.length));
            alert(`${actionLabel} completed. Vehicle/object/coverage data were sent to the three requested endpoints. ${clearData ? 'Data was cleared locally.' : `Processed rows: ${processed}.`}`);
            return true;
        } catch (error) {
            console.error(`Failed to process ${actionLabel} CRUD action:`, error);
            const message = error?.message || `${actionLabel} failed while syncing data to the backend.`;
            alert(`${actionLabel} failed while syncing data to the backend.\n\n${message}`);
            return false;
        }
    }

    if (editBtn) {
        editBtn.addEventListener('click', async () => {
            await syncAllCrudEndpoints('Edit');
        });
    }

    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            await syncAllCrudEndpoints('Update');
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            await syncAllCrudEndpoints('Delete', { clearData: true });
        });
    }

    saveBtn.addEventListener('click', async () => {
        await syncAllCrudEndpoints('Save');
    });

    riskListDiv.addEventListener('click', (e) => {
        const btn = e.target.closest('.risk-pill');
        if (btn && btn.dataset.riskIndex !== undefined) {
            activeRiskIndex = parseInt(btn.dataset.riskIndex);
            renderAll();
        }
    });

    addCoverageRowBtn.addEventListener('click', () => {
        getActiveRisk().coverages.push({ coverage: getDefaultAdditionalCoverage(), ratePerMil: '1.5' });
        renderCoverageRows();
        recalculateAll();
    });

    if (addObjectRowBtn) {
        addObjectRowBtn.addEventListener('click', () => {
            const r = getActiveRisk();
            const desc = getVehicleDescription(r);
            r.objects.push({ group: objectLookup[0]?.code || '', description: desc, value: 0 });
            renderObjectRows();
            recalculateAll();
        });
    }

    // Tab switching
    document.querySelectorAll('.tab-btn[data-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            document.querySelectorAll('.tab-btn[data-target]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(target);
            if (panel) panel.classList.add('active');
        });
    });

    // Excel Download Template & Bulk Upload
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    const uploadExcelBtn = document.getElementById('uploadExcelBtn');
    const excelFileInput = document.getElementById('excelFileInput');

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            // Sheet 1: Vehicles
            const vehicleHeaders = [
                ['plate_no', 'brand_code', 'model_code', 'vehicle_type', 'series_code', 'sub_series_code', 'chassis_no', 'engine_no', 'color', 'region_code', 'vehicle_year']
            ];
            const vehicleSampleData = [
                ['B 1234 CD', 'TOY', 'AVN', 'Sedan', '1.5G', 'M/T', 'MR0123456', 'ENG987654', 'Black', 'JAK', 2022],
                ['B 5678 EFG', 'HON', 'BRV', 'SUV', '1.5E', 'A/T', 'MR0987654', 'ENG123456', 'White', 'JAK', 2023]
            ];

            // Sheet 2: Objects (Breakdown of Sum Insured values)
            const objectHeaders = [
                ['plate_no', 'object_group_code', 'object_description', 'object_value']
            ];
            const objectSampleData = [
                ['B 1234 CD', 'VEH', 'Vehicle Body', 150000000],
                ['B 1234 CD', 'ACC', 'Audio & Speaker', 10000000],
                ['B 5678 EFG', 'VEH', 'Vehicle Body', 220000000]
            ];

            // Sheet 3: Coverages
            const coverageHeaders = [
                ['plate_no', 'coverage_code', 'coverage_rate_percent']
            ];
            const coverageSampleData = [
                ['B 1234 CD', 'COMP', 2.5],
                ['B 1234 CD', 'TPL', 0.5],
                ['B 5678 EFG', 'COMP', 2.5]
            ];

            const wb = XLSX.utils.book_new();
            
            const wsVehicles = XLSX.utils.aoa_to_sheet([...vehicleHeaders, ...vehicleSampleData]);
            XLSX.utils.book_append_sheet(wb, wsVehicles, "risk_vehicle");

            const wsObjects = XLSX.utils.aoa_to_sheet([...objectHeaders, ...objectSampleData]);
            XLSX.utils.book_append_sheet(wb, wsObjects, "risk_vehicle_object");

            const wsCoverages = XLSX.utils.aoa_to_sheet([...coverageHeaders, ...coverageSampleData]);
            XLSX.utils.book_append_sheet(wb, wsCoverages, "risk_vehicle_coverage");

            XLSX.writeFile(wb, "vehicle_risk_bulk_template.xlsx");
        });
    }

    if (uploadExcelBtn && excelFileInput) {
        uploadExcelBtn.addEventListener('click', () => {
            excelFileInput.click();
        });

        excelFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = evt.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });

                    // Load Sheets
                    const vehicleSheetName = workbook.SheetNames[0];
                    const objectSheetName = workbook.SheetNames[1];
                    const coverageSheetName = workbook.SheetNames[2];

                    const vehicleRows = XLSX.utils.sheet_to_json(workbook.Sheets[vehicleSheetName]);
                    
                    let objectRows = [];
                    if (objectSheetName && workbook.Sheets[objectSheetName]) {
                        objectRows = XLSX.utils.sheet_to_json(workbook.Sheets[objectSheetName]);
                    }

                    let coverageRows = [];
                    if (coverageSheetName && workbook.Sheets[coverageSheetName]) {
                        coverageRows = XLSX.utils.sheet_to_json(workbook.Sheets[coverageSheetName]);
                    }

                    if (vehicleRows.length === 0) {
                        alert("Excel file: 'risk_vehicle' sheet is empty!");
                        return;
                    }

                    // Map Excel structure to FE State Model
                    const importedRisks = vehicleRows.map((row) => {
                        const plate = String(row.plate_no || row.Plate || '').trim();

                        // Find matching objects
                        const matchedObjects = objectRows
                            .filter(obj => String(obj.plate_no || '').trim() === plate)
                            .map(obj => ({
                                group: String(obj.object_group_code || 'VEH').trim().toUpperCase(),
                                description: String(obj.object_description || 'Vehicle Body').trim(),
                                value: parseFloat(obj.object_value || 0)
                            }));

                        const finalObjects = matchedObjects.length > 0 ? matchedObjects : [
                            { group: 'VEH', description: 'Vehicle Body', value: 0 }
                        ];

                        // Calculate Sum Insured from objects
                        const calculatedSumInsured = finalObjects.reduce((sum, o) => sum + o.value, 0);

                        // Find matching coverages
                        const matchedCoverages = coverageRows
                            .filter(cov => String(cov.plate_no || '').trim() === plate)
                            .map(cov => ({
                                coverage: String(cov.coverage_code || 'COMP').trim().toUpperCase(),
                                ratePerMil: parseFloat(cov.coverage_rate_percent || 2.5)
                            }));

                        const finalCoverages = matchedCoverages.length > 0 ? matchedCoverages : [
                            { coverage: 'COMP', ratePerMil: 2.5 }
                        ];

                        return {
                            brand: String(row.brand_code || row.Brand || '').toUpperCase().trim(),
                            model: String(row.model_code || row.Model || '').toUpperCase().trim(),
                            vehicleType: String(row.vehicle_type || row.Type || '').trim(),
                            series: String(row.series_code || row.Series || '').trim(),
                            subSeries: String(row.sub_series_code || row.SubSeries || '').trim(),
                            plateNo: plate,
                            chassisNo: String(row.chassis_no || row.Chassis || '').trim(),
                            engineNo: String(row.engine_no || row.Engine || '').trim(),
                            color: String(row.color || row.Color || '').trim(),
                            region: String(row.region_code || row.Region || '').toUpperCase().trim(),
                            year: parseInt(row.vehicle_year || row.Year || new Date().getFullYear(), 10),
                            sumInsured: calculatedSumInsured,
                            objects: finalObjects,
                            coverages: finalCoverages
                        };
                    });

                    // Clear the initial default risk if it's empty
                    if (risks.length === 1 && !risks[0].plateNo && risks[0].sumInsured === 0) {
                        risks = importedRisks;
                    } else {
                        risks = risks.concat(importedRisks);
                    }

                    activeRiskIndex = risks.length - 1;
                    renderAll();
                    alert(`Successfully imported ${importedRisks.length} vehicles with their objects and coverages from Excel.`);
                } catch (error) {
                    console.error("Failed to parse Excel file:", error);
                    alert("Failed to parse Excel file. Please ensure it follows the multi-sheet template format.");
                }
            };
            reader.readAsBinaryString(file);
            e.target.value = ''; // Reset file input
        });
    }

    // Load initial data
    risks.push(createDefaultRisk());
    activeRiskIndex = 0;
    Promise.all([loadRegionLookup(), loadBrandLookup(), loadObjectGroups(), loadCoverageLookup(), loadRiskVehicles()]).then(async () => {
        const risk = getActiveRisk();
        if (risk) {
            if (risk.brand) {
                await refreshModelSelect(risk.brand);
            }
            if (risk.model) {
                await refreshTypeSelect(risk.model);
            }
            if (risk.vehicleType) {
                await refreshSeriesSelect(risk.vehicleType);
            }
            if (risk.series) {
                await refreshSubSeriesSelect(risk.series);
            }
        }
        renderAll();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRiskVehicle);
} else {
    initRiskVehicle();
}

function escapeHtml(str) { return String(str).replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }