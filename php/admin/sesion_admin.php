<?php
/** sesion_admin.php — GET. Verifica que hay un administrador y entrega su token CSRF. */
require_once __DIR__ . '/_comun.php';

$admin = admin_get($conexion);

responder_json(true, 'OK', ['admin' => $admin, 'csrf' => token_csrf()]);
