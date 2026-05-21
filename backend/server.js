const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'gibsysnet',
  charset: 'utf8mb4'
};

const PORT = Number(process.env.API_PORT || 3001);

// Helper function to execute queries in a transaction
async function executeInTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Keep hyphenated and camel route styles compatible under Node API.
app.use((req, _res, next) => {
  if (typeof req.url === 'string') {
    req.url = req.url
      .replace(/^\/api\/riskvehicle(\/|\?|$)/i, '/api/risk-vehicle$1')
      .replace(/^\/api\/riskVehicle(\/|\?|$)/, '/api/risk-vehicle$1');
  }
  next();
});

const FIELD_OPTIONS = {
  brand: {
    selectCandidates: ['brand', 'merkName', 'merk_name'],
    required: []
  },
  model: {
    selectCandidates: ['model', 'modelName', 'model_name'],
    required: [
      { query: 'brand', candidates: ['brand', 'merkName', 'merk_name'] }
    ]
  },
  type: {
    selectCandidates: ['type', 'typeName', 'type_name', 'vehicleType', 'vehicle_type'],
    required: [
      { query: 'brand', candidates: ['brand', 'merkName', 'merk_name'] },
      { query: 'model', candidates: ['model', 'modelName', 'model_name'] }
    ]
  },
  series: {
    selectCandidates: ['series', 'seriesName', 'series_name'],
    required: [
      { query: 'brand', candidates: ['brand', 'merkName', 'merk_name'] },
      { query: 'model', candidates: ['model', 'modelName', 'model_name'] },
      { query: 'type', candidates: ['type', 'typeName', 'type_name', 'vehicleType', 'vehicle_type'] }
    ]
  },
  subSeries: {
    selectCandidates: ['sub_series', 'subSeries', 'subSeriesName', 'sub_series_name'],
    required: [
      { query: 'brand', candidates: ['brand', 'merkName', 'merk_name'] },
      { query: 'model', candidates: ['model', 'modelName', 'model_name'] },
      { query: 'type', candidates: ['type', 'typeName', 'type_name', 'vehicleType', 'vehicle_type'] },
      { query: 'series', candidates: ['series', 'seriesName', 'series_name'] }
    ]
  }
};

let pool;
let cachedColumns;
let cachedRiskVehicleColumns;
let cachedQuotationColumns;
const cachedTableColumnMaps = new Map();

function normalizeColumn(columnName) {
  return String(columnName || '').toLowerCase();
}

async function getColumnSet() {
  if (cachedColumns) return cachedColumns;

  const [rows] = await pool.query('SHOW COLUMNS FROM `modelrisk`');
  const columns = new Map(rows.map((row) => [normalizeColumn(row.Field), row.Field]));
  cachedColumns = columns;
  return columns;
}

function getExistingColumns(candidates, columnMap) {
  const result = [];
  for (const candidate of candidates) {
    const realName = columnMap.get(normalizeColumn(candidate));
    if (realName && !result.includes(realName)) {
      result.push(realName);
    }
  }
  return result;
}

function getFirstExistingColumn(candidates, columnMap) {
  const [first] = getExistingColumns(candidates, columnMap);
  return first || null;
}

async function getRiskVehicleColumns() {
  if (cachedRiskVehicleColumns) return cachedRiskVehicleColumns;

  const [rows] = await pool.query('SHOW COLUMNS FROM `risk_vehicle`');
  cachedRiskVehicleColumns = rows.map((row) => row.Field);
  return cachedRiskVehicleColumns;
}

async function getQuotationColumns() {
  if (cachedQuotationColumns) return cachedQuotationColumns;

  const [rows] = await pool.query('SHOW COLUMNS FROM `quotations`');
  cachedQuotationColumns = rows.map((row) => row.Field);
  return cachedQuotationColumns;
}

async function getTableColumnMap(tableName) {
  const cacheKey = String(tableName || '').trim();
  if (!cacheKey) return new Map();

  if (cachedTableColumnMaps.has(cacheKey)) {
    return cachedTableColumnMaps.get(cacheKey);
  }

  try {
    const safeTableName = cacheKey.replace(/`/g, '');
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${safeTableName}\``);
    const columnMap = new Map(rows.map((row) => [normalizeColumn(row.Field), row.Field]));
    cachedTableColumnMaps.set(cacheKey, columnMap);
    return columnMap;
  } catch (error) {
    const emptyMap = new Map();
    cachedTableColumnMaps.set(cacheKey, emptyMap);
    return emptyMap;
  }
}

async function getTableColumns(tableName) {
  return Array.from((await getTableColumnMap(tableName)).values());
}

