<?php
/**
 * inventario_listar.php — GET. Existencias de todos los productos.
 * Filtros: q, estado (agotado|bajo|ok|sin_inicializar), activo (1|0), pagina, por_pagina.
 */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $donde = []; $tipos = ''; $par = [];

    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $donde[] = 'p.nombre LIKE ?'; $tipos .= 's'; $par[] = like_seguro($q);
    }

    $estado = $_GET['estado'] ?? '';
    if ($estado === 'agotado')         $donde[] = 'p.stock = 0';
    if ($estado === 'bajo')            $donde[] = 'p.stock > 0 AND p.stock <= p.stock_minimo';
    if ($estado === 'ok')              $donde[] = 'p.stock > p.stock_minimo';
    if ($estado === 'sin_inicializar') $donde[] = 'p.stock IS NULL';

    if (($_GET['activo'] ?? '') === '1') $donde[] = 'p.activo = 1';
    if (($_GET['activo'] ?? '') === '0') $donde[] = 'p.activo = 0';

    $where = $donde ? 'WHERE ' . implode(' AND ', $donde) : '';
    $from  = "FROM productos p INNER JOIN marcas m ON m.id_marca = p.id_marca $where";

    [$pagina, $por, $offset] = paginacion(25);

    $total = (int) consultar($conexion, "SELECT COUNT(*) AS n $from", $tipos, $par)[0]['n'];

    $filas = consultar(
        $conexion,
        "SELECT p.id_producto AS id, p.nombre, m.nombre AS marca, p.precio, p.imagen, p.emoji, p.activo, p.stock, p.stock_minimo
         $from ORDER BY " . (($_GET['orden'] ?? '') === 'nombre' ? 'p.nombre ASC' : '(p.stock IS NULL) DESC, p.stock ASC, p.nombre ASC') . " LIMIT ? OFFSET ?",
        $tipos . 'ii',
        array_merge($par, [$por, $offset])
    );

    foreach ($filas as &$f) {
        $f['id']           = (int) $f['id'];
        $f['activo']       = (int) $f['activo'];
        $f['stock']        = stock_o_null($f['stock']);
        $f['stock_minimo'] = (int) $f['stock_minimo'];
        $f['estado_stock'] = estado_stock($f['stock'], $f['stock_minimo']);
    }
    unset($f);

    responder_json(true, 'OK', ['productos' => $filas, 'total' => $total, 'pagina' => $pagina, 'paginas' => max(1, (int) ceil($total / $por))]);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'inventario_listar');
}
