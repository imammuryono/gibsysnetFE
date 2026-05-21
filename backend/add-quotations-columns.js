const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'gibsysnet'
    });

    const alterSQL = `
      ALTER TABLE quotations 
      ADD COLUMN periode VARCHAR(100) NULL DEFAULT '',
      ADD COLUMN conversion_to VARCHAR(100) NULL DEFAULT '',
      ADD COLUMN co_insurance VARCHAR(50) NULL DEFAULT 'No',
      ADD COLUMN ins_company_single VARCHAR(255) NULL DEFAULT '',
      ADD COLUMN ins_premi DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_biaya_polis DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_materai DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_diskon_pct DECIMAL(10,2) NULL DEFAULT 0,
      ADD COLUMN ins_diskon DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_brokerage_pct DECIMAL(10,2) NULL DEFAULT 0,
      ADD COLUMN ins_brokerage DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_pph_pct DECIMAL(10,2) NULL DEFAULT 0,
      ADD COLUMN ins_pph DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_ppn_pct DECIMAL(10,2) NULL DEFAULT 0,
      ADD COLUMN ins_ppn_mode VARCHAR(50) NULL DEFAULT '',
      ADD COLUMN ins_ppn DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_total_payable DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN ins_premi_net DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN installments JSON NULL,
      ADD COLUMN coinsurances JSON NULL
    `;

    await conn.execute(alterSQL);
    console.log('✓ Kolom-kolom berhasil ditambahkan ke tabel quotations');
    conn.end();
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Kolom sudah ada di tabel quotations');
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
})();
