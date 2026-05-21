// script.js - Handles cascading dropdowns, CRUD, search, and local storage simulation.
// Designed to be easily swapped with real API calls.

// ------------------------------
// MOCK DATA (for demonstration)
// Replace with actual API endpoints when backend is ready.
// ------------------------------
const mockData = {
  brands: [
    { id: 1, name: "Toyota", category: "mobil" },
    { id: 2, name: "Honda", category: "mobil" },
    { id: 3, name: "Suzuki", category: "mobil" },
    { id: 4, name: "Mitsubishi", category: "mobil" },
    { id: 5, name: "Yamaha", category: "motor" },
    { id: 6, name: "Honda Motor", category: "motor" },
    { id: 7, name: "Suzuki Motor", category: "motor" },
    { id: 8, name: "Kawasaki", category: "motor" }
  ],
  models: {
    1: ["Avanza", "Innova", "Fortuner", "Camry"],     // Toyota
    2: ["Civic", "CR-V", "Brio", "Jazz"],             // Honda
    3: ["Ertiga", "Swift", "Carry"],                  // Suzuki
    4: ["Pajero Sport", "Xpander", "Outlander"],      // Mitsubishi
    5: ["NMAX", "Aerox", "Mio", "R15"],               // Yamaha
    6: ["Scoopy", "Beat", "CBR150R", "PCX"],          // Honda Motor
    7: ["Address", "Nex", "Satria"],                  // Suzuki Motor
    8: ["Ninja 250", "Z250", "W175"]                  // Kawasaki
  },
  types: {
    "Avanza": ["1.3 E", "1.5 G", "1.5 Veloz"],
    "Innova": ["2.0 G", "2.0 V", "2.0 Venturer"],
    "Fortuner": ["2.4 G", "2.4 VRZ", "2.8 VRZ"],
    "Camry": ["2.5 G", "2.5 V", "2.5 Q"],
    "Civic": ["1.8 S", "1.5 Turbo RS"],
    "CR-V": ["2.0 Prestige", "1.5 Turbo"],
    "Brio": ["S", "E", "Satya"],
    "Jazz": ["1.5 RS", "1.5 Sport"],
    "Ertiga": ["GL", "GX", "Sport"],
    "Swift": ["GL", "GX", "Sport"],
    "Carry": ["1.5 Pick Up", "1.5 Blind Van"],
    "Pajero Sport": ["2.4 Dakar", "2.4 Exceed"],
    "Xpander": ["GLX", "Exceed", "Ultimate"],
    "Outlander": ["2.0", "2.4 PHEV"],
    "NMAX": ["Connected", "Non-Connected"],
    "Aerox": ["Standard", "Connected"],
    "Mio": ["M3", "Soul-i"],
    "R15": ["V3", "V4"],
    "Scoopy": ["Style", "Prestige"],
    "Beat": ["Pop", "Deluxe"],
    "CBR150R": ["Standard", "ABS"],
    "PCX": ["Standard", "ABS"],
    "Address": ["Standard", "SS"],
    "Nex": ["Standard", "Crossover"],
    "Satria": ["F", "FU"],
    "Ninja 250": ["Standard", "ABS"],
    "Z250": ["Standard", "SL"],
    "W175": ["Standard", "TR", "SE"]
  },
  series: {
    "1.3 E": ["Series E", "E+"],
    "1.5 G": ["G Standard", "G Luxury"],
    "1.5 Veloz": ["Veloz Q", "Veloz Q+"],
    "2.0 G": ["G Standard"],
    "2.0 V": ["V TSS"],
    "2.0 Venturer": ["Venturer"],
    "2.4 G": ["G Standard"],
    "2.4 VRZ": ["VRZ"],
    "2.8 VRZ": ["VRZ 4x4"],
    "2.5 G": ["G"],
    "2.5 V": ["V"],
    "2.5 Q": ["Q"],
    "1.8 S": ["S CVT"],
    "1.5 Turbo RS": ["RS"],
    "2.0 Prestige": ["Prestige"],
    "1.5 Turbo": ["Turbo"],
    "S": ["S MT"],
    "E": ["E MT"],
    "Satya": ["Satya CVT"],
    "1.5 RS": ["RS CVT"],
    "1.5 Sport": ["Sport CVT"],
    "GL": ["GL"],
    "GX": ["GX"],
    "Sport": ["Sport"],
    "1.5 Pick Up": ["Pick Up"],
    "1.5 Blind Van": ["Blind Van"],
    "2.4 Dakar": ["Dakar"],
    "2.4 Exceed": ["Exceed"],
    "GLX": ["GLX"],
    "Exceed": ["Exceed"],
    "Ultimate": ["Ultimate"],
    "2.0": ["2.0"],
    "2.4 PHEV": ["PHEV"],
    "Connected": ["Connected"],
    "Non-Connected": ["Non-Connected"],
    "Standard": ["Standard"],
    "M3": ["M3"],
    "Soul-i": ["Soul-i"],
    "V3": ["V3"],
    "V4": ["V4"],
    "Style": ["Style"],
    "Prestige": ["Prestige"],
    "Pop": ["Pop"],
    "Deluxe": ["Deluxe"],
    "ABS": ["ABS"],
    "SS": ["SS"],
    "Crossover": ["Crossover"],
    "F": ["F"],
    "FU": ["FU"],
    "SL": ["SL"],
    "TR": ["TR Standard"],
    "SE": ["SE Limited"]
  },
  subSeries: {
    "Series E": ["E Standar", "E Plus"],
    "E+": ["E+ White", "E+ Black"],
    "G Standard": ["G Std MT", "G Std AT"],
    "G Luxury": ["G Lux AT"],
    "Veloz Q": ["Q AT"],
    "Veloz Q+": ["Q+ AT"],
    "V TSS": ["V TSS AT"],
    "Venturer": ["Venturer AT"],
    "VRZ": ["VRZ AT"],
    "VRZ 4x4": ["VRZ 4x4 AT"],
    "RS": ["RS CVT"],
    "Connected": ["Connected ABS", "Connected Non-ABS"],
    "Non-Connected": ["Non-Connected Standard"]
  }
};

