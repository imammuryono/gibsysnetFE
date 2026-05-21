const apiConfig = window.GibsyNetApi || {};
const modelRiskApiUrl = 'http://localhost:3001/api/modelrisk';
const ROWS_PER_PAGE = 15;

let riskEntries = [];
let deletedEntries = [];
let currentUser = null;
let editingModelId = null;
let currentPage = 1;
let currentFilterText = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const initials = (currentUser.full_name || 'Admin').split(' ').map((n) => n[0]).join('').toUpperCase();
  const get = (id) => document.getElementById(id);
  if (get('userInitial')) get('userInitial').textContent = initials.charAt(0);
  if (get('userDisplayName')) get('userDisplayName').textContent = currentUser.full_name || 'Admin';
  if (get('menuUserName')) get('menuUserName').textContent = currentUser.full_name || 'Administrator';
  if (get('menuUserEmail')) get('menuUserEmail').textContent = currentUser.email || 'admin@gibsysnet.com';
  if (get('userId')) get('userId').textContent = `ID: ${currentUser.user_id || 'N/A'}`;
  if (get('userFullName')) get('userFullName').textContent = `User Name: ${currentUser.full_name || 'Admin'}`;
  if (get('userLevel')) get('userLevel').textContent = `Level: ${(currentUser.user_level || 'admin').toUpperCase()}`;
  if (get('userDept')) get('userDept').textContent = currentUser.department || 'Administration';
}

function showMessage(msg) {
  const modal = document.getElementById('messageModal');
  const text = document.getElementById('messageText');
  if (!modal || !text) {
    alert(msg);
    return;
  }
  text.textContent = msg;
  modal.style.display = 'block';
  document.getElementById('messageOk').onclick = () => {
    modal.style.display = 'none';
  };
}

function showConfirm(msg, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const msgEl = document.getElementById('confirmMessage');
  if (!modal || !msgEl) {
    if (confirm(msg)) onConfirm();
    return;
  }
  msgEl.textContent = msg;
  modal.style.display = 'block';
  document.getElementById('confirmOk').onclick = () => {
    modal.style.display = 'none';
    onConfirm();
  };
  document.getElementById('confirmCancel').onclick = () => {
    modal.style.display = 'none';
  };
}

