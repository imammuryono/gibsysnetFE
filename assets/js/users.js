/* =======================================================================
   USERS.JS — GIBSYSNET User Management (CRUD Terpusat)
   Endpoint: http://localhost:3001/api/users
   Sidebar: New, Save, Clear, Delete, Export terhubung ke sini
======================================================================= */
var API_BASE = 'http://localhost:3001/api';
var USERS_API = API_BASE + '/users';

function getAuthHeaders() {
    var token = localStorage.getItem('gibsysnet_token') || sessionStorage.getItem('gibsysnet_token');
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

var PERMISSIONS = [
    { key:'signin', label:'Sign In', section:'file' },
    { key:'signout', label:'Sign Out', section:'file' },
    { key:'exit', label:'Exit', section:'file' },
    { key:'company', label:'Company Profile', section:'master' },
    { key:'partners', label:'Partners', section:'master' },
    { key:'cob', label:'COB', section:'master' },
    { key:'subcob', label:'Sub COB', section:'master' },
    { key:'currency', label:'Currency', section:'master' },
    { key:'default_quotation', label:'Default Quotation', section:'master' },
    { key:'model_risks', label:'Model Risks', section:'master' },
    { key:'occupations', label:'Occupations', section:'master' },
    { key:'class_construction', label:'Class Construction', section:'master' },
    { key:'coverage', label:'Coverage', section:'master' },
    { key:'object_group', label:'Object Group', section:'master' },
    { key:'contribution', label:'Contribution', section:'master' },
    { key:'production_target', label:'Production Target', section:'master' },
    { key:'quotation', label:'Quotation', section:'transaction' },
    { key:'quotation_reg', label:'Quotation Registration', section:'transaction' },
    { key:'renewal_quotation', label:'Renewal Quotation', section:'transaction' },
    { key:'endorsement_quotation', label:'Endorsement Quotation', section:'transaction' },
    { key:'closed_quotations', label:'Closed Quotations', section:'transaction' },
    { key:'delete_quotation', label:'Delete Quotation', section:'transaction' },
    { key:'rollback_quotation', label:'Rollback Quotation', section:'transaction' },
    { key:'note', label:'Note', section:'transaction' },
    { key:'monthly_production', label:'Monthly Production', section:'report' },
    { key:'renewal_reminder', label:'Renewal Reminder', section:'report' },
    { key:'renewal_notice', label:'Renewal Notice', section:'report' },
    { key:'premium_earned', label:'Earned - Unearned Premium', section:'report' },
    { key:'e_reporting', label:'e-Reporting', section:'compliance' },
    { key:'sippo', label:'Sippo', section:'compliance' },
    { key:'sprint', label:'Sprint', section:'compliance' },
    { key:'apolo', label:'Apolo', section:'compliance' },
    { key:'sigap', label:'Sigap', section:'compliance' },
    { key:'apparindo', label:'Apparindo', section:'compliance' },
    { key:'siap_apari', label:'Siap Apari', section:'compliance' },
    { key:'ojk', label:'OJK', section:'compliance' },
    { key:'change_password', label:'Change Password', section:'admin' },
    { key:'user_management', label:'User Management', section:'admin' },
    { key:'log_on_local', label:'Log On Local', section:'utility' },
    { key:'upload_local', label:'Upload Local', section:'utility' },
    { key:'usage_help', label:'Usage Help', section:'help' },
    { key:'documentation', label:'Documentation', section:'help' },
    { key:'contact_support', label:'Contact Support', section:'help' }
];

var ROLE_DEFAULT_PERMS = {
    super_admin: PERMISSIONS.map(function(p){ return p.key; }),
    admin: ['company','partners','cob','subcob','currency','default_quotation','model_risks','occupations','class_construction','coverage','object_group','contribution','production_target','quotation','quotation_reg','renewal_quotation','endorsement_quotation','closed_quotations','delete_quotation','rollback_quotation','note','monthly_production','renewal_reminder','renewal_notice','premium_earned','change_password','user_management'],
    manager: ['company','partners','cob','subcob','currency','default_quotation','model_risks','occupations','class_construction','coverage','object_group','contribution','production_target','quotation','quotation_reg','renewal_quotation','endorsement_quotation','closed_quotations','note','monthly_production','renewal_reminder','renewal_notice','premium_earned'],
    broker: ['partners','quotation','quotation_reg','renewal_quotation','endorsement_quotation','note'],
    user: ['quotation']
};

var ROLE_DESCRIPTIONS = {
    super_admin: 'Full access to the entire system, including user management and system settings.',
    admin: 'Access to all operational modules, except system audit logs.',
    manager: 'Access to daily operations & reports; cannot manage user accounts.',
    broker: 'Access to partners & associated transactions.',
    user: 'Limited access to view personal profile and own policies.'
};

var ROLE_BADGE = {
    super_admin: { color:'bg-purple-100 text-purple-700 border-purple-200', label:'Super Admin' },
    admin:       { color:'bg-blue-100 text-blue-700 border-blue-200', label:'Admin' },
    manager:     { color:'bg-cyan-100 text-cyan-700 border-cyan-200', label:'Manager' },
    broker:      { color:'bg-emerald-100 text-emerald-700 border-emerald-200', label:'Broker' },
    user:        { color:'bg-gray-100 text-gray-700 border-gray-200', label:'User' }
};

var ROLE_ID_MAP    = { "1":"super_admin","2":"admin","3":"manager","4":"broker","5":"user" };
var ROLE_LEVEL_MAP = { "super_admin":"1","admin":"2","manager":"3","broker":"4","user":"5" };

var state = {
    users: [], filtered: [],
    page: 1, perPage: 10,
    search: '', filterRole: '', filterStatus: '',
    selected: {},
    editingUser: null,
    deletingUserId: null,
    resettingPwId: null,
    permUserId: null
};

/* ── NORMALIZE ── */
function normalizeUser(u) {
    var statusRaw = String(u.status || '').toUpperCase();
    var isActive  = (statusRaw === 'ACTIVE' || u.is_active === 1 || u.is_active === true);
    var roleId    = u.role_id ? String(u.role_id) : '5';
    var userLevel = ROLE_ID_MAP[roleId] || u.user_level || 'user';
    var menuAccess = u.menu_access;
    if (typeof menuAccess === 'string') { try { menuAccess = JSON.parse(menuAccess); } catch(e) { menuAccess = []; } }
    if (!Array.isArray(menuAccess)) menuAccess = ROLE_DEFAULT_PERMS[userLevel] || [];
    return Object.assign({}, u, { user_level: userLevel, is_active: isActive, permissions: menuAccess });
}

/* ── API CRUD ── */
async function loadUsers() {
    showTableLoader(true);
    try {
        var resp = await fetch(USERS_API, { headers: getAuthHeaders() });
        var json = await resp.json();
        var rows = json.message;
        if (!Array.isArray(rows)) rows = json.data || json.users || json || [];
        state.users = Array.isArray(rows) ? rows.map(normalizeUser).filter(function(u){ return !u.deleted_at; }) : [];
    } catch(e) {
        showToast('error', 'Gagal memuat data. Pastikan backend berjalan di port 3001.');
        state.users = [];
    }
    showTableLoader(false);
    renderAll();
}

function showTableLoader(show) {
    var tbody = document.getElementById('userTableBody');
    if (tbody && show) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat data...</td></tr>';
}

async function apiCreateUser(payload) {
    var resp = await fetch(USERS_API, { method:'POST', headers:getAuthHeaders(), body:JSON.stringify(payload) });
    var json = await resp.json();
    if (!resp.ok) throw new Error(json.message || json.error || 'Gagal menyimpan user.');
    return json;
}

async function apiUpdateUser(id, payload) {
    var resp = await fetch(USERS_API+'/'+id, { method:'PUT', headers:getAuthHeaders(), body:JSON.stringify(payload) });
    var json = await resp.json();
    if (!resp.ok) throw new Error(json.message || json.error || 'Gagal memperbarui user.');
    return json;
}

async function apiDeleteUser(id) {
    var payload = { status: "INACTIVE", is_active: false, deleted_at: new Date().toISOString() };
    var resp = await fetch(USERS_API+'/'+id, { method:'PUT', headers:getAuthHeaders(), body:JSON.stringify(payload) });
    var json = await resp.json();
    if (!resp.ok) throw new Error(json.message || json.error || 'Gagal menghapus user.');
    return json;
}

/* ── RENDER ALL ── */
function renderAll() {
    applyFilters(); updateStats();
    renderImpactAnalysis(); renderVersioning();
    renderSoftDeletePanel(); renderDependencyControl(); renderAISuggestions();
}

function applyFilters() {
    var s=state.search.toLowerCase(), fr=state.filterRole, fs=state.filterStatus;
    state.filtered = state.users.filter(function(u) {
        if (fr && u.user_level !== fr) return false;
        if (fs === 'active'   && !u.is_active) return false;
        if (fs === 'inactive' &&  u.is_active) return false;
        if (s) {
            var name = (u.fullname||u.full_name||'');
            if ((name+' '+u.username+' '+u.email+' '+(u.department||'')).toLowerCase().indexOf(s) === -1) return false;
        }
        return true;
    });
    state.page=1; renderTable(); renderPagination();
}

function renderImpactAnalysis() {
    var t=document.getElementById('impactTableBody'); if(!t) return;
    t.innerHTML='<tr><td class="py-2 font-medium">Access Authorization Registry</td><td class="py-2 text-red-600 font-bold">HIGH</td><td class="py-2"><span class="perm-badge bg-red-100 text-red-700">CRITICAL</span></td></tr>'+
        '<tr><td class="py-2 font-medium">System Audit Log Sync</td><td class="py-2 text-amber-600 font-bold">MEDIUM</td><td class="py-2"><span class="perm-badge bg-amber-100 text-amber-700">HIGH</span></td></tr>'+
        '<tr><td class="py-2 font-medium">Compliance Reporting Module</td><td class="py-2 text-green-600 font-bold">LOW</td><td class="py-2"><span class="perm-badge bg-green-100 text-green-700">LOW</span></td></tr>';
}
function renderVersioning() {
    var c=document.getElementById('versionList'); if(!c) return;
    c.innerHTML='<div class="version-item"><div class="font-semibold text-sm text-gray-800">v1.2.0 - Active</div><div class="version-meta">API integration backend Node.js</div></div>'+
        '<div class="version-item"><div class="font-semibold text-sm text-gray-800">v1.1.0 - Archive</div><div class="version-meta">Add role_id and avatar mappings</div></div>';
}
function renderSoftDeletePanel() {
    var c=document.getElementById('softDeleteList'); if(!c) return;
    var del=state.users.filter(function(u){ return !u.is_active; });
    if(!del.length){ c.innerHTML='<p class="text-sm text-gray-500">Tidak ada data di Soft Delete.</p>'; return; }
    c.innerHTML=del.map(function(u){
        var name=u.fullname||u.full_name||u.username;
        var at=u.deleted_at?new Date(u.deleted_at).toLocaleString('id-ID'):'Baru-baru ini';
        return '<div class="dependency-item"><div class="font-semibold text-sm text-gray-800">'+escHtml(u.id)+' - '+escHtml(name)+'</div>'+
            '<div class="dependency-meta">Dihapus: '+escHtml(at)+'</div>'+
            '<button class="action-link mt-1 text-blue-600 text-xs font-semibold" onclick="restoreUser('+u.id+')">Restore</button></div>';
    }).join('');
}
function renderDependencyControl() {
    var c=document.getElementById('dependencyList'); if(!c) return;
    var miss=state.users.filter(function(u){ return !u.email||!u.phone; }).length;
    [{ name:'User-Role Alignment', detail:state.users.length+' mapped records' },
     { name:'Menu Access Mapping', detail:'Granular permissions check' },
     { name:'Active Login Session', detail:'Token validation active' }].forEach(function(i,idx){
        // just build html
    });
    c.innerHTML=[{name:'User-Role Alignment',detail:state.users.length+' mapped records'},
        {name:'Menu Access Mapping',detail:'Granular permissions check'},
        {name:'Active Login Session',detail:'Token validation active'}].map(function(i){
        return '<div class="dependency-item"><div class="font-semibold text-sm text-gray-800">'+escHtml(i.name)+'</div><div class="dependency-meta">'+escHtml(i.detail)+'</div></div>';
    }).join('');
}
function renderAISuggestions() {
    var c=document.getElementById('aiSuggestionList'); if(!c) return;
    var inactive=state.users.filter(function(u){ return !u.is_active; }).length;
    var missDept=state.users.filter(function(u){ return !u.department; }).length;
    c.innerHTML=[
        'Prioritaskan '+inactive+' user nonaktif untuk pembersihan atau reaktivasi.',
        missDept>0?'Tetapkan departemen untuk '+missDept+' user agar dependency map stabil.':'Pemetaan departemen 100% lengkap.',
        'Saran keamanan: Terapkan kebijakan ganti password untuk akun administratif.'
    ].map(function(s){ return '<div class="version-item"><div class="font-semibold text-sm text-gray-800"><i class="fas fa-lightbulb text-sky-600 mr-2"></i>Saran</div><div class="version-meta">'+escHtml(s)+'</div></div>'; }).join('');
}

/* ── RENDER TABLE ── */
function renderTable() {
    var tbody=document.getElementById('userTableBody'), empty=document.getElementById('emptyState'), table=document.getElementById('userTable');
    if(!tbody) return;
    var pageUsers=state.filtered.slice((state.page-1)*state.perPage, state.page*state.perPage);
    if(!pageUsers.length){ tbody.innerHTML=''; if(table) table.classList.add('hidden'); if(empty) empty.classList.remove('hidden'); return; }
    if(table) table.classList.remove('hidden'); if(empty) empty.classList.add('hidden');
    tbody.innerHTML=pageUsers.map(function(u, idx){
        var seq = (state.page - 1) * state.perPage + idx + 1;
        var badge=ROLE_BADGE[u.user_level]||ROLE_BADGE.user;
        var name=u.fullname||u.full_name||'';
        var initials=name.split(' ').map(function(w){ return w?w[0]:''; }).join('').substring(0,2).toUpperCase();
        var stCls=u.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700';
        var stLbl=u.is_active?'Aktif':'Nonaktif';
        var lastLogin=u.last_login?formatDate(u.last_login):'&mdash;';
        return '<tr data-id="'+u.id+'">'+
            '<td class="px-4 py-3"><input type="checkbox" class="row-check" value="'+u.id+'" onchange="onRowCheck()"></td>'+
            '<td class="px-4 py-3 text-sm text-gray-600">'+seq+'</td>'+
            '<td class="px-4 py-3 text-sm text-gray-600">'+escHtml(u.id)+'</td>'+
            '<td class="px-4 py-3"><div class="flex items-center gap-3"><div class="avatar-sm">'+initials+'</div>'+
            '<div><div class="font-semibold text-sm text-gray-800">'+escHtml(name)+'</div>'+
            '<div class="text-xs text-gray-400">'+escHtml(u.email)+'</div></div></div></td>'+
            '<td class="px-4 py-3 text-sm text-gray-600">'+escHtml(u.username)+'</td>'+
            '<td class="px-4 py-3"><span class="perm-badge '+badge.color+'">'+escHtml(badge.label)+'</span></td>'+
            '<td class="px-4 py-3"><span class="perm-badge '+stCls+'">'+stLbl+'</span></td>'+
            '<td class="px-4 py-3 text-sm text-gray-500">'+escHtml(u.department||'&mdash;')+'</td>'+
            '<td class="px-4 py-3 text-sm text-gray-500">'+lastLogin+'</td>'+
            '<td class="px-4 py-3"><div class="action-buttons">'+
            '<button class="action-btn" title="Edit" onclick="editUser('+u.id+')"><i class="fas fa-edit"></i></button>'+
            '<button class="action-btn" title="Permissions" onclick="openPermModal('+u.id+')"><i class="fas fa-key"></i></button>'+
            '<button class="action-btn" title="Reset Password" onclick="openResetPwModal('+u.id+')"><i class="fas fa-lock"></i></button>'+
            '<button class="action-btn action-btn-danger" title="Hapus" onclick="openDeleteModal('+u.id+')"><i class="fas fa-trash"></i></button>'+
            '</div></td></tr>';
    }).join('');
}

function renderPagination() {
    var total=state.filtered.length, pages=Math.max(1,Math.ceil(total/state.perPage));
    var info=document.getElementById('paginationInfo'), btns=document.getElementById('paginationBtns');
    if(info) info.textContent='Menampilkan '+total+' pengguna';
    if(!btns) return;
    if(pages<=1){ btns.innerHTML=''; return; }
    var html='<button class="pg-btn'+(state.page===1?' pg-disabled':'')+'" onclick="goPage('+(state.page-1)+')"><i class="fas fa-chevron-left"></i></button>';
    for(var i=1;i<=pages;i++) html+='<button class="pg-btn'+(i===state.page?' pg-active':'')+'" onclick="goPage('+i+')">'+i+'</button>';
    html+='<button class="pg-btn'+(state.page===pages?' pg-disabled':'')+'" onclick="goPage('+(state.page+1)+')"><i class="fas fa-chevron-right"></i></button>';
    btns.innerHTML=html;
}
function goPage(p) { var max=Math.max(1,Math.ceil(state.filtered.length/state.perPage)); if(p<1||p>max) return; state.page=p; renderTable(); renderPagination(); }
function updateStats() {
    setText('statTotal', state.users.length);
    setText('statActive', state.users.filter(function(u){ return u.is_active; }).length);
    setText('statInactive', state.users.filter(function(u){ return !u.is_active; }).length);
    setText('statAdmin', state.users.filter(function(u){ return u.user_level==='super_admin'||u.user_level==='admin'; }).length);
    setText('statOnline', state.users.filter(function(u){ return u.online; }).length);
}

/* ── SEARCH & FILTER ── */
var _searchTimer;
function handleSearch() { clearTimeout(_searchTimer); _searchTimer=setTimeout(function(){ state.search=document.getElementById('searchInput').value.trim(); applyFilters(); },300); }
function handleFilter() { state.filterRole=document.getElementById('filterRole').value; state.filterStatus=document.getElementById('filterStatus').value; applyFilters(); }
function resetFilters() {
    document.getElementById('searchInput').value=''; document.getElementById('filterRole').value=''; document.getElementById('filterStatus').value='';
    state.search=''; state.filterRole=''; state.filterStatus=''; applyFilters();
}

/* ── SELECTION & BULK ── */
function toggleSelectAll(cb) { document.querySelectorAll('.row-check').forEach(function(c){ c.checked=cb.checked; }); onRowCheck(); }
function onRowCheck() {
    var checks=document.querySelectorAll('.row-check:checked'); state.selected={};
    checks.forEach(function(c){ state.selected[c.value]=true; });
    var bar=document.getElementById('bulkBar'), cnt=checks.length;
    if(cnt>0){ bar.classList.remove('hidden'); document.getElementById('bulkCount').textContent=cnt+' dipilih'; }
    else { bar.classList.add('hidden'); }
}
function clearSelection() {
    document.querySelectorAll('.row-check').forEach(function(c){ c.checked=false; });
    var sa=document.getElementById('selectAll'); if(sa) sa.checked=false;
    state.selected={}; var bar=document.getElementById('bulkBar'); if(bar) bar.classList.add('hidden');
}
async function bulkActivate() {
    var ids=Object.keys(state.selected); if(!ids.length) return;
    if(!confirm('Aktifkan '+ids.length+' pengguna terpilih?')) return;
    try { await Promise.all(ids.map(function(id){ var u=state.users.find(function(x){ return String(x.id)===id; }); return u?apiUpdateUser(id,Object.assign({},u,{status:'ACTIVE',is_active:true})):Promise.resolve(); })); showToast('success',ids.length+' pengguna diaktifkan.'); clearSelection(); loadUsers(); }
    catch(e){ showToast('error','Gagal: '+e.message); }
}
async function bulkDeactivate() {
    var ids=Object.keys(state.selected); if(!ids.length) return;
    if(!confirm('Nonaktifkan '+ids.length+' pengguna?')) return;
    try { await Promise.all(ids.map(function(id){ var u=state.users.find(function(x){ return String(x.id)===id; }); return u?apiUpdateUser(id,Object.assign({},u,{status:'INACTIVE',is_active:false})):Promise.resolve(); })); showToast('success',ids.length+' pengguna dinonaktifkan.'); clearSelection(); loadUsers(); }
    catch(e){ showToast('error','Gagal: '+e.message); }
}
async function bulkDelete() {
    var ids=Object.keys(state.selected); if(!ids.length) return;
    if(!confirm("Hapus " + ids.length + " pengguna? Akun akan dipindahkan ke soft delete dan bisa di-restore.")) return;
    try { await Promise.all(ids.map(function(id){ return apiDeleteUser(id); })); showToast('success',ids.length+' pengguna dihapus (soft delete).'); clearSelection(); loadUsers(); }
    catch(e){ showToast('error','Gagal: '+e.message); }
}
async function restoreUser(id) {
    var u=state.users.find(function(x){ return x.id===id; }); if(!u) return;
    try { await apiUpdateUser(id,Object.assign({},u,{status:'ACTIVE',is_active:true})); showToast('success','User berhasil di-restore.'); loadUsers(); }
    catch(e){ showToast('error','Gagal restore: '+e.message); }
}

/* ── FORM ── */
const MENU_STRUCTURE = {
    'File': {
        icon: 'fa-file',
        items: [
            { name: 'Sign In', icon: 'fa-sign-in-alt', perm: 'signin' },
            { name: 'Sign Out', icon: 'fa-sign-out-alt', perm: 'signout' },
            { name: 'Exit', icon: 'fa-power-off', perm: 'exit' }
        ]
    },
    'Master': {
        icon: 'fa-database',
        items: [
            { name: 'Company Profile', icon: 'fa-building', perm: 'company' },
            { name: 'Partners', icon: 'fa-handshake', perm: 'partners' },
            { name: 'COB', icon: 'fa-list-alt', perm: 'cob' },
            { name: 'Sub COB', icon: 'fa-layer-group', perm: 'subcob' },
            { name: 'Currency', icon: 'fa-money-bill-wave', perm: 'currency' },
            { name: 'Default Quotation', icon: 'fa-exclamation-triangle', perm: 'default_quotation' },
            { name: 'Model Risks', icon: 'fa-chart-line', perm: 'model_risks' },
            { name: 'Occupations', icon: 'fa-user-tie', perm: 'occupations' },
            { name: 'Class Construction', icon: 'fa-hard-hat', perm: 'class_construction' },
            { name: 'Coverage', icon: 'fa-umbrella', perm: 'coverage' },
            { name: 'Object Group', icon: 'fa-object-group', perm: 'object_group' },
            { name: 'Contribution', icon: 'fa-hand-holding-usd', perm: 'contribution' },
            { name: 'Production Target', icon: 'fa-bullseye', perm: 'production_target' }
        ]
    },
    'Transactions': {
        icon: 'fa-exchange-alt',
        items: [
            { name: 'Quotation', icon: 'fa-file-invoice-dollar', perm: 'quotation' },
            { name: 'Quotation Registration', icon: 'fa-edit', perm: 'quotation_reg' },
            { name: 'Renewal Quotation', icon: 'fa-search', perm: 'renewal_quotation' },
            { name: 'Endorsement Quotation', icon: 'fa-gem', perm: 'endorsement_quotation' },
            { name: 'Closed Quotations', icon: 'fa-times-circle', perm: 'closed_quotations' },
            { name: 'Delete Quotation', icon: 'fa-window-maximize', perm: 'delete_quotation' },
            { name: 'Rollback Quotation', icon: 'fa-undo', perm: 'rollback_quotation' },
            { name: 'Note', icon: 'fa-circle', perm: 'note' }
        ]
    },
    'Reports': {
        icon: 'fa-chart-bar',
        items: [
            { name: 'Monthly Production', icon: 'fa-chart-line', perm: 'monthly_production' },
            { name: 'Renewal Reminder', icon: 'fa-bell', perm: 'renewal_reminder' },
            { name: 'Renewal Notice', icon: 'fa-sticky-note', perm: 'renewal_notice' },
            { name: 'Earned - Unearned Premium', icon: 'fa-money-check-alt', perm: 'premium_earned' }
        ]
    },
    'Compliance': {
        icon: 'fa-clipboard-check',
        items: [
            { name: 'e-Reporting', icon: 'fa-file-export', perm: 'e_reporting' },
            { name: 'Sippo', icon: 'fa-shield-alt', perm: 'sippo' },
            { name: 'Sprint', icon: 'fa-balance-scale', perm: 'sprint' },
            { name: 'Apolo', icon: 'fa-handshake', perm: 'apolo' },
            { name: 'Sigap', icon: 'fa-file-contract', perm: 'sigap' },
            { name: 'Apparindo', icon: 'fa-industry', perm: 'apparindo' },
            { name: 'Siap Apari', icon: 'fa-rocket', perm: 'siap_apari' },
            { name: 'OJK', icon: 'fa-file-signature', perm: 'ojk' }
        ]
    },
    'Administrations': {
        icon: 'fa-cogs',
        items: [
            { name: 'Change Password', icon: 'fa-key', perm: 'change_password' },
            { name: 'User Management', icon: 'fa-users-cog', perm: 'user_management' }
        ]
    },
    'Utilities': {
        icon: 'fa-tools',
        items: [
            { name: 'Log On Local', icon: 'fa-sign-in-alt', perm: 'log_on_local' },
            { name: 'Upload Local', icon: 'fa-upload', perm: 'upload_local' }
        ]
    },
    'Help': {
        icon: 'fa-question-circle',
        items: [
            { name: 'Usage Help', icon: 'fa-life-ring', perm: 'usage_help' },
            { name: 'Documentation', icon: 'fa-book', perm: 'documentation' },
            { name: 'Contact Support', icon: 'fa-phone-alt', perm: 'contact_support' }
        ]
    }
};

window.toggleMenuGroup = function(groupName) {
    var items = document.getElementById('menu-items-' + groupName);
    var icon = document.querySelector('[data-group="' + groupName + '"]')?.closest('.menu-group-header')?.querySelector('.toggle-icon i');
    if (items) {
        items.classList.toggle('collapsed');
        if (icon) {
            icon.classList.toggle('fa-chevron-right');
            icon.classList.toggle('fa-chevron-down');
        }
    }
};

window.toggleGroupMenus = function(groupName) {
    var checkbox = document.querySelector('.group-checkbox[data-group="' + groupName + '"]');
    var items = document.querySelectorAll('.menu-checkbox[data-group="' + groupName + '"]');
    items.forEach(function(item) { item.checked = checkbox.checked; });
    updateGroupCheckbox(groupName);
};

window.updateGroupCheckbox = function(groupName) {
    var items = document.querySelectorAll('.menu-checkbox[data-group="' + groupName + '"]');
    var groupCheckbox = document.querySelector('.group-checkbox[data-group="' + groupName + '"]');
    if (groupCheckbox) {
        var checkedItems = Array.from(items).filter(function(item) { return item.checked; });
        groupCheckbox.checked = checkedItems.length === items.length;
        groupCheckbox.indeterminate = checkedItems.length > 0 && checkedItems.length < items.length;
    }
};

window.updateAllGroupCheckboxes = function() {
    Object.keys(MENU_STRUCTURE).forEach(function(groupName) { updateGroupCheckbox(groupName); });
};

window.selectAllMenus = function() {
    document.querySelectorAll('.menu-checkbox').forEach(function(checkbox) { checkbox.checked = true; });
    updateAllGroupCheckboxes();
};

window.deselectAllMenus = function() {
    document.querySelectorAll('.menu-checkbox').forEach(function(checkbox) { checkbox.checked = false; });
    updateAllGroupCheckboxes();
};

function renderMenuAccessCheckboxes(selectedPerms) {
    var container = document.getElementById('menuAccessTree');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(MENU_STRUCTURE).forEach(function(entry) {
        var groupName = entry[0];
        var groupData = entry[1];
        var groupDiv = document.createElement('div');
        groupDiv.className = 'menu-group';

        var header = document.createElement('div');
        header.className = 'menu-group-header';
        header.innerHTML = `
            <input type="checkbox" class="group-checkbox" data-group="${groupName}" onchange="toggleGroupMenus('${groupName}')">
            <label><i class="fas ${groupData.icon} mr-1"></i>${groupName}</label>
            <span class="toggle-icon" onclick="toggleMenuGroup('${groupName}')"><i class="fas fa-chevron-right"></i></span>
        `;
        groupDiv.appendChild(header);

        var itemsDiv = document.createElement('div');
        itemsDiv.className = 'menu-items collapsed';
        itemsDiv.id = `menu-items-${groupName}`;

        groupData.items.forEach(function(item) {
            var chk = (selectedPerms || []).indexOf(item.perm) !== -1;
            var itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item' + (chk ? ' checked' : '');
            itemDiv.innerHTML = `
                <input type="checkbox" class="menu-checkbox" data-group="${groupName}" data-perm="${item.perm}" id="form_perm_${item.perm}" ${chk ? 'checked' : ''} onchange="updateGroupCheckbox('${groupName}')">
                <label for="form_perm_${item.perm}"><i class="fas ${item.icon} menu-icon"></i>${item.name}</label>
            `;
            itemsDiv.appendChild(itemDiv);
        });

        groupDiv.appendChild(itemsDiv);
        container.appendChild(groupDiv);
    });

    updateAllGroupCheckboxes();
}

/* Reset form ke mode NEW */
function resetUserForm() {
    var form=document.getElementById('userForm'); if(form) form.reset();
    setVal('formUserId',''); setVal('formAvatar',''); setVal('formPassword',''); setVal('formPasswordConfirm','');
    var st=document.getElementById('formStatus'); if(st) st.checked=true;
    setText('statusLabel','Active');
    setHTML('userFormTitle','<i class="fas fa-user-plus text-green-500 mr-2"></i>User Information');
    setHTML('passLabel','Password <span class="req">*</span>');
    setHTML('passConfirmLabel','Confirm Password <span class="req">*</span>');
    var hint=document.getElementById('passHint'); if(hint) hint.style.display='none';
    state.editingUser=null; hideAllErrors(); onRoleChange(); updateSidebarState('new');
}

function openUserModal() {
    resetUserForm();
    var el=document.getElementById('formFullName'); if(el) el.focus();
    var title=document.getElementById('userFormTitle'); if(title) title.scrollIntoView({behavior:'smooth'});
}

function editUser(id) {
    var u=state.users.find(function(x){ return x.id===id; }); if(!u) return;
    state.editingUser=u;
    setVal('formUserId',u.id); setVal('formFullName',u.fullname||u.full_name||'');
    setVal('formUsername',u.username||''); setVal('formEmail',u.email||'');
    setVal('formPhone',u.phone||''); setVal('formAvatar',u.avatar||'');
    setVal('formPassword',''); setVal('formPasswordConfirm','');
    document.getElementById('formRoleId').value=u.role_id?String(u.role_id):(ROLE_LEVEL_MAP[u.user_level]||'5');
    document.getElementById('formDepartment').value=u.department||'';
    var st=document.getElementById('formStatus'); if(st) st.checked=u.is_active;
    setText('statusLabel',u.is_active?'Active':'Inactive');
    setHTML('userFormTitle','<i class="fas fa-user-edit text-blue-500 mr-2"></i>Edit User &mdash; '+escHtml(u.fullname||u.full_name||''));
    setHTML('passLabel','Password <span class="form-hint">(kosongkan jika tidak diubah)</span>');
    setHTML('passConfirmLabel','Confirm Password');
    var hint=document.getElementById('passHint'); if(hint){ hint.style.display=''; hint.textContent='Kosongkan jika tidak ingin mengubah password.'; }
    renderMenuAccessCheckboxes(u.permissions||[]);
    hideAllErrors(); onRoleChange(); updateSidebarState('edit');
    var title=document.getElementById('userFormTitle'); if(title) title.scrollIntoView({behavior:'smooth'});
}

function onRoleChange() {
    var roleId=document.getElementById('formRoleId').value;
    var roleKey=ROLE_ID_MAP[roleId]||'user';
    var descEl=document.getElementById('roleDescription'), textEl=document.getElementById('roleDescText');
    if(roleKey&&ROLE_DESCRIPTIONS[roleKey]){ if(descEl) descEl.classList.remove('hidden'); if(textEl) textEl.textContent=ROLE_DESCRIPTIONS[roleKey]; }
    else { if(descEl) descEl.classList.add('hidden'); }
    var id=document.getElementById('formUserId').value;
    if(!id&&roleKey) renderMenuAccessCheckboxes(ROLE_DEFAULT_PERMS[roleKey]||[]);
}

/* ── SAVE USER (TERPUSAT) ── */
async function saveUser() {
    var id=document.getElementById('formUserId').value;
    var fullName=document.getElementById('formFullName').value.trim();
    var username=document.getElementById('formUsername').value.trim().toLowerCase();
    var email=document.getElementById('formEmail').value.trim();
    var phone=document.getElementById('formPhone').value.trim();
    var roleId=document.getElementById('formRoleId').value;
    var dept=document.getElementById('formDepartment').value;
    var avatar=document.getElementById('formAvatar').value.trim();
    var isActive=document.getElementById('formStatus').checked;
    var pw=document.getElementById('formPassword').value;
    var pwC=document.getElementById('formPasswordConfirm').value;

    hideAllErrors(); var valid=true;
    if(!fullName){ showError('errFullName'); valid=false; }
    if(!username||username.length<3){ showError('errUsername'); valid=false; }
    if(!email||email.indexOf('@')===-1){ showError('errEmail'); valid=false; }
    if(!roleId){ showError('errRole'); valid=false; }
    if(!id){ if(!pw||pw.length<8){ showError('errPassword'); valid=false; } if(pw!==pwC){ showError('errPasswordConfirm'); valid=false; } }
    else { if(pw&&pw.length<8){ showError('errPassword'); valid=false; } if(pw&&pw!==pwC){ showError('errPasswordConfirm'); valid=false; } }
    if(!valid){ showToast('warning','Periksa kembali isian form.'); return; }

    var menuAccess=[];
    document.querySelectorAll('#formMenuAccess input[type="checkbox"]:checked').forEach(function(cb){ var p = cb.getAttribute('data-perm'); if(p) menuAccess.push(p); });
    var payload={ fullname:fullName, username:username, email:email, phone:phone, role_id:parseInt(roleId),
        department:dept, avatar:avatar, status:isActive?'ACTIVE':'INACTIVE', menu_access:JSON.stringify(menuAccess) };
    if(pw) payload.password=pw;

    setBtnLoading('btnSaveUser',true);
    setSidebarBtnLoading('saveBtnSidebar',true,'Menyimpan...');
    try {
        if(id){ await apiUpdateUser(id,payload); showToast('success','User berhasil diperbarui!'); }
        else   { await apiCreateUser(payload);   showToast('success','User berhasil ditambahkan!'); }
        resetUserForm(); loadUsers();
    } catch(e){ showToast('error',e.message||'Gagal menyimpan user.'); }
    setBtnLoading('btnSaveUser',false);
    setSidebarBtnLoading('saveBtnSidebar',false,'');
}

/* ── DELETE ── */
function openDeleteModal(id) {
    var u=state.users.find(function(x){ return x.id===id; }); if(!u) return;
    state.deletingUserId=id;
    setText('deleteUserName',u.fullname||u.full_name||'');
    openModal('deleteModal');
}
async function confirmDelete() {
    var id=state.deletingUserId; if(!id) return;
    var btn=document.getElementById('btnConfirmDelete');
    if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin mr-1"></i>Menghapus...'; }
    try { await apiDeleteUser(id); showToast('success','User berhasil dihapus (soft delete).'); closeModal('deleteModal'); state.editingUser=null; resetUserForm(); loadUsers(); }
    catch(e){ showToast('error','Gagal: '+e.message); }
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-trash mr-1"></i>Ya, Hapus'; }
}

/* Sidebar Delete: hapus user yang sedang di-edit */
function sidebarDeleteUser() {
    if(!state.editingUser){ showToast('warning','Pilih user dari tabel terlebih dahulu untuk dihapus.'); return; }
    openDeleteModal(state.editingUser.id);
}

/* ── RESET PASSWORD ── */
function openResetPwModal(id) {
    var u=state.users.find(function(x){ return x.id===id; }); if(!u) return;
    state.resettingPwId=id;
    setText('resetPwUserName',u.fullname||u.full_name||'');
    setVal('newPwInput',''); setVal('newPwConfirm','');
    var mc=document.getElementById('mustChangePw'); if(mc) mc.checked=true;
    document.getElementById('errNewPw').classList.remove('show');
    document.getElementById('errNewPwC').classList.remove('show');
    openModal('resetPwModal');
}
async function doResetPassword() {
    var id=state.resettingPwId; if(!id) return;
    var pw=document.getElementById('newPwInput').value, pc=document.getElementById('newPwConfirm').value;
    document.getElementById('errNewPw').classList.remove('show');
    document.getElementById('errNewPwC').classList.remove('show');
    if(!pw||pw.length<8){ document.getElementById('errNewPw').classList.add('show'); return; }
    if(pw!==pc){ document.getElementById('errNewPwC').classList.add('show'); return; }
    try {
        var resp=await fetch(USERS_API+'/'+id+'/reset-password',{ method:'POST', headers:getAuthHeaders(), body:JSON.stringify({password:pw}) });
        if(resp.ok){ showToast('success','Password berhasil direset.'); closeModal('resetPwModal'); return; }
    } catch(e){}
    try { await apiUpdateUser(id,{password:pw}); showToast('success','Password berhasil diperbarui.'); closeModal('resetPwModal'); }
    catch(e){ showToast('error','Gagal: '+e.message); }
}

/* ── PERMISSIONS MODAL ── */
function openPermModal(id) {
    var u=state.users.find(function(x){ return x.id===id; }); if(!u) return;
    state.permUserId=id;
    setText('permUserName',u.fullname||u.full_name||'');
    var badge=ROLE_BADGE[u.user_level]||ROLE_BADGE.user;
    document.getElementById('permUserRole').innerHTML='<span class="perm-badge '+badge.color+'">'+escHtml(badge.label)+'</span>';
    var sections={file:'permGridFile',master:'permGridMaster',transaction:'permGridTransaction',
        report:'permGridReport',compliance:'permGridCompliance',admin:'permGridAdmin',utility:'permGridUtility',help:'permGridHelp'};
    Object.keys(sections).forEach(function(sec){
        var grid=document.getElementById(sections[sec]); if(!grid) return;
        grid.innerHTML=PERMISSIONS.filter(function(p){ return p.section===sec; }).map(function(p){
            var chk=(u.permissions||[]).indexOf(p.key)!==-1;
            return '<div class="perm-item'+(chk?' checked':'')+'"><input type="checkbox" id="perm_'+p.key+'" data-perm="'+p.key+'" '+(chk?'checked':'')+' onchange="this.parentElement.classList.toggle(\'checked\',this.checked)"><label for="perm_'+p.key+'">'+escHtml(p.label)+'</label></div>';
        }).join('');
    });
    openModal('permModal');
}
function applyDefaultPerms() {
    var u=state.users.find(function(x){ return x.id===state.permUserId; }); if(!u) return;
    var defaults=ROLE_DEFAULT_PERMS[u.user_level]||[];
    document.querySelectorAll('#permModal input[type="checkbox"]').forEach(function(cb){
        var chk=defaults.indexOf(cb.getAttribute('data-perm'))!==-1; cb.checked=chk;
        var pi=cb.closest('.perm-item'); if(pi) pi.classList.toggle('checked',chk);
    });
    showToast('info','Permissions direset ke default role.');
}
async function savePermissions() {
    var id=state.permUserId; if(!id) return;
    var perms=[];
    document.querySelectorAll('#permModal input[type="checkbox"]:checked').forEach(function(cb){ perms.push(cb.getAttribute('data-perm')); });
    try {
        var resp=await fetch(USERS_API+'/'+id+'/permissions',{ method:'POST', headers:getAuthHeaders(), body:JSON.stringify({permissions:perms}) });
        if(resp.ok){ showToast('success','Permissions disimpan.'); closeModal('permModal'); loadUsers(); return; }
    } catch(e){}
    try {
        var u=state.users.find(function(x){ return x.id===id; });
        if(u){ await apiUpdateUser(id,Object.assign({},u,{menu_access:JSON.stringify(perms)})); showToast('success','Permissions disimpan.'); closeModal('permModal'); loadUsers(); }
    } catch(e){ showToast('error','Gagal: '+e.message); }
}

/* ── SIDEBAR WIRING TERPUSAT ── */
function wireSidebarButtons() {
    var newBtn=document.getElementById('newBtnSidebar');
    var saveBtn=document.getElementById('saveBtnSidebar');
    var deleteBtn=document.getElementById('deleteBtnSidebar');
    var exportBtn=document.getElementById('exportBtnSidebar');
    if(newBtn    && !newBtn._wired)    { newBtn.addEventListener('click',openUserModal);    newBtn._wired=true; }
    if(saveBtn   && !saveBtn._wired)   { saveBtn.addEventListener('click',saveUser);         saveBtn._wired=true; }
    if(deleteBtn && !deleteBtn._wired) { deleteBtn.addEventListener('click',sidebarDeleteUser); deleteBtn._wired=true; }
    if(exportBtn && !exportBtn._wired) { exportBtn.addEventListener('click',exportUsers);    exportBtn._wired=true; }
}

function updateSidebarState(mode) {
    var saveBtn=document.getElementById('saveBtnSidebar');
    if(mode==='edit') { if(saveBtn) saveBtn.classList.add('active'); }
    else              { if(saveBtn) saveBtn.classList.remove('active'); }
}

function setSidebarBtnLoading(id,loading,label) {
    var btn=document.getElementById(id); if(!btn) return;
    btn.disabled=loading;
    if(loading){ btn._origHTML=btn.innerHTML; btn.innerHTML='<i class="fas fa-spinner fa-spin mr-3 text-blue-600"></i><span>'+(label||'Loading...')+'</span>'; }
    else { if(btn._origHTML) btn.innerHTML=btn._origHTML; }
}

/* ── MODAL ── */
function openModal(id){ var el=document.getElementById(id); if(el){ el.classList.add('show'); document.body.style.overflow='hidden'; } }
function closeModal(id){ var el=document.getElementById(id); if(el){ el.classList.remove('show'); document.body.style.overflow=''; } }

/* ── TOAST ── */
function showToast(type,message) {
    var container=document.getElementById('toastContainer'); if(!container) return;
    var t=document.createElement('div'); t.className='toast';
    var colors={success:'#10b981',error:'#ef4444',info:'#3b82f6',warning:'#f59e0b'};
    var icons={success:'fa-circle-check',error:'fa-circle-exclamation',info:'fa-circle-info',warning:'fa-triangle-exclamation'};
    t.innerHTML='<i class="fas '+(icons[type]||icons.info)+' toast-icon" style="color:'+(colors[type]||colors.info)+';"></i><span class="toast-msg">'+escHtml(message)+'</span><button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
    container.appendChild(t);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ t.classList.add('show'); }); });
    setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ if(t.parentNode) t.remove(); },400); },type==='error'?6000:3500);
}

