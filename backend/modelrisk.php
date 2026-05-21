<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$field = trim($_GET['field'] ?? '');
$allowed = ['brand', 'model', 'type', 'series', 'subSeries'];
if ($field === '' || !in_array($field, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid field parameter']);
    exit;
}

$sql = '';
$params = [];

$readRequired = static function (string $key, string $label): string {
    $value = trim($_GET[$key] ?? '');
    if ($value === '') {
        http_response_code(400);
        echo json_encode(['error' => $label . ' parameter is required']);
        exit;
    }

    return $value;
};

switch ($field) {
    case 'brand':
        $sql = 'SELECT DISTINCT TRIM(`brand`) AS `value` FROM `modelrisk` WHERE `brand` IS NOT NULL AND TRIM(`brand`) <> "" ORDER BY `value` ASC';
        break;
    case 'model':
        $brand = $readRequired('brand', 'Brand');
        $sql = 'SELECT DISTINCT TRIM(`model`) AS `value` FROM `modelrisk` WHERE TRIM(`brand`) = :brand AND `model` IS NOT NULL AND TRIM(`model`) <> "" ORDER BY `value` ASC';
        $params[':brand'] = $brand;
        break;
    case 'type':
        $brand = $readRequired('brand', 'Brand');
        $model = $readRequired('model', 'Model');
        $sql = 'SELECT DISTINCT TRIM(`type`) AS `value` FROM `modelrisk` WHERE TRIM(`brand`) = :brand AND TRIM(`model`) = :model AND `type` IS NOT NULL AND TRIM(`type`) <> "" ORDER BY `value` ASC';
        $params[':brand'] = $brand;
        $params[':model'] = $model;
        break;
    case 'series':
        $brand = $readRequired('brand', 'Brand');
        $model = $readRequired('model', 'Model');
        $type = $readRequired('type', 'Type');
        $sql = 'SELECT DISTINCT TRIM(`series`) AS `value` FROM `modelrisk` WHERE TRIM(`brand`) = :brand AND TRIM(`model`) = :model AND TRIM(`type`) = :type AND `series` IS NOT NULL AND TRIM(`series`) <> "" ORDER BY `value` ASC';
        $params[':brand'] = $brand;
        $params[':model'] = $model;
        $params[':type'] = $type;
        break;
    case 'subSeries':
        $brand = $readRequired('brand', 'Brand');
        $model = $readRequired('model', 'Model');
        $type = $readRequired('type', 'Type');
        $series = $readRequired('series', 'Series');
        $sql = 'SELECT DISTINCT TRIM(`sub_series`) AS `value` FROM `modelrisk` WHERE TRIM(`brand`) = :brand AND TRIM(`model`) = :model AND TRIM(`type`) = :type AND TRIM(`series`) = :series AND `sub_series` IS NOT NULL AND TRIM(`sub_series`) <> "" ORDER BY `value` ASC';
        $params[':brand'] = $brand;
        $params[':model'] = $model;
        $params[':type'] = $type;
        $params[':series'] = $series;
        break;
}

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $values = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $rows = array_map(static fn($value) => ['code' => $value, 'name' => $value], $values);
    echo json_encode($rows);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Lookup failed', 'message' => $e->getMessage()]);
}