function normalizeInputFieldName(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function mapInputToTableData(input, columnSet) {
  const data = {};

  for (const [key, value] of Object.entries(input || {})) {
    const snake = normalizeInputFieldName(key);
    if (!columnSet.has(snake)) {
      continue;
    }

    if (Array.isArray(value) || (value && typeof value === 'object') || snake === 'objects' || snake === 'coverages') {
      data[snake] = JSON.stringify(value);
    } else {
      data[snake] = value;
    }
  }

  return data;
}

async function resolveRiskVehicleRegNo(connection, input, data) {
  const regNoEnabled = data && Object.prototype.hasOwnProperty.call(data, 'reg_no');
  const inputRegNo = String(input?.reg_no ?? input?.regNo ?? '').trim();
  const quotationId = String(input?.quotation_id ?? input?.quotationId ?? '').trim();
  let regNo = String(data?.reg_no ?? inputRegNo).trim();

  if (!regNo && quotationId) {
    const [rows] = await connection.query(
      'SELECT `reg_no` FROM `quotations` WHERE `quotation_id` = ? LIMIT 1',
      [quotationId]
    );
    if (rows[0] && rows[0].reg_no) {
      regNo = String(rows[0].reg_no).trim();
      if (regNo && regNoEnabled) {
        data.reg_no = regNo;
      }
    } else {
      throw new Error(`Quotation not found for quotation_id ${quotationId}`);
    }
  }

  if (regNo) {
    const [rows] = await connection.query(
      'SELECT `quotation_id` FROM `quotations` WHERE TRIM(`reg_no`) = TRIM(?) LIMIT 1',
      [regNo]
    );
    if (!rows.length) {
      throw new Error(`reg_no \"${regNo}\" tidak ditemukan di tabel quotations`);
    }
  }
}

function setFirstMatchingField(data, columnSet, candidates, value) {
  for (const candidate of candidates) {
    if (columnSet.has(candidate)) {
      data[candidate] = value;
      return candidate;
    }
  }

  return null;
}

function buildRelationData(input = {}, savedRow = {}, columnSet = new Set()) {
  const relationData = {};
  const vehicleId = Number(savedRow.id ?? savedRow.vehicle_id ?? input.id ?? input.vehicle_id);
  const quotationId = String(savedRow.quotation_id ?? input.quotation_id ?? input.quotationId ?? '').trim();
  const regNo = String(savedRow.reg_no ?? input.reg_no ?? input.regNo ?? '').trim();
  const riskNo = Number(savedRow.risk_no ?? input.risk_no ?? input.riskNo);

  if (Number.isFinite(vehicleId) && vehicleId > 0) {
    relationData.vehicle_id = vehicleId;
  }
  if (quotationId) {
    relationData.quotation_id = quotationId;
  }
  if (regNo) {
    relationData.reg_no = regNo;
  }
  if (Number.isFinite(riskNo) && riskNo > 0) {
    relationData.risk_no = riskNo;
  }

  const filtered = {};
  for (const [key, value] of Object.entries(relationData)) {
    if (columnSet.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

function buildWhereClause(criteria = {}) {
  const clauses = [];
  const values = [];

  for (const [field, value] of Object.entries(criteria)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    clauses.push(`\`${field}\` = ?`);
    values.push(value);
  }

  return { clauses, values };
}

function extractRelationSnapshot(row = {}) {
  const vehicleId = Number(row.id ?? row.vehicle_id);
  const quotationId = String(row.quotation_id ?? '').trim();
  const regNo = String(row.reg_no ?? '').trim();
  const riskNo = Number(row.risk_no ?? row.riskNo);

  return {
    vehicle_id: Number.isFinite(vehicleId) && vehicleId > 0 ? vehicleId : null,
    quotation_id: quotationId,
    reg_no: regNo,
    risk_no: Number.isFinite(riskNo) && riskNo > 0 ? riskNo : null
  };
}

function buildRiskVehicleRelationKeys(row = {}) {
  const snapshot = extractRelationSnapshot(row);
  const keys = [];
  if (snapshot.vehicle_id !== null) {
    keys.push(`vehicle_id:${snapshot.vehicle_id}`);
  }
  if (snapshot.reg_no) {
    if (snapshot.risk_no !== null) {
      keys.push(`reg_no:${snapshot.reg_no}::risk_no:${snapshot.risk_no}`);
    }
    keys.push(`reg_no:${snapshot.reg_no}`);
  }
  if (snapshot.quotation_id) {
    keys.push(`quotation_id:${snapshot.quotation_id}`);
  }

  return Array.from(new Set(keys));
}

function buildRiskVehicleRelationKey(row = {}) {
  const [firstKey] = buildRiskVehicleRelationKeys(row);
  return firstKey || '';
}

function mapObjectChildRow(row, relation = {}) {
  return {
    ...relation,
    id: row.object_id ?? null,
    vehicle_id: row.vehicle_id ?? relation.vehicle_id ?? null,
    object_no: Number(row.object_no ?? 0) || 0,
    group: row.object_group_code ?? '',
    description: row.object_description ?? '',
    value: Number(row.object_value ?? 0) || 0
  };
}

function mapCoverageChildRow(row, relation = {}) {
  return {
    ...relation,
    id: row.coverage_id ?? null,
    vehicle_id: row.vehicle_id ?? relation.vehicle_id ?? null,
    coverage_no: Number(row.coverage_no ?? 0) || 0,
    coverage: row.coverage_code ?? '',
    ratePerMil: Number(row.rate_percent ?? 0) || 0
  };
}

async function syncChildTable(connection, tableName, sourceRows, relationData, kind) {
  console.log(`[syncChildTable] Starting for ${tableName}, kind: ${kind}, sourceRows:`, sourceRows);
  const columnMap = await getTableColumnMap(tableName);
  const columnSet = new Set(columnMap.values());
  if (!columnSet.size) {
    console.log(`[syncChildTable] No columns for ${tableName}`);
    return { processed: 0, skipped: true };
  }

  const relationCriteria = buildRelationData(relationData, relationData, columnSet);
  console.log(`[syncChildTable] Relation criteria for ${tableName}:`, relationCriteria);
  const { clauses, values } = buildWhereClause(relationCriteria);
  if (!clauses.length) {
    console.log(`[syncChildTable] No clauses for ${tableName}`);
    return { processed: 0, skipped: true };
  }

  console.log(`[syncChildTable] Deleting from ${tableName} WHERE ${clauses.join(' AND ')} with values:`, values);
  await connection.query(`DELETE FROM \`${tableName.replace(/`/g, '')}\` WHERE ${clauses.join(' AND ')}`, values);

  const rows = Array.isArray(sourceRows) ? sourceRows : [];
  console.log(`[syncChildTable] Inserting ${rows.length} rows into ${tableName}`);
  let processed = 0;

  for (const [rowIndex, sourceRow] of rows.entries()) {
    if (!sourceRow || typeof sourceRow !== 'object' || Array.isArray(sourceRow)) {
      console.log(`[syncChildTable] Skipping invalid row at ${rowIndex}`);
      continue;
    }

    const data = {};
    const normalizedRelation = buildRelationData(relationData, relationData, columnSet);
    Object.assign(data, normalizedRelation);
    console.log(`[syncChildTable] Normalized relation:`, normalizedRelation);

    if (kind === 'object') {
      data.object_no = Number(sourceRow.object_no ?? sourceRow.objectNo ?? rowIndex + 1) || (rowIndex + 1);
      data.object_group_code = String(sourceRow.group ?? sourceRow.objectGroup ?? sourceRow.object_group_code ?? sourceRow.object_group ?? '').trim();
      data.object_description = String(sourceRow.description ?? sourceRow.objectDescription ?? sourceRow.object_desc ?? '').trim();
      data.object_value = Number(sourceRow.value ?? sourceRow.objectValue ?? sourceRow.object_value ?? 0) || 0;
      console.log(`[syncChildTable] Object data:`, data);
    } else if (kind === 'coverage') {
      data.coverage_no = Number(sourceRow.coverage_no ?? sourceRow.coverageNo ?? rowIndex + 1) || (rowIndex + 1);
      data.coverage_code = String(sourceRow.coverage ?? sourceRow.coverageCode ?? sourceRow.coverage_code ?? '').trim();
      data.rate_percent = Number(sourceRow.ratePerMil ?? sourceRow.rate_per_mil ?? sourceRow.ratePercent ?? sourceRow.rate ?? 0) || 0;
      console.log(`[syncChildTable] Coverage data:`, data);
    }

    const fields = Object.keys(data);
    if (!fields.length) {
      console.log(`[syncChildTable] No fields for row ${rowIndex}`);
      continue;
    }

    const placeholders = fields.map(() => '?').join(', ');
    const insertSql = `INSERT INTO \`${tableName.replace(/`/g, '')}\` (${fields.map((field) => `\`${field}\``).join(', ')}) VALUES (${placeholders})`;
    console.log(`[syncChildTable] Insert SQL: ${insertSql} with values:`, fields.map((field) => data[field]));
    await connection.query(insertSql, fields.map((field) => data[field]));
    processed += 1;
  }

  console.log(`[syncChildTable] Processed ${processed} rows for ${tableName}`);
  return { processed, skipped: false };
}

async function loadChildRows(tableName, relationData) {
  const columnMap = await getTableColumnMap(tableName);
  const columnSet = new Set(columnMap.values());
  if (!columnSet.size) {
    return [];
  }

  const relationCriteria = buildRelationData(relationData, relationData, columnSet);
  const { clauses, values } = buildWhereClause(relationCriteria);
  const sql = clauses.length
    ? `SELECT * FROM \`${tableName.replace(/`/g, '')}\` WHERE ${clauses.join(' AND ')} ORDER BY 1 ASC`
    : `SELECT * FROM \`${tableName.replace(/`/g, '')}\` ORDER BY 1 ASC`;
  const [rows] = await pool.query(sql, values);
  return rows;
}

