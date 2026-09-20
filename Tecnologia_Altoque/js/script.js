const menu=document.getElementById("menuLateral");
const overlay=document.getElementById("overlay");

btnMenu.onclick=()=>{menu.classList.add("activo");overlay.classList.add("activo")};
btnCerrar.onclick=overlay.onclick=()=>{menu.classList.remove("activo");overlay.classList.remove("activo")};

let cantidad=0;
const contador=document.querySelector(".carrito span");

document.querySelectorAll(".btn-carrito").forEach(b=>b.onclick=()=>{
    contador.textContent=++cantidad;
    b.textContent="✓ Agregado";
    setTimeout(()=>b.textContent="🛒 Agregar al carrito",1000);
});

document.querySelectorAll(".btn-categoria").forEach(b=>b.onclick=()=>{
    b.nextElementSibling.classList.toggle("activo");
});