# Cerebro técnico vinculado a reparaciones y RAG fundamentado

Fecha: 2026-07-14

## Objetivo

Eliminar la selección manual de marca y modelo en Cerebro. Cada chat técnico debe nacer desde una reparación activa real y utilizar su identidad de dispositivo, falla, imágenes y estado operativo. El diagnóstico debe conectar explícitamente cada medición con evidencia del modelo correcto. Cuando la reparación finalice, su resultado se indexará de forma idempotente en el RAG.

## Alcance por rol

- Un usuario `TECHNICIAN` ve únicamente reparaciones activas cuyo `assignedUserId` coincide con su usuario.
- Un usuario `ADMIN` ve todas las reparaciones activas asignadas e identifica técnico, sucursal, ticket y estado.
- Se consideran activas las reparaciones con `assignedUserId` no nulo y estados `PENDING`, `CLAIMED`, `IN_PROGRESS` o `PAUSED` (IDs 1, 2, 3 y 4).
- Los roles restantes no acceden a Cerebro V2.
- La lista no expone teléfono, precio ni otros datos personales innecesarios.

## Flujo de usuario

1. Cerebro carga la lista autorizada de reparaciones activas.
2. El usuario busca por ticket, marca, modelo o descripción de la falla.
3. Selecciona una reparación.
4. El servidor vuelve a verificar autorización y obtiene la reparación desde PostgreSQL.
5. Se crea un chat vinculado a `repairId`; marca y modelo no son aceptados como autoridad desde el navegador.
6. El encabezado muestra ticket, dispositivo, estado y técnico. El chat utiliza la falla y datos técnicos existentes como contexto inicial.
7. Los chats guardados conservan el vínculo con la reparación. Si la reparación ya no está activa, el chat sigue siendo legible, pero no inicia un diagnóstico nuevo sin autorización vigente.

## Arquitectura y contratos

### API de reparaciones disponibles

Nueva ruta privada `GET /api/cerebro-v2/repairs`:

- Autentica con `getCurrentUser()` antes de consultar la base.
- Aplica el alcance por rol en el servidor.
- Devuelve un DTO primitivo: `id`, `ticketNumber`, `deviceBrand`, `deviceModel`, `problemDescription`, `statusId`, `statusName`, `branchName`, `technicianName`, `updatedAt` e indicador de imágenes.
- Ordena por actividad reciente y limita el resultado. La búsqueda adicional se procesa en servidor para no descargar el historial completo.

### Sesiones vinculadas

`POST /api/cerebro-v2/sessions` recibirá únicamente `repairId`.

La base RAG incorporará a `rag_chat_sessions`:

- `repair_id` sin clave foránea, porque la reparación vive en otra base.
- `ticket_number` como snapshot operativo.
- identidad normalizada almacenada en `brand` y `model` para conservar historial.

Al crear o enviar mensajes, el servidor carga la sesión y la reparación autorizada. El `deviceContext` enviado por el cliente deja de ser fuente de verdad. Esto impide combinaciones imposibles y cambios manuales de modelo dentro de un chat.

### Contexto vivo

Mientras la reparación está activa se consultan, sin indexarlos como evidencia confirmada:

- ticket y dispositivo;
- problema reportado;
- diagnóstico y solución existentes;
- mediciones registradas;
- condición de humedad o garantía;
- imágenes técnicas adjuntas.

No se incorporan precios, datos de contacto ni información de otros clientes.

## Identidad de dispositivos

Se implementará un registro determinista de identidades con:

- marca normalizada;
- modelo comercial;
- código técnico;
- familia;
- alias equivalentes permitidos.

El registro se comparte conceptualmente entre la aplicación TypeScript y el indexador Python, con tests de paridad para los alias soportados. La búsqueda nunca cruza marcas.

Caso obligatorio inicial:

- `SAMSUNG + SM-A125M` corresponde a la familia comercial `GALAXY A12`.
- `SM-A125M`, `SAMSUNG A12` y `GALAXY A12` pueden recuperar documentación declarada equivalente dentro de esa identidad.
- No se deducen variantes solamente por parecido de prefijo. Cada código equivalente debe estar registrado para evitar mezclar placas distintas.

Los documentos ya indexados reciben su identidad al reindexarse o mediante una migración de metadatos segura. El contenido y los archivos originales no se modifican.

## Motor de diagnóstico fundamentado

### Problema actual

La recuperación exacta ya evita mezclar modelos, pero una consulta corta como “no enciende” puede devolver páginas semánticamente cercanas y eléctricamente irrelevantes. El modelo luego puede generar valores generales que no aparecen en esas páginas. Recuperar un PDF no equivale a fundamentar un procedimiento.

### Planificador técnico

Antes de recuperar evidencia, el servidor construye una consulta técnica usando:

- identidad de la reparación;
- problema reportado;
- último mensaje;
- mediciones previas;
- códigos de componentes o líneas detectados;
- subsistemas inferidos, por ejemplo alimentación, batería, carga, PMU, botón de encendido o cortocircuito.

Habrá un mapeo determinista para síntomas comunes y una expansión asistida por IA cuando esté disponible. El camino determinista es el fallback obligatorio.

### Enriquecimiento de páginas

Durante la indexación, cada página técnica obtiene metadatos derivados de su texto:

