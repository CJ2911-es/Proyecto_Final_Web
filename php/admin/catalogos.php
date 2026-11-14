<?php
/** catalogos.php — GET. Categorías y marcas reales (alimentan los selectores del formulario). */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    responder_json(true, 'OK', [
        'categorias' => consultar($conexion, 'SELECT id_categoria AS id, nombre FROM categorias ORDER BY nombre'),
        'marcas'     => consultar($conexion, 'SELECT id_marca AS id, nombre FROM marcas ORDER BY nombre'),
    ]);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'catalogos');
}