async function removeRiskVehicleChildren(connection, relationData) {
  const coverageResult = await syncChildTable(connection, 'risk_vehicle_coverage', [], relationData, 'coverage');
  const objectResult = await syncChildTable(connection, 'risk_vehicle_object', [], relationData, 'object');
  return {
    coverage: coverageResult,
    object: objectResult
  };
}

function mapQuotationPayloadToColumns(input, columnSet) {
  const data = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;

    const snake = String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();

    let targetKey = snake;
    if (snake === 'id') targetKey = 'quotation_id';
    if (snake === 'status') targetKey = columnSet.has('quotation_status') ? 'quotation_status' : snake;
    if (snake === 'accept') targetKey = columnSet.has('accept_status') ? 'accept_status' : snake;

    if (!columnSet.has(targetKey)) {
      continue;
    }

    data[targetKey] = value;
  }

  return data;
}

function buildLookupQuery(field, queryParams, columnMap) {
  const config = FIELD_OPTIONS[field];
  if (!config) {
    return { error: 'Invalid field parameter' };
  }

  const valueColumns = getExistingColumns(config.selectCandidates, columnMap);
  if (!valueColumns.length) {
    return { error: `No matching column for field ${field}` };
  }

  const requirementClauses = [];
  const requirementValues = [];

  for (const requirement of config.required) {
    const raw = String(queryParams[requirement.query] || '').trim();
    if (!raw) {
      return { error: `${requirement.query} parameter is required` };
    }

    const filterColumns = getExistingColumns(requirement.candidates, columnMap);
    if (!filterColumns.length) {
      return { error: `No matching column for filter ${requirement.query}` };
    }

    const filterOrParts = filterColumns.map((col) => `TRIM(\`${col}\`) = ?`);
    requirementClauses.push(`(${filterOrParts.join(' OR ')})`);
    filterColumns.forEach(() => requirementValues.push(raw));
  }

  const commonWhere = requirementClauses.length ? ` AND ${requirementClauses.join(' AND ')}` : '';
  const selectParts = [];
  const values = [];

  valueColumns.forEach((col) => {
    selectParts.push(`SELECT TRIM(\`${col}\`) AS value FROM \`modelrisk\` WHERE \`${col}\` IS NOT NULL AND TRIM(\`${col}\`) <> ''${commonWhere}`);
    values.push(...requirementValues);
  });

  const sql = `
    SELECT DISTINCT value
    FROM (
      ${selectParts.join('\nUNION ALL\n')}
    ) AS source
    ORDER BY value ASC
  `;

  return { sql, values };
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gibsynet-node-api' });
});

app.get('/api/modelrisk/lookup', async (req, res) => {
  try {
    const field = String(req.query.field || '').trim();
    const columnSet = await getColumnSet();
    const query = buildLookupQuery(field, req.query, columnSet);

    if (query.error) {
      return res.status(400).json({ error: query.error });
    }

    const [rows] = await pool.query(query.sql, query.values);
    const payload = rows
      .map((row) => String(row.value || '').trim())
      .filter((value) => value.length > 0)
      .map((value) => ({ code: value, name: value }));

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      error: 'Lookup failed',
      message: error.message
    });
  }
});

async function getModelRiskColumns() {
  return getColumnSet();
}

async function generateNextModelId() {
  const [rows] = await pool.query(`
    SELECT model_id
    FROM \`modelrisk\`
    WHERE model_id REGEXP '^MDL[0-9]+$'
    ORDER BY CAST(SUBSTRING(model_id, 4) AS UNSIGNED) DESC
    LIMIT 1
  `);

  const latest = rows[0]?.model_id || 'MDL00000';
  const currentNumber = Number(String(latest).replace(/^MDL/, '')) || 0;
  const nextNumber = currentNumber + 1;
  return `MDL${String(nextNumber).padStart(5, '0')}`;
}

function mapModelRiskRow(row, columns) {
  const modelIdCol = getFirstExistingColumn(['model_id', 'modelId'], columns) || 'model_id';
  const brandCol = getFirstExistingColumn(['brand', 'merkName', 'merk_name'], columns) || 'brand';
  const modelCol = getFirstExistingColumn(['model', 'modelName', 'model_name'], columns) || 'model';
  const typeCol = getFirstExistingColumn(['type', 'typeName', 'type_name'], columns) || 'type';
  const seriesCol = getFirstExistingColumn(['series', 'seriesName', 'series_name'], columns) || 'series';
  const subSeriesCol = getFirstExistingColumn(['sub_series', 'subSeries', 'subSeriesName'], columns) || 'sub_series';
  const descriptionCol = getFirstExistingColumn(['description'], columns) || 'description';
  const createdAtCol = getFirstExistingColumn(['created_at', 'createdAt'], columns) || 'created_at';
  const updatedAtCol = getFirstExistingColumn(['updated_at', 'updatedAt'], columns) || 'updated_at';

  return {
    model_id: row[modelIdCol] || '',
    brand: row[brandCol] || '',
    model: row[modelCol] || '',
    type: row[typeCol] || '',
    series: row[seriesCol] || '',
    sub_series: row[subSeriesCol] || '',
    description: row[descriptionCol] || '',
    created_at: row[createdAtCol] || null,
    updated_at: row[updatedAtCol] || null
  };
}

app.get('/api/modelrisk', async (_req, res) => {
  try {
    const columns = await getModelRiskColumns();
    const modelIdCol = getFirstExistingColumn(['model_id', 'modelId'], columns);
    const brandCol = getFirstExistingColumn(['brand', 'merkName', 'merk_name'], columns);
    const modelCol = getFirstExistingColumn(['model', 'modelName', 'model_name'], columns);
    const typeCol = getFirstExistingColumn(['type', 'typeName', 'type_name'], columns);
    const seriesCol = getFirstExistingColumn(['series', 'seriesName', 'series_name'], columns);
    const subSeriesCol = getFirstExistingColumn(['sub_series', 'subSeries', 'subSeriesName'], columns);
    const descriptionCol = getFirstExistingColumn(['description'], columns);
    const createdAtCol = getFirstExistingColumn(['created_at', 'createdAt'], columns);
    const updatedAtCol = getFirstExistingColumn(['updated_at', 'updatedAt'], columns);

    const selectColumns = [modelIdCol, brandCol, modelCol, typeCol, seriesCol, subSeriesCol, descriptionCol, createdAtCol, updatedAtCol]
      .filter(Boolean)
      .map((col) => `\`${col.replace(/`/g, '')}\``)
      .join(', ');

    if (!selectColumns) {
      return res.status(500).json({ error: 'No readable columns found in modelrisk' });
    }

    const orderBy = modelIdCol || createdAtCol || modelCol || brandCol;
    const [rows] = await pool.query(`SELECT ${selectColumns} FROM \`modelrisk\` ORDER BY \`${orderBy.replace(/`/g, '')}\` ASC`);

    return res.json({
      data: rows.map((row) => mapModelRiskRow(row, columns))
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to read modelrisk',
      message: error.message
    });
  }
});

