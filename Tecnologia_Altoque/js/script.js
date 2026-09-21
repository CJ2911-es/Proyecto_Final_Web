document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menuLateral');
    const overlay = document.getElementById('overlay');
    const btnMenu = document.getElementById('btnMenu');
    const btnCerrar = document.getElementById('btnCerrar');
    const iconoCarrito = document.querySelector('.carrito');
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.querySelector('.carrito span');
    const totalCarrito = document.getElementById('total-carrito');
    const btnVaciar = document.getElementById('btn-vaciar');

    let articulosCarrito = [];

    const toggleMenu = () => {
        menu.classList.toggle('activo');
        overlay.classList.toggle('activo');
    };

    const cerrarMenu = () => {
        menu.classList.remove('activo');
        overlay.classList.remove('activo');
    };

    btnMenu.addEventListener('click', toggleMenu);
    iconoCarrito.addEventListener('click', toggleMenu);
    btnCerrar.addEventListener('click', cerrarMenu);
    overlay.addEventListener('click', cerrarMenu);

    document.querySelectorAll('.btn-categoria').forEach(boton => {
        boton.addEventListener('click', () => {
            boton.nextElementSibling.classList.toggle('activo');
        });
    });

    document.querySelectorAll('.btn-carrito').forEach(boton => {
        boton.addEventListener('click', agregarProducto);
    });

    function agregarProducto(e) {
        const boton = e.currentTarget;
        const tarjetaProducto = boton.closest('.producto');
        const infoProducto = {
            imagen: tarjetaProducto.querySelector('img').src,
            titulo: tarjetaProducto.querySelector('h3').textContent,
            precio: parseFloat(tarjetaProducto.querySelector('.precio').textContent.replace('S/', '').trim()),
            cantidad: 1,
            id: tarjetaProducto.querySelector('h3').textContent
        };

        const existe = articulosCarrito.some(producto => producto.id === infoProducto.id);

        if (existe) {
            articulosCarrito = articulosCarrito.map(producto => {
                if (producto.id === infoProducto.id) {
                    producto.cantidad++;
                }
                return producto;
            });
        } else {
            articulosCarrito.push(infoProducto);
        }

        actualizarCarritoHTML();

        const textoOriginal = boton.textContent;
        boton.textContent = '✓ Agregado';
        boton.classList.add('agregado');

        setTimeout(() => {
            boton.textContent = textoOriginal;
            boton.classList.remove('agregado');
        }, 1000);
    }

    function actualizarCarritoHTML() {
        listaCarrito.innerHTML = '';

        let total = 0;
        let cantidadTotal = 0;

        articulosCarrito.forEach(producto => {
            const div = document.createElement('div');
            div.classList.add('item-carrito');
            div.innerHTML = `
                <img src="${producto.imagen}" alt="${producto.titulo}">
                <div class="item-carrito-info">
                    <h4>${producto.titulo}</h4>
                    <p>S/ ${producto.precio.toFixed(2)} x ${producto.cantidad}</p>
                </div>
                <button class="btn-eliminar" data-id="${producto.id}" title="Eliminar producto">✕</button>
            `;

            listaCarrito.appendChild(div);
            total += producto.precio * producto.cantidad;
            cantidadTotal += producto.cantidad;
        });

        totalCarrito.textContent = `S/ ${total.toFixed(2)}`;
        contadorCarrito.textContent = cantidadTotal;
    }

    listaCarrito.addEventListener('click', e => {
        if (e.target.classList.contains('btn-eliminar')) {
            const productoId = e.target.getAttribute('data-id');
            articulosCarrito = articulosCarrito.filter(producto => producto.id !== productoId);
            actualizarCarritoHTML();
        }
    });

    btnVaciar.addEventListener('click', () => {
        articulosCarrito = [];
        actualizarCarritoHTML();
    });

    actualizarCarritoHTML();

    // --- 5. LÓGICA DE FILTRADO POR CATEGORÍAS ---
    const botonesCategoria = document.querySelectorAll('.categoria');
    const listaProductos = document.querySelectorAll('.producto');

    botonesCategoria.forEach(boton => {
        boton.addEventListener('click', () => {
            // 1. Quitar la clase 'activa' de todos los botones y ponerla al que se hizo clic
            botonesCategoria.forEach(b => b.classList.remove('activa'));
            boton.classList.add('activa');

            // 2. Obtener el nombre de la categoría seleccionada
            const categoriaSeleccionada = boton.getAttribute('data-categoria');

            // 3. Mostrar u ocultar productos según la categoría
            listaProductos.forEach(producto => {
                const categoriaProducto = producto.getAttribute('data-categoria');
                
                // Si la categoría seleccionada es "todos" o coincide con la del producto, se muestra
                if (categoriaSeleccionada === 'todos' || categoriaProducto === categoriaSeleccionada) {
                    producto.classList.remove('oculto');
                } else {
                    // Si no coincide, se oculta
                    producto.classList.add('oculto');
                }
            });
        });
    });
});
