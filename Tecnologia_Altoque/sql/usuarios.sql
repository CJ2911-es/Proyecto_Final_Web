-- Tabla de usuarios para el inicio de sesión de Tecnología Altoque.
-- Ejecutar UNA vez en la base de datos "tecnologia_altoque" (phpMyAdmin > SQL).

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario     INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    correo         VARCHAR(150) NOT NULL UNIQUE,   -- UNIQUE: un correo = una cuenta
    password_hash  VARCHAR(255) NOT NULL,          -- hash de password_hash(), nunca la contraseña
    fecha_registro TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
