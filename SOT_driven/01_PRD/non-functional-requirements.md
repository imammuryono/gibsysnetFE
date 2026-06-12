# Non-Functional Requirements

> **Status**: Draft | **Pemilik**: System Analyst | **Terakhir Update**: 2026-06-12

## 1. Performance
- **NFR-PERF-001**: Halaman pertama kali load (First Contentful Paint) **< 2 detik** di 4G.
- **NFR-PERF-002**: API response time **< 500ms** untuk 95% request.
- **NFR-PERF-003**: Tabel dengan 1000 rows harus tetap smooth (virtual scroll atau pagination).

## 2. Scalability
- **NFR-SCL-001**: Backend harus handle minimal 50 concurrent users.
- **NFR-SCL-002**: MySQL connection pool size: 10 (saat ini).

## 3. Security
- **NFR-SEC-001**: Semua endpoint API harus di-protect dengan JWT/session (saat ini belum — **TECH DEBT**).
- **NFR-SEC-002**: Password harus di-hash (bcrypt) di backend.
- **NFR-SEC-003**: HTTPS wajib di production.
- **NFR-SEC-004**: Rate limiting: 100 req/menit per IP.
- **NFR-SEC-005**: Input validation di backend (sanitize SQL injection, XSS).

## 4. Usability
- **NFR-USA-001**: UI harus konsisten (design tokens, komponen).
- **NFR-USA-002**: Form harus punya validasi real-time.
- **NFR-USA-003**: Pesan error/success harus jelas dalam bahasa Indonesia.

## 5. Reliability
- **NFR-REL-001**: Uptime target: 99% (single-server, no HA saat ini).
- **NFR-REL-002**: Backup database harian.
- **NFR-REL-003**: Log error harus tercatat (file atau centralized logging).

## 6. Maintainability
- **NFR-MNT-001**: Kode harus konsisten (naming convention, struktur folder).
- **NFR-MNT-002**: Setiap modul master data mengikuti pola yang sama (CRUD + soft delete + history).
- **NFR-MNT-003**: Dokumentasi SOT selalu update-to-date.

## 7. Compatibility
- **NFR-COM-001**: Browser: Chrome 100+, Edge 100+, Firefox 100+, Safari 15+.
- **NFR-COM-002**: Tidak ada IE11 support.
- **NFR-COM-003**: Responsive: desktop primary, tablet secondary, mobile best-effort.

## 8. Accessibility
- **NFR-A11Y-001**: WCAG 2.1 Level AA (target).
- **NFR-A11Y-002**: Keyboard navigation harus lengkap.
- **NFR-A11Y-003**: Color contrast minimum 4.5:1.

## 9. Internationalization (i18n)
- **NFR-I18N-001**: Bahasa Indonesia (primary) + English (secondary).
- **NFR-I18N-002**: Format tanggal: dd MMM yyyy (id-ID).
- **NFR-I18N-003**: Format angka: 1.234,56 (id-ID) dengan fallback 1,234.56.