// Build model ID lookup from mockData
const modelIdLookup = {};
(function buildModelIds() {
  let counter = 1;
  Object.values(mockData.models).forEach(modelList => {
    modelList.forEach(modelName => {
      if (!modelIdLookup[modelName]) {
        modelIdLookup[modelName] = 'MDL.' + String(counter++).padStart(4, '0');
      }
    });
  });
})();

function generateModelId(modelName) {
  return modelIdLookup[modelName] || '-';
}

// Store risk entries (simulate database)
let riskEntries = [];
let deletedEntries = [];
let currentUser = null;

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
    .split(' ').map(n => n[0]).join('').toUpperCase();
  const get = id => document.getElementById(id);
  if (get('userInitial')) get('userInitial').textContent = initials.charAt(0);
  if (get('userDisplayName')) get('userDisplayName').textContent = currentUser.full_name || 'Admin';
  if (get('menuUserName')) get('menuUserName').textContent = currentUser.full_name || 'Administrator';
  if (get('menuUserEmail')) get('menuUserEmail').textContent = currentUser.email || 'admin@gibsysnet.com';
  if (get('userId')) get('userId').textContent = `ID: ${currentUser.user_id || 'N/A'}`;
  if (get('userFullName')) get('userFullName').textContent = `User Name: ${currentUser.full_name || 'Admin'}`;
  if (get('userLevel')) get('userLevel').textContent = `Level: ${(currentUser.user_level || 'admin').toUpperCase()}`;
  if (get('userDept')) get('userDept').textContent = currentUser.department || 'Administration';
}

// Helper to generate unique ID
function generateId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

// Load initial risk entries from localStorage or create defaults
function loadInitialData() {
  const stored = localStorage.getItem('modelRiskEntries');
  const storedDeleted = localStorage.getItem('modelRiskDeletedEntries');
  if (stored) {
    riskEntries = JSON.parse(stored);
  } else {
    // Sample entries
    riskEntries = [
      { id: generateId(), merkId: 1, merkName: "Toyota", modelName: "Innova", modelId: generateModelId("Innova"), typeName: "2.0 G", seriesName: "G Standard", subSeriesName: "G Std AT" },
      { id: generateId(), merkId: 5, merkName: "Yamaha", modelName: "NMAX", modelId: generateModelId("NMAX"), typeName: "Connected", seriesName: "Connected", subSeriesName: "Connected ABS" },
      { id: generateId(), merkId: 2, merkName: "Honda", modelName: "Civic", modelId: generateModelId("Civic"), typeName: "1.5 Turbo RS", seriesName: "RS", subSeriesName: "" }
    ];
    saveToLocalStorage();
  }
  if (storedDeleted) {
    deletedEntries = JSON.parse(storedDeleted);
  }
  renderRiskTable();
  renderSoftDeleteList();
}

