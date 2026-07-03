let partners = [];
let filteredPartners = [];
let currentPartnerId = null;
let currentPage = 1;
const rowsPerPage = 8;
let currentUser = null;
let pendingDeleteId = null;
let versionHistory = [];
const PARTNERS_STORAGE_KEY = 'gibsysnet_partners_data';
function resolvePartnersApiBaseUrl() {
    const fromWindow = window.GibsyNetApi?.baseUrl;
    const fromStorage = localStorage.getItem('gibsynet_api_base');
    const base = (fromWindow || fromStorage || 'http://localhost:3001/api').replace(/\/$/, '');
    return base;
}

const PARTNERS_API_BASE_URL = resolvePartnersApiBaseUrl();
const PARTNERS_CREATE_API_URL = `${PARTNERS_API_BASE_URL}/partners`;
const PARTNERS_LIST_API_URL = `${PARTNERS_API_BASE_URL}/partners`;
const PARTNERS_UPDATE_API_BASE_URL = `${PARTNERS_API_BASE_URL}/partners`;

function getElement(id) {
    return document.getElementById(id);
}

function showLoading(show) {
    const loading = getElement('loadingIndicator');
    if (!loading) return;
    loading.classList.toggle('hidden', !show);
}

function loadPartnersFromStorage() {
    try {
        const raw = localStorage.getItem(PARTNERS_STORAGE_KEY);
        if (!raw) return false;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return false;

        partners = parsed;
        return true;
    } catch (error) {
        return false;
    }
}

function getSoftDeleteStateFromStorage() {
    try {
        const raw = localStorage.getItem(PARTNERS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return new Map();

        const map = new Map();
        parsed.forEach((item) => {
            if (!item || !item.partnerId) return;
            if (item.status !== 'inactive') return;
            map.set(String(item.partnerId), String(item.deletedAt || ''));
        });
        return map;
    } catch (_) {
        return new Map();
    }
}

function getPartnerRowsFromApiPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.partners)) return payload.partners;
    if (Array.isArray(payload?.rows)) return payload.rows;
    return [];
}

function normalizePartnerFromApi(item, index = 0) {
    const rawPartnerId = String(item?.partnerid ?? item?.partner_id ?? item?.partnerId ?? '').trim();
    // Keep only codes that are already in the expected format (non-numeric); numeric DB IDs will be replaced in post-processing
    const partnerId = /^\d+$/.test(rawPartnerId) ? '' : rawPartnerId;
    const statusRaw = String(item?.status || '').trim().toLowerCase();
    const deletedAt = item?.deletedAt || item?.deleted_at || '';
    const isDeletedFlag = item?.is_deleted === true
        || item?.is_deleted === 1
        || String(item?.is_deleted || '').toLowerCase() === 'true';

    return {
        partnerId,
        name: String(item?.name || '').trim(),
        identity: String(item?.identity_type ?? item?.identityType ?? item?.identity ?? '').trim(),
        identityNo: String(item?.identity_no ?? item?.identityNo ?? '').trim(),
        type: String(item?.type || '').trim(),
        category: String(item?.category || '').trim(),
        address: String(item?.address || '').trim(),
        city: String(item?.city || '').trim(),
        province: String(item?.province || '').trim(),
        postalCode: String(item?.postal_code ?? item?.postalCode ?? '').trim(),
        phone: String(item?.phone || '').trim(),
        email: String(item?.email || '').trim(),
        pic: String(item?.pic || '').trim(),
        bank: String(item?.bank || '').trim(),
        bankAccount: String(item?.bank_account ?? item?.bankAccount ?? '').trim(),
        anniversary: item?.anniversary || '',
        note: String(item?.note || '').trim(),
        status: statusRaw === 'inactive' || statusRaw === 'deleted' || isDeletedFlag || Boolean(deletedAt) ? 'inactive' : 'active',
        deletedAt,
        updatedAt: item?.updated_at || item?.updatedAt || new Date().toISOString()
    };
}

