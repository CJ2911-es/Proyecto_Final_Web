<?php
/**
 * estado_sesion.php — Indica si hay un usuario con sesión iniciada.
 * El JavaScript lo consulta al cargar la página para mostrar "Ingresar" o el nombre.
 */
require_once __DIR__ . '/sesion.php';

iniciar_sesion_segura();

$usuario = usuario_actual();

responder_json(true, 'OK', [
    'autenticado' => $usuario !== null,
    'usuario'     => $usuario,
]);
