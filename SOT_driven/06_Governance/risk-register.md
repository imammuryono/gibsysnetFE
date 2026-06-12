# Risk Register

> **Status**: `Draft` | **Pemilik**: System Analyst + Project Manager | **Terakhir Update**: 2026-06-12

## Risk Matrix
| Severity \ Likelihood | Low | Medium | High |
|---|---|---|---|
| Critical | Medium | High | Critical |
| Major | Low | Medium | High |
| Minor | Low | Low | Medium |

## Risks

### RISK-001: Tidak Ada Authentication/Authorization
- **Severity**: Critical
- **Likelihood**: High (karena belum diimplementasi)
- **Risk**: Endpoint API terbuka, siapa pun bisa akses.
- **Mitigation**: Implementasi JWT auth + RBAC (Fase 6, P0).
- **Owner**: Tech Lead
- **Status**: Open

### RISK-002: No HTTPS
- **Severity**: Critical
- **Likelihood**: High (untuk production)
- **Risk**: Data transit bisa di-sniff.
- **Mitigation**: Setup reverse proxy + Let''s Encrypt (Fase 6, P0).
- **Owner**: DevOps
- **Status**: Open

### RISK-003: Single Server, No HA
- **Severity**: Major
- **Likelihood**: Medium
- **Risk**: Downtime saat server maintenance atau failure.
- **Mitigation**: Setup load balancer + multiple instance (Future).
- **Owner**: DevOps
- **Status**: Open

### RISK-004: Tidak Ada Test Otomatis
- **Severity**: Major
- **Likelihood**: High
- **Risk**: Regresi sulit di-deteksi.
- **Mitigation**: Setup Jest + Playwright (Fase 6).
- **Owner**: QA
- **Status**: Open

### RISK-005: LocalStorage untuk Session
- **Severity**: Major
- **Likelihood**: Medium
- **Risk**: XSS bisa curi session. Tidak ada CSRF protection.
- **Mitigation**: Migrate ke httpOnly cookie (Fase 6).
- **Owner**: Tech Lead
- **Status**: Open

### RISK-006: Dokumentasi Kode Minim
- **Severity**: Minor
- **Likelihood**: High
- **Risk**: Onboarding engineer baru lambat.
- **Mitigation**: SOT Driven (folder ini) + inline JSDoc untuk function penting.
- **Owner**: All engineers
- **Status**: Mitigated (SOT dibuat)

### RISK-007: Schema Tidak Migrasi
- **Severity**: Major
- **Likelihood**: Medium
- **Risk**: Database schema tidak versioned, susah rollback.
- **Mitigation**: Setup migration tool (Knex, Sequelize, atau custom).
- **Owner**: Backend
- **Status**: Open

### RISK-008: Tabel `api/` Kosong
- **Severity**: Minor
- **Likelihood**: Certain
- **Risk**: Struktur folder kurang konsisten.
- **Mitigation**: Pindahkan routes dari `server.js` ke `api/{resource}.js`.
- **Owner**: Backend
- **Status**: Open

### RISK-009: Tidak Ada Backup
- **Severity**: Critical
- **Likelihood**: Medium
- **Risk**: Data loss saat DB crash.
- **Mitigation**: Setup cron job mysqldump harian.
- **Owner**: DevOps
- **Status**: Open

### RISK-010: Browser Cache Issue
- **Severity**: Minor
- **Likelihood**: Medium
- **Risk**: User lihat versi lama setelah deploy.
- **Mitigation**: Add cache-busting query string `?v={version}` di script src.
- **Owner**: Frontend
- **Status**: Open

## Bug Log (Template)
    ### BUG-XXX: <Title>
    - **Reported**: YYYY-MM-DD
    - **Reported by**: ...
    - **Severity**: Blocker / Critical / Major / Minor / Trivial
    - **Steps to Reproduce**:
      1. ...
    - **Expected**: ...
    - **Actual**: ...
    - **Environment**: Browser, OS, version
    - **Screenshot**: (link)
    - **Assigned to**: ...
    - **Status**: Open / In Progress / Resolved / Closed