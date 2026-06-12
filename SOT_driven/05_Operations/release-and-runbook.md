# Release & Runbook

> **Status**: `Draft` | **Pemilik**: DevOps / System Analyst | **Terakhir Update**: 2026-06-12

## 1. Release Process

### Prerequisites
- [ ] Semua perubahan sesuai dengan Implementation Plan.
- [ ] Dokumen SOT diperbarui.
- [ ] Approval dari Tech Lead + Product Owner.
- [ ] Manual smoke test lulus.
- [ ] Tidak ada breaking change tanpa ADR.

### Release Steps
1. **Create release branch** (jika pakai Git flow): `release/v1.0.0`.
2. **Run manual smoke test** untuk semua modul.
3. **Update version** di `package.json`.
4. **Update changelog** di `05_Operations/changelog-conventions.md`.
5. **Run deployment** (lihat runbook).
6. **Post-deploy verification** (health check + smoke test).
7. **Announce release** ke stakeholder.
8. **Close release branch**, merge ke `main`.

## 2. Deployment Runbook

### Development
    npm install
    npm start
    # Server running on http://localhost:3001
    # Access frontend: http://localhost:3000/{page}.html atau buka langsung file

### Production (Single Server)
1. **Pre-deploy:**
    - Backup database: `mysqldump gibsysnet > backup_YYYYMMDD.sql`
    - Stop service: `pm2 stop server` (atau `systemctl stop`)
2. **Deploy:**
    - `git pull origin main`
    - `npm install`
    - `npm start` (atau PM2: `pm2 start server.js`)
3. **Post-deploy:**
    - `curl http://localhost:3001/health` (cek 200 OK)
    - Buka browser -> cek semua halaman.
    - Cek browser console -> no error.
    - Cek server log -> no error.

### Rollback Plan
Jika post-deploy verification gagal:
1. `pm2 stop server`
2. `git checkout <previous-commit>`
3. `npm install`
4. `pm2 start server`
5. Verify rollback successful.
6. Post issue di risk register.

## 3. Environment Checklist

| Env Var | Development | Production |
|---|---|---|
| DB_HOST | 127.0.0.1 | db.internal.company.com |
| DB_PORT | 3306 | 3306 |
| DB_USER | root | gibsysnet_user |
| DB_PASSWORD | (empty) | (secrets manager) |
| DB_NAME | gibsysnet | gibsysnet |
| PORT | 3001 | 3001 |

## 4. Database Migration (Target)
- Simpan semua schema di file SQL: `database/schema.sql`.
- Migrate via: `mysql -u root -p gibsysnet < database/schema.sql`.
- Setiap perubahan schema: tambahkan ke `database/migrations/`.
- Gunakan `server.js` auto-create `IF NOT EXISTS` untuk dev flexibility.

## 5. SSL / HTTPS (Production)
- Reverse proxy: Nginx + Let's Encrypt.
- `server.js` harus support HTTPS atau di-bypass di proxy.
- HTTP -> HTTPS redirect.

## 6. Backup Strategy
- **Database**: Daily cron job (mysqldump).
- **Files**: Weekly backup ke cloud storage (S3/GCS).
- **Retention**: 30 days daily, 3 months weekly.