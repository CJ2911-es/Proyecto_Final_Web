<?php
/**
 * productos_listar.php — GET. Lista paginada de productos (activos e inactivos) con filtros:
 *   q, categoria (id), marca (id), estado (activo|inactivo), stock (agotado|bajo|ok|sin_inicializar),
 *   pagina, por_pagina
 */
require_once __DIR__ . '/_comun.php';

admin_get($conexion);

try {
    $donde = [];
    $tipos = '';
    $par   = [];

    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $donde[] = '(p.nombre LIKE ? OR m.nombre LIKE ?)';
        $tipos  .= 'ss';
        $par[]   = like_seguro($q);
        $par[]   = like_seguro($q);
    }

    if (($_GET['categoria'] ?? '') !== '') {
        $donde[] = 'p.id_categoria = ?'; $tipos .= 'i'; $par[] = campo_entero($_GET['categoria'], 1, 2147483647, 'Categoría');
    }
    if (($_GET['marca'] ?? '') !== '') {
        $donde[] = 'p.id_marca = ?'; $tipos .= 'i'; $par[] = campo_entero($_GET['marca'], 1, 2147483647, 'Marca');
    }

    $estado = $_GET['estado'] ?? '';
    if ($estado === 'activo')   $donde[] = 'p.activo = 1';
    if ($estado === 'inactivo') $donde[] = 'p.activo = 0';

    $stock = $_GET['stock'] ?? '';
    if ($stock === 'agotado')         $donde[] = 'p.stock = 0';
    if ($stock === 'bajo')            $donde[] = 'p.stock > 0 AND p.stock <= p.stock_minimo';
    if ($stock === 'ok')              $donde[] = 'p.stock > p.stock_minimo';
    if ($stock === 'sin_inicializar') $donde[] = 'p.stock IS NULL';

    $where = $donde ? 'WHERE ' . implode(' AND ', $donde) : '';
    $from  = "FROM productos p
              INNER JOIN categorias c ON c.id_categoria = p.id_categoria
              INNER JOIN marcas m ON m.id_marca = p.id_marca $where";

    [$pagina, $por, $offset] = paginacion(20);

    $total = (int) consultar($conexion, "SELECT COUNT(*) AS n $from", $tipos, $par)[0]['n'];

    $filas = consultar(
        $conexion,
        "SELECT p.id_producto AS id, p.nombre, m.nombre AS marca, c.nombre AS categoria,
                p.id_categoria, p.id_marca, p.tipo, p.precio, p.precio_anterior, p.imagen, p.emoji,
                p.activo, p.stock, p.stock_minimo
         $from ORDER BY p.id_producto DESC LIMIT ? OFFSET ?",
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

    responder_json(true, 'OK', [
        'productos' => $filas,
        'total'     => $total,
        'pagina'    => $pagina,
        'paginas'   => max(1, (int) ceil($total / $por)),
    ]);
} catch (EntradaInvalida $e) {
    responder_json(false, $e->getMessage(), [], 400);
} catch (mysqli_sql_exception $e) {
    error_interno($e, 'productos_listar');
}
