# Sistema de Publicidad MacCell - Documentación Técnica Completa

Este documento detalla la arquitectura global del sistema de cartelería digital ("Digital Signage") de MacCell, el funcionamiento interno tanto de la aplicación web (panel de control) como de la aplicación Android (APK reproductora), y las modificaciones manuales realizadas para migrarla a un nuevo servidor.

---

## 1. Arquitectura General del Sistema

El ecosistema está compuesto por dos grandes piezas que trabajan en conjunto bajo una arquitectura Cliente-Servidor:

* **El Servidor (Panel de Control):** Una aplicación web en **PHP** estructurada sobre el framework **CodeIgniter 3**. Utiliza una base de datos MySQL y su objetivo es permitir a los administradores subir videos/imágenes y programar qué días deben reproducirse en cada pantalla.
* **El Cliente (Reproductor APK):** Una aplicación híbrida construida con **Apache Cordova**. Se instala en televisores (Android TV) o Smart Boxes. Descarga los videos del servidor y los reproduce en bucle continuo de forma desatendida.

---

## 2. El Servidor (Backend y Base de Datos)

El corazón del panel de control reside en su base de datos MySQL (`c1951460_publi`). Su esquema principal se divide en:

### A. Tabla `pantallas` (Dispositivos)
Gestiona los televisores o dispositivos registrados en el sistema.
* **id:** Identificador único (UUID).
* **nombre:** Alias amigable (Ej: "MACCELL 1", "8 BIT ACCESORIOS").
* **duracion:** Tiempo en segundos que se mostrará una imagen estática (si el contenido no es un video).
* **clave:** Una contraseña autogenerada que la TV utilizará para autenticarse y bajar sus videos.
* **lastseen:** Fecha y hora (Heartbeat). Cada vez que la TV se conecta a buscar videos, este campo se actualiza, permitiendo al panel web saber si la TV está "encendida y online".

### B. Tabla `contenidos` (Publicidades)
Es la tabla más crítica. Vincula los archivos multimedia (`.mp4`, `.png`) con una pantalla específica (`id_pantalla`).
* **orden:** Define qué publicidad se reproduce primero, segundo, tercero, etc., en el bucle de esa pantalla.
* **Lógica de Días (Scheduling):** Tiene booleanos individuales para `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado` y `domingo`. El servidor calculará qué día es "hoy" en Argentina y solo le enviará a la TV los contenidos habilitados para el día en curso.

### C. Sistema de Permisos y Configuración
* **Usuarios y Roles (`usuarios`, `roles`, `permisos`):** Sistema RBAC clásico. Permite tener Superadministradores, Administradores y Operadores con acceso restringido a ciertas partes del panel web.
* **Setup (`setup`):** Variables globales del sistema (como los colores del backend, correos, logos, y la **URL base** del servidor).

---

## 3. La Aplicación Android (APK Cliente)

La APK está diseñada para ser completamente autónoma (Kiosko). Su código principal está en el archivo `assets/www/index.html` (dentro del empaquetado de Cordova).

### Ciclo de Comunicación (API REST)

1. **Ping Inicial (`GET /api/index`)**
   Usado para comprobar la conectividad a internet de la pantalla.

2. **Búsqueda de Pantallas (`GET /api/pantallas`)**
   Al instalarse por primera vez (cuando la memoria interna `localStorage` del Android está vacía), descarga el listado de las pantallas creadas en la tabla `pantallas` de la base de datos. Muestra una lista de botones en la TV para que el instalador seleccione "Quién es" esta TV.

3. **Autenticación (`POST /api/registrar`)**
   Cuando el instalador selecciona la pantalla, la APK le avisa al servidor: *"Soy el dispositivo X"*. El servidor genera una clave de seguridad única (Token) de 16 caracteres, que es devuelta y guardada en el `localStorage` de la TV. 

