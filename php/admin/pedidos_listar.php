<?php
/** pedidos_listar.php — GET. Pedidos con su cliente. Filtros: estado, q (código o cliente), pagina. */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $donde = []; $tipos = ''; $par = [];

    $estado = trim((string) ($_GET['estado'] ?? ''));
    if ($estado !== '') { $donde[] = 'p.estado = ?'; $tipos .= 's'; $par[] = $estado; }

    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $donde[] = '(p.codigo_pedido LIKE ? OR c.nombre LIKE ? OR c.correo LIKE ?)';
        $tipos  .= 'sss';
        array_push($par, like_seguro($q), like_seguro($q), like_seguro($q));
    }

    $where = $donde ? 'WHERE ' . implode(' AND ', $donde) : '';
    $from  = "FROM pedidos p INNER JOIN clientes c ON c.id_cliente = p.id_cliente $where";

    [$pagina, $por, $offset] = paginacion(20);
    $total = (int) consultar($conexion, "SELECT COUNT(*) AS n $from", $tipos, $par)[0]['n'];

    $filas = consultar(
        $conexion,
        "SELECT p.id_pedido AS id, p.codigo_pedido AS codigo, c.nombre AS cliente, c.correo, p.metodo_pago AS metodo,
                p.total, p.estado, p.fecha_pedido AS fecha
         $from ORDER BY p.id_pedido DESC LIMIT ? OFFSET ?",
        $tipos . 'ii',
        array_merge($par, [$por, $offset])
    );

    responder_json(true, 'OK', ['pedidos' => $filas, 'total' => $total, 'pagina' => $pagina, 'paginas' => max(1, (int) ceil($total / $por))]);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'pedidos_listar');
}
