<?php
/**
 * pedido_cancelar.php — POST JSON {id}. Cancela un pedido y repone al inventario SOLO lo que la compra
 * descontó (movimientos tipo "venta" de ese pedido). Es idempotente: el pedido se bloquea, solo se puede
 * cancelar una vez y, además, si ya existe una devolución para ese pedido no se vuelve a reponer.
 * Los pedidos anteriores al control de stock (sin movimientos de venta) se cancelan sin tocar existencias.
 */
require_once __DIR__ . '/_comun.php';

$admin = admin_post($conexion);

try {
    $e  = leer_json_entrada();
    $id = campo_entero($e['id'] ?? null, 1, 2147483647, 'Pedido');

    $conexion->begin_transaction();

    $pedido = consultar($conexion, 'SELECT codigo_pedido, estado FROM pedidos WHERE id_pedido = ? FOR UPDATE', 'i', [$id])[0] ?? null;

    if (!$pedido) {
        $conexion->rollback();
        responder_json(false, 'El pedido no existe.', [], 404);
    }
    if ($pedido['estado'] === 'Cancelado') {
        throw new EntradaInvalida('Este pedido ya fue cancelado.');
    }
    if ($pedido['estado'] === 'Entregado') {
        throw new EntradaInvalida('Un pedido entregado no se puede cancelar.');
    }

    $upd = $conexion->prepare("UPDATE pedidos SET estado = 'Cancelado' WHERE id_pedido = ?");
    $upd->bind_param('i', $id);
    $upd->execute();

    $yaRepuesto = (int) consultar($conexion, "SELECT COUNT(*) AS n FROM movimientos_inventario WHERE id_pedido = ? AND tipo = 'devolucion'", 'i', [$id])[0]['n'] > 0;
    $repuestos = 0;

    if (!$yaRepuesto) {
        $ventas = consultar(
            $conexion,
            "SELECT id_producto, SUM(cantidad) AS cantidad FROM movimientos_inventario
             WHERE id_pedido = ? AND tipo = 'venta' GROUP BY id_producto ORDER BY id_producto",
            'i', [$id]
        );
        foreach ($ventas as $v) {
            aplicar_movimiento($conexion, (int) $v['id_producto'], 'devolucion', (int) $v['cantidad'],
                'Cancelación del pedido ' . $pedido['codigo_pedido'], $admin['id'], $id);
            $repuestos++;
        }
    }

    $conexion->commit();

    responder_json(true, $repuestos
        ? "Pedido cancelado. Se repusieron las existencias de $repuestos producto(s)."
        : 'Pedido cancelado. No había existencias descontadas que reponer.', ['id' => $id, 'repuestos' => $repuestos]);
} catch (EntradaInvalida | MovimientoInvalido $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    responder_json(false, $e->getMessage(), [], 400);
} catch (Throwable $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    error_interno($e, 'pedido_cancelar');
}