/* ── EXPORT CSV ── */
function exportUsers() {
    var headers=['ID','Nama','Username','Email','Telepon','Role','Departemen','Status','Last Login'];
    var rows=state.filtered.map(function(u){ return [u.id,u.fullname||u.full_name||'',u.username,u.email,u.phone||'',u.user_level,u.department||'',u.is_active?'Aktif':'Nonaktif',u.last_login?formatDate(u.last_login):'']; });
    var csv=[headers,...rows].map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\r\n');
    var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='gibsysnet-users-'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); URL.revokeObjectURL(url);
    showToast('success','CSV berhasil diekspor.');
}

/* ── HELPERS ── */
function escHtml(s){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(s||''))); return d.innerHTML; }
function setText(id,val){ var el=document.getElementById(id); if(el) el.textContent=val; }
function setVal(id,val){ var el=document.getElementById(id); if(el) el.value=val; }
function setHTML(id,html){ var el=document.getElementById(id); if(el) el.innerHTML=html; }
function setBtnLoading(id,loading){ var btn=document.getElementById(id); if(!btn) return; btn.disabled=loading; if(loading){ btn._origHTML=btn.innerHTML; btn.innerHTML='<i class="fas fa-spinner fa-spin mr-1"></i>Menyimpan...'; } else { if(btn._origHTML) btn.innerHTML=btn._origHTML; } }
function toggleFormPw(inputId,iconId){ var input=document.getElementById(inputId),icon=document.getElementById(iconId); if(!input||!icon) return; var isPw=input.type==='password'; input.type=isPw?'text':'password'; icon.className=isPw?'fas fa-eye-slash':'fas fa-eye'; }
function hideAllErrors(){ document.querySelectorAll('.form-error').forEach(function(e){ e.classList.remove('show'); }); }
function showError(id){ var el=document.getElementById(id); if(el) el.classList.add('show'); }
function formatDate(iso){
    if(!iso) return '&mdash;';
    try{ var d=new Date(iso); return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return iso; }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    resetUserForm();
    var st=document.getElementById('formStatus');
    if(st) st.addEventListener('change',function(){ setText('statusLabel',this.checked?'Active':'Inactive'); });
    document.querySelectorAll('.modal-backdrop').forEach(function(bd){
        bd.addEventListener('click',function(e){ if(e.target===bd) closeModal(bd.id); });
    });
    document.addEventListener('keydown',function(e){
        if(e.key==='Escape') document.querySelectorAll('.modal-backdrop.show').forEach(function(m){ closeModal(m.id); });
    });
    wireSidebarButtons();
    setTimeout(wireSidebarButtons,100);
});
