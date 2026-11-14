<?php
/**
 * inventario_movimiento.php — POST JSON {id_producto, tipo: entrada|salida|ajuste, cantidad, motivo}.
 *  entrada/salida: "cantidad" = unidades que entran o salen (>0).
 *  ajuste:         "cantidad" = NUEVO stock total (>=0); también inicializa un producto sin stock definido.
 * Bloquea la fila del producto, valida y deja el movimiento registrado con el administrador responsable.
 */
require_once __DIR__ . '/_comun.php';

$admin = admin_post($conexion);

try {
    $e = leer_json_entrada();

    $idProducto = campo_entero($e['id_producto'] ?? null, 1, 2147483647, 'Producto');
    $tipo = (string) ($e['tipo'] ?? '');
    if (!in_array($tipo, ['entrada', 'salida', 'ajuste'], true)) {
        throw new EntradaInvalida('Elige un tipo de movimiento válido (entrada, salida o ajuste).');
    }
    $cantidad = campo_entero($e['cantidad'] ?? null, 0, STOCK_MAXIMO, 'La cantidad');
    $motivo   = campo_texto($e['motivo'] ?? '', 3, 255, 'El motivo');

    $conexion->begin_transaction();
    $r = aplicar_movimiento($conexion, $idProducto, $tipo, $cantidad, $motivo, $admin['id']);
    $conexion->commit();

    responder_json(true, 'Movimiento registrado.', ['movimiento' => $r]);
} catch (EntradaInvalida | MovimientoInvalido $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    responder_json(false, $e->getMessage(), [], 400);
} catch (Throwable $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    error_interno($e, 'inventario_movimiento');
}
