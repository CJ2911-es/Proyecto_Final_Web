<?php
/**
 * admin/_imagenes.php — Subida segura de imágenes de producto a img/productos/.
 *
 * Seguridad:
 *  - El tipo se determina por el CONTENIDO real (finfo + getimagesize), no por el nombre ni
 *    el Content-Type que envía el navegador. Solo JPEG, PNG y WEBP (SVG y todo lo demás se rechaza).
 *  - La extensión final sale del tipo detectado; el nombre del usuario nunca se usa.
 *  - Nombre aleatorio (bytes criptográficos), sin sobrescribir archivos existentes.
 *  - Límite de tamaño y de dimensiones.
 *  - Las imágenes antiguas NUNCA se borran automáticamente.
 */
const IMG_MAX_BYTES = 3 * 1024 * 1024;   // 3 MB
const IMG_MAX_LADO  = 8000;              // px
const IMG_MIN_LADO  = 50;                // px
const IMG_TIPOS     = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
const IMG_TIPOS_GD  = [IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_PNG => 'image/png', IMAGETYPE_WEBP => 'image/webp'];

/**
 * Valida el archivo del campo $_FILES[$campo]. Devuelve null si no se envió ninguno.
 * @return array{tmp:string, ext:string}|null
 * @throws EntradaInvalida
 */
function validar_imagen_subida(string $campo = 'imagen'): ?array
{
    if (!isset($_FILES[$campo]) || !is_array($_FILES[$campo])) {
        return null;
    }

    $f = $_FILES[$campo];

    if (is_array($f['error'] ?? null)) {
        throw new EntradaInvalida('Sube una sola imagen.');
    }

    $error = (int) ($f['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        throw new EntradaInvalida('La imagen supera el tamaño máximo permitido (3 MB).');
    }
    if ($error !== UPLOAD_ERR_OK) {
        throw new EntradaInvalida('No se pudo recibir la imagen. Inténtalo de nuevo.');
    }

    $tmp = (string) ($f['tmp_name'] ?? '');

    if ($tmp === '' || !is_uploaded_file($tmp)) {
        throw new EntradaInvalida('Archivo de imagen no válido.');
    }
    if (($f['size'] ?? 0) > IMG_MAX_BYTES || filesize($tmp) > IMG_MAX_BYTES) {
        throw new EntradaInvalida('La imagen supera el tamaño máximo permitido (3 MB).');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($tmp);

    if (!isset(IMG_TIPOS[$mime])) {
        throw new EntradaInvalida('Formato no permitido. Usa JPG, PNG o WEBP.');
    }

    // Debe ser realmente una imagen decodificable y coherente con el tipo detectado
    $info = @getimagesize($tmp);

    if ($info === false || (IMG_TIPOS_GD[$info[2]] ?? null) !== $mime) {
        throw new EntradaInvalida('El archivo no es una imagen válida.');
    }
    if ($info[0] < IMG_MIN_LADO || $info[1] < IMG_MIN_LADO || $info[0] > IMG_MAX_LADO || $info[1] > IMG_MAX_LADO) {
        throw new EntradaInvalida('Las dimensiones de la imagen deben estar entre ' . IMG_MIN_LADO . ' y ' . IMG_MAX_LADO . ' píxeles.');
    }

    return ['tmp' => $tmp, 'ext' => IMG_TIPOS[$mime]];
}

/**
 * Mueve la imagen validada a img/productos/ con nombre único.
 * Devuelve la ruta relativa que se guarda en productos.imagen (ej. "img/productos/prod_20261113_ab12....jpg").
 */
function guardar_imagen_subida(array $validada): string
{
    $raiz    = dirname(__DIR__);
    $carpeta = $raiz . '/img/productos';

    if (!is_dir($carpeta) && !mkdir($carpeta, 0755, true) && !is_dir($carpeta)) {
        throw new RuntimeException('No se pudo crear la carpeta de imágenes.');
    }

    for ($i = 0; $i < 5; $i++) {
        $nombre  = 'prod_' . date('Ymd') . '_' . bin2hex(random_bytes(8)) . '.' . $validada['ext'];
        $destino = $carpeta . '/' . $nombre;

        if (file_exists($destino)) {
            continue; // nunca se sobrescribe
        }
        if (!move_uploaded_file($validada['tmp'], $destino)) {
            throw new RuntimeException('No se pudo guardar la imagen en el servidor.');
        }
        @chmod($destino, 0644);

        return 'img/productos/' . $nombre;
    }

    throw new RuntimeException('No se pudo generar un nombre único para la imagen.');
}

/** Elimina un archivo recién subido (solo se usa para deshacer una subida cuyo guardado en BD falló). */
function descartar_imagen_nueva(?string $rutaRelativa): void
{
    if ($rutaRelativa && str_starts_with($rutaRelativa, 'img/productos/prod_')) {
        $archivo = dirname(__DIR__, 2) . '/' . $rutaRelativa;
        if (is_file($archivo)) {
            @unlink($archivo);
        }
    }
}
