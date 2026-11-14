// ==========================================================
// REGISTRO DE IA
// (Reemplazá esta línea por tu comentario de registro de IA)
// ==========================================================

"use strict";

// ----------------------------------------------------------
// 1. DATOS: array de fichas
// ----------------------------------------------------------
const CLAVE_DATOS = "web3d-datos";

let fichas = [
  {
    id: "leon",
    seccionId: "animales",
    titulo: "León",
    modelo: "modelos/Leon.glb",
    descripcion:
      "El león es un felino grande que vive en la sabana africana. Es el único felino que vive en grupos sociales, llamados manadas, y el macho se reconoce por su melena.",
    datosCuriosos: [
      "Su rugido puede oírse a unos 8 km de distancia.",
      "Puede dormir hasta 20 horas por día.",
      "Las leonas son las que cazan casi siempre en la manada."
    ],
    autorModelo: "",
    licencia: "",
    fuente: ""
  },
  {
    id: "corazon-humano",
    seccionId: "cuerpo-humano",
    titulo: "Corazón humano",
    modelo: "modelos/corazon.glb",
    descripcion:
      "El corazón es un músculo que bombea la sangre por todo el cuerpo. Tiene cuatro cavidades: dos aurículas y dos ventrículos.",
    datosCuriosos: [
      "Late alrededor de 100.000 veces por día.",
      "Tiene aproximadamente el tamaño de un puño cerrado.",
      "En reposo bombea unos 5 litros de sangre por minuto."
    ],
    autorModelo: "",
    licencia: "",
    fuente: ""
  },
  {
    id: "girasol",
    seccionId: "plantas",
    titulo: "Girasol",
    modelo: "modelos/girasol.glb",
    descripcion:
      "El girasol es una planta originaria de América. Lo que parece una sola flor grande es en realidad una inflorescencia formada por cientos de flores pequeñas.",
    datosCuriosos: [
      "Los girasoles jóvenes siguen al Sol durante el día.",
      "Las semillas se ordenan en espirales.",
      "De sus semillas se obtiene aceite comestible."
    ],
    autorModelo: "",
    licencia: "",
    fuente: ""
  }
];

// Índice de la ficha que se está viendo en cada sección
let indices = {
  "animales": 0,
  "plantas": 0,
  "cuerpo-humano": 0
};

// ----------------------------------------------------------
// 2. LOCALSTORAGE
// ----------------------------------------------------------
// Progreso del alumno: ids de fichas vistas y favoritas, y si el filtro está activo.
// Se guarda junto con las fichas, bajo la misma clave.
let progreso = {
  vistas: [],
  favoritas: [],
  soloFavoritas: false
};

function guardarDatos() {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify({ fichas, indices, progreso }));
  } catch (error) {
    console.warn("No se pudieron guardar los datos:", error);
  }
}

function cargarDatos() {
  try {
    const guardado = localStorage.getItem(CLAVE_DATOS);
    if (!guardado) return false;

    const datos = JSON.parse(guardado);
    if (Array.isArray(datos.fichas)) {
      fichas = datos.fichas;
    }
    if (datos.indices && typeof datos.indices === "object") {
      indices = { ...indices, ...datos.indices };
    }
    if (datos.progreso && typeof datos.progreso === "object") {
      progreso = {
        vistas: Array.isArray(datos.progreso.vistas) ? datos.progreso.vistas : [],
        favoritas: Array.isArray(datos.progreso.favoritas) ? datos.progreso.favoritas : [],
        soloFavoritas: datos.progreso.soloFavoritas === true
      };
    }
    return true;
  } catch (error) {
    console.warn("No se pudieron cargar los datos:", error);
    return false;
  }
}

// ----------------------------------------------------------
// 3. FICHAS Y VISOR
// ----------------------------------------------------------
function fichasDe(seccionId) {
  return fichas.filter((ficha) => ficha.seccionId === seccionId);
}