- título de hoja o sección;
- subsistemas;
- líneas eléctricas y códigos de componentes;
- calidad de extracción;
- número de página.

El texto completo continúa almacenado. La proyección corta se usa solamente para generar el embedding.

### Recuperación y reranking

La búsqueda sigue este orden:

1. Marca obligatoria.
2. Código técnico exacto o alias explícitamente equivalente.
3. Modelo/familia declarada equivalente.
4. Coincidencia de componente o línea.
5. Coincidencia de subsistema y título de hoja.
6. Fusión semántica y keyword mediante RRF.
7. Autoridad de la fuente.

El límite SQL se aplica después de restringir la identidad permitida. Una reparación de otro modelo nunca ocupa los candidatos del modelo seleccionado.

### Visión bajo demanda

Si una página relevante tiene extracción deficiente o el texto no permite identificar el circuito, Cerebro renderiza como máximo dos páginas candidatas y las analiza con el modelo de visión. El resumen visual se guarda en caché en la base RAG para reutilizarlo. No se ejecuta visión masiva durante la indexación de los 1.814 PDF.

### Respuesta verificable

La respuesta técnica debe incluir:

- datos observados reales;
- hipótesis ordenadas;
- una próxima medición;
- punto o línea de prueba;
- instrumento y escala;
- valor esperado únicamente cuando esté respaldado;
- criterio de decisión;
- fuente y página exactas.

Una afirmación numérica de voltaje, corriente o resistencia debe estar asociada a una evidencia que contenga ese valor o una especificación inequívoca. Si no existe respaldo, se reemplaza por “registrar el valor medido” y Cerebro pide el dato al técnico. La IA no presenta conocimiento general como si proviniera del schematic.

El sistema genera primero una estructura validable y después la presenta en el chat. Los IDs de fuentes se validan contra las evidencias entregadas al modelo. Una fuente inválida o de otro dispositivo se descarta antes de responder.

## Indexación de reparaciones finalizadas

- Una reparación activa es contexto operativo, no evidencia RAG.
- El sincronizador detecta reparaciones finalizadas o modificadas por `updatedAt`.
- Un resultado exitoso se indexa como `CONFIRMED_SUCCESS` solamente si contiene diagnóstico o solución técnica útil.
- Una reparación sin solución se indexa como `FAILED` y queda detrás de documentación y éxitos confirmados.
- Registros sin contenido técnico se omiten; textos administrativos, cobros, precios y teléfonos se eliminan.
- El hash del contenido hace la operación idempotente y crea una nueva versión cuando cambia el diagnóstico final.
- La sincronización periódica mantiene la base principal en modo lectura. Un retraso breve no bloquea el cierre de la reparación.

## Estados vacíos y errores

- Sin reparaciones asignadas: se explica que el usuario debe tomar o recibir una reparación antes de iniciar un chat.
- Reparación reasignada: el técnico anterior pierde la posibilidad de enviar mensajes nuevos, pero conserva acceso al historial según las reglas actuales de chats.
- Modelo sin identidad suficiente: se muestra un error operativo y se solicita corregir el modelo en la reparación; no se permite escribir un modelo alternativo en Cerebro.
- RAG degradado: se permite registrar observaciones, pero no se emiten valores técnicos no respaldados.
- PDF sin página renderizable: se conserva la cita textual y se informa que la vista visual no está disponible.

## Pruebas obligatorias

- Alcance de reparaciones por rol y usuario.
- Exclusión de estados finales y reparaciones sin asignación.
- Creación de sesión únicamente con una reparación autorizada.
- El chat ignora cualquier identidad manipulada por el cliente.
- Normalización `SM-A125M ↔ GALAXY A12` sin mezclar marcas ni variantes no registradas.
- Recuperación por subsistema antes del límite de candidatos.
- Rechazo de fuentes de otro dispositivo.
- Supresión de valores numéricos sin evidencia.
- Indexación idempotente al finalizar y autoridad correcta para éxito/fallo.
- Render de página citada y fallback cuando no hay imagen.
- Tests completos, TypeScript, ESLint, build de Next.js y tests Python del worker.

## Despliegue y verificación

1. Migrar de forma aditiva la base RAG.
2. Desplegar worker/indexadores compatibles con metadatos anteriores.
3. Desplegar la aplicación con el selector de reparaciones.
4. Verificar con una reparación real `SM-A125M` y una `IPHONE 8`.
5. Confirmar que cada respuesta cite páginas del dispositivo correcto.
6. Confirmar que una reparación finalizada aparezca en el RAG después del ciclo del sincronizador.
7. Mantener rollback independiente para aplicación y Compose RAG.

## Criterios de aceptación

- No existe entrada manual de marca o modelo en Cerebro.
- Técnico y admin ven únicamente las reparaciones definidas por su alcance.
- Todo chat nuevo está vinculado a una reparación real.
- `SM-A125M` encuentra documentación declarada de Galaxy A12.
- Una consulta de iPhone 8 no usa reparaciones ni PDF de otros modelos.
- Las mediciones y valores citan una página pertinente o se declaran sin referencia disponible.
- El visor abre la página exacta utilizada.
- Las reparaciones finalizadas útiles enriquecen el RAG automáticamente sin escribir en la base principal.
