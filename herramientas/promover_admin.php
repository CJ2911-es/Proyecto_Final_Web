<?php
/**
 * promover_admin.php — Crea o promueve al PRIMER administrador. SOLO por línea de comandos (CLI).
 *
 * Uso (desde la carpeta del proyecto):
 *   php herramientas/promover_admin.php correo@ejemplo.com          Promueve a un usuario ya registrado.
 *   php herramientas/promover_admin.php correo@ejemplo.com --crear  Crea la cuenta (pide nombre y contraseña).
 *   php herramientas/promover_admin.php correo@ejemplo.com --quitar Devuelve la cuenta al rol de cliente.
 *
 * No contiene ni acepta contraseñas por argumentos: si se crea una cuenta, la contraseña se escribe
 * por teclado (sin mostrarse) y se guarda únicamente su hash. Usa las credenciales de php/config.php.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Esta herramienta solo se puede ejecutar desde la línea de comandos.');
}

$argumentos = array_slice($argv, 1);
$correo = mb_strtolower(trim((string) ($argumentos[0] ?? '')));
$crear  = in_array('--crear', $argumentos, true);
$quitar = in_array('--quitar', $argumentos, true);

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Uso: php herramientas/promover_admin.php correo@ejemplo.com [--crear | --quitar]\n");
    exit(1);
}

require_once __DIR__ . '/../php/conexion.php'; // $conexion (mysqli)

function pedir(string $texto, bool $oculto = false): string
{
    echo $texto;
    if ($oculto && DIRECTORY_SEPARATOR === '/') { shell_exec('stty -echo 2>/dev/null'); }
    $valor = trim((string) fgets(STDIN));
    if ($oculto && DIRECTORY_SEPARATOR === '/') { shell_exec('stty echo 2>/dev/null'); echo "\n"; }
    return $valor;
}

try {
    $stmt = $conexion->prepare('SELECT id_usuario, nombre, rol FROM usuarios WHERE correo = ? LIMIT 1');
    $stmt->bind_param('s', $correo);
    $stmt->execute();
    $usuario = $stmt->get_result()->fetch_assoc();

    if ($crear) {
        if ($usuario) {
            fwrite(STDERR, "Ya existe una cuenta con ese correo. Ejecuta el comando sin --crear para promoverla.\n");
            exit(1);
        }

        $nombre = pedir('Nombre completo: ');
        $clave  = pedir('Contraseña (8-72 caracteres, con letras y números): ', true);
        $repite = pedir('Repite la contraseña: ', true);

        if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 120) { fwrite(STDERR, "Nombre no válido.\n"); exit(1); }
        if (strlen($clave) < 8 || strlen($clave) > 72 || !preg_match('/[A-Za-z]/', $clave) || !preg_match('/\d/', $clave)) {
            fwrite(STDERR, "La contraseña debe tener entre 8 y 72 caracteres, con letras y números.\n");
            exit(1);
        }
        if ($clave !== $repite) { fwrite(STDERR, "Las contraseñas no coinciden.\n"); exit(1); }

        $hash = password_hash($clave, PASSWORD_DEFAULT);
        $ins = $conexion->prepare("INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, 'admin')");
        $ins->bind_param('sss', $nombre, $correo, $hash);
        $ins->execute();
        echo "Administrador creado: $correo\n";
        exit(0);
    }

    if (!$usuario) {
        fwrite(STDERR, "No existe ninguna cuenta con ese correo. Regístrala en la tienda o usa --crear.\n");
        exit(1);
    }

    $nuevoRol = $quitar ? 'cliente' : 'admin';

    if ($usuario['rol'] === $nuevoRol) {
        echo "{$usuario['nombre']} ya tiene el rol '$nuevoRol'. No se cambió nada.\n";
        exit(0);
    }

    $upd = $conexion->prepare('UPDATE usuarios SET rol = ? WHERE id_usuario = ?');
    $upd->bind_param('si', $nuevoRol, $usuario['id_usuario']);
    $upd->execute();
    echo "Listo: {$usuario['nombre']} ($correo) ahora tiene el rol '$nuevoRol'.\n";

} catch (mysqli_sql_exception $e) {
    fwrite(STDERR, 'Error de base de datos (¿ejecutaste sql/migracion_admin_inventario.sql?): ' . $e->getMessage() . "\n");
    exit(1);
}