// Devuelve el <model-viewer> del visor; si no existe todavía, lo crea.
function obtenerModelViewer(seccionId) {
  const visor = document.getElementById("visor-" + seccionId);
  if (!visor) return null;

  let viewer = visor.querySelector("model-viewer");
  if (!viewer) {
    viewer = document.createElement("model-viewer");
    viewer.setAttribute("camera-controls", "");
    viewer.setAttribute("auto-rotate", "");
    viewer.setAttribute("touch-action", "pan-y");
    viewer.setAttribute("camera-orbit", "0deg 75deg auto");
    viewer.setAttribute("shadow-intensity", "1");
    viewer.setAttribute("environment-image", "neutral");
    visor.appendChild(viewer);
  }
  return viewer;
}

// Arma el texto de créditos con los datos que haya cargados
function textoCreditos(ficha) {
  const partes = [];
  if (ficha.autorModelo) partes.push("«" + ficha.titulo + "» por " + ficha.autorModelo);
  if (ficha.fuente) partes.push("fuente: " + ficha.fuente);
  if (ficha.licencia) partes.push("licencia: " + ficha.licencia);
  return partes.length > 0
    ? "Modelo 3D — " + partes.join(" · ")
    : "Créditos del modelo pendientes de completar.";
}

// registrarVista: al abrir una ficha se marca como vista (✓).
// Al iniciar la página se pasa false para no marcar nada sin que el alumno la abra.
function mostrarFicha(seccionId, indice, registrarVista = true) {
  const lista = fichasVisibles(seccionId);
  const panel = document.getElementById("ficha-" + seccionId);
  const contador = document.getElementById("contador-" + seccionId);
  if (!panel) return;

  const titulo = panel.querySelector(".ficha-titulo");
  const descripcion = panel.querySelector(".ficha-descripcion");
  const datos = panel.querySelector(".ficha-datos");
  const creditos = panel.querySelector(".ficha-creditos");

  // Sección sin fichas
  if (lista.length === 0) {
    const hayFichas = fichasDe(seccionId).length > 0;
    titulo.textContent = hayFichas ? "Sin favoritas" : "Sin fichas";
    descripcion.textContent = hayFichas
      ? "Todavía no marcaste fichas favoritas en esta sección. Usá el botón ⭐ Favorito o desactivá el filtro."
      : "Todavía no hay contenido en esta sección.";
    datos.replaceChildren();
    creditos.textContent = "";
    const visorVacio = document.querySelector("#visor-" + seccionId + " model-viewer");
    if (visorVacio) visorVacio.removeAttribute("src");
    if (contador) contador.textContent = "";
    actualizarBotones(seccionId, 0);
    actualizarEstado(seccionId, null);
    return;
  }

  // Índice circular: después de la última vuelve a la primera
  const i = ((indice % lista.length) + lista.length) % lista.length;
  const ficha = lista[i];
  indices[seccionId] = i;

  // Visor 3D
  const viewer = obtenerModelViewer(seccionId);
  if (viewer) {
    if (viewer.getAttribute("src") !== ficha.modelo) {
      viewer.setAttribute("src", ficha.modelo);
    }
    viewer.setAttribute(
      "alt",
      "Modelo 3D de " + ficha.titulo.toLowerCase() + ", que se puede girar para verlo desde todos los lados"
    );
  }

  // Ficha informativa
  titulo.textContent = ficha.titulo;
  descripcion.textContent = ficha.descripcion;

  datos.replaceChildren();
  ficha.datosCuriosos.forEach((dato) => {
    const li = document.createElement("li");
    li.textContent = dato;
    datos.appendChild(li);
  });

  creditos.textContent = textoCreditos(ficha);

  if (contador) {
    contador.textContent =
      (progreso.soloFavoritas ? "⭐ " : "") + (i + 1) + " / " + lista.length;
  }
  actualizarBotones(seccionId, lista.length);

  if (registrarVista) marcarVista(ficha.id);
  actualizarEstado(seccionId, ficha);
  actualizarProgreso();
  guardarDatos();
}

// Con una sola ficha no tiene sentido navegar
function actualizarBotones(seccionId, cantidad) {
  document
    .querySelectorAll('[data-nav][data-seccion="' + seccionId + '"]')
    .forEach((boton) => {
      boton.disabled = cantidad <= 1;
    });
}

// ----------------------------------------------------------
// 3b. PROGRESO: vistas (✓), favoritas (⭐) y filtro
// ----------------------------------------------------------
function esVista(id) {
  return progreso.vistas.includes(id);
}

function esFavorita(id) {
  return progreso.favoritas.includes(id);
}