function saveToLocalStorage() {
  localStorage.setItem('modelRiskEntries', JSON.stringify(riskEntries));
  localStorage.setItem('modelRiskDeletedEntries', JSON.stringify(deletedEntries));
}

// Populate merk dropdown
function populateMerkDropdown() {
  const merkSelect = document.getElementById('merkSelect');
  merkSelect.innerHTML = '<option value="">-- Select Brand --</option>';
  mockData.brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand.id;
    option.textContent = `${brand.name} (${brand.category === 'mobil' ? 'Car' : 'Motorbike'})`;
    merkSelect.appendChild(option);
  });
}

// Cascading: when merk changes
function onMerkChange() {
  const merkId = parseInt(document.getElementById('merkSelect').value);
  const modelSelect = document.getElementById('modelSelect');
  const typeSelect = document.getElementById('typeSelect');
  const seriesSelect = document.getElementById('seriesSelect');

  // Reset models, types, series
  modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
  typeSelect.innerHTML = '<option value="">-- Select Type --</option>';
  seriesSelect.innerHTML = '<option value="">-- Select Series (Optional) --</option>';
  modelSelect.disabled = true;
  typeSelect.disabled = true;
  seriesSelect.disabled = true;

  if (merkId) {
    const models = mockData.models[merkId] || [];
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
    modelSelect.disabled = false;
  }
}

// When model changes
function onModelChange() {
  const modelName = document.getElementById('modelSelect').value;
  const typeSelect = document.getElementById('typeSelect');
  const seriesSelect = document.getElementById('seriesSelect');

  typeSelect.innerHTML = '<option value="">-- Select Type --</option>';
  seriesSelect.innerHTML = '<option value="">-- Select Series (Optional) --</option>';
  typeSelect.disabled = true;
  seriesSelect.disabled = true;

  if (modelName) {
    const types = mockData.types[modelName] || [];
    types.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
    typeSelect.disabled = false;
  }
}

// When type changes
function onTypeChange() {
  const typeName = document.getElementById('typeSelect').value;
  const seriesSelect = document.getElementById('seriesSelect');
  const subSeriesSelect = document.getElementById('subSeriesSelect');
  seriesSelect.innerHTML = '<option value="">-- Select Series (Optional) --</option>';
  seriesSelect.disabled = true;
  subSeriesSelect.innerHTML = '<option value="">-- Select Sub Series (Optional) --</option>';
  subSeriesSelect.disabled = true;

  if (typeName) {
    const seriesList = mockData.series[typeName] || [];
    seriesList.forEach(series => {
      const option = document.createElement('option');
      option.value = series;
      option.textContent = series;
      seriesSelect.appendChild(option);
    });
    seriesSelect.disabled = false;
  }
}

// When series changes
function onSeriesChange() {
  const seriesName = document.getElementById('seriesSelect').value;
  const subSeriesSelect = document.getElementById('subSeriesSelect');
  subSeriesSelect.innerHTML = '<option value="">-- Select Sub Series (Optional) --</option>';
  subSeriesSelect.disabled = true;

  if (seriesName) {
    const subList = mockData.subSeries[seriesName] || [];
    subList.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = sub;
      subSeriesSelect.appendChild(option);
    });
    subSeriesSelect.disabled = false;
  }
}

// Modal helper functions
function showMessage(msg) {
  const modal = document.getElementById('messageModal');
  const text = document.getElementById('messageText');
  if (!modal || !text) { alert(msg); return; }
  text.textContent = msg;
  modal.style.display = 'block';
  document.getElementById('messageOk').onclick = () => { modal.style.display = 'none'; };
}

function showConfirm(msg, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const msgEl = document.getElementById('confirmMessage');
  if (!modal || !msgEl) { if (confirm(msg)) onConfirm(); return; }
  msgEl.textContent = msg;
  modal.style.display = 'block';
  document.getElementById('confirmOk').onclick = () => { modal.style.display = 'none'; onConfirm(); };
  document.getElementById('confirmCancel').onclick = () => { modal.style.display = 'none'; };
}

