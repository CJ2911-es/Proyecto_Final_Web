<?php
/** producto_obtener.php?id=N — GET. Un producto completo (activo o no) con sus especificaciones. */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $id = campo_entero($_GET['id'] ?? null, 1, 2147483647, 'Producto');

    $fila = consultar(
        $conexion,
        'SELECT id_producto AS id, nombre, descripcion, id_categoria, id_marca, tipo, precio, precio_anterior,
                imagen, emoji, activo, stock, stock_minimo
         FROM productos WHERE id_producto = ?',
        'i', [$id]
    )[0] ?? null;

    if (!$fila) {
        responder_json(false, 'El producto no existe.', [], 404);
    }

    $fila['id']           = (int) $fila['id'];
    $fila['activo']       = (int) $fila['activo'];
    $fila['stock']        = stock_o_null($fila['stock']);
    $fila['stock_minimo'] = (int) $fila['stock_minimo'];

    $esp = consultar(
        $conexion,
        'SELECT atributo, valor, orden FROM especificaciones WHERE id_producto = ? ORDER BY orden, id_especificacion',
        'i', [$id]
    );

    responder_json(true, 'OK', ['producto' => $fila, 'especificaciones' => $esp]);
} catch (EntradaInvalida $e) {
    responder_json(false, $e->getMessage(), [], 400);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'producto_obtener');
}