app.post('/api/modelrisk', async (req, res) => {
  try {
    const columns = await getModelRiskColumns();
    const modelIdCol = getFirstExistingColumn(['model_id', 'modelId'], columns);
    const brandCol = getFirstExistingColumn(['brand', 'merkName', 'merk_name'], columns);
    const modelCol = getFirstExistingColumn(['model', 'modelName', 'model_name'], columns);
    const typeCol = getFirstExistingColumn(['type', 'typeName', 'type_name'], columns);
    const seriesCol = getFirstExistingColumn(['series', 'seriesName', 'series_name'], columns);
    const subSeriesCol = getFirstExistingColumn(['sub_series', 'subSeries', 'subSeriesName'], columns);
    const descriptionCol = getFirstExistingColumn(['description'], columns);

    const brand = String(req.body?.brand || '').trim();
    const model = String(req.body?.model || '').trim();
    const type = String(req.body?.type || '').trim();
    const series = String(req.body?.series || '').trim();
    const subSeries = String(req.body?.subSeries || req.body?.sub_series || '').trim();

    if (!brand || !model || !type) {
      return res.status(400).json({ error: 'Brand, model, and type are required' });
    }

    let modelId = String(req.body?.modelId || req.body?.model_id || '').trim();
    if (!modelId) {
      modelId = await generateNextModelId();
    }

    const description = String(req.body?.description || `${brand} ${model} ${series}`.trim()).trim();

    const fields = [];
    const placeholders = [];
    const values = [];

    if (modelIdCol) {
      fields.push(`\`${modelIdCol}\``);
      placeholders.push('?');
      values.push(modelId);
    }
    if (brandCol) {
      fields.push(`\`${brandCol}\``);
      placeholders.push('?');
      values.push(brand);
    }
    if (modelCol) {
      fields.push(`\`${modelCol}\``);
      placeholders.push('?');
      values.push(model);
    }
    if (typeCol) {
      fields.push(`\`${typeCol}\``);
      placeholders.push('?');
      values.push(type);
    }
    if (seriesCol) {
      fields.push(`\`${seriesCol}\``);
      placeholders.push('?');
      values.push(series);
    }
    if (subSeriesCol) {
      fields.push(`\`${subSeriesCol}\``);
      placeholders.push('?');
      values.push(subSeries);
    }
    if (descriptionCol) {
      fields.push(`\`${descriptionCol}\``);
      placeholders.push('?');
      values.push(description);
    }

    if (!fields.length) {
      return res.status(500).json({ error: 'No writable columns found in modelrisk' });
    }

    await pool.query(
      `INSERT INTO \`modelrisk\` (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );

    return res.status(201).json({ success: true, model_id: modelId });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to create modelrisk',
      message: error.message
    });
  }
});

app.put('/api/modelrisk/:modelId', async (req, res) => {
  try {
    const columns = await getModelRiskColumns();
    const modelIdCol = getFirstExistingColumn(['model_id', 'modelId'], columns);
    const brandCol = getFirstExistingColumn(['brand', 'merkName', 'merk_name'], columns);
    const modelCol = getFirstExistingColumn(['model', 'modelName', 'model_name'], columns);
    const typeCol = getFirstExistingColumn(['type', 'typeName', 'type_name'], columns);
    const seriesCol = getFirstExistingColumn(['series', 'seriesName', 'series_name'], columns);
    const subSeriesCol = getFirstExistingColumn(['sub_series', 'subSeries', 'subSeriesName'], columns);
    const descriptionCol = getFirstExistingColumn(['description'], columns);

    if (!modelIdCol) {
      return res.status(500).json({ error: 'model_id column not found in modelrisk' });
    }

    const targetModelId = String(req.params.modelId || '').trim();
    if (!targetModelId) {
      return res.status(400).json({ error: 'modelId parameter is required' });
    }

    const brand = String(req.body?.brand || '').trim();
    const model = String(req.body?.model || '').trim();
    const type = String(req.body?.type || '').trim();
    const series = String(req.body?.series || '').trim();
    const subSeries = String(req.body?.subSeries || req.body?.sub_series || '').trim();
    const description = String(req.body?.description || `${brand} ${model} ${series}`.trim()).trim();

    if (!brand || !model || !type) {
      return res.status(400).json({ error: 'Brand, model, and type are required' });
    }

    const updates = [];
    const values = [];

    if (brandCol) {
      updates.push(`\`${brandCol}\` = ?`);
      values.push(brand);
    }
    if (modelCol) {
      updates.push(`\`${modelCol}\` = ?`);
      values.push(model);
    }
    if (typeCol) {
      updates.push(`\`${typeCol}\` = ?`);
      values.push(type);
    }
    if (seriesCol) {
      updates.push(`\`${seriesCol}\` = ?`);
      values.push(series);
    }
    if (subSeriesCol) {
      updates.push(`\`${subSeriesCol}\` = ?`);
      values.push(subSeries);
    }
    if (descriptionCol) {
      updates.push(`\`${descriptionCol}\` = ?`);
      values.push(description);
    }

    if (!updates.length) {
      return res.status(500).json({ error: 'No writable columns found in modelrisk' });
    }

    values.push(targetModelId);

    const [result] = await pool.query(
      `UPDATE \`modelrisk\` SET ${updates.join(', ')} WHERE \`${modelIdCol.replace(/`/g, '')}\` = ?`,
      values
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Model risk data not found' });
    }

    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to update modelrisk',
      message: error.message
    });
  }
});

app.delete('/api/modelrisk/:modelId', async (req, res) => {
  try {
    const columns = await getModelRiskColumns();
    const modelIdCol = getFirstExistingColumn(['model_id', 'modelId'], columns);

    if (!modelIdCol) {
      return res.status(500).json({ error: 'model_id column not found in modelrisk' });
    }

    const targetModelId = String(req.params.modelId || '').trim();
    if (!targetModelId) {
      return res.status(400).json({ error: 'modelId parameter is required' });
    }

    const [result] = await pool.query(
      `DELETE FROM \`modelrisk\` WHERE \`${modelIdCol.replace(/`/g, '')}\` = ?`,
      [targetModelId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Model risk data not found' });
    }

    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to delete modelrisk',
      message: error.message
    });
  }
});