function marcarVista(id) {
  if (!esVista(id)) progreso.vistas.push(id);
}

function alternarFavorita(id) {
  if (esFavorita(id)) {
    progreso.favoritas = progreso.favoritas.filter((x) => x !== id);
  } else {
    progreso.favoritas.push(id);
  }
  guardarDatos();
}

// Fichas que se navegan en una sección: todas, o solo las favoritas si el filtro está activo
function fichasVisibles(seccionId) {
  const lista = fichasDe(seccionId);
  return progreso.soloFavoritas ? lista.filter((f) => esFavorita(f.id)) : lista;
}

// Actualiza el sello "✓ Vista" y el botón ⭐ Favorito de la ficha que se muestra
function actualizarEstado(seccionId, ficha) {
  const panel = document.getElementById("ficha-" + seccionId);
  if (!panel) return;
  const sello = panel.querySelector(".ficha-vista");
  const boton = panel.querySelector("[data-favorito]");

  if (!ficha) {
    sello.hidden = true;
    boton.disabled = true;
    boton.setAttribute("aria-pressed", "false");
    delete boton.dataset.id;
    return;
  }

  sello.hidden = !esVista(ficha.id);
  boton.disabled = false;
  boton.dataset.id = ficha.id;
  boton.setAttribute("aria-pressed", String(esFavorita(ficha.id)));
}

// Portada: "2 de 3 vistas" en cada tarjeta de sección
function actualizarProgreso() {
  ["animales", "plantas", "cuerpo-humano"].forEach((seccionId) => {
    const etiqueta = document.getElementById("progreso-" + seccionId);
    if (!etiqueta) return;

    const lista = fichasDe(seccionId);
    const vistas = lista.filter((f) => esVista(f.id)).length;
    const completo = lista.length > 0 && vistas === lista.length;

    etiqueta.textContent =
      vistas + " de " + lista.length + (lista.length === 1 ? " vista" : " vistas") +
      (completo ? " ✓" : "");
  });
}

// Texto y estado de todos los botones del filtro (portada y secciones)
function actualizarFiltro() {
  const totalFavoritas = fichas.filter((f) => esFavorita(f.id)).length;
  document.querySelectorAll("[data-filtro-favoritas]").forEach((boton) => {
    boton.setAttribute("aria-pressed", String(progreso.soloFavoritas));
    boton.textContent =
      (progreso.soloFavoritas ? "⭐ Solo favoritas" : "⭐ Ver solo favoritas") +
      " (" + totalFavoritas + ")";
  });
}

function alternarFiltro() {
  progreso.soloFavoritas = !progreso.soloFavoritas;
  indices = { "animales": 0, "plantas": 0, "cuerpo-humano": 0 };

  // Si el alumno está dentro de una sección, la ficha que ve ahora cuenta como abierta
  const vistaActiva = document.querySelector(".vista-activa");
  ["animales", "plantas", "cuerpo-humano"].forEach((seccionId) => {
    mostrarFicha(seccionId, 0, vistaActiva && vistaActiva.id === seccionId);
  });

  actualizarFiltro();
  guardarDatos();
}

// ----------------------------------------------------------
// 4. GESTIÓN DE FICHAS: crear, editar y borrar
// ----------------------------------------------------------
const SECCIONES = {
  "animales": "Animales",
  "cuerpo-humano": "Cuerpo humano",
  "plantas": "Plantas"
};

const CAMPOS_FORM = ["seccion", "titulo", "modelo", "descripcion", "autor", "licencia"];

const formFicha = document.getElementById("form-ficha");
const listaFichas = document.getElementById("lista-fichas");
const formMensaje = document.getElementById("form-mensaje");
const btnCancelarEdicion = document.getElementById("btn-cancelar-edicion");

function campo(nombre) {
  return document.getElementById("campo-" + nombre);
}

function leerFormulario() {
  return {
    id: document.getElementById("ficha-id").value,
    seccionId: campo("seccion").value,
    titulo: campo("titulo").value.trim(),
    modelo: campo("modelo").value.trim(),
    descripcion: campo("descripcion").value.trim(),
    datosCuriosos: campo("datos").value
      .split("\n")
      .map((linea) => linea.trim())
      .filter(Boolean),
    autorModelo: campo("autor").value.trim(),
    licencia: campo("licencia").value.trim(),
    fuente: campo("fuente").value.trim()
  };
}

