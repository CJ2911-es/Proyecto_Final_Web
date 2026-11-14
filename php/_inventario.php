<?php
/**
 * _inventario.php — Lógica de inventario compartida por el checkout
 * (registrar_pedido.php) y el panel administrativo (php/admin/*).
 *
 * Reglas:
 *  - productos.stock = NULL  → inventario sin inicializar: no se controla ni se descuenta.
 *  - productos.stock = 0     → agotado.
 *  - Toda modificación de stock deja una fila en movimientos_inventario.
 *  - Estas funciones DEBEN llamarse dentro de una transacción abierta por quien las usa.
 */

/** Error de negocio de inventario (cantidad inválida, stock insuficiente...) con mensaje apto para el usuario. */
class MovimientoInvalido extends Exception {}

const STOCK_MAXIMO = 1000000;

/**
 * Escritura de bajo nivel: fija el stock y registra el movimiento.
 * Quien la llama ya debe tener la fila del producto bloqueada (SELECT ... FOR UPDATE).
 */
function escribir_movimiento(
    mysqli $c,
    int $idProducto,
    string $tipo,
    int $cantidad,
    ?int $anterior,
    int $resultante,
    string $motivo,
    ?int $idUsuario,
    ?int $idPedido = null
): int {
    $upd = $c->prepare('UPDATE productos SET stock = ? WHERE id_producto = ?');
    $upd->bind_param('ii', $resultante, $idProducto);
    $upd->execute();

    $ins = $c->prepare(
        'INSERT INTO movimientos_inventario
         (id_producto, tipo, cantidad, stock_anterior, stock_resultante, motivo, id_usuario, id_pedido)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->bind_param('isiiisii', $idProducto, $tipo, $cantidad, $anterior, $resultante, $motivo, $idUsuario, $idPedido);
    $ins->execute();

    return (int) $c->insert_id;
}

/**
 * Aplica un movimiento de inventario a un producto (bloquea su fila).
 *
 *  entrada / devolucion → suma $valor unidades.
 *  salida / venta       → resta $valor unidades (no puede dejar el stock negativo).
 *  ajuste               → $valor es el NUEVO stock total (sirve también para inicializar).
 *
 * @return array{id_movimiento:int, anterior:?int, resultante:int, cantidad:int}
 * @throws MovimientoInvalido si la operación es inconsistente
 */
function aplicar_movimiento(
    mysqli $c,
    int $idProducto,
    string $tipo,
    int $valor,
    string $motivo,
    ?int $idUsuario,
    ?int $idPedido = null
): array {
    if (!in_array($tipo, ['entrada', 'salida', 'ajuste', 'venta', 'devolucion'], true)) {
        throw new MovimientoInvalido('Tipo de movimiento no válido.');
    }
    if ($valor < 0 || $valor > STOCK_MAXIMO) {
        throw new MovimientoInvalido('La cantidad debe ser un número entero entre 0 y ' . number_format(STOCK_MAXIMO, 0, '', ' ') . '.');
    }
    if ($tipo !== 'ajuste' && $valor === 0) {
        throw new MovimientoInvalido('La cantidad debe ser mayor que cero.');
    }

    $stmt = $c->prepare('SELECT stock FROM productos WHERE id_producto = ? FOR UPDATE');
    $stmt->bind_param('i', $idProducto);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();

    if (!$fila) {
        throw new MovimientoInvalido('El producto no existe.');
    }

    $anterior = $fila['stock'] === null ? null : (int) $fila['stock'];

    if ($tipo === 'ajuste') {
        if ($anterior !== null && $anterior === $valor) {
            throw new MovimientoInvalido('El stock ya es de ' . $valor . ' unidades; no hay nada que ajustar.');
        }
        $resultante = $valor;
        $cantidad   = $anterior === null ? $valor : abs($valor - $anterior);
    } else {
        if ($anterior === null) {
            throw new MovimientoInvalido('Este producto aún no tiene el inventario inicializado. Registra primero su stock inicial con un ajuste.');
        }
        $cantidad = $valor;

        if (in_array($tipo, ['entrada', 'devolucion'], true)) {
            $resultante = $anterior + $valor;
            if ($resultante > STOCK_MAXIMO) {
                throw new MovimientoInvalido('El stock resultante supera el máximo permitido.');
            }
        } else {
            if ($valor > $anterior) {
                throw new MovimientoInvalido("No hay suficientes existencias: hay $anterior y se intentan sacar $valor.");
            }
            $resultante = $anterior - $valor;
        }
    }

    $id = escribir_movimiento($c, $idProducto, $tipo, $cantidad, $anterior, $resultante, $motivo, $idUsuario, $idPedido);

    return ['id_movimiento' => $id, 'anterior' => $anterior, 'resultante' => $resultante, 'cantidad' => $cantidad];
}

/** Estado legible del stock: 'sin_inicializar', 'agotado', 'bajo' u 'ok'. */
function estado_stock(?int $stock, int $minimo): string
{
    if ($stock === null) return 'sin_inicializar';
    if ($stock === 0)    return 'agotado';
    if ($stock <= $minimo) return 'bajo';
    return 'ok';
}
