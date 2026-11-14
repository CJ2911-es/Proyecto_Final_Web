<?php
/**
 * sesion.php — Funciones de sesión y de respuesta JSON compartidas
 * por todos los endpoints de la tienda.
 */

const SESION_NOMBRE = 'ALTOQUE_SESION';
const SESION_INACTIVIDAD = 1800; // 30 minutos sin actividad cierran la sesión

/**
 * Inicia la sesión con una cookie segura (HttpOnly + SameSite)
 * y la cierra si el usuario estuvo inactivo demasiado tiempo.
 */
function iniciar_sesion_segura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name(SESION_NOMBRE);
    session_set_cookie_params([
        'lifetime' => 0,                          // dura hasta cerrar el navegador
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']),  // solo HTTPS cuando está disponible
        'httponly' => true,                       // JavaScript no puede leer la cookie
        'samesite' => 'Lax',
    ]);
    session_start();

    // Caducidad por inactividad
    if (
        isset($_SESSION['ultima_actividad']) &&
        time() - $_SESSION['ultima_actividad'] > SESION_INACTIVIDAD
    ) {
        $_SESSION = [];
        session_regenerate_id(true);
    }

    $_SESSION['ultima_actividad'] = time();
}

/**
 * Cierra la sesión por completo: vacía los datos, borra la cookie y destruye la sesión.
 */
function cerrar_sesion_completa(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $p['path'],
            'domain'   => $p['domain'],
            'secure'   => $p['secure'],
            'httponly' => $p['httponly'],
            'samesite' => $p['samesite'] ?? 'Lax',
        ]);
    }

    session_destroy();
}

/**
 * Guarda al usuario en la sesión. Regenera el ID para evitar "session fixation".
 */
function guardar_usuario_en_sesion(int $id, string $nombre, string $correo, string $rol = 'cliente'): void
{
    session_regenerate_id(true);
    $_SESSION['id_usuario'] = $id;
    $_SESSION['nombre']     = $nombre;
    $_SESSION['correo']     = $correo;
    // Solo informativo para la interfaz: los permisos reales se vuelven a comprobar en la BD
    // en cada endpoint administrativo (php/admin/_comun.php), nunca se confía en este valor.
    $_SESSION['rol']        = $rol === 'admin' ? 'admin' : 'cliente';
}

/**
 * Devuelve los datos del usuario logueado o null si no hay sesión activa.
 */
function usuario_actual(): ?array
{
    if (empty($_SESSION['id_usuario'])) {
        return null;
    }

    return [
        'id'     => (int) $_SESSION['id_usuario'],
        'nombre' => $_SESSION['nombre'],
        'correo' => $_SESSION['correo'],
        'rol'    => $_SESSION['rol'] ?? 'cliente',
    ];
}

/**
 * Envía una respuesta JSON uniforme {exito, mensaje, ...datos} y termina el script.
 */
function responder_json(bool $exito, string $mensaje, array $datos = [], int $codigo = 200): void
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    echo json_encode(
        array_merge(['exito' => $exito, 'mensaje' => $mensaje], $datos),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

/**
 * Exige que la petición use el método POST (responde 405 si no).
 */
function exigir_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responder_json(false, 'Método no permitido.', [], 405);
    }
}

/**
 * Lee el cuerpo JSON de la petición y lo devuelve como arreglo.
 */
function leer_json_entrada(): array
{
    $entrada = json_decode(file_get_contents('php://input'), true);

    if (!is_array($entrada)) {
        responder_json(false, 'Los datos recibidos no son válidos.', [], 400);
    }

    return $entrada;
}
