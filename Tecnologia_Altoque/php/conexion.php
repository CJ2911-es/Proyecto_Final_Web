<?php
/**
 * conexion.php — Crea la conexión mysqli ($conexion) que usan los demás scripts.
 * Las credenciales se leen de config.php (ya no están escritas aquí).
 */

$config = require __DIR__ . '/config.php';

// Hace que mysqli lance excepciones en vez de mostrar advertencias
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conexion = new mysqli(
        $config['host'],
        $config['usuario'],
        $config['password'],
        $config['base'],
        $config['puerto']
    );

    // Usa UTF-8 completo (tildes, ñ y emojis)
    $conexion->set_charset('utf8mb4');

} catch (mysqli_sql_exception $e) {
    // El detalle del error va al log del servidor, no al navegador
    error_log($e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode(['exito' => false, 'mensaje' => 'Error al conectar con la base de datos.']));
}