4. **Bucle Infinito de Reproducción (`POST /api/contenidos`)**
   La función `run()` inicia el proceso desatendido:
   - La APK envía al servidor su `id` y su clave.
   - El servidor anota el *Heartbeat* (última conexión).
   - El servidor devuelve la lista de URLs completas de los `.mp4` y `.png` correspondientes al día de hoy.
   - Si la TV no tiene el contenido cargado en el reproductor HTML `<video>` o `<img>`, lo descarga de inmediato.
   - **Checksum automático:** Cada 5 minutos la TV verifica un "Hash" (Checksum SHA-256) del listado de reproducción. Si el administrador subió un video nuevo desde el panel web, el hash cambia y la TV hace un "Refresh" forzado (`location.reload()`) para descargar e incorporar la nueva publicidad a su bucle en tiempo real.

---

## 4. Historial de Modificaciones Técnicas (Hackeo de APK)

Para independizar la app original y apuntarla al nuevo subdominio `https://sistema.maccell.com.ar` sin disponer del código fuente original de Cordova, se realizó ingeniería inversa a nivel empaquetado.

### A. Modificación del Código Web (URL y Fix de UI)
1. **Punto final:** En el archivo interno `assets/www/index.html` se alteró la variable global `HOST` para redireccionar todo el tráfico del cliente al nuevo servidor.
2. **Corrección Visual (Wallpaper):** El diseño original dejaba un margen negro (pantalla sin llenar) durante la fase de "Esperando conexión...". Se reescribió la regla CSS del elemento `body`, forzando `width: 100vw; height: 100vh;` e inyectando `wallpaper.png` mediante `background-size: cover;` para asegurar un rellenado apaisado perfecto en televisores horizontales.

### B. Inyección de Assets
- **Íconos del Sistema (`ic_launcher.png`):** Se reemplazaron todas las resoluciones en las carpetas de densidad de Android (`res/mipmap-*`).
- **Splash Screen:** Se inyectó un nuevo gráfico corporativo como pantalla de carga (`ic_cdv_splashscreen.png`).

### C. Reempaquetado y Bypass de Android
Construir una APK a mano requiere evitar que el sistema operativo rechace el archivo debido a violaciones de alineación en memoria:
- **`resources.arsc` Uncompressed:** Se empaquetó el ZIP comprimiendo todos los recursos *excepto* la tabla de recursos de Android (`resources.arsc`), la cual fue inyectada con compresión `Nivel 0` (`-0`) para permitir el mapeo directo a memoria (mmap).
- **Zipalign:** Se alineó el archivo a bloques de 4 bytes (`zipalign -p -f 4`).

### D. Certificados de Seguridad
Al romper la estructura, la firma digital corporativa original se invalidó. Se procedió a:
1. Crear un keystore propio autofirmado a nombre de MacCell.
2. Firmar utilizando el esquema de firmas v3 (`APK Signature Scheme v3`) con la herramienta `apksigner`.

> [!WARNING]
> La nueva APK (`publicidad-sistema-maccell.apk`) contiene este nuevo certificado de seguridad propio. **Debe desinstalarse la versión vieja del dispositivo antes de instalar esta nueva aplicación, para evitar conflictos de firma.**

---

## 5. Estado actual en MACCELL CRM (Next.js)

El sistema de Pantallas fue migrado e integrado en `maccell-crm` (Next.js + Prisma + PostgreSQL), manteniendo compatibilidad con la APK actual.

### 5.1. Módulo de administración

- Ruta de panel: `/admin/pantallas`
- Entrada en sidebar admin: `Pantallas`
- UI nueva en React + shadcn (no se usa la UI legacy de PHP).
- Flujo operativo:
  - Crear pantalla.
  - Renombrar pantalla desde panel.
  - Subir imágenes/videos.
  - Ordenar contenidos.
  - Activar/pausar pantalla y contenidos.
  - Ver estado `lastseen` (online/offline por heartbeat).
  - Regenerar `key` de dispositivo.

### 5.2. APIs expuestas (compatibles APK)

Se publican endpoints legacy para no romper la APK:

- `GET /api/index` -> ping (`{ ping: "pong" }`)
- `GET /api/pantallas` -> listado de pantallas activas
- `POST /api/registrar` -> devuelve `key` para `id` de pantalla
- `POST /api/contenidos` -> valida `id+key`, actualiza `lastseen` y devuelve URLs de media

Además existen rutas internas equivalentes en:

- `/api/public/pantallas/index`
- `/api/public/pantallas/pantallas`
- `/api/public/pantallas/registrar`
- `/api/public/pantallas/contenidos`

### 5.3. Base de datos nueva (PostgreSQL)

Tablas usadas por el módulo nuevo:

- `digital_screens`
- `digital_screen_contents`

Se crean automáticamente al primer uso del módulo (`ensurePantallasSchema`).

Migración legacy:

- Solo corre si `PANTALLAS_ENABLE_LEGACY_MIGRATION=true`.
- Si está desactivado, el sistema arranca limpio (sin pantallas heredadas).

### 5.4. Storage y archivos

Ruta de guardado:

- `/app/upload/pantallas/<screenId>/<archivo>`

Ruta pública de lectura:

- `/api/uploads/pantallas/<screenId>/<archivo>`

Se agregó soporte correcto para video:

- `Content-Type` para `.mp4/.webm`
- soporte HTTP `Range` (206 Partial Content)

Esto mejora compatibilidad de reproducción en Android TV.

### 5.5. Endpoint de health

- `GET /api/pantallas/health` (solo admin)
- Devuelve:
  - estado DB
  - ruta de uploads
  - si el directorio es escribible (`uploadPath.writable`)
  - conteos de pantallas/contenidos
  - últimos heartbeats

---

## 6. Hallazgos en APK descomprimida

Archivo analizado: `PANTALLAS/apk_extracted/assets/www/index.html`

Hallazgos importantes:

1. La APK no crea pantallas automáticamente.
2. Si no hay pantallas en backend, solo muestra selector vacío.
3. Tiene dos bugs en JS original:
   - `JSON.strintify(error)` (typo)
   - `setTimeout(5000, setup)` (orden de argumentos incorrecto)
4. Usa `localStorage.devid` y `localStorage.devkey` para persistir identidad.
5. Hace polling por checksum cada 5 minutos y recarga si hay cambios.

---

## 7. Problemas reales observados y soluciones aplicadas

### 7.1. Error de hidratación en admin pantallas

- Causa: `button` dentro de `button` (DOM inválido).
- Fix: estructura corregida para evitar anidación inválida.

### 7.2. Error en Server Actions (`El nombre es obligatorio`)

- Causa: excepciones de acción sin manejo en cliente.
- Fix: manejo explícito de errores en `pantallas-client.tsx`.

### 7.3. Subida de archivos fallando

- Mejoras implementadas:
  - validación/sanitización de `screenId`
  - protección de ruta
  - manejo de errores de FS con respuesta JSON clara
  - feedback de error en UI

### 7.4. Reproducción/sincronización inestable en TV

- Mejoras implementadas:
  - headers de media correctos
  - soporte `Range` en `/api/uploads/[...path]`

---

## 8. Checklist de deploy en Dokploy

Volúmenes requeridos (ya definidos):

- Host `/var/lib/maccell/upload` -> Container `/app/upload`

Validaciones post deploy:

1. Abrir `/api/pantallas/health` con usuario admin.
2. Confirmar `checks.uploadPath.writable = true`.
3. Crear una pantalla nueva.
4. Subir un archivo (imagen o video).
5. Abrir URL del archivo desde el panel.
6. Instalar APK en TV y seleccionar pantalla.
7. Verificar actualización de `lastseen`.

Si `writable=false`:

- problema de permisos del bind mount en host (`/var/lib/maccell/upload`).
- corregir owner/permisos para que el usuario del contenedor pueda escribir.

---

## 9. Decisiones funcionales actuales

1. No se usa programación por días: la reproducción es 24/7.
2. El flujo operativo recomendado es:
   - crear pantalla desde admin
   - instalar APK
   - seleccionar pantalla
   - subir contenidos
3. Se mantiene compatibilidad con la APK existente sin recompilar.
