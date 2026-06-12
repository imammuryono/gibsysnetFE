# Data Model

> **Status**: Draft | **Pemilik**: System Analyst | **Terakhir Update**: 2026-06-12

> Dokumentasi data model diambil dari server.js (Class Construction sebagai referensi) dan ssets/js/cob.js (sebagai referensi domain).

## 1. Entity-Relationship Overview (Tujuan)
`
Company (1) ─── (N) Quotation (1) ─── (N) Payment
   │                    │
   │                    ├── (N) Commission (N) ─── (1) Partner
   │                    └── (N) RiskModel (Vehicle/Vessel/Property/Engineering)
   │
   ├── (1) COB (1) ─── (N) SubCOB
   ├── (1) Currency
   ├── (1) ClassConstruction
   ├── (1) Coverage
   └── (1) User
`

## 2. Tabel: class_construction (Reference)
> Skema aktual dari server.js:ensureClassConstructionTables()

| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| class_code | VARCHAR(50) | UNIQUE, NOT NULL | Format CLS### |
| class_category | VARCHAR(100) | NOT NULL | Kategori class |
| class_name | VARCHAR(255) | NOT NULL | Nama class (ID) |
| class_name_eng | VARCHAR(255) | NULL | Nama class (EN) |
| status | ENUM('active','inactive') | DEFAULT 'active' | Status aktif |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tgl buat |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Tgl update |
| deleted_at | DATETIME | NULL | Soft delete timestamp |
| created_by | INT | NULL | User id pembuat |
| updated_by | INT | NULL | User id pengubah |
| idx_* | INDEX | — | idx_class_code, idx_class_name, idx_class_category, idx_status, idx_deleted_at |

## 3. Tabel: class_construction_history
| Column | Type | Constraint | Deskripsi |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| class_id | INT | FK → class_construction(id) ON DELETE CASCADE | Reference |
| class_code | VARCHAR(50) | NULL | Snapshot |
| class_category | VARCHAR(100) | NULL | Snapshot |
| class_name | VARCHAR(255) | NULL | Snapshot |
| class_name_eng | VARCHAR(255) | NULL | Snapshot |
| status | ENUM('active','inactive') | NULL | Snapshot |
| ction | ENUM('CREATE','UPDATE','DELETE','RESTORE') | DEFAULT 'UPDATE' | Jenis aksi |
| changed_by | INT | NULL | User id |
| changed_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tgl perubahan |
| emarks | TEXT | NULL | Catatan |
| idx_* | INDEX | — | idx_class_id, idx_action, idx_changed_at |

## 4. Tabel yang Direkomendasikan (Belum Diimplementasi)
### cob
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| product_id | VARCHAR(20) | UNIQUE (e.g. MOT-C-001) |
| 	ype | ENUM('LI','GI') | NOT NULL |
| cob_code | VARCHAR(10) | NOT NULL |
| sub_cob | VARCHAR(100) | NOT NULL |
| description | VARCHAR(255) | NULL |
| status | ENUM('active','inactive') | DEFAULT 'active' |
| deleted_at | DATETIME | NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

### sub_cob
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| sub_cob_code | VARCHAR(20) | UNIQUE |
| cob_id | INT | FK → cob(id) |
| sub_cob_name | VARCHAR(100) | NOT NULL |
| status | ENUM('active','inactive') | DEFAULT 'active' |

### currencies
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| code | VARCHAR(3) | UNIQUE (e.g. IDR, USD) |
| 
ame | VARCHAR(50) | NOT NULL |
| symbol | VARCHAR(5) | NULL |
| ate | DECIMAL(18,6) | NOT NULL |
| effective_date | DATE | NOT NULL |
| is_base | BOOLEAN | DEFAULT FALSE |
| status | ENUM('active','inactive') | DEFAULT 'active' |

### partners
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| 
ame | VARCHAR(100) | NOT NULL |
| 	ype | ENUM('broker','agent','loss_adjuster','reinsurer') | NOT NULL |
| ddress | TEXT | NULL |
| phone | VARCHAR(20) | NULL |
| email | VARCHAR(100) | NULL |
| pic | VARCHAR(100) | NULL |
| status | ENUM('active','inactive') | DEFAULT 'active' |

### quotations
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| quotation_no | VARCHAR(30) | UNIQUE |
| cob_id | INT | FK → cob(id) |
| partner_id | INT | FK → partners(id) |
| currency_id | INT | FK → currencies(id) |
| sum_insured | DECIMAL(18,2) | NOT NULL |
| premium | DECIMAL(18,2) | NOT NULL |
| ate | DECIMAL(8,4) | NOT NULL |
| isk_data | JSON | NULL (vehicle/vessel/property data) |
| status | ENUM('draft','submitted','approved','rejected') | DEFAULT 'draft' |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### commissions
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| quotation_id | INT | FK → quotations(id) |
| partner_id | INT | FK → partners(id) |
| ate | DECIMAL(8,4) | NOT NULL |
| mount | DECIMAL(18,2) | NOT NULL |
| status | ENUM('pending','paid') | DEFAULT 'pending' |

### payments
| Column | Type | Constraint |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| payment_no | VARCHAR(30) | UNIQUE |
| quotation_id | INT | FK → quotations(id) |
| 	ype | ENUM('dp','termin','pelunasan') | NOT NULL |
| mount | DECIMAL(18,2) | NOT NULL |
| paid_at | DATE | NULL |
| status | ENUM('pending','paid','overdue') | DEFAULT 'pending' |

## 5. Konvensi
- Semua tabel **wajib** punya id INT AUTO_INCREMENT PK.
- Soft delete pakai status ENUM('active','inactive') + deleted_at DATETIME NULL.
- Audit trail pakai tabel history terpisah (suffix _history).
- Engine: InnoDB, charset: utf8mb4, collation: utf8mb4_unicode_ci.
