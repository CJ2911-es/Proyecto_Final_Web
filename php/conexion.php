<?php
/**
 * conexion.php — Crea la conexión mysqli ($conexion) que usan los demás scripts.
 *
 * Parámetros de MariaDB (los mismos de siempre):
 *   host 127.0.0.1 · usuario tecaltoque · base tecnologia_altoque · puerto 3306
 *
 * La CONTRASEÑA nunca se escribe en el código. Se toma de:
 *   1. php/config.php (tu archivo local de siempre; puede traer todos los datos o solo la clave), o
 *   2. la variable de entorno ALTOQUE_DB_PASSWORD, si no hay config.php.
 * config.php está en .gitignore. Hay una plantilla en php/config.ejemplo.php.
 */

// Valores por defecto = tu configuración anterior (config.php, si existe, puede cambiarlos)
$config = [
    'host'    => '127.0.0.1',
    'usuario' => 'tecaltoque',
    'base'    => 'tecnologia_altoque',
    'puerto'  => 3306,
];

$archivoConfig = __DIR__ . '/config.php';

if (is_file($archivoConfig)) {
    $propia = require $archivoConfig;

    if (is_array($propia)) {
        $config = array_merge($config, $propia);
    }
}

// Sin config.php (o sin clave en él), se usa la variable de entorno
if (!array_key_exists('password', $config)) {
    $desdeEntorno = getenv('ALTOQUE_DB_PASSWORD');

    if ($desdeEntorno !== false) {
        $config['password'] = $desdeEntorno;
    }
}

// Hace que mysqli lance excepciones en vez de mostrar advertencias
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    if (!array_key_exists('password', $config)) {
        throw new mysqli_sql_exception('Falta la contraseña de MariaDB: crea php/config.php (ver config.ejemplo.php) o define ALTOQUE_DB_PASSWORD.');
    }

    $conexion = new mysqli(
        $config['host'],
        $config['usuario'],
        (string) $config['password'],
        $config['base'],
        (int) $config['puerto']
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