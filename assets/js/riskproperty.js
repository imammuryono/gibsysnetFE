// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Contoh interaksi: konfirmasi hapus
    const deleteBtn = document.querySelector('.btn-danger');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                alert('Data berhasil dihapus (simulasi)');
                // di sini bisa ditambahkan logika hapus via API
            }
        });
    }

    // Contoh: tombol simpan
    const saveBtn = document.querySelector('.btn-secondary');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            alert('Data disimpan (simulasi)');
        });
    }

    console.log('Risk property page loaded.');
});