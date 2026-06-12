# Accessibility & Internationalization (i18n)

> **Status**: `Draft` | **Pemilik**: Frontend Lead | **Terakhir Update**: 2026-06-12

## 1. Accessibility (WCAG 2.1 Level AA)

### Color Contrast
- Minimum 4.5:1 untuk text normal.
- Minimum 3:1 untuk large text (>= 18px).
- Warna bukan satu-satunya indicator status (pakai icon + text).

### Keyboard Navigation
- Semua interaktif element harus focusable.
- Tab order logical (top-to-bottom, left-to-right).
- Skip link untuk bypass nav (future).
- Focus visible state (outline) untuk semua interactive element.

### Screen Reader
- Setiap icon di-button punya `aria-label`.
- Loading indicator punya `role="alert"`.
- Modal dialog trap focus + auto-focus first interactive element.
- Live region untuk dynamic content change.

### Semantic HTML
- Gunakan `<nav>`, `<main>`, `<footer>`, `<aside>`. (future).
- Heading hierarchy: H1 (page title), H2 (section), H3 (subsection).
- Table punya `<caption>` atau `aria-label`.

## 2. Internationalization (i18n)

### Bahasa
- Primary: Bahasa Indonesia.
- Secondary: English (untuk technical term, API response).

### Format Tanggal
- Display: DD MMM YYYY HH:mm (id-ID locale).
- API: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ).
- Input: YYYY-MM-DD (HTML date input).

### Format Angka
- Thousands separator: titik (.)
- Decimal separator: koma (,)
- Contoh: 1.234.567,89

### Format Mata Uang
- IDR: Rp 1.234.567
- USD: $1,234.57

### Konvensi i18n (Future)
Siapkan dictionary object untuk semua string user-facing:

    const i18n = {
      save: "Simpan",
      cancel: "Batal",
      delete: "Hapus",
      restore: "Pulihkan",
      export: "Ekspor",
      loading: "Memuat data..."
    };

## 3. Checklist A11y
- [ ] Semua input punya label.
- [ ] Semua button punya aria-label jika icon-only.
- [ ] Color contrast >= 4.5:1.
- [ ] Keyboard navigasi lengkap.
- [ ] Focus state terlihat.
- [ ] Modal trap focus.
- [ ] Loading state announce ke screen reader.
- [ ] Error message accessible (aria-live).