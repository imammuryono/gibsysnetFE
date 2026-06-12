# Personas & User Roles

> **Status**: Draft | **Pemilik**: Product Owner | **Terakhir Update**: 2026-06-12

## 1. Persona

### Persona 1: Admin (Budi)
- **Demografi**: 35 tahun, IT support di kantor pusat.
- **Tujuan**: mengelola master data dan user.
- **Frustrasi**: form yang tidak konsisten antar halaman, tidak ada audit trail.
- **Kebutuhan**: akses penuh ke semua modul master, export/import data, lihat log perubahan.

### Persona 2: Underwriter (Sari)
- **Demografi**: 28 tahun, underwriter general insurance.
- **Tujuan**: membuat quotation yang akurat.
- **Frustrasi**: harus input data yang sama berulang kali.
- **Kebutuhan**: template quotation, autocomplete master data, preview premium.

### Persona 3: Sales/Agen (Andi)
- **Demografi**: 42 tahun, agen lapangan.
- **Tujuan**: input data nasabah baru, lihat status komisi.
- **Frustrasi**: UI lambat, form panjang tanpa validasi real-time.
- **Kebutuhan**: mobile-friendly UI, simpan draft, notifikasi.

### Persona 4: Finance (Dewi)
- **Demografi**: 38 tahun, finance staff.
- **Tujuan**: tracking pembayaran, hitung komisi.
- **Frustrasi**: laporan harus di-export manual, tidak ada dashboard real-time.
- **Kebutuhan**: dashboard payment, filter by date, export ke Excel/PDF.

## 2. Role Matrix
| Modul | Admin | Underwriter | Sales | Finance |
|---|---|---|---|---|
| Master Data (CRUD) | ✅ | 👁 (read only) | ❌ | 👁 (read only) |
| Quotation | ✅ | ✅ | ✅ | 👁 |
| Commission | ✅ | ❌ | 👁 (own) | ✅ |
| Payment | ✅ | ❌ | ❌ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ | ❌ |

> Catatan: role-based access control (RBAC) saat ini **belum diimplementasi** di backend. Frontend menyimpan role di localStorage (key: gibsysnet_user.user_level).
