/* admin.js — Lógica del panel administrativo de Tecnología Altoque.
 * Todo dato dinámico se escapa con esc() antes de entrar al HTML (evita XSS).
 * La seguridad real vive en el servidor: aquí solo se valida para dar buena experiencia. */
(() => {
    'use strict';

    const modo = document.body.dataset.modo;
    const $ = (sel, raiz = document) => raiz.querySelector(sel);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const moneda = (n) => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fecha = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '');

    // =====================================================================
    //  Pantalla de acceso (sin sesión) o sin permisos
    // =====================================================================
    if (modo !== 'panel') {
        const form = $('#formAcceso');
        const error = $('#aError');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            error.hidden = true;
            const correo = $('#aCorreo').value.trim();
            const password = $('#aClave').value;

            if (!correo || !password) {
                error.textContent = 'Ingresa tu correo y tu contraseña.';
                error.hidden = false;
                return;
            }

            const boton = form.querySelector('button');
            boton.disabled = true;
            try {
                const r = await fetch('../php/iniciar_sesion.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin', body: JSON.stringify({ correo, password })
                });
                const d = await r.json();
                if (!r.ok || !d.exito) throw new Error(d.mensaje || 'No se pudo iniciar sesión.');
                location.reload(); // el servidor decide si esa cuenta es administradora
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
                boton.disabled = false;
            }
        });

        $('#btnSalirAcceso')?.addEventListener('click', async () => {
            await fetch('../php/cerrar_sesion.php', { method: 'POST', credentials: 'same-origin' });
            location.reload();
        });
        return;
    }

    // =====================================================================
    //  Panel
    // =====================================================================
    const CSRF = $('meta[name="csrf"]').content;
    const vista = $('#vista');

    // ---------- Comunicación con php/admin/*.php ----------
    async function api(ruta, { metodo = 'GET', params, json, form } = {}) {
        let url = '../php/admin/' + ruta;

        if (params) {
            const q = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) q.set(k, v); });
            if ([...q].length) url += '?' + q.toString();
        }

        const opciones = { method: metodo, credentials: 'same-origin', headers: {} };

        if (metodo === 'POST') {
            opciones.headers['X-CSRF-Token'] = CSRF;
            if (form) {
                opciones.body = form;
            } else {
                opciones.headers['Content-Type'] = 'application/json';
                opciones.body = JSON.stringify(json || {});
            }
        }

        let respuesta;
        try { respuesta = await fetch(url, opciones); } catch (e) { throw new Error('No hay conexión con el servidor.'); }

        let datos;
        try { datos = await respuesta.json(); } catch (e) { throw new Error('El servidor devolvió una respuesta inesperada.'); }

        if (respuesta.status === 401) { location.reload(); throw new Error(datos.mensaje || 'Sesión expirada.'); }
        if (!respuesta.ok || !datos.exito) throw new Error(datos.mensaje || 'Ocurrió un error.');
        return datos;
    }

    function avisar(mensaje, tipo = 'ok') {
        const t = document.createElement('div');
        t.className = 'toast ' + tipo;
        t.textContent = mensaje;
        $('#toasts').appendChild(t);
        setTimeout(() => t.remove(), tipo === 'error' ? 6000 : 3500);
    }

    // ---------- Ventana modal y confirmación ----------
    const modal = $('#modal');
    let alCerrarModal = null;

    function abrirModal(titulo, html, tam = '') {
        $('#modalTitulo').textContent = titulo;
        $('#modalCuerpo').innerHTML = html;
        $('#modalCaja').className = 'modal-caja ' + tam;
        modal.classList.add('activo');
        document.body.style.overflow = 'hidden';
        modal.scrollTop = 0;
        return $('#modalCuerpo');
    }
    function cerrarModal() {
        modal.classList.remove('activo');
        document.body.style.overflow = '';
        if (alCerrarModal) { alCerrarModal(); alCerrarModal = null; }
    }
    $('#modalX').addEventListener('click', cerrarModal);
    modal.addEventListener('mousedown', (e) => { if (e.target === modal) cerrarModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#confirmar').classList.contains('activo')) cerrarModal(); });

    function confirmar(titulo, texto, botonSi = 'Confirmar', peligro = false) {
        return new Promise((resolver) => {
            const c = $('#confirmar');
            $('#confTitulo').textContent = titulo;
            $('#confTexto').textContent = texto;
            const si = $('#confSi'), no = $('#confNo');
            si.textContent = botonSi;
            si.className = 'btn ' + (peligro ? 'btn-peligro' : 'btn-primario');
            c.classList.add('activo');
            const fin = (v) => { c.classList.remove('activo'); si.onclick = no.onclick = null; resolver(v); };
            si.onclick = () => fin(true);
            no.onclick = () => fin(false);
        });
    }

    // ---------- Piezas visuales ----------
    const badge = (clase, texto) => `<span class="badge ${clase}">${esc(texto)}</span>`;
    const badgeStock = (estado) => ({
        sin_inicializar: badge('b-gris', 'Sin inicializar'), agotado: badge('b-bad', 'Agotado'),
        bajo: badge('b-warn', 'Stock bajo'), ok: badge('b-ok', 'Disponible')
    }[estado] || '');
    const badgePedido = (e) => badge({ Pendiente: 'b-warn', Cancelado: 'b-bad', Entregado: 'b-ok' }[e] || 'b-info', e);
    const badgeTipo = (t) => badge({ entrada: 'b-ok', devolucion: 'b-ok', salida: 'b-warn', ajuste: 'b-info', venta: 'b-gris' }[t] || 'b-gris',
        { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste', venta: 'Venta', devolucion: 'Devolución' }[t] || t);
    const miniatura = (p) => `<div class="thumb">${p.imagen
        ? `<img src="../${esc(p.imagen)}" alt="" loading="lazy" data-emoji="${esc(p.emoji || '📦')}">`
        : esc(p.emoji || '📦')}</div>`;

    // Si una imagen no carga, se muestra el emoji de respaldo
    document.addEventListener('error', (e) => {
        const img = e.target;
        if (img.tagName === 'IMG' && img.dataset.emoji !== undefined) {
            img.replaceWith(document.createTextNode(img.dataset.emoji || '📦'));
        }
    }, true);

    const opciones = (lista, vacio) => `<option value="">${esc(vacio)}</option>` +
        lista.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('');

    function pintarPaginacion(cont, d, ir) {
        cont.innerHTML = `<span>${d.total} resultado(s) · página ${d.pagina} de ${d.paginas}</span>
            <button class="btn btn-secundario btn-chico" data-p="-1" ${d.pagina <= 1 ? 'disabled' : ''}>← Anterior</button>
            <button class="btn btn-secundario btn-chico" data-p="1" ${d.pagina >= d.paginas ? 'disabled' : ''}>Siguiente →</button>`;
        cont.onclick = (e) => {
            const b = e.target.closest('button[data-p]');
            if (b && !b.disabled) ir(d.pagina + Number(b.dataset.p));
        };
    }

    const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const leerFiltros = (raiz) => Object.fromEntries([...raiz.querySelectorAll('[data-f]')].map((el) => [el.dataset.f, el.value]));

    let catalogosCache = null;
    async function catalogos() {
        if (!catalogosCache) catalogosCache = await api('catalogos.php');
        return catalogosCache;
    }

    // =====================================================================
    //  Vista: Resumen
    // =====================================================================
    async function vistaDashboard() {
        const d = await api('estadisticas.php');
        const p = d.productos, o = d.pedidos;

        vista.innerHTML = `
            ${p.sin_inicializar > 0 ? `<div class="aviso"><span>${p.sin_inicializar} de ${p.activos} productos activos aún no tienen el stock configurado: se venden sin control de existencias hasta que lo definas.</span><a class="btn btn-primario" href="#inventario">Configurar inventario</a></div>` : ''}
            <div class="rejilla">
                <div class="kpi"><span>Productos</span><strong>${p.total}</strong><small>${p.activos} activos · ${p.inactivos} inactivos</small></div>
                <div class="kpi bad"><span>Sin stock (agotados)</span><strong>${p.sin_stock}</strong><small>productos activos</small></div>
                <div class="kpi warn"><span>Stock bajo</span><strong>${p.stock_bajo}</strong><small>en o bajo su mínimo</small></div>
                <div class="kpi"><span>Sin inicializar</span><strong>${p.sin_inicializar}</strong><small>stock por configurar</small></div>
                <div class="kpi ok"><span>Valor aproximado del inventario</span><strong>${moneda(p.valor_inventario)}</strong><small>stock × precio actual</small></div>
                <div class="kpi naranja"><span>Pedidos</span><strong>${o.total}</strong><small>${o.pendientes} pendientes · ${o.cancelados} cancelados</small></div>
                <div class="kpi ok"><span>Ventas registradas</span><strong>${moneda(o.ventas)}</strong><small>sin contar cancelados</small></div>
            </div>
            <div class="dos-col">
                <div class="panel"><h2>Pedidos recientes</h2>
                    <div class="tabla-wrap"><table><thead><tr><th>Código</th><th>Cliente</th><th class="num">Total</th><th>Estado</th></tr></thead><tbody>
                    ${o.recientes.length ? o.recientes.map((x) => `<tr><td><a href="#pedidos">${esc(x.codigo)}</a><br><small>${esc(fecha(x.fecha))}</small></td><td>${esc(x.cliente)}</td><td class="num">${moneda(x.total)}</td><td>${badgePedido(x.estado)}</td></tr>`).join('') : '<tr><td colspan="4" class="vacio">Aún no hay pedidos.</td></tr>'}
                    </tbody></table></div></div>
                <div class="panel"><h2>Últimos movimientos de inventario</h2>
                    <div class="tabla-wrap"><table><thead><tr><th>Producto</th><th>Tipo</th><th class="num">Cant.</th><th class="num">Stock</th></tr></thead><tbody>
                    ${d.movimientos_recientes.length ? d.movimientos_recientes.map((m) => `<tr><td>${esc(m.producto)}<br><small>${esc(fecha(m.fecha))}</small></td><td>${badgeTipo(m.tipo)}</td><td class="num">${m.cantidad}</td><td class="num">${m.resultante}</td></tr>`).join('') : '<tr><td colspan="4" class="vacio">Todavía no hay movimientos.</td></tr>'}
                    </tbody></table></div></div>
            </div>`;
    }

    // =====================================================================
    //  Vista: Productos
    // =====================================================================
    const estProd = { pagina: 1 };

    async function vistaProductos() {
        const c = await catalogos();
        vista.innerHTML = `
            <div class="barra">
                <label class="campo grande">Buscar<input type="search" data-f="q" placeholder="Nombre o marca" value="${esc(estProd.q || '')}"></label>
                <label class="campo">Categoría<select data-f="categoria">${opciones(c.categorias, 'Todas')}</select></label>
                <label class="campo">Marca<select data-f="marca">${opciones(c.marcas, 'Todas')}</select></label>
                <label class="campo">Estado<select data-f="estado"><option value="">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label>
                <label class="campo">Stock<select data-f="stock"><option value="">Todos</option><option value="agotado">Agotados</option><option value="bajo">Stock bajo</option><option value="ok">Disponibles</option><option value="sin_inicializar">Sin inicializar</option></select></label>
                <div class="acciones-barra"><button class="btn btn-primario" id="btnNuevo">+ Nuevo producto</button></div>
            </div>
            <div class="tabla-wrap"><table><thead><tr><th>Producto</th><th class="num">Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody id="tbProd"><tr><td colspan="5" class="cargando">Cargando…</td></tr></tbody></table></div>
            <div class="paginacion" id="pagProd"></div>`;

        ['categoria', 'marca', 'estado', 'stock'].forEach((k) => { $(`[data-f="${k}"]`).value = estProd[k] || ''; });

        const recargar = async (pagina = 1) => {
            Object.assign(estProd, leerFiltros(vista), { pagina });
            try {
                const d = await api('productos_listar.php', { params: estProd });
                $('#tbProd').innerHTML = d.productos.length ? d.productos.map((p) => `
                    <tr><td><div class="celda-prod">${miniatura(p)}<div><strong>${esc(p.nombre)}</strong><small>${esc(p.marca)} · ${esc(p.categoria)}</small></div></div></td>
                    <td class="num">${moneda(p.precio)}${p.precio_anterior ? `<br><small><s>${moneda(p.precio_anterior)}</s></small>` : ''}</td>
                    <td>${badgeStock(p.estado_stock)}${p.stock !== null ? `<br><small>${p.stock} u.</small>` : ''}</td>
                    <td>${p.activo ? badge('b-ok', 'Activo') : badge('b-gris', 'Inactivo')}</td>
                    <td><div class="acciones"><button class="btn btn-secundario btn-chico" data-editar="${p.id}">Editar</button>
                    <button class="btn btn-chico ${p.activo ? 'btn-secundario' : 'btn-primario'}" data-estado="${p.id}" data-activo="${p.activo ? 0 : 1}" data-nombre="${esc(p.nombre)}">${p.activo ? 'Desactivar' : 'Reactivar'}</button></div></td></tr>`).join('')
                    : '<tr><td colspan="5" class="vacio">No hay productos con esos filtros.</td></tr>';
                pintarPaginacion($('#pagProd'), d, recargar);
            } catch (e) { avisar(e.message, 'error'); }
        };

        vista.querySelectorAll('select[data-f]').forEach((s) => s.addEventListener('change', () => recargar(1)));
        $('[data-f="q"]').addEventListener('input', debounce(() => recargar(1)));
        $('#btnNuevo').addEventListener('click', () => formProducto(null, () => recargar(estProd.pagina)));

        $('#tbProd').addEventListener('click', async (e) => {
            const ed = e.target.closest('[data-editar]');
            if (ed) return formProducto(Number(ed.dataset.editar), () => recargar(estProd.pagina));

            const es = e.target.closest('[data-estado]');
            if (!es) return;
            const activar = es.dataset.activo === '1';
            const ok = await confirmar(activar ? 'Reactivar producto' : 'Desactivar producto',
                activar ? `«${es.dataset.nombre}» volverá a mostrarse en la tienda.`
                        : `«${es.dataset.nombre}» dejará de mostrarse y de poder comprarse. No se borra nada: podrás reactivarlo.`,
                activar ? 'Reactivar' : 'Desactivar', !activar);
            if (!ok) return;
            try {
                const r = await api('producto_estado.php', { metodo: 'POST', json: { id: Number(es.dataset.estado), activo: activar ? 1 : 0 } });
                avisar(r.mensaje);
                recargar(estProd.pagina);
            } catch (err) { avisar(err.message, 'error'); }
        });

        recargar(estProd.pagina);
    }

    // ---------- Formulario de producto (crear / editar) ----------
    async function formProducto(id, alGuardar) {
        let datos = { producto: { activo: 1, stock_minimo: 5 }, especificaciones: [] };
        let c;
        try {
            c = await catalogos();
            if (id) datos = await api('producto_obtener.php', { params: { id } });
        } catch (e) { return avisar(e.message, 'error'); }

        const p = datos.producto;
        const specs = datos.especificaciones.map((s) => ({ atributo: s.atributo, valor: s.valor }));
        let archivo = null, urlVista = null;

        const cuerpo = abrirModal(id ? 'Editar producto' : 'Nuevo producto', `
            <form id="fProd" novalidate>
                <div class="form-grid">
                    <label class="completo">Nombre *<input type="text" name="nombre" maxlength="180" value="${esc(p.nombre || '')}"><span class="msg-campo" data-m="nombre"></span></label>
                    <label>Categoría *<select name="id_categoria">${opciones(c.categorias, 'Selecciona…')}</select><span class="msg-campo" data-m="id_categoria"></span></label>
                    <label>Marca *<select name="id_marca">${opciones(c.marcas, 'Selecciona…')}</select><span class="msg-campo" data-m="id_marca"></span></label>
                    <label>Precio actual (S/) *<input type="text" inputmode="decimal" name="precio" value="${esc(p.precio || '')}"><span class="msg-campo" data-m="precio"></span></label>
                    <label>Precio anterior (S/)<input type="text" inputmode="decimal" name="precio_anterior" value="${esc(p.precio_anterior || '')}"><span class="ayuda">Solo si está en oferta; debe ser mayor al actual.</span><span class="msg-campo" data-m="precio_anterior"></span></label>
                    <label>Tipo<input type="text" name="tipo" maxlength="50" value="${esc(p.tipo || '')}" placeholder="gaming, oficina…"><span class="ayuda">Opcional. Se usa en los filtros de la tienda.</span><span class="msg-campo" data-m="tipo"></span></label>
                    <label>Emoji de respaldo<input type="text" name="emoji" maxlength="20" value="${esc(p.emoji || '')}" placeholder="🖱️"><span class="ayuda">Se muestra si el producto no tiene imagen.</span></label>
                    <label>Stock mínimo (alerta)<input type="number" name="stock_minimo" min="0" value="${esc(p.stock_minimo ?? 5)}"><span class="msg-campo" data-m="stock_minimo"></span></label>
                    ${id ? `<div class="campo">Existencias actuales<div><strong>${p.stock === null ? 'Sin inicializar' : p.stock + ' unidades'}</strong></div><span class="ayuda">Se cambian desde Inventario, para que quede registrado el movimiento.</span></div>`
                         : `<label>Stock inicial<input type="number" name="stock_inicial" min="0" placeholder="Vacío = sin inicializar"><span class="ayuda">Escribe la cantidad real. Si lo dejas vacío, se configura después.</span><span class="msg-campo" data-m="stock_inicial"></span></label>`}
                    <label class="interruptor completo"><input type="checkbox" name="activo" ${p.activo ? 'checked' : ''}> Producto activo (visible en la tienda)</label>
                    <label class="completo">Descripción<textarea name="descripcion" maxlength="5000">${esc(p.descripcion || '')}</textarea></label>
                    <div class="completo campo">Imagen principal
                        <div class="img-bloque">
                            <div class="img-vista" id="imgVista">${p.imagen ? `<img src="../${esc(p.imagen)}" alt="Imagen actual" data-emoji="">` : 'Sin imagen'}</div>
                            <div><input type="file" id="fImg" accept="image/jpeg,image/png,image/webp"><span class="ayuda">JPG, PNG o WEBP · máx. 3 MB.${id ? ' Si no eliges una, se conserva la actual.' : ''}</span><span class="msg-campo" data-m="imagen"></span></div>
                        </div>
                    </div>
                    <div class="completo campo">Especificaciones técnicas
                        <div class="specs" id="specs"></div>
                        <button class="btn btn-secundario btn-chico" type="button" id="btnSpec" style="margin-top:8px">+ Agregar especificación</button>
                    </div>
                </div>
                <p class="error-form" id="fError" role="alert" hidden></p>
                <div class="acciones"><button class="btn btn-secundario" type="button" id="fCancelar">Cancelar</button><button class="btn btn-primario" type="submit" id="fGuardar">${id ? 'Guardar cambios' : 'Crear producto'}</button></div>
            </form>`);

        const f = $('#fProd', cuerpo);
        const F = (n) => f.elements.namedItem(n);
        F('id_categoria').value = p.id_categoria || '';
        F('id_marca').value = p.id_marca || '';
        alCerrarModal = () => { if (urlVista) URL.revokeObjectURL(urlVista); };

        // --- Especificaciones dinámicas ---
        const pintarSpecs = () => {
            const cont = $('#specs', cuerpo);
            if (!specs.length) { cont.innerHTML = '<p class="ayuda">Sin especificaciones. Agrega la primera.</p>'; return; }
            cont.innerHTML = specs.map((s, i) => `
                <div class="spec-fila" data-i="${i}">
                    <input type="text" data-k="atributo" maxlength="80" placeholder="Atributo (ej. Color)" value="${esc(s.atributo)}" aria-label="Atributo">
                    <input type="text" data-k="valor" maxlength="255" placeholder="Valor (ej. Negro)" value="${esc(s.valor)}" aria-label="Valor">
                    <div class="mini">
                        <button type="button" class="btn-ic" data-a="sube" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
                        <button type="button" class="btn-ic" data-a="baja" ${i === specs.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
                        <button type="button" class="btn-ic" data-a="quita" aria-label="Eliminar">✕</button>
                    </div>
                </div>`).join('');
        };
        pintarSpecs();
        $('#specs', cuerpo).addEventListener('input', (e) => {
            const fila = e.target.closest('.spec-fila');
            if (fila && e.target.dataset.k) specs[Number(fila.dataset.i)][e.target.dataset.k] = e.target.value;
        });
        $('#specs', cuerpo).addEventListener('click', (e) => {
            const b = e.target.closest('button[data-a]');
            if (!b) return;
            const i = Number(b.closest('.spec-fila').dataset.i);
            if (b.dataset.a === 'quita') specs.splice(i, 1);
            if (b.dataset.a === 'sube' && i > 0) [specs[i - 1], specs[i]] = [specs[i], specs[i - 1]];
            if (b.dataset.a === 'baja' && i < specs.length - 1) [specs[i + 1], specs[i]] = [specs[i], specs[i + 1]];
            pintarSpecs();
        });
        $('#btnSpec', cuerpo).addEventListener('click', () => {
            if (specs.length >= 40) return avisar('Máximo 40 especificaciones.', 'error');
            specs.push({ atributo: '', valor: '' });
            pintarSpecs();
            const ult = $('#specs .spec-fila:last-child input', cuerpo);
            ult && ult.focus();
        });

        // --- Vista previa de imagen ---
        $('#fImg', cuerpo).addEventListener('change', (e) => {
            const msg = $('[data-m="imagen"]', cuerpo);
            msg.textContent = '';
            archivo = null;
            if (urlVista) { URL.revokeObjectURL(urlVista); urlVista = null; }
            const a = e.target.files[0];
            if (!a) return;
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(a.type)) { msg.textContent = 'Formato no permitido. Usa JPG, PNG o WEBP.'; e.target.value = ''; return; }
            if (a.size > 3 * 1024 * 1024) { msg.textContent = 'La imagen supera los 3 MB.'; e.target.value = ''; return; }
            archivo = a;
            urlVista = URL.createObjectURL(a);
            $('#imgVista', cuerpo).innerHTML = `<img src="${urlVista}" alt="Vista previa">`;
        });

        $('#fCancelar', cuerpo).addEventListener('click', cerrarModal);

        // --- Validación en el navegador (el servidor vuelve a validar todo) ---
        const validar = () => {
            const m = {};
            const v = (n) => F(n).value.trim();
            if (v('nombre').length < 3 || v('nombre').length > 180) m.nombre = 'El nombre debe tener entre 3 y 180 caracteres.';
            if (!F('id_categoria').value) m.id_categoria = 'Selecciona una categoría.';
            if (!F('id_marca').value) m.id_marca = 'Selecciona una marca.';
            const num = (t) => Number(t.replace(',', '.'));
            const monto = /^\d{1,8}([.,]\d{1,2})?$/;
            if (!monto.test(v('precio')) || num(v('precio')) <= 0) m.precio = 'Ingresa un monto válido mayor que cero (máx. 2 decimales).';
            if (v('precio_anterior') !== '') {
                if (!monto.test(v('precio_anterior'))) m.precio_anterior = 'Monto no válido.';
                else if (!m.precio && num(v('precio_anterior')) <= num(v('precio'))) m.precio_anterior = 'Debe ser mayor que el precio actual.';
            }
            if (v('tipo') !== '' && !/^[a-záéíóúñü0-9 _-]+$/i.test(v('tipo'))) m.tipo = 'Solo letras, números, espacios y guiones.';
            if (!/^\d+$/.test(v('stock_minimo'))) m.stock_minimo = 'Entero de 0 o más.';
            if (F('stock_inicial') && v('stock_inicial') !== '' && !/^\d+$/.test(v('stock_inicial'))) m.stock_inicial = 'Entero de 0 o más.';
            return m;
        };

        f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const error = $('#fError', cuerpo);
            error.hidden = true;
            cuerpo.querySelectorAll('.msg-campo').forEach((x) => { if (x.dataset.m !== 'imagen') x.textContent = ''; });
            f.querySelectorAll('.invalido').forEach((x) => x.classList.remove('invalido'));

            const errores = validar();
            const claves = Object.keys(errores);
            if (claves.length) {
                claves.forEach((k) => { const s = $(`[data-m="${k}"]`, cuerpo); if (s) s.textContent = errores[k]; if (F(k)) F(k).classList.add('invalido'); });
                F(claves[0]).focus();
                return;
            }
            if (specs.some((s) => (s.atributo.trim() === '') !== (s.valor.trim() === ''))) {
                error.textContent = 'Cada especificación necesita atributo y valor (o elimina la fila vacía).';
                error.hidden = false;
                return;
            }

            const fd = new FormData();
            ['nombre', 'descripcion', 'id_categoria', 'id_marca', 'tipo', 'precio', 'precio_anterior', 'emoji', 'stock_minimo']
                .forEach((n) => fd.append(n, F(n).value.trim()));
            if (id) fd.append('id', id);
            else if (F('stock_inicial')) fd.append('stock_inicial', F('stock_inicial').value.trim());
            fd.append('activo', F('activo').checked ? '1' : '0');
            fd.append('especificaciones', JSON.stringify(specs.filter((s) => s.atributo.trim() !== '' || s.valor.trim() !== '')));
            if (archivo) fd.append('imagen', archivo);

            const boton = $('#fGuardar', cuerpo);
            boton.disabled = true;
            boton.textContent = 'Guardando…';
            try {
                const r = await api('producto_guardar.php', { metodo: 'POST', form: fd });
                avisar(r.mensaje);
                cerrarModal();
                alGuardar && alGuardar();
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
                boton.disabled = false;
                boton.textContent = id ? 'Guardar cambios' : 'Crear producto';
            }
        });
    }

    // =====================================================================
    //  Vista: Inventario
    // =====================================================================
    const estInv = { pagina: 1 };

    async function vistaInventario() {
        vista.innerHTML = `
            <div class="barra">
                <label class="campo grande">Buscar<input type="search" data-f="q" placeholder="Nombre del producto" value="${esc(estInv.q || '')}"></label>
                <label class="campo">Estado del stock<select data-f="estado"><option value="">Todos</option><option value="agotado">Agotados</option><option value="bajo">Stock bajo</option><option value="ok">Disponibles</option><option value="sin_inicializar">Sin inicializar</option></select></label>
                <div class="acciones-barra"><button class="btn btn-secundario" id="btnInicializar">Inicializar stock</button></div>
            </div>
            <div class="tabla-wrap"><table><thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">Mínimo</th><th>Estado</th><th></th></tr></thead><tbody id="tbInv"><tr><td colspan="5" class="cargando">Cargando…</td></tr></tbody></table></div>
            <div class="paginacion" id="pagInv"></div>`;

        $('[data-f="estado"]').value = estInv.estado || '';

        const recargar = async (pagina = 1) => {
            Object.assign(estInv, leerFiltros(vista), { pagina });
            try {
                const d = await api('inventario_listar.php', { params: estInv });
                $('#tbInv').innerHTML = d.productos.length ? d.productos.map((p) => `
                    <tr><td><div class="celda-prod">${miniatura(p)}<div><strong>${esc(p.nombre)}</strong><small>${esc(p.marca)}${p.activo ? '' : ' · inactivo'}</small></div></div></td>
                    <td class="num"><strong>${p.stock === null ? '—' : p.stock}</strong></td><td class="num">${p.stock_minimo}</td><td>${badgeStock(p.estado_stock)}</td>
                    <td><div class="acciones">${p.stock === null
                        ? `<button class="btn btn-primario btn-chico" data-mov="ajuste" data-id="${p.id}">Definir stock</button>`
                        : `<button class="btn btn-secundario btn-chico" data-mov="entrada" data-id="${p.id}">+ Entrada</button><button class="btn btn-secundario btn-chico" data-mov="salida" data-id="${p.id}">− Salida</button><button class="btn btn-secundario btn-chico" data-mov="ajuste" data-id="${p.id}">Ajustar</button>`}
                        <a class="btn btn-secundario btn-chico" href="#movimientos" data-hist="${p.id}" data-nombre="${esc(p.nombre)}">Historial</a></div></td></tr>`).join('')
                    : '<tr><td colspan="5" class="vacio">No hay productos con esos filtros.</td></tr>';
                $('#tbInv').productos = d.productos;
                pintarPaginacion($('#pagInv'), d, recargar);
            } catch (e) { avisar(e.message, 'error'); }
        };

        $('[data-f="estado"]').addEventListener('change', () => recargar(1));
        $('[data-f="q"]').addEventListener('input', debounce(() => recargar(1)));
        $('#btnInicializar').addEventListener('click', () => formInicializar(() => recargar(estInv.pagina)));

        $('#tbInv').addEventListener('click', (e) => {
            const h = e.target.closest('[data-hist]');
            if (h) { estMov.id_producto = h.dataset.hist; estMov.nombreProducto = h.dataset.nombre; estMov.pagina = 1; return; }
            const b = e.target.closest('[data-mov]');
            if (!b) return;
            const prod = $('#tbInv').productos.find((x) => x.id === Number(b.dataset.id));
            formMovimiento(prod, b.dataset.mov, () => recargar(estInv.pagina));
        });

        recargar(estInv.pagina);
    }

    function formMovimiento(p, tipo, alGuardar) {
        const titulo = { entrada: 'Registrar entrada', salida: 'Registrar salida', ajuste: p.stock === null ? 'Definir stock inicial' : 'Ajustar stock' }[tipo];
        const motivos = { entrada: 'Compra a proveedor, devolución de cliente…', salida: 'Merma, daño, uso interno…', ajuste: p.stock === null ? 'Stock inicial, conteo físico…' : 'Conteo físico, corrección…' }[tipo];

        const cuerpo = abrirModal(titulo, `
            <form id="fMov" novalidate>
                <p style="margin-bottom:14px"><strong>${esc(p.nombre)}</strong><br><span class="ayuda">Stock actual: ${p.stock === null ? 'sin inicializar' : p.stock + ' unidades'}</span></p>
                <label class="campo">${tipo === 'ajuste' ? 'Nuevo stock total (unidades reales)' : 'Cantidad de unidades'} *
                    <input type="number" name="cantidad" min="${tipo === 'ajuste' ? 0 : 1}" step="1" required></label>
                <label class="campo">Motivo *<input type="text" name="motivo" maxlength="255" placeholder="${esc(motivos)}"></label>
                <p class="error-form" id="mError" role="alert" hidden></p>
                <div class="acciones"><button class="btn btn-secundario" type="button" id="mCancelar">Cancelar</button><button class="btn btn-primario" type="submit">Registrar</button></div>
            </form>`, 'mediana');

        const f = $('#fMov', cuerpo);
        const F = (n) => f.elements.namedItem(n);
        F('cantidad').focus();
        $('#mCancelar', cuerpo).addEventListener('click', cerrarModal);

        f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const error = $('#mError', cuerpo);
            error.hidden = true;
            const cantidad = F('cantidad').value.trim();
            const motivo = F('motivo').value.trim();
            const min = tipo === 'ajuste' ? 0 : 1;

            if (!/^\d+$/.test(cantidad) || Number(cantidad) < min) { error.textContent = 'Ingresa un número entero' + (min ? ' mayor que cero.' : ' de 0 o más.'); error.hidden = false; return; }
            if (motivo.length < 3) { error.textContent = 'Escribe el motivo del movimiento (mínimo 3 caracteres).'; error.hidden = false; return; }

            if (tipo === 'ajuste' && p.stock !== null) {
                const ok = await confirmar('Confirmar ajuste', `El stock de «${p.nombre}» pasará de ${p.stock} a ${cantidad} unidades.`, 'Aplicar ajuste');
                if (!ok) return;
            }
            try {
                const r = await api('inventario_movimiento.php', { metodo: 'POST', json: { id_producto: p.id, tipo, cantidad: Number(cantidad), motivo } });
                avisar(`${r.mensaje} Stock: ${r.movimiento.anterior === null ? '—' : r.movimiento.anterior} → ${r.movimiento.resultante}`);
                cerrarModal();
                alGuardar && alGuardar();
            } catch (err) { error.textContent = err.message; error.hidden = false; }
        });
    }

    async function formInicializar(alGuardar) {
        let d;
        try { d = await api('inventario_listar.php', { params: { estado: 'sin_inicializar', por_pagina: 100, orden: 'nombre' } }); }
        catch (e) { return avisar(e.message, 'error'); }

        if (!d.productos.length) return avisar('Todos los productos ya tienen su inventario inicializado.');

        const cuerpo = abrirModal('Inicializar inventario', `
            <form id="fIni" novalidate>
                <p class="nota">Escribe las existencias <strong>reales</strong> de cada producto (cuéntalos físicamente). Los que dejes vacíos seguirán sin control de stock.${d.total > d.productos.length ? ` Se muestran ${d.productos.length} de ${d.total}; repite la operación para el resto.` : ''}</p>
                <div class="tabla-wrap"><table style="min-width:0"><thead><tr><th>Producto</th><th class="num" style="width:130px">Stock real</th></tr></thead><tbody>
                ${d.productos.map((p) => `<tr><td>${esc(p.nombre)}<br><small>${esc(p.marca)}</small></td><td><input type="number" min="0" step="1" data-id="${p.id}" style="margin:0" aria-label="Stock de ${esc(p.nombre)}"></td></tr>`).join('')}
                </tbody></table></div>
                <p class="error-form" id="iError" role="alert" hidden style="margin-top:12px"></p>
                <div class="acciones"><button class="btn btn-secundario" type="button" id="iCancelar">Cancelar</button><button class="btn btn-primario" type="submit">Guardar stock inicial</button></div>
            </form>`, 'mediana');

        $('#iCancelar', cuerpo).addEventListener('click', cerrarModal);
        $('#fIni', cuerpo).addEventListener('submit', async (e) => {
            e.preventDefault();
            const error = $('#iError', cuerpo);
            error.hidden = true;
            const items = [];
            for (const inp of cuerpo.querySelectorAll('input[data-id]')) {
                const v = inp.value.trim();
                if (v === '') continue;
                if (!/^\d+$/.test(v)) { error.textContent = 'Todas las cantidades deben ser enteros de 0 o más.'; error.hidden = false; inp.focus(); return; }
                items.push({ id: Number(inp.dataset.id), stock: Number(v) });
            }
            if (!items.length) { error.textContent = 'Escribe al menos una cantidad.'; error.hidden = false; return; }
            if (!(await confirmar('Guardar stock inicial', `Se definirá el stock de ${items.length} producto(s). Quedará registrado en el historial.`, 'Guardar'))) return;
            try {
                const r = await api('inventario_inicializar.php', { metodo: 'POST', json: { items } });
                avisar(r.mensaje);
                cerrarModal();
                alGuardar && alGuardar();
            } catch (err) { error.textContent = err.message; error.hidden = false; }
        });
    }

    // =====================================================================
    //  Vista: Movimientos (historial)
    // =====================================================================
    const estMov = { pagina: 1 };

    async function vistaMovimientos() {
        vista.innerHTML = `
            <div class="barra">
                <label class="campo grande">Producto<input type="search" id="mProd" list="mLista" placeholder="Escribe para buscar…" autocomplete="off" value="${esc(estMov.nombreProducto || '')}"><datalist id="mLista"></datalist></label>
                <label class="campo">Tipo<select data-f="tipo"><option value="">Todos</option><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste</option><option value="venta">Venta</option><option value="devolucion">Devolución</option></select></label>
                <label class="campo">Desde<input type="date" data-f="desde"></label>
                <label class="campo">Hasta<input type="date" data-f="hasta"></label>
            </div>
            <div class="tabla-wrap"><table style="min-width:820px"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="num">Cant.</th><th class="num">Antes → Después</th><th>Motivo</th><th>Responsable</th></tr></thead><tbody id="tbMov"><tr><td colspan="7" class="cargando">Cargando…</td></tr></tbody></table></div>
            <div class="paginacion" id="pagMov"></div>`;

        ['tipo', 'desde', 'hasta'].forEach((k) => { $(`[data-f="${k}"]`).value = estMov[k] || ''; });
        const mapa = {};

        const recargar = async (pagina = 1) => {
            Object.assign(estMov, leerFiltros(vista), { pagina });
            try {
                const d = await api('inventario_historial.php', { params: estMov });
                $('#tbMov').innerHTML = d.movimientos.length ? d.movimientos.map((m) => `
                    <tr><td>${esc(fecha(m.fecha))}</td><td>${esc(m.producto)}</td><td>${badgeTipo(m.tipo)}</td><td class="num">${m.cantidad}</td>
                    <td class="num">${m.anterior === null ? '—' : m.anterior} → <strong>${m.resultante}</strong></td>
                    <td>${esc(m.motivo)}${m.pedido ? `<br><small>Pedido ${esc(m.pedido)}</small>` : ''}</td><td>${m.responsable ? esc(m.responsable) : '<small>Automático</small>'}</td></tr>`).join('')
                    : '<tr><td colspan="7" class="vacio">No hay movimientos con esos filtros.</td></tr>';
                pintarPaginacion($('#pagMov'), d, recargar);
            } catch (e) { avisar(e.message, 'error'); }
        };

        vista.querySelectorAll('select[data-f], input[type=date]').forEach((el) => el.addEventListener('change', () => recargar(1)));

        // Búsqueda de producto con sugerencias
        const buscarProd = debounce(async () => {
            const texto = $('#mProd').value.trim();
            if (texto === '') { estMov.id_producto = ''; estMov.nombreProducto = ''; return recargar(1); }
            if (mapa[texto]) { estMov.id_producto = mapa[texto]; estMov.nombreProducto = texto; return recargar(1); }
            try {
                const d = await api('inventario_listar.php', { params: { q: texto, por_pagina: 20, orden: 'nombre' } });
                d.productos.forEach((p) => { mapa[p.nombre] = p.id; });
                $('#mLista').innerHTML = d.productos.map((p) => `<option value="${esc(p.nombre)}">`).join('');
            } catch (e) { /* sin sugerencias */ }
        }, 250);
        $('#mProd').addEventListener('input', buscarProd);

        recargar(estMov.pagina);
    }

    // =====================================================================
    //  Vista: Pedidos
    // =====================================================================
    const estPed = { pagina: 1 };

    async function vistaPedidos() {
        vista.innerHTML = `
            <div class="barra">
                <label class="campo grande">Buscar<input type="search" data-f="q" placeholder="Código, cliente o correo" value="${esc(estPed.q || '')}"></label>
                <label class="campo">Estado<select data-f="estado"><option value="">Todos</option><option>Pendiente</option><option>Cancelado</option><option>Entregado</option></select></label>
            </div>
            <div class="tabla-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Pago</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead><tbody id="tbPed"><tr><td colspan="6" class="cargando">Cargando…</td></tr></tbody></table></div>
            <div class="paginacion" id="pagPed"></div>`;

        $('[data-f="estado"]').value = estPed.estado || '';

        const recargar = async (pagina = 1) => {
            Object.assign(estPed, leerFiltros(vista), { pagina });
            try {
                const d = await api('pedidos_listar.php', { params: estPed });
                $('#tbPed').innerHTML = d.pedidos.length ? d.pedidos.map((x) => `
                    <tr><td><strong>${esc(x.codigo)}</strong><br><small>${esc(fecha(x.fecha))}</small></td><td>${esc(x.cliente)}<br><small>${esc(x.correo)}</small></td>
                    <td>${esc(x.metodo)}</td><td class="num">${moneda(x.total)}</td><td>${badgePedido(x.estado)}</td>
                    <td><div class="acciones"><button class="btn btn-secundario btn-chico" data-ver="${x.id}">Ver detalle</button></div></td></tr>`).join('')
                    : '<tr><td colspan="6" class="vacio">No hay pedidos con esos filtros.</td></tr>';
                pintarPaginacion($('#pagPed'), d, recargar);
            } catch (e) { avisar(e.message, 'error'); }
        };

        $('[data-f="estado"]').addEventListener('change', () => recargar(1));
        $('[data-f="q"]').addEventListener('input', debounce(() => recargar(1)));
        $('#tbPed').addEventListener('click', (e) => {
            const b = e.target.closest('[data-ver]');
            if (b) detallePedido(Number(b.dataset.ver), () => recargar(estPed.pagina));
        });
        recargar(estPed.pagina);
    }

    async function detallePedido(id, alCambiar) {
        let d;
        try { d = await api('pedido_detalle.php', { params: { id } }); } catch (e) { return avisar(e.message, 'error'); }
        const p = d.pedido;

        const cuerpo = abrirModal('Pedido ' + p.codigo, `
            <ul class="detalle-lista">
                <li><span>Estado</span>${badgePedido(p.estado)}</li>
                <li><span>Fecha</span><strong>${esc(fecha(p.fecha))}</strong></li>
                <li><span>Cliente</span><strong>${esc(p.cliente)}</strong></li>
                <li><span>Correo</span><strong>${esc(p.correo)}</strong></li>
                <li><span>Dirección</span><strong>${esc(p.direccion)}</strong></li>
                <li><span>Método de pago</span><strong>${esc(p.metodo)}</strong></li>
            </ul>
            <div class="tabla-wrap"><table style="min-width:0"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead><tbody>
            ${d.items.map((i) => `<tr><td>${esc(i.nombre)}</td><td class="num">${i.cantidad}</td><td class="num">${moneda(i.precio)}</td><td class="num">${moneda(i.subtotal)}</td></tr>`).join('')}
            <tr><td colspan="3" class="num"><strong>Total</strong></td><td class="num"><strong>${moneda(p.total)}</strong></td></tr></tbody></table></div>
            <p class="nota">${d.stock.repuesto ? 'Las existencias de este pedido ya fueron repuestas al cancelarlo.'
                : d.stock.descontado ? 'Este pedido descontó existencias. Si lo cancelas, se repondrán automáticamente.'
                : 'Este pedido no descontó existencias (es anterior al control de inventario o sus productos no tenían stock configurado).'}</p>
            <div class="acciones"><button class="btn btn-secundario" id="pCerrar" type="button">Cerrar</button>
            ${d.cancelable ? '<button class="btn btn-peligro" id="pCancelar" type="button">Cancelar pedido</button>' : ''}</div>`, 'mediana');

        $('#pCerrar', cuerpo).addEventListener('click', cerrarModal);
        $('#pCancelar', cuerpo)?.addEventListener('click', async () => {
            if (!(await confirmar('Cancelar pedido', `Se cancelará el pedido ${p.codigo}${d.stock.descontado ? ' y se repondrán sus existencias al inventario' : ''}. Esta acción no se puede deshacer.`, 'Cancelar pedido', true))) return;
            try {
                const r = await api('pedido_cancelar.php', { metodo: 'POST', json: { id } });
                avisar(r.mensaje);
                cerrarModal();
                alCambiar && alCambiar();
            } catch (err) { avisar(err.message, 'error'); }
        });
    }

    // =====================================================================
    //  Navegación
    // =====================================================================
    const vistas = {
        dashboard: ['Resumen', vistaDashboard], productos: ['Productos', vistaProductos], inventario: ['Inventario', vistaInventario],
        movimientos: ['Movimientos de inventario', vistaMovimientos], pedidos: ['Pedidos', vistaPedidos]
    };

    async function navegar() {
        const clave = (location.hash || '#dashboard').slice(1);
        const [titulo, pintar] = vistas[clave] || vistas.dashboard;
        $('#titulo').textContent = titulo;
        document.title = titulo + ' | Panel Altoque';
        $('#menu').querySelectorAll('a').forEach((a) => a.classList.toggle('activo', a.dataset.vista === (vistas[clave] ? clave : 'dashboard')));
        cerrarMenuMovil();
        vista.innerHTML = '<p class="cargando">Cargando…</p>';
        try { await pintar(); } catch (e) { vista.innerHTML = `<div class="panel"><p class="error-form">${esc(e.message)}</p></div>`; }
    }
    window.addEventListener('hashchange', navegar);

    const sidebar = $('#sidebar'), velo = $('#velo');
    const cerrarMenuMovil = () => { sidebar.classList.remove('abierto'); velo.classList.remove('activo'); };
    $('#btnMenuMov').addEventListener('click', () => { sidebar.classList.add('abierto'); velo.classList.add('activo'); });
    velo.addEventListener('click', cerrarMenuMovil);

    $('#btnSalir').addEventListener('click', async () => {
        await fetch('../php/cerrar_sesion.php', { method: 'POST', credentials: 'same-origin' });
        location.href = './';
    });

    navegar();
})();
