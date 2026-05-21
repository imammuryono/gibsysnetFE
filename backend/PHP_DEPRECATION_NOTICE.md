# PHP Files Deprecation Notice

⚠️ **WARNING: These PHP files are DEPRECATED and should NOT be used**

Date: 2026-04-27

## Deprecated PHP Files

All PHP files in `backend/` are **deprecated** and have been replaced with Node.js + Express routes.

### Files to be archived/removed:

| File | Status | Replacement Route | Notes |
|------|--------|-------------------|-------|
| `backend/db.php` | ❌ DEPRECATED | MySQL2 pool in server.js | Database connection wrapper - no longer needed |
| `backend/lookup.php` | ❌ DEPRECATED | `GET /api/modelrisk/lookup` | Model risk lookup queries - route exists in server.js |
| `backend/modelrisk.php` | ❌ DEPRECATED | `GET,POST,PUT,DELETE /api/modelrisk` | All routes implemented in server.js |
| `backend/risk_vehicle.php` | ❌ DEPRECATED | `GET,POST,DELETE /api/risk-vehicle` | All routes implemented in server.js |

## Migration Status

### ✅ Routes Already Implemented (in backend/server.js)
```
GET    /api/health
GET    /api/modelrisk
GET    /api/modelrisk/lookup?field=...
POST   /api/modelrisk
PUT    /api/modelrisk/:modelId
DELETE /api/modelrisk/:modelId
GET    /api/quotations
POST   /api/quotations
GET    /api/risk-vehicle
POST   /api/risk-vehicle
DELETE /api/risk-vehicle
```

### 🔄 Routes Recently Added (Stubs - need implementation)
```
GET    /api/partners
POST   /api/partners
DELETE /api/partners
GET    /api/cob-products
POST   /api/cob-products
DELETE /api/cob-products
GET    /api/commissions
POST   /api/commissions
DELETE /api/commissions
GET    /api/occupations
POST   /api/occupations
DELETE /api/occupations
GET    /api/classes
POST   /api/classes
DELETE /api/classes
GET    /api/companies
POST   /api/companies
DELETE /api/companies
```

## What to Do With Old PHP Files

### Option 1: Archive (Recommended)
```bash
# Rename with .deprecated extension
mv backend/db.php backend/db.php.deprecated
mv backend/lookup.php backend/lookup.php.deprecated
mv backend/modelrisk.php backend/modelrisk.php.deprecated
mv backend/risk_vehicle.php backend/risk_vehicle.php.deprecated
```

### Option 2: Delete
```bash
rm backend/db.php
rm backend/lookup.php
rm backend/modelrisk.php
rm backend/risk_vehicle.php
```

### Option 3: Keep in separate folder
```bash
mkdir backend/deprecated
mv backend/*.php backend/deprecated/
```

## Why Node.js + Express?

1. **Consistency**: All API endpoints are in one place
2. **Performance**: No PHP overhead, faster responses
3. **Maintainability**: Easier to debug and test
4. **Type Safety**: Can use TypeScript or JSDoc for better IDE support
5. **Async/Await**: Better than PHP's procedural style
6. **Connection Pooling**: MySQL2 pool is more efficient than individual connections

## Frontend Changes Already Applied

All frontend files have been updated to use the Node.js API:
- ✅ `assets/js/class.js` → localhost:3001/api/classes
- ✅ `assets/js/cob.js` → localhost:3001/api/cob-products
- ✅ `assets/js/commission.js` → localhost:3001/api/commissions
- ✅ `assets/js/occupation.js` → localhost:3001/api/occupations
- ✅ `assets/js/company.js` → localhost:3001/api/companies
- ✅ `assets/js/partners.js` → localhost:3001/api/partners
- ✅ `assets/js/quotation.js` → localhost:3001/api/quotations
- ✅ `assets/js/riskvehicle.js` → localhost:3001/api/risk-vehicle
- ✅ `assets/js/modelriskbaru.js` → localhost:3001/api/modelrisk
- ✅ `assets/js/riskvessel.js` → localhost:3001/api/risk-vessel

## Verifying Migration

To verify all routes are working:

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test each resource endpoint
curl http://localhost:3001/api/quotations
curl http://localhost:3001/api/modelrisk
curl http://localhost:3001/api/risk-vehicle
curl http://localhost:3001/api/partners
curl http://localhost:3001/api/classes
curl http://localhost:3001/api/companies
curl http://localhost:3001/api/commissions
curl http://localhost:3001/api/occupations
curl http://localhost:3001/api/cob-products
```

## Timeline

- **2026-04-27**: Deprecation announced, stub routes added
- **2026-05-27**: Remove PHP files if all tests pass
- **2026-06-27**: Final cleanup

---
**Status**: Fully Deprecated  
**Action Required**: Archive or delete old PHP files  
**Last Updated**: 2026-04-27
