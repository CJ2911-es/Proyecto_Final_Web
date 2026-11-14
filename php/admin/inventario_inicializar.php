<?php
/**
 * inventario_inicializar.php — POST JSON {items:[{id, stock}], motivo?}.
 * Define el stock INICIAL de productos que aún no lo tienen (stock NULL), con cantidades REALES
 * que escribe el administrador. Los productos que ya tenían stock se omiten (no se pisan).
 */
require_once __DIR__ . '/_comun.php';

$admin = admin_post($conexion);

try {
    $e = leer_json_entrada();
    $items = $e['items'] ?? null;

    if (!is_array($items) || !$items || count($items) > 200) {
        throw new EntradaInvalida('Indica al menos un producto (máximo 200 por vez).');
    }

    $conexion->begin_transaction();

    $hechos = 0;
    $omitidos = [];
    $vistos = [];

    foreach ($items as $it) {
        $id    = campo_entero($it['id'] ?? null, 1, 2147483647, 'Producto');
        $stock = campo_entero($it['stock'] ?? null, 0, STOCK_MAXIMO, 'El stock inicial');

        if (isset($vistos[$id])) continue;
        $vistos[$id] = true;

        $actual = consultar($conexion, 'SELECT stock FROM productos WHERE id_producto = ? FOR UPDATE', 'i', [$id])[0] ?? null;
        if (!$actual) { $omitidos[] = $id; continue; }
        if ($actual['stock'] !== null) { $omitidos[] = $id; continue; } // ya tiene inventario: no se pisa

        aplicar_movimiento($conexion, $id, 'ajuste', $stock, 'Stock inicial (inicialización del inventario)', $admin['id']);
        $hechos++;
    }

    $conexion->commit();

    responder_json(true, "Inventario inicializado en $hechos producto(s).", ['inicializados' => $hechos, 'omitidos' => $omitidos]);
} catch (EntradaInvalida | MovimientoInvalido $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    responder_json(false, $e->getMessage(), [], 400);
} catch (Throwable $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    error_interno($e, 'inventario_inicializar');
}
