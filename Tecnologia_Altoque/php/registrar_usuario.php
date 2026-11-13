<?php
/**
 * registrar_usuario.php — Crea una cuenta nueva e inicia sesión automáticamente.
 * Recibe JSON: { nombre, correo, password, confirmar }
 */
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/conexion.php';

exigir_post();
iniciar_sesion_segura();

$entrada   = leer_json_entrada();
$nombre    = trim($entrada['nombre'] ?? '');
$correo    = mb_strtolower(trim($entrada['correo'] ?? ''));
$password  = (string) ($entrada['password'] ?? '');
$confirmar = (string) ($entrada['confirmar'] ?? '');

// Validaciones del lado del servidor (nunca confiar solo en el JavaScript)
if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 120) {
    responder_json(false, 'El nombre debe tener entre 3 y 120 caracteres.', [], 400);
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || mb_strlen($correo) > 150) {
    responder_json(false, 'Ingresa un correo válido.', [], 400);
}

// bcrypt solo usa los primeros 72 bytes, por eso ese es el máximo
if (
    strlen($password) < 8 || strlen($password) > 72 ||
    !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)
) {
    responder_json(false, 'La contraseña debe tener entre 8 y 72 caracteres, con letras y números.', [], 400);
}

if ($password !== $confirmar) {
    responder_json(false, 'Las contraseñas no coinciden.', [], 400);
}

try {
    // La contraseña NUNCA se guarda en texto plano: se guarda su hash
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conexion->prepare(
        'INSERT INTO usuarios (nombre, correo, password_hash) VALUES (?, ?, ?)'
    );
    $stmt->bind_param('sss', $nombre, $correo, $hash);
    $stmt->execute();

    $idUsuario = (int) $conexion->insert_id;

} catch (mysqli_sql_exception $e) {
    // Código 1062 = valor duplicado (el correo ya existe, es UNIQUE)
    if ((int) $e->getCode() === 1062) {
        responder_json(false, 'Ese correo ya está registrado. Inicia sesión.', [], 409);
    }

    error_log('Error al registrar usuario: ' . $e->getMessage());
    responder_json(false, 'No se pudo crear la cuenta. Inténtalo más tarde.', [], 500);
}

guardar_usuario_en_sesion($idUsuario, $nombre, $correo);

responder_json(true, 'Cuenta creada correctamente.', ['usuario' => usuario_actual()]);