function updateFooterInfo(totalRows, totalPages) {
  const rowCount = document.getElementById('rowCount');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (rowCount) rowCount.textContent = totalRows;
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function mapApiRow(row) {
  return {
    modelId: String(row.model_id || row.modelId || '').trim(),
    merkName: String(row.brand || row.merkName || '').trim(),
    modelName: String(row.model || row.modelName || '').trim(),
    typeName: String(row.type || row.typeName || '').trim(),
    seriesName: String(row.series || row.seriesName || '').trim(),
    subSeriesName: String(row.sub_series || row.subSeries || row.subSeriesName || '').trim(),
    description: String(row.description || '').trim(),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null
  };
}

async function fetchRiskEntries() {
  const tbody = document.getElementById('riskTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-4">Loading data...</td></tr>';
  }

  const response = await fetch(modelRiskApiUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to load model risk data (${response.status})`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
  riskEntries = rows.map(mapApiRow);
}

function clearForm() {
  document.getElementById('merkSelect').value = '';
  document.getElementById('modelSelect').value = '';
  document.getElementById('typeSelect').value = '';
  document.getElementById('seriesSelect').value = '';
  document.getElementById('subSeriesSelect').value = '';
  editingModelId = null;
  document.getElementById('formTitle').innerText = 'Add Model Risk Data';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

function renderSoftDeleteList() {
  const container = document.getElementById('softDeleteList');
  const metricEl = document.getElementById('metricSoftDelete');
  if (metricEl) metricEl.textContent = deletedEntries.length;
  if (!container) return;
  if (!deletedEntries.length) {
    container.innerHTML = '<p class="text-sm text-gray-500">No soft deleted data.</p>';
    return;
  }

  container.innerHTML = deletedEntries.map((entry) => {
    const idSafe = encodeURIComponent(entry.modelId);
    return `
      <div class="flex items-center justify-between py-2 border-b last:border-0 text-sm">
        <div>
          <span class="font-medium text-gray-700">${escapeHtml(entry.merkName)} ${escapeHtml(entry.modelName)}</span>
          <span class="text-gray-400 ml-1">${escapeHtml(entry.typeName)}</span>
          <p class="text-xs text-gray-400">${new Date(entry.deletedAt).toLocaleString('en-US')}</p>
        </div>
        <button onclick="restoreRiskEntry('${idSafe}')" class="text-xs text-blue-600 hover:underline ml-2 whitespace-nowrap"><i class="fas fa-trash-restore mr-1"></i>Restore</button>
      </div>
    `;
  }).join('');
}

function renderRiskTable(filterText = '') {
  const tbody = document.getElementById('riskTableBody');
  if (!tbody) return;

  currentFilterText = String(filterText || '');

  let filtered = riskEntries;
  if (currentFilterText) {
    const lower = currentFilterText.toLowerCase();
    filtered = riskEntries.filter((entry) =>
      entry.merkName.toLowerCase().includes(lower)
      || entry.modelName.toLowerCase().includes(lower)
      || entry.typeName.toLowerCase().includes(lower)
      || (entry.seriesName || '').toLowerCase().includes(lower)
      || (entry.subSeriesName || '').toLowerCase().includes(lower)
      || (entry.modelId || '').toLowerCase().includes(lower)
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No risk data found</td></tr>';
    currentPage = 1;
    updateFooterInfo(0, 1);
    return;
  }

  filtered.sort((a, b) => (a.modelId || '').localeCompare(b.modelId || ''));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ROWS_PER_PAGE);

  updateFooterInfo(filtered.length, totalPages);

  tbody.innerHTML = pageRows.map((entry, idx) => {
    const idSafe = encodeURIComponent(entry.modelId);
    return `
      <tr>
        <td class="text-center">${startIndex + idx + 1}</td>
        <td>${escapeHtml(entry.modelId || '-')}</td>
        <td>${escapeHtml(entry.merkName)}</td>
        <td>${escapeHtml(entry.modelName)}</td>
        <td>${escapeHtml(entry.typeName)}</td>
        <td>${escapeHtml(entry.seriesName || '-')}</td>
        <td>${escapeHtml(entry.subSeriesName || '-')}</td>
        <td class="action-buttons">
          <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" onclick="editRiskEntry('${idSafe}')"><i class="fas fa-pen mr-1"></i>Edit</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function reloadTable() {
  await fetchRiskEntries();
  renderRiskTable(currentFilterText);
}

async function saveRiskEntry() {
  const merkName = document.getElementById('merkSelect').value.trim();
  const modelName = document.getElementById('modelSelect').value.trim();
  const typeName = document.getElementById('typeSelect').value.trim();
  const seriesName = document.getElementById('seriesSelect').value.trim();
  const subSeriesName = document.getElementById('subSeriesSelect').value.trim();

  if (!merkName || !modelName || !typeName) {
    showMessage('Brand, Model, and Type are required!');
    return;
  }

  const payload = {
    brand: merkName,
    model: modelName,
    type: typeName,
    series: seriesName,
    subSeries: subSeriesName,
    description: `${merkName} ${modelName} ${seriesName}`.trim()
  };

  const isEditing = Boolean(editingModelId);
  const endpoint = isEditing ? `${modelRiskApiUrl}/${encodeURIComponent(editingModelId)}` : modelRiskApiUrl;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Failed to save data (${response.status})`);
    }

    clearForm();
    await reloadTable();
    showMessage(isEditing ? 'Data updated successfully.' : 'Data saved successfully.');
  } catch (error) {
    showMessage(`Save failed: ${error.message}`);
  }
}

function editRiskEntry(encodedModelId) {
  const modelId = decodeURIComponent(encodedModelId);
  const entry = riskEntries.find((item) => item.modelId === modelId);
  if (!entry) return;

  editingModelId = entry.modelId;
  document.getElementById('merkSelect').value = entry.merkName || '';
  document.getElementById('modelSelect').value = entry.modelName || '';
  document.getElementById('typeSelect').value = entry.typeName || '';
  document.getElementById('seriesSelect').value = entry.seriesName || '';
  document.getElementById('subSeriesSelect').value = entry.subSeriesName || '';
  document.getElementById('formTitle').innerText = 'Edit Model Risk Data';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
}

async function deleteRiskEntry(modelId) {
  try {
    const response = await fetch(`${modelRiskApiUrl}/${encodeURIComponent(modelId)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Failed to delete data (${response.status})`);
    }

    const removed = riskEntries.find((entry) => entry.modelId === modelId);
    if (removed) {
      deletedEntries.unshift({ ...removed, deletedAt: new Date().toISOString() });
    }

    if (editingModelId === modelId) {
      clearForm();
    }

    await reloadTable();
    renderSoftDeleteList();
    showMessage('Record deleted successfully.');
  } catch (error) {
    showMessage(`Delete failed: ${error.message}`);
  }
}

function requestDeleteCurrent() {
  if (!editingModelId) {
    showMessage('Please select a record first using the Edit button.');
    return;
  }

  showConfirm('Delete this record from database?', () => {
    deleteRiskEntry(editingModelId);
  });
}

async function restoreRiskEntry(encodedModelId) {
  const modelId = decodeURIComponent(encodedModelId);
  const entry = deletedEntries.find((item) => item.modelId === modelId);
  if (!entry) return;

  try {
    const response = await fetch(modelRiskApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        modelId: entry.modelId,
        brand: entry.merkName,
        model: entry.modelName,
        type: entry.typeName,
        series: entry.seriesName || '',
        subSeries: entry.subSeriesName || '',
        description: entry.description || `${entry.merkName} ${entry.modelName} ${entry.seriesName || ''}`.trim()
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Failed to restore data (${response.status})`);
    }

    deletedEntries = deletedEntries.filter((item) => item.modelId !== modelId);
    renderSoftDeleteList();
    await reloadTable();
    showMessage('Record restored successfully.');
  } catch (error) {
    showMessage(`Restore failed: ${error.message}`);
  }
}