// Save risk entry (add or update)
let editingId = null;

function saveRiskEntry() {
  const merkSelect = document.getElementById('merkSelect');
  const merkId = parseInt(merkSelect.value);
  const merkName = merkSelect.options[merkSelect.selectedIndex]?.text.split(' (')[0] || '';
  const modelName = document.getElementById('modelSelect').value;
  const typeName = document.getElementById('typeSelect').value;
  const seriesName = document.getElementById('seriesSelect').value;
  const subSeriesName = document.getElementById('subSeriesSelect').value;

  if (!merkId || !modelName || !typeName) {
    showMessage('Brand, Model, and Type are required!');
    return;
  }

  if (editingId) {
    // Update existing
    const index = riskEntries.findIndex(entry => entry.id === editingId);
    if (index !== -1) {
      riskEntries[index] = {
        id: editingId,
        merkId, merkName, modelName, typeName, seriesName: seriesName || '', subSeriesName: subSeriesName || '',
        modelId: generateModelId(modelName)
      };
    }
    editingId = null;
    document.getElementById('formTitle').innerText = 'Add Model Risk Data';
    document.getElementById('cancelEditBtn').style.display = 'none';
  } else {
    // Add new
    const newEntry = {
      id: generateId(),
      merkId, merkName, modelName, typeName, seriesName: seriesName || '', subSeriesName: subSeriesName || '',
      modelId: generateModelId(modelName)
    };
    riskEntries.push(newEntry);
  }

  saveToLocalStorage();
  renderRiskTable();
  clearForm();
  showMessage('Data saved successfully.');
}

