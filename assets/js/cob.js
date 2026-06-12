const productData = {
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

const STORAGE_KEY = 'cob_products_v4';
const COB_PRODUCTS_API_URL = 'http://localhost:3001/api/cob';

let products = [];
let versionHistory = [];
let selectedProductId = null;
let currentPage = 1;
const rowsPerPage = 8;

const productIdInput = document.getElementById('productId');
const typeInput = document.getElementById('type');
const cobInput = document.getElementById('cob');
const subCobInput = document.getElementById('subCob');
const cobCodeInput = document.getElementById('cobCode');
const descriptionInput = document.getElementById('description');
const typeLabelInput = document.getElementById('typeLabel');
const productTableBody = document.getElementById('productTableBody');
const searchInput = document.getElementById('searchInput');
const rowCountSpan = document.getElementById('rowCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
const messageModal = document.getElementById('messageModal');
const messageText = document.getElementById('messageText');
const messageOk = document.getElementById('messageOk');

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
});

function getElement(id) {
    return document.getElementById(id);
}

function showLoading(show) {
    const loading = getElement('loadingIndicator');
    if (!loading) return;
    loading.classList.toggle('hidden', !show);
}

function showMessage(message) {
    if (!messageModal || !messageText) {
        alert(message);
        return;
    }
    messageText.textContent = message;
    messageModal.style.display = 'block';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

function saveProductsToStorage() {
    const sanitized = products.map((item) => {
        const { category, ...rest } = item;
        return rest;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
}

function loadProductsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return false;
        products = parsed.map((item) => {
            const { category, ...rest } = item;
            return {
                ...rest,
                apiId: resolveCobApiId(item)
            };
        });
        return true;
    } catch {
        return false;
    }
}

function getTypeLabel(type) {
    return type === 'LI' ? 'Life Insurance' : type === 'GI' ? 'General Insurance' : '-';
}

function getCobLabel(type, code) {
    return productData[type]?.cob?.[code]?.name || code || '-';
}

function getInitials(text, maxLen) {
    const cleaned = String(text || '').trim().replace(/[^A-Za-z0-9\s]/g, ' ').trim();
    if (!cleaned) return 'GEN';
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].toUpperCase().slice(0, maxLen || 3);
    return words.map((w) => w[0]).join('').toUpperCase().slice(0, maxLen || 6) || 'GEN';
}

