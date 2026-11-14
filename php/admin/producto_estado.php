<?php
/** producto_estado.php — POST JSON {id, activo:0|1}. Desactiva o reactiva un producto (nunca se borra). */
require_once __DIR__ . '/_comun.php';

admin_post($conexion);

try {
    $e = leer_json_entrada();
    $id = campo_entero($e['id'] ?? null, 1, 2147483647, 'Producto');
    $activo = campo_bool($e['activo'] ?? 0);

    $stmt = $conexion->prepare('UPDATE productos SET activo = ? WHERE id_producto = ?');
    $stmt->bind_param('ii', $activo, $id);
    $stmt->execute();

    if ($stmt->affected_rows === 0 && !consultar($conexion, 'SELECT 1 FROM productos WHERE id_producto = ?', 'i', [$id])) {
        responder_json(false, 'El producto no existe.', [], 404);
    }

    responder_json(true, $activo ? 'Producto reactivado.' : 'Producto desactivado. Ya no se muestra en la tienda.', ['id' => $id, 'activo' => $activo]);
} catch (EntradaInvalida $e) {
    responder_json(false, $e->getMessage(), [], 400);
} catch (Throwable $e) {
    error_interno($e, 'producto_estado');
}
