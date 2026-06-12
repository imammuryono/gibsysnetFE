# Testing Strategy

> **Status**: `Draft` | **Pemilik**: QA Lead | **Terakhir Update**: 2026-06-12

## 1. Test Pyramid (Target)
    +-------------+
    | E2E (Playwright) |  ~10%
    +-------------+
    | Integration (Supertest) | ~30%
    +-------------+
    | Unit (Jest) | ~60%
    +-------------+

> **Catatan**: Saat ini belum ada test framework. Ini roadmap.

## 2. Manual Testing (Saat Ini)

### Frontend Smoke Test
Sebelum deploy, cek manual:
- [ ] Buka `class.html` di browser.
- [ ] Lihat tabel muncul (loading indicator hilang).
- [ ] Klik New, isi form, Save -> data muncul di tabel.
- [ ] Klik row -> data muncul di form.
- [ ] Edit -> Save -> data update.
- [ ] Delete -> konfirmasi -> data hilang dari tabel, muncul di Soft Delete Panel.
- [ ] Restore -> data kembali ke tabel.
- [ ] Search -> filter berfungsi.
- [ ] Pagination -> navigasi halaman berfungsi.
- [ ] Export CSV -> file terdownload.

### Backend API Test (curl / Postman)
    curl -X GET http://localhost:3001/api/class-construction
    curl -X POST http://localhost:3001/api/class-construction -H "Content-Type: application/json" -d "{\"class_code\":\"CLS001\",\"class_category\":\"Test\",\"class_name\":\"Test Class\",\"status\":\"active\"}"
    curl -X PUT http://localhost:3001/api/class-construction/1 -H "Content-Type: application/json" -d "{\"class_code\":\"CLS001\",\"class_category\":\"Test\",\"class_name\":\"Updated\",\"status\":\"active\"}"
    curl -X PUT http://localhost:3001/api/class-construction/1/restore
    curl -X DELETE http://localhost:3001/api/class-construction/1

## 3. Unit Testing (Target)
Framework: **Jest** + **Supertest** (untuk API).

    const request = require("supertest");
    const app = require("../server");

    describe("GET /api/class-construction", () => {
      it("should return 200 and list of classes", async () => {
        const res = await request(app).get("/api/class-construction");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

## 4. Integration Testing (Target)
- Setup MySQL test database (terpisah dari production).
- Run migrations sebelum test.
- Teardown setelah test.
- Coverage target: 80%.

## 5. E2E Testing (Target)
Framework: **Playwright**.

    test("create new class", async ({ page }) => {
      await page.goto("http://localhost:3000/class.html");
      await page.click("#newBtnSidebar");
      await page.fill("#classCode", "CLS999");
      await page.fill("#className", "Test Class");
      await page.click("#saveBtnSidebar");
      await expect(page.locator("#messageText")).toContainText("successfully");
    });

## 6. Test Cases Coverage
Lihat `01_PRD/acceptance-criteria.md` sebagai source of truth untuk test cases.

## 7. Regression Test
Sebelum setiap release:
- Run full manual smoke test untuk semua modul.
- Run automated test (jika ada).
- Cek tidak ada error di browser console.
- Cek tidak ada error di server log.

## 8. Bug Reporting
Template bug report (lihat `06_Governance/risk-register.md`):
- Title: singkat dan deskriptif.
- Severity: Blocker / Critical / Major / Minor / Trivial.
- Steps to Reproduce.
- Expected vs Actual.
- Screenshot / video.
- Environment: browser, OS, version.