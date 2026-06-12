# API Contract

> **Status**: Approved | **Pemilik**: Tech Lead | **Terakhir Update**: 2026-06-12

> **Base URL**: http://localhost:3001/api
> **Content-Type**: pplication/json
> **Auth**: *(belum — **tech debt**)*

## Format Response Standar
### Success
`json
{
  "success": true,
  "data": { ... } | [ ... ]
}
`

### Error
`json
{
  "success": false,
  "message": "Class data not found."
}
`

### HTTP Status Codes
| Code | Arti | Contoh |
|---|---|---|
| 200 | OK | GET, PUT/PATCH success |
| 201 | Created | POST success (saat ini pakai 200) |
| 400 | Bad Request | Validation error |
| 404 | Not Found | Resource tidak ada |
| 422 | Unprocessable | Field required missing |
| 500 | Server Error | DB error, unhandled exception |

## Endpoint Index
| Method | Path | Module | Status |
|---|---|---|---|
| GET | /class-construction | Class | ✅ Implemented |
| GET | /class-construction/:id | Class | ✅ Implemented |
| POST | /class-construction | Class | ✅ Implemented |
| PUT/PATCH | /class-construction | Class | ✅ Implemented |
| PUT/PATCH | /class-construction/:id | Class | ✅ Implemented |
| PUT | /class-construction/:id/restore | Class | ✅ Implemented |
| DELETE | /class-construction | Class | ✅ Implemented |
| DELETE | /class-construction/:id | Class | ✅ Implemented |
| GET | /cob | COB | ⬜ Pending |
| GET/POST/PUT/DELETE | /sub-cob | Sub-COB | ⬜ Pending |
| GET/POST/PUT/DELETE | /currencies | Currency | ⬜ Pending |
| GET/POST/PUT/DELETE | /partners | Partners | ⬜ Pending |
| GET/POST/PUT/DELETE | /quotations | Quotation | ⬜ Pending |
| GET/POST/PUT/DELETE | /commissions | Commission | ⬜ Pending |
| GET/POST/PUT/DELETE | /payments | Payment | ⬜ Pending |
| GET/POST/PUT/DELETE | /risk-vehicle | Risk Vehicle | ⬜ Pending |
| GET/POST/PUT/DELETE | /risk-vessel | Risk Vessel | ⬜ Pending |
| GET/POST/PUT/DELETE | /risk-property | Risk Property | ⬜ Pending |
| GET/POST/PUT/DELETE | /risk-engineering | Risk Engineering | ⬜ Pending |
| GET | /health | Health Check | ⬜ Recommended |

## Detail: Class Construction
### GET /api/class-construction
**Response 200**
`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "class_code": "CLS001",
      "class_category": "Residential",
      "class_name": "Rumah Tinggal",
      "class_name_eng": "Residential Building",
      "status": "active",
      "deleted_at": null,
      "updated_at": "2026-06-12T10:00:00.000Z"
    }
  ]
}
`

### GET /api/class-construction/:id
**Response 200**: sama dengan satu object di atas.
**Response 404**: { "success": false, "message": "Class data not found." }

### POST /api/class-construction
**Request**
`json
{
  "class_code": "CLS005",
  "class_category": "Commercial",
  "class_name": "Bangunan Komersial",
  "class_name_eng": "Commercial Building",
  "status": "active"
}
`
**Response 200**
`json
{ "success": true, "data": { "id": 5, ... } }
`
**Response 400 (duplicate)**
`json
{ "success": false, "message": "Class Code already exists." }
`

### PUT /api/class-construction/:id
Update existing record. Body sama dengan POST. status=inactive mengaktifkan soft delete (set deleted_at).
**Action** yang tercatat di history:
- UPDATE jika status tetap active.
- DELETE jika sebelumnya active → inactive.
- RESTORE jika sebelumnya inactive → active.

### PUT /api/class-construction/:id/restore
Restore soft-deleted record.
**Response 200**: data dengan status=active, deleted_at=null.
**Response 404**: jika record tidak ada.

### DELETE /api/class-construction/:id
Soft delete. Set status=inactive, deleted_at=NOW().
**Response 200**: data dengan status inactive.
**Response 404**: jika record tidak ada.

## Detail: COB *(Tujuan)*
### GET /api/cob?type=GI&status=active
**Response 200**
`json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": "MOT-C-001",
      "type": "GI",
      "cob_code": "MOT",
      "sub_cob": "Comprehensive",
      "description": "General Insurance: Motor (Comprehensive)",
      "status": "active",
      "deleted_at": null,
      "updated_at": "2026-06-12T10:00:00.000Z"
    }
  ]
}
`

## Konvensi Penamaan
- Endpoint: plural noun (/class-construction, /cob).
- ID selalu di URL path: /:id.
- Query param untuk filter: ?type=GI&status=active.
- Pagination: ?page=1&limit=10 *(tujuan)*.