function exportRiskData() {
  if (!riskEntries.length) {
    showMessage('No data available to export.');
    return;
  }

  const headers = ['No', 'Brand', 'Model', 'Model ID', 'Type', 'Series', 'Sub Series'];
  const rows = riskEntries.map((entry, idx) => [
    idx + 1,
    entry.merkName,
    entry.modelName,
    entry.modelId || '-',
    entry.typeName,
    entry.seriesName || '-',
    entry.subSeriesName || '-'
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `model-risk-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  searchInput.addEventListener('input', (e) => {
    currentPage = 1;
    renderRiskTable(e.target.value);
  });
}

function setupPaginationControls() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage <= 1) return;
      currentPage -= 1;
      renderRiskTable(currentFilterText);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage += 1;
      renderRiskTable(currentFilterText);
    });
  }
}

function setupQuickActions() {
  const newBtnSidebar = document.getElementById('newBtnSidebar');
  const saveBtnSidebar = document.getElementById('saveBtnSidebar');
  const deleteBtnSidebar = document.getElementById('deleteBtnSidebar');
  const exportBtnSidebar = document.getElementById('exportBtnSidebar');

  if (newBtnSidebar) newBtnSidebar.addEventListener('click', clearForm);
  if (saveBtnSidebar) saveBtnSidebar.addEventListener('click', saveRiskEntry);
  if (deleteBtnSidebar) deleteBtnSidebar.addEventListener('click', requestDeleteCurrent);
  if (exportBtnSidebar) exportBtnSidebar.addEventListener('click', exportRiskData);
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = checkLogin();
  if (!currentUser) return;

  updateUserInfo();
  setupSearch();
  setupPaginationControls();
  setupQuickActions();
  renderSoftDeleteList();

  document.getElementById('cancelEditBtn').addEventListener('click', clearForm);

  try {
    await reloadTable();
  } catch (error) {
    showMessage(`Failed to load Model Risk data: ${error.message}`);
  }
});