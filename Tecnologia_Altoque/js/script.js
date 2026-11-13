/**
 * script.js — Lógica de Tecnología Altoque
 * Secciones: utilidades, validaciones, tema, menú y carrito, catálogo (PHP + MariaDB),
 * carrusel, pago, cuenta de usuario (sesiones PHP) y asistente Coco.
 */
document.addEventListener('DOMContentLoaded', () => {

    // ============ Utilidades ============
    const CLAVE_CARRITO = 'carritoAltoque';
    const CLAVE_TEMA = 'temaAltoque';

    // Convierte un número a texto en soles. Ej: 1799 -> "S/ 1799.00"
    const formatoMoneda = (n) => 'S/ ' + Number(n).toFixed(2);

    // Lee el carrito guardado en localStorage ([] si no existe o está dañado)
    const leerCarrito = () => {
        try {
            return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
        } catch (e) {
            return [];
        }
    };

    // Guarda el carrito en localStorage para que no se pierda al recargar la página
    const guardarCarrito = (carrito) => {
        try {
            localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
        } catch (e) {}
    };

    // ============ Productos desde MariaDB ============
    // Los productos ya no están escritos manualmente aquí.
    // Ahora se obtienen mediante nuestra API PHP.

    // Lista de productos: se llena en cargarProductos() con lo que devuelve php/productos.php
    let PRODUCTOS = [];

    // Categorías de los botones de filtro: [clave interna, texto visible]
    const CATS = [
        ['todos', 'Todos'],
        ['computadoras', 'Computadoras'],
        ['componentes', 'Componentes'],
        ['perifericos', 'Periféricos'],
        ['impresoras', 'Impresoras'],
        ['audio', 'Audio y Video'],
        ['celulares', 'Celulares'],
        ['tecnologia', 'Tecnología'],
        ['energia', 'Energía'],
        ['gaming', 'Gaming'],
        ['redes', 'Redes'],
        ['software', 'Software'],
        ['pos', 'Punto de Venta']
    ];

    const grid = document.getElementById('gridProductos');
    const filtros = document.getElementById('filtros');

    // Estado actual de los filtros del catálogo (categoría, marca, tipo y búsqueda)
    let catActiva = 'todos';
    let marcaActiva = '';
    let tipoActivo = '';
    let textoBusqueda = '';

    // Normaliza texto (minúsculas y sin tildes) para comparar y buscar sin errores
    const norm = (s) =>
        String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

    // ============ Validaciones del lado del cliente ============
    // Cada regla recibe el valor de un campo y devuelve un mensaje de error ('' si es válido).
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const reglaNombre = (v) =>
        v.length < 3 ? 'Escribe tu nombre completo (mínimo 3 caracteres).'
        : v.length > 120 ? 'El nombre es demasiado largo (máximo 120 caracteres).'
        : '';

    const reglaCorreo = (v) =>
        !v ? 'Ingresa tu correo.'
        : (!EMAIL_REGEX.test(v) || v.length > 150) ? 'Ingresa un correo válido, por ejemplo nombre@correo.com.'
        : '';

    const reglaDireccion = (v) =>
        v.length < 5 ? 'Escribe tu dirección de envío (mínimo 5 caracteres).'
        : v.length > 255 ? 'La dirección es demasiado larga (máximo 255 caracteres).'
        : '';

    const reglaMetodo = (v) => v ? '' : 'Selecciona un método de pago.';

    const reglaPasswordLogin = (v) => v ? '' : 'Ingresa tu contraseña.';

    const reglaPasswordNueva = (v) =>
        v.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.'
        : v.length > 72 ? 'La contraseña es demasiado larga (máximo 72 caracteres).'
        : (!/[A-Za-z]/.test(v) || !/\d/.test(v)) ? 'Debe incluir al menos una letra y un número.'
        : '';

    // Reglas por formulario: { id del campo: función de validación }
    const REGLAS_PAGO = {
        pNombre: reglaNombre,
        pCorreo: reglaCorreo,
        pDir: reglaDireccion,
        pMetodo: reglaMetodo
    };

    const REGLAS_LOGIN = {
        lCorreo: reglaCorreo,
        lPass: reglaPasswordLogin
    };

    const REGLAS_REGISTRO = {
        rNombre: reglaNombre,
        rCorreo: reglaCorreo,
        rPass: reglaPasswordNueva,
        rPass2: (v, form) =>
            v === form.querySelector('#rPass').value ? '' : 'Las contraseñas no coinciden.'
    };

    // Muestra (o borra, si mensaje es '') el error debajo de un campo
    const ponerError = (campo, mensaje) => {
        const aviso = campo.form.querySelector(`[data-error-for="${campo.id}"]`);

        if (aviso) aviso.textContent = mensaje;

        if (mensaje) {
            campo.setAttribute('aria-invalid', 'true');
        } else {
            campo.removeAttribute('aria-invalid');
        }
    };

    // Valida todos los campos de un formulario; enfoca el primero con error. Devuelve true si todo está bien.
    const validarFormulario = (form, reglas) => {
        let primerInvalido = null;

        Object.entries(reglas).forEach(([id, regla]) => {
            const campo = form.querySelector('#' + id);

            // Las contraseñas no se recortan; los demás campos sí
            const valor = campo.type === 'password' ? campo.value : campo.value.trim();
            const mensaje = regla(valor, form);

            ponerError(campo, mensaje);

            if (mensaje && !primerInvalido) primerInvalido = campo;
        });

        if (primerInvalido) primerInvalido.focus();

        return !primerInvalido;
    };

    // Al corregir un campo con error, el mensaje se quita solo
    ['input', 'change'].forEach(evento => {
        document.addEventListener(evento, (e) => {
            if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') {
                ponerError(e.target, '');
            }
        });
    });

    // ============ Tema claro / oscuro ============
    const btnTema = document.getElementById('btnTema');
    const raiz = document.documentElement;

    // Aplica el tema claro u oscuro cambiando el atributo data-tema de <html>
    const aplicarTema = (tema) => {
        if (tema === 'dark') {
            raiz.setAttribute('data-tema', 'dark');
        } else {
            raiz.removeAttribute('data-tema');
        }

        if (btnTema) {
            btnTema.textContent = tema === 'dark' ? '☀️' : '🌙';
        }
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

    // ============ Menú lateral y carrito ============
    const menu = document.getElementById('menuLateral');
    const panel = document.getElementById('carritoPanel');
    const overlay = document.getElementById('overlay');
    const btnMenu = document.getElementById('btnMenu');
    const btnCerrar = document.getElementById('btnCerrar');
    const btnCarrito = document.getElementById('btnCarrito');
    const btnCerrarCarrito = document.getElementById('btnCerrarCarrito');

    // Abre un panel lateral (menú o carrito) y cierra el otro; con null cierra todos
    const abrirPanel = (elemento) => {
        menu.classList.remove('activo');
        panel.classList.remove('activo');

        if (elemento) {
            elemento.classList.add('activo');
        }

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

    // ============ Carrito ============
    const contador = document.getElementById('contadorCarrito');
    const lista = document.getElementById('listaCarrito');
    const pie = document.getElementById('pieCarrito');
    const resumenCantidad = document.getElementById('resumenCantidad');
    const resumenTotal = document.getElementById('resumenTotal');

    // Actualiza el numerito del botón del carrito con la cantidad total de productos
    const actualizarContador = () => {
        const total = leerCarrito().reduce(
            (suma, item) => suma + item.cantidad,
            0
        );

        if (contador) contador.textContent = total;
    };

    // Dibuja la lista del carrito y el resumen (cantidad y total) desde localStorage
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
                <div class="item-img">
                    <img
                        src="${item.img || `img/productos/${item.id}.jpg`}"
                        alt="${item.nombre}"
                        data-id="${item.id}"
                        data-emoji="${item.emoji || '📦'}"
                        data-i="${item.img ? -1 : 0}">
                </div>

                <div class="item-info">
                    <h3>${item.nombre}</h3>
                    <p class="item-precio-unit">
                        ${formatoMoneda(item.precio)} c/u
                    </p>

                    <div class="item-cantidad">
                        <button class="btn-cant"
                            data-accion="restar"
                            data-id="${item.id}"
                            aria-label="Restar uno">−</button>

                        <span>${item.cantidad}</span>

                        <button class="btn-cant"
                            data-accion="sumar"
                            data-id="${item.id}"
                            aria-label="Sumar uno">+</button>
                    </div>
                </div>

                <div class="item-lado">
                    <span class="item-subtotal">
                        ${formatoMoneda(item.precio * item.cantidad)}
                    </span>

                    <button class="btn-eliminar"
                        data-accion="eliminar"
                        data-id="${item.id}"
                        aria-label="Eliminar producto">🗑</button>
                </div>
            </div>
        `).join('');

        const totalProductos = carrito.reduce(
            (s, i) => s + i.cantidad, 0
        );

        const totalMonto = carrito.reduce(
            (s, i) => s + (i.precio * i.cantidad), 0
        );

        resumenCantidad.textContent = totalProductos;
        resumenTotal.textContent = formatoMoneda(totalMonto);
    }

    // Botones dentro del carrito: sumar, restar o eliminar (delegación de eventos)
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

            if (item.cantidad <= 0) {
                carrito = carrito.filter(i => i.id !== id);
            }
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

    // ============ Imágenes de productos ============
    const EXTENSIONES = [
        'jpg', 'jpeg', 'png', 'webp', 'avif',
        'JPG', 'JPEG', 'PNG', 'WEBP'
    ];

    // Si una imagen de producto no carga, prueba otras extensiones y al final muestra un emoji
    document.addEventListener('error', (e) => {
        const img = e.target;

        if (img.tagName !== 'IMG' || !img.dataset.id) return;

        const i = Number(img.dataset.i) + 1;

        if (i < EXTENSIONES.length) {
            img.dataset.i = i;
            img.src = `img/productos/${img.dataset.id}.${EXTENSIONES[i]}`;
        } else {
            img.replaceWith(
                Object.assign(document.createElement('span'), {
                    className: 'emoji-prod',
                    textContent: img.dataset.emoji || '📦'
                })
            );
        }
    }, true);

    // ============ Dibujar catálogo ============
    const dibujarProductos = () => {

        const productosFiltrados = PRODUCTOS.filter(p =>
            (catActiva === 'todos' || p.cat === catActiva) &&
            (!marcaActiva || norm(p.marca) === marcaActiva) &&
            (!tipoActivo || p.tipo === tipoActivo) &&
            norm(p.nombre + ' ' + p.marca).includes(norm(textoBusqueda))
        );

        filtros.innerHTML =
            ((marcaActiva || tipoActivo)
                ? `<button class="chip activo" data-cat="todos">
                    ✕ ${(marcaActiva || tipoActivo).toUpperCase()}
                   </button>`
                : '') +

            CATS.map(([k, n]) => `
                <button class="chip ${
                    k === catActiva && !marcaActiva && !tipoActivo
                        ? 'activo'
                        : ''
                }" data-cat="${k}">${n}</button>
            `).join('');

        grid.innerHTML = productosFiltrados.length
            ? productosFiltrados.map(p => `
                <article class="producto-card">

                    <div class="producto-img-wrapper">

                        ${p.old && p.old > p.precio
                            ? `<span class="badge-oferta">
                                 -${Math.round((1 - (p.precio / p.old)) * 100)}%
                               </span>`
                            : ''}

                        <img
                            src="${p.img || `img/productos/${p.id}.jpg`}"
                            alt="${p.nombre}"
                            loading="lazy"
                            data-id="${p.id}"
                            data-emoji="${p.emoji}"
                            data-i="${p.img ? -1 : 0}">
                    </div>

                    <div class="producto-body">
                        <p class="producto-marca">${p.marca}</p>

                        <h3 class="producto-titulo">${p.nombre}</h3>

                        <div class="precios-group">

                            ${p.old && p.old > p.precio
                                ? `<span class="precio-old">
                                    ${formatoMoneda(p.old)}
                                   </span>`
                                : ''}

                            <span class="precio-new">
                                ${formatoMoneda(p.precio)}
                            </span>
                        </div>

                        <button class="btn-add-cart" data-id="${p.id}">
                            🛒 Agregar al carrito
                        </button>
                    </div>
                </article>
            `).join('')
            : '<p class="sin-resultados">No encontramos productos 😕 Prueba con otra búsqueda.</p>';
    };

    // ============ Cargar productos desde PHP ============
    const cargarProductos = async () => {
        try {
            grid.innerHTML = '<p>Cargando productos...</p>';

            const respuesta = await fetch('php/productos.php');

            if (!respuesta.ok) {
                throw new Error('Error al consultar PHP: ' + respuesta.status);
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos)) {
                throw new Error('La respuesta de PHP no es una lista de productos.');
            }

            PRODUCTOS = datos.map(p => ({
                id: String(p.id),
                nombre: p.nombre,
                marca: p.marca,
                cat: norm(p.categoria),
                precio: Number(p.precio),
                old: p.old === null ? null : Number(p.old),
                tipo: p.tipo || '',
                img: p.img || '',
                emoji: p.emoji || '📦'
            }));

            console.log('Productos cargados:', PRODUCTOS.length);

            dibujarProductos();

        } catch (error) {
            console.error('Error cargando productos:', error);

            grid.innerHTML = `
                <p class="sin-resultados">
                    No se pudieron cargar los productos.
                    Intenta nuevamente.
                </p>`;
        }
    };

    // Baja suavemente hasta la sección de productos
    const irAProductos = () => {
        document.getElementById('productos').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    // Clic en un botón de filtro (chip) de categoría
    filtros.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');

        if (!chip) return;

        catActiva = chip.dataset.cat;
        marcaActiva = '';
        tipoActivo = '';

        dibujarProductos();
    });

    // Clic en una tarjeta de categoría de la página principal
    document.querySelectorAll('.categoria-card').forEach(card => {
        card.addEventListener('click', () => {
            aplicarFiltro({
                cat: norm(card.querySelector('h3').textContent)
            });
        });
    });

    // Buscadores (barra superior y menú): filtran mientras escribes; Enter baja a los productos
    document.querySelectorAll('.buscador input, .menu-busqueda input')
        .forEach(inp => {

            inp.addEventListener('input', () => {
                textoBusqueda = inp.value;
                catActiva = 'todos';
                marcaActiva = '';
                tipoActivo = '';
                dibujarProductos();
            });

            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    abrirPanel(null);
                    irAProductos();
                }
            });
        });

    document.querySelector('.buscador button')
        ?.addEventListener('click', irAProductos);

    // Aplica un filtro (categoría, marca o tipo), limpia la búsqueda y muestra los productos
    const aplicarFiltro = ({
        cat = 'todos',
        marca = '',
        tipo = ''
    }) => {
        catActiva = cat;
        marcaActiva = marca;
        tipoActivo = tipo;
        textoBusqueda = '';

        document.querySelectorAll('.buscador input, .menu-busqueda input')
            .forEach(i => i.value = '');

        dibujarProductos();
        abrirPanel(null);
        irAProductos();
    };

    // Enlaces del menú lateral: cada uno trae data-cat, data-marca o data-tipo
    menu.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-cat], a[data-marca], a[data-tipo]');

        if (!a) return;

        e.preventDefault();

        aplicarFiltro({
            cat: a.dataset.tipo ? 'computadoras' : a.dataset.cat,
            marca: a.dataset.marca,
            tipo: a.dataset.tipo
        });
    });

    // Botones del banner ("Ver gaming", "Ver laptops") que aplican un filtro
    document.querySelectorAll('.banner-contenido button').forEach(b => {
        b.addEventListener('click', () => {
            aplicarFiltro({ cat: b.dataset.cat });
        });
    });

    // ============ Carrusel del banner ============
    const banner = document.getElementById('banner');
    const slides = banner.querySelectorAll('.slide');
    const puntos = document.getElementById('bannerPuntos');

    let actual = 0;
    let temporizador;

    puntos.innerHTML = [...slides].map((_, i) =>
        `<button data-i="${i}" aria-label="Diapositiva ${i + 1}"></button>`
    ).join('');

    // Muestra la diapositiva i del carrusel (da la vuelta al llegar al final o al inicio)
    const mostrarSlide = (i) => {
        actual = (i + slides.length) % slides.length;

        slides.forEach((s, k) => {
            s.classList.toggle('activo', k === actual);
        });

        puntos.querySelectorAll('button').forEach((b, k) => {
            b.classList.toggle('activo', k === actual);
        });
    };

    // Reinicia el cambio automático de diapositivas (cada 5 segundos)
    const iniciarBucle = () => {
        clearInterval(temporizador);
        temporizador = setInterval(() => mostrarSlide(actual + 1), 5000);
    };

    document.getElementById('bannerPrev').addEventListener('click', () => {
        mostrarSlide(actual - 1);
        iniciarBucle();
    });

    document.getElementById('bannerNext').addEventListener('click', () => {
        mostrarSlide(actual + 1);
        iniciarBucle();
    });

    puntos.addEventListener('click', (e) => {
        if (e.target.dataset.i !== undefined) {
            mostrarSlide(+e.target.dataset.i);
            iniciarBucle();
        }
    });

    banner.addEventListener('mouseenter', () => clearInterval(temporizador));
    banner.addEventListener('mouseleave', iniciarBucle);

    // Gestos táctiles: deslizar más de 50 px cambia de diapositiva
    let x0 = 0;

    banner.addEventListener('touchstart', (e) => {
        x0 = e.touches[0].clientX;
    }, { passive: true });

    banner.addEventListener('touchend', (e) => {
        const d = e.changedTouches[0].clientX - x0;

        if (Math.abs(d) > 50) {
            mostrarSlide(actual + (d < 0 ? 1 : -1));
            iniciarBucle();
        }
    });

    mostrarSlide(0);
    iniciarBucle();

    // ============ Avisos (toast) ============
    const mostrarToast = (msg) => {
        const t = document.createElement('div');

        t.className = 'toast';
        t.textContent = msg;

        document.body.appendChild(t);

        setTimeout(() => t.classList.add('salir'), 1800);
        setTimeout(() => t.remove(), 2200);
    };

    // ============ Agregar al carrito ============
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-add-cart');

        if (!btn) return;

        const p = PRODUCTOS.find(x => x.id === btn.dataset.id);

        if (!p) return;

        const carrito = leerCarrito();
        const existente = carrito.find(item => item.id === p.id);

        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({
                id: p.id,
                nombre: p.nombre,
                precio: p.precio,
                img: p.img || '',
                emoji: p.emoji,
                cantidad: 1
            });
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

    // Cierra la ventana de pago
    const cerrarModal = () => modal.classList.remove('activo');

    // "Finalizar compra": muestra el resumen del pedido y abre la ventana de pago
    document.getElementById('btnPagar')?.addEventListener('click', () => {
        const c = leerCarrito();

        const total = c.reduce(
            (s, i) => s + (i.precio * i.cantidad),
            0
        );

        document.getElementById('pagoResumen').textContent =
            c.reduce((s, i) => s + i.cantidad, 0) +
            ' producto(s) · Total ' + formatoMoneda(total);

        pagoForm.hidden = false;
        pagoOk.hidden = true;

        abrirPanel(null);
        modal.classList.add('activo');
    });

    document.getElementById('cerrarPago').addEventListener('click', cerrarModal);
    document.getElementById('okCerrar').addEventListener('click', cerrarModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });

    // ============ Finalizar compra: PHP + MariaDB ============

    // Envío del formulario de pago: valida, manda el pedido a php/registrar_pedido.php y muestra el resultado
    document.getElementById('formPago').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validación del lado del cliente: si algo falla, no se envía nada al servidor
        if (!validarFormulario(e.target, REGLAS_PAGO)) return;

        const formulario = e.target;
        const botonEnviar = formulario.querySelector('button[type="submit"]');

        const carrito = leerCarrito();

        if (carrito.length === 0) {
            mostrarToast('Tu carrito está vacío.');
            return;
        }

        const datosPedido = {
            nombre: document.getElementById('pNombre').value.trim(),
            correo: document.getElementById('pCorreo').value.trim(),
            direccion: document.getElementById('pDir').value.trim(),
            metodo: document.getElementById('pMetodo').value,
            carrito: carrito.map(item => ({
                id: item.id,
                cantidad: item.cantidad
            }))
        };

        botonEnviar.disabled = true;
        botonEnviar.textContent = 'Registrando pedido...';

        try {
            const respuesta = await fetch('php/registrar_pedido.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosPedido)
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.exito) {
                throw new Error(
                    resultado.mensaje || 'No se pudo registrar el pedido.'
                );
            }

            document.getElementById('okTexto').textContent =
                datosPedido.nombre +
                ', tu pedido ' + resultado.codigo_pedido +
                ' fue registrado correctamente. Total: ' +
                formatoMoneda(resultado.total) +
                '. Método de pago: ' + datosPedido.metodo +
                '. Te enviaremos los detalles a ' +
                datosPedido.correo + '.';

            guardarCarrito([]);
            dibujarCarrito();
            formulario.reset();
            rellenarDatosUsuario();

            pagoForm.hidden = true;
            pagoOk.hidden = false;

        } catch (error) {
            console.error('Error al registrar pedido:', error);
            mostrarToast(error.message || 'Error al registrar la compra.');

        } finally {
            botonEnviar.disabled = false;
            botonEnviar.textContent = 'Confirmar pedido';
        }
    });

    // ============ Cuenta de usuario (sesiones PHP) ============
    const modalCuenta = document.getElementById('modalCuenta');
    const btnCuenta = document.getElementById('btnCuenta');
    const cuentaTexto = document.getElementById('cuentaTexto');
    const listaPedidos = document.getElementById('listaPedidos');

    // Las tres pantallas del modal; solo una se ve a la vez
    const vistas = {
        login: document.getElementById('vistaLogin'),
        registro: document.getElementById('vistaRegistro'),
        perfil: document.getElementById('vistaPerfil')
    };

    // Datos del usuario con sesión iniciada (null si no hay sesión)
    let usuario = null;

    const mostrarVista = (nombre) => {
        Object.entries(vistas).forEach(([clave, elemento]) => {
            elemento.hidden = clave !== nombre;
        });
    };

    // Llama a un endpoint PHP. Sin "datos" hace GET; con "datos" hace POST enviando JSON.
    // Si el servidor responde con error, lanza una excepción con el mensaje para mostrarlo.
    const llamarApi = async (url, datos) => {
        const opciones = { credentials: 'same-origin' };

        if (datos !== undefined) {
            opciones.method = 'POST';
            opciones.headers = { 'Content-Type': 'application/json' };
            opciones.body = JSON.stringify(datos);
        }

        const respuesta = await fetch(url, opciones);
        const resultado = await respuesta.json().catch(() => null);

        if (!resultado) {
            throw new Error('El servidor devolvió una respuesta inválida.');
        }

        if (!respuesta.ok || resultado.exito === false) {
            throw new Error(resultado.mensaje || 'Ocurrió un error. Inténtalo de nuevo.');
        }

        return resultado;
    };

    // Con sesión iniciada, el formulario de pago se rellena con los datos de la cuenta
    const rellenarDatosUsuario = () => {
        const campoNombre = document.getElementById('pNombre');
        const campoCorreo = document.getElementById('pCorreo');

        if (usuario) {
            if (!campoNombre.value) campoNombre.value = usuario.nombre;
            campoCorreo.value = usuario.correo;
            campoCorreo.readOnly = true; // el servidor usa el correo de la cuenta
        } else {
            campoCorreo.readOnly = false;
        }
    };

    // Refleja el estado de la sesión en el botón del encabezado y en el formulario de pago
    const actualizarCuenta = () => {
        cuentaTexto.textContent = usuario ? usuario.nombre.split(' ')[0] : 'Ingresar';
        btnCuenta.setAttribute('aria-label', usuario ? 'Mi cuenta' : 'Iniciar sesión');
        rellenarDatosUsuario();
    };

    // Crea un <li> de la lista de pedidos (usa textContent para evitar inyectar HTML)
    const crearItemLista = (izquierda, derecha, vacio = false) => {
        const li = document.createElement('li');
        const texto = document.createElement('span');

        if (vacio) li.className = 'sin-pedidos';

        texto.textContent = izquierda;
        li.appendChild(texto);

        if (derecha) {
            const monto = document.createElement('strong');
            monto.textContent = derecha;
            li.appendChild(monto);
        }

        return li;
    };

    // Vista de perfil: saluda al usuario y carga sus pedidos desde php/mis_pedidos.php
    const mostrarPerfil = async () => {
        mostrarVista('perfil');

        document.getElementById('perfilNombre').textContent = usuario.nombre;
        document.getElementById('perfilCorreo').textContent = usuario.correo;
        listaPedidos.replaceChildren(crearItemLista('Cargando pedidos...', '', true));

        try {
            const resultado = await llamarApi('php/mis_pedidos.php');

            listaPedidos.replaceChildren(
                ...(resultado.pedidos.length
                    ? resultado.pedidos.map(p => crearItemLista(
                        p.codigo_pedido + ' · ' + p.metodo_pago,
                        formatoMoneda(p.total)
                    ))
                    : [crearItemLista('Aún no tienes pedidos.', '', true)])
            );
        } catch (error) {
            listaPedidos.replaceChildren(crearItemLista(error.message, '', true));
        }
    };

    const abrirCuenta = () => {
        abrirPanel(null);

        if (usuario) {
            mostrarPerfil();
        } else {
            mostrarVista('login');
        }

        modalCuenta.classList.add('activo');
    };

    const cerrarCuenta = () => modalCuenta.classList.remove('activo');

    // Al cargar la página, pregunta al servidor si ya hay una sesión abierta
    const cargarSesion = async () => {
        try {
            const resultado = await llamarApi('php/estado_sesion.php');
            usuario = resultado.autenticado ? resultado.usuario : null;
        } catch (error) {
            usuario = null;
        }

        actualizarCuenta();
    };

    btnCuenta.addEventListener('click', abrirCuenta);
    document.getElementById('cerrarCuenta').addEventListener('click', cerrarCuenta);

    modalCuenta.addEventListener('click', (e) => {
        if (e.target === modalCuenta) cerrarCuenta();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarCuenta();
    });

    // Enlaces para cambiar entre "iniciar sesión" y "crear cuenta"
    document.getElementById('irRegistro').addEventListener('click', (e) => {
        e.preventDefault();
        mostrarVista('registro');
    });

    document.getElementById('irLogin').addEventListener('click', (e) => {
        e.preventDefault();
        mostrarVista('login');
    });

    // Iniciar sesión
    document.getElementById('formLogin').addEventListener('submit', async (e) => {
        e.preventDefault();

        const form = e.target;
        const errorGeneral = document.getElementById('lError');
        const boton = form.querySelector('button[type="submit"]');

        errorGeneral.textContent = '';

        if (!validarFormulario(form, REGLAS_LOGIN)) return;

        boton.disabled = true;

        try {
            const resultado = await llamarApi('php/iniciar_sesion.php', {
                correo: form.querySelector('#lCorreo').value.trim(),
                password: form.querySelector('#lPass').value
            });

            usuario = resultado.usuario;
            form.reset();
            actualizarCuenta();
            mostrarPerfil();
            mostrarToast('✓ Sesión iniciada');

        } catch (error) {
            errorGeneral.textContent = error.message;

        } finally {
            boton.disabled = false;
        }
    });

    // Crear cuenta (queda con la sesión iniciada)
    document.getElementById('formRegistro').addEventListener('submit', async (e) => {
        e.preventDefault();

        const form = e.target;
        const errorGeneral = document.getElementById('rError');
        const boton = form.querySelector('button[type="submit"]');

        errorGeneral.textContent = '';

        if (!validarFormulario(form, REGLAS_REGISTRO)) return;

        boton.disabled = true;

        try {
            const resultado = await llamarApi('php/registrar_usuario.php', {
                nombre: form.querySelector('#rNombre').value.trim(),
                correo: form.querySelector('#rCorreo').value.trim(),
                password: form.querySelector('#rPass').value,
                confirmar: form.querySelector('#rPass2').value
            });

            usuario = resultado.usuario;
            form.reset();
            actualizarCuenta();
            mostrarPerfil();
            mostrarToast('✓ Cuenta creada');

        } catch (error) {
            errorGeneral.textContent = error.message;

        } finally {
            boton.disabled = false;
        }
    });

    // Cerrar sesión
    document.getElementById('btnSalir').addEventListener('click', async () => {
        try {
            await llamarApi('php/cerrar_sesion.php', {});
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }

        usuario = null;
        document.getElementById('formPago').reset();
        actualizarCuenta();
        cerrarCuenta();
        mostrarToast('Sesión cerrada');
    });

    cargarSesion();

    // ============ Volver arriba y animaciones ============
    const btnArriba = document.getElementById('btnArriba');

    // Muestra el botón "volver arriba" cuando se ha bajado más de 400 px
    window.addEventListener('scroll', () => {
        btnArriba.classList.toggle('visible', window.scrollY > 400);
    });

    btnArriba.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Animación de aparición: las secciones se revelan al entrar en pantalla
    const obs = new IntersectionObserver((entradas) => {
        entradas.forEach(en => {
            if (en.isIntersecting) {
                en.target.classList.add('visible');
                obs.unobserve(en.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.seccion, .nosotros-card, .beneficios')
        .forEach(el => {
            el.classList.add('reveal');
            obs.observe(el);
        });

    // ============ Asistente Coco ============
    const cocoChat = document.getElementById('cocoChat');
    const cocoMsgs = document.getElementById('cocoMsgs');
    const cocoInput = document.getElementById('cocoInput');
    const cocoSaludo = document.getElementById('cocoSaludo');

    // Respuestas fijas de Coco: k = palabras clave que activan la respuesta, r = texto
    const RESPUESTAS = [
        {
            k: ['hola', 'buenas', 'hey'],
            r: '¡Hola! 🐊 Soy Coco, tu guía en Tecnología Altoque. Pregúntame por envíos o pagos, o escribe lo que buscas (laptop, HP, mouse...).'
        },
        {
            k: ['como compro', 'como comprar', 'pedido', 'carrito'],
            r: 'Es fácil 🛒: 1) Pulsa "Agregar al carrito" en tus productos. 2) Abre el carrito arriba a la derecha. 3) Toca "Finalizar compra" y llena tus datos.'
        },
        {
            k: ['envio', 'delivery', 'entrega'],
            r: 'Hacemos envíos a todo el Perú 🚚. Los detalles se confirman al finalizar tu compra.'
        },
        {
            k: ['pago', 'pagar', 'yape', 'plin', 'tarjeta'],
            r: 'Aceptamos Tarjeta, Yape, Plin y Contra entrega 💳. Eliges uno al finalizar la compra.'
        },
        {
            k: ['horario', 'hora', 'atienden', 'abierto'],
            r: 'Atendemos de lunes a sábado, de 9:00 AM a 7:00 PM 🕒. ¡La tienda online abre las 24 horas!'
        },
        {
            k: ['garantia'],
            r: 'Todos nuestros productos cuentan con garantía oficial 🛡️.'
        },
        {
            k: ['oscuro', 'claro', 'tema'],
            r: 'Toca el botón 🌙 del encabezado para cambiar entre tema claro y oscuro.'
        }
    ];

    // Palabras que el usuario puede escribir para cada categoría de productos
    const SINONIMOS = {
        computadoras: ['laptop', 'pc', 'computadora', 'tablet', 'notebook'],
        componentes: ['ssd', 'ram', 'disco', 'componente', 'procesador', 'ryzen', 'fuente', 'grafica', 'rtx', 'memoria'],
        perifericos: ['mouse', 'teclado', 'raton', 'periferico', 'webcam', 'mousepad'],
        impresoras: ['impresora', 'tinta'],
        audio: ['audifono', 'parlante', 'sonido', 'audio', 'microfono'],
        celulares: ['celular', 'telefono', 'smartphone'],
        tecnologia: ['smartwatch', 'reloj'],
        energia: ['ups', 'bateria', 'energia'],
        gaming: ['gamer', 'gaming', 'silla', 'monitor', 'control', 'mando'],
        redes: ['router', 'wifi', 'red', 'switch'],
        software: ['software', 'office', 'licencia'],
        pos: ['lector', 'codigo de barras']
    };

    // Cerebro de Coco: busca respuesta fija, producto, marca o categoría según lo que se escribió
    const responder = (texto) => {
        const t = norm(texto);
        const palabras = t.split(/[^a-z0-9]+/);

        const tiene = (lista) => lista.some(w =>
            w.includes(' ')
                ? t.includes(w)
                : palabras.some(p => p === w || p === w + 's')
        );

        const fija = RESPUESTAS.find(x => tiene(x.k));

        if (fija) return { texto: fija.r };

        if (tiene(['oferta', 'descuento', 'barato'])) {
            const top = [...PRODUCTOS]
                .filter(p => p.old && p.old > p.precio)
                .sort((a, b) =>
                    ((b.old - b.precio) / b.old) -
                    ((a.old - a.precio) / a.old)
                )
                .slice(0, 3);

            if (top.length === 0) {
                return {
                    texto: 'Por ahora no tengo ofertas disponibles. ¡Pronto tendremos novedades! 🐊'
                };
            }

            return {
                texto: '🔥 Mejores ofertas: ' +
                    top.map(p =>
                        `${p.nombre} (${formatoMoneda(p.precio)})`
                    ).join(', ') + '.'
            };
        }

        const marca = [...new Set(PRODUCTOS.map(p => norm(p.marca)))]
            .find(m => tiene([m]));

        if (marca) {
            return {
                texto: `¡Perfecto! Te muestro los productos de ${marca.toUpperCase()} 👇`,
                filtro: { marca }
            };
        }

        const cat = Object.keys(SINONIMOS)
            .find(k => tiene(SINONIMOS[k]));

        if (cat) {
            return {
                texto: 'Mira lo que tenemos en esa categoría 👇',
                filtro: { cat }
            };
        }

        return {
            texto: 'Mmm, no estoy seguro 🤔. Prueba con "envíos", "pagos", "horario" o escribe lo que buscas (laptop, mouse, HP...).'
        };
    };

    // Agrega un mensaje al chat de Coco (quien = 'yo' o 'bot')
    const cocoDecir = (texto, quien) => {
        const d = document.createElement('div');

        d.className = 'cmsg ' + quien;
        d.textContent = texto;

        cocoMsgs.appendChild(d);
        cocoMsgs.scrollTop = cocoMsgs.scrollHeight;
    };

    // Muestra la pregunta, espera un instante y responde; si hay filtro, lo aplica al catálogo
    const cocoPreguntar = (texto) => {
        cocoDecir(texto, 'yo');

        const r = responder(texto);

        setTimeout(() => {
            cocoDecir(r.texto, 'bot');

            if (r.filtro) {
                setTimeout(() => {
                    cocoChat.classList.remove('abierto');
                    aplicarFiltro(r.filtro);
                }, 900);
            }
        }, 500);
    };

    cocoDecir(
        '¡Hola! Soy Coco 🐊 Te ayudo a encontrar productos y resolver dudas. ¿Qué necesitas?',
        'bot'
    );

    document.getElementById('cocoRapidas').innerHTML =
        ['🛒 ¿Cómo compro?', '🚚 Envíos', '💳 Pagos', '🕒 Horario', '🔥 Ofertas', '💻 Laptops']
            .map(q => `<button type="button">${q}</button>`)
            .join('');

    document.getElementById('cocoRapidas').addEventListener('click', (e) => {
        if (e.target.closest('button')) {
            cocoPreguntar(e.target.textContent);
        }
    });

    document.getElementById('cocoBtn').addEventListener('click', () => {
        cocoChat.classList.toggle('abierto');
        cocoSaludo.classList.add('oculto');
    });

    document.getElementById('cocoCerrar').addEventListener('click', () => {
        cocoChat.classList.remove('abierto');
    });

    document.getElementById('cocoForm').addEventListener('submit', (e) => {
        e.preventDefault();

        if (cocoInput.value.trim()) {
            cocoPreguntar(cocoInput.value.trim());
        }

        cocoInput.value = '';
    });

    setTimeout(() => {
        if (!cocoChat.classList.contains('abierto')) {
            cocoSaludo.classList.remove('oculto');
        }
    }, 2000);

    setTimeout(() => cocoSaludo.classList.add('oculto'), 8000);

    // ============ Estado inicial ============
    cargarProductos();
    dibujarCarrito();

});