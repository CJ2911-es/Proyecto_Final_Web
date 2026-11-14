<?php
/**
 * registrar_pedido.php — Registra una compra en MariaDB.
 * Recibe JSON: { nombre, correo, direccion, metodo, carrito: [{id, cantidad}] }
 *
 * Seguridad:
 *  - Consultas preparadas (evitan inyección SQL).
 *  - El total se recalcula en el servidor con los precios de la BD
 *    (el navegador nunca decide cuánto se paga).
 *  - Todo ocurre en una transacción: o se guarda completo o no se guarda nada.
 *  - Inventario: las filas de los productos se bloquean (SELECT ... FOR UPDATE) para que dos compras
 *    simultáneas no vendan las mismas unidades; se verifica el stock real, se descuenta y se registra
 *    un movimiento "venta" por producto, todo dentro de la misma transacción.
 *    Un producto con stock NULL (inventario aún sin inicializar) se vende sin descuento, como antes.
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/_inventario.php';

/** Error de negocio (producto agotado, cantidad inválida...) cuyo mensaje sí se muestra al usuario. */
class PedidoInvalido extends Exception {}

exigir_post();
iniciar_sesion_segura();

$entrada   = leer_json_entrada();
$nombre    = trim($entrada['nombre'] ?? '');
$correo    = trim($entrada['correo'] ?? '');
$direccion = trim($entrada['direccion'] ?? '');
$metodo    = trim($entrada['metodo'] ?? '');
$carrito   = $entrada['carrito'] ?? [];

// Comprar exige sesión iniciada. El pedido queda asociado al correo de la cuenta
// (así aparece luego en "Mis pedidos"), sin importar lo que envíe el navegador.
$usuario = usuario_actual();
if ($usuario === null) {
    responder_json(false, 'Debes iniciar sesión para finalizar tu compra.', [], 401);
}
$correo = $usuario['correo'];

$metodosPermitidos = ['Tarjeta', 'Yape', 'Plin', 'Contra entrega'];

// ---------- Validación de los datos del formulario ----------
if (
    mb_strlen($nombre) < 3 || mb_strlen($nombre) > 120 ||
    !filter_var($correo, FILTER_VALIDATE_EMAIL) || mb_strlen($correo) > 150 ||
    mb_strlen($direccion) < 5 || mb_strlen($direccion) > 255 ||
    !in_array($metodo, $metodosPermitidos, true) ||
    !is_array($carrito) || count($carrito) === 0
) {
    responder_json(false, 'Completa correctamente tus datos y agrega productos.', [], 400);
}

