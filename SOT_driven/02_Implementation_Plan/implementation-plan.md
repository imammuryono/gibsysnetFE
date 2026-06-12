# Implementation Plan

> **Status**: Approved | **Pemilik**: Tech Lead | **Terakhir Update**: 2026-06-12

## Overview
Implementasi dilakukan secara bertahap (phased) dari master data → transaksi → reporting → polish.

## Fase 1: Foundation (Week 1–2)
| # | Task | File/Module | Priority | Status |
|---|---|---|---|---|
| 1.1 | Setup project structure (routing, shared layout) | layout.html, ssets/js/pro-layout.js | P0 | ✅ Done |
| 1.2 | Implement API layer (ssets/js/api.js + error handling) | pi.js, main.js | P0 | ✅ Done |
| 1.3 | MySQL connection pooling + config | server.js | P0 | ✅ Done |
| 1.4 | Auth middleware skeleton (JWT/session) | server.js, ssets/js/auth.js | P1 | ⬜ Pending |

## Fase 2: Master Data CRUD (Week 3–4)
| # | Task | File/Module | Priority | Status |
|---|---|---|---|---|
| 2.1 | COB Management (full CRUD + soft delete + API) | cob.html, ssets/js/cob.js | P0 | ✅ Done |
| 2.2 | Sub COB Management | subcob.html, ssets/js/subcob.js | P0 | ✅ Done |
| 2.3 | Currency Management | currency.html, ssets/js/currency.js | P1 | ✅ Done |
| 2.4 | Class Construction (auto code, history, soft delete) | server.js (class module), class.html, ssets/js/class.js | P0 | ✅ Done |
| 2.5 | Partners Management | partners.html, ssets/js/partners.js | P1 | ✅ Done |
| 2.6 | Company Profile | company.html, ssets/js/company.js | P2 | ✅ Done |

## Fase 3: Risk Models (Week 5–6)
| # | Task | File/Module | Priority | Status |
|---|---|---|---|---|
| 3.1 | Model Risk Baru (flexible template) | modelriskbaru.html, ssets/js/modelriskbaru.js | P0 | ✅ Done |
| 3.2 | Model Risk Vehicle | riskvehicle.html, ssets/js/riskvehicle.js | P0 | ✅ Done |
| 3.3 | Model Risk Property | riskproperty.html, ssets/js/riskproperty.js | P0 | ✅ Done |
| 3.4 | Model Risk Vessel | riskvessel.html, ssets/js/riskvessel.js | P1 | ✅ Done |
| 3.5 | Model Risk Engineering | riskengineering.html, ssets/js/riskproperty.js | P1 | ✅ Done |

## Fase 4: Transaction (Week 7–8)
| # | Task | File/Module | Priority | Status |
|---|---|---|---|---|
| 4.1 | Quotation Module (create, calculate premium, save) | quotation.html, ssets/js/quotation.js | P0 | ⬜ Pending |
| 4.2 | Commission Module + Calculator | commission.html, ssets/js/commission.js, ssets/js/commission-calculator.js | P0 | ⬜ Pending |
| 4.3 | Payment + Invoice Generator | payments.html, ssets/js/payments.js, ssets/js/invoice-generator.js | P0 | ⬜ Pending |

## Fase 5: Reporting & Dashboard (Week 9–10)
| # | Task | File/Module | Priority | Status |
|---|---|---|---|---|
| 5.1 | Admin Dashboard | dashboard/, ssets/js/dashboard-admin.js | P0 | ⬜ Pending |
| 5.2 | User Dashboard | dashboard/dashboard-user.html | P1 | ⬜ Pending |
| 5.3 | Chart/Report components | ssets/js/charts.js | P1 | ⬜ Pending |

## Fase 6: Polish & Production (Week 11–12)
| # | Task | File/Module | Priority | Status |
|---|---|---|---|---|
| 6.1 | Security hardening (JWT, HTTPS, rate limit) | server.js, middleware files | P0 | ⬜ Pending |
| 6.2 | Input validation + sanitization | semua JS modules | P0 | ⬜ Pending |
| 6.3 | Responsive/mobile polish | output.css, custom.css | P1 | ⬜ Pending |
| 6.4 | Error handling (global error page) | server.js | P1 | ⬜ Pending |
| 6.5 | Performance optimization (lazy load, caching) | server.js, assets | P2 | ⬜ Pending |

## Asumsi
- Database gibsysnet sudah ada di MySQL.
- Node.js ≥ 18.x dan MySQL ≥ 8.0 tersedia.
- Tidak ada migrasi data dari sistem lama.

## Dependencies Antar Fase
- Fase 1 → Fase 2 (foundation API required).
- Fase 2 → Fase 3 (master COB needed for risk model data).
- Fase 3 → Fase 4 (risk model data needed for quotation pricing).
- Fase 4 → Fase 5 (transaction data needed for dashboards).
