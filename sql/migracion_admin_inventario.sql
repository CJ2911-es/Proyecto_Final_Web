-- ==========================================================================
-- migracion_admin_inventario.sql
-- Panel administrativo + inventario de Tecnología Altoque.
--
-- SEGURA Y REPETIBLE: solo AGREGA columnas y tablas (IF NOT EXISTS).
--   · No borra ni modifica filas existentes (productos, usuarios, pedidos,
--     especificaciones y clientes quedan intactos).
--   · Todos los usuarios actuales quedan como 'cliente'. Nadie se vuelve
--     administrador automáticamente: ver herramientas/promover_admin.php.
--   · NO inventa existencias: stock queda en NULL ("sin inicializar") hasta
--     que el administrador lo configure desde el panel (Inventario).
--
-- Requiere MariaDB 10.5+ (probado en 10.11). Ejecutar en phpMyAdmin sobre la
-- base `tecnologia_altoque`, o:  mariadb tecnologia_altoque < sql/migracion_admin_inventario.sql
-- ==========================================================================

-- 1. Roles de usuario ------------------------------------------------------
-- 'cliente' (por defecto, también para el registro público) o 'admin'.
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `rol` ENUM('cliente','admin') NOT NULL DEFAULT 'cliente' AFTER `password_hash`;

-- 2. Existencias en productos ---------------------------------------------
--   stock        NULL = inventario sin inicializar (no se controla ni se descuenta).
--                0    = agotado.   N > 0 = unidades disponibles.
--   stock_minimo umbral para marcar "stock bajo" (ajustable por producto).
ALTER TABLE `productos`
  ADD COLUMN IF NOT EXISTS `stock` INT UNSIGNED NULL DEFAULT NULL AFTER `emoji`,
  ADD COLUMN IF NOT EXISTS `stock_minimo` INT UNSIGNED NOT NULL DEFAULT 5 AFTER `stock`;

-- 3. Historial de movimientos de inventario -------------------------------
--   Tipos: entrada, salida, ajuste, venta (descuento por compra) y
--   devolucion (reposición al cancelar un pedido).
--   cantidad = unidades que entran o salen (en un ajuste, la diferencia).
--   stock_anterior es NULL cuando el producto aún no tenía inventario inicializado.
CREATE TABLE IF NOT EXISTS `movimientos_inventario` (
  `id_movimiento`   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_producto`     INT NOT NULL,
  `tipo`            ENUM('entrada','salida','ajuste','venta','devolucion') NOT NULL,
  `cantidad`        INT UNSIGNED NOT NULL,
  `stock_anterior`  INT UNSIGNED NULL,
  `stock_resultante` INT UNSIGNED NOT NULL,
  `motivo`          VARCHAR(255) NOT NULL,
  `id_usuario`      INT UNSIGNED NULL,
  `id_pedido`       INT NULL,
  `fecha`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_movimiento`),
  KEY `idx_mov_producto_fecha` (`id_producto`, `fecha`),
  KEY `idx_mov_fecha` (`fecha`),
  KEY `idx_mov_pedido` (`id_pedido`),
  KEY `idx_mov_usuario` (`id_usuario`),
  CONSTRAINT `fk_mov_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  CONSTRAINT `fk_mov_usuario`  FOREIGN KEY (`id_usuario`)  REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_mov_pedido`   FOREIGN KEY (`id_pedido`)   REFERENCES `pedidos` (`id_pedido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
