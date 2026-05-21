<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$allowedTables = [
    'vehicle_brands' => ['id', 'code', 'name', 'parent'],
    'vehicle_models' => ['id', 'code', 'name', 'parent'],
    'vehicle_series' => ['id', 'code', 'name', 'parent'],
    'vehicle_subseries' => ['id', 'code', 'name', 'parent'],
    'vehicle_regions' => ['id', 'code', 'name'],
    'object_groups' => ['id', 'code', 'name'],
    'risk_vehicle' => [],
];

$table = trim($_GET['table'] ?? '');
if ($table === '' || !array_key_exists($table, $allowedTables)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid lookup table']);
    exit;
}

$query = "SELECT * FROM `{$table}`";
$params = [];
if (($parent = trim($_GET['parent'] ?? '')) !== '' && in_array('parent', $allowedTables[$table], true)) {
    $query .= ' WHERE `parent` = :parent';
    $params[':parent'] = $parent;
}
$query .= ' ORDER BY `name` ASC';

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$rows = $stmt->fetchAll();
echo json_encode($rows);
