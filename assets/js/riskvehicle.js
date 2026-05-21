// riskvehicle.js
// FIXED: Backend on port 3001 only, no alternates
document.addEventListener('DOMContentLoaded', () => {
    console.log('[RiskVehicle] DOMContentLoaded fired - initializing...');

    const apiConfig = window.GibsyNetApi || {};
    const configuredRiskVehicleApiUrl = String(apiConfig.endpoints?.riskVehicle || '').trim();
    const riskVehicleApiCandidates = [
        configuredRiskVehicleApiUrl,
        'http://localhost:3001/api/risk-vehicle',
        'http://localhost:3001/api/riskvehicle'
    ].filter((url, index, arr) => Boolean(url) && arr.indexOf(url) === index);
    let activeRiskVehicleApiUrl = riskVehicleApiCandidates[0] || 'http://localhost:3001/api/riskvehicle';
    const modelRiskDataApiUrl = 'http://localhost:3001/api/modelrisk';
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRegNo = String(urlParams.get('regNo') || urlParams.get('reg_no') || '').trim();
    const requestedQuotationId = String(urlParams.get('quotationId') || urlParams.get('quotation_id') || '').trim();

    async function requestRiskVehicleApi(fetchOptions) {
        const tried = new Set();
        const fallbackOrder = [activeRiskVehicleApiUrl, ...riskVehicleApiCandidates];
        let last404Response = null;
        let lastError = null;

        for (const url of fallbackOrder) {
            if (!url || tried.has(url)) continue;
            tried.add(url);

            try {
                const response = await fetch(url, fetchOptions);
                if (response.status === 404) {
                    last404Response = response;
                    continue;
                }

                activeRiskVehicleApiUrl = url;
                return response;
            } catch (error) {
                lastError = error;
            }
        }

        if (last404Response) {
            return last404Response;
        }

        throw lastError || new Error('Risk vehicle API tidak dapat diakses');
    }

    // ---------- DOM Elements ----------
    const riskBadge = document.getElementById('riskBadge');
    const riskListDiv = document.getElementById('riskList');
    const addRiskBtn = document.getElementById('addRiskBtn');
    const saveBtn = document.getElementById('saveBtn');
    const vehicleFieldsContainer = document.getElementById('vehicleFieldsContainer');
    const coverageRowsContainer = document.getElementById('coverageRows');
    const addCoverageRowBtn = document.getElementById('addCoverageRowBtn');
    const objectRowsContainer = document.getElementById('objectRows');
    const addObjectRowBtn = document.getElementById('addObjectRowBtn');

    console.log('[RiskVehicle] DOM Elements loaded:', {
        addRiskBtn: !!addRiskBtn,
        addCoverageRowBtn: !!addCoverageRowBtn,
        addObjectRowBtn: !!addObjectRowBtn,
        saveBtn: !!saveBtn
    });

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

    let modelRiskRows = [];
    let modelRiskLoaded = false;

    // Brand lookup
    let brandLookup = [];
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
        { code: 'REG1', name: 'Region 1: Sumatera and Surrounding Island' },
        { code: 'REG2', name: 'Region 2: DKI Jakarta, West Java, and Banten' },
        { code: 'REG3', name: 'Region 3: The rest of Region 1 and Region 2' }
    ];

    // Load region lookup from static fallback
    async function loadRegionLookup() {
        regionLookup = fallbackRegions;
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
        const rows = Array.isArray(modelRiskRows) ? modelRiskRows : [];
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

    function normalizeModelRiskRows(rows = []) {
        if (!Array.isArray(rows)) return [];

        return rows
            .filter((row) => row && typeof row === 'object')
            .map((row) => ({
                brand: String(row.brand ?? row.merkName ?? row.merk_name ?? '').trim(),
                model: String(row.model ?? row.modelName ?? row.model_name ?? '').trim(),
                type: String(row.type ?? row.typeName ?? row.type_name ?? row.vehicleType ?? row.vehicle_type ?? '').trim(),
                series: String(row.series ?? row.seriesName ?? row.series_name ?? row.series_code ?? '').trim(),
                sub_series: String(row.sub_series ?? row.subSeries ?? row.subSeriesName ?? row.sub_series_name ?? '').trim()
            }))
            .filter((row) => row.brand || row.model || row.type || row.series || row.sub_series);
    }

    function extractModelRiskRows(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.rows)) return payload.rows;
        return [];
    }

    async function loadModelRiskDataset(forceReload = false) {
        if (!forceReload && modelRiskLoaded && modelRiskRows.length) {
            return modelRiskRows;
        }

        try {
            const response = await fetch(modelRiskDataApiUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`ModelRisk dataset failed: ${response.status}`);
            }

            const payload = await response.json();
            const rows = extractModelRiskRows(payload);
            modelRiskRows = normalizeModelRiskRows(rows);
            modelRiskLoaded = true;
            return modelRiskRows;
        } catch (error) {
            console.error('[RiskVehicle] Failed to load modelrisk dataset from backend:', error);
            modelRiskRows = [];
            modelRiskLoaded = false;
            return [];
        }
    }

    async function fetchModelRiskLookup(field, queryParams = {}) {
        await loadModelRiskDataset();
        return buildModelRiskFallbackLookup(field, queryParams);
    }

    async function loadBrandLookup() {
        const rows = await fetchModelRiskLookup('brand');
        brandLookup = rows;
    }

    // Load object group lookup from static fallback
    async function loadObjectGroups() {
        objectLookup = fallbackObjectGroups;
    }

    function safeParseJson(value) {
        if (typeof value !== 'string') return value;
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }

    function mapDbRowToRisk(row) {
        const objects = safeParseJson(row.objects ?? row.object_list ?? row.object_data ?? '');
        const coverages = safeParseJson(row.coverages ?? row.coverage_list ?? row.coverage_data ?? '');
        return {
            id: row.id ?? row.vehicle_id ?? null,
            regNo: row.reg_no ?? row.regNo ?? requestedRegNo,
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
            coverages: Array.isArray(coverages) ? coverages : [{ coverage: 'COMP', ratePerMil: '1.50' }]
        };
    }

    function getVehicleLabel(index, total = risks.length) {
        return total <= 1 ? 'Vehicle' : `Vehicle ${index + 1}`;
    }

    function getSharedRegNo() {
        const fromRisks = risks.find((risk) => String(risk?.regNo || '').trim());
        return String(requestedRegNo || fromRisks?.regNo || '').trim();
    }

    function normalizeRiskRegNo(risk) {
        const sharedRegNo = getSharedRegNo();
        if (risk) risk.regNo = sharedRegNo;
        return risk;
    }

    function getQuotationReturnUrl() {
        const quotationUrl = new URL('quotation.html', window.location.href);
        const regNo = getSharedRegNo();
        if (regNo) {
            quotationUrl.searchParams.set('regNo', regNo);
        }
        return quotationUrl;
    }

    function returnToQuotation(action) {
        const totals = getCurrentRiskTotals();
        const quotationUrl = getQuotationReturnUrl().toString();
        const payload = {
            type: 'riskvehicle:returnToQuotation',
            payload: {
                action: action || 'return',
                regNo: getSharedRegNo(),
                totalSumInsured: totals.totalSumInsured,
                totalPremium: totals.totalPremium
            }
        };

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, '*');
            return;
        }

        window.location.href = quotationUrl;
    }

    function getCurrentRiskTotals() {
        return risks.reduce((acc, risk) => {
            const sumInsured = parseNumber(risk?.sumInsured);
            const totalRate = Array.isArray(risk?.coverages)
                ? risk.coverages.reduce((sum, cov) => sum + (parseFloat(cov?.ratePerMil) || 0), 0)
                : 0;
            const premium = sumInsured * (totalRate / 100);
            acc.totalSumInsured += sumInsured;
            acc.totalPremium += premium;
            return acc;
        }, { totalSumInsured: 0, totalPremium: 0 });
    }

    async function loadRiskVehicles() {
        if (!requestedRegNo) {
            risks = [createDefaultRisk()];
            activeRiskIndex = 0;
            return;
        }

        try {
            const response = await requestRiskVehicleApi({
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load API data: ${response.status}`);
            }

            const payload = await response.json();
            const rows = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.data) ? payload.data : []);
            if (rows.length > 0) {
                const scopedRows = requestedRegNo
                    ? rows.filter((row) => String(row?.reg_no ?? row?.regNo ?? '').trim() === requestedRegNo)
                    : rows;

                if (scopedRows.length > 0) {
                    risks = scopedRows
                        .sort((a, b) => Number(a?.risk_no || 0) - Number(b?.risk_no || 0))
                        .map((row) => mapDbRowToRisk(row));
                } else {
                    // Keep initial view in single vehicle mode for a brand-new reg_no.
                    risks = [createDefaultRisk()];
                }
                activeRiskIndex = 0;
                saveRiskVehiclesToLocalStorage();
                return;
            }
        } catch (error) {
            console.warn('Failed to load risk_vehicle from API, fallback to localStorage:', error);
        }

        const stored = localStorage.getItem('vehicle_risks');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length) {
                    risks = requestedRegNo
                        ? parsed.filter((row) => String(row?.regNo || '').trim() === requestedRegNo)
                        : parsed;
                    if (!risks.length) {
                        risks = [createDefaultRisk()];
                    }
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
        localStorage.setItem('vehicle_risks', JSON.stringify(risks));
    }

    async function saveRiskVehiclesToApi() {
        const ensureVehicleIdsForPayload = async () => {
            const usedIds = new Set(
                risks
                    .map((risk) => Number(risk?.id))
                    .filter((id) => Number.isFinite(id) && id > 0)
            );

            let nextVehicleId = usedIds.size ? Math.max(...usedIds) + 1 : 1;

            try {
                const currentRegNo = String(getSharedRegNo()).trim();
                if (currentRegNo) {
                    const lookupResponse = await requestRiskVehicleApi({
                        method: 'GET',
                        headers: {
                            Accept: 'application/json'
                        }
                    });

                    if (lookupResponse.ok) {
                        const lookupPayload = await lookupResponse.json().catch(() => ({}));
                        const lookupRows = Array.isArray(lookupPayload)
                            ? lookupPayload
                            : (Array.isArray(lookupPayload?.data) ? lookupPayload.data : []);

                        const scopedRows = lookupRows.filter((row) => String(row?.reg_no ?? row?.regNo ?? '').trim() === currentRegNo);
                        const idByRiskNo = new Map(
                            scopedRows
                                .map((row) => [Number(row?.risk_no), Number(row?.vehicle_id ?? row?.id)])
                                .filter(([riskNo, vehicleId]) => Number.isFinite(riskNo) && Number.isFinite(vehicleId) && vehicleId > 0)
                        );

                        const maxExistingVehicleId = lookupRows.reduce((max, row) => {
                            const id = Number(row?.vehicle_id ?? row?.id);
                            return Number.isFinite(id) && id > max ? id : max;
                        }, 0);

                        if (maxExistingVehicleId > 0) {
                            nextVehicleId = Math.max(nextVehicleId, maxExistingVehicleId + 1);
                        }

                        risks.forEach((risk, index) => {
                            const currentId = Number(risk?.id);
                            if (Number.isFinite(currentId) && currentId > 0) {
                                usedIds.add(currentId);
                                return;
                            }

                            const foundId = Number(idByRiskNo.get(index + 1));
                            if (Number.isFinite(foundId) && foundId > 0) {
                                risk.id = foundId;
                                usedIds.add(foundId);
                                return;
                            }

                            while (usedIds.has(nextVehicleId)) {
                                nextVehicleId += 1;
                            }
                            risk.id = nextVehicleId;
                            usedIds.add(nextVehicleId);
                            nextVehicleId += 1;
                        });
                        return;
                    }
                }
            } catch (error) {
                console.warn('[RiskVehicle] Unable to pre-resolve existing vehicle IDs:', error);
            }

            risks.forEach((risk) => {
                const currentId = Number(risk?.id);
                if (Number.isFinite(currentId) && currentId > 0) {
                    usedIds.add(currentId);
                    return;
                }

                while (usedIds.has(nextVehicleId)) {
                    nextVehicleId += 1;
                }
                risk.id = nextVehicleId;
                usedIds.add(nextVehicleId);
                nextVehicleId += 1;
            });
        };

        await ensureVehicleIdsForPayload();

        // Resolve existing IDs by reg_no + risk_no so save updates instead of inserting duplicates.
        try {
            const currentRegNo = String(getSharedRegNo()).trim();
            if (currentRegNo) {
                const lookupResponse = await requestRiskVehicleApi({
                    method: 'GET',
                    headers: {
                        Accept: 'application/json'
                    }
                });

                if (lookupResponse.ok) {
                    const lookupPayload = await lookupResponse.json().catch(() => ({}));
                    const lookupRows = Array.isArray(lookupPayload)
                        ? lookupPayload
                        : (Array.isArray(lookupPayload?.data) ? lookupPayload.data : []);

                    const idByRiskNo = new Map(
                        lookupRows
                            .filter((row) => String(row?.reg_no ?? row?.regNo ?? '').trim() === currentRegNo)
                            .map((row) => [Number(row?.risk_no), Number(row?.vehicle_id ?? row?.id)])
                            .filter(([riskNo, vehicleId]) => Number.isFinite(riskNo) && Number.isFinite(vehicleId) && vehicleId > 0)
                    );

                    risks.forEach((risk, index) => {
                        if (!Number.isFinite(Number(risk?.id)) || Number(risk.id) <= 0) {
                            const foundId = idByRiskNo.get(index + 1);
                            if (Number.isFinite(foundId) && foundId > 0) {
                                risk.id = foundId;
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('[RiskVehicle] Unable to pre-resolve existing vehicle IDs:', error);
        }

        const payloadRows = risks.map((risk, index) => {
            const sharedRegNo = getSharedRegNo();
            const totalRatePercent = (risk.coverages || []).reduce((sum, cov) => sum + (parseFloat(cov.ratePerMil) || 0), 0);
            const sumInsured = parseNumber(risk.sumInsured);
            const premiumAmount = sumInsured * (totalRatePercent / 100);
            const regNo = String(risk.regNo || sharedRegNo).trim();
            const resolvedVehicleId = Number(risk.id);
            const hasVehicleId = Number.isFinite(resolvedVehicleId) && resolvedVehicleId > 0;
            const vehicleId = hasVehicleId ? resolvedVehicleId : (index + 1);

            const payload = {
                id: vehicleId,
                vehicle_id: vehicleId,
                quotation_id: requestedQuotationId || '',
                reg_no: regNo,
                risk_no: index + 1,
                plate_no: risk.plateNo || '',
                brand_code: String(risk.brand || '-').trim() || '-',
                model_code: String(risk.model || '-').trim() || '-',
                vehicle_type: String(risk.vehicleType || '-').trim() || '-',
                series_code: String(risk.series || '-').trim() || '-',
                sub_series_code: String(risk.subSeries || '-').trim() || '-',
                chassis_no: String(risk.chassisNo || '-').trim() || '-',
                engine_no: String(risk.engineNo || '-').trim() || '-',
                color: String(risk.color || 'BLACK').trim() || 'BLACK',
                region_code: String(risk.region || 'REG2').trim() || 'REG2',
                vehicle_year: parseInt(risk.year, 10) || new Date().getFullYear(),
                sum_insured: sumInsured,
                total_rate_percent: totalRatePercent,
                premium_amount: premiumAmount,
                status_record: 'ACTIVE',
                objects: Array.isArray(risk.objects) ? risk.objects.map((obj, objectIndex) => {
                    return {
                        id: vehicleId,
                        vehicle_id: hasVehicleId ? resolvedVehicleId : (index + 1),
                        reg_no: regNo,
                        object_no: objectIndex + 1,
                        group: obj.group || '',
                        objectGroup: obj.group || '',
                        description: obj.description || '',
                        objectDescription: obj.description || '',
                        value: parseNumber(obj.value) || 0,
                        objectValue: parseNumber(obj.value) || 0
                    };
                }) : [],
                coverages: Array.isArray(risk.coverages) ? risk.coverages.map((cov, coverageIndex) => {
                    return {
                        id: vehicleId,
                        vehicle_id: hasVehicleId ? resolvedVehicleId : (index + 1),
                        reg_no: regNo,
                        coverage_no: coverageIndex + 1,
                        coverage: cov.coverage || '',
                        coverageCode: cov.coverage || '',
                        ratePerMil: parseNumber(cov.ratePerMil) || 0,
                        rate_per_mil: parseNumber(cov.ratePerMil) || 0,
                        ratePercent: parseNumber(cov.ratePerMil) || 0
                    };
                }) : []
            };

            console.log(`[RiskVehicle] Risk ${index + 1} Payload:`, payload);
            return payload;
        });

        const resolveVehicleIdForPayload = async (rowPayload) => {
            const regNo = String(rowPayload?.reg_no || '').trim();
            const riskNo = Number(rowPayload?.risk_no);

            if (!regNo || !Number.isFinite(riskNo)) {
                return null;
            }

            const response = await requestRiskVehicleApi({
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json().catch(() => ({}));
            const rows = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.data) ? payload.data : []);

            const exactMatch = rows.find((row) => {
                const rowRegNo = String(row?.reg_no ?? row?.regNo ?? '').trim();
                const rowRiskNo = Number(row?.risk_no ?? row?.riskNo);
                return rowRegNo === regNo && Number.isFinite(rowRiskNo) && rowRiskNo === riskNo;
            });

            const existingId = Number(exactMatch?.vehicle_id ?? exactMatch?.id);
            if (Number.isFinite(existingId) && existingId > 0) {
                return existingId;
            }

            const maxId = rows.reduce((max, row) => {
                const id = Number(row?.vehicle_id ?? row?.id);
                if (Number.isFinite(id) && id > max) {
                    return id;
                }
                return max;
            }, 0);

            return maxId > 0 ? maxId + 1 : 1;
        };

        const applyVehicleIdToPayload = (rowPayload, vehicleId) => {
            rowPayload.vehicle_id = vehicleId;
            if (Array.isArray(rowPayload.objects)) {
                rowPayload.objects = rowPayload.objects.map((obj) => ({
                    ...obj,
                    vehicle_id: vehicleId
                }));
            }
            if (Array.isArray(rowPayload.coverages)) {
                rowPayload.coverages = rowPayload.coverages.map((cov) => ({
                    ...cov,
                    vehicle_id: vehicleId
                }));
            }
        };

        const getApiFailureMessage = (response, payload) => {
            const apiErrors = Array.isArray(payload?.errors)
                ? payload.errors.map((item) => String(item || '').trim()).filter(Boolean)
                : [];
            const processedCount = Number(payload?.processed);
            const hasErrorArrayFailure = apiErrors.length > 0 && (!Number.isFinite(processedCount) || processedCount === 0);

            if (!response.ok || payload?.status === 'error' || payload?.error || hasErrorArrayFailure) {
                return String(payload?.message || payload?.error || apiErrors[0] || `Failed to save API data: ${response.status}`);
            }

            return '';
        };

        const isVehicleIdRequiredError = (message = '') => {
            const normalized = String(message || '').toLowerCase();
            return normalized.includes('vehicle_id') && normalized.includes('required');
        };

        const isDuplicateRegRiskError = (message = '') => {
            const normalized = String(message || '').toLowerCase();
            const hasRegRiskKey = normalized.includes('reg_no') && normalized.includes('risk_no');
            const hasDuplicateKeyword = normalized.includes('duplikat')
                || normalized.includes('duplicate')
                || normalized.includes('already exists')
                || normalized.includes('nilai yang unik')
                || normalized.includes('unique');
            return hasRegRiskKey && hasDuplicateKeyword;
        };

        let processed = 0;
        const errors = [];
        const rows = [];

        for (let index = 0; index < payloadRows.length; index += 1) {
            const rowPayload = payloadRows[index];
            try {
                console.log(`[RiskVehicle] Sending row ${index} to API:`, rowPayload);
                let response = await requestRiskVehicleApi({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify({ data: [rowPayload] })
                });

                let payload = await response.json().catch(() => ({}));
                let failureMessage = getApiFailureMessage(response, payload);

                if (failureMessage && isVehicleIdRequiredError(failureMessage)) {
                    // Compatibility: some legacy APIs expect a single object payload, not an array.
                    response = await requestRiskVehicleApi({
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        },
                        body: JSON.stringify(rowPayload)
                    });
                    payload = await response.json().catch(() => ({}));
                    failureMessage = getApiFailureMessage(response, payload);
                }

                if (failureMessage && (isVehicleIdRequiredError(failureMessage) || isDuplicateRegRiskError(failureMessage))) {
                    const ensuredVehicleId = await resolveVehicleIdForPayload(rowPayload);
                    if (Number.isFinite(ensuredVehicleId) && ensuredVehicleId > 0) {
                        applyVehicleIdToPayload(rowPayload, ensuredVehicleId);
                        console.warn(`[RiskVehicle] Retrying row ${index} with resolved vehicle_id=${ensuredVehicleId}`);
                        response = await requestRiskVehicleApi({
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Accept: 'application/json'
                            },
                            body: JSON.stringify(rowPayload)
                        });
                        payload = await response.json().catch(() => ({}));
                        failureMessage = getApiFailureMessage(response, payload);
                    }
                }

                console.log(`[RiskVehicle] API Response for row ${index}:`, payload);
                if (failureMessage) {
                    throw new Error(String(failureMessage));
                }

                const persistedVehicleId = Number(
                    payload?.rows?.[0]?.vehicle_id
                    ?? payload?.data?.vehicle_id
                    ?? rowPayload.vehicle_id
                    ?? 0
                ) || rowPayload.vehicle_id;

                rowPayload.vehicle_id = persistedVehicleId;

                rows.push({
                    index,
                    vehicle_id: persistedVehicleId,
                    reg_no: rowPayload.reg_no,
                    risk_no: rowPayload.risk_no
                });
                processed += 1;
            } catch (error) {
                errors.push(`Row ${index + 1}: ${error.message}`);
                console.error(`[RiskVehicle] Error saving row ${index}:`, error);
            }
        }

        return { processed, errors, rows };
    }

    async function persistRiskVehicles(action = 'save') {
        console.log('[RiskVehicle] persistRiskVehicles called with action:', action);
        console.log('[RiskVehicle] Current risks:', JSON.stringify(risks, null, 2));
        
        const validation = validateAllRisks();
        if (!validation.valid) {
            activeRiskIndex = validation.index;
            await renderAll();
            alert(`Validation error on ${getVehicleLabel(validation.index)}: ${validation.message}`);
            return false;
        }

        const effectiveRegNo = String(getActiveRisk()?.regNo || requestedRegNo || '').trim();
        if (!effectiveRegNo) {
            alert('Reg No tidak ditemukan. Buka risk vehicle dari Quotation agar parameter regNo ikut terkirim.');
            return false;
        }

        risks.forEach((risk) => normalizeRiskRegNo(risk));

        // Ensure objects and coverages are never empty
        risks.forEach((risk, idx) => {
            if (!Array.isArray(risk.objects) || risk.objects.length === 0) {
                console.warn(`[RiskVehicle] Risk ${idx} has no objects, adding default`);
                risk.objects = [{ group: 'VEH', description: 'Vehicle Body', value: 0 }];
            }
            if (!Array.isArray(risk.coverages) || risk.coverages.length === 0) {
                console.warn(`[RiskVehicle] Risk ${idx} has no coverages, adding default`);
                risk.coverages = [{ coverage: 'COMP', ratePerMil: 2.5 }];
            }
        });

        console.log('[RiskVehicle] After ensuring objects/coverages:', JSON.stringify(risks, null, 2));

        saveRiskVehiclesToLocalStorage();
        recalculateAll();

        try {
            const result = await saveRiskVehiclesToApi();
            console.log('[RiskVehicle] API save result:', result);
            
            if (Array.isArray(result?.rows)) {
                result.rows.forEach((rowResult) => {
                    const targetRisk = risks[rowResult.index];
                    if (targetRisk && rowResult.vehicle_id !== undefined && rowResult.vehicle_id !== null) {
                        targetRisk.id = rowResult.vehicle_id;
                    }
                    if (targetRisk && !String(targetRisk.regNo || '').trim() && rowResult.reg_no) {
                        targetRisk.regNo = rowResult.reg_no;
                    }
                });
            }

            const processed = Number(result?.processed ?? 0);
            const errors = Array.isArray(result?.errors) ? result.errors.filter(Boolean) : [];

            if (processed > 0 && errors.length === 0) {
                alert(`Data berhasil disimpan ke backend API. Total baris diproses: ${processed}.`);
                returnToQuotation(action);
                return true;
            }

            if (processed > 0 && errors.length > 0) {
                alert(`Sebagian data tersimpan. Diproses: ${processed}, gagal: ${errors.length}. Detail: ${errors.slice(0, 3).join(' | ')}`);
                returnToQuotation(action);
                return true;
            }

            alert(`Tidak ada data yang diproses backend API. Detail: ${errors.slice(0, 3).join(' | ') || 'Unknown error'}`);
            return false;
        } catch (error) {
            console.error('Failed to save risk_vehicle to API:', error);
            alert(`Data disimpan di browser, tetapi gagal sinkron ke backend API. Detail: ${error.message}`);
            return false;
        }
    }

    async function deleteRiskVehicleFromApi(risk, riskIndex) {
        const payloadRow = {
            vehicle_id: risk?.id || undefined,
            quotation_id: requestedQuotationId || undefined,
            quotationId: requestedQuotationId || undefined,
            reg_no: String(risk?.regNo || requestedRegNo || '').trim(),
            risk_no: Number.isFinite(Number(riskIndex)) ? Number(riskIndex) + 1 : undefined
        };

        const response = await requestRiskVehicleApi({
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ data: [payloadRow] })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.message || payload?.error || `Failed to delete risk vehicle: ${response.status}`);
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
        if (!brandCode) {
            const sel = document.getElementById('model');
            if (sel) sel.innerHTML = '<option value="">-- Select Brand first --</option>';
            return;
        }
        const cacheKey = buildCascadeKey(brandCode);
        const list = await loadModelRiskLookup(modelLookupCache, cacheKey, 'model', { brand: brandCode });
        const sel = document.getElementById('model');
        if (!sel) return;  // Cache already populated, element just doesn't exist yet
        const risk = getActiveRisk();
        sel.innerHTML = `<option value="">-- Select Model --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.model === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    async function refreshTypeSelect(modelCode) {
        const risk = getActiveRisk();
        const brandCode = risk?.brand || '';
        if (!modelCode || !brandCode) {
            const sel = document.getElementById('vehicleType');
            if (sel) sel.innerHTML = '<option value="">-- Select Model first --</option>';
            return;
        }
        const cacheKey = buildCascadeKey(brandCode, modelCode);
        const list = await loadModelRiskLookup(typeLookupCache, cacheKey, 'type', { brand: brandCode, model: modelCode });
        const sel = document.getElementById('vehicleType');
        if (!sel) return;  // Cache already populated, element just doesn't exist yet
        sel.innerHTML = `<option value="">-- Select Type --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.vehicleType === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    async function refreshSeriesSelect(typeCode) {
        const risk = getActiveRisk();
        const brandCode = risk?.brand || '';
        const modelCode = risk?.model || '';
        if (!typeCode || !brandCode || !modelCode) {
            const sel = document.getElementById('series');
            if (sel) sel.innerHTML = '<option value="">-- Select Type first --</option>';
            return;
        }
        const cacheKey = buildCascadeKey(brandCode, modelCode, typeCode);
        const list = await loadModelRiskLookup(seriesLookupCache, cacheKey, 'series', { brand: brandCode, model: modelCode, type: typeCode });
        const sel = document.getElementById('series');
        if (!sel) return;  // Cache already populated, element just doesn't exist yet
        sel.innerHTML = `<option value="">-- Select Series --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.series === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    async function refreshSubSeriesSelect(seriesCode) {
        const risk = getActiveRisk();
        const brandCode = risk?.brand || '';
        const modelCode = risk?.model || '';
        const typeCode = risk?.vehicleType || '';
        if (!seriesCode || !brandCode || !modelCode || !typeCode) {
            const sel = document.getElementById('subSeries');
            if (sel) sel.innerHTML = '<option value="">-- Select Series first --</option>';
            return;
        }
        const cacheKey = buildCascadeKey(brandCode, modelCode, typeCode, seriesCode);
        const list = await loadModelRiskLookup(subSeriesLookupCache, cacheKey, 'subSeries', { brand: brandCode, model: modelCode, type: typeCode, series: seriesCode });
        const sel = document.getElementById('subSeries');
        if (!sel) return;  // Cache already populated, element just doesn't exist yet
        sel.innerHTML = `<option value="">-- Select Sub Series --</option>` +
            list.map(o => `<option value="${escapeHtml(o.code)}" ${risk && risk.subSeries === o.code ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
    }

    // Helper: number formatting (IDR)
    const formatMoney = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
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
            regNo: requestedRegNo,
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
            objects: [
                { group: 'VEH', description: 'Vehicle Body', value: 0 }
            ],
            coverages: [
                { coverage: 'COMP', ratePerMil: 2.5 }
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
            riskPremiums.push({ sumIns, totalRate, premium, idx });
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
            let html = `<table border="0" style="width:100%"><thead><tr style="background:#1e3a8a;color:white"><th>Vehicle No</th><th>Sum Insured</th><th>Total Rate (%)</th><th>Premium</th></tr></thead><tbody>`;
            riskPremiums.forEach(rp => {
                const activeClass = (rp.idx === activeRiskIndex) ? ' style="background:#dbeafe;font-weight:bold"' : '';
                html += `<tr${activeClass}>
                            <td>${getVehicleLabel(rp.idx)}</td>
                            <td align="right">${formatMoney(rp.sumIns)}</td>
                            <td align="right">${formatRate(rp.totalRate)}</td>
                            <td align="right">${formatMoney(rp.premium)}</td>
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
        riskListDiv.innerHTML = risks.map((_, idx) => `<button type="button" class="risk-pill ${idx === activeRiskIndex ? 'active' : ''}" data-risk-index="${idx}">${getVehicleLabel(idx)}</button>`).join('');
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
            r.brand       = document.getElementById('brand')?.value || '';
            r.model       = document.getElementById('model')?.value || '';
            r.plateNo     = document.getElementById('plateNo')?.value || '';
            r.vehicleType = document.getElementById('vehicleType')?.value || '';
            r.series      = document.getElementById('series')?.value || '';
            r.subSeries   = document.getElementById('subSeries')?.value || '';
            r.chassisNo   = document.getElementById('chassisNo')?.value || '';
            r.engineNo    = document.getElementById('engineNo')?.value || '';
            r.color       = document.getElementById('color')?.value || '';
            r.region      = document.getElementById('region')?.value || '';
            r.year        = parseInt(document.getElementById('year')?.value) || new Date().getFullYear();
            recalculateAll();
        };

        const plainIds = ['plateNo','chassisNo','engineNo','color','year'];
        const selectIds = ['vehicleType','series','subSeries','region'];
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
                    <input type="number" class="object-value" value="${obj.value || 0}" placeholder="0" min="0" step="1">
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
            inp.addEventListener('input', (e) => {
                getActiveRisk().objects[i].value = parseFloat(e.target.value) || 0;
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

    // Render coverage rows for active risk
    function renderCoverageRows() {
        const risk = getActiveRisk();
        if (!risk) return;
        coverageRowsContainer.innerHTML = risk.coverages.map((cov, idx) => `
            <div class="entry-row" data-cov-index="${idx}">
                <div class="field-group">
                    <label>Coverage</label>
                    <select class="coverage-select">${coverageLookup.map(c => `<option value="${c.code}" ${cov.coverage === c.code ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
                </div>
                <div class="field-group">
                    <label>Rate (%)</label>
                    <input type="number" class="coverage-rate" value="${parseNumber(cov.ratePerMil).toFixed(2)}" placeholder="0.00" min="0" step="0.01">
                </div>
                <div class="row-action"><button class="btn-icon remove-coverage"><i class="fas fa-times"></i></button></div>
            </div>
        `).join('');
        // attach events
        document.querySelectorAll('.coverage-select').forEach((sel, i) => {
            sel.addEventListener('change', (e) => {
                getActiveRisk().coverages[i].coverage = e.target.value;
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
    async function renderAll() {
        renderRiskList();
        // CRITICAL: Populate cascade caches BEFORE rendering vehicle fields
        // This ensures options are available so selected attributes work correctly
        await hydrateVehicleCascadeForActiveRisk();
        renderVehicleFields();
        renderObjectRows();
        renderCoverageRows();
        recalculateAll();
        riskBadge.textContent = `Risk No: ${activeRiskIndex+1}/${risks.length}`;
    }

    async function hydrateVehicleCascadeForActiveRisk() {
        const risk = getActiveRisk();
        console.log('[RiskVehicle] hydrateVehicleCascadeForActiveRisk - risk:', risk);
        if (!risk) return;

        if (risk.brand) {
            console.log('[RiskVehicle] Hydrating model cache for brand:', risk.brand);
            await refreshModelSelect(risk.brand);
        }
        if (risk.model) {
            console.log('[RiskVehicle] Hydrating type cache for model:', risk.model);
            await refreshTypeSelect(risk.model);
        }
        if (risk.vehicleType) {
            console.log('[RiskVehicle] Hydrating series cache for type:', risk.vehicleType);
            await refreshSeriesSelect(risk.vehicleType);
        }
        if (risk.series) {
            console.log('[RiskVehicle] Hydrating subseries cache for series:', risk.series);
            await refreshSubSeriesSelect(risk.series);
        }
        console.log('[RiskVehicle] Cascade hydration complete');
    }

    // Validation
    function validateRisk(risk) {
        if (!risk.plateNo.trim()) return 'Plate No is required';
        if (!risk.brand.trim()) return 'Brand is required';
        if (!risk.model.trim()) return 'Model is required';
        if (!risk.vehicleType.trim()) return 'Type is required';
        // Series/Sub Series can be unavailable for some model-risk datasets.
        if (!risk.region) return 'Region is required';
        if (parseNumber(risk.sumInsured) <= 0) return 'Sum Insured must be > 0';
        for (let cov of risk.coverages) {
            if (!cov.coverage) return 'Coverage type missing';
            if (parseNumber(cov.ratePerMil) <= 0) return 'Rate must be > 0';
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

    // Event listeners
    if (addRiskBtn) {
        addRiskBtn.addEventListener('click', async () => {
            try {
                risks.push(normalizeRiskRegNo(createDefaultRisk()));
                activeRiskIndex = risks.length-1;
                await renderAll();
                console.log('[RiskVehicle] Risk added, total:', risks.length);
            } catch (e) {
                console.error('[RiskVehicle] Error adding risk:', e);
            }
        });
        console.log('[RiskVehicle] addRiskBtn listener registered');
    } else {
        console.warn('[RiskVehicle] addRiskBtn element not found');
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await persistRiskVehicles('save');
                console.log('[RiskVehicle] Save completed');
            } catch (e) {
                console.error('[RiskVehicle] Error saving:', e);
            }
        });
        console.log('[RiskVehicle] saveBtn listener registered');
    } else {
        console.warn('[RiskVehicle] saveBtn element not found');
    }

    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', async () => {
            await persistRiskVehicles('edit');
        });
    }

    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const activeRisk = getActiveRisk();
            if (!activeRisk) {
                returnToQuotation('delete');
                return;
            }

            const confirmed = window.confirm(`Hapus ${getVehicleLabel(activeRiskIndex)} dari quotation ini?`);
            if (!confirmed) return;

            if (String(activeRisk.regNo || requestedRegNo || '').trim()) {
                try {
                    await deleteRiskVehicleFromApi(activeRisk, activeRiskIndex);
                } catch (error) {
                    console.error('Failed to delete risk_vehicle from API:', error);
                    alert(`Gagal menghapus data backend. Detail: ${error.message}`);
                    return;
                }
            }

            risks.splice(activeRiskIndex, 1);
            if (!risks.length) {
                risks.push(normalizeRiskRegNo(createDefaultRisk()));
            }

            activeRiskIndex = Math.min(activeRiskIndex, risks.length - 1);
            saveRiskVehiclesToLocalStorage();
            await renderAll();
            returnToQuotation('delete');
        });
    }

    riskListDiv.addEventListener('click', async (e) => {
        const btn = e.target.closest('.risk-pill');
        if (btn && btn.dataset.riskIndex !== undefined) {
            activeRiskIndex = parseInt(btn.dataset.riskIndex);
            await renderAll();
        }
    });

    if (addCoverageRowBtn) {
        addCoverageRowBtn.addEventListener('click', () => {
            try {
                const r = getActiveRisk();
                const newCov = { coverage: 'COMP', ratePerMil: 1.5 };
                console.log('[RiskVehicle] Adding coverage:', newCov);
                r.coverages.push(newCov);
                console.log('[RiskVehicle] Coverages after add:', r.coverages);
                renderCoverageRows();
                recalculateAll();
                console.log('[RiskVehicle] Coverage row added');
            } catch (e) {
                console.error('[RiskVehicle] Error adding coverage:', e);
            }
        });
        console.log('[RiskVehicle] addCoverageRowBtn listener registered');
    } else {
        console.warn('[RiskVehicle] addCoverageRowBtn element not found');
    }

    if (addObjectRowBtn) {
        addObjectRowBtn.addEventListener('click', () => {
            try {
                const r = getActiveRisk();
                const desc = getVehicleDescription(r);
                const newObj = { group: objectLookup[0]?.code || 'VEH', description: desc, value: 0 };
                console.log('[RiskVehicle] Adding object:', newObj);
                r.objects.push(newObj);
                console.log('[RiskVehicle] Objects after add:', r.objects);
                renderObjectRows();
                recalculateAll();
                console.log('[RiskVehicle] Object row added');
            } catch (e) {
                console.error('[RiskVehicle] Error adding object:', e);
            }
        });
        console.log('[RiskVehicle] addObjectRowBtn listener registered');
    } else {
        console.warn('[RiskVehicle] addObjectRowBtn element not found');
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

    // Load initial data
    risks.push(createDefaultRisk());
    activeRiskIndex = 0;
    Promise.all([loadRegionLookup(), loadModelRiskDataset(), loadBrandLookup(), loadObjectGroups(), loadRiskVehicles()]).then(async () => {
        await renderAll();

        console.log('[RiskVehicle] Initialization complete - all event listeners ready');
    }).catch(err => {
        console.error('[RiskVehicle] Initialization error:', err);
    });
});

function escapeHtml(str) { return String(str).replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }