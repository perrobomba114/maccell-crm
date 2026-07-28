# Chat interno por reparación — Diseño

**Fecha:** 2026-07-28

**Estado:** aprobado para planificación

**Alcance:** comunicación interna entre administradores, vendedores y el técnico asignado a una reparación

## 1. Objetivo

Crear un chat interno y privado asociado a una única reparación. Permitirá que el personal comparta información operativa que no debe formar parte de la descripción visible para el cliente, por ejemplo que un conector de carga parece sucio y conviene limpiarlo antes de reemplazarlo.

El cliente final nunca podrá consultar estos mensajes. El chat no reemplaza el problema declarado, el diagnóstico técnico, las observaciones operativas ni el historial de estados.

## 2. Decisiones confirmadas

- Pueden acceder todos los administradores.
- Pueden acceder todos los vendedores de la misma sucursal que la reparación.
- Solo puede acceder el técnico que figura actualmente en `Repair.assignedUserId`.
- Si cambia el técnico asignado, el anterior pierde acceso y el nuevo recibe acceso al historial completo.
- El chat se crea únicamente cuando alguien envía el primer mensaje.
- La primera versión admite texto, imágenes y respuestas a mensajes anteriores.
- Un mensaje muestra doble tilde azul cuando al menos otro usuario autorizado abrió la conversación después de recibirlo.
- El detalle de lectura permite conocer qué usuarios lo leyeron.
- Un mensaje nuevo produce sonido, movimiento de la burbuja, contador y vista previa compacta, sin cambiar forzosamente la conversación que el usuario está leyendo.
- Al alcanzar un estado final, el chat se archiva automáticamente y queda en modo de solo lectura.
- Si la reparación vuelve a un estado operativo, el chat se reactiva automáticamente.
- Los chats archivados permanecen disponibles mediante búsqueda por número de reparación.
- No se crea una base de datos adicional.

## 3. Bases de datos e infraestructura

MACCELL dispone de dos bases PostgreSQL con responsabilidades distintas:

- `maccell`: datos operativos y transaccionales del CRM.
- `maccell-rag-db`: fragmentos, vectores e índices reconstruibles de Cerebro RAG V2.

`MACCELL CRM` es el servicio de aplicación y `maccell-rag-worker` es un proceso de indexación; ninguno es una base de datos.

El chat se almacenará exclusivamente en `maccell`, porque sus permisos, ciclo de vida y consistencia dependen directamente de `Repair`, `User`, `Branch` y `RepairStatus`. No se usará la base RAG, Firebase, Supabase ni un proveedor de chat externo.

## 4. Arquitectura de tiempo real

La solución usará tres capas:

1. PostgreSQL conserva chats, mensajes y cursores de lectura.
2. Route Handlers autenticados reciben escrituras, lecturas, búsquedas y cargas de imágenes.
3. Server-Sent Events (SSE) entrega al navegador avisos de mensajes, lecturas, cambios de estado y cambios de acceso.

Después de confirmar una transacción, el servidor ejecutará `pg_notify` con un evento pequeño que contenga identificadores y tipo de cambio. El contenido completo permanecerá en tablas y se recuperará mediante consultas autorizadas. Un listener PostgreSQL compartido por proceso distribuirá los eventos a las conexiones SSE locales, evitando dedicar una conexión de base de datos a cada navegador.

Cada instancia de la aplicación tendrá su propio listener. PostgreSQL entrega `NOTIFY` a todas las sesiones que ejecutaron `LISTEN`, por lo que el diseño funciona si Dokploy incorpora más de una réplica.

Los clientes enviarán mensajes y lecturas mediante HTTP; SSE será únicamente el canal servidor-cliente. `EventSource` se reconecta automáticamente. Al reconectar, el cliente solicitará los cambios posteriores a su último cursor para no depender de que los eventos transitorios se conserven.

No se usará un servidor WebSocket personalizado: el proyecto se despliega con `output: "standalone"`, y Next.js documenta que los archivos de un custom server no se trazan en ese modo. Tampoco se agregará polling manual ni `setInterval`.

Referencias técnicas:

- [PostgreSQL `NOTIFY`](https://www.postgresql.org/docs/current/sql-notify.html)
- [PostgreSQL `LISTEN`](https://www.postgresql.org/docs/current/sql-listen.html)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [Next.js Route Handlers y streaming](https://nextjs.org/docs/13/app/building-your-application/routing/route-handlers)
- [Next.js custom server](https://nextjs.org/docs/app/guides/custom-server)

## 5. Modelo de datos

### `RepairChat`

Representa la conversación creada de manera diferida.

- `id`
- `repairId`, único y relacionado con `Repair` mediante borrado en cascada
- `lastMessageAt`
- `createdAt`
- `updatedAt`

No almacenará un estado de archivo duplicado. El estado activo o archivado se deriva del estado actual de la reparación.

### `RepairChatMessage`

Representa un mensaje persistido.

- `id`
- `chatId`
- `senderId`
- `content`, opcional cuando existen imágenes
- `imageUrls`, lista de rutas internas
- `replyToId`, opcional
- `createdAt`

No habrá edición ni eliminación en esta primera versión. Esto preserva la trazabilidad interna y evita estados ambiguos en respuestas y lecturas.

### `RepairChatReadCursor`

Mantiene la última lectura de cada usuario sin crear una fila por mensaje y lector.

- `chatId`
- `userId`
- `lastReadAt`
- `updatedAt`
- restricción única por `chatId` y `userId`

Un mensaje se considera leído por un usuario cuando su `lastReadAt` es igual o posterior a `message.createdAt`. El doble tilde se vuelve azul si existe al menos un lector distinto del remitente. El detalle muestra únicamente lectores que todavía están autorizados a consultar la reparación.

Se crearán índices para conversación y fecha, remitente, cursores por usuario, actividad reciente y relación única con la reparación.

## 6. Autorización

Toda ruta y toda suscripción SSE obtiene el usuario mediante `getCurrentUser()` y valida su rol real desde la base. Ningún endpoint aceptará un `userId` del cliente como autoridad.

La regla central `authorizeRepairChatAccess` será reutilizada por listado, búsqueda, mensajes, lecturas, imágenes y eventos:

- `ADMIN`: permitido.
- `VENDOR`: permitido cuando `user.branch.id === repair.branchId`.
- `TECHNICIAN`: permitido cuando `user.id === repair.assignedUserId`.
- cualquier otro caso: `403 Forbidden`.

La búsqueda de reparaciones y el listado de chats incorporarán estos filtros directamente en Prisma, de modo que los registros no autorizados no lleguen a la aplicación para ser filtrados después.

Cuando una asignación o transferencia cambia `assignedUserId`, se publicará un evento de acceso. El técnico anterior cerrará la conversación y la retirará de su bandeja; el nuevo técnico podrá verla inmediatamente. Las rutas volverán a validar permisos incluso si el cliente conserva una pantalla antigua.

La implementación corregirá los flujos `takeRepairAction` y `techTakeRepairAction` que hoy pueden cambiar el estado sin persistir correctamente `assignedUserId`.

## 7. Ciclo de vida y estados

Los estados operativos son `1`, `2`, `3`, `4`, `8` y `9`. Los estados `8` y `9` corresponden a “Esperando Confirmación” y “Esperando Repuestos”, por lo que el chat continúa activo.

Los estados finales que archivan el chat son:

- `5`: reparación exitosa/lista
- `6`: entregada
- `7`: sin reparación
- `10`: facturada

Estas reglas se expresarán mediante constantes compartidas, no números mágicos. Cambiar a un estado final publicará un evento y convertirá el chat en solo lectura. Volver a un estado operativo lo reactivará sin perder mensajes ni lecturas.

## 8. API y flujo de datos

Las rutas privadas estarán bajo `/api/repair-chats` y usarán `runtime = "nodejs"` y datos dinámicos.

- Listado con cursor, filtros activo/archivado y límite estricto.
- Búsqueda de reparaciones autorizadas por número, cliente, marca o modelo.
- Consulta paginada de mensajes anteriores a un cursor.
- Envío de texto, imágenes y respuesta opcional.
- Actualización idempotente del cursor de lectura.
- Consulta de lectores de un mensaje.
- Stream SSE autenticado.
- Carga autenticada de imágenes asociada a una reparación accesible.

El envío usará una transacción para crear de forma idempotente `RepairChat`, insertar el mensaje y actualizar `lastMessageAt`. El evento se publicará solamente después de confirmar la escritura.

Los mensajes usarán identificadores ordenables y paginación por cursor. La interfaz cargará primero el tramo más reciente y pedirá páginas anteriores al desplazarse hacia arriba.

## 9. Imágenes

Las imágenes se guardarán en una subcarpeta específica del volumen persistente existente, fuera de `public`, y se servirán mediante una ruta autenticada. Se validarán:

- acceso vigente a la reparación antes de aceptar o entregar el archivo;
- formatos de imagen permitidos;
- tamaño máximo por archivo;
- cantidad máxima por mensaje;
- nombre generado por el servidor y resolución segura de rutas;
- eliminación de archivos huérfanos si falla la creación del mensaje.

No se expondrán rutas directas que permitan consultar una imagen sin comprobar la sesión y el permiso sobre la reparación.

## 10. Experiencia de usuario

Un proveedor compartido se montará en los layouts autenticados de administrador, vendedor y técnico. La lógica y los componentes vivirán en archivos nuevos y enfocados; no se ampliarán componentes que ya superan 300 líneas.

### Burbuja

- Se puede arrastrar dentro de los límites visibles.
- Se adhiere al borde más cercano al soltarla.
- Conserva su posición por dispositivo mediante almacenamiento local.
- Respeta áreas seguras y no queda debajo del header o fuera de pantalla.
- Muestra el total no leído.

### Al recibir un mensaje

- reproduce el sonido existente de notificaciones cuando el navegador lo permite;
- anima la burbuja;
- incrementa el contador;
- muestra una vista previa compacta con número de reparación, remitente y fragmento;
- no cambia automáticamente el chat activo ni interrumpe una escritura.

### Bandeja

- Pestaña activa: no leídos primero y luego conversaciones por actividad reciente.
- Cada fila muestra número, equipo, sucursal, técnico, estado, último mensaje y contador.
- Se cargan lotes pequeños mediante cursor.
- Un buscador permite encontrar una reparación activa autorizada y comenzar el chat.
- El buscador de archivados permite recuperar conversaciones finales por número y otros datos básicos.
- Una reparación sin mensajes no aparece como conversación.

### Conversación

- Encabezado con número, equipo, estado y técnico asignado.
- Mensajes agrupados por fecha con remitente y hora de Argentina.
- Respuesta visual enlazada al mensaje original.
- Galería de imágenes con visor.
- Estado enviado y doble tilde azul.
- En chats archivados se oculta el compositor y se explica que son de solo lectura.

## 11. Límites y prevención de crecimiento

- Los chats se crean de forma diferida.
- La bandeja nunca obtiene todos los registros; usa límites y cursores.
- Los archivados quedan fuera de la vista principal.
- La búsqueda se ejecuta en servidor con índices y un máximo de resultados.
- Los mensajes se cargan por páginas.
- Los eventos contienen identificadores, no mensajes completos ni imágenes.
- No se eliminan automáticamente conversaciones históricas, porque forman parte de la trazabilidad de una reparación.

## 12. Errores, reconexión y consistencia

- El envío muestra estado pendiente hasta recibir confirmación del servidor.
- Un fallo conserva el borrador y permite reintentar sin duplicar mediante una clave idempotente generada por el cliente.
- Si SSE se desconecta, la UI indica reconexión y `EventSource` vuelve a conectarse.
- Después de reconectar se sincronizan conversaciones y mensajes posteriores al último cursor conocido.
- Un `403` cierra el chat y actualiza la bandeja, cubriendo transferencias o cambios de sucursal.
- Las vistas previas y contadores se actualizan de forma optimista, pero la base operativa sigue siendo la fuente de verdad.
- Los errores privados se registran sin contenido de mensajes, imágenes, emails ni otros datos sensibles.

## 13. Pruebas y verificación

### Pruebas automatizadas

- autorización de administrador;
- acceso de todos los vendedores de la misma sucursal;
- rechazo a vendedores de otra sucursal;
- acceso exclusivo del técnico asignado;
- pérdida y adquisición de acceso al transferir;
- creación diferida y concurrente de un único chat;
- texto, imágenes y respuestas;
- cursores de lectura y doble tilde azul;
- paginación estable y búsqueda limitada;
- archivado en `5`, `6`, `7` y `10`;
- actividad en `1`, `2`, `3`, `4`, `8` y `9`;
- reactivación de un chat archivado;
- asignación correcta de `assignedUserId` al tomar una reparación;
- reconexión y recuperación de eventos perdidos;
- validación y autorización de imágenes.

### Verificación visual

- administrador, vendedor y técnico;
- escritorio y móvil;
- arrastre y persistencia de posición;
- límites de pantalla y áreas seguras;
- bandejas vacías, con muchos chats y con archivados;
- mensajes extensos, respuestas e imágenes;
- estados de sonido bloqueado, reconexión, error y acceso revocado.

### Gate de producción

- `npm test`
- `npx tsc --noEmit`
- ESLint sobre archivos tocados
- `git diff --check`
- `npm run build`
- validación en la aplicación local con capturas revisadas

## 14. Fuera de alcance inicial

- audios, videos, PDF u otros adjuntos;
- edición o eliminación de mensajes;
- reacciones, menciones y escritura en tiempo real;
- notificaciones push cuando el navegador está cerrado;
- chats generales no vinculados a reparaciones;
- acceso del cliente final;
- migración de `RepairObservation` al chat;
- una nueva base de datos o un proveedor externo de mensajería.

## 15. Criterios de aceptación

La función queda completa cuando un usuario autorizado puede localizar una reparación, iniciar o continuar su conversación, recibir mensajes sin refrescar, responder con texto o imágenes y observar lecturas; cuando ningún usuario no autorizado puede obtener contenido o archivos; cuando las transferencias actualizan el acceso inmediatamente; y cuando los estados finales archivan el chat sin eliminar su historial.
