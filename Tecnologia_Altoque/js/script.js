document.addEventListener('DOMContentLoaded', () => {
    // ============ Utilidades ============
    // Claves con las que se guarda información en el navegador (localStorage)
    const CLAVE_CARRITO = 'carritoAltoque';
    const CLAVE_TEMA = 'temaAltoque';

    // Convierte 12.5 en "S/ 12.50"
    const formatoMoneda = (n) => 'S/ ' + n.toFixed(2);

    // Lee el carrito guardado; si falla devuelve una lista vacía
    const leerCarrito = () => {
        try {
            return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
        } catch (e) {
            return [];
        }
    };

    const guardarCarrito = (carrito) => {
        try {
            localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
        } catch (e) { /* si el navegador bloquea el almacenamiento, no hacemos nada */ }
    };

    // ============ Tema claro / oscuro ============
    const btnTema = document.getElementById('btnTema');
    const raiz = document.documentElement;

    // Pone o quita data-tema="dark" en <html>; el CSS cambia los colores solo
    const aplicarTema = (tema) => {
        if (tema === 'dark') {
            raiz.setAttribute('data-tema', 'dark');
        } else {
            raiz.removeAttribute('data-tema');
        }
        if (btnTema) btnTema.textContent = tema === 'dark' ? '☀️' : '🌙';
    };

    let temaActual = 'light';
    try {
        temaActual = localStorage.getItem(CLAVE_TEMA) || 'light';
    } catch (e) {}
    aplicarTema(temaActual);

    btnTema?.addEventListener('click', () => {
        temaActual = temaActual === 'dark' ? 'light' : 'dark';
        aplicarTema(temaActual);
        try {
            localStorage.setItem(CLAVE_TEMA, temaActual);
        } catch (e) {}
    });

    // ============ Menú lateral y panel del carrito ============
    const menu = document.getElementById('menuLateral');
    const panel = document.getElementById('carritoPanel');
    const overlay = document.getElementById('overlay');
    const btnMenu = document.getElementById('btnMenu');
    const btnCerrar = document.getElementById('btnCerrar');
    const btnCarrito = document.getElementById('btnCarrito');
    const btnCerrarCarrito = document.getElementById('btnCerrarCarrito');

    // Abre uno de los dos paneles (menu o panel) o cierra todo con null
    // Abre el menú o el carrito (uno a la vez); con null cierra todo
    const abrirPanel = (elemento) => {
        menu.classList.remove('activo');
        panel.classList.remove('activo');
        if (elemento) elemento.classList.add('activo');
        overlay.classList.toggle('activo', !!elemento);
        document.body.style.overflow = elemento ? 'hidden' : '';
    };

    btnMenu?.addEventListener('click', () => abrirPanel(menu));
    btnCerrar?.addEventListener('click', () => abrirPanel(null));
    btnCarrito?.addEventListener('click', () => {
        dibujarCarrito();
        abrirPanel(panel);
    });
    btnCerrarCarrito?.addEventListener('click', () => abrirPanel(null));
    overlay?.addEventListener('click', () => abrirPanel(null));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') abrirPanel(null);
    });

    // Menús desplegables
    document.querySelectorAll('.btn-categoria').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const submenu = btn.nextElementSibling;
            if (submenu?.classList.contains('submenu')) {
                submenu.classList.toggle('activo');
            }
        });
    });

    // ============ Carrito: contador y dibujo del panel ============
    const contador = document.getElementById('contadorCarrito');
    const lista = document.getElementById('listaCarrito');
    const pie = document.getElementById('pieCarrito');
    const resumenCantidad = document.getElementById('resumenCantidad');
    const resumenTotal = document.getElementById('resumenTotal');

    const actualizarContador = () => {
        const total = leerCarrito().reduce((suma, item) => suma + item.cantidad, 0);
        if (contador) contador.textContent = total;
    };

    // Dibuja los productos del carrito y calcula el total
    function dibujarCarrito() {
        const carrito = leerCarrito();
        actualizarContador();

        if (carrito.length === 0) {
            lista.innerHTML = `
                <div class="carrito-vacio">
                    <div class="vacio-icono">🛒</div>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega productos para verlos aquí.</p>
                </div>`;
            pie.style.display = 'none';
            return;
        }

        pie.style.display = '';

        lista.innerHTML = carrito.map(item => `
            <div class="item-carrito">
                <div class="item-img">${item.img ? `<img src="${item.img}" alt="${item.nombre}">` : `<span class="emoji-prod">${item.emoji || '📦'}</span>`}</div>
                <div class="item-info">
                    <h3>${item.nombre}</h3>
                    <p class="item-precio-unit">${formatoMoneda(item.precio)} c/u</p>
                    <div class="item-cantidad">
                        <button class="btn-cant" data-accion="restar" data-id="${item.id}" aria-label="Restar uno">−</button>
                        <span>${item.cantidad}</span>
                        <button class="btn-cant" data-accion="sumar" data-id="${item.id}" aria-label="Sumar uno">+</button>
                    </div>
                </div>
                <div class="item-lado">
                    <span class="item-subtotal">${formatoMoneda(item.precio * item.cantidad)}</span>
                    <button class="btn-eliminar" data-accion="eliminar" data-id="${item.id}" aria-label="Eliminar producto">🗑</button>
                </div>
            </div>
        `).join('');

        const totalProductos = carrito.reduce((s, i) => s + i.cantidad, 0);
        const totalMonto = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

        resumenCantidad.textContent = totalProductos;
        resumenTotal.textContent = formatoMoneda(totalMonto);
    }

    // Un solo listener para sumar, restar y eliminar
    // Delegación de eventos: un solo listener para sumar, restar y eliminar
    lista?.addEventListener('click', (e) => {
        const boton = e.target.closest('button[data-accion]');
        if (!boton) return;

        const { accion, id } = boton.dataset;
        let carrito = leerCarrito();
        const item = carrito.find(i => i.id === id);
        if (!item) return;

        if (accion === 'sumar') {
            item.cantidad++;
        } else if (accion === 'restar') {
            item.cantidad--;
            if (item.cantidad <= 0) carrito = carrito.filter(i => i.id !== id);
        } else if (accion === 'eliminar') {
            carrito = carrito.filter(i => i.id !== id);
        }

        guardarCarrito(carrito);
        dibujarCarrito();
    });

    document.getElementById('btnVaciar')?.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres vaciar el carrito?')) {
            guardarCarrito([]);
            dibujarCarrito();
        }
    });

    // ============ Productos (catálogo) ============
    // Para usar foto real: pon img: 'img/productos/archivo.jpg'. Sin img se muestra el emoji.
    // Catálogo: cat = categoría, marca = filtro del menú, tipo = solo laptops
    const PRODUCTOS = [
        { id: '1', nombre: 'Mouse Logitech G502 Hero', marca: 'Logitech', cat: 'perifericos', precio: 189.90, old: 209.90, img: 'img/productos/mouse.jpg', emoji: '🖱️' },
        { id: '2', nombre: 'Mouse Logitech G305 LIGHTSPEED', marca: 'Logitech', cat: 'perifericos', precio: 149.90, old: 179.90, img: 'img/productos/g305.jpg', emoji: '🖱️' },
        { id: '3', nombre: 'Mouse Logitech G203 LIGHTSYNC', marca: 'Logitech', cat: 'perifericos', precio: 89.00, old: 99.90, img: 'img/productos/g203.png', emoji: '🖱️' },
        { id: '4', nombre: 'Mouse Logitech G PRO X SUPERLIGHT PINK', marca: 'Logitech', cat: 'perifericos', precio: 439.50, old: 499.90, img: 'img/productos/gpro.png', emoji: '🖱️' },
        { id: '5', nombre: 'Teclado Mecánico Redragon Kumara', marca: 'Redragon', cat: 'perifericos', precio: 159.00, old: 189.00, emoji: '⌨️' },
        { id: '6', nombre: 'Audífonos HyperX Cloud II', marca: 'HyperX', cat: 'audio', precio: 329.00, old: 379.00, emoji: '🎧' },
        { id: '7', nombre: 'Parlante Bluetooth JBL Flip 6', marca: 'JBL', cat: 'audio', precio: 459.00, old: 499.00, emoji: '🔊' },
        { id: '8', nombre: 'Laptop ASUS TUF Gaming F15', marca: 'ASUS', cat: 'computadoras', tipo: 'gaming', precio: 3499.00, old: 3799.00, emoji: '💻' },
        { id: '9', nombre: 'Laptop Lenovo IdeaPad 3 15"', marca: 'Lenovo', cat: 'computadoras', tipo: 'oficina', precio: 1799.00, old: 1999.00, emoji: '💻' },
        { id: '10', nombre: 'Samsung Galaxy A55 5G', marca: 'Samsung', cat: 'celulares', precio: 1399.00, old: 1549.00, emoji: '📱' },
        { id: '11', nombre: 'Router TP-Link Archer AX23', marca: 'TP-Link', cat: 'redes', precio: 249.90, old: 289.90, emoji: '🌐' },
        { id: '12', nombre: 'Silla Gamer Cougar Explore', marca: 'Cougar', cat: 'gaming', precio: 749.00, old: 849.00, emoji: '🪑' },
        { id: '13', nombre: 'Monitor Gamer Samsung Odyssey 24"', marca: 'Samsung', cat: 'gaming', precio: 899.00, old: 999.00, emoji: '🖥️' },
        { id: '14', nombre: 'Laptop HP 15-fd Core i5', marca: 'HP', cat: 'computadoras', tipo: 'oficina', precio: 2299.00, old: 2499.00, emoji: '💻' },
        { id: '15', nombre: 'Laptop MSI Thin GF63 RTX 4050', marca: 'MSI', cat: 'computadoras', tipo: 'gaming', precio: 3899.00, old: 4199.00, emoji: '💻' },
        { id: '16', nombre: 'Laptop Acer Aspire 5 Ryzen 7', marca: 'Acer', cat: 'computadoras', tipo: 'oficina', precio: 2599.00, old: 2799.00, emoji: '💻' },
        { id: '17', nombre: 'Workstation HP ZBook Firefly 14', marca: 'HP', cat: 'computadoras', tipo: 'workstation', precio: 5499.00, old: 5899.00, emoji: '💻' },
        { id: '18', nombre: 'SSD Kingston NV2 1TB NVMe', marca: 'Kingston', cat: 'componentes', precio: 219.00, old: 249.00, emoji: '💾' },
        { id: '19', nombre: 'Impresora Epson EcoTank L3250', marca: 'Epson', cat: 'impresoras', precio: 799.00, old: 879.00, emoji: '🖨️' },
        { id: '20', nombre: 'Smartwatch Xiaomi Redmi Watch 5', marca: 'Xiaomi', cat: 'tecnologia', precio: 249.00, old: 289.00, emoji: '⌚' },
        { id: '21', nombre: 'UPS Forza 750VA', marca: 'Forza', cat: 'energia', precio: 189.00, old: 219.00, emoji: '🔋' },
        { id: '22', nombre: 'Microsoft Office 2021 Hogar y Empresas', marca: 'Microsoft', cat: 'software', precio: 399.00, old: 459.00, emoji: '📀' },
        { id: '23', nombre: 'Lector de Códigos de Barras Honeywell', marca: 'Honeywell', cat: 'pos', precio: 289.00, old: 329.00, emoji: '🧾' }
    ];
    const CATS = [['todos', 'Todos'], ['computadoras', 'Computadoras'], ['componentes', 'Componentes'], ['perifericos', 'Periféricos'], ['impresoras', 'Impresoras'], ['audio', 'Audio y Video'], ['celulares', 'Celulares'], ['tecnologia', 'Tecnología'], ['energia', 'Energía'], ['gaming', 'Gaming'], ['redes', 'Redes'], ['software', 'Software'], ['pos', 'Punto de Venta']];
    const grid = document.getElementById('gridProductos');
    const filtros = document.getElementById('filtros');
    let catActiva = 'todos', marcaActiva = '', tipoActivo = '';
    let textoBusqueda = '';
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Filtra por categoría, marca, tipo y búsqueda, y crea las tarjetas
    const dibujarProductos = () => {
        const lista = PRODUCTOS.filter(p => (catActiva === 'todos' || p.cat === catActiva) && (!marcaActiva || norm(p.marca) === marcaActiva) && (!tipoActivo || p.tipo === tipoActivo) &&
            norm(p.nombre + ' ' + p.marca).includes(norm(textoBusqueda)));
        filtros.innerHTML = ((marcaActiva || tipoActivo) ? `<button class="chip activo" data-cat="todos">✕ ${(marcaActiva || tipoActivo).toUpperCase()}</button>` : '') + CATS.map(([k, n]) =>
            `<button class="chip ${k === catActiva && !marcaActiva && !tipoActivo ? 'activo' : ''}" data-cat="${k}">${n}</button>`).join('');
        grid.innerHTML = lista.length ? lista.map(p => `
            <article class="producto-card">
                <div class="producto-img-wrapper">
                    <span class="badge-oferta">-${Math.round((1 - p.precio / p.old) * 100)}%</span>
                    ${p.img ? `<img src="${p.img}" alt="${p.nombre}" loading="lazy">` : `<span class="emoji-prod">${p.emoji}</span>`}
                </div>
                <div class="producto-body">
                    <p class="producto-marca">${p.marca}</p>
                    <h3 class="producto-titulo">${p.nombre}</h3>
                    <div class="precios-group">
                        <span class="precio-old">${formatoMoneda(p.old)}</span>
                        <span class="precio-new">${formatoMoneda(p.precio)}</span>
                    </div>
                    <button class="btn-add-cart" data-id="${p.id}">🛒 Agregar al carrito</button>
                </div>
            </article>`).join('') : '<p class="sin-resultados">No encontramos productos 😕 Prueba con otra búsqueda.</p>';
    };

    const irAProductos = () => document.getElementById('productos').scrollIntoView({ behavior: 'smooth', block: 'start' });

    filtros.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        catActiva = chip.dataset.cat; marcaActiva = ''; tipoActivo = '';
        dibujarProductos();
    });

    document.querySelectorAll('.categoria-card').forEach(card => {
        card.addEventListener('click', () => {
            aplicarFiltro({ cat: norm(card.querySelector('h3').textContent) });
        });
    });

    document.querySelectorAll('.buscador input, .menu-busqueda input').forEach(inp => {
        inp.addEventListener('input', () => { textoBusqueda = inp.value; catActiva = 'todos'; marcaActiva = ''; tipoActivo = ''; dibujarProductos(); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { abrirPanel(null); irAProductos(); } });
    });
    document.querySelector('.buscador button')?.addEventListener('click', irAProductos);
    // Aplica un filtro (categoría, marca o tipo), cierra el menú y baja a los productos
    const aplicarFiltro = ({ cat = 'todos', marca = '', tipo = '' }) => {
        catActiva = cat; marcaActiva = marca; tipoActivo = tipo; textoBusqueda = '';
        document.querySelectorAll('.buscador input, .menu-busqueda input').forEach(i => i.value = '');
        dibujarProductos();
        abrirPanel(null);
        irAProductos();
    };

    // Menú lateral: lee data-cat / data-marca / data-tipo del enlace pulsado
    menu.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-cat], a[data-marca], a[data-tipo]');
        if (!a) return;
        e.preventDefault();
        aplicarFiltro({ cat: a.dataset.tipo ? 'computadoras' : a.dataset.cat, marca: a.dataset.marca, tipo: a.dataset.tipo });
    });

    // Botones del banner: si tienen data-cat filtran esa categoría; si no, muestran todo
    document.querySelectorAll('.banner-contenido button').forEach(b =>
        b.addEventListener('click', () => aplicarFiltro({ cat: b.dataset.cat })));

    // ============ Carrusel del banner (bucle automático) ============
    const banner = document.getElementById('banner');
    const slides = banner.querySelectorAll('.slide');
    const puntos = document.getElementById('bannerPuntos');
    let actual = 0, temporizador;

    puntos.innerHTML = [...slides].map((_, i) => `<button data-i="${i}" aria-label="Diapositiva ${i + 1}"></button>`).join('');

    // Muestra la diapositiva i; el operador % hace que después de la última vuelva a la primera
    const mostrarSlide = (i) => {
        actual = (i + slides.length) % slides.length;
        slides.forEach((s, k) => s.classList.toggle('activo', k === actual));
        puntos.querySelectorAll('button').forEach((b, k) => b.classList.toggle('activo', k === actual));
    };
    // setInterval repite el cambio cada 5 segundos
    const iniciarBucle = () => { clearInterval(temporizador); temporizador = setInterval(() => mostrarSlide(actual + 1), 5000); };

    document.getElementById('bannerPrev').addEventListener('click', () => { mostrarSlide(actual - 1); iniciarBucle(); });
    document.getElementById('bannerNext').addEventListener('click', () => { mostrarSlide(actual + 1); iniciarBucle(); });
    puntos.addEventListener('click', (e) => { if (e.target.dataset.i) { mostrarSlide(+e.target.dataset.i); iniciarBucle(); } });
    banner.addEventListener('mouseenter', () => clearInterval(temporizador));   // pausa al pasar el mouse
    banner.addEventListener('mouseleave', iniciarBucle);
    let x0 = 0;                                                                 // deslizar con el dedo en celular
    banner.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    banner.addEventListener('touchend', (e) => {
        const d = e.changedTouches[0].clientX - x0;
        if (Math.abs(d) > 50) { mostrarSlide(actual + (d < 0 ? 1 : -1)); iniciarBucle(); }
    });
    mostrarSlide(0);
    iniciarBucle();

    // ============ Aviso (toast) ============
    // Aviso temporal "Agregado al carrito"
    const mostrarToast = (msg) => {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('salir'), 1800);
        setTimeout(() => t.remove(), 2200);
    };

    // ============ Agregar al carrito ============
    // Un solo listener para todos los botones "Agregar al carrito"
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-add-cart');
        if (!btn) return;
        const p = PRODUCTOS.find(x => x.id === btn.dataset.id);
        const carrito = leerCarrito();
        const existente = carrito.find(item => item.id === p.id);
        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, img: p.img || '', emoji: p.emoji, cantidad: 1 });
        }
        guardarCarrito(carrito);
        actualizarContador();
        mostrarToast('✓ Agregado al carrito');
        contador.classList.add('rebote');
        setTimeout(() => contador.classList.remove('rebote'), 400);
    });

    // ============ Finalizar compra (modal) ============
    const modal = document.getElementById('modalPago');
    const pagoForm = document.getElementById('pagoForm');
    const pagoOk = document.getElementById('pagoOk');
    const cerrarModal = () => modal.classList.remove('activo');

    document.getElementById('btnPagar')?.addEventListener('click', () => {
        const c = leerCarrito();
        const total = c.reduce((s, i) => s + i.precio * i.cantidad, 0);
        document.getElementById('pagoResumen').textContent =
            c.reduce((s, i) => s + i.cantidad, 0) + ' producto(s) · Total ' + formatoMoneda(total);
        pagoForm.hidden = false;
        pagoOk.hidden = true;
        abrirPanel(null);
        modal.classList.add('activo');
    });
    document.getElementById('cerrarPago').addEventListener('click', cerrarModal);
    document.getElementById('okCerrar').addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

    // Al confirmar: genera N° de pedido, vacía el carrito y muestra el mensaje de éxito
    document.getElementById('formPago').addEventListener('submit', (e) => {
        e.preventDefault();
        const pedido = 'TA-' + Math.floor(100000 + Math.random() * 900000);
        document.getElementById('okTexto').textContent =
            document.getElementById('pNombre').value + ', tu pedido ' + pedido + ' fue registrado. Pago: ' +
            document.getElementById('pMetodo').value + '. Te enviaremos los detalles a ' + document.getElementById('pCorreo').value + '.';
        guardarCarrito([]);
        dibujarCarrito();
        e.target.reset();
        pagoForm.hidden = true;
        pagoOk.hidden = false;
    });

    // ============ Volver arriba y animaciones al hacer scroll ============
    const btnArriba = document.getElementById('btnArriba');
    window.addEventListener('scroll', () => btnArriba.classList.toggle('visible', window.scrollY > 400));
    btnArriba.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Detecta cuándo una sección entra en pantalla para animarla
    const obs = new IntersectionObserver((entradas) => {
        entradas.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.seccion, .nosotros-card, .beneficios').forEach(el => { el.classList.add('reveal'); obs.observe(el); });

    // ============ Asistente Coco (mascota con chat) ============
    const cocoChat = document.getElementById('cocoChat');
    const cocoMsgs = document.getElementById('cocoMsgs');
    const cocoInput = document.getElementById('cocoInput');
    const cocoSaludo = document.getElementById('cocoSaludo');

    // Respuestas fijas: si el mensaje contiene alguna palabra de "k", Coco contesta "r"
    const RESPUESTAS = [
        { k: ['hola', 'buenas', 'hey'], r: '¡Hola! 🐊 Soy Coco, tu guía en Tecnología Altoque. Pregúntame por envíos o pagos, o escribe lo que buscas (laptop, HP, mouse...).' },
        { k: ['como compro', 'como comprar', 'pedido', 'carrito'], r: 'Es fácil 🛒: 1) Pulsa "Agregar al carrito" en tus productos. 2) Abre el carrito arriba a la derecha. 3) Toca "Finalizar compra" y llena tus datos.' },
        { k: ['envio', 'delivery', 'entrega'], r: 'Hacemos envíos a todo el Perú 🚚. Los detalles se confirman al finalizar tu compra.' },
        { k: ['pago', 'pagar', 'yape', 'plin', 'tarjeta'], r: 'Aceptamos Tarjeta, Yape, Plin y Contra entrega 💳. Eliges uno al finalizar la compra.' },
        { k: ['horario', 'hora', 'atienden', 'abierto'], r: 'Atendemos de lunes a sábado, de 9:00 AM a 7:00 PM 🕒. ¡La tienda online abre las 24 horas!' },
        { k: ['garantia'], r: 'Todos nuestros productos cuentan con garantía oficial 🛡️.' },
        { k: ['oscuro', 'claro', 'tema'], r: 'Toca el botón 🌙 del encabezado para cambiar entre tema claro y oscuro.' }
    ];
    // Palabras que Coco relaciona con cada categoría (para entender "laptop", "mouse", etc.)
    const SINONIMOS = {
        computadoras: ['laptop', 'pc', 'computadora', 'tablet', 'notebook'], componentes: ['ssd', 'ram', 'disco', 'componente'],
        perifericos: ['mouse', 'teclado', 'raton', 'periferico'], impresoras: ['impresora', 'tinta'],
        audio: ['audifono', 'parlante', 'sonido', 'audio'], celulares: ['celular', 'telefono', 'smartphone'],
        tecnologia: ['smartwatch', 'reloj'], energia: ['ups', 'bateria', 'energia'], gaming: ['gamer', 'gaming', 'silla', 'monitor'],
        redes: ['router', 'wifi', 'red'], software: ['software', 'office', 'licencia'], pos: ['lector', 'codigo de barras']
    };

    // Analiza el mensaje y devuelve { texto, filtro }: lo que Coco responde y (si aplica) qué productos mostrar
    const responder = (texto) => {
        const t = norm(texto);
        const palabras = t.split(/[^a-z0-9]+/);
        // tiene(): true si el mensaje contiene alguna de las palabras (acepta plural simple: laptop/laptops)
        const tiene = (lista) => lista.some(w => w.includes(' ') ? t.includes(w) : palabras.some(p => p === w || p === w + 's'));
        const fija = RESPUESTAS.find(x => tiene(x.k));
        if (fija) return { texto: fija.r };
        if (tiene(['oferta', 'descuento', 'barato'])) {
            const top = [...PRODUCTOS].sort((a, b) => (b.old - b.precio) / b.old - (a.old - a.precio) / a.old).slice(0, 3);
            return { texto: '🔥 Mejores ofertas: ' + top.map(p => `${p.nombre} (${formatoMoneda(p.precio)})`).join(', ') + '.' };
        }
        const marca = [...new Set(PRODUCTOS.map(p => norm(p.marca)))].find(m => tiene([m]));
        if (marca) return { texto: `¡Perfecto! Te muestro los productos de ${marca.toUpperCase()} 👇`, filtro: { marca } };
        const cat = Object.keys(SINONIMOS).find(k => tiene(SINONIMOS[k]));
        if (cat) return { texto: 'Mira lo que tenemos en esa categoría 👇', filtro: { cat } };
        return { texto: 'Mmm, no estoy seguro 🤔. Prueba con "envíos", "pagos", "horario" o escribe lo que buscas (laptop, mouse, HP...).' };
    };

    // Agrega un globo de texto al chat ("yo" = usuario, "bot" = Coco)
    const cocoDecir = (texto, quien) => {
        const d = document.createElement('div');
        d.className = 'cmsg ' + quien;
        d.textContent = texto;
        cocoMsgs.appendChild(d);
        cocoMsgs.scrollTop = cocoMsgs.scrollHeight;
    };
    // Muestra la pregunta, espera medio segundo (efecto "escribiendo") y responde
    const cocoPreguntar = (texto) => {
        cocoDecir(texto, 'yo');
        const r = responder(texto);
        setTimeout(() => {
            cocoDecir(r.texto, 'bot');
            if (r.filtro) setTimeout(() => { cocoChat.classList.remove('abierto'); aplicarFiltro(r.filtro); }, 900);
        }, 500);
    };

    cocoDecir('¡Hola! Soy Coco 🐊 Te ayudo a encontrar productos y resolver dudas. ¿Qué necesitas?', 'bot');
    document.getElementById('cocoRapidas').innerHTML = ['🛒 ¿Cómo compro?', '🚚 Envíos', '💳 Pagos', '🕒 Horario', '🔥 Ofertas', '💻 Laptops']
        .map(q => `<button type="button">${q}</button>`).join('');
    document.getElementById('cocoRapidas').addEventListener('click', (e) => { if (e.target.closest('button')) cocoPreguntar(e.target.textContent); });
    document.getElementById('cocoBtn').addEventListener('click', () => { cocoChat.classList.toggle('abierto'); cocoSaludo.classList.add('oculto'); });
    document.getElementById('cocoCerrar').addEventListener('click', () => cocoChat.classList.remove('abierto'));
    document.getElementById('cocoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (cocoInput.value.trim()) cocoPreguntar(cocoInput.value.trim());
        cocoInput.value = '';
    });
    // El globito de saludo aparece a los 2 s y se oculta a los 8 s
    setTimeout(() => { if (!cocoChat.classList.contains('abierto')) cocoSaludo.classList.remove('oculto'); }, 2000);
    setTimeout(() => cocoSaludo.classList.add('oculto'), 8000);

    // Estado inicial
    dibujarProductos();
    dibujarCarrito();
});