try {
    $conexion->begin_transaction();

    // ---------- 1. Cliente: se reutiliza si el correo ya existe ----------
    $stmtBuscar = $conexion->prepare('SELECT id_cliente FROM clientes WHERE correo = ? LIMIT 1');
    $stmtBuscar->bind_param('s', $correo);
    $stmtBuscar->execute();
    $existente = $stmtBuscar->get_result()->fetch_assoc();

    if ($existente) {
        $idCliente = (int) $existente['id_cliente'];

        // Actualiza nombre y dirección por si cambiaron desde la última compra
        $stmtActualizar = $conexion->prepare(
            'UPDATE clientes SET nombre = ?, direccion = ? WHERE id_cliente = ?'
        );
        $stmtActualizar->bind_param('ssi', $nombre, $direccion, $idCliente);
        $stmtActualizar->execute();
    } else {
        $stmtCliente = $conexion->prepare(
            'INSERT INTO clientes (nombre, correo, direccion) VALUES (?, ?, ?)'
        );
        $stmtCliente->bind_param('sss', $nombre, $correo, $direccion);
        $stmtCliente->execute();
        $idCliente = (int) $conexion->insert_id;
    }

    // ---------- 2. Productos: validación, bloqueo de filas y precios reales desde la BD ----------
    // Se normaliza el carrito: un producto repetido se suma en una sola línea.
    $lineas = [];   // id => cantidad (en el orden en que llegó el carrito)

    foreach ($carrito as $item) {
        $idProducto = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT);
        $cantidad   = filter_var($item['cantidad'] ?? null, FILTER_VALIDATE_INT);

        if (
            $idProducto === false || $idProducto === null || $idProducto <= 0 ||
            $cantidad === false || $cantidad === null || $cantidad <= 0 || $cantidad > 99
        ) {
            throw new PedidoInvalido('Hay un producto o una cantidad no válida.');
        }

        $lineas[$idProducto] = ($lineas[$idProducto] ?? 0) + $cantidad;

        if ($lineas[$idProducto] > 99) {
            throw new PedidoInvalido('Hay un producto o una cantidad no válida.');
        }
    }

    // Las filas se bloquean SIEMPRE en orden de id (evita interbloqueos entre compras simultáneas).
    $idsOrdenados = array_keys($lineas);
    sort($idsOrdenados);

    $stmtProducto = $conexion->prepare(
        'SELECT nombre, precio, activo, stock FROM productos WHERE id_producto = ? FOR UPDATE'
    );

    $datosProducto = [];

    foreach ($idsOrdenados as $idProducto) {
        $stmtProducto->bind_param('i', $idProducto);
        $stmtProducto->execute();
        $producto = $stmtProducto->get_result()->fetch_assoc();

        if (!$producto || (int) $producto['activo'] !== 1) {
            throw new PedidoInvalido('Uno de los productos ya no está disponible.');
        }

        $stock = $producto['stock'] === null ? null : (int) $producto['stock'];

        if ($stock !== null && $stock < $lineas[$idProducto]) {
            throw new PedidoInvalido(
                $stock === 0
                    ? '«' . $producto['nombre'] . '» está agotado. Quítalo del carrito para continuar.'
                    : 'Solo quedan ' . $stock . ' unidad(es) de «' . $producto['nombre'] . '». Ajusta la cantidad para continuar.'
            );
        }

        $datosProducto[$idProducto] = [
            'nombre' => $producto['nombre'],
            'precio' => (float) $producto['precio'],
            'stock'  => $stock,
        ];
    }

    $productosPedido = [];
    $total = 0;

    foreach ($lineas as $idProducto => $cantidad) {
        $precio   = $datosProducto[$idProducto]['precio'];
        $subtotal = round($precio * $cantidad, 2);

        $productosPedido[] = [
            'id'       => $idProducto,
            'nombre'   => $datosProducto[$idProducto]['nombre'],
            'cantidad' => $cantidad,
            'precio'   => $precio,
            'subtotal' => $subtotal,
            'stock'    => $datosProducto[$idProducto]['stock'],
        ];

        $total += $subtotal;
    }

    $total = round($total, 2);

    // ---------- 3. Pedido con código único (ej: TA-261112-9F3A1C2B) ----------
    $codigoPedido = 'TA-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

    $stmtPedido = $conexion->prepare(
        'INSERT INTO pedidos (codigo_pedido, id_cliente, metodo_pago, total) VALUES (?, ?, ?, ?)'
    );
    $stmtPedido->bind_param('sisd', $codigoPedido, $idCliente, $metodo, $total);
    $stmtPedido->execute();

    $idPedido = (int) $conexion->insert_id;

    // ---------- 4. Detalle: una fila por producto del pedido ----------
    $stmtDetalle = $conexion->prepare(
        'INSERT INTO detalle_pedido
         (id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    foreach ($productosPedido as $p) {
        $stmtDetalle->bind_param(
            'iisidd',
            $idPedido,
            $p['id'],
            $p['nombre'],
            $p['cantidad'],
            $p['precio'],
            $p['subtotal']
        );
        $stmtDetalle->execute();
    }

    // ---------- 5. Inventario: descontar stock y registrar los movimientos de venta ----------
    // Las filas ya están bloqueadas; el UPDATE además exige stock suficiente (doble seguro).
    $stmtDescuento = $conexion->prepare(
        'UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?'
    );
    $stmtMovimiento = $conexion->prepare(
        "INSERT INTO movimientos_inventario
         (id_producto, tipo, cantidad, stock_anterior, stock_resultante, motivo, id_usuario, id_pedido)
         VALUES (?, 'venta', ?, ?, ?, ?, NULL, ?)"
    );
    $motivoVenta = 'Venta del pedido ' . $codigoPedido;

    foreach ($productosPedido as $p) {
        if ($p['stock'] === null) {
            continue; // inventario sin inicializar: no se controla este producto
        }

        $stmtDescuento->bind_param('iii', $p['cantidad'], $p['id'], $p['cantidad']);
        $stmtDescuento->execute();

        if ($stmtDescuento->affected_rows !== 1) {
            throw new PedidoInvalido('«' . $p['nombre'] . '» ya no tiene existencias suficientes.');
        }

        $stockFinal = $p['stock'] - $p['cantidad'];
        $stmtMovimiento->bind_param('iiiisi', $p['id'], $p['cantidad'], $p['stock'], $stockFinal, $motivoVenta, $idPedido);
        $stmtMovimiento->execute();
    }

    // ---------- 6. Confirmar toda la operación ----------
    $conexion->commit();

    responder_json(true, 'Pedido registrado correctamente.', [
        'codigo_pedido' => $codigoPedido,
        'total'         => number_format($total, 2, '.', ''),
    ]);

} catch (Throwable $e) {
    // Si algo falló, se deshace todo lo hecho dentro de la transacción
    try {
        $conexion->rollback();
    } catch (Throwable $errorRollback) {
        error_log('Error en rollback: ' . $errorRollback->getMessage());
    }

    // Errores de negocio: mensaje claro (400). Errores internos: mensaje genérico (500).
    if ($e instanceof PedidoInvalido) {
        responder_json(false, $e->getMessage(), [], 400);
    }

    error_log('Error al registrar pedido: ' . $e->getMessage());
    responder_json(false, 'No se pudo registrar el pedido. Inténtalo nuevamente.', [], 500);
}