app.get('/api/quotations', async (_req, res) => {
  try {
    const columns = await getQuotationColumns();
    const orderColumn = columns.includes('quotation_id')
      ? 'quotation_id'
      : (columns.includes('created_at') ? 'created_at' : (columns[0] || null));

    let sql = 'SELECT * FROM `quotations`';
    if (orderColumn) {
      sql += ` ORDER BY \`${orderColumn.replace(/`/g, '')}\` ASC`;
    }

    const [rows] = await pool.query(sql);
    return res.json({ data: rows });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to read quotations',
      message: error.message
    });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    console.log('[API] POST /api/quotations - Request body:', JSON.stringify(req.body || {}).substring(0, 200));
    
    const columns = await getQuotationColumns();
    console.log('[API] Quotation columns available:', columns);
    
    const columnSet = new Set(columns);
    const input = req.body || {};
    const regNo = String(input.regNo || input.reg_no || '').trim();
    const incomingQuotationIdRaw = String(input.quotation_id ?? input.quotationId ?? input.id ?? '').trim();
    const incomingQuotationId = Number(incomingQuotationIdRaw);

    if (!regNo) {
      return res.status(400).json({ error: 'regNo is required' });
    }

    console.log('[API] Processing quotation regNo:', regNo);

    const data = mapQuotationPayloadToColumns(input, columnSet);
    console.log('[API] Mapped data fields:', Object.keys(data));
    
    if (columnSet.has('reg_no')) data.reg_no = regNo;
    if (columnSet.has('quotation_status') && !data.quotation_status) {
      data.quotation_status = String(input.status || input.quotation_status || 'Open').trim() || 'Open';
    }
    if (columnSet.has('status_record') && !data.status_record) {
      data.status_record = String(input.statusRecord || input.status_record || 'active').trim() || 'active';
    }
    if (columnSet.has('is_deleted') && data.is_deleted === undefined) {
      data.is_deleted = 0;
    }

    const upsertFields = Object.keys(data).filter((field) => field !== 'quotation_id');
    console.log('[API] Upsert fields:', upsertFields);
    
    if (!upsertFields.length) {
      return res.status(400).json({ error: 'No valid quotation fields provided' });
    }

    // Primary update path for edit mode: when quotation_id is provided, always update by PK.
    if (columnSet.has('quotation_id') && Number.isFinite(incomingQuotationId) && incomingQuotationId > 0) {
      const [existingByIdRows] = await pool.query(
        'SELECT `quotation_id`, `reg_no` FROM `quotations` WHERE `quotation_id` = ? LIMIT 1',
        [incomingQuotationId]
      );

      const existingById = existingByIdRows[0] || null;
      if (existingById) {
        console.log('[API] Found existing quotation by quotation_id:', incomingQuotationId);

        const updateFields = upsertFields.filter((field) => field !== 'quotation_id');
        if (updateFields.length) {
          const setClause = updateFields.map((field) => `\`${field}\` = ?`).join(', ');
          const values = updateFields.map((field) => data[field]);
          values.push(incomingQuotationId);
          await pool.query(`UPDATE \`quotations\` SET ${setClause} WHERE \`quotation_id\` = ?`, values);
        }

        return res.json({
          success: true,
          action: 'updated',
          quotation_id: incomingQuotationId,
          reg_no: String(data.reg_no ?? existingById.reg_no ?? regNo).trim()
        });
      }
    }

    const [existingRows] = await pool.query(
      'SELECT `quotation_id`, `reg_no` FROM `quotations` WHERE `reg_no` = ? LIMIT 1',
      [regNo]
    );

    const existing = existingRows[0] || null;
    if (existing) {
      console.log('[API] Found existing quotation:', existing.quotation_id);
      
      const updateFields = upsertFields.filter((field) => field !== 'reg_no');
      if (updateFields.length) {
        const setClause = updateFields.map((field) => `\`${field}\` = ?`).join(', ');
        const values = updateFields.map((field) => data[field]);
        values.push(regNo);
        await pool.query(`UPDATE \`quotations\` SET ${setClause} WHERE \`reg_no\` = ?`, values);
      }

      return res.json({
        success: true,
        action: 'updated',
        quotation_id: existing.quotation_id,
        reg_no: regNo
      });
    }

    console.log('[API] Creating new quotation with fields:', upsertFields);
    
    // Exclude quotation_id from INSERT (it's AUTO_INCREMENT)
    const insertFields = upsertFields.filter((field) => field !== 'quotation_id');
    const placeholders = insertFields.map(() => '?').join(', ');
    const values = insertFields.map((field) => data[field]);

    if (!insertFields.length) {
      return res.status(400).json({ error: 'No valid fields to insert' });
    }

    await pool.query(
      `INSERT INTO \`quotations\` (${insertFields.map((field) => `\`${field}\``).join(', ')}) VALUES (${placeholders})`,
      values
    );

    const [createdRows] = await pool.query(
      'SELECT `quotation_id`, `reg_no` FROM `quotations` WHERE `reg_no` = ? LIMIT 1',
      [regNo]
    );

    console.log('[API] Created quotation:', createdRows[0]);
    
    return res.status(201).json({
      success: true,
      action: 'created',
      quotation_id: createdRows[0]?.quotation_id || null,
      reg_no: regNo
    });
  } catch (error) {
    console.error('[API] POST /api/quotations ERROR:', error.message);
    console.error('[API] Full error:', error);
    return res.status(500).json({
      error: 'Unable to write quotations',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.put('/api/quotations/update/:quotation_id', async (req, res) => {
  try {
    const quotationId = String(req.params?.quotation_id || req.body?.quotation_id || req.body?.quotationId || req.body?.id || '').trim();
    if (!quotationId) {
      return res.status(400).json({ error: 'quotation_id is required' });
    }

    const columns = await getQuotationColumns();
    console.log('[API] Quotation columns available for update:', columns);

    const columnSet = new Set(columns);
    const input = req.body || {};
    const regNo = String(input.regNo || input.reg_no || '').trim();

    const data = mapQuotationPayloadToColumns(input, columnSet);
    if (columnSet.has('quotation_id')) {
      data.quotation_id = Number.isFinite(Number(quotationId)) ? Number(quotationId) : quotationId;
    }
    if (columnSet.has('reg_no') && regNo) {
      data.reg_no = regNo;
    }
    if (columnSet.has('quotation_status') && !data.quotation_status) {
      data.quotation_status = String(input.status || input.quotation_status || 'Open').trim() || 'Open';
    }
    if (columnSet.has('status_record') && !data.status_record) {
      data.status_record = String(input.statusRecord || input.status_record || 'active').trim() || 'active';
    }
    if (columnSet.has('is_deleted') && data.is_deleted === undefined) {
      data.is_deleted = 0;
    }

    const updateFields = Object.keys(data).filter((field) => field !== 'quotation_id');
    if (!updateFields.length) {
      return res.status(400).json({ error: 'No valid quotation fields provided' });
    }

    const [existingRows] = await pool.query(
      'SELECT `quotation_id`, `reg_no` FROM `quotations` WHERE `quotation_id` = ? LIMIT 1',
      [quotationId]
    );

    const existing = existingRows[0] || null;
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const setClause = updateFields.map((field) => `\`${field}\` = ?`).join(', ');
    const values = updateFields.map((field) => data[field]);
    values.push(quotationId);

    await pool.query(`UPDATE \`quotations\` SET ${setClause} WHERE \`quotation_id\` = ?`, values);

    return res.json({
      success: true,
      action: 'updated',
      quotation_id: Number.isFinite(Number(quotationId)) ? Number(quotationId) : quotationId,
      reg_no: String(data.reg_no ?? existing.reg_no ?? regNo).trim()
    });
  } catch (error) {
    console.error('[API] PUT /api/quotations/:quotation_id ERROR:', error.message);
    console.error('[API] Full error:', error);
    return res.status(500).json({
      error: 'Unable to update quotations',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/risk-vehicle', async (req, res) => {
  try {
    const columns = await getRiskVehicleColumns();
    const columnSet = new Set(columns);
    const orderColumn = columnSet.has('id')
      ? 'id'
      : (columnSet.has('created_at') ? 'created_at' : (columns[0] || null));
    const regNoFilter = String(req.query?.regNo || req.query?.reg_no || '').trim();

    let sql = 'SELECT * FROM `risk_vehicle`';
    const values = [];
    if (regNoFilter && columnSet.has('reg_no')) {
      sql += ' WHERE `reg_no` = ?';
      values.push(regNoFilter);
    }
    if (orderColumn) {
      sql += ` ORDER BY \`${orderColumn.replace(/`/g, '')}\` ASC`;
    }

    const [rows] = await pool.query(sql, values);
    const coverageRows = await loadChildRows('risk_vehicle_coverage', regNoFilter ? { quotation_id: regNoFilter } : {}).catch(() => []);
    const objectRows = await loadChildRows('risk_vehicle_object', regNoFilter ? { quotation_id: regNoFilter } : {}).catch(() => []);

    const coverageByKey = new Map();
    coverageRows.forEach((row) => {
      const keys = buildRiskVehicleRelationKeys(row);
      keys.forEach((key) => {
        if (!coverageByKey.has(key)) coverageByKey.set(key, []);
        coverageByKey.get(key).push(row);
      });
    });

    const objectByKey = new Map();
    objectRows.forEach((row) => {
      const keys = buildRiskVehicleRelationKeys(row);
      keys.forEach((key) => {
        if (!objectByKey.has(key)) objectByKey.set(key, []);
        objectByKey.get(key).push(row);
      });
    });

    const data = rows.map((row) => {
      const relation = extractRelationSnapshot(row);
      const keys = buildRiskVehicleRelationKeys(row);
      const parentObjects = keys.flatMap((key) => objectByKey.get(key) || []);
      const parentCoverages = keys.flatMap((key) => coverageByKey.get(key) || []);

      const mappedObjects = parentObjects.length
        ? parentObjects.map((child) => mapObjectChildRow(child, relation))
        : safeParseJson(row.objects ?? row.object_list ?? row.object_data ?? '');

      const mappedCoverages = parentCoverages.length
        ? parentCoverages.map((child) => mapCoverageChildRow(child, relation))
        : safeParseJson(row.coverages ?? row.coverage_list ?? row.coverage_data ?? '');

      return {
        ...row,
        objects: Array.isArray(mappedObjects) ? mappedObjects : [],
        coverages: Array.isArray(mappedCoverages) ? mappedCoverages : []
      };
    });

    return res.json({ data });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to read risk_vehicle',
      message: error.message
    });
  }
});

