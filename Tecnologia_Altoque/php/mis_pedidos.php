<?php
/**
 * mis_pedidos.php — Devuelve los últimos pedidos del usuario con sesión iniciada.
 * Sin sesión responde 401, así que solo se ven los pedidos propios.
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';

iniciar_sesion_segura();

$usuario = usuario_actual();

if ($usuario === null) {
    responder_json(false, 'Debes iniciar sesión para ver tus pedidos.', [], 401);
}

try {
    // Los pedidos se enlazan al usuario mediante el correo del cliente
    $stmt = $conexion->prepare(
        'SELECT p.codigo_pedido, p.metodo_pago, p.total
         FROM pedidos p
         INNER JOIN clientes c ON p.id_cliente = c.id_cliente
         WHERE c.correo = ?
         ORDER BY p.id_pedido DESC
         LIMIT 20'
    );
    $stmt->bind_param('s', $usuario['correo']);
    $stmt->execute();

    $pedidos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

} catch (mysqli_sql_exception $e) {
    error_log('Error al listar pedidos: ' . $e->getMessage());
    responder_json(false, 'No se pudieron cargar tus pedidos.', [], 500);
}

responder_json(true, 'OK', ['pedidos' => $pedidos]);
