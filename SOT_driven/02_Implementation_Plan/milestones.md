# Milestones & Timeline

> **Status**: Draft | **Pemilik**: Tech Lead | **Terakhir Update**: 2026-06-12

## Milestone Summary
| Milestone | Target | Deliverable | Success Criteria |
|---|---|---|---|
| M1: Foundation | Week 2 | API server + shared layout + DB pool | Server berjalan, /api/health OK |
| M2: Master Data | Week 4 | Semua master CRUD + soft delete | 8 modul master CRUD OK |
| M3: Risk Models | Week 6 | Risk input form + data persist | Semua risk model CRUD OK |
| M4: Transaction | Week 8 | Quotation + Commission + Payment | End-to-end workflow OK |
| M5: Reporting | Week 10 | Dashboard + Charts | Data real-time OK |
| M6: Production | Week 12 | Security + Polish + Deploy | Audit pass + performance OK |

## Gantt Chart (Text)
`
Week:    1    2    3    4    5    6    7    8    9   10   11   12
         |----|----|----|----|----|----|----|----|----|----|----|
M1:      [========]
M2:                  [==============]
M3:                                       [==============]
M4:                                                        [==============]
M5:                                                                         [========]
M6:                                                                                     [========]
`

## Dependency & Risk
| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Delay database schema | Medium | High | Siapkan schema SQL di awal |
| API endpoint tidak match FE expectation | Medium | Medium | API Contract di-test manual per phase |
| Performance turun saat data > 1000 rows | Low | High | Pagination + virtual scroll di phase 6 |
| Security gap di production | High | Critical | Security hardening di M6 (P0) |
