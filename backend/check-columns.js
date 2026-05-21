const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'gibsysnet'
    });

    const [rows] = await conn.query('SHOW COLUMNS FROM quotations LIKE "reg_no"');
    console.log('reg_no column in quotations:', rows.length > 0 ? 'EXISTS' : 'NOT EXISTS');

    const [rows2] = await conn.query('SHOW COLUMNS FROM risk_vehicle_coverage LIKE "quotation_id"');
    console.log('quotation_id column in risk_vehicle_coverage:', rows2.length > 0 ? 'EXISTS' : 'NOT EXISTS');

    const [rows3] = await conn.query('SHOW COLUMNS FROM risk_vehicle_object LIKE "quotation_id"');
    console.log('quotation_id column in risk_vehicle_object:', rows3.length > 0 ? 'EXISTS' : 'NOT EXISTS');

    conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();