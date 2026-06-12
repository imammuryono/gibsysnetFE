# Maintenance Playbook

> **Status**: `Draft` | **Pemilik**: System Analyst + All Maintainers | **Terakhir Update**: 2026-06-12

## 1. Routine Maintenance Schedule

### Daily
- [ ] Check server uptime (health endpoint).
- [ ] Check error log (file + browser console).
- [ ] Check DB backup status.

### Weekly
- [ ] Review performance (response time, DB query time).
- [ ] Check disk space (logs, backups).
- [ ] Review user feedback / bug reports.

### Monthly
- [ ] Update Node.js dependencies (`npm outdated` + `npm audit`).
- [ ] Review security: check for known CVEs.
- [ ] Review access control (who has access).
- [ ] Test restore from backup.
- [ ] Review database size (growth rate).

### Quarterly
- [ ] Full security audit.
- [ ] Performance benchmarking.
- [ ] Update SOT documentation.
- [ ] Review architecture decisions (ADR).

## 2. Common Issues & Solutions

### Issue: Server tidak bisa start
**Diagnosis:**
    node server.js
    # Check error message

**Solutions:**
1. Check port 3001 not in use: `netstat -ano | findstr 3001`
2. Check database connection: verify `DB_HOST`, `DB_USER`, `DB_PASSWORD`.
3. Check file permissions on project directory.

### Issue: API tidak merespon
**Diagnosis:**
    curl http://localhost:3001/api/class-construction

**Solutions:**
1. Check Node.js process: `tasklist | findstr node`
2. Check database connection pool usage.
3. Check server error log.

### Issue: Database table tidak ada
**Solutions:**
1. Run migration: `mysql -u root -p gibsysnet < database/schema.sql`
2. Or ensure `server.js` can auto-create (class construction already has `IF NOT EXISTS`).

### Issue: Frontend tidak bisa connect ke API
**Diagnosis:**
1. Check browser console (CORS error, network error).
2. Check `assets/js/api.js` baseUrl: must be `http://localhost:3001/api`.
3. Verify backend running on port 3001.

**Solutions:**
1. Restart backend.
2. Check CORS settings: `cors()` should match origin.

### Issue: Slow page load
**Diagnosis:**
1. Open browser DevTools -> Network tab.
2. Check each API response time.
3. Check DB query time.

**Solutions:**
1. Add database index for queried columns.
2. Add pagination (already implemented).
3. Consider caching (Redis, CDN).

## 3. Database Maintenance

### Optimize Tables
    OPTIMIZE TABLE class_construction;
    OPTIMIZE TABLE cob;

### Check Table Size
    SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) AS "Size (MB)"
    FROM information_schema.tables
    WHERE table_schema = "gibsysnet"
    ORDER BY size DESC;

### Purge History / Deleted Data
    DELETE FROM class_construction_history WHERE changed_at < DATE_SUB(NOW(), INTERVAL 12 MONTH);

## 4. Performance Monitoring
- Monitor: server response time, DB query time, memory usage.
- Alert: response time > 2s, memory > 80%.

## 5. Documentation Maintenance
- SOT documents: update setelah setiap perubahan signifikan.
- Changelog: update setiap release.
- Decision records: update setiap ADR baru.