function clearForm() {
  document.getElementById('merkSelect').value = '';
  document.getElementById('modelSelect').innerHTML = '<option value="">-- Select Model --</option>';
  document.getElementById('typeSelect').innerHTML = '<option value="">-- Select Type --</option>';
  document.getElementById('seriesSelect').innerHTML = '<option value="">-- Select Series (Optional) --</option>';
  document.getElementById('subSeriesSelect').innerHTML = '<option value="">-- Select Sub Series (Optional) --</option>';
  document.getElementById('modelSelect').disabled = true;
  document.getElementById('typeSelect').disabled = true;
  document.getElementById('seriesSelect').disabled = true;
  document.getElementById('subSeriesSelect').disabled = true;
  editingId = null;
  document.getElementById('formTitle').innerText = 'Add Model Risk Data';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

function editRiskEntry(id) {
  const entry = riskEntries.find(e => e.id === id);
  if (!entry) return;

  editingId = id;
  // Set merk
  const merkSelect = document.getElementById('merkSelect');
  merkSelect.value = entry.merkId;
  // Trigger cascading to load models
  onMerkChange();
  // Wait a tiny bit for DOM update then set model
  setTimeout(() => {
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.value = entry.modelName;
    onModelChange();
    setTimeout(() => {
      const typeSelect = document.getElementById('typeSelect');
      typeSelect.value = entry.typeName;
      onTypeChange();
      setTimeout(() => {
        const seriesSelect = document.getElementById('seriesSelect');
        seriesSelect.value = entry.seriesName;
        onSeriesChange();
        setTimeout(() => {
          const subSeriesSelect = document.getElementById('subSeriesSelect');
          subSeriesSelect.value = entry.subSeriesName || '';
        }, 50);
      }, 50);
    }, 50);
  }, 50);

  document.getElementById('formTitle').innerText = 'Edit Model Risk Data';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
}

function deleteRiskEntry(id) {
  showConfirm('Move this record to Soft Delete?', () => {
    const entry = riskEntries.find(e => e.id === id);
    if (!entry) return;
    deletedEntries.push({ ...entry, deletedAt: new Date().toISOString() });
    riskEntries = riskEntries.filter(e => e.id !== id);
    saveToLocalStorage();
    renderRiskTable();
    renderSoftDeleteList();
    if (editingId === id) clearForm();
    showMessage('Record moved to Soft Delete.');
  });
}

function restoreRiskEntry(id) {
  const entry = deletedEntries.find(e => e.id === id);
  if (!entry) return;
  const { deletedAt, ...restored } = entry;
  riskEntries.push(restored);
  deletedEntries = deletedEntries.filter(e => e.id !== id);
  saveToLocalStorage();
  renderRiskTable();
  renderSoftDeleteList();
  showMessage('Record restored successfully.');
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
  container.innerHTML = deletedEntries.map(entry => `
    <div class="flex items-center justify-between py-2 border-b last:border-0 text-sm">
      <div>
        <span class="font-medium text-gray-700">${entry.merkName} ${entry.modelName}</span>
        <span class="text-gray-400 ml-1">${entry.typeName}</span>
        <p class="text-xs text-gray-400">${new Date(entry.deletedAt).toLocaleString('en-US')}</p>
      </div>
      <button onclick="restoreRiskEntry(${entry.id})" class="text-xs text-blue-600 hover:underline ml-2 whitespace-nowrap"><i class="fas fa-trash-restore mr-1"></i>Restore</button>
    </div>
  `).join('');
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
    entry.modelId || generateModelId(entry.modelName) || '-',
    entry.typeName,
    entry.seriesName || '-',
    entry.subSeriesName || '-'
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
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

function updateFooterInfo(totalRows) {
  const rowCount = document.getElementById('rowCount');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (rowCount) rowCount.textContent = totalRows;
  if (pageInfo) pageInfo.textContent = 'Page 1 of 1';
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
}

function setupQuickActions() {
  const newBtnSidebar = document.getElementById('newBtnSidebar');
  const saveBtnSidebar = document.getElementById('saveBtnSidebar');
  const deleteBtnSidebar = document.getElementById('deleteBtnSidebar');
  const exportBtnSidebar = document.getElementById('exportBtnSidebar');

  if (newBtnSidebar) {
    newBtnSidebar.addEventListener('click', clearForm);
  }

  if (saveBtnSidebar) {
    saveBtnSidebar.addEventListener('click', saveRiskEntry);
  }

  if (deleteBtnSidebar) {
    deleteBtnSidebar.addEventListener('click', () => {
      if (!editingId) {
        showMessage('Please select a record first using the Edit button.');
        return;
      }
      deleteRiskEntry(editingId);
    });
  }

  if (exportBtnSidebar) {
    exportBtnSidebar.addEventListener('click', exportRiskData);
  }
}

function renderRiskTable(filterText = '') {
  const tbody = document.getElementById('riskTableBody');
  let filtered = riskEntries;
  if (filterText) {
    const lower = filterText.toLowerCase();
    filtered = riskEntries.filter(entry =>
      entry.merkName.toLowerCase().includes(lower) ||
      entry.modelName.toLowerCase().includes(lower) ||
      entry.typeName.toLowerCase().includes(lower) ||
      (entry.seriesName || '').toLowerCase().includes(lower) ||
      (entry.subSeriesName || '').toLowerCase().includes(lower)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No risk data found</td></tr>';
    updateFooterInfo(0);
    return;
  }

  updateFooterInfo(filtered.length);

  filtered.sort((a, b) => {
    const idA = a.modelId || generateModelId(a.modelName) || '';
    const idB = b.modelId || generateModelId(b.modelName) || '';
    return idA.localeCompare(idB);
  });

  tbody.innerHTML = filtered.map((entry, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td class="font-mono text-xs">${entry.modelId || generateModelId(entry.modelName) || '-'}</td>
      <td>${entry.merkName}</td>
      <td>${entry.modelName}</td>
      <td>${entry.typeName}</td>
      <td>${entry.seriesName || '-'}</td>
      <td>${entry.subSeriesName || '-'}</td>
      <td class="action-buttons">
        <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mr-2" onclick="editRiskEntry(${entry.id})"><i class="fas fa-pen mr-1"></i>Edit</button>
      </td>
    </tr>
  `).join('');
}

// Search handler
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    renderRiskTable(e.target.value);
  });
}

// Refresh table (and reset search)
function refreshTable() {
  document.getElementById('searchInput').value = '';
  renderRiskTable();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  currentUser = checkLogin();
  if (!currentUser) return;
  updateUserInfo();
  populateMerkDropdown();
  loadInitialData();
  setupSearch();
  setupQuickActions();

  document.getElementById('merkSelect').addEventListener('change', onMerkChange);
  document.getElementById('modelSelect').addEventListener('change', onModelChange);
  document.getElementById('typeSelect').addEventListener('change', onTypeChange);
  document.getElementById('seriesSelect').addEventListener('change', onSeriesChange);
  document.getElementById('cancelEditBtn').addEventListener('click', clearForm);
});