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
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';

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

    // ---------- 2. Productos: precios reales desde la base de datos ----------
    $stmtProducto = $conexion->prepare(
        'SELECT nombre, precio FROM productos WHERE id_producto = ? AND activo = 1'
    );

    $productosPedido = [];
    $total = 0;

    foreach ($carrito as $item) {
        $idProducto = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT);
        $cantidad   = filter_var($item['cantidad'] ?? null, FILTER_VALIDATE_INT);

        if (
            $idProducto === false || $idProducto === null || $idProducto <= 0 ||
            $cantidad === false || $cantidad === null || $cantidad <= 0 || $cantidad > 99
        ) {
            throw new PedidoInvalido('Hay un producto o una cantidad no válida.');
        }

        $stmtProducto->bind_param('i', $idProducto);
        $stmtProducto->execute();
        $producto = $stmtProducto->get_result()->fetch_assoc();

        if (!$producto) {
            throw new PedidoInvalido('Uno de los productos ya no está disponible.');
        }

        $precio   = (float) $producto['precio'];
        $subtotal = round($precio * $cantidad, 2);

        $productosPedido[] = [
            'id'       => $idProducto,
            'nombre'   => $producto['nombre'],
            'cantidad' => $cantidad,
            'precio'   => $precio,
            'subtotal' => $subtotal,
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

    // ---------- 5. Confirmar toda la operación ----------
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