async function loadPartnersFromApi() {
    try {
        const response = await fetch(PARTNERS_LIST_API_URL, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to load partners. Status ${response.status}`);
        }

        const payload = await response.json();
        const rows = getPartnerRowsFromApiPayload(payload);
        if (!rows.length) return false;

        const softDeleteState = getSoftDeleteStateFromStorage();

        const prefixCounters = {};
        partners = rows
            .map((item, index) => normalizePartnerFromApi(item, index))
            .filter((item) => item.name)
            .map((item) => {
                if (!item.partnerId) {
                    const prefix = getPrefix(item.type, item.category);
                    prefixCounters[prefix] = (prefixCounters[prefix] || 0) + 1;
                    item.partnerId = `${prefix}.${String(prefixCounters[prefix]).padStart(4, '0')}`;
                }
                return item;
            })
            .map((item) => {
                const deletedAt = softDeleteState.get(String(item.partnerId));
                if (!deletedAt && deletedAt !== '') return item;
                return {
                    ...item,
                    status: 'inactive',
                    deletedAt: deletedAt || item.deletedAt || new Date().toISOString()
                };
            });
        savePartnersToStorage();
        return true;
    } catch (error) {
        console.error('Failed to load partners from API:', error);
        return false;
    }
}

function savePartnersToStorage() {
    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(partners));
}

function showMessage(message) {
    const modal = getElement('messageModal');
    const text = getElement('messageText');
    if (!modal || !text) {
        alert(message);
        return;
    }
    text.textContent = message;
    modal.style.display = 'block';
}

function hideMessage() {
    const modal = getElement('messageModal');
    if (modal) modal.style.display = 'none';
}

function openConfirmDelete(partnerId) {
    pendingDeleteId = partnerId;
    const confirmMessage = getElement('confirmMessage');
    if (confirmMessage) {
        confirmMessage.textContent = 'Are you sure you want to move this partner to Soft Delete?';
    }
    const modal = getElement('confirmModal');
    if (modal) modal.style.display = 'block';
}

function closeConfirmDelete() {
    pendingDeleteId = null;
    const modal = getElement('confirmModal');
    if (modal) modal.style.display = 'none';
}

function getSoftDeletedPartners() {
    return partners.filter((partner) => partner.status === 'inactive');
}

function getActivePartners() {
    return partners.filter((partner) => partner.status !== 'inactive');
}

function checkLogin() {
    const user = JSON.parse(localStorage.getItem('gibsysnet_user'));
    const token = localStorage.getItem('gibsysnet_token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return null;
    }

    return user;
}

function updateUserInfo() {
    if (!currentUser) return;

    const initials = (currentUser.full_name || 'Admin')
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase();

    const userInitial = getElement('userInitial');
    const userDisplayName = getElement('userDisplayName');
    const menuUserName = getElement('menuUserName');
    const menuUserEmail = getElement('menuUserEmail');
    const userId = getElement('userId');
    const userFullName = getElement('userFullName');
    const userLevel = getElement('userLevel');
    const userDept = getElement('userDept');

    if (userInitial) userInitial.textContent = initials.charAt(0);
    if (userDisplayName) userDisplayName.textContent = currentUser.full_name || 'Admin';
    if (menuUserName) menuUserName.textContent = currentUser.full_name || 'Administrator';
    if (menuUserEmail) menuUserEmail.textContent = currentUser.email || 'admin@gibsysnet.com';
    if (userId) userId.textContent = `ID: ${currentUser.user_id || 'N/A'}`;
    if (userFullName) userFullName.textContent = `User Name: ${currentUser.full_name || 'Admin'}`;
    if (userLevel) userLevel.textContent = `Level: ${(currentUser.user_level || 'admin').toUpperCase()}`;
    if (userDept) userDept.textContent = currentUser.department || 'Administration';
}

function updateDateTime() {
    const dateEl = getElement('currentDate');
    const timeEl = getElement('currentTime');
    const now = new Date();

    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('id-ID', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Note: initializeDropdowns has been deprecated because dropdown listeners are now managed globally by layout-loader.js
function initializeDropdowns() {
    // No-op to avoid breaking other files or calls, listeners are handled by layout-loader.js
}

function getPrefix(type, category) {
    return `${(category || 'GEN').slice(0, 3).toUpperCase()}-${(type || 'GEN').slice(0, 3).toUpperCase()}`;
}

function generatePartnerId(type, category) {
    const prefix = getPrefix(type, category);
    const seq = partners.filter((p) => p.partnerId.startsWith(prefix + '.')).length + 1;
    return `${prefix}.${String(seq).padStart(4, '0')}`;
}

function resetForm() {
    const form = getElement('companyForm');
    if (form) form.reset();

    currentPartnerId = null;
    const hiddenId = getElement('partnerId');
    const codeDisplay = getElement('partnerCodeDisplay');
    if (hiddenId) hiddenId.value = '';
    if (codeDisplay) codeDisplay.value = '';
}

function getFormValues() {
    return {
        partnerId: getElement('partnerId')?.value || '',
        name: getElement('name')?.value.trim() || '',
        identity: getElement('identityType')?.value || '',
        identityNo: getElement('identityNo')?.value.trim() || '',
        type: getElement('partnerType')?.value || '',
        category: getElement('category')?.value || '',
        address: getElement('address')?.value.trim() || '',
        city: getElement('city')?.value.trim() || '',
        province: getElement('province')?.value.trim() || '',
        postalCode: getElement('postalCode')?.value.trim() || '',
        phone: getElement('phone')?.value.trim() || '',
        email: getElement('email')?.value.trim() || '',
        pic: getElement('pic')?.value.trim() || '',
        bank: getElement('bank')?.value.trim() || '',
        bankAccount: getElement('bankAccount')?.value.trim() || '',
        anniversary: getElement('anniversary')?.value || '',
        note: getElement('note')?.value.trim() || '',
        status: 'active',
        deletedAt: '',
        updatedAt: new Date().toISOString()
    };
}

function pushVersion(action, partner) {
    versionHistory.unshift({
        action,
        partnerId: partner.partnerId,
        name: partner.name,
        actor: currentUser?.full_name || 'System',
        time: new Date().toLocaleString('id-ID')
    });

    versionHistory = versionHistory.slice(0, 10);
    renderVersioning();
}

function validatePartner(data) {
    if (!data.name || !data.identity || !data.identityNo || !data.type || !data.category) {
        showMessage('Please complete all required fields: Name, Identity Type, Identity Number, Type, and Category.');
        return false;
    }

    const duplicateByIdentity = partners.find(
        (partner) =>
            partner.identity === data.identity &&
            partner.identityNo === data.identityNo &&
            partner.partnerId !== currentPartnerId
    );

    if (duplicateByIdentity) {
        showMessage('Duplicate data detected: this Identity Type and Identity Number combination already exists.');
        return false;
    }

    const duplicateByNameAndId = partners.find(
        (partner) =>
            partner.name.toLowerCase() === data.name.toLowerCase() &&
            partner.identityNo === data.identityNo &&
            partner.partnerId !== currentPartnerId
    );

    if (duplicateByNameAndId) {
        showMessage('Duplicate data detected: a partner with the same Name and Identity Number already exists.');
        return false;
    }

    return true;
}

function getCreatePartnerPayload(data) {
    return {
        partnerid: data.partnerId,
        name: data.name,
        identity_type: data.identity,
        identity_no: data.identityNo,
        indentity_type: data.identity,
        indentity_no: data.identityNo,
        type: data.type,
        category: data.category,
        address: data.address,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        phone: data.phone,
        email: data.email,
        bank: data.bank,
        bank_account: data.bankAccount,
        pic: data.pic,
        note: data.note
    };
}

function getUpdatePartnerPayload(data) {
    return {
        partnerid: data.partnerId,
        name: data.name,
        identity_type: data.identity,
        identity_no: data.identityNo,
        // Keep compatibility with backend variants using typo keys.
        indentity_type: data.identity,
        indentity_no: data.identityNo,
        type: data.type,
        category: data.category,
        address: data.address,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        phone: data.phone,
        email: data.email,
        bank: data.bank,
        bank_account: data.bankAccount,
        pic: data.pic,
        note: data.note
    };
}

async function createPartnerOnApi(payload) {
    const response = await fetch(PARTNERS_CREATE_API_URL, {
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
        const message = responsePayload?.message || `Failed to create partner. Status ${response.status}`;
        throw new Error(message);
    }

    return responsePayload;
}

async function updatePartnerOnApi(partnerId, payload) {
    const endpoint = `${PARTNERS_UPDATE_API_BASE_URL}/${encodeURIComponent(String(partnerId))}`;

    let response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

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
        const message = responsePayload?.message || `Failed to update partner. Status ${response.status}`;
        throw new Error(message);
    }

    return responsePayload;
}

async function softDeletePartnerOnApi(partner) {
    const deletedAt = new Date().toISOString();
    const payload = {
        ...getUpdatePartnerPayload(partner),
        status: 'inactive',
        is_deleted: true,
        deleted_at: deletedAt,
        deletedAt
    };

    return await updatePartnerOnApi(partner.partnerId, payload);
}

async function restorePartnerOnApi(partner) {
    const payload = {
        ...getUpdatePartnerPayload(partner),
        status: 'active',
        is_deleted: false,
        deleted_at: null,
        deletedAt: null
    };

    return await updatePartnerOnApi(partner.partnerId, payload);
}

async function savePartner() {
    const data = getFormValues();
    if (!validatePartner(data)) return;

    showLoading(true);

    try {
        if (!currentPartnerId) {
            data.partnerId = data.partnerId || generatePartnerId(data.type, data.category);

            const payload = getCreatePartnerPayload(data);
            await createPartnerOnApi(payload);

            const loadedFromApi = await loadPartnersFromApi();
            if (!loadedFromApi) {
                partners.push(data);
            }
            pushVersion('CREATE', data);
            showMessage('Partner has been added successfully.');
        } else {
            const index = partners.findIndex((partner) => partner.partnerId === currentPartnerId);
            if (index === -1) {
                showMessage('Selected partner data is not available.');
                return;
            }

            data.partnerId = currentPartnerId;
            const payload = getUpdatePartnerPayload(data);
            await updatePartnerOnApi(currentPartnerId, payload);

            const loadedFromApi = await loadPartnersFromApi();
            if (!loadedFromApi) {
                partners[index] = data;
            }
            pushVersion('UPDATE', data);
            showMessage('Partner has been updated successfully.');
        }

        savePartnersToStorage();
        currentPage = 1;
        applyFilter();
        resetForm();
    } catch (error) {
        console.error('Failed to save partner:', error);
        showMessage(error.message || 'Failed to save partner data.');
    } finally {
        showLoading(false);
    }
}

function selectPartner(partnerId) {
    const partner = partners.find((item) => item.partnerId === partnerId);
    if (!partner) return;

    currentPartnerId = partnerId;
    getElement('partnerId').value = partner.partnerId;
    getElement('partnerCodeDisplay').value = partner.partnerId;
    getElement('name').value = partner.name;
    getElement('identityType').value = partner.identity;
    getElement('identityNo').value = partner.identityNo;
    getElement('partnerType').value = partner.type;
    getElement('category').value = partner.category;
    getElement('address').value = partner.address;
    getElement('city').value = partner.city;
    getElement('province').value = partner.province;
    getElement('postalCode').value = partner.postalCode;
    getElement('phone').value = partner.phone;
    getElement('email').value = partner.email;
    getElement('pic').value = partner.pic;
    getElement('bank').value = partner.bank;
    getElement('bankAccount').value = partner.bankAccount;
    getElement('anniversary').value = partner.anniversary;
    getElement('note').value = partner.note;

    renderTable();
}

async function confirmDelete() {
    if (!pendingDeleteId) return;

    const partnerId = pendingDeleteId;
    const targetPartner = partners.find((partner) => partner.partnerId === partnerId) || null;

    if (!targetPartner) {
        pendingDeleteId = null;
        closeConfirmDelete();
        showMessage('Selected partner data is not available.');
        return;
    }

    pendingDeleteId = null;
    closeConfirmDelete();
    showLoading(true);

    try {
        await softDeletePartnerOnApi(targetPartner);

        const loadedFromApi = await loadPartnersFromApi();
        const deletedAt = new Date().toISOString();

        partners = partners.map((partner) => {
            if (partner.partnerId !== partnerId) return partner;
            return {
                ...partner,
                status: 'inactive',
                deletedAt,
                updatedAt: new Date().toISOString()
            };
        });

        if (!loadedFromApi) {
            // Keep local state as source of truth when API list cannot be refreshed.
        }

        pushVersion('SOFT_DELETE', {
            partnerId: targetPartner.partnerId,
            name: targetPartner.name
        });

        if (currentPartnerId === partnerId) resetForm();

        savePartnersToStorage();
        applyFilter();
        showMessage('Partner moved to Soft Delete successfully.');
    } catch (error) {
        console.error('Failed to soft delete partner:', error);
        showMessage(error.message || 'Failed to move partner to soft delete.');
    } finally {
        showLoading(false);
    }
}

async function restorePartner(partnerId) {
    const targetIndex = partners.findIndex((partner) => partner.partnerId === partnerId);
    if (targetIndex === -1) return;

    showLoading(true);

    try {
        await restorePartnerOnApi(partners[targetIndex]);

        const loadedFromApi = await loadPartnersFromApi();
        const updatedIndex = partners.findIndex((partner) => partner.partnerId === partnerId);
        if (updatedIndex !== -1) {
            partners[updatedIndex] = {
                ...partners[updatedIndex],
                status: 'active',
                deletedAt: '',
                updatedAt: new Date().toISOString()
            };
        }

        if (!loadedFromApi) {
            // Keep local state as source of truth when API list cannot be refreshed.
        }

        pushVersion('RESTORE', {
            partnerId: partners[targetIndex].partnerId,
            name: partners[targetIndex].name
        });
        savePartnersToStorage();
        showMessage(`Partner ${partnerId} has been restored successfully.`);
        applyFilter();
    } catch (error) {
        console.error('Failed to restore partner:', error);
        showMessage(error.message || 'Failed to restore partner data.');
    } finally {
        showLoading(false);
    }
}

function applyFilter() {
    const keyword = (getElement('searchInput')?.value || '').toLowerCase().trim();
    const activePartners = getActivePartners();

    if (!keyword) {
        filteredPartners = [...activePartners];
    } else {
        filteredPartners = activePartners.filter((partner) =>
            [partner.partnerId, partner.name, partner.identityNo, partner.city, partner.phone, partner.email]
                .filter(Boolean)
                .some((field) => field.toLowerCase().includes(keyword))
        );
    }

    renderTable();
    updateHealthDashboard();
    renderImpactAnalysis();
    renderDependencyControl();
    renderSoftDeletePanel();
    renderAISuggestions();
}

function renderTable() {
    const tbody = getElement('partnersTableBody') || getElement('companiesTableBody');
    if (!tbody) return;

    const totalPages = Math.max(1, Math.ceil(filteredPartners.length / rowsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const rows = filteredPartners.slice(startIndex, startIndex + rowsPerPage);

    tbody.innerHTML = '';

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No partner data found.</td></tr>';
    } else {
        rows.forEach((partner, index) => {
            const isActive = currentPartnerId === partner.partnerId;
            const row = document.createElement('tr');
            if (isActive) row.className = 'partner-row-active';
            const rowNumber = startIndex + index + 1;

            row.innerHTML = `
                <td class="px-4 py-3 text-sm">${rowNumber}</td>
                <td class="px-4 py-3 text-sm font-mono">${partner.partnerId}</td>
                <td class="px-4 py-3 text-sm">${partner.name}</td>
                <td class="px-4 py-3 text-sm">${partner.identity} - ${partner.identityNo}</td>
                <td class="px-4 py-3 text-sm">${(partner.type || '-').toUpperCase()} / ${(partner.category || '-').toUpperCase()}</td>
                <td class="px-4 py-3 text-sm">${partner.city || '-'}</td>
                <td class="px-4 py-3 text-sm"><span class="partner-status ${partner.status === 'inactive' ? 'inactive' : 'active'}"><i class="fas fa-circle text-[10px]"></i>${partner.status === 'inactive' ? 'Inactive' : 'Active'}</span></td>
                <td class="px-4 py-3 text-sm"><button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" data-edit="${partner.partnerId}"><i class="fas fa-pen mr-1"></i>Edit</button></td>
            `;

            row.addEventListener('click', (event) => {
                if (event.target instanceof HTMLElement && event.target.closest('[data-edit]')) return;
                selectPartner(partner.partnerId);
            });

            const editButton = row.querySelector('[data-edit]');
            if (editButton) {
                editButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    selectPartner(partner.partnerId);
                });
            }

            tbody.appendChild(row);
        });
    }

    const rowCount = getElement('rowCount');
    const pageInfo = getElement('pageInfo');
    const prevBtn = getElement('prevBtn');
    const nextBtn = getElement('nextBtn');

    if (rowCount) rowCount.textContent = String(filteredPartners.length);
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function renderImpactAnalysis() {
    const tbody = getElement('impactTableBody');
    if (!tbody) return;

    const categoryCount = filteredPartners.reduce((result, partner) => {
        const key = partner.category || 'unknown';
        result[key] = (result[key] || 0) + 1;
        return result;
    }, {});

    const impactRows = [
        { tool: 'Quotation Engine', impact: Math.min(100, (filteredPartners.length * 5)), risk: filteredPartners.length > 20 ? 'High' : 'Medium' },
        { tool: 'Compliance Sync', impact: categoryCount.government ? 88 : 62, risk: categoryCount.government ? 'High' : 'Low' },
        { tool: 'Commission Module', impact: (categoryCount.agent || 0) * 12, risk: (categoryCount.agent || 0) > 3 ? 'Medium' : 'Low' }
    ];

    tbody.innerHTML = impactRows
        .map(
            (item) => `<tr><td class="py-2">${item.tool}</td><td class="py-2">${item.impact}%</td><td class="py-2">${item.risk}</td></tr>`
        )
        .join('');

    const impactMetric = getElement('metricImpact');
    if (impactMetric) {
        const average = Math.round(impactRows.reduce((sum, row) => sum + row.impact, 0) / impactRows.length);
        impactMetric.textContent = String(average);
    }
}

function renderVersioning() {
    const versionList = getElement('versionList');
    const metricVersions = getElement('metricVersions');

    if (metricVersions) metricVersions.textContent = String(versionHistory.length);
    if (!versionList) return;

    if (!versionHistory.length) {
        versionList.innerHTML = '<p class="text-sm text-gray-500">No data changes yet.</p>';
        return;
    }

    versionList.innerHTML = versionHistory
        .map(
            (item) => `
                <div class="version-item">
                    <div class="font-semibold text-sm text-gray-800">${item.action} - ${item.partnerId}</div>
                    <div class="text-sm text-gray-600">${item.name}</div>
                    <div class="version-meta">${item.actor} • ${item.time}</div>
                </div>
            `
        )
        .join('');
}

function renderSoftDeletePanel() {
    const container = getElement('softDeleteList');
    const metricSoftDelete = getElement('metricSoftDelete');
    if (!container) return;

    const deletedPartners = getSoftDeletedPartners();
    if (metricSoftDelete) metricSoftDelete.textContent = String(deletedPartners.length);

    if (!deletedPartners.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No records in Soft Delete.</p>';
        return;
    }

    container.innerHTML = deletedPartners
        .map((partner) => {
            const deletedAt = partner.deletedAt ? new Date(partner.deletedAt).toLocaleString('id-ID') : '-';
            return `
                <div class="dependency-item">
                    <div class="font-semibold text-sm text-gray-800">${partner.partnerId} - ${partner.name}</div>
                    <div class="dependency-meta">Deleted at: ${deletedAt}</div>
                    <button class="action-link mt-1" data-restore="${partner.partnerId}">Restore</button>
                </div>
            `;
        })
        .join('');
}

function renderAISuggestions() {
    const container = getElement('aiSuggestionList');
    if (!container) return;

    const total = filteredPartners.length;
    const inactive = filteredPartners.filter((partner) => partner.status === 'inactive').length;
    const missingEmail = filteredPartners.filter((partner) => !partner.email).length;
    const missingPhone = filteredPartners.filter((partner) => !partner.phone).length;

    const suggestions = [
        `Prioritize ${inactive} inactive partners for a reactivation campaign.`,
        missingEmail > 0
            ? `Complete email addresses for ${missingEmail} partners to improve data quality.`
            : 'Email data is complete. Keep automatic email validation enabled.',
        missingPhone > 0
            ? `Complete phone numbers for ${missingPhone} partners to stabilize notification dependencies.`
            : 'Partner phone numbers are complete and ready for notification integration.',
        `Future Ready: build a partner scoring model from ${total} active records to predict churn and conversion.`
    ];

    container.innerHTML = suggestions
        .map(
            (item) => `
                <div class="version-item">
                    <div class="font-semibold text-sm text-gray-800"><i class="fas fa-lightbulb text-sky-600 mr-2"></i>Suggestion</div>
                    <div class="version-meta">${item}</div>
                </div>
            `
        )
        .join('');
}

function renderDependencyControl() {
    const container = getElement('dependencyList');
    const metric = getElement('metricDependency');
    if (!container) return;

    const missingContact = filteredPartners.filter((partner) => !partner.phone || !partner.email).length;
    const dependencyItems = [
        { name: 'Client-Policy Link', status: missingContact > 0 ? 'warning' : 'healthy', detail: `${filteredPartners.length} mapped records` },
        { name: 'Commission Dependency', status: filteredPartners.some((partner) => partner.category === 'agent') ? 'healthy' : 'warning', detail: 'Agent category validation' },
        { name: 'Compliance Attachment', status: 'healthy', detail: 'All active connectors synced' }
    ];

    container.innerHTML = dependencyItems
        .map(
            (item) => `
                <div class="dependency-item">
                    <div class="font-semibold text-sm text-gray-800">${item.name}</div>
                    <div class="dependency-meta">${item.detail} • ${item.status.toUpperCase()}</div>
                </div>
            `
        )
        .join('');

    const healthyCount = dependencyItems.filter((item) => item.status === 'healthy').length;
    if (metric) metric.textContent = `${Math.round((healthyCount / dependencyItems.length) * 100)}%`;
}

function updateHealthDashboard() {
    const invalidCount = filteredPartners.filter((partner) => partner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partner.email)).length;
    const completenessCount = filteredPartners.filter((partner) => partner.name && partner.identity && partner.identityNo && partner.type && partner.category).length;
    const quality = filteredPartners.length ? Math.round((completenessCount / filteredPartners.length) * 100) : 0;

    const qualityEl = getElement('metricQuality');
    if (qualityEl) qualityEl.textContent = `${Math.max(0, quality - invalidCount * 5)}%`;

    const softDeleteEl = getElement('metricSoftDelete');
    if (softDeleteEl) softDeleteEl.textContent = String(getSoftDeletedPartners().length);
}

function exportPartners() {
    if (!filteredPartners.length) {
        showMessage('No data available for export.');
        return;
    }

    const rows = [
        ['Partner ID', 'Name', 'Identity Type', 'Identity No', 'Type', 'Category', 'City', 'Phone', 'Email'],
        ...filteredPartners.map((partner) => [
            partner.partnerId,
            partner.name,
            partner.identity,
            partner.identityNo,
            partner.type,
            partner.category,
            partner.city,
            partner.phone,
            partner.email
        ])
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partners-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('Partner data exported successfully.');
}

function seedPartners() {
    partners = [
        {
            partnerId: 'IND-CLI-001',
            name: 'Budi Santoso',
            identity: 'KTP',
            identityNo: '3201234567890001',
            type: 'individu',
            category: 'client',
            address: 'Jl. Merdeka No.123',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            postalCode: '12120',
            phone: '+6281212341111',
            email: 'budi@contoh.id',
            pic: 'Budi',
            bank: 'BCA',
            bankAccount: '987654321',
            anniversary: '2024-02-12',
            note: 'Priority client',
            status: 'active',
            deletedAt: '',
            updatedAt: new Date().toISOString()
        },
        {
            partnerId: 'COR-AGT-001',
            name: 'PT Nusantara Broker',
            identity: 'NIB',
            identityNo: '9120109998877',
            type: 'corporate',
            category: 'agent',
            address: 'Jl. Sudirman No.88',
            city: 'Bandung',
            province: 'Jawa Barat',
            postalCode: '40123',
            phone: '+62224567000',
            email: 'admin@nusantarabroker.co.id',
            pic: 'Rina',
            bank: 'Mandiri',
            bankAccount: '123009988',
            anniversary: '2023-07-01',
            note: 'Commission tier A',
            status: 'active',
            deletedAt: '',
            updatedAt: new Date().toISOString()
        }
    ];

    savePartnersToStorage();
    pushVersion('INIT', { partnerId: 'SYSTEM', name: 'Initial dataset' });
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('gibsysnet_user');
        localStorage.removeItem('gibsysnet_token');
        window.location.href = 'login.html';
    }
}

window.handleLogout = handleLogout;

function initializeEvents() {
    const companyForm = getElement('companyForm');

    if (companyForm) {
        companyForm.addEventListener('submit', function (event) {
            event.preventDefault();
            savePartner();
        });
    }

    getElement('addBtnSidebar')?.addEventListener('click', resetForm);
    getElement('newBtnSidebar')?.addEventListener('click', resetForm);

    getElement('saveBtnSidebar')?.addEventListener('click', savePartner);

    getElement('deleteBtnSidebar')?.addEventListener('click', function () {
        if (!currentPartnerId) {
            showMessage('Please select a partner record to delete.');
            return;
        }
        openConfirmDelete(currentPartnerId);
    });

    getElement('confirmOk')?.addEventListener('click', confirmDelete);
    getElement('confirmCancel')?.addEventListener('click', closeConfirmDelete);
    getElement('messageOk')?.addEventListener('click', hideMessage);

    getElement('searchInput')?.addEventListener('input', function () {
        currentPage = 1;
        applyFilter();
    });

    getElement('prevBtn')?.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage -= 1;
            renderTable();
        }
    });

    getElement('nextBtn')?.addEventListener('click', function () {
        const totalPages = Math.max(1, Math.ceil(filteredPartners.length / rowsPerPage));
        if (currentPage < totalPages) {
            currentPage += 1;
            renderTable();
        }
    });

    getElement('exportBtn')?.addEventListener('click', exportPartners);
    getElement('exportBtnSidebar')?.addEventListener('click', exportPartners);

    getElement('softDeleteList')?.addEventListener('click', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const restoreBtn = target.closest('[data-restore]');
        if (!restoreBtn) return;
        const partnerId = restoreBtn.getAttribute('data-restore');
        if (partnerId) restorePartner(partnerId);
    });

    window.addEventListener('click', function (event) {
        if (event.target === getElement('confirmModal')) closeConfirmDelete();
        if (event.target === getElement('messageModal')) hideMessage();
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    showLoading(true);

    currentUser = checkLogin();
    updateUserInfo();
    updateDateTime();
    setInterval(updateDateTime, 1000);

    initializeDropdowns();
    initializeEvents();
    const loadedFromApi = await loadPartnersFromApi();
    if (!loadedFromApi) {
        const loadedFromStorage = loadPartnersFromStorage();
        if (!loadedFromStorage) {
            seedPartners();
        }
    }
    applyFilter();
    renderSoftDeletePanel();
    renderAISuggestions();

    showLoading(false);
});