app.post('/api/risk-vehicle', async (req, res) => {
  try {
    const payload = req.body;
    const rows = Array.isArray(payload?.data)
      ? payload.data
      : (Array.isArray(payload) ? payload : []);

    if (!rows.length) {
      return res.status(400).json({ error: 'No risk data provided' });
    }

    const columns = await getRiskVehicleColumns();
    const columnSet = new Set(columns);
    const primaryKey = columnSet.has('id') ? 'id' : (columnSet.has('vehicle_id') ? 'vehicle_id' : null);
    const hasRegRiskUniqueColumns = columnSet.has('reg_no') && columnSet.has('risk_no');

    const result = await executeInTransaction(async (connection) => {
      let processed = 0;
      const errors = [];
      const results = [];

      for (let index = 0; index < rows.length; index += 1) {
        const input = rows[index];
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          errors.push(`Invalid row at index ${index}`);
          continue;
        }

        const data = mapInputToTableData(input, columnSet);
        if (!Object.keys(data).length) {
          errors.push(`No valid fields for row ${index}`);
          continue;
        }

        try {
          if (columnSet.has('reg_no')) {
            await resolveRiskVehicleRegNo(connection, input, data);
          }

          let incomingPk = null;
          if (primaryKey) {
            if (Number.isFinite(Number(input[primaryKey]))) {
              incomingPk = Number(input[primaryKey]);
            } else if (primaryKey === 'id' && Number.isFinite(Number(input.vehicle_id))) {
              incomingPk = Number(input.vehicle_id);
            } else if (primaryKey === 'vehicle_id' && Number.isFinite(Number(input.id))) {
              incomingPk = Number(input.id);
            }

            if (incomingPk === null && hasRegRiskUniqueColumns) {
              const regNo = String(data.reg_no ?? '').trim();
              const riskNo = Number(data.risk_no);
              if (regNo && Number.isFinite(riskNo)) {
                const [existingByUnique] = await connection.query(
                  `SELECT \`${primaryKey}\` AS pk FROM \`risk_vehicle\` WHERE \`reg_no\` = ? AND \`risk_no\` = ? LIMIT 1`,
                  [regNo, riskNo]
                );
                if (existingByUnique[0] && Number.isFinite(Number(existingByUnique[0].pk))) {
                  incomingPk = Number(existingByUnique[0].pk);
                }
              }
            }
          }

          if (primaryKey && incomingPk !== null) {
            const updatable = Object.keys(data).filter((field) => field !== primaryKey);
            if (updatable.length) {
              const setClause = updatable.map((field) => `\`${field}\` = ?`).join(', ');
              const values = updatable.map((field) => data[field]);
              values.push(incomingPk);

              const sql = `UPDATE \`risk_vehicle\` SET ${setClause} WHERE \`${primaryKey}\` = ?`;
              const [updateResult] = await connection.query(sql, values);

              if (updateResult && Number(updateResult.affectedRows) > 0) {
                const savedRow = {
                  id: incomingPk,
                  vehicle_id: incomingPk,
                  reg_no: String(data.reg_no ?? input.reg_no ?? input.regNo ?? '').trim(),
                  quotation_id: String(data.quotation_id ?? input.quotation_id ?? input.quotationId ?? '').trim(),
                  risk_no: Number(data.risk_no ?? input.risk_no ?? input.riskNo)
                };
                const relationPayload = { ...input, ...data, ...savedRow };

                if (Array.isArray(input.coverages)) {
                  await syncChildTable(connection, 'risk_vehicle_coverage', input.coverages, relationPayload, 'coverage');
                }
                if (Array.isArray(input.objects)) {
                  await syncChildTable(connection, 'risk_vehicle_object', input.objects, relationPayload, 'object');
                }

                results.push({
                  index,
                  vehicle_id: incomingPk,
                  reg_no: savedRow.reg_no,
                  risk_no: Number.isFinite(savedRow.risk_no) ? savedRow.risk_no : null
                });
                processed += 1;
                continue;
              }

              const [existingRows] = await connection.query(
                `SELECT 1 FROM \`risk_vehicle\` WHERE \`${primaryKey}\` = ? LIMIT 1`,
                [incomingPk]
              );
              if (existingRows.length) {
                const savedRow = {
                  id: incomingPk,
                  vehicle_id: incomingPk,
                  reg_no: String(data.reg_no ?? input.reg_no ?? input.regNo ?? '').trim(),
                  quotation_id: String(data.quotation_id ?? input.quotation_id ?? input.quotationId ?? '').trim(),
                  risk_no: Number(data.risk_no ?? input.risk_no ?? input.riskNo)
                };
                const relationPayload = { ...input, ...data, ...savedRow };

                if (Array.isArray(input.coverages)) {
                  await syncChildTable(connection, 'risk_vehicle_coverage', input.coverages, relationPayload, 'coverage');
                }
                if (Array.isArray(input.objects)) {
                  await syncChildTable(connection, 'risk_vehicle_object', input.objects, relationPayload, 'object');
                }

                results.push({
                  index,
                  vehicle_id: incomingPk,
                  reg_no: savedRow.reg_no,
                  risk_no: Number.isFinite(savedRow.risk_no) ? savedRow.risk_no : null
                });
                processed += 1;
                continue;
              }
            } else {
              const [existingRows] = await connection.query(
                `SELECT 1 FROM \`risk_vehicle\` WHERE \`${primaryKey}\` = ? LIMIT 1`,
                [incomingPk]
              );
              if (existingRows.length) {
                const savedRow = {
                  id: incomingPk,
                  vehicle_id: incomingPk,
                  reg_no: String(data.reg_no ?? input.reg_no ?? input.regNo ?? '').trim(),
                  quotation_id: String(data.quotation_id ?? input.quotation_id ?? input.quotationId ?? '').trim(),
                  risk_no: Number(data.risk_no ?? input.risk_no ?? input.riskNo)
                };
                const relationPayload = { ...input, ...data, ...savedRow };

                if (Array.isArray(input.coverages)) {
                  await syncChildTable(connection, 'risk_vehicle_coverage', input.coverages, relationPayload, 'coverage');
                }
                if (Array.isArray(input.objects)) {
                  await syncChildTable(connection, 'risk_vehicle_object', input.objects, relationPayload, 'object');
                }

                results.push({
                  index,
                  vehicle_id: incomingPk,
                  reg_no: savedRow.reg_no,
                  risk_no: Number.isFinite(savedRow.risk_no) ? savedRow.risk_no : null
                });
                processed += 1;
                continue;
              }
            }
          }

          const fields = Object.keys(data);
          const placeholders = fields.map(() => '?').join(', ');
          const values = fields.map((field) => data[field]);
          const sql = `INSERT INTO \`risk_vehicle\` (${fields.map((f) => `\`${f}\``).join(', ')}) VALUES (${placeholders})`;
          const [insertResult] = await connection.query(sql, values);
          let insertedId = Number(insertResult.insertId || input.vehicle_id || input.id || 0) || null;
          if (!insertedId && hasRegRiskUniqueColumns) {
            const regNo = String(data.reg_no ?? '').trim();
            const riskNo = Number(data.risk_no);
            if (regNo && Number.isFinite(riskNo)) {
              const [resolvedRows] = await connection.query(
                `SELECT \`${primaryKey}\` AS pk FROM \`risk_vehicle\` WHERE \`reg_no\` = ? AND \`risk_no\` = ? LIMIT 1`,
                [regNo, riskNo]
              );
              if (resolvedRows[0] && Number.isFinite(Number(resolvedRows[0].pk))) {
                insertedId = Number(resolvedRows[0].pk);
              }
            }
          }

          const savedRow = {
            id: insertedId,
            vehicle_id: insertedId,
            reg_no: String(data.reg_no ?? input.reg_no ?? input.regNo ?? '').trim(),
            quotation_id: String(data.quotation_id ?? input.quotation_id ?? input.quotationId ?? '').trim(),
            risk_no: Number(data.risk_no ?? input.risk_no ?? input.riskNo)
          };
          const relationPayload = { ...input, ...data, ...savedRow };

          if (Array.isArray(input.coverages)) {
            await syncChildTable(connection, 'risk_vehicle_coverage', input.coverages, relationPayload, 'coverage');
          }
          if (Array.isArray(input.objects)) {
            await syncChildTable(connection, 'risk_vehicle_object', input.objects, relationPayload, 'object');
          }

          results.push({
            index,
            vehicle_id: insertedId,
            reg_no: savedRow.reg_no,
            risk_no: Number.isFinite(savedRow.risk_no) ? savedRow.risk_no : null
          });
          processed += 1;
        } catch (error) {
          errors.push(`Row ${index}: ${error.message}`);
        }
      }

      return { processed, errors, results };
    });

    return res.json({ success: true, processed: result.processed, errors: result.errors, rows: result.results });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to write risk_vehicle',
      message: error.message
    });
  }
});

