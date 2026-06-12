# PRD — GIBSYSNET Insurance Core System (Frontend)

> **Status**: Approved | **Pemilik**: Product Owner + System Analyst | **Terakhir Update**: 2026-06-12

## 1. Latar Belakang
GIBSYSNET adalah aplikasi **Insurance Core System** untuk perusahaan asuransi (Life + General). Aplikasi ini mengelola master data, quotation, komisi, pembayaran, dan reporting.

Repositori ini (gibsynet_FE) adalah **frontend** yang disajikan sebagai halaman statis (HTML/CSS/JS) dengan backend Node.js/Express (di repo ini juga, via server.js) yang terhubung ke MySQL.

## 2. Tujuan Produk
- Menyediakan **single source of master data** untuk operasional underwriting & policy admin.
- Mempercepat pembuatan **quotation** dengan template yang sudah terstandar.
- Mengelola **commission calculation** untuk agen/mitra.
- Mendukung **payment tracking** dan **invoice generation**.

## 3. Ruang Lingkup (In-Scope)
- Master data: COB, Sub-COB, Currency, Partners, Company Profile, Model Risk (Vehicle, Vessel, Property, Engineering), Object Group, Occupation, Class Construction, Coverages.
- Transaksi: Quotation, Commission, Payment, Invoice.
- Dashboard: Admin Dashboard, User Dashboard.
- Role-based menu (admin, user, manager — implisit via UI).

## 4. Di Luar Ruang Lingkup (Out-of-Scope)
- Mobile native app.
- Integrasi langsung dengan payment gateway pihak ketiga (saat ini hanya tracking internal).
- Klaim (Claim) — modul belum ada di FE ini.
- Reinsurance — modul belum ada.

## 5. Pengguna Target
- **Administrator**: mengelola master data, user, dan konfigurasi.
- **Underwriter**: membuat quotation, evaluasi risiko.
- **Sales/Agen**: input quotation, lihat komisi.
- **Finance**: tracking pembayaran, invoice, komisi.

## 6. Metrik Sukses
- 95% quotation dapat dibuat dalam **< 5 menit** oleh agen.
- Master data sync time **< 2 detik**.
- 0 critical bug di production dalam 1 bulan pertama.

## 7. Asumsi & Kendala
- **Asumsi**: pengguna memiliki browser modern (Chrome 100+, Edge 100+, Firefox 100+).
- **Kendala**: aplikasi masih single-tenant, database lokal MySQL, tidak ada HA/DR.

## 8. Dokumen Terkait
- Personas & User Roles: personas-and-user-roles.md
- Functional Requirements: unctional-requirements.md
- Non-Functional Requirements: 
on-functional-requirements.md
- Acceptance Criteria: cceptance-criteria.md

## 9. Riwayat
| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1.0 | 2026-06-12 | Draft awal | System Analyst |
