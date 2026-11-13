<?php
/**
 * cerrar_sesion.php — Cierra la sesión del usuario (logout).
 */
require_once __DIR__ . '/sesion.php';

exigir_post();
iniciar_sesion_segura();
cerrar_sesion_completa();

responder_json(true, 'Sesión cerrada.');
