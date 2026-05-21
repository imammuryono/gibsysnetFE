<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

function normalize_field(string $key): string {
    $snake = strtolower(preg_replace('/([a-z0-9])([A-Z])/', '$1_$2', $key));
    return str_replace(' ', '_', $snake);
}

if ($method === 'GET') {
    try {
        $columns = $pdo->query('SHOW COLUMNS FROM `risk_vehicle`')->fetchAll(PDO::FETCH_COLUMN);
        $orderColumn = in_array('id', $columns, true)
            ? 'id'
            : (in_array('created_at', $columns, true) ? 'created_at' : ($columns[0] ?? null));

        $sql = 'SELECT * FROM `risk_vehicle`';
        if ($orderColumn !== null) {
            $sql .= ' ORDER BY `' . str_replace('`', '', $orderColumn) . '` ASC';
        }

        $stmt = $pdo->query($sql);
        echo json_encode(['data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Unable to read risk_vehicle', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit;
    }

    $rows = [];
    if (isset($body['data']) && is_array($body['data'])) {
        $rows = $body['data'];
    } elseif (is_array($body)) {
        $rows = $body;
    }

    if (count($rows) === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'No risk data provided']);
        exit;
    }

    $columns = $pdo->query('SHOW COLUMNS FROM `risk_vehicle`')->fetchAll();
    $tableColumns = array_column($columns, 'Field');
    $primaryKey = null;
    if (in_array('id', $tableColumns, true)) {
        $primaryKey = 'id';
    } elseif (in_array('vehicle_id', $tableColumns, true)) {
        $primaryKey = 'vehicle_id';
    }
    $processed = 0;
    $errors = [];

    foreach ($rows as $index => $input) {
        if (!is_array($input)) {
            $errors[] = "Invalid row at index {$index}";
            continue;
        }

        $data = [];
        foreach ($input as $key => $value) {
            $dbKey = normalize_field($key);
            if (!in_array($dbKey, $tableColumns, true)) {
                continue;
            }
            if (is_array($value) || in_array($dbKey, ['objects', 'coverages'], true)) {
                $data[$dbKey] = json_encode($value, JSON_UNESCAPED_UNICODE);
            } else {
                $data[$dbKey] = $value;
            }
        }

        if (empty($data)) {
            $errors[] = "No valid fields for row {$index}";
            continue;
        }

        try {
            $incomingPk = null;
            if ($primaryKey !== null) {
                if (isset($input[$primaryKey]) && is_numeric($input[$primaryKey])) {
                    $incomingPk = (int) $input[$primaryKey];
                } elseif ($primaryKey === 'id' && isset($input['vehicle_id']) && is_numeric($input['vehicle_id'])) {
                    $incomingPk = (int) $input['vehicle_id'];
                } elseif ($primaryKey === 'vehicle_id' && isset($input['id']) && is_numeric($input['id'])) {
                    $incomingPk = (int) $input['id'];
                }
            }

            if ($primaryKey !== null && $incomingPk !== null) {
                $updateFields = [];
                foreach ($data as $field => $value) {
                    if ($field === $primaryKey) {
                        continue;
                    }
                    $updateFields[] = "`{$field}` = :{$field}";
                }
                if (!empty($updateFields)) {
                    $sql = 'UPDATE `risk_vehicle` SET ' . implode(', ', $updateFields) . ' WHERE `' . str_replace('`', '', $primaryKey) . '` = :pk';
                    $stmt = $pdo->prepare($sql);
                    $stmt->bindValue(':pk', $incomingPk, PDO::PARAM_INT);
                    foreach ($data as $field => $value) {
                        if ($field === $primaryKey) {
                            continue;
                        }
                        $stmt->bindValue(':' . $field, $value);
                    }
                    $stmt->execute();
                    $processed++;
                    continue;
                }
            }

            $insertFields = array_keys($data);
            $placeholders = array_map(fn($field) => ':' . $field, $insertFields);
            $sql = 'INSERT INTO `risk_vehicle` (`' . implode('`,`', $insertFields) . '`) VALUES (' . implode(',', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);
            foreach ($data as $field => $value) {
                $stmt->bindValue(':' . $field, $value);
            }
            $stmt->execute();
            $processed++;
        } catch (PDOException $e) {
            $errors[] = "Row {$index}: " . $e->getMessage();
        }
    }

    echo json_encode(['success' => true, 'processed' => $processed, 'errors' => $errors]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