// Devuelve un objeto { campo: "mensaje de error" } (vacío si todo está bien)
function validarFicha(v) {
  const errores = {};

  if (!SECCIONES[v.seccionId]) {
    errores.seccion = "Elegí una sección.";
  }

  if (!v.titulo) {
    errores.titulo = "El título no puede estar vacío.";
  } else if (
    SECCIONES[v.seccionId] &&
    fichas.some(
      (f) =>
        f.id !== v.id &&
        f.seccionId === v.seccionId &&
        f.titulo.trim().toLowerCase() === v.titulo.toLowerCase()
    )
  ) {
    errores.titulo = "Ya existe una ficha con ese título en esta sección.";
  }

  if (!v.modelo) {
    errores.modelo = "La ruta del modelo no puede estar vacía.";
  } else if (!/^modelos\/.+\.glb$/i.test(v.modelo)) {
    errores.modelo = "La ruta debe empezar con «modelos/» y terminar en «.glb».";
  }

  if (!v.descripcion) {
    errores.descripcion = "La descripción no puede estar vacía.";
  }

  if (!v.autorModelo) {
    errores.autor = "Indicá el autor del modelo.";
  }

  if (!v.licencia) {
    errores.licencia = "Indicá la licencia del modelo (por ejemplo, CC BY 4.0 o CC0).";
  }

  return errores;
}

function mostrarErrores(errores) {
  CAMPOS_FORM.forEach((nombre) => {
    const input = campo(nombre);
    const mensaje = errores[nombre] || "";
    document.getElementById("error-" + nombre).textContent = mensaje;
    input.classList.toggle("campo-invalido", Boolean(mensaje));
    if (mensaje) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  });
}

function limpiarError(nombre) {
  document.getElementById("error-" + nombre).textContent = "";
  campo(nombre).classList.remove("campo-invalido");
  campo(nombre).removeAttribute("aria-invalid");
}

function generarId(titulo) {
  const base = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "ficha") + "-" + Date.now().toString(36);
}

function limpiarFormulario() {
  formFicha.reset();
  document.getElementById("ficha-id").value = "";
  document.getElementById("form-titulo").textContent = "Nueva ficha";
  btnCancelarEdicion.hidden = true;
  mostrarErrores({});
}

function cargarEnFormulario(ficha) {
  document.getElementById("ficha-id").value = ficha.id;
  campo("seccion").value = ficha.seccionId;
  campo("titulo").value = ficha.titulo;
  campo("modelo").value = ficha.modelo;
  campo("descripcion").value = ficha.descripcion;
  campo("datos").value = (ficha.datosCuriosos || []).join("\n");
  campo("autor").value = ficha.autorModelo || "";
  campo("licencia").value = ficha.licencia || "";
  campo("fuente").value = ficha.fuente || "";

  document.getElementById("form-titulo").textContent = "Editando: " + ficha.titulo;
  btnCancelarEdicion.hidden = false;
  formMensaje.textContent = "";
  mostrarErrores({});
  formFicha.scrollIntoView({ behavior: "smooth", block: "start" });
  campo("titulo").focus();
}

function guardarFicha(valores) {
  const ficha = { ...valores };
  const posicion = fichas.findIndex((f) => f.id === valores.id);

  if (valores.id && posicion >= 0) {
    fichas[posicion] = ficha;
  } else {
    ficha.id = generarId(valores.titulo);
    fichas.push(ficha);
  }

  // Al volver a la sección se ve la ficha recién guardada
  indices[ficha.seccionId] = Math.max(
    0,
    fichasVisibles(ficha.seccionId).findIndex((f) => f.id === ficha.id)
  );
  guardarDatos();
}

function borrarFicha(ficha) {
  const confirmado = window.confirm(
    "¿Borrar la ficha «" + ficha.titulo + "»? Esta acción no se puede deshacer."
  );
  if (!confirmado) return;

  fichas = fichas.filter((f) => f.id !== ficha.id);
  progreso.vistas = progreso.vistas.filter((id) => id !== ficha.id);
  progreso.favoritas = progreso.favoritas.filter((id) => id !== ficha.id);
  if (document.getElementById("ficha-id").value === ficha.id) limpiarFormulario();
  guardarDatos();
  actualizarProgreso();
  actualizarFiltro();
  renderLista();
  formMensaje.textContent = "Ficha borrada.";
}

