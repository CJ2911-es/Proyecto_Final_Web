<?php
/**
 * producto.php — Devuelve el detalle de UN producto: descripción y especificaciones.
 * Uso: php/producto.php?id=12
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';

// El id debe ser un entero positivo (se valida antes de tocar la base de datos)
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id || $id <= 0) {
    responder_json(false, 'Producto no válido.', [], 400);
}

try {
    // 1. Datos propios del producto (solo si está activo)
    $stmt = $conexion->prepare(
        'SELECT descripcion FROM productos WHERE id_producto = ? AND activo = 1'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $producto = $stmt->get_result()->fetch_assoc();

    if (!$producto) {
        responder_json(false, 'El producto no existe o ya no está disponible.', [], 404);
    }

    // 2. Especificaciones técnicas, en el orden definido en la columna "orden"
    $stmtEsp = $conexion->prepare(
        'SELECT atributo, valor
         FROM especificaciones
         WHERE id_producto = ?
         ORDER BY orden, id_especificacion'
    );
    $stmtEsp->bind_param('i', $id);
    $stmtEsp->execute();
    $especificaciones = $stmtEsp->get_result()->fetch_all(MYSQLI_ASSOC);

} catch (mysqli_sql_exception $e) {
    error_log('Error al cargar detalle de producto: ' . $e->getMessage());
    responder_json(false, 'No se pudo cargar el detalle del producto.', [], 500);
}

responder_json(true, 'OK', [
    'descripcion'      => $producto['descripcion'] ?? '',
    'especificaciones' => $especificaciones,
]);
