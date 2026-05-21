<?php
/**
 * Test script untuk memverifikasi koneksi database dan tabel modelrisk
 * Database: gibsysnet
 * Table: modelrisk
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$response = [];

try {
    // 1. Test database connection
    $stmt = $pdo->query('SELECT 1');
    $response['status'] = 'success';
    $response['database_connection'] = 'OK';
    $response['database_name'] = 'gibsysnet';
    
    // 2. Check if modelrisk table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'modelrisk'");
    $tableExists = $stmt->rowCount() > 0;
    $response['modelrisk_table_exists'] = $tableExists ? 'YES' : 'NO';
    
    if ($tableExists) {
        // 3. Get table structure
        $stmt = $pdo->query("DESCRIBE modelrisk");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $response['modelrisk_columns'] = $columns;
        
        // 4. Count total rows
        $stmt = $pdo->query("SELECT COUNT(*) FROM modelrisk");
        $count = $stmt->fetchColumn();
        $response['modelrisk_total_rows'] = (int)$count;
        
        // 5. Count distinct brands
        $stmt = $pdo->query("SELECT COUNT(DISTINCT `brand`) FROM `modelrisk` WHERE `brand` IS NOT NULL AND `brand` <> ''");
        $brandCount = $stmt->fetchColumn();
        $response['distinct_brands'] = (int)$brandCount;
        
        // 6. Sample brands
        $stmt = $pdo->query("SELECT DISTINCT `brand` FROM `modelrisk` WHERE `brand` IS NOT NULL AND `brand` <> '' ORDER BY `brand` LIMIT 5");
        $brands = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $response['sample_brands'] = $brands;
        
        // 7. Test each API field - brands
        $stmt = $pdo->query("SELECT DISTINCT `brand` FROM `modelrisk` WHERE `brand` <> '' ORDER BY `brand` LIMIT 1");
        $testBrand = $stmt->fetchColumn();
        $response['test_brand_sample'] = $testBrand;
        
        // 8. Test model lookup
        if ($testBrand) {
            $stmt = $pdo->prepare("SELECT COUNT(DISTINCT `model`) FROM `modelrisk` WHERE `brand` = ? AND `model` <> ''");
            $stmt->execute([$testBrand]);
            $modelCount = $stmt->fetchColumn();
            $response['test_models_by_brand_count'] = (int)$modelCount;
        }
        
        // 9. Sample complete data
        $stmt = $pdo->query("SELECT * FROM `modelrisk` LIMIT 3");
        $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response['sample_data'] = $samples;
        
    } else {
        $response['status'] = 'error';
        $response['error'] = 'Table modelrisk does not exist';
    }
    
    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Database error',
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ], JSON_PRETTY_PRINT);
}
