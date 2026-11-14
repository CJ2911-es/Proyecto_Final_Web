<?php
/** inventario_historial.php — GET. Historial de movimientos. Filtros: id_producto, tipo, desde, hasta (AAAA-MM-DD), pagina. */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $donde = []; $tipos = ''; $par = [];

    if (($_GET['id_producto'] ?? '') !== '') {
        $donde[] = 'm.id_producto = ?'; $tipos .= 'i'; $par[] = campo_entero($_GET['id_producto'], 1, 2147483647, 'Producto');
    }
    $tipo = $_GET['tipo'] ?? '';
    if ($tipo !== '') {
        if (!in_array($tipo, ['entrada', 'salida', 'ajuste', 'venta', 'devolucion'], true)) {
            throw new EntradaInvalida('Tipo de movimiento no válido.');
        }
        $donde[] = 'm.tipo = ?'; $tipos .= 's'; $par[] = $tipo;
    }
    if (($desde = campo_fecha($_GET['desde'] ?? '')) !== null) {
        $donde[] = 'm.fecha >= ?'; $tipos .= 's'; $par[] = $desde . ' 00:00:00';
    }
    if (($hasta = campo_fecha($_GET['hasta'] ?? '')) !== null) {
        $donde[] = 'm.fecha < DATE_ADD(?, INTERVAL 1 DAY)'; $tipos .= 's'; $par[] = $hasta;
    }

    $where = $donde ? 'WHERE ' . implode(' AND ', $donde) : '';
    $from  = "FROM movimientos_inventario m
              INNER JOIN productos p ON p.id_producto = m.id_producto
              LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
              LEFT JOIN pedidos pe ON pe.id_pedido = m.id_pedido $where";

    [$pagina, $por, $offset] = paginacion(25);

    $total = (int) consultar($conexion, "SELECT COUNT(*) AS n $from", $tipos, $par)[0]['n'];

    $filas = consultar(
        $conexion,
        "SELECT m.id_movimiento AS id, m.id_producto, p.nombre AS producto, m.tipo, m.cantidad,
                m.stock_anterior AS anterior, m.stock_resultante AS resultante, m.motivo,
                u.nombre AS responsable, pe.codigo_pedido AS pedido, m.fecha
         $from ORDER BY m.id_movimiento DESC LIMIT ? OFFSET ?",
        $tipos . 'ii',
        array_merge($par, [$por, $offset])
    );

    responder_json(true, 'OK', ['movimientos' => $filas, 'total' => $total, 'pagina' => $pagina, 'paginas' => max(1, (int) ceil($total / $por))]);
} catch (EntradaInvalida $e) {
    responder_json(false, $e->getMessage(), [], 400);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'inventario_historial');
}
