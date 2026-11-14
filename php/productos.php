<?php
/**
 * productos.php — Devuelve el catálogo de productos activos en formato JSON.
 * Lo consume js/script.js con fetch() para dibujar las tarjetas.
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';

// Se unen las tablas para traer el nombre de la marca y de la categoría
$sql = "SELECT
            p.id_producto AS id,
            p.nombre,
            m.nombre AS marca,
            c.nombre AS categoria,
            p.tipo,
            p.precio,
            p.precio_anterior AS old,
            p.imagen AS img,
            p.emoji,
            p.stock
        FROM productos p
        INNER JOIN categorias c ON p.id_categoria = c.id_categoria
        INNER JOIN marcas m ON p.id_marca = m.id_marca
        WHERE p.activo = 1
        ORDER BY p.id_producto";

try {
    $productos = $conexion->query($sql)->fetch_all(MYSQLI_ASSOC);

    // stock: null = inventario sin inicializar (se vende sin límite), 0 = agotado, N = unidades reales
    foreach ($productos as &$producto) {
        $producto['stock'] = $producto['stock'] === null ? null : (int) $producto['stock'];
    }
    unset($producto);
} catch (mysqli_sql_exception $e) {
    error_log('Error al listar productos: ' . $e->getMessage());
    responder_json(false, 'No se pudieron cargar los productos.', [], 500);
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($productos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