function renderLista() {
  listaFichas.replaceChildren();

  if (fichas.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "lista-vacia";
    vacio.textContent = "No hay fichas todavía. Creá la primera con el formulario.";
    listaFichas.appendChild(vacio);
    return;
  }

  Object.keys(SECCIONES).forEach((seccionId) => {
    fichasDe(seccionId).forEach((ficha) => {
      const item = document.createElement("article");
      item.className = "item-ficha";
      item.dataset.seccion = seccionId;

      const info = document.createElement("div");
      info.className = "item-info";
      const titulo = document.createElement("strong");
      titulo.textContent = ficha.titulo;
      const seccion = document.createElement("span");
      seccion.textContent = SECCIONES[seccionId];
      info.append(titulo, seccion);

      const acciones = document.createElement("div");
      acciones.className = "item-acciones";
      const editar = document.createElement("button");
      editar.type = "button";
      editar.className = "btn btn-chico";
      editar.dataset.accion = "editar";
      editar.dataset.id = ficha.id;
      editar.textContent = "Editar";
      const borrar = document.createElement("button");
      borrar.type = "button";
      borrar.className = "btn btn-chico btn-peligro";
      borrar.dataset.accion = "borrar";
      borrar.dataset.id = ficha.id;
      borrar.textContent = "Borrar";
      acciones.append(editar, borrar);

      item.append(info, acciones);
      listaFichas.appendChild(item);
    });
  });
}

formFicha.addEventListener("submit", (evento) => {
  evento.preventDefault();
  formMensaje.textContent = "";

  const valores = leerFormulario();
  const errores = validarFicha(valores);
  mostrarErrores(errores);

  const primero = CAMPOS_FORM.find((nombre) => errores[nombre]);
  if (primero) {
    campo(primero).focus();
    return;
  }

  guardarFicha(valores);
  actualizarProgreso();
  limpiarFormulario();
  renderLista();
  formMensaje.textContent = "Ficha guardada.";
});

btnCancelarEdicion.addEventListener("click", () => {
  limpiarFormulario();
  formMensaje.textContent = "";
});

listaFichas.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const ficha = fichas.find((f) => f.id === boton.dataset.id);
  if (!ficha) return;

  if (boton.dataset.accion === "editar") cargarEnFormulario(ficha);
  if (boton.dataset.accion === "borrar") borrarFicha(ficha);
});

// Al escribir en un campo, se borra su error
CAMPOS_FORM.forEach((nombre) => {
  ["input", "change"].forEach((tipo) => {
    campo(nombre).addEventListener(tipo, () => limpiarError(nombre));
  });
});

// ----------------------------------------------------------
// 5. NAVEGACIÓN ENTRE VISTAS Y BOTONES ANTERIOR / SIGUIENTE
// ----------------------------------------------------------
function irA(vistaId) {
  const destino = document.getElementById(vistaId);
  if (!destino) return;

  document.querySelectorAll(".vista").forEach((vista) => {
    vista.classList.remove("vista-activa");
  });
  destino.classList.add("vista-activa");

  if (SECCIONES[vistaId]) {
    mostrarFicha(vistaId, indices[vistaId] || 0);
  } else if (vistaId === "gestionar") {
    renderLista();
  }
  window.scrollTo({ top: 0 });
}

document.addEventListener("click", (evento) => {
  const favorito = evento.target.closest("[data-favorito]");
  if (favorito) {
    if (!favorito.disabled && favorito.dataset.id) {
      alternarFavorita(favorito.dataset.id);
      favorito.setAttribute("aria-pressed", String(esFavorita(favorito.dataset.id)));
      actualizarFiltro();
    }
    return;
  }

  if (evento.target.closest("[data-filtro-favoritas]")) {
    alternarFiltro();
    return;
  }

  const ir = evento.target.closest("[data-ir]");
  if (ir) {
    evento.preventDefault();
    irA(ir.dataset.ir);
    return;
  }

  const nav = evento.target.closest("[data-nav]");
  if (nav && !nav.disabled) {
    const seccionId = nav.dataset.seccion;
    const paso = nav.dataset.nav === "siguiente" ? 1 : -1;
    mostrarFicha(seccionId, (indices[seccionId] || 0) + paso);
  }
});

