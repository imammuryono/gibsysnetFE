# Forms & Validation

> **Status**: `Draft` | **Pemilik**: Frontend Lead | **Terakhir Update**: 2026-06-12

## 1. Pola Form Standar
Setiap form master data mengikuti:
- ID prefix konsisten: `#newBtnSidebar`, `#saveBtnSidebar`, `#deleteBtnSidebar`, `#exportBtnSidebar`.
- Form element: `<form id="classForm">` (atau sesuai modul).
- Submit handler pakai `e.preventDefault()`.
- Loading indicator muncul saat submit.
- Sukses -> show message + reload data + reset form.
- Error -> show message dengan error message dari API.

## 2. Client-Side Validation
### Required Fields
- `class_code`, `class_category`, `class_name` (Class Construction).
- `productId`, `type`, `cob`, `subCob` (COB).

### Pola
    if (!data.class_code || !data.class_category || !data.class_name) {
      return "Class Code, Class Category, and Class Name are required.";
    }

## 3. Real-Time Validation
Tambahkan visual feedback on blur:

    input.addEventListener("blur", () => {
      if (!input.value.trim()) {
        input.classList.add("input-error");
        showError(input, "Field ini wajib diisi");
      } else {
        input.classList.remove("input-error");
        input.classList.add("input-success");
      }
    });

## 4. Server-Side Validation (Wajib)
Backend harus validasi ulang untuk setiap request:
- Panjang string (VARCHAR limit).
- Enum (status: active/inactive).
- Foreign key existence (jika ada).
- Duplicate check (UNIQUE constraint).

## 5. Confirm Dialog untuk Aksi Destruktif
Pakai `#confirmModal` untuk:
- Delete (soft atau hard).
- Bulk delete.
- Reset form (jika ada perubahan belum di-save).
- Logout.

## 6. Format Input
| Field | Format | Contoh |
|---|---|---|
| Class Code | CLS### (3 digit) | CLS001 |
| Product ID | TYPE-SUBCOB-SEQ | MOT-C-001 |
| Currency Code | ISO 4217 (3 huruf besar) | IDR, USD |
| Phone | numeric, +, -, space | +62-21-1234567 |
| Email | valid email | admin@example.com |
| Date | YYYY-MM-DD (HTML) / DD MMM YYYY (display) | 2026-06-12 |
| Currency | 1.234,56 (id-ID) | Rp 1.234.567 |

## 7. Error Message Style
- Singkat dan actionable.
- Bahasa Indonesia untuk user-facing.
- English untuk developer-facing (console).

Contoh baik: "Class Code CLS001 sudah ada. Gunakan kode lain."
Contoh buruk: "Error 409."

## 8. Accessibility Form
- Setiap input punya `<label for>`.
- Error message di-link dengan `aria-describedby`.
- Required field di-tandai dengan `aria-required="true"`.
- Submit button disabled saat loading untuk avoid double-submit.