<?php
/** pedido_detalle.php?id=N — GET. Datos del pedido, sus productos y si su stock ya fue repuesto. */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $id = campo_entero($_GET['id'] ?? null, 1, 2147483647, 'Pedido');

    $pedido = consultar(
        $conexion,
        'SELECT p.id_pedido AS id, p.codigo_pedido AS codigo, c.nombre AS cliente, c.correo, c.direccion,
                p.metodo_pago AS metodo, p.total, p.estado, p.fecha_pedido AS fecha
         FROM pedidos p INNER JOIN clientes c ON c.id_cliente = p.id_cliente WHERE p.id_pedido = ?',
        'i', [$id]
    )[0] ?? null;

    if (!$pedido) {
        responder_json(false, 'El pedido no existe.', [], 404);
    }

    $items = consultar(
        $conexion,
        'SELECT id_producto, nombre_producto AS nombre, cantidad, precio_unitario AS precio, subtotal
         FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle',
        'i', [$id]
    );

    $mov = consultar(
        $conexion,
        "SELECT SUM(tipo = 'venta') AS ventas, SUM(tipo = 'devolucion') AS devoluciones
         FROM movimientos_inventario WHERE id_pedido = ?",
        'i', [$id]
    )[0];

    responder_json(true, 'OK', [
        'pedido'        => $pedido,
        'items'         => $items,
        'stock'         => [
            'descontado' => (int) $mov['ventas'] > 0,
            'repuesto'   => (int) $mov['devoluciones'] > 0,
        ],
        'cancelable'    => !in_array($pedido['estado'], ['Cancelado', 'Entregado'], true),
    ]);
} catch (EntradaInvalida $e) {
    responder_json(false, $e->getMessage(), [], 400);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'pedido_detalle');
}
