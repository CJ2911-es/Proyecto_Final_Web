<?php
/**
 * producto_guardar.php — POST multipart/form-data. Crea (sin "id") o edita (con "id") un producto,
 * reemplaza sus especificaciones y, si se envía, sube su imagen. Todo en una transacción.
 *
 * Campos: id?, nombre, descripcion, id_categoria, id_marca, tipo, precio, precio_anterior, emoji,
 *         activo, stock_minimo, stock_inicial? (solo al crear), especificaciones (JSON:
 *         [{"atributo":"..","valor":".."}] en el orden de visualización), imagen? (archivo).
 * El stock NO se cambia aquí al editar: se hace con movimientos (inventario_movimiento.php).
 */
require_once __DIR__ . '/_comun.php';
require_once __DIR__ . '/_imagenes.php';

$admin = admin_post($conexion);

$rutaNueva = null; // imagen recién guardada (se borra si la transacción falla)

try {
    // ---------- Validación (servidor) ----------
    $id = ($_POST['id'] ?? '') !== '' ? campo_entero($_POST['id'], 1, 2147483647, 'Producto') : null;

    $nombre       = campo_texto($_POST['nombre'] ?? '', 3, 180, 'El nombre');
    $descripcion  = campo_texto($_POST['descripcion'] ?? '', 0, 5000, 'La descripción');
    $idCategoria  = campo_entero($_POST['id_categoria'] ?? null, 1, 2147483647, 'La categoría');
    $idMarca      = campo_entero($_POST['id_marca'] ?? null, 1, 2147483647, 'La marca');
    $precio       = campo_precio($_POST['precio'] ?? '', 'El precio');
    $activo       = campo_bool($_POST['activo'] ?? 0);
    $stockMinimo  = campo_entero(($_POST['stock_minimo'] ?? '') === '' ? 5 : $_POST['stock_minimo'], 0, 100000, 'El stock mínimo');

    $tipo = mb_strtolower(campo_texto($_POST['tipo'] ?? '', 0, 50, 'El tipo'));
    if ($tipo !== '' && !preg_match('/^[a-záéíóúñü0-9 _-]+$/u', $tipo)) {
        throw new EntradaInvalida('El tipo solo admite letras, números, espacios y guiones.');
    }

    $emoji = campo_texto($_POST['emoji'] ?? '', 0, 20, 'El emoji');

    $precioAnterior = null;
    if (trim((string) ($_POST['precio_anterior'] ?? '')) !== '') {
        $precioAnterior = campo_precio($_POST['precio_anterior'], 'El precio anterior');
        if ((float) $precioAnterior <= (float) $precio) {
            throw new EntradaInvalida('El precio anterior debe ser mayor que el precio actual (o déjalo vacío si no hay oferta).');
        }
    }

    // Especificaciones: lista ordenada de pares atributo/valor
    $especificaciones = [];
    $json = json_decode((string) ($_POST['especificaciones'] ?? '[]'), true);
    if (!is_array($json) || count($json) > 40) {
        throw new EntradaInvalida('Las especificaciones no son válidas (máximo 40).');
    }
    foreach ($json as $fila) {
        $atributo = trim((string) ($fila['atributo'] ?? ''));
        $valor    = trim((string) ($fila['valor'] ?? ''));
        if ($atributo === '' && $valor === '') continue; // fila vacía: se ignora
        $especificaciones[] = [
            campo_texto($atributo, 1, 80, 'El atributo de la especificación'),
            campo_texto($valor, 1, 255, 'El valor de la especificación'),
        ];
    }

    // Stock inicial (solo al crear): opcional, si se deja vacío el producto queda sin inicializar
    $stockInicial = null;
    if ($id === null && trim((string) ($_POST['stock_inicial'] ?? '')) !== '') {
        $stockInicial = campo_entero($_POST['stock_inicial'], 0, STOCK_MAXIMO, 'El stock inicial');
    }

    // Imagen (se valida el contenido real antes de tocar la BD)
    $imagen = validar_imagen_subida('imagen');

    // ---------- Escritura ----------
    $conexion->begin_transaction();

    // Categoría y marca deben existir (se consultan, no se crean ni se aceptan duplicados)
    foreach ([['categorias', 'id_categoria', $idCategoria, 'La categoría'], ['marcas', 'id_marca', $idMarca, 'La marca']] as [$tabla, $col, $val, $etq]) {
        if (!consultar($conexion, "SELECT 1 FROM $tabla WHERE $col = ?", 'i', [$val])) {
            throw new EntradaInvalida("$etq seleccionada no existe.");
        }
    }

    $tipoBD = $tipo === '' ? null : $tipo;
    $emojiBD = $emoji === '' ? null : $emoji;
    $descBD = $descripcion === '' ? null : $descripcion;

    if ($id === null) {
        $stmt = $conexion->prepare(
            'INSERT INTO productos (nombre, descripcion, id_categoria, id_marca, tipo, precio, precio_anterior, emoji, activo, stock_minimo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('ssiissssii', $nombre, $descBD, $idCategoria, $idMarca, $tipoBD, $precio, $precioAnterior, $emojiBD, $activo, $stockMinimo);
        $stmt->execute();
        $id = (int) $conexion->insert_id;
        $accion = 'creado';
    } else {
        $existe = consultar($conexion, 'SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', 'i', [$id]);
        if (!$existe) {
            throw new EntradaInvalida('El producto que intentas editar no existe.');
        }
        $stmt = $conexion->prepare(
            'UPDATE productos SET nombre = ?, descripcion = ?, id_categoria = ?, id_marca = ?, tipo = ?,
                    precio = ?, precio_anterior = ?, emoji = ?, activo = ?, stock_minimo = ?
             WHERE id_producto = ?'
        );
        $stmt->bind_param('ssiissssiii', $nombre, $descBD, $idCategoria, $idMarca, $tipoBD, $precio, $precioAnterior, $emojiBD, $activo, $stockMinimo, $id);
        $stmt->execute();
        $accion = 'actualizado';
    }

    // Especificaciones: se reemplaza SOLO el conjunto de este producto
    $del = $conexion->prepare('DELETE FROM especificaciones WHERE id_producto = ?');
    $del->bind_param('i', $id);
    $del->execute();

    if ($especificaciones) {
        $ins = $conexion->prepare('INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES (?, ?, ?, ?)');
        foreach ($especificaciones as $i => [$atributo, $valor]) {
            $orden = $i + 1;
            $ins->bind_param('issi', $id, $atributo, $valor, $orden);
            $ins->execute();
        }
    }

    // Imagen: se guarda el archivo y se actualiza la ruta (la imagen anterior NO se borra)
    if ($imagen !== null) {
        $rutaNueva = guardar_imagen_subida($imagen);
        $upd = $conexion->prepare('UPDATE productos SET imagen = ? WHERE id_producto = ?');
        $upd->bind_param('si', $rutaNueva, $id);
        $upd->execute();
    }

    // Stock inicial al crear
    if ($stockInicial !== null) {
        aplicar_movimiento($conexion, $id, 'ajuste', $stockInicial, 'Stock inicial al registrar el producto', $admin['id']);
    }

    $conexion->commit();

    responder_json(true, "Producto $accion correctamente.", ['id' => $id, 'imagen' => $rutaNueva]);

} catch (EntradaInvalida | MovimientoInvalido $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    descartar_imagen_nueva($rutaNueva);
    responder_json(false, $e->getMessage(), [], 400);
} catch (Throwable $e) {
    try { $conexion->rollback(); } catch (Throwable $r) {}
    descartar_imagen_nueva($rutaNueva);
    error_interno($e, 'producto_guardar');
}
