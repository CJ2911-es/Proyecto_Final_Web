<?php
/**
 * iniciar_sesion.php — Valida correo y contraseña y abre la sesión.
 * Recibe JSON: { correo, password }
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';

const MAX_INTENTOS = 5;     // intentos fallidos permitidos
const BLOQUEO_SEG  = 60;    // segundos de espera al superarlos

exigir_post();
iniciar_sesion_segura();

// Freno básico contra intentos repetidos de adivinar la contraseña
$bloqueadoHasta = $_SESSION['bloqueo_hasta'] ?? 0;
if ($bloqueadoHasta > time()) {
    $espera = $bloqueadoHasta - time();
    responder_json(false, "Demasiados intentos. Espera $espera segundos.", [], 429);
}

$entrada  = leer_json_entrada();
$correo   = mb_strtolower(trim($entrada['correo'] ?? ''));
$password = (string) ($entrada['password'] ?? '');

if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || $password === '') {
    responder_json(false, 'Ingresa tu correo y tu contraseña.', [], 400);
}

try {
    $stmt = $conexion->prepare(
        'SELECT id_usuario, nombre, correo, password_hash, rol
         FROM usuarios
         WHERE correo = ?
         LIMIT 1'
    );
    $stmt->bind_param('s', $correo);
    $stmt->execute();
    $usuario = $stmt->get_result()->fetch_assoc();

} catch (mysqli_sql_exception $e) {
    error_log('Error al iniciar sesión: ' . $e->getMessage());
    responder_json(false, 'No se pudo iniciar sesión. Inténtalo más tarde.', [], 500);
}

// Mismo mensaje si falla el correo o la contraseña (no revela cuál de los dos)
if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
    $_SESSION['intentos_login'] = ($_SESSION['intentos_login'] ?? 0) + 1;

    if ($_SESSION['intentos_login'] >= MAX_INTENTOS) {
        $_SESSION['bloqueo_hasta']  = time() + BLOQUEO_SEG;
        $_SESSION['intentos_login'] = 0;
    }

    responder_json(false, 'Correo o contraseña incorrectos.', [], 401);
}

unset($_SESSION['intentos_login'], $_SESSION['bloqueo_hasta']);

guardar_usuario_en_sesion(
    (int) $usuario['id_usuario'],
    $usuario['nombre'],
    $usuario['correo'],
    (string) $usuario['rol']
);

responder_json(true, 'Sesión iniciada.', ['usuario' => usuario_actual()]);
