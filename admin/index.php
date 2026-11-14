<?php
/**
 * admin/index.php — Entrada del panel administrativo.
 * Decide en el SERVIDOR qué se muestra: pantalla de acceso (sin sesión), aviso de falta de permisos
 * (sesión de cliente) o el panel (solo administradores, rol comprobado en la BD).
 * Los datos del panel nunca van aquí: se piden a php/admin/*.php, que vuelven a verificar el permiso.
 */
require_once __DIR__ . '/../php/admin/_comun.php';

header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

$u = usuario_actual();
$admin = null;

if ($u !== null) {
    try {
        $stmt = $conexion->prepare("SELECT id_usuario, nombre, correo FROM usuarios WHERE id_usuario = ? AND rol = 'admin' LIMIT 1");
        $stmt->bind_param('i', $u['id']);
        $stmt->execute();
        $admin = $stmt->get_result()->fetch_assoc() ?: null;
    } catch (mysqli_sql_exception $e) {
        error_log('admin/index.php: ' . $e->getMessage());
    }
}

$modo = $u === null ? 'login' : ($admin ? 'panel' : 'sinpermiso');
$e = static fn($t) => htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8');

$iconos = [
    'inicio'     => '<path d="M3 11 12 3l9 8M5 10v10h14V10"/>',
    'productos'  => '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    'inventario' => '<path d="M4 6h16M4 12h16M4 18h10"/>',
    'historial'  => '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
    'pedidos'    => '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
];
$svg = static fn($n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $iconos[$n] . '</svg>';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <?php if ($modo === 'panel'): ?><meta name="csrf" content="<?= $e(token_csrf()) ?>"><?php endif; ?>
    <title>Panel administrativo | Tecnología Altoque</title>
    <link rel="stylesheet" href="admin.css">
</head>
<body data-modo="<?= $e($modo) ?>">

<?php if ($modo !== 'panel'): ?>
    <main class="acceso">
        <div class="acceso-caja">
            <img class="acceso-logo" src="../img/logo.jpg" alt="Tecnología Altoque">
            <?php if ($modo === 'login'): ?>
                <h1>Panel administrativo</h1>
                <p class="sub">Acceso solo para administradores.</p>
                <form id="formAcceso" novalidate>
                    <label>Correo
                        <input type="email" id="aCorreo" autocomplete="username" required>
                    </label>
                    <label>Contraseña
                        <input type="password" id="aClave" autocomplete="current-password" required>
                    </label>
                    <p class="error-form" id="aError" role="alert" hidden></p>
                    <button class="btn btn-primario ancho" type="submit">Ingresar</button>
                </form>
            <?php else: ?>
                <h1>Sin permisos</h1>
                <p class="sub">La cuenta <strong><?= $e($u['correo']) ?></strong> no es administradora.</p>
                <button class="btn btn-secundario ancho" id="btnSalirAcceso" type="button">Cerrar sesión</button>
            <?php endif; ?>
            <a class="volver-tienda" href="../index.html">← Volver a la tienda</a>
        </div>
    </main>

<?php else: ?>
    <div class="layout">
        <aside class="sidebar" id="sidebar">
            <a class="marca" href="#dashboard"><img src="../img/logo.jpg" alt="Tecnología Altoque"><span>Administración</span></a>
            <nav class="menu" id="menu">
                <a href="#dashboard"  data-vista="dashboard"><?= $svg('inicio') ?>Resumen</a>
                <a href="#productos"  data-vista="productos"><?= $svg('productos') ?>Productos</a>
                <a href="#inventario" data-vista="inventario"><?= $svg('inventario') ?>Inventario</a>
                <a href="#movimientos" data-vista="movimientos"><?= $svg('historial') ?>Movimientos</a>
                <a href="#pedidos"    data-vista="pedidos"><?= $svg('pedidos') ?>Pedidos</a>
            </nav>
            <div class="usuario-box">
                <strong><?= $e($admin['nombre']) ?></strong>
                <span><?= $e($admin['correo']) ?></span>
                <a href="../index.html" target="_blank" rel="noopener">Ver tienda ↗</a>
                <button class="btn btn-fantasma" id="btnSalir" type="button">Cerrar sesión</button>
            </div>
        </aside>
        <div class="velo" id="velo"></div>

        <main class="contenido">
            <header class="topbar">
                <button class="btn-menu-mov" id="btnMenuMov" type="button" aria-label="Abrir menú">☰</button>
                <h1 id="titulo">Resumen</h1>
            </header>
            <div id="vista" aria-live="polite"></div>
        </main>
    </div>

    <!-- Ventana genérica (formularios y detalles) -->
    <div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
        <div class="modal-caja" id="modalCaja">
            <header class="modal-cab"><h2 id="modalTitulo"></h2><button class="modal-x" id="modalX" type="button" aria-label="Cerrar">✕</button></header>
            <div class="modal-cuerpo" id="modalCuerpo"></div>
        </div>
    </div>

    <!-- Confirmación de operaciones sensibles -->
    <div class="modal" id="confirmar" role="alertdialog" aria-modal="true" aria-labelledby="confTitulo">
        <div class="modal-caja pequena">
            <header class="modal-cab"><h2 id="confTitulo">Confirmar</h2></header>
            <div class="modal-cuerpo">
                <p id="confTexto"></p>
                <div class="acciones"><button class="btn btn-secundario" id="confNo" type="button">Cancelar</button><button class="btn btn-primario" id="confSi" type="button">Confirmar</button></div>
            </div>
        </div>
    </div>

    <div class="toasts" id="toasts" aria-live="polite"></div>
<?php endif; ?>

<script src="admin.js"></script>
</body>
</html>
