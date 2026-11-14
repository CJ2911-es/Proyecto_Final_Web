<?php
/** estadisticas.php — GET. Indicadores del dashboard, todos calculados en MariaDB. */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $p = $conexion->query(
        "SELECT
            COUNT(*)                                                         AS total,
            COALESCE(SUM(activo = 1), 0)                                     AS activos,
            COALESCE(SUM(activo = 0), 0)                                     AS inactivos,
            COALESCE(SUM(activo = 1 AND stock = 0), 0)                       AS sin_stock,
            COALESCE(SUM(activo = 1 AND stock > 0 AND stock <= stock_minimo), 0) AS stock_bajo,
            COALESCE(SUM(activo = 1 AND stock IS NULL), 0)                   AS sin_inicializar,
            COALESCE(SUM(CASE WHEN stock IS NOT NULL THEN stock * precio ELSE 0 END), 0) AS valor_inventario
         FROM productos"
    )->fetch_assoc();

    $o = $conexion->query(
        "SELECT
            COUNT(*)                                                   AS total,
            COALESCE(SUM(estado = 'Pendiente'), 0)                     AS pendientes,
            COALESCE(SUM(estado = 'Cancelado'), 0)                     AS cancelados,
            COALESCE(SUM(CASE WHEN estado <> 'Cancelado' THEN total ELSE 0 END), 0) AS ventas
         FROM pedidos"
    )->fetch_assoc();

    $recientes = consultar(
        $conexion,
        "SELECT p.id_pedido AS id, p.codigo_pedido AS codigo, c.nombre AS cliente, p.metodo_pago AS metodo,
                p.total, p.estado, p.fecha_pedido AS fecha
         FROM pedidos p INNER JOIN clientes c ON c.id_cliente = p.id_cliente
         ORDER BY p.id_pedido DESC LIMIT 8"
    );

    $movs = consultar(
        $conexion,
        "SELECT m.id_movimiento AS id, pr.nombre AS producto, m.tipo, m.cantidad, m.stock_resultante AS resultante, m.fecha
         FROM movimientos_inventario m INNER JOIN productos pr ON pr.id_producto = m.id_producto
         ORDER BY m.id_movimiento DESC LIMIT 6"
    );

    responder_json(true, 'OK', [
        'productos' => [
            'total'            => (int) $p['total'],
            'activos'          => (int) $p['activos'],
            'inactivos'        => (int) $p['inactivos'],
            'sin_stock'        => (int) $p['sin_stock'],
            'stock_bajo'       => (int) $p['stock_bajo'],
            'sin_inicializar'  => (int) $p['sin_inicializar'],
            'valor_inventario' => round((float) $p['valor_inventario'], 2),
        ],
        'pedidos' => [
            'total'      => (int) $o['total'],
            'pendientes' => (int) $o['pendientes'],
            'cancelados' => (int) $o['cancelados'],
            'ventas'     => round((float) $o['ventas'], 2),
            'recientes'  => $recientes,
        ],
        'movimientos_recientes' => $movs,
    ]);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'estadisticas');
}