function generateCobCode(type, cobName) {
    const typeLabel = String(getTypeLabel(type) || type || '').trim();
    const a = typeLabel.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
    const b = String(cobName || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
    return `${a}${b}`;
}
function normalizeCobCodeRaw(input) {
    if (!input) return '';
    const cleaned = String(input || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleaned) return '';
    if (cleaned.length >= 6) return cleaned.slice(0, 6);
    return cleaned.padEnd(6, 'X');
}

function generateCobId(cob, subCob) {
    const cobCode = String(cob || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const subCode = subCob ? getInitials(subCob, 3) : 'GEN';
    const prefix = `${cobCode}-${subCode}`;

    const maxSeq = products.reduce((max, item) => {
        const id = String(item.productId || '');
        if (!id.startsWith(prefix + '-')) return max;
        const match = id.match(/-(\d{3,})$/);
        const seq = match ? parseInt(match[1], 10) : 0;
        return Math.max(max, seq);
    }, 0);

    return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

function migrateProductIds() {
    const cobIdPattern = /^[A-Z0-9]+-[A-Z0-9]+-\d{3,}$/;
    const seqMap = {};
    products.forEach((item) => {
        if (cobIdPattern.test(String(item.productId || ''))) return; // already new format
        const cobCode = String(item.cob || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        const subCode = item.subCob ? getInitials(item.subCob, 3) : 'GEN';
        const prefix = `${cobCode}-${subCode}`;
        seqMap[prefix] = (seqMap[prefix] || 0) + 1;
        item.productId = `${prefix}-${String(seqMap[prefix]).padStart(3, '0')}`;
    });
    saveProductsToStorage();
}

function updateGeneratedProductId() {
    if (!productIdInput) return;
    if (selectedProductId) return;

    const cob = cobInput?.value || '';
    const subCob = subCobInput?.value || '';

    if (cob) {
        productIdInput.value = generateCobId(cob, subCob);
    } else {
        productIdInput.value = '';
    }
}

function updateCobOptions() {
    if (!cobInput || !typeInput) return;

    const type = typeInput.value;
    if (!type) {
        if (cobInput.tagName === 'INPUT') {
            cobInput.value = '';
        } else {
            cobInput.innerHTML = '<option value="">Select COB</option>';
        }
        if (subCobInput) subCobInput.innerHTML = '<option value="">Select Sub COB</option>';
        updateCobCode();
        return;
    }

    if (cobInput.tagName === 'SELECT') {
        cobInput.innerHTML = '<option value="">Select COB</option>';
        Object.entries(productData[type]?.cob || {}).forEach(([code, item]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = item.name;
            cobInput.appendChild(option);
        });
    } else {
        // input: clear current value so user can type new COB name when type changes
        cobInput.value = '';
    }

    // If Sub COB input is present, update its options; otherwise skip.
    if (subCobInput) updateSubCobOptions();
    updateGeneratedProductId();
    updateDescription();
    updateCobCode();
}

function updateSubCobOptions() {
    if (!subCobInput || !typeInput || !cobInput) return;

    subCobInput.innerHTML = '<option value="">Select Sub COB</option>';

    const type = typeInput.value;
    const cob = cobInput.value;
    // Resolve cob key: prefer direct key, otherwise match by name
    let cobKey = cob;
    if (!productData[type]?.cob?.[cobKey]) {
        for (const [code, info] of Object.entries(productData[type]?.cob || {})) {
            if (String(info.name || '').toLowerCase() === String(cob || '').toLowerCase()) {
                cobKey = code;
                break;
            }
        }
    }
    const options = productData[type]?.cob?.[cobKey]?.sub || [];

    options.forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        subCobInput.appendChild(option);
    });

    updateDescription();
}

function updateDescription() {
    if (!descriptionInput) return;

    const type = typeInput?.value || '';
    const cob = cobInput?.value || '';
    const subCob = subCobInput?.value || '';

    if (!type || !cob) {
        descriptionInput.value = '';
        return;
    }

    const typeLabel = getTypeLabel(type);
    const cobLabel = getCobLabel(type, cob);

    if (typeLabelInput) typeLabelInput.value = typeLabel;
    descriptionInput.value = `${cobLabel}${subCob ? ` (${subCob})` : ''}`;
}

function updateCobCode() {
    if (!cobCodeInput) return;
    const type = typeInput?.value || '';
    let cobLabel = '';
    if (cobInput) {
        if (cobInput.tagName === 'SELECT') {
            const selectedCobOption = cobInput.selectedOptions?.[0];
            cobLabel = String(selectedCobOption?.textContent || cobInput?.value || '').trim();
        } else {
            cobLabel = String(cobInput.value || '').trim();
        }
    }
    if (!type || !cobLabel) {
        cobCodeInput.value = '';
        return;
    }
    // ensure normalized consistent format
    cobCodeInput.value = normalizeCobCodeRaw(generateCobCode(type, cobLabel));
}

function filteredProducts() {
    const keyword = (searchInput?.value || '').toLowerCase();
    return products.filter((item) => {
        if (item.status === 'inactive') return false;

        const typeLabel = getTypeLabel(item.type).toLowerCase();
        const cobLabel = getCobLabel(item.type, item.cob).toLowerCase();

        return String(item.productId || '').toLowerCase().includes(keyword) ||
            typeLabel.includes(keyword) ||
            cobLabel.includes(keyword) ||
            String(item.subCob || '').toLowerCase().includes(keyword) ||
            String(item.description || '').toLowerCase().includes(keyword);
    });
}

function getSoftDeletedProducts() {
    return products.filter((item) => item.status === 'inactive');
}

function renderTable() {
    const filtered = filteredProducts();
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    if (!productTableBody) return;
    productTableBody.innerHTML = '';

            if (!pageData.length) {
        productTableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-gray-500">No data available.</td></tr>';
    } else {
        pageData.forEach((item, index) => {
            const rowNumber = start + index + 1;
            const row = document.createElement('tr');
            row.dataset.id = item.productId;
            if (selectedProductId === item.productId) row.classList.add('selected');

            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-700">${rowNumber}</td>
                <td class="px-4 py-3 text-sm font-mono text-xs text-gray-700">${item.productId || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${getTypeLabel(item.type)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.cobName || getCobLabel(item.type, item.cob)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.cobCode || '-'}</td>
                <!-- Sub COB column removed -->
                <td class="px-4 py-3 text-sm text-gray-700">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" onclick="event.stopPropagation(); selectProduct('${item.productId}')"><i class="fas fa-pen mr-1"></i>Edit</button>
                </td>
            `;

            row.addEventListener('click', () => selectProduct(item.productId));
            productTableBody.appendChild(row);
        });
    }

    if (rowCountSpan) rowCountSpan.textContent = String(filtered.length);
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    renderGovernancePanels();
}

function resetForm() {
    const form = getElement('productForm');
    if (form) form.reset();

    if (productIdInput) productIdInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (typeLabelInput) typeLabelInput.value = '';
    if (cobCodeInput) cobCodeInput.value = '';
    selectedProductId = null;

    updateCobOptions();
    renderTable();
}

async function selectProduct(productId) {
    const index = products.findIndex((product) => product.productId === productId);
    if (index === -1) return;

    let item = products[index];
    const resolvedApiId = resolveCobApiId(item);

    if (hasValue(resolvedApiId)) {
        showLoading(true);
        try {
            const apiDetail = await loadCobProductByIdFromApi(resolvedApiId);
            if (apiDetail) {
                products[index] = {
                    ...item,
                    ...apiDetail,
                    apiId: resolveCobApiId(apiDetail) || resolvedApiId
                };
                item = products[index];
                saveProductsToStorage();
            }
        } catch (error) {
            console.error('Failed to load COB detail by ID from API:', error);
        } finally {
            showLoading(false);
        }
    }

    if (!item) return;

    if (!item.type) item.type = 'GI';

    selectedProductId = item.productId;

    if (productIdInput) productIdInput.value = item.productId;
    if (typeInput) typeInput.value = item.type;
    updateCobOptions();

    const cobLabel = item.cobName || item.cob || '';
    ensureSelectOption(cobInput, item.cob, cobLabel);
    if (cobInput) cobInput.value = item.cob || '';
    updateSubCobOptions();

    ensureSelectOption(subCobInput, item.subCob, item.subCob);
    if (subCobInput) subCobInput.value = item.subCob || '';
    if (descriptionInput) descriptionInput.value = item.description || '';
    if (typeLabelInput) typeLabelInput.value = item.typeLabel || getTypeLabel(item.type) || '';
    if (cobCodeInput) cobCodeInput.value = normalizeCobCodeRaw(item.cobCode || generateCobCode(item.type, cobLabel));

    renderTable();
}

function validateForm() {
    if (!typeInput?.value) {
        showMessage('Type is required.');
        return false;
    }

    if (!cobInput?.value) {
        showMessage('COB is required.');
        return false;
    }

    return true;
}

function mapTypeToApi(type) {
    // Return the 2-letter enum value that the MySQL cob.type column expects ('LI', 'GI')
    if (type === 'GI') return 'GI';
    if (type === 'LI') return 'LI';
    return String(type || '').toUpperCase();
}

function buildCobProductCreatePayload(data) {
    const cobName = String(data?.cobName || getCobLabel(data.type, data.cob) || data.cob || '').trim();

    return {
        cob_id: data.productId,
        cob: data.cob || '',
        cob_name: cobName,
        cob_type: mapTypeToApi(data.type),
        cob_code: normalizeCobCodeRaw(data.cobCode || generateCobCode(data.type, cobName)),
        sub_cob_name: data.subCob || '',
        sub_cob: data.subCob || '',
        type_label: data.typeLabel || getTypeLabel(data.type),
        description: data.description || '',
        type: mapTypeToApi(data.type),
        status: 'active'
    };
}

function buildCobProductUpdatePayload(data) {
    const isInactive = String(data?.status || '').toLowerCase() === 'inactive';
    const safeType = String(data?.type || 'GI').trim();
    const cobName = String(data?.cobName || getCobLabel(safeType, data?.cob) || data?.cob || '').trim();

    return {
        cob_id: data.productId,
        cob: data.cob || '',
        cob_type: mapTypeToApi(safeType),
        cob_code: normalizeCobCodeRaw(data.cobCode || generateCobCode(safeType, cobName)),
        cob_name: cobName,
        sub_cob_name: data.subCob || '',
        sub_cob: data.subCob || '',
        description: data.description || '',
        type: mapTypeToApi(safeType),
        status: isInactive ? 'inactive' : 'active'
    };
}

async function parseErrorMessage(response, fallbackMessage) {
    try {
        const errorPayload = await response.json();
        const serverMessage = errorPayload?.message || errorPayload?.error;
        if (serverMessage) return serverMessage;
    } catch (_) {
    }

    return fallbackMessage;
}

function extractFirstData(payload) {
    if (Array.isArray(payload?.data)) return payload.data[0] || null;
    return payload?.data || null;
}

function hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
}

function resolveCobApiId(item) {
    if (!item || typeof item !== 'object') return null;

    const candidates = [
        item.apiId,
        item.id,
        item.cob_id,
        item.cobId,
        item.cob_code,
        item.productId,
        item.cob
    ];

    for (const candidate of candidates) {
        if (hasValue(candidate)) return candidate;
    }

    return null;
}

function isNetworkFetchError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('network request failed') ||
        message.includes('load failed');
}

async function createCobProductToApi(data) {
    const payload = buildCobProductCreatePayload(data);

    let response;
    try {
        response = await fetch(COB_PRODUCTS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        if (isNetworkFetchError(error)) {
            throw new Error(`Cannot connect to COB API server (${COB_PRODUCTS_API_URL}).`);
        }
        throw error;
    }

    if (!response.ok) {
        const fallbackMessage = `Failed to create COB product in API (status ${response.status}) at ${response.url}.`;
        const errorMessage = await parseErrorMessage(response, fallbackMessage);
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch (_) {
        return null;
    }
}

async function updateCobProductToApi(apiId, data) {
    const payload = buildCobProductUpdatePayload(data);
    const response = await fetch(`${COB_PRODUCTS_API_URL}/${encodeURIComponent(apiId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const fallbackMessage = `Failed to update COB product in API (status ${response.status}).`;
        const errorMessage = await parseErrorMessage(response, fallbackMessage);
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch (_) {
        return null;
    }
}

async function deleteCobProductToApi(item) {
    const apiId = resolveCobApiId(item);
    if (!hasValue(apiId)) {
        throw new Error('Cannot delete COB record because API identifier is missing.');
    }

    const endpoint = `${COB_PRODUCTS_API_URL}/${encodeURIComponent(apiId)}`;
    const fallbackPayload = buildCobProductUpdatePayload({ ...item, status: 'inactive' });
    let lastResponse = null;

    for (const method of ['PATCH', 'PUT']) {
        let fallbackResponse;
        try {
            fallbackResponse = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(fallbackPayload)
            });
        } catch (error) {
            if (isNetworkFetchError(error)) {
                throw new Error(`Cannot connect to COB API server (${COB_PRODUCTS_API_URL}).`);
            }
            throw error;
        }

        if (fallbackResponse.ok) {
            try {
                return await fallbackResponse.json();
            } catch (_) {
                return null;
            }
        }

        lastResponse = fallbackResponse;
    }

    const fallbackStatus = lastResponse?.status || 'unknown';
    const fallbackMessage = `Failed to mark COB product as inactive in API (status ${fallbackStatus}).`;
    const errorMessage = lastResponse
        ? await parseErrorMessage(lastResponse, fallbackMessage)
        : fallbackMessage;
    throw new Error(errorMessage);
}

function mapApiTypeToUi(type) {
    const value = String(type || '').trim().toLowerCase();
    if (value === 'gi' || value === 'general') return 'GI';
    if (value === 'li' || value === 'life') return 'LI';
    return '';
}

function mapApiStatusToUi(status, isActive) {
    const statusValue = String(status || '').trim().toLowerCase();
    if (statusValue === 'inactive' || statusValue === 'deleted') return 'inactive';

    if (isActive !== undefined && isActive !== null) {
        const activeValue = String(isActive).trim().toLowerCase();
        if (activeValue === '0' || activeValue === 'false') return 'inactive';
    }

    return 'active';
}

function mapCobProductFromApi(item) {
    const cobId = String(item?.cob_id ?? item?.id ?? '').trim();
    const cobCode = String(item?.cob_code || item?.code || '').trim();
    const cobName = String(item?.cob_name || '').trim();
    const subCobName = String(item?.sub_cob_name || '').trim();
    const createdAt = String(item?.created_at || '').trim();
    const apiId = resolveCobApiId(item);

    return {
        productId: cobId || `COB-${String(item?.id || Date.now())}`,
        type: mapApiTypeToUi(item?.cob_type || item?.type),
        cob: cobName || cobCode || '',
        cobCode: cobCode || '',
        cobName: cobName || cobCode,
        subCob: subCobName,
        typeLabel: String(item?.type_label || getTypeLabel(item.type)).trim(),
        description: String(item?.description || '').trim(),
        status: mapApiStatusToUi(item?.status, item?.is_active),
        deletedAt: '',
        updatedAt: createdAt || new Date().toISOString(),
        apiId
    };
}

async function loadProductsFromApi() {
    try {
        const response = await fetch(COB_PRODUCTS_API_URL, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to load COB products from API (status ${response.status}).`);
        }

        const payload = await response.json();
        if (payload?.success === false) return false;

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const existingInactive = products.filter((item) => String(item?.status || '').toLowerCase() === 'inactive');
        const apiRows = rows.map((item) => mapCobProductFromApi(item));
        const apiProductIds = new Set(apiRows.map((item) => String(item?.productId || '').trim()).filter(Boolean));

        existingInactive.forEach((item) => {
            const productId = String(item?.productId || '').trim();
            if (!productId) return;
            if (apiProductIds.has(productId)) return;

            apiRows.push({
                ...item,
                status: 'inactive',
                apiId: resolveCobApiId(item)
            });
        });

        products = apiRows;
        saveProductsToStorage();
        return true;
    } catch (error) {
        console.error('Failed to load COB products from API:', error);
        return false;
    }
}

async function loadCobProductByIdFromApi(apiId) {
    const response = await fetch(`${COB_PRODUCTS_API_URL}/${encodeURIComponent(apiId)}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`Failed to load COB product detail from API (status ${response.status}).`);
    }

    const payload = await response.json();
    if (payload?.success === false) {
        return null;
    }

    const firstRow = extractFirstData(payload);

    if (!firstRow) return null;
    return mapCobProductFromApi(firstRow);
}

async function refreshProductsAfterMutation() {
    const refreshed = await loadProductsFromApi();
    if (!refreshed) {
        saveProductsToStorage();
    }
    return refreshed;
}

function hasDuplicate(data) {
    return products.some((item) =>
        item.status !== 'inactive' &&
        item.productId !== selectedProductId &&
        item.type === data.type &&
        item.cob === data.cob &&
        item.subCob === data.subCob
    );
}

function ensureSelectOption(selectElement, value, label) {
    if (!selectElement) return;

    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return;

    if (selectElement.tagName === 'SELECT') {
        const hasOption = Array.from(selectElement.options).some((option) => option.value === normalizedValue);
        if (hasOption) return;
        const option = document.createElement('option');
        option.value = normalizedValue;
        option.textContent = String(label || normalizedValue).trim() || normalizedValue;
        selectElement.appendChild(option);
        return;
    }

    // If element is an input, set its value to the provided label or value
    if (selectElement.tagName === 'INPUT') {
        selectElement.value = String(label || normalizedValue).trim() || normalizedValue;
    }
}

function addVersion(action, product) {
    versionHistory.unshift({
        action,
        productId: product.productId,
        label: `${getTypeLabel(product.type)} - ${getCobLabel(product.type, product.cob)}`,
        actor: 'System',
        time: new Date().toLocaleString('en-US')
    });

    versionHistory = versionHistory.slice(0, 10);
}

async function saveProduct() {
    if (!validateForm()) return;

    let selectedCobLabel = '';
    if (cobInput) {
        if (cobInput.tagName === 'SELECT') {
            const selectedCobOption = cobInput.selectedOptions?.[0];
            selectedCobLabel = String(selectedCobOption?.textContent || '').trim();
        } else {
            selectedCobLabel = String(cobInput.value || '').trim();
        }
    }

    const data = {
        productId: selectedProductId || generateCobId(cobInput?.value || '', subCobInput?.value || ''),
        type: typeInput.value,
        cob_type: typeInput.value,
        cob: cobInput?.value || '',
        cobName: selectedCobLabel || cobInput?.value || '',
        cobCode: normalizeCobCodeRaw(cobCodeInput?.value || generateCobCode(typeInput.value, selectedCobLabel || cobInput?.value || '')),
        subCob: subCobInput?.value || '',
        description: descriptionInput?.value || '',
        typeLabel: typeLabelInput?.value || '',
        status: 'active',
        deletedAt: '',
        updatedAt: new Date().toISOString()
    };

    if (hasDuplicate(data)) {
        showMessage('Duplicate data detected for the same Type and COB.');
        return;
    }

    const isUpdateFlow = Boolean(selectedProductId);

    showLoading(true);

    try {
        let createdWithLocalFallback = false;

        if (isUpdateFlow) {
            const index = products.findIndex((item) => item.productId === selectedProductId);
            if (index !== -1) {
                const existing = products[index];
                const apiId = resolveCobApiId(existing);
                if (!hasValue(apiId)) {
                    throw new Error('Cannot update COB record because API identifier is missing.');
                }

                const updateResult = await updateCobProductToApi(apiId, data);
                const updatedApiData = extractFirstData(updateResult);
                const mapped = updatedApiData ? mapCobProductFromApi(updatedApiData) : null;

                products[index] = {
                    ...existing,
                    ...data,
                    ...(mapped || {}),
                    apiId
                };

                addVersion('Updated', products[index]);
                showMessage('COB record has been updated successfully.');
            }
        } else {
            let createdApiData = null;

            try {
                const createResult = await createCobProductToApi(data);
                createdApiData = extractFirstData(createResult);
            } catch (error) {
                if (!isNetworkFetchError(error) && !String(error?.message || '').includes('Cannot connect to COB API server')) {
                    throw error;
                }
                createdWithLocalFallback = true;
            }

            const createdRecord = {
                ...data,
                apiId: resolveCobApiId(createdApiData)
            };

            if (createdApiData) {
                const mapped = mapCobProductFromApi(createdApiData);
                createdRecord.productId = mapped.productId || createdRecord.productId;
                createdRecord.cob = mapped.cob || createdRecord.cob;
                    createdRecord.cobCode = mapped.cobCode || createdRecord.cobCode;
                createdRecord.cobName = mapped.cobName || createdRecord.cobName;
                createdRecord.subCob = mapped.subCob;
                createdRecord.description = mapped.description || createdRecord.description;
                createdRecord.status = mapped.status || createdRecord.status;
                createdRecord.updatedAt = mapped.updatedAt || createdRecord.updatedAt;
                createdRecord.apiId = resolveCobApiId(createdApiData) || createdRecord.apiId;
            }

            products.push(createdRecord);
            addVersion('Created', createdRecord);
            showMessage('COB record has been added successfully.');
        }

        if (isUpdateFlow) {
            await refreshProductsAfterMutation();
        } else {
            await refreshProductsAfterMutation();
        }

        resetForm();
    } catch (error) {
        showMessage(error?.message || 'Failed to save COB product data.');
    } finally {
        showLoading(false);
    }
}

function requestDelete() {
    if (!selectedProductId) {
        showMessage('Please select a record to delete.');
        return;
    }

    if (confirmMessage) confirmMessage.textContent = 'Are you sure you want to delete this record?';
    if (confirmModal) confirmModal.style.display = 'block';
}

async function confirmDeleteRecord() {
    closeModal(confirmModal);
    if (!selectedProductId) return;

    const item = products.find((product) => product.productId === selectedProductId);
    if (!item) return;

    showLoading(true);

    try {
        let deletedWithLocalFallback = false;

        try {
            await deleteCobProductToApi(item);
        } catch (error) {
            const message = String(error?.message || '');
            const apiUnavailable = isNetworkFetchError(error) || message.includes('Cannot connect to COB API server');
            if (!apiUnavailable) {
                throw error;
            }
            deletedWithLocalFallback = true;
        }

        item.status = 'inactive';
        item.deletedAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();

        addVersion('Deleted', item);
        if (deletedWithLocalFallback) {
            saveProductsToStorage();
            showMessage('COB record has been deleted successfully.');
        } else {
            await refreshProductsAfterMutation();
            showMessage('COB record has been deleted successfully and moved to Soft Delete.');
        }

        resetForm();
    } catch (error) {
        showMessage(error?.message || 'Failed to delete COB product data.');
    } finally {
        showLoading(false);
    }
}

async function restoreProduct(productId) {
    const item = products.find((product) => product.productId === productId && product.status === 'inactive');
    if (!item) return;

    showLoading(true);

    try {
        let restoredWithLocalFallback = false;
        const apiId = resolveCobApiId(item);

        const restoredData = {
            ...item,
            status: 'active',
            deletedAt: '',
            updatedAt: new Date().toISOString()
        };

        if (hasValue(apiId)) {
            try {
                await updateCobProductToApi(apiId, restoredData);
            } catch (error) {
                const message = String(error?.message || '');
                const apiUnavailable = isNetworkFetchError(error) || message.includes('Cannot connect to COB API server');
                if (!apiUnavailable) {
                    throw error;
                }
                restoredWithLocalFallback = true;
            }
        } else {
            restoredWithLocalFallback = true;
        }

        item.status = 'active';
        item.deletedAt = '';
        item.updatedAt = restoredData.updatedAt;

        addVersion('Restored', item);
        if (restoredWithLocalFallback) {
            saveProductsToStorage();
            showMessage(`COB record ${item.productId} has been restored successfully.`);
        } else {
            await refreshProductsAfterMutation();
            showMessage(`COB record ${item.productId} has been restored successfully.`);
        }
        renderTable();
    } catch (error) {
        showMessage(error?.message || 'Failed to restore COB product data.');
    } finally {
        showLoading(false);
    }
}

function exportProducts() {
    const data = filteredProducts();
    if (!data.length) {
        showMessage('No data available for export.');
        return;
    }

    const rows = [
        ['Product ID', 'Type', 'COB', 'COB Code', 'Description'],
        ...data.map((item) => [
            item.productId,
            getTypeLabel(item.type),
            item.cobName || getCobLabel(item.type, item.cob),
            item.cobCode || '',
            item.description || ''
        ])
    ];

    const csvContent = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cob-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage('COB data exported successfully.');
}

function renderImpactAnalysis() {
    const tbody = getElement('impactTableBody');
    const metric = getElement('metricImpact');
    if (!tbody) return;

    const active = filteredProducts();
    const lifeCount = active.filter((item) => item.type === 'LI').length;
    const rows = [
        { tool: 'Quotation Engine', impact: Math.min(100, active.length * 8), risk: active.length > 14 ? 'High' : 'Medium' },
        { tool: 'Compliance Sync', impact: lifeCount > 0 ? 82 : 65, risk: lifeCount > 3 ? 'High' : 'Low' },
        { tool: 'Product Mapping', impact: Math.min(96, active.length * 10), risk: active.length > 8 ? 'Medium' : 'Low' }
    ];

    tbody.innerHTML = rows
        .map((item) => `<tr><td class="py-2">${item.tool}</td><td class="py-2">${item.impact}%</td><td class="py-2">${item.risk}</td></tr>`)
        .join('');

    if (metric) {
        const average = Math.round(rows.reduce((sum, item) => sum + item.impact, 0) / rows.length);
        metric.textContent = String(average);
    }
}

function renderVersioning() {
    const container = getElement('versionList');
    const metric = getElement('metricVersions');
    if (metric) metric.textContent = String(versionHistory.length);
    if (!container) return;

    if (!versionHistory.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No data changes yet.</p>';
        return;
    }

    container.innerHTML = versionHistory
        .map((item) => `
            <div class="version-item">
                <div class="font-semibold text-sm text-gray-800">${item.action} - ${item.productId}</div>
                <div class="text-sm text-gray-600">${item.label}</div>
                <div class="version-meta">${item.actor} • ${item.time}</div>
            </div>
        `)
        .join('');
}

function renderSoftDeletePanel() {
    const container = getElement('softDeleteList');
    const metric = getElement('metricSoftDelete');
    if (!container) return;

    const deleted = getSoftDeletedProducts();
    if (metric) metric.textContent = String(deleted.length);

    if (!deleted.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No records in Soft Delete.</p>';
        return;
    }

    container.innerHTML = deleted
        .map((item) => `
            <div class="dependency-item">
                <div class="font-semibold text-sm text-gray-800">${item.productId} - ${getCobLabel(item.type, item.cob)}</div>
                <div class="dependency-meta">Deleted at: ${item.deletedAt ? new Date(item.deletedAt).toLocaleString('en-US') : '-'}</div>
                <button class="action-link mt-1" data-restore="${item.productId}">Restore</button>
            </div>
        `)
        .join('');
}

function renderDependencyControl() {
    const container = getElement('dependencyList');
    const metric = getElement('metricDependency');
    if (!container) return;

    const active = filteredProducts();
    const items = [
        { name: 'Product-Policy Link', status: active.length ? 'healthy' : 'warning', detail: `${active.length} mapped records` },
        { name: 'Quotation Dependency', status: active.length > 2 ? 'healthy' : 'warning', detail: 'COB readiness score' }
    ];

    container.innerHTML = items
        .map((item) => `
            <div class="dependency-item">
                <div class="font-semibold text-sm text-gray-800">${item.name}</div>
                <div class="dependency-meta">${item.detail} • ${item.status.toUpperCase()}</div>
            </div>
        `)
        .join('');

    const healthy = items.filter((item) => item.status === 'healthy').length;
    if (metric) metric.textContent = `${Math.round((healthy / items.length) * 100)}%`;
}

function renderAISuggestions() {
    const container = getElement('aiSuggestionList');
    if (!container) return;

    const active = filteredProducts();
    const generalCount = active.filter((item) => item.type === 'GI').length;
    const noSubCob = active.filter((item) => !item.subCob).length;

        const suggestions = [
            `${active.length} active COB records are ready for quotation mapping.`,
            noSubCob > 0
                ? `There are ${noSubCob} records missing subcategory mapping.`
                : 'Subcategory mapping present where available.',
            generalCount > 0
                ? `Review ${generalCount} General Insurance records for cross-module dependency checks.`
                : 'No General Insurance records detected. Add if required by business line.',
            'Future Ready: Use COB trend scoring to optimize pricing and approval workflows.'
        ];

    container.innerHTML = suggestions
        .map((item) => `
            <div class="version-item">
                <div class="font-semibold text-sm text-gray-800"><i class="fas fa-lightbulb text-sky-600 mr-2"></i>Suggestion</div>
                <div class="version-meta">${item}</div>
            </div>
        `)
        .join('');
}

function updateHealthDashboard() {
    const active = filteredProducts();
    const complete = active.filter((item) => item.productId && item.type && item.cob).length;
    const quality = active.length ? Math.round((complete / active.length) * 100) : 0;

    const qualityEl = getElement('metricQuality');
    if (qualityEl) qualityEl.textContent = `${quality}%`;
}

function renderGovernancePanels() {
    renderImpactAnalysis();
    renderVersioning();
    renderSoftDeletePanel();
    renderDependencyControl();
    renderAISuggestions();
    updateHealthDashboard();
}

function setupEventListeners() {
    typeInput?.addEventListener('change', () => {
        updateCobOptions();
        updateGeneratedProductId();
    });

    cobInput?.addEventListener('change', () => {
        updateSubCobOptions();
        updateGeneratedProductId();
        updateCobCode();
    });
    // update cob code while typing for input-type cob
    cobInput?.addEventListener('input', () => {
        updateGeneratedProductId();
        updateDescription();
        updateCobCode();
    });

    subCobInput?.addEventListener('change', () => {
        updateDescription();
        updateGeneratedProductId();
    });

    const newButton = getElement('newBtnSidebar');
    const saveButton = getElement('saveBtnSidebar');
    const deleteButton = getElement('deleteBtnSidebar');
    const exportButton = getElement('exportBtnSidebar');

    newButton?.addEventListener('click', resetForm);
    saveButton?.addEventListener('click', saveProduct);
    deleteButton?.addEventListener('click', requestDelete);
    exportButton?.addEventListener('click', exportProducts);

    searchInput?.addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });

    prevBtn?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderTable();
        }
    });

    nextBtn?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredProducts().length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage += 1;
            renderTable();
        }
    });

    confirmCancel?.addEventListener('click', () => closeModal(confirmModal));
    confirmOk?.addEventListener('click', confirmDeleteRecord);
    messageOk?.addEventListener('click', () => closeModal(messageModal));

    window.addEventListener('click', (event) => {
        if (event.target === confirmModal) closeModal(confirmModal);
        if (event.target === messageModal) closeModal(messageModal);
    });

    getElement('softDeleteList')?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest('[data-restore]');
        if (!button) return;

        const productId = button.getAttribute('data-restore');
        if (productId) restoreProduct(productId);
    });
}

async function loadProducts() {
    showLoading(true);

    const loadedFromStorage = loadProductsFromStorage();
    const loadedFromApi = await loadProductsFromApi();

    if (!loadedFromStorage && !loadedFromApi) {
        const now = new Date();
        products = [
            {
                productId: 'MOT-C-001',
                type: 'GI',
                cob: 'MOT',
                subCob: 'Comprehensive',
                description: 'General Insurance: Motor (Comprehensive)',
                status: 'active',
                deletedAt: '',
                updatedAt: now.toISOString()
            },
            {
                productId: 'IL-TL-001',
                type: 'LI',
                cob: 'IL',
                subCob: 'Term Life',
                description: 'Life Insurance: Individual Life (Term Life)',
                status: 'active',
                deletedAt: '',
                updatedAt: now.toISOString()
            }
        ];
        saveProductsToStorage();
    } else {
        migrateProductIds();
    }

    updateCobOptions();
    updateSubCobOptions();
    renderTable();
    showLoading(false);
}

window.selectProduct = selectProduct;