app.delete('/api/risk-vehicle', async (req, res) => {
  try {
    const payload = req.body;
    const rows = Array.isArray(payload?.data)
      ? payload.data
      : (Array.isArray(payload) ? payload : [payload]);

    if (!rows.length) {
      return res.status(400).json({ error: 'No risk data provided' });
    }

    const columns = await getRiskVehicleColumns();
    const columnSet = new Set(columns);
    const primaryKey = columnSet.has('id') ? 'id' : (columnSet.has('vehicle_id') ? 'vehicle_id' : null);
    const hasRegRiskUniqueColumns = columnSet.has('reg_no') && columnSet.has('risk_no');

    const result = await executeInTransaction(async (connection) => {
      let processed = 0;
      const errors = [];

      for (let index = 0; index < rows.length; index += 1) {
        const input = rows[index];
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          errors.push(`Invalid row at index ${index}`);
          continue;
        }

        const relationHint = extractRelationSnapshot(input);
        let incomingPk = null;
        if (primaryKey) {
          if (Number.isFinite(Number(input[primaryKey]))) {
            incomingPk = Number(input[primaryKey]);
          } else if (primaryKey === 'id' && Number.isFinite(Number(input.vehicle_id))) {
            incomingPk = Number(input.vehicle_id);
          } else if (primaryKey === 'vehicle_id' && Number.isFinite(Number(input.id))) {
            incomingPk = Number(input.id);
          }
        }

        if (incomingPk === null && hasRegRiskUniqueColumns && relationHint.reg_no && Number.isFinite(relationHint.risk_no)) {
          const [existingByUnique] = await connection.query(
            'SELECT `id`, `vehicle_id` FROM `risk_vehicle` WHERE `reg_no` = ? AND `risk_no` = ? LIMIT 1',
            [relationHint.reg_no, relationHint.risk_no]
          );
          if (existingByUnique[0]) {
            incomingPk = Number(existingByUnique[0].id ?? existingByUnique[0].vehicle_id ?? 0) || null;
          }
        }

        const deleteCriteria = {};
        if (primaryKey && incomingPk !== null) {
          deleteCriteria[primaryKey] = incomingPk;
        } else {
          if (columnSet.has('reg_no') && relationHint.reg_no) {
            deleteCriteria.reg_no = relationHint.reg_no;
          }
          if (columnSet.has('risk_no') && Number.isFinite(relationHint.risk_no)) {
            deleteCriteria.risk_no = relationHint.risk_no;
          }
          if (columnSet.has('quotation_id') && relationHint.quotation_id) {
            deleteCriteria.quotation_id = relationHint.quotation_id;
          }
        }

        const { clauses, values } = buildWhereClause(deleteCriteria);
        if (!clauses.length) {
          errors.push(`No matching identifiers for row ${index}`);
          continue;
        }

        try {
          const relationPayload = {
            ...input,
            ...relationHint,
            [primaryKey || 'id']: incomingPk
          };

          await removeRiskVehicleChildren(connection, relationPayload);
          await connection.query(`DELETE FROM \`risk_vehicle\` WHERE ${clauses.join(' AND ')}`, values);
          processed += 1;
        } catch (error) {
          errors.push(`Row ${index}: ${error.message}`);
        }
      }

      return { processed, errors };
    });

    return res.json({ success: true, processed: result.processed, errors: result.errors });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to delete risk_vehicle',
      message: error.message
    });
  }
});

// ==================== PARTNERS API ====================
app.get('/api/partners', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `partners` ORDER BY `category` ASC, `name` ASC');
    return res.json({ data: rows });
  } catch (error) {
    console.error('[API] GET /api/partners ERROR:', error.message);
    return res.status(500).json({ error: 'Unable to read partners', message: error.message });
  }
});

app.post('/api/partners', async (req, res) => {
  try {
    // TODO: Implement partner create/update logic
    res.status(201).json({ success: true, message: 'Partner saved' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save partner', message: error.message });
  }
});
app.delete('/api/partners', async (req, res) => {
  try {
    // TODO: Implement partner delete logic
    res.json({ success: true, message: 'Partner deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete partner', message: error.message });
  }
});

// ==================== COB PRODUCTS API ====================
app.get('/api/cob-products', async (_req, res) => {
  try {
    // TODO: Implement cob_products table schema and queries
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read cob products', message: error.message });
  }
});

app.post('/api/cob-products', async (req, res) => {
  try {
    // TODO: Implement cob product create/update logic
    res.status(201).json({ success: true, message: 'COB product saved' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save cob product', message: error.message });
  }
});

app.delete('/api/cob-products', async (req, res) => {
  try {
    // TODO: Implement cob product delete logic
    res.json({ success: true, message: 'COB product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete cob product', message: error.message });
  }
});

// ==================== COMMISSIONS API ====================
app.get('/api/commissions', async (_req, res) => {
  try {
    // TODO: Implement commissions table schema and queries
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read commissions', message: error.message });
  }
});

app.post('/api/commissions', async (req, res) => {
  try {
    // TODO: Implement commission create/update logic
    res.status(201).json({ success: true, message: 'Commission saved' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save commission', message: error.message });
  }
});

app.delete('/api/commissions', async (req, res) => {
  try {
    // TODO: Implement commission delete logic
    res.json({ success: true, message: 'Commission deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete commission', message: error.message });
  }
});

// ==================== OCCUPATIONS API ====================
app.get('/api/occupations', async (_req, res) => {
  try {
    // TODO: Implement occupations table schema and queries
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read occupations', message: error.message });
  }
});

app.post('/api/occupations', async (req, res) => {
  try {
    // TODO: Implement occupation create/update logic
    res.status(201).json({ success: true, message: 'Occupation saved' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save occupation', message: error.message });
  }
});

app.delete('/api/occupations', async (req, res) => {
  try {
    // TODO: Implement occupation delete logic
    res.json({ success: true, message: 'Occupation deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete occupation', message: error.message });
  }
});

// ==================== CLASSES API ====================
app.get('/api/classes', async (_req, res) => {
  try {
    // TODO: Implement classes table schema and queries
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read classes', message: error.message });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    // TODO: Implement class create/update logic
    res.status(201).json({ success: true, message: 'Class saved' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save class', message: error.message });
  }
});

app.delete('/api/classes', async (req, res) => {
  try {
    // TODO: Implement class delete logic
    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete class', message: error.message });
  }
});

// ==================== COMPANIES API ====================
app.get('/api/companies', async (_req, res) => {
  try {
    // TODO: Implement companies table schema and queries
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read companies', message: error.message });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    // TODO: Implement company create/update logic
    res.status(201).json({ success: true, message: 'Company saved' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save company', message: error.message });
  }
});

app.delete('/api/companies', async (req, res) => {
  try {
    // TODO: Implement company delete logic
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete company', message: error.message });
  }
});

// ==================== FULL QUOTATION BY REG_NO ====================
app.get('/api/full-quotation-by-regno', async (req, res) => {
  try {
    const regNo = String(req.query?.regNo || req.query?.reg_no || '').trim();
    if (!regNo) {
      return res.status(400).json({ error: 'regNo parameter is required' });
    }

    // Get quotation
    const [quotationRows] = await pool.query('SELECT * FROM `quotations` WHERE `reg_no` = ? LIMIT 1', [regNo]);
    if (!quotationRows.length) {
      return res.status(404).json({ error: 'Quotation not found for regNo', regNo });
    }
    const quotation = quotationRows[0];

    // Get risk vehicles
    const [riskVehicleRows] = await pool.query('SELECT * FROM `risk_vehicle` WHERE `reg_no` = ? ORDER BY `risk_no` ASC', [regNo]);

    // Get coverage and object rows
    const coverageRows = await loadChildRows('risk_vehicle_coverage', { quotation_id: quotation.quotation_id });
    const objectRows = await loadChildRows('risk_vehicle_object', { quotation_id: quotation.quotation_id });

    // Group coverages and objects by vehicle_id
    const coveragesByVehicle = new Map();
    coverageRows.forEach((row) => {
      const vehicleId = Number(row.vehicle_id);
      if (!coveragesByVehicle.has(vehicleId)) coveragesByVehicle.set(vehicleId, []);
      coveragesByVehicle.get(vehicleId).push(row);
    });

    const objectsByVehicle = new Map();
    objectRows.forEach((row) => {
      const vehicleId = Number(row.vehicle_id);
      if (!objectsByVehicle.has(vehicleId)) objectsByVehicle.set(vehicleId, []);
      objectsByVehicle.get(vehicleId).push(row);
    });

    // Attach coverages and objects to risk vehicles
    const riskVehicles = riskVehicleRows.map((vehicle) => {
      const vehicleId = Number(vehicle.vehicle_id ?? vehicle.id);
      return {
        ...vehicle,
        coverages: coveragesByVehicle.get(vehicleId) || [],
        objects: objectsByVehicle.get(vehicleId) || []
      };
    });

    return res.json({
      quotation,
      riskVehicles
    });
  } catch (error) {
    console.error('[API] GET /api/full-quotation-by-regno ERROR:', error.message);
    return res.status(500).json({
      error: 'Unable to fetch full quotation data',
      message: error.message
    });
  }
});

// ==================== NOT FOUND HANDLER ====================
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', message: 'The requested endpoint does not exist' });
});

async function start() {
  pool = mysql.createPool({
    ...DB_CONFIG,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Node API listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Node API:', error.message);
  process.exit(1);
});
