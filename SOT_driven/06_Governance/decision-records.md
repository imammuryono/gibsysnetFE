# Architecture Decision Records (ADR)

> **Status**: `Approved` | **Pemilik**: Tech Lead | **Terakhir Update**: 2026-06-12

> ADR adalah dokumen ringkas yang merekam keputusan arsitektur/teknis yang penting, beserta konteks dan konsekuensinya.

## Template ADR
    # ADR-NNN: <Judul Singkat>

    ## Status
    Proposed | Accepted | Deprecated | Superseded by ADR-XXX

    ## Context
    <Apa masalahnya / situasi apa yang melatarbelakangi keputusan ini>

    ## Decision
    <Apa yang diputuskan>

    ## Consequences
    <Apa dampak positif dan negatif, trade-off>

    ## Alternatives Considered
    <Opsi lain yang dipertimbangkan + kenapa tidak dipilih>

## ADR-001: Frontend dengan HTML Statis + Vanilla JS

### Status
Accepted (2026-06-12)

### Context
Tim tidak memiliki expertise React/Vue. Project harus cepat jadi (MVP).

### Decision
Frontend berupa halaman HTML statis dengan Tailwind CSS (custom config inline) + Vanilla JavaScript (ES6+).

### Consequences
- (+) Cepat jadi, minim dependencies.
- (+) Mudah di-debug.
- (-) Tidak scalable untuk aplikasi besar.
- (-) Tidak ada state management terpusat.
- (-) Refactor ke React/Vue akan butuh effort besar di kemudian hari.

### Alternatives Considered
- **React + Vite**: Butuh re-write, learning curve.
- **Vue + Nuxt**: Lebih mudah, tapi tetap butuh re-write.
- **Static site generator (Astro)**: Overkill untuk project ini.

## ADR-002: Backend dengan Node.js + Express

### Status
Accepted

### Context
Butuh REST API sederhana untuk CRUD master data.

### Decision
Node.js 18+ dengan Express 4.18 dan mysql2/promise untuk connection pooling.

### Consequences
- (+) Bahasa sama dengan JavaScript frontend.
- (+) Ekosistem luas.
- (-) Single-threaded (tapi cukup untuk workload ini).
- (-) Perlu atasi SQL injection dengan parameterized queries (sudah dilakukan).

## ADR-003: MySQL sebagai Database

### Status
Accepted

### Context
Tim familiar dengan MySQL. Hosting internal sudah support MySQL 8.0.

### Decision
MySQL 8.0 dengan InnoDB, utf8mb4 charset.

### Consequences
- (+) Familiar untuk tim.
- (+) Performa cukup baik.
- (-) Tidak ada enum/array type seperti PostgreSQL (perlu tabel relasi).

## ADR-004: Soft Delete + History Log Pattern

### Status
Accepted

### Context
Data master tidak boleh hilang permanent (audit, restore).

### Decision
Setiap master table punya:
- Field `status` (active/inactive).
- Field `deleted_at` (timestamp soft delete).
- Tabel `_history` terpisah untuk audit log.

### Consequences
- (+) Bisa restore data.
- (+) Audit trail lengkap.
- (+) Soft delete: query harus selalu filter `status=active` (atau gunakan view).

## ADR-005: Port 3001 Permanent untuk Backend

### Status
Accepted

### Context
Frontend served di Apache (port 3000) untuk static files. Backend API butuh port terpisah.

### Decision
Backend Node.js/Express selalu di port 3001. `assets/js/api.js` hard-code `baseUrl = http://localhost:3001/api`.

### Consequences
- (+) Tidak ada port conflict dengan Apache.
- (-) Setiap deployment harus ensure port 3001 available.
- (-) Untuk production: perlu reverse proxy + CORS configuration.

## ADR-006: Single Tenant (Untuk Sekarang)

### Status
Accepted

### Context
Aplikasi dipakai oleh satu perusahaan asuransi saja. Tidak perlu multi-tenant untuk MVP.

### Decision
Single database, single deployment.

### Consequences
- (+) Sederhana.
- (-) Untuk SaaS di kemudian hari, butuh refactor besar (tenant_id di setiap tabel).