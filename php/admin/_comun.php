<?php
/**
 * admin/_comun.php — Piezas compartidas por TODOS los endpoints del panel administrativo:
 * conexión, sesión, comprobación de rol en el servidor, token CSRF y validaciones.
 *
 * Reutiliza sesion.php (iniciar_sesion_segura, responder_json, exigir_post, leer_json_entrada).
 *
 * Formato de respuesta (igual al resto de la tienda):
 *   { "exito": true|false, "mensaje": "...", ...datos }   con código HTTP acorde (401, 403, 400, 405, 500).
 * Los POST llevan el token CSRF en la cabecera  X-CSRF-Token.
 */
require_once __DIR__ . '/../sesion.php';
require_once __DIR__ . '/../conexion.php';
require_once __DIR__ . '/../_inventario.php';

iniciar_sesion_segura();

/** Error de validación de datos de entrada (se responde 400 con su mensaje). */
class EntradaInvalida extends Exception {}

function exigir_get(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        responder_json(false, 'Método no permitido.', [], 405);
    }
}

/** Token CSRF de la sesión (se crea la primera vez que se pide). */
function token_csrf(): string
{
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Rechaza la petición si la cabecera X-CSRF-Token no coincide con la de la sesión. */
function exigir_csrf(): void
{
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (!is_string($enviado) || $enviado === '' || !hash_equals(token_csrf(), $enviado)) {
        responder_json(false, 'Token de seguridad inválido. Recarga el panel e inténtalo de nuevo.', [], 403);
    }
}

/**
 * Exige un administrador. El rol se consulta en la BASE DE DATOS en cada petición
 * (no se confía en la sesión ni en nada que envíe el navegador).
 *
 * @return array{id:int, nombre:string, correo:string}
 */
function exigir_admin(mysqli $c): array
{
    $u = usuario_actual();

    if ($u === null) {
        responder_json(false, 'Debes iniciar sesión.', [], 401);
    }

    try {
        $stmt = $c->prepare("SELECT id_usuario, nombre, correo FROM usuarios WHERE id_usuario = ? AND rol = 'admin' LIMIT 1");
        $stmt->bind_param('i', $u['id']);
        $stmt->execute();
        $fila = $stmt->get_result()->fetch_assoc();
    } catch (mysqli_sql_exception $e) {
        error_log('Error al verificar administrador (¿falta ejecutar sql/migracion_admin_inventario.sql?): ' . $e->getMessage());
        responder_json(false, 'No se pudo verificar tu permiso.', [], 500);
    }

    if (!$fila) {
        responder_json(false, 'No tienes permisos de administrador.', [], 403);
    }

    return ['id' => (int) $fila['id_usuario'], 'nombre' => $fila['nombre'], 'correo' => $fila['correo']];
}

/** Para endpoints de lectura: método GET + administrador. */
function admin_get(mysqli $c): array
{
    exigir_get();
    return exigir_admin($c);
}

/** Para endpoints que modifican datos: método POST + administrador + token CSRF. */
function admin_post(mysqli $c): array
{
    exigir_post();
    $admin = exigir_admin($c);
    exigir_csrf();
    return $admin;
}

// ---------- Validaciones ----------

function campo_texto(mixed $v, int $min, int $max, string $nombre): string
{
    $t = trim((string) $v);
    $largo = mb_strlen($t);

    if ($largo < $min || $largo > $max) {
        throw new EntradaInvalida($min > 0
            ? "$nombre debe tener entre $min y $max caracteres."
            : "$nombre no puede superar los $max caracteres.");
    }
    return $t;
}

function campo_entero(mixed $v, int $min, int $max, string $nombre): int
{
    $n = filter_var($v, FILTER_VALIDATE_INT);

    if ($n === false || $n < $min || $n > $max) {
        throw new EntradaInvalida("$nombre debe ser un número entero entre $min y $max.");
    }
    return $n;
}

/** Precio con máximo 2 decimales (DECIMAL(10,2)). Devuelve texto "1234.50". */
function campo_precio(mixed $v, string $nombre, bool $permitirCero = false): string
{
    $t = str_replace(',', '.', trim((string) $v));

    if (!preg_match('/^\d{1,8}(\.\d{1,2})?$/', $t)) {
        throw new EntradaInvalida("$nombre debe ser un monto válido (máximo 2 decimales).");
    }
    $n = (float) $t;
    if ($n < 0 || (!$permitirCero && $n <= 0)) {
        throw new EntradaInvalida("$nombre debe ser mayor que cero.");
    }
    return number_format($n, 2, '.', '');
}

/** Interpreta casillas y banderas enviadas como 1/0/true/false/on. */
function campo_bool(mixed $v): int
{
    return in_array($v, [1, '1', true, 'true', 'on'], true) ? 1 : 0;
}

/** Fecha AAAA-MM-DD válida o null si viene vacía. */
function campo_fecha(mixed $v): ?string
{
    $t = trim((string) $v);
    if ($t === '') return null;

    $d = DateTime::createFromFormat('Y-m-d', $t);
    if (!$d || $d->format('Y-m-d') !== $t) {
        throw new EntradaInvalida('Fecha no válida.');
    }
    return $t;
}

/** Paginación común: devuelve [pagina, porPagina, offset]. */
function paginacion(int $porDefecto = 20): array
{
    $pagina = max(1, (int) ($_GET['pagina'] ?? 1));
    $por    = min(100, max(5, (int) ($_GET['por_pagina'] ?? $porDefecto)));
    return [$pagina, $por, ($pagina - 1) * $por];
}

/** Escapa % y _ para usar texto del usuario dentro de un LIKE. */
function like_seguro(string $t): string
{
    return '%' . addcslashes($t, '%_\\') . '%';
}

/** Convierte stock de BD (texto o null) a int|null. */
function stock_o_null(mixed $v): ?int
{
    return $v === null ? null : (int) $v;
}

/** Ejecuta una consulta con parámetros variables y devuelve todas las filas. */
function consultar(mysqli $c, string $sql, string $tipos = '', array $params = []): array
{
    $stmt = $c->prepare($sql);
    if ($tipos !== '') {
        $stmt->bind_param($tipos, ...$params);
    }
    $stmt->execute();
    return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
}

/** Respuesta estándar para errores no previstos (el detalle va al log del servidor). */
function error_interno(Throwable $e, string $contexto): void
{
    error_log("Panel admin — $contexto: " . $e->getMessage());
    responder_json(false, 'Ocurrió un error inesperado. Inténtalo de nuevo.', [], 500);
}
