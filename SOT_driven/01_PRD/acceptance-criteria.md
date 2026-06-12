# Acceptance Criteria

> **Status**: Draft | **Pemilik**: QA + System Analyst | **Terakhir Update**: 2026-06-12

> Format: Given-When-Then (Gherkin-style).

## Modul COB

### AC-COB-001: Tambah COB Baru
**Given** user berada di halaman COB Management dengan role Admin.
**When** user mengklik tombol New, mengisi Type=GI, COB=MOT, Sub-COB=Comprehensive, Description="Motor Comprehensive", Status=active, lalu klik Save.
**Then** COB baru muncul di tabel dengan Product ID auto-generated MOT-C-001 (atau seq berikutnya).
**And** muncul pesan sukses "Product has been added successfully."

### AC-COB-002: Soft Delete COB
**Given** user memilih COB existing yang active.
**When** user klik tombol Delete dan konfirmasi "Yes".
**Then** COB hilang dari tabel utama, muncul di Soft Delete Panel dengan status "Deleted".
**And** field status di database berubah menjadi inactive dan deleted_at terisi timestamp.

### AC-COB-003: Restore COB
**Given** ada COB di Soft Delete Panel.
**When** user klik tombol Restore.
**Then** COB kembali ke tabel utama dengan status ctive.
**And** muncul pesan sukses "Product {ProductID} has been restored successfully."

### AC-COB-004: Validasi Form Kosong
**Given** user mengklik Save dengan field Type kosong.
**Then** muncul pesan error "Type is required" dan field highlight merah.
**And** tidak ada request API yang dikirim.

## Modul Class Construction

### AC-CLS-001: Generate Class Code Otomatis
**Given** user membuat Class baru tanpa mengisi Class Code.
**When** user klik Save.
**Then** Class Code di-generate otomatis CLS001 (atau seq berikutnya).

### AC-CLS-002: History Log Tercatat
**Given** user melakukan update pada Class.
**When** user refresh halaman dan buka panel History.
**Then** tercatat entry: action=UPDATE, changed_by, changed_at, remarks.

### AC-CLS-003: Restore via API
**Given** Class berstatus inactive.
**When** frontend mengirim PUT /api/class-construction/{id}/restore.
**Then** backend meng-update status=active, deleted_at=NULL, dan insert history dengan action=RESTORE.

## Modul Quotation

### AC-QUO-001: Hitung Premi Otomatis
**Given** user mengisi Coverage + Sum Insured + Rate.
**When** field Rate berubah.
**Then** Premi = Sum Insured × Rate / 100 (auto-calculated, read-only).

### AC-QUO-002: Export PDF
**Given** user memiliki quotation yang sudah di-save.
**When** user klik "Export PDF".
**Then** file PDF terdownload dengan format quotation-{id}-{date}.pdf berisi data quotation.

## Performance

### AC-PERF-001: Load Awal
**Given** user mengakses http://localhost:3000/cob.html.
**When** browser load halaman.
**Then** First Contentful Paint < 2 detik (di 4G simulated).

### AC-PERF-002: API Response
**Given** 100 user concurrent.
**When** hit endpoint GET /api/class-construction.
**Then** 95% response < 500ms.
