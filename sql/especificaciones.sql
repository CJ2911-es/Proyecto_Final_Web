-- Ejecutar UNA vez en la base "tecnologia_altoque" (phpMyAdmin > SQL).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT NULL;

CREATE TABLE IF NOT EXISTS especificaciones (
    id_especificacion INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_producto       INT NOT NULL,
    atributo          VARCHAR(80)  NOT NULL,
    valor             VARCHAR(255) NOT NULL,
    orden             TINYINT UNSIGNED NOT NULL DEFAULT 0,
    INDEX idx_especificaciones_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ejemplo (cambia el 1 y los datos por los reales):
-- UPDATE productos SET descripcion = 'Texto corto del producto.' WHERE id_producto = 1;
-- INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
--     (1, 'Conectividad', 'Inalámbrica 2.4 GHz', 1),
--     (1, 'Garantía',     '12 meses',             2);
