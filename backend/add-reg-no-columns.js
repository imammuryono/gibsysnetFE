const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'gibsysnet'
    });

    // Add reg_no column to risk_vehicle_coverage
    const alterCoverageSQL = `
      ALTER TABLE risk_vehicle_coverage
      ADD COLUMN reg_no VARCHAR(255) NULL DEFAULT ''
    `;

    // Add reg_no column to risk_vehicle_object
    const alterObjectSQL = `
      ALTER TABLE risk_vehicle_object
      ADD COLUMN reg_no VARCHAR(255) NULL DEFAULT ''
    `;

    console.log('Adding reg_no column to risk_vehicle_coverage...');
    await conn.execute(alterCoverageSQL);
    console.log('✓ Kolom reg_no berhasil ditambahkan ke tabel risk_vehicle_coverage');

    console.log('Adding reg_no column to risk_vehicle_object...');
    await conn.execute(alterObjectSQL);
    console.log('✓ Kolom reg_no berhasil ditambahkan ke tabel risk_vehicle_object');

    conn.end();
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Kolom reg_no sudah ada di tabel');
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
})();