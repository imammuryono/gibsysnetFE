const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'gibsysnet'
    });

    // Rename reg_no column to quotation_id in risk_vehicle_coverage
    const alterCoverageSQL = `
      ALTER TABLE risk_vehicle_coverage
      CHANGE COLUMN reg_no quotation_id VARCHAR(255) NULL DEFAULT ''
    `;

    // Rename reg_no column to quotation_id in risk_vehicle_object
    const alterObjectSQL = `
      ALTER TABLE risk_vehicle_object
      CHANGE COLUMN reg_no quotation_id VARCHAR(255) NULL DEFAULT ''
    `;

    console.log('Renaming reg_no to quotation_id in risk_vehicle_coverage...');
    await conn.execute(alterCoverageSQL);
    console.log('✓ Kolom reg_no berhasil diubah menjadi quotation_id di tabel risk_vehicle_coverage');

    console.log('Renaming reg_no to quotation_id in risk_vehicle_object...');
    await conn.execute(alterObjectSQL);
    console.log('✓ Kolom reg_no berhasil diubah menjadi quotation_id di tabel risk_vehicle_object');

    conn.end();
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Kolom quotation_id sudah ada');
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
})();