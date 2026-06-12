# Component Library

> **Status**: `Draft` | **Pemilik**: Frontend Lead | **Terakhir Update**: 2026-06-12

> Komponen UI standar yang dipakai konsisten di seluruh aplikasi.

## 1. Layout Components

### AppShell (dashboard-grid)
Struktur layout global. Menu Bar di atas, Sidebar + Content di tengah, Status Bar di bawah.

Class CSS: `.dashboard-grid`, `.menu-bar`, `.sidebar`, `.content-area`, `.status-bar`.

## 2. Form Components

### Input Field

    <label for="classCode" class="block text-sm font-medium text-gray-700 mb-1">Class Code</label>
    <input type="text" id="classCode" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500">
    <p class="error-message hidden">Class Code is required</p>

### Select Dropdown

    <select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500">
      <option value="">-- Select --</option>
      <option value="GI">General Insurance</option>
    </select>

### Form States

| State | Class | Tampilan |
|---|---|---|
| Default | border-gray-300 | Abu-abu |
| Focus | ring-2 ring-primary-500 | Biru ring |
| Error | input-error | Merah |
| Success | input-success | Hijau |
| Disabled | bg-gray-100 cursor-not-allowed | Abu muda |

## 3. Button Components

| Variant | Class | Penggunaan |
|---|---|---|
| Primary | bg-primary-500 hover:bg-primary-600 text-white | Save, Submit |
| Secondary | bg-gray-200 hover:bg-gray-300 text-gray-800 | Cancel |
| Danger | bg-red-500 hover:bg-red-600 text-white | Delete |
| Success | bg-green-500 hover:bg-green-600 text-white | Restore |

Ukuran: px-3 py-1.5 text-sm (small), px-4 py-2 text-base (default), px-6 py-3 text-lg (large).

## 4. Table Component

    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Code</th></tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr class="hover:bg-gray-50 cursor-pointer"><td class="px-6 py-4 text-sm">CLS001</td></tr>
      </tbody>
    </table>

Pagination: #rowCount (total), #prevBtn / #nextBtn, #pageInfo (page number).

## 5. Modal Component

- #confirmModal: Konfirmasi aksi (delete).
- #messageModal: Pesan sukses/error.
- #loadingIndicator: Loading overlay global.

## 6. Status Badge

    <span class="status-badge status-active">Active</span>
    <span class="status-badge status-pending">Pending</span>
    <span class="status-badge status-expired">Expired</span>

## 7. Sidebar Actions (per modul)

| Button | ID Convention | Function |
|---|---|---|
| New | newBtnSidebar | Reset form |
| Save | saveBtnSidebar | Submit form |
| Delete | deleteBtnSidebar | Soft delete + konfirmasi |
| Export | exportBtnSidebar | Export CSV |

## 8. State Management Pattern

    let data = [];
    let selectedId = null;
    let currentPage = 1;
    const rowsPerPage = 8;
    let versionHistory = [];

> Aturan: Pola state management harus konsisten di semua modul master.