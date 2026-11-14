// ==========================================================================
// SERVICE WORKER de "Biologia 3D"
// --------------------------------------------------------------------------
// Un service worker es un archivo que el navegador ejecuta APARTE de la
// página, como una especie de "recepcionista" que queda de guardia entre
// visitas. No toca el DOM ni puede usar window: solo escucha eventos
// (install, activate, fetch) y decide cómo se responden los pedidos.
//
// OJO: solo funciona en https:// o en http://localhost (no con file://).
// ==========================================================================

// VERSION: el "número de edición" del paquete de archivos guardados.
// Cada vez que cambies archivos de la app, subilo ("v2", "v3"...).
// Ese cambio es lo que hace que se dispare el evento activate y se limpie
// la caché vieja. Si no lo cambiás, el celular sigue mostrando lo de antes.
const VERSION = "v1";

// CACHE: el nombre real de la caché en el disco del navegador.
// Le pego la VERSION al final ("biologia3d-v1") así cada versión tiene
// su propia caja y activate puede borrar las cajas de las versiones viejas.
const CACHE = "biologia3d-" + VERSION;

// ARCHIVOS: exactamente lo que la app necesita para abrir sin internet.
// Todos con "./" adelante, porque la app vive en una subcarpeta y una ruta
// que empiece con "/" apuntaría a la raíz del dominio (y no existiría).
const ARCHIVOS = [
  "./",                 // la portada ("./" equivale a ./index.html)
  "./index.html",       // el HTML
  "./styles.css",       // los estilos
  "./app.js",           // la lógica
  "./manifest.json",    // el manifest, para que la app siga siendo instalable
  "./icono-192.png",    // ícono chico de la PWA
  "./icono-512.png",    // ícono grande de la PWA
  "./modelos/Leon.glb",     // modelo 3D del león (Animales)
  "./modelos/Corazon.glb",  // modelo 3D del corazón (Cuerpo humano)
  "./modelos/Girasol.glb"   // el último NO lleva coma
];

// --------------------------------------------------------------------------
// install: se ejecuta UNA vez, cuando el navegador instala la versión nueva
// del service worker. Acá se "hace la mudanza": se descargan todos los
// ARCHIVOS y se guardan en la caché antes de tomar el control.
// --------------------------------------------------------------------------
self.addEventListener("install", function (evento) {
  // waitUntil le dice al navegador: "esperá a que esta promesa termine
  // antes de considerar instalado el service worker". Sin esto, el
  // navegador podría cerrarlo a mitad de la descarga de los archivos.
  evento.waitUntil(
    // cache.open() abre (o crea si no existe) la caché con ese nombre
    // y devuelve una promesa con el objeto caché.
    caches.open(CACHE).then(function (cache) {
      // addAll recorre la lista y guarda todo. Si UN solo archivo falla
      // (por ejemplo, si León.glb tiene mal el nombre), falla TODA la
      // instalación: es todo o nada. Eso es bueno, porque evita quedar
      // con una app "a medias" que anda offline solo parcialmente.
      return cache.addAll(ARCHIVOS);
    })
  );
});

// --------------------------------------------------------------------------
// activate: se ejecuta cuando el service worker nuevo toma el control y el
// viejo se retira. Es el momento de limpiar: borrar las cachés que ya no
// usan la VERSION actual (por ejemplo "biologia3d-v1" cuando pasás a v2).
// --------------------------------------------------------------------------
self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    // caches.keys() devuelve los nombres de TODAS las cachés de este sitio.
    caches.keys().then(function (nombres) {
      // Devuelvo un array de promesas: una por cada caché a borrar.
      return Promise.all(
        nombres.map(function (nombre) {
          // Si el nombre NO es el de la versión actual, es basura vieja.
          if (nombre !== CACHE) {
            return caches.delete(nombre); // la borro
          }
          // Si es la actual, devuelvo undefined: no se borra.
        })
      );
    })
  );
  // clients.claim() hace que esta versión tome el control de las pestañas
  // que ya están abiertas, sin esperar a que el usuario cierre la app.
  self.clients.claim();
});

// --------------------------------------------------------------------------
// fetch: se ejecuta con CADA pedido de la página (HTML, CSS, JS, imágenes,
// modelos 3D...). Acá se aplica la estrategia "primero la caché"
// (cache first): si el archivo está guardado, se responde al toque desde
// ahí (rápido, y anda sin internet); si no está, se busca en la red.
// --------------------------------------------------------------------------
self.addEventListener("fetch", function (evento) {
  // Solo intercepto pedidos GET. Un POST no tiene sentido guardarlo en caché.
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    caches.match(evento.request).then(function (enCache) {
      // ¿Estaba guardado? Lo devuelvo tal cual, sin tocar internet.
      if (enCache) return enCache;

      // No estaba: lo busco online. Si además la respuesta salió bien,
      // la guardo para la próxima vez (caché "al vuelo").
      return fetch(evento.request).then(function (respuesta) {
        // Solo guardo respuestas válidas y del propio sitio: guardar
        // respuestas opacas (de otro dominio) o errores 404 no sirve.
        if (respuesta && respuesta.status === 200 && respuesta.type === "basic") {
          const copia = respuesta.clone(); // clone: la respuesta original se devuelve ya mismo
          caches.open(CACHE).then(function (cache) {
            cache.put(evento.request, copia);
          });
        }
        return respuesta;
      });
    })
  );
});
