# Glossary

> **Status**: `Approved` | **Pemilik**: System Analyst | **Terakhir Update**: 2026-06-12

> Daftar istilah teknis dan domain bisnis yang digunakan dalam dokumentasi SOT dan aplikasi.

## Istilah Domain (Asuransi)

| Istilah | Definisi | Referensi |
|---|---|---|
| **COB** | Class of Business. Kategori bisnis asuransi. | `01_PRD/functional-requirements.md` |
| **Sub-COB** | Sub-kategori dari COB. | `01_PRD/functional-requirements.md` |
| **LI** | Life Insurance (Asuransi Jiwa). | `assets/js/cob.js` |
| **GI** | General Insurance (Asuransi Umum). | `assets/js/cob.js` |
| **IL** | Individual Life. | `assets/js/cob.js` |
| **GL** | Group Life. | `assets/js/cob.js` |
| **SH** | Sharia Life. | `assets/js/cob.js` |
| **AP** | Annuity & Pension. | `assets/js/cob.js` |
| **PROP** | Property (Asuransi Properti). | `assets/js/cob.js` |
| **MAR** | Marine (Asuransi Pelayaran). | `assets/js/cob.js` |
| **MOT** | Motor (Asuransi Kendaraan Bermotor). | `assets/js/cob.js` |
| **ENG** | Engineering (Asuransi Teknik). | `assets/js/cob.js` |
| **LIAB** | Liability (Asuransi Tanggung Jawab). | `assets/js/cob.js` |
| **MISC** | Miscellaneous (Asuransi Lain-lain). | `assets/js/cob.js` |
| **CRED** | Credit & Suretyship. | `assets/js/cob.js` |
| **ENER** | Energy & Specialized Risk. | `assets/js/cob.js` |
| **HEAL** | Health (Asuransi Kesehatan). | `assets/js/cob.js` |
| **Sum Insured** | Nilai pertanggakan. | `01_PRD/functional-requirements.md` |
| **Premium** | Biaya asuransi yang dibayarkan nasabah. | `01_PRD/functional-requirements.md` |
| **Quotation** | Penawaran harga asuransi. | `01_PRD/functional-requirements.md` |
| **Commission** | Komisi untuk agen/mitra. | `01_PRD/functional-requirements.md` |
| **DP** | Uang Muka (Down Payment). | `01_PRD/functional-requirements.md` |
| **Termin** | Angsuran pembayaran. | `01_PRD/functional-requirements.md` |
| **Pelunasan** | Pembayaran penuh. | `01_PRD/functional-requirements.md` |

## Istilah Teknis

| Istilah | Definisi | Referensi |
|---|---|---|
| **SOT** | Source of Truth. Dokumen rujukan utama. | `README.md` |
| **AGENTS.md** | Kontrak eksekusi AI untuk repo ini. | `AGENTS.md` |
| **ADR** | Architecture Decision Record. | `06_Governance/decision-records.md` |
| **CRUD** | Create, Read, Update, Delete. | `01_PRD/functional-requirements.md` |
| **REST** | Representational State Transfer. | `02_Implementation_Plan/api-contract.md` |
| **JWT** | JSON Web Token (Auth). | `02_Implementation_Plan/security-and-compliance.md` |
| **RBAC** | Role-Based Access Control. | `02_Implementation_Plan/security-and-compliance.md` |
| **CORS** | Cross-Origin Resource Sharing. | `server.js` |
| **Pool** | Database connection pool (mysql2). | `server.js` |
| **Soft Delete** | Hapus logis (status=inactive). | `server.js` |
| **Hard Delete** | Hapus permanen dari tabel. | `server.js` |
| **Audit Trail** | Catatan perubahan (history table). | `server.js` |
| **Tailwind** | Utility-first CSS framework. | `03_UI_Guideline/design-tokens.md` |
| **WCAG** | Web Content Accessibility Guidelines. | `03_UI_Guideline/accessibility-and-i18n.md` |
| **i18n** | Internationalization. | `01_PRD/non-functional-requirements.md` |
| **a11y** | Accessibility. | `03_UI_Guideline/accessibility-and-i18n.md` |
| **MySQL** | Relational database (InnoDB, utf8mb4). | `02_Implementation_Plan/architecture-and-stack.md` |
| **Express** | Node.js web framework. | `02_Implementation_Plan/architecture-and-stack.md` |

## Format ID

| Pola | Contoh | Modul |
|---|---|---|
| `CLS###` | CLS001 | Class Construction |
| `TYPE-SUBCOB-SEQ` | MOT-C-001, IL-TL-001 | COB |
| `ISO 4217` | IDR, USD, EUR | Currency |
| `YYYY-MM-DD` | 2026-06-12 | Date display |
| `HH:mm:ss` | 14:30:00 | Time display |