// ----------------------------------------------------------
// 6. EXPORTAR E IMPORTAR
// ----------------------------------------------------------
const btnExportar = document.getElementById("btn-exportar");
const btnImportar = document.getElementById("btn-importar");
const inputImportar = document.getElementById("input-importar");
const pieMensaje = document.getElementById("pie-mensaje");
const MAX_BYTES_IMPORTACION = 5 * 1024 * 1024;
let temporizadorMensaje = null;

function mostrarMensajePie(tipo, texto) {
  clearTimeout(temporizadorMensaje);
  pieMensaje.textContent = texto;
  pieMensaje.className = "pie-mensaje pie-mensaje--" + tipo;

  // Los mensajes de éxito se van solos; los errores quedan hasta la próxima acción
  if (tipo === "ok") {
    temporizadorMensaje = setTimeout(() => {
      pieMensaje.textContent = "";
      pieMensaje.className = "pie-mensaje";
    }, 6000);
  }
}

// Exportar: arma un JSON legible y lo descarga con un Blob y un enlace temporal
function exportarDatos() {
  const datos = {
    app: "web3d",
    version: 1,
    exportadoEl: new Date().toISOString(),
    fichas,
    progreso
  };

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "web3d.json";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  mostrarMensajePie("ok", "Se exportaron " + fichas.length + " fichas y el progreso a web3d.json.");
}

