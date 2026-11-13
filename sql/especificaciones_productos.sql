-- Especificaciones y descripciones de los 43 productos de Tecnología Altoque.
-- Ejecutar en phpMyAdmin: base "tecnologia_altoque" > pestaña SQL (o Importar).
-- Se puede ejecutar varias veces: borra y vuelve a cargar las especificaciones.
-- REVISA antes de exponer: laptops, celulares, UPS y lector Honeywell tienen
-- datos generales porque la versión exacta depende del modelo que vendas.

ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT NULL;

CREATE TABLE IF NOT EXISTS especificaciones (
    id_especificacion INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_producto       INT NOT NULL,
    atributo          VARCHAR(80)  NOT NULL,
    valor             VARCHAR(255) NOT NULL,
    orden             TINYINT UNSIGNED NOT NULL DEFAULT 0,
    INDEX idx_especificaciones_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM especificaciones;

-- Producto 1
UPDATE productos SET descripcion = 'Mouse gamer con cable y sensor HERO de alta precisión. Ofrece 11 botones programables, pesas ajustables y iluminación RGB personalizable.' WHERE id_producto = 1;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (1, 'Sensor', 'HERO 25K', 1),
    (1, 'Resolución', '100 – 25 600 DPI', 2),
    (1, 'Botones', '11 programables', 3),
    (1, 'Conexión', 'USB con cable', 4),
    (1, 'Iluminación', 'RGB LIGHTSYNC', 5),
    (1, 'Peso', '121 g (sin cable), con pesas ajustables', 6);

-- Producto 2
UPDATE productos SET descripcion = 'Mouse inalámbrico gamer con tecnología LIGHTSPEED: respuesta ultrarrápida, muy ligero y con una pila AA que dura meses.' WHERE id_producto = 2;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (2, 'Sensor', 'HERO 12K', 1),
    (2, 'Resolución', '200 – 12 000 DPI', 2),
    (2, 'Botones', '6 programables', 3),
    (2, 'Conexión', 'Inalámbrica LIGHTSPEED 2.4 GHz', 4),
    (2, 'Batería', '1 pila AA, hasta 250 horas', 5),
    (2, 'Peso', '99 g (con pila)', 6);

-- Producto 3
UPDATE productos SET descripcion = 'Mouse gamer con cable, sencillo y confiable, con iluminación RGB personalizable y diseño cómodo para largas sesiones.' WHERE id_producto = 3;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (3, 'Sensor', 'Óptico', 1),
    (3, 'Resolución', '200 – 8 000 DPI', 2),
    (3, 'Botones', '6 programables', 3),
    (3, 'Conexión', 'USB con cable', 4),
    (3, 'Iluminación', 'RGB LIGHTSYNC', 5),
    (3, 'Peso', '85 g (sin cable)', 6);

-- Producto 4
UPDATE productos SET descripcion = 'Mouse inalámbrico ultraligero para esports, con sensor HERO de máxima precisión y conexión LIGHTSPEED. Edición en color rosa.' WHERE id_producto = 4;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (4, 'Sensor', 'HERO 25K', 1),
    (4, 'Resolución', '100 – 25 600 DPI', 2),
    (4, 'Botones', '5 programables', 3),
    (4, 'Conexión', 'Inalámbrica LIGHTSPEED 2.4 GHz', 4),
    (4, 'Batería', 'Hasta 70 horas', 5),
    (4, 'Peso', 'Menos de 63 g', 6),
    (4, 'Color', 'Rosa', 7);

-- Producto 5
UPDATE productos SET descripcion = 'Teclado mecánico compacto, sin bloque numérico, con switches mecánicos e iluminación LED. Ideal para gaming y escritura.' WHERE id_producto = 5;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (5, 'Tipo', 'Mecánico', 1),
    (5, 'Formato', 'Compacto de 87 teclas (sin bloque numérico)', 2),
    (5, 'Switches', 'Mecánicos Outemu', 3),
    (5, 'Conexión', 'USB con cable', 4),
    (5, 'Anti-ghosting', 'Sí', 5),
    (5, 'Iluminación', 'LED retroiluminado', 6);

-- Producto 6
UPDATE productos SET descripcion = 'Audífonos gamer de diadema con sonido envolvente virtual 7.1, micrófono desmontable y almohadillas de espuma muy cómodas.' WHERE id_producto = 6;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (6, 'Tipo', 'Over-ear con cable', 1),
    (6, 'Drivers', '53 mm', 2),
    (6, 'Respuesta de frecuencia', '15 Hz – 25 kHz', 3),
    (6, 'Impedancia', '60 Ω', 4),
    (6, 'Micrófono', 'Desmontable con cancelación de ruido', 5),
    (6, 'Conexión', '3.5 mm y USB (tarjeta de sonido 7.1)', 6),
    (6, 'Peso', '320 g', 7);

-- Producto 7
UPDATE productos SET descripcion = 'Parlante Bluetooth portátil con sonido potente, resistente al agua y al polvo, y hasta 12 horas de batería.' WHERE id_producto = 7;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (7, 'Conectividad', 'Bluetooth 5.1', 1),
    (7, 'Potencia', '20 W', 2),
    (7, 'Batería', 'Hasta 12 horas', 3),
    (7, 'Resistencia', 'IP67 (agua y polvo)', 4),
    (7, 'Función', 'PartyBoost para conectar varios parlantes', 5),
    (7, 'Peso', '550 g', 6);

-- Producto 8
UPDATE productos SET descripcion = 'Laptop gamer con diseño resistente, pantalla de alta frecuencia y tarjeta gráfica NVIDIA GeForce RTX para jugar y crear contenido.' WHERE id_producto = 8;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (8, 'Pantalla', '15.6" Full HD, alta frecuencia (144 Hz)', 1),
    (8, 'Procesador', 'Intel Core serie H', 2),
    (8, 'Gráficos', 'NVIDIA GeForce RTX', 3),
    (8, 'Memoria RAM', '8 – 16 GB DDR4', 4),
    (8, 'Almacenamiento', 'SSD NVMe', 5),
    (8, 'Sistema operativo', 'Windows 11', 6),
    (8, 'Resistencia', 'Certificación militar MIL-STD-810H', 7);

-- Producto 9
UPDATE productos SET descripcion = 'Laptop para el hogar, estudios y oficina: pantalla amplia de 15.6", rendimiento fluido y diseño liviano.' WHERE id_producto = 9;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (9, 'Pantalla', '15.6" Full HD', 1),
    (9, 'Procesador', 'Intel Core i5 o AMD Ryzen 5 (según versión)', 2),
    (9, 'Memoria RAM', '8 GB', 3),
    (9, 'Almacenamiento', 'SSD', 4),
    (9, 'Sistema operativo', 'Windows 11', 5),
    (9, 'Uso recomendado', 'Oficina y estudios', 6);

-- Producto 10
UPDATE productos SET descripcion = 'Smartphone 5G con pantalla Super AMOLED de 120 Hz, cámara principal de 50 MP con estabilizador y resistencia al agua y al polvo.' WHERE id_producto = 10;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (10, 'Pantalla', '6.6" Super AMOLED FHD+, 120 Hz', 1),
    (10, 'Procesador', 'Exynos 1480', 2),
    (10, 'Memoria RAM', '8 GB', 3),
    (10, 'Almacenamiento', '128 / 256 GB', 4),
    (10, 'Cámara principal', '50 MP con OIS + 12 MP ultra gran angular + 5 MP macro', 5),
    (10, 'Cámara frontal', '32 MP', 6),
    (10, 'Batería', '5000 mAh, carga de 25 W', 7),
    (10, 'Resistencia', 'IP67', 8),
    (10, 'Conectividad', '5G', 9);

-- Producto 11
UPDATE productos SET descripcion = 'Router Wi-Fi 6 de doble banda con velocidades de hasta 1800 Mbps y 4 antenas para una conexión estable en todo el hogar.' WHERE id_producto = 11;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (11, 'Estándar', 'Wi-Fi 6 (AX1800)', 1),
    (11, 'Velocidad', '574 Mbps (2.4 GHz) + 1201 Mbps (5 GHz)', 2),
    (11, 'Puertos', '4 LAN Gigabit + 1 WAN Gigabit', 3),
    (11, 'Antenas', '4 externas', 4),
    (11, 'Tecnologías', 'OFDMA y MU-MIMO', 5),
    (11, 'Seguridad', 'WPA3', 6);

-- Producto 12
UPDATE productos SET descripcion = 'Silla gamer ergonómica con respaldo reclinable y reposabrazos ajustables, pensada para largas jornadas de juego o trabajo.' WHERE id_producto = 12;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (12, 'Tipo', 'Silla gamer ergonómica', 1),
    (12, 'Material', 'Cuero sintético', 2),
    (12, 'Respaldo', 'Reclinable', 3),
    (12, 'Reposabrazos', 'Ajustables', 4),
    (12, 'Estructura', 'Base metálica con ruedas', 5),
    (12, 'Incluye', 'Cojines de cuello y lumbar', 6);

-- Producto 13
UPDATE productos SET descripcion = 'Monitor gamer de 24" con alta frecuencia de actualización y tiempo de respuesta de 1 ms para una imagen fluida.' WHERE id_producto = 13;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (13, 'Tamaño', '24"', 1),
    (13, 'Resolución', '1920 × 1080 (Full HD)', 2),
    (13, 'Frecuencia', '144 Hz', 3),
    (13, 'Tiempo de respuesta', '1 ms', 4),
    (13, 'Panel', 'VA', 5),
    (13, 'Entradas', 'HDMI y DisplayPort', 6),
    (13, 'Sincronización', 'AMD FreeSync Premium', 7);

-- Producto 14
UPDATE productos SET descripcion = 'Laptop de 15.6" con procesador Intel Core i5, ideal para trabajo, estudios y uso diario con buen rendimiento.' WHERE id_producto = 14;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (14, 'Pantalla', '15.6" Full HD', 1),
    (14, 'Procesador', 'Intel Core i5', 2),
    (14, 'Memoria RAM', '8 GB', 3),
    (14, 'Almacenamiento', 'SSD', 4),
    (14, 'Sistema operativo', 'Windows 11', 5),
    (14, 'Uso recomendado', 'Oficina y estudios', 6);

-- Producto 15
UPDATE productos SET descripcion = 'Laptop gamer con tarjeta gráfica NVIDIA GeForce RTX 4050 y pantalla de 144 Hz para jugar los títulos más actuales.' WHERE id_producto = 15;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (15, 'Pantalla', '15.6" Full HD, 144 Hz', 1),
    (15, 'Procesador', 'Intel Core serie H (12.ª gen)', 2),
    (15, 'Gráficos', 'NVIDIA GeForce RTX 4050 6 GB GDDR6', 3),
    (15, 'Memoria RAM', '8 – 16 GB DDR4', 4),
    (15, 'Almacenamiento', 'SSD NVMe 512 GB', 5),
    (15, 'Sistema operativo', 'Windows 11', 6);

-- Producto 16
UPDATE productos SET descripcion = 'Laptop con procesador AMD Ryzen 7 para trabajo exigente, multitarea y estudios, con pantalla Full HD de 15.6".' WHERE id_producto = 16;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (16, 'Pantalla', '15.6" Full HD', 1),
    (16, 'Procesador', 'AMD Ryzen 7', 2),
    (16, 'Memoria RAM', '16 GB', 3),
    (16, 'Almacenamiento', 'SSD 512 GB', 4),
    (16, 'Sistema operativo', 'Windows 11', 5),
    (16, 'Uso recomendado', 'Oficina y multitarea', 6);

-- Producto 17
UPDATE productos SET descripcion = 'Workstation móvil compacta y resistente para profesionales: potencia, seguridad empresarial y portabilidad en 14".' WHERE id_producto = 17;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (17, 'Pantalla', '14" Full HD', 1),
    (17, 'Procesador', 'Intel Core i7', 2),
    (17, 'Gráficos', 'NVIDIA profesional', 3),
    (17, 'Memoria RAM', '16 GB', 4),
    (17, 'Almacenamiento', 'SSD 512 GB', 5),
    (17, 'Resistencia', 'Certificación militar MIL-STD-810H', 6),
    (17, 'Uso recomendado', 'Diseño, ingeniería y trabajo profesional', 7);

-- Producto 18
UPDATE productos SET descripcion = 'Unidad de estado sólido NVMe de 1 TB: arranque rápido y carga veloz de programas y juegos.' WHERE id_producto = 18;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (18, 'Capacidad', '1 TB', 1),
    (18, 'Formato', 'M.2 2280', 2),
    (18, 'Interfaz', 'NVMe PCIe 4.0 x4', 3),
    (18, 'Lectura secuencial', 'Hasta 3 500 MB/s', 4),
    (18, 'Escritura secuencial', 'Hasta 2 100 MB/s', 5);

-- Producto 19
UPDATE productos SET descripcion = 'Multifuncional con sistema de tinta continua de bajo costo por página: imprime, copia y escanea con conexión Wi-Fi.' WHERE id_producto = 19;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (19, 'Tipo', 'Multifuncional de tinta continua', 1),
    (19, 'Funciones', 'Imprime, copia y escanea', 2),
    (19, 'Conectividad', 'USB, Wi-Fi y Wi-Fi Direct', 3),
    (19, 'Resolución de impresión', 'Hasta 5760 × 1440 dpi', 4),
    (19, 'Velocidad', '10 ipm negro / 5 ipm color', 5),
    (19, 'Rendimiento de botellas', '4 500 págs. negro / 7 500 págs. color', 6);

-- Producto 20
UPDATE productos SET descripcion = 'Reloj inteligente con pantalla AMOLED grande, GPS integrado, llamadas por Bluetooth y batería de hasta 24 días.' WHERE id_producto = 20;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (20, 'Pantalla', 'AMOLED de 2.07"', 1),
    (20, 'Batería', 'Hasta 24 días', 2),
    (20, 'GPS', 'Integrado', 3),
    (20, 'Resistencia al agua', '5 ATM', 4),
    (20, 'Conectividad', 'Bluetooth (llamadas desde el reloj)', 5),
    (20, 'Compatibilidad', 'Android e iOS', 6);

-- Producto 21
UPDATE productos SET descripcion = 'UPS que protege tu computadora y equipos de apagones, picos y bajas de tensión, y te da tiempo para guardar tu trabajo.' WHERE id_producto = 21;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (21, 'Capacidad', '750 VA', 1),
    (21, 'Tecnología', 'Línea interactiva con regulador de voltaje (AVR)', 2),
    (21, 'Voltaje', '220 V', 3),
    (21, 'Protección', 'Sobrecarga y cortocircuito', 4),
    (21, 'Uso recomendado', 'PC, router, módem y equipos de oficina', 5);

-- Producto 22
UPDATE productos SET descripcion = 'Suite de Microsoft con licencia perpetua (pago único) para uso en casa y en el negocio. Entrega digital.' WHERE id_producto = 22;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (22, 'Incluye', 'Word, Excel, PowerPoint, Outlook y OneNote', 1),
    (22, 'Licencia', 'Perpetua (pago único)', 2),
    (22, 'Dispositivos', '1 PC o Mac', 3),
    (22, 'Idioma', 'Español', 4),
    (22, 'Entrega', 'Digital (clave de activación)', 5);

-- Producto 23
UPDATE productos SET descripcion = 'Lector de códigos de barras para punto de venta: escaneo rápido y preciso, listo para conectar a tu computadora.' WHERE id_producto = 23;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (23, 'Tipo', 'Lector de códigos de barras', 1),
    (23, 'Marca', 'Honeywell', 2),
    (23, 'Conexión', 'USB', 3),
    (23, 'Uso recomendado', 'Tiendas, bodegas y punto de venta', 4),
    (23, 'Compatibilidad', 'PC con Windows', 5);

-- Producto 24
UPDATE productos SET descripcion = 'Mouse gamer con cable de diseño ergonómico, sensor óptico de 6 400 DPI y switches duraderos. Ideal para empezar a jugar.' WHERE id_producto = 24;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (24, 'Sensor', 'Óptico de 6 400 DPI', 1),
    (24, 'Botones', '5 programables', 2),
    (24, 'Conexión', 'USB con cable', 3),
    (24, 'Diseño', 'Ergonómico para diestros', 4),
    (24, 'Durabilidad', 'Switches de hasta 10 millones de clics', 5),
    (24, 'Peso', '96 g', 6);

-- Producto 25
UPDATE productos SET descripcion = 'Teclado inalámbrico compacto, delgado y silencioso. Conecta hasta 3 dispositivos y cambia entre ellos con un botón.' WHERE id_producto = 25;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (25, 'Conexión', 'Bluetooth (hasta 3 dispositivos)', 1),
    (25, 'Batería', '2 pilas AAA, hasta 24 meses', 2),
    (25, 'Compatibilidad', 'Windows, macOS, iOS, Android y Chrome OS', 3),
    (25, 'Alcance', '10 m', 4),
    (25, 'Peso', '423 g', 5);

-- Producto 26
UPDATE productos SET descripcion = 'Teclado mecánico gamer con iluminación Razer Chroma RGB, reposamuñecas magnético y controles multimedia.' WHERE id_producto = 26;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (26, 'Tipo', 'Mecánico, tamaño completo', 1),
    (26, 'Switches', 'Mecánicos Razer', 2),
    (26, 'Iluminación', 'Razer Chroma RGB', 3),
    (26, 'Conexión', 'USB con cable', 4),
    (26, 'Extras', 'Reposamuñecas y controles multimedia', 5);

-- Producto 27
UPDATE productos SET descripcion = 'Mousepad gamer de tela con superficie lisa para deslizamiento preciso, bordes cosidos y base antideslizante.' WHERE id_producto = 27;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (27, 'Tipo', 'Mousepad gamer', 1),
    (27, 'Superficie', 'Tela de microtextura', 2),
    (27, 'Base', 'Goma antideslizante', 3),
    (27, 'Bordes', 'Cosidos (más duración)', 4),
    (27, 'Compatibilidad', 'Mouse óptico y láser', 5);

-- Producto 28
UPDATE productos SET descripcion = 'Webcam Full HD con enfoque automático y micrófonos estéreo, ideal para videollamadas, clases y transmisiones.' WHERE id_producto = 28;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (28, 'Resolución', '1080p a 30 fps', 1),
    (28, 'Campo de visión', '78°', 2),
    (28, 'Enfoque', 'Automático', 3),
    (28, 'Micrófono', 'Doble estéreo integrado', 4),
    (28, 'Conexión', 'USB-A', 5),
    (28, 'Compatibilidad', 'Windows y macOS', 6);

-- Producto 29
UPDATE productos SET descripcion = 'Audífonos gamer inalámbricos y livianos, con conexión LIGHTSPEED o Bluetooth y micrófono integrado.' WHERE id_producto = 29;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (29, 'Conexión', 'LIGHTSPEED 2.4 GHz y Bluetooth', 1),
    (29, 'Drivers', '40 mm', 2),
    (29, 'Batería', 'Hasta 18 horas', 3),
    (29, 'Micrófono', 'Doble integrado', 4),
    (29, 'Peso', '165 g', 5);

-- Producto 30
UPDATE productos SET descripcion = 'Audífonos premium con cancelación de ruido líder en su categoría, sonido de alta calidad y hasta 30 horas de batería.' WHERE id_producto = 30;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (30, 'Tipo', 'Over-ear inalámbrico', 1),
    (30, 'Cancelación de ruido', 'Activa, con 8 micrófonos', 2),
    (30, 'Drivers', '30 mm', 3),
    (30, 'Batería', 'Hasta 30 horas (con cancelación activada)', 4),
    (30, 'Carga rápida', '3 min = 3 horas de uso', 5),
    (30, 'Conectividad', 'Bluetooth 5.2 con multipunto', 6),
    (30, 'Peso', '250 g', 7);

-- Producto 31
UPDATE productos SET descripcion = 'Parlante Bluetooth potente con batería de hasta 20 horas, resistente al agua y al polvo, que además carga tu celular.' WHERE id_producto = 31;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (31, 'Conectividad', 'Bluetooth 5.1', 1),
    (31, 'Potencia', '30 W', 2),
    (31, 'Batería', 'Hasta 20 horas', 3),
    (31, 'Resistencia', 'IP67 (agua y polvo)', 4),
    (31, 'Extra', 'Funciona como power bank (USB-A)', 5),
    (31, 'Peso', '960 g', 6);

-- Producto 32
UPDATE productos SET descripcion = 'Micrófono USB de estudio para streaming, podcast y gaming, con cuatro patrones de captación y silencio con un toque.' WHERE id_producto = 32;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (32, 'Conexión', 'USB', 1),
    (32, 'Patrones polares', '4: estéreo, omnidireccional, cardioide y bidireccional', 2),
    (32, 'Resolución', '16 bits / 48 kHz', 3),
    (32, 'Respuesta de frecuencia', '20 Hz – 20 kHz', 4),
    (32, 'Extras', 'Silencio táctil y soporte antivibración', 5);

-- Producto 33
UPDATE productos SET descripcion = 'Memoria RAM DDR4 de 16 GB para mejorar la velocidad y la multitarea de tu PC o tu laptop gamer.' WHERE id_producto = 33;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (33, 'Capacidad', '16 GB (1 × 16 GB)', 1),
    (33, 'Tipo', 'DDR4', 2),
    (33, 'Velocidad', '3200 MHz', 3),
    (33, 'Voltaje', '1.35 V', 4),
    (33, 'Perfil', 'Intel XMP', 5);

-- Producto 34
UPDATE productos SET descripcion = 'SSD NVMe de alto rendimiento con velocidades de lectura y escritura muy superiores a un disco tradicional.' WHERE id_producto = 34;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (34, 'Capacidad', '1 TB', 1),
    (34, 'Formato', 'M.2 2280', 2),
    (34, 'Interfaz', 'NVMe PCIe 3.0 x4', 3),
    (34, 'Lectura secuencial', 'Hasta 3 500 MB/s', 4),
    (34, 'Escritura secuencial', 'Hasta 3 300 MB/s', 5),
    (34, 'Garantía', '5 años', 6);

-- Producto 35
UPDATE productos SET descripcion = 'Tarjeta de video NVIDIA GeForce RTX 4060 con 8 GB de memoria, trazado de rayos y DLSS 3 para jugar en alta calidad.' WHERE id_producto = 35;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (35, 'GPU', 'NVIDIA GeForce RTX 4060', 1),
    (35, 'Memoria', '8 GB GDDR6', 2),
    (35, 'Bus de memoria', '128 bits', 3),
    (35, 'Núcleos CUDA', '3072', 4),
    (35, 'Salidas de video', '3 × DisplayPort 1.4a + 1 × HDMI 2.1a', 5),
    (35, 'Fuente recomendada', '550 W', 6);

-- Producto 36
UPDATE productos SET descripcion = 'Procesador de 6 núcleos y 12 hilos para gaming y multitarea, con cooler incluido. Requiere tarjeta de video.' WHERE id_producto = 36;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (36, 'Núcleos / hilos', '6 / 12', 1),
    (36, 'Frecuencia', '3.5 GHz base, hasta 4.4 GHz en turbo', 2),
    (36, 'Caché L3', '32 MB', 3),
    (36, 'Socket', 'AM4', 4),
    (36, 'TDP', '65 W', 5),
    (36, 'Cooler', 'Wraith Stealth incluido', 6),
    (36, 'Gráficos integrados', 'No incluye', 7);

-- Producto 37
UPDATE productos SET descripcion = 'Fuente de poder de 650 W con certificación 80 PLUS Bronze, silenciosa y con protecciones eléctricas.' WHERE id_producto = 37;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (37, 'Potencia', '650 W', 1),
    (37, 'Certificación', '80 PLUS Bronze', 2),
    (37, 'Ventilador', '120 mm', 3),
    (37, 'Tipo de cables', 'No modular', 4),
    (37, 'Protecciones', 'OVP, UVP, OCP y SCP', 5);

-- Producto 38
UPDATE productos SET descripcion = 'Smartphone con pantalla AMOLED de 120 Hz, cámara principal de 108 MP y batería de 5000 mAh con carga rápida.' WHERE id_producto = 38;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (38, 'Pantalla', '6.67" AMOLED, 120 Hz', 1),
    (38, 'Cámara principal', '108 MP', 2),
    (38, 'Batería', '5000 mAh, carga rápida de 33 W', 3),
    (38, 'Memoria RAM', '6 – 8 GB', 4),
    (38, 'Almacenamiento', '128 – 256 GB', 5),
    (38, 'Sistema operativo', 'Android con HyperOS', 6);

-- Producto 39
UPDATE productos SET descripcion = 'Smartphone con pantalla Super AMOLED de 6.5", cámara de 50 MP y batería de 5000 mAh para todo el día.' WHERE id_producto = 39;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (39, 'Pantalla', '6.5" Super AMOLED, 90 Hz', 1),
    (39, 'Cámara principal', '50 MP', 2),
    (39, 'Cámara frontal', '13 MP', 3),
    (39, 'Batería', '5000 mAh', 4),
    (39, 'Memoria RAM', '4 – 6 GB', 5),
    (39, 'Almacenamiento', '128 GB', 6);

-- Producto 40
UPDATE productos SET descripcion = 'Laptop gamer de 15.6" con pantalla de 144 Hz y tarjeta gráfica NVIDIA GeForce RTX, con buena ventilación para jugar.' WHERE id_producto = 40;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (40, 'Pantalla', '15.6" Full HD, 144 Hz', 1),
    (40, 'Procesador', 'Intel Core serie H o AMD Ryzen serie HS (según versión)', 2),
    (40, 'Gráficos', 'NVIDIA GeForce RTX', 3),
    (40, 'Memoria RAM', '12 – 16 GB', 4),
    (40, 'Almacenamiento', 'SSD NVMe 512 GB', 5),
    (40, 'Sistema operativo', 'Windows 11', 6);

-- Producto 41
UPDATE productos SET descripcion = 'Router Wi-Fi de doble banda AC1200, ideal para el hogar: buena cobertura y 4 antenas.' WHERE id_producto = 41;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (41, 'Estándar', 'Wi-Fi 5 (AC1200)', 1),
    (41, 'Velocidad', '300 Mbps (2.4 GHz) + 867 Mbps (5 GHz)', 2),
    (41, 'Puertos', '4 LAN Gigabit + 1 WAN Gigabit', 3),
    (41, 'Antenas', '4 externas', 4),
    (41, 'Tecnologías', 'MU-MIMO y modo Access Point', 5),
    (41, 'Seguridad', 'WPA / WPA2', 6);

-- Producto 42
UPDATE productos SET descripcion = 'Switch de escritorio de 8 puertos Gigabit, plug & play y con carcasa metálica. Amplía tu red sin configurar nada.' WHERE id_producto = 42;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (42, 'Puertos', '8 × 10/100/1000 Mbps', 1),
    (42, 'Tipo', 'No administrable (plug & play)', 2),
    (42, 'Capacidad de conmutación', '16 Gbps', 3),
    (42, 'Carcasa', 'Metálica', 4),
    (42, 'Extras', 'Auto MDI/MDIX y ahorro de energía', 5);

-- Producto 43
UPDATE productos SET descripcion = 'Control inalámbrico con agarre texturizado, cruceta híbrida y botón Compartir. Compatible con consola y PC.' WHERE id_producto = 43;
INSERT INTO especificaciones (id_producto, atributo, valor, orden) VALUES
    (43, 'Compatibilidad', 'Xbox Series X|S, Xbox One, Windows, Android e iOS', 1),
    (43, 'Conexión', 'Xbox Wireless y Bluetooth', 2),
    (43, 'Batería', '2 pilas AA', 3),
    (43, 'Entrada de audio', 'Jack de 3.5 mm', 4),
    (43, 'Extras', 'Botón Compartir y cruceta híbrida', 5);
