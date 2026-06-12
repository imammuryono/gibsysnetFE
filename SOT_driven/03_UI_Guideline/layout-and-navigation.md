# Layout & Navigation

> **Status**: `Approved` | **Pemilik**: Frontend Lead | **Terakhir Update**: 2026-06-12

## 1. Page Structure
Setiap halaman mengikuti pola:

    <body class="bg-gray-50">
      <div id="loadingIndicator">...</div>
      <div class="dashboard-grid">
        <div class="menu-bar">...</div>
        <div class="content-area">...</div>
        <div class="status-bar">...</div>
      </div>
      <div id="confirmModal">...</div>
      <div id="messageModal">...</div>
    </body>

## 2. Top Menu Bar
- Logo + Brand Name (kiri).
- Menu Items (tengah): File, Master, Transaction, Report.
- User Menu (kanan): avatar, nama, level, dept, notification.

## 3. Master Menu Items
Dropdown Master berisi:
- Company Profile -> company.html
- Partners -> partners.html
- COB -> cob.html
- Sub COB -> subcob.html
- Currency -> currency.html
- Default Quotation
- Model Risk -> modelrisk.html, modelriskbaru.html
- Object Group -> objectgroup.html
- Occupations -> occupations.html
- Class -> class.html
- Coverages -> coverages.html

## 4. Routing
Frontend static, tidak ada router JS. Navigasi pakai tag anchor langsung.
Konvensi path:
- Halaman master: nama.html
- Halaman dashboard: dashboard/nama.html
- Asset: ../assets/...

## 5. Status Bar (Bawah)
Menampilkan:
- Current date and time (auto-update tiap detik).
- User info: ID, full name, level, department.
- Notifikasi bell icon (dropdown).
- Logout button.

## 6. Responsive Behavior

| Viewport | Behavior |
|---|---|
| >= 1024px (Desktop) | Full layout (sidebar + content) |
| 768-1023px (Tablet) | Sidebar collapse jadi icon, content full-width |
| < 768px (Mobile) | Sidebar hidden (hamburger menu), tabel scroll horizontal |

## 7. Breadcrumb (Tujuan)
Belum diimplementasi. Target: tampil di atas content area.
Contoh: `Home > Master > Class Construction`.

## 8. Search
Setiap halaman master punya search bar di toolbar:
- Real-time filter (on input).
- Filter multi-field (semua kolom visible).
- Tombol clear (X) saat ada query.

## 9. Empty State
Saat tabel kosong, tampilkan ilustrasi + tombol Add New.

## 10. Error State
Saat API error, tampilkan icon warning + tombol Retry.