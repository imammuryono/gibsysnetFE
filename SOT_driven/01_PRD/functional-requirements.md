# Functional Requirements

> **Status**: Draft | **Pemilik**: System Analyst | **Terakhir Update**: 2026-06-12

## Modul 1: COB Management
- **FR-COB-001**: User dapat melihat daftar COB dengan filter (Type, COB, Sub-COB, status).
- **FR-COB-002**: User dapat menambah COB baru dengan field: Type, COB Code, Sub-COB, Description, Status.
- **FR-COB-003**: User dapat mengedit COB existing (semua field).
- **FR-COB-004**: User dapat menghapus COB (soft delete).
- **FR-COB-005**: User dapat restore COB yang di-soft-delete.
- **FR-COB-006**: User dapat export daftar COB ke CSV.
- **FR-COB-007**: Product ID di-generate otomatis dengan format {TYPE}-{SUBCOB}-{SEQ}.

## Modul 2: Sub COB Management
- **FR-SUBCOB-001**: User dapat melihat daftar Sub-COB per COB.
- **FR-SUBCOB-002**: User dapat menambah Sub-COB baru.
- **FR-SUBCOB-003**: User dapat mengedit/hapus Sub-COB.
- **FR-SUBCOB-004**: Sub-COB terhubung ke COB (relasi parent-child).

## Modul 3: Currency
- **FR-CUR-001**: User dapat mengelola daftar mata uang (code, name, symbol, rate).
- **FR-CUR-002**: User dapat men-set base currency.
- **FR-CUR-003**: User dapat men-set tanggal kurs aktif.

## Modul 4: Partners
- **FR-PTN-001**: User dapat mengelola data mitra (broker, agen, loss adjuster).
- **FR-PTN-002**: Field: name, type, address, phone, email, PIC, status.

## Modul 5: Company Profile
- **FR-CMP-001**: User dapat mengelola data perusahaan asuransi.
- **FR-CMP-002**: Field: nama, alamat, NPWP, izin usaha, logo, dll.

## Modul 6: Class Construction
- **FR-CLS-001**: User dapat mengelola class code (format CLS###).
- **FR-CLS-002**: Field: class_code, class_category, class_name, class_name_eng, status.
- **FR-CLS-003**: Soft delete + restore.
- **FR-CLS-004**: History log (audit trail) untuk semua perubahan.

## Modul 7: Model Risk
- **FR-MR-VHC**: Vehicle risk model (vehicle details, coverage, premi).
- **FR-MR-VSL**: Vessel risk model.
- **FR-MR-PRP**: Property risk model.
- **FR-MR-ENG**: Engineering risk model.
- **FR-MR-NEW**: Model Risk Baru (template fleksibel).

## Modul 8: Coverages
- **FR-COV-001**: User dapat mengelola daftar coverage.
- **FR-COV-002**: Field: code, name, description, limit, deductible.

## Modul 9: Quotation
- **FR-QUO-001**: User dapat membuat quotation baru.
- **FR-QUO-002**: Quotation terhubung ke COB + Sub-COB + Currency.
- **FR-QUO-003**: User dapat menghitung premi otomatis.
- **FR-QUO-004**: User dapat export quotation ke PDF.

## Modul 10: Commission
- **FR-COM-001**: User dapat menghitung komisi agen/mitra.
- **FR-COM-002**: Field: agent, quotation, rate, amount, status.
- **FR-COM-003**: Commission calculator tersedia di halaman terpisah.

## Modul 11: Payment
- **FR-PAY-001**: User dapat tracking payment (DP, termin, pelunasan).
- **FR-PAY-002**: Invoice generator otomatis dari payment data.

## Modul 12: Dashboard
- **FR-DSH-ADM**: Admin dashboard (statistik master data, user activity).
- **FR-DSH-USR**: User dashboard (quotation, commission summary).