function esObjeto(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

// Verifica que el archivo tenga todas las listas esperadas (fichas, progreso.vistas,
// progreso.favoritas) y que cada ficha sea válida. Devuelve { error } o { fichas, progreso }.
function validarImportacion(datos) {
  if (!esObjeto(datos)) {
    return { error: "El archivo no tiene el formato esperado: tiene que ser un objeto con «fichas» y «progreso»." };
  }
  if (!Array.isArray(datos.fichas)) {
    return { error: "Falta la lista «fichas» en el archivo." };
  }
  if (!esObjeto(datos.progreso)) {
    return { error: "Falta la sección «progreso» en el archivo." };
  }
  if (!Array.isArray(datos.progreso.vistas)) {
    return { error: "Falta la lista «progreso.vistas» en el archivo." };
  }
  if (!Array.isArray(datos.progreso.favoritas)) {
    return { error: "Falta la lista «progreso.favoritas» en el archivo." };
  }

  const ids = new Set();
  const nuevas = [];

  for (let i = 0; i < datos.fichas.length; i++) {
    const f = datos.fichas[i];
    const n = i + 1;

    if (!esObjeto(f)) return { error: "La ficha " + n + " no es válida." };
    if (typeof f.id !== "string" || !f.id.trim()) {
      return { error: "La ficha " + n + " no tiene id." };
    }
    if (ids.has(f.id)) {
      return { error: "Hay dos fichas con el mismo id («" + f.id + "»)." };
    }
    if (!Object.prototype.hasOwnProperty.call(SECCIONES, f.seccionId)) {
      return { error: "La ficha " + n + " tiene una sección inválida (solo Animales, Cuerpo humano o Plantas)." };
    }
    if (typeof f.titulo !== "string" || !f.titulo.trim()) {
      return { error: "La ficha " + n + " no tiene título." };
    }
    if (typeof f.modelo !== "string" || !/^modelos\/.+\.glb$/i.test(f.modelo.trim())) {
      return { error: "La ficha " + n + " («" + f.titulo + "») tiene una ruta de modelo inválida: debe empezar con «modelos/» y terminar en «.glb»." };
    }
    if (typeof f.descripcion !== "string" || !f.descripcion.trim()) {
      return { error: "La ficha " + n + " («" + f.titulo + "») no tiene descripción." };
    }
    if (!Array.isArray(f.datosCuriosos)) {
      return { error: "La ficha " + n + " («" + f.titulo + "») no tiene la lista «datosCuriosos»." };
    }

    ids.add(f.id);
    nuevas.push({
      id: f.id,
      seccionId: f.seccionId,
      titulo: f.titulo.trim(),
      modelo: f.modelo.trim(),
      descripcion: f.descripcion.trim(),
      datosCuriosos: f.datosCuriosos.filter((d) => typeof d === "string"),
      autorModelo: typeof f.autorModelo === "string" ? f.autorModelo : "",
      licencia: typeof f.licencia === "string" ? f.licencia : "",
      fuente: typeof f.fuente === "string" ? f.fuente : ""
    });
  }

  // Del progreso solo se conservan ids de fichas que existen en el archivo
  const soloExistentes = (lista) =>
    lista.filter((id) => typeof id === "string" && ids.has(id));

  return {
    fichas: nuevas,
    progreso: {
      vistas: soloExistentes(datos.progreso.vistas),
      favoritas: soloExistentes(datos.progreso.favoritas),
      soloFavoritas: datos.progreso.soloFavoritas === true
    }
  };
}

// Vuelve a dibujar toda la pantalla con los datos actuales
function redibujarTodo() {
  limpiarFormulario();
  formMensaje.textContent = "";
  renderLista();

  const vistaActiva = document.querySelector(".vista-activa");
  Object.keys(SECCIONES).forEach((seccionId) => {
    const abierta = Boolean(vistaActiva && vistaActiva.id === seccionId);
    mostrarFicha(seccionId, indices[seccionId] || 0, abierta);
  });

  actualizarProgreso();
  actualizarFiltro();
}

async function importarArchivo(archivo) {
  if (archivo.size > MAX_BYTES_IMPORTACION) {
    mostrarMensajePie("error", "El archivo es demasiado grande (máximo 5 MB). No se cambió nada.");
    return;
  }

  let datos;
  try {
    datos = JSON.parse(await archivo.text());
  } catch (error) {
    mostrarMensajePie("error", "El archivo no es un JSON válido. No se cambió nada.");
    return;
  }

  const resultado = validarImportacion(datos);
  if (resultado.error) {
    mostrarMensajePie("error", resultado.error + " No se cambió nada.");
    return;
  }

  const confirmado = window.confirm(
    "Se van a REEMPLAZAR todas las fichas y el progreso actuales por los del archivo «" +
      archivo.name + "» (" + resultado.fichas.length + " fichas, " +
      resultado.progreso.vistas.length + " vistas, " +
      resultado.progreso.favoritas.length + " favoritas).\n\n" +
      "Esta acción no se puede deshacer. ¿Querés continuar?"
  );
  if (!confirmado) {
    mostrarMensajePie("ok", "Importación cancelada. No se cambió nada.");
    return;
  }

  // Recién acá se reemplazan los datos
  fichas = resultado.fichas;
  progreso = resultado.progreso;
  indices = { "animales": 0, "plantas": 0, "cuerpo-humano": 0 };
  guardarDatos();
  redibujarTodo();
  mostrarMensajePie("ok", "Datos importados: " + fichas.length + (fichas.length === 1 ? " ficha." : " fichas."));
}

btnExportar.addEventListener("click", exportarDatos);

btnImportar.addEventListener("click", () => {
  inputImportar.click();
});

inputImportar.addEventListener("change", async () => {
  const archivo = inputImportar.files[0];
  if (!archivo) return;
  try {
    await importarArchivo(archivo);
  } finally {
    inputImportar.value = ""; // permite volver a elegir el mismo archivo
  }
});

// ----------------------------------------------------------
// 7. INICIO
// ----------------------------------------------------------
const habiaDatos = cargarDatos();
if (!habiaDatos) guardarDatos();

["animales", "plantas", "cuerpo-humano"].forEach((seccionId) => {
  mostrarFicha(seccionId, indices[seccionId] || 0, false);
});

actualizarProgreso();
actualizarFiltro();

// ----------------------------------------------------------
// 8. SERVICE WORKER (PWA offline)
// ----------------------------------------------------------
// Solo registra si el navegador lo admite, y espera a que la página
// termine de cargar para no competir con la carga inicial de la app.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("./sw.js")
      .then(function () {
        console.log("Service worker registrado: la app ya puede andar sin internet.");
      })
      .catch(function (error) {
        // Si falla, la app sigue funcionando online. No se rompe nada.
        console.warn("No se pudo registrar el service worker:", error);
      });
  });
}
