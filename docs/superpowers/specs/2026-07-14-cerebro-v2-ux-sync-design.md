# Cerebro V2 — asistente técnico nuevo con RAG y PDF integrado

**Fecha:** 2026-07-14
**Estado:** Revisión solicitada por el usuario
**Alcance:** Reemplazo completo de Cerebro para `ADMIN` y `TECHNICIAN`, historial V2 nuevo, RAG aislado, sincronización continua y evidencia PDF visible dentro del chat.

## 1. Objetivo

Cerebro V2 será una única herramienta de diagnóstico para reparación de equipos. Permitirá iniciar y guardar conversaciones nuevas, consultar reparaciones históricas y documentación PDF mediante RAG y ver la página citada dentro del chat con zoom.

No reutilizará la UX, los chats, la Wiki, los embeddings ni los schematics heredados. El sistema comenzará con un historial V2 vacío y utilizará exclusivamente fuentes reconstruidas y auditables del RAG aislado.

La base principal continuará protegida: el worker solo tendrá acceso de lectura a las tablas técnicas autorizadas y nunca escribirá en ella.

## 2. Situación actual verificada

La interfaz desplegada todavía monta `CerebroLayout`, un componente heredado de 485 líneas que incluye Wiki, carga manual de schematics, guardar resumen, tokens y eventos globales que no pertenecen al producto nuevo.

La base principal conserva, pero Cerebro V2 no utilizará:

- 1.870 filas en `repair_embeddings`.
- 688 artículos en `repair_knowledge`.
- 4 filas en `cerebro_schematics`.
- 18 conversaciones y 76 mensajes del Cerebro anterior.

El RAG V2 contiene las 3.308 reparaciones del corte inicial. El proceso masivo pasó después a los PDF, por lo que falta reconciliación continua de reparaciones nuevas o modificadas.

La prueba autenticada de `POST /api/cerebro-v2/chat` confirmó que autenticación, streaming, embeddings, recuperación y citas PDF están funcionando. Sin embargo, una consulta real sobre un SM-A405FN fijo en 0,08 A devolvió una respuesta demasiado genérica: citó páginas correctas, pero no interpretó suficientemente el patrón de consumo ni priorizó un protocolo técnico de placa. La infraestructura funciona; la calidad diagnóstica todavía no está aprobada.

## 3. Experiencia de usuario

### 3.1 Estructura

La pantalla tendrá cuatro áreas funcionales:

1. **Barra superior:** marca, modelo, estado del servicio y acción “Nuevo chat”.
2. **Historial V2 plegable:** únicamente conversaciones creadas con el sistema nuevo, agrupadas por fecha, con selección, renombrado y eliminación.
3. **Chat central:** mensajes, estado de análisis, compositor y evidencia citada.
4. **Visor contextual:** fuentes y páginas PDF; aparece solo cuando el técnico abre una cita.

El chat se guardará automáticamente. “Nuevo chat” creará una sesión vacía sin perder las anteriores. No se importará ni mostrará ningún chat viejo.

En móvil, historial y visor serán paneles temporales. En escritorio, el chat conservará el ancho principal y el visor ocupará una columna secundaria cuando se abra.

### 3.2 Dirección visual

La estética será operativa, inspirada en instrumental de laboratorio: fondo oscuro neutro, alto contraste, tipografía legible, verde para evidencia confirmada, ámbar para hipótesis o casos incompletos y rojo reservado para advertencias. No habrá gradientes decorativos ni paneles heredados superpuestos.

La prioridad será:

1. Dispositivo y síntoma.
2. Próxima medición segura y concreta.
3. Razonamiento diagnóstico.
4. Evidencia recuperada y página documental.

### 3.3 Compositor

Incluirá texto técnico, marca y modelo obligatorios, imágenes opcionales, enviar y detener generación. No incluirá Wiki, carga manual de PDF, modo mentor, guardar resumen ni contador de tokens.

Las imágenes solo estarán habilitadas cuando exista un proveedor de visión saludable. Si falla, el técnico recibirá un error explícito; el sistema no fingirá haber analizado la imagen.

### 3.4 Respuesta técnica

La respuesta deberá separar claramente:

- **Datos observados:** lo informado por el técnico.
- **Evidencia recuperada:** reparaciones confirmadas o páginas documentales.
- **Hipótesis:** ordenadas por probabilidad cualitativa, sin porcentajes inventados.
- **Próxima medición:** punto, modo del multímetro/fuente, valor esperado y criterio para decidir el siguiente paso.
- **Advertencias:** límites de corriente, temperatura o riesgo cuando correspondan y estén respaldados.

No expondrá UUID internos, rutas físicas, precios ni datos personales. Un caso fallido se mostrará como contraejemplo, nunca como reparación confirmada.

### 3.5 PDF dentro del chat

Al pulsar una cita, Cerebro solicitará solamente la página necesaria al worker, que la renderizará y almacenará temporalmente como imagen WebP o PNG. Next.js la entregará mediante un proxy autenticado.

El visor permitirá:

- Ver la página dentro de la misma pantalla.
- Zoom entre 50 % y 300 %.
- Desplazar la imagen ampliada.
- Página anterior y siguiente.
- Saltar a un número de página.
- Volver a la respuesta sin perder el chat.

La cita mostrará nombre legible del documento y página. El PDF completo seguirá disponible como respaldo autenticado, pero no será el flujo principal.

## 4. Arquitectura frontend

Se crearán componentes nuevos, cada uno por debajo de 300 líneas:

- `cerebro-v2-shell.tsx`: composición general.
- `cerebro-v2-header.tsx`: dispositivo, salud y nuevo chat.
- `cerebro-v2-history.tsx`: historial exclusivo V2.
- `cerebro-v2-chat.tsx`: mensajes y streaming.
- `cerebro-v2-composer.tsx`: texto e imágenes.
- `cerebro-v2-sources.tsx`: evidencia estructurada.
- `cerebro-v2-pdf-viewer.tsx`: página renderizada, zoom y navegación.
- `use-cerebro-v2-chat.ts`: transporte, persistencia y errores.

No se extenderá `CerebroLayout`. Las páginas de administrador y técnico montarán el mismo shell V2. No habrá eventos globales de Wiki; la comunicación se realizará mediante props, estado acotado y callbacks estables.

## 5. Persistencia nueva de chats

Los chats V2 se almacenarán en tablas nuevas dentro de la base aislada de RAG:

- `rag_chat_sessions`: usuario, título, marca, modelo, fechas y estado.
- `rag_chat_messages`: sesión, rol, contenido, adjuntos, fuentes estructuradas y fecha.

Todas las operaciones verificarán que la sesión pertenezca al usuario autenticado. Se implementarán rutas autenticadas para listar, crear, leer, renombrar y eliminar sesiones, además de persistir los mensajes sin duplicarlos durante el streaming.

Las tablas `cerebro_conversations` y `cerebro_messages` no serán consultadas, migradas ni mostradas. Permanecerán intactas durante la validación para permitir rollback; su eliminación física requerirá backup verificado y autorización destructiva separada.

## 6. API, proveedores y salud

`POST /api/cerebro-v2/chat` continuará restringido a `ADMIN` y `TECHNICIAN`. El flujo será:

1. Validar sesión, pertenencia del chat, marca, modelo, mensajes e imágenes.
2. Generar el embedding de la consulta.
3. Recuperar evidencia con aislamiento obligatorio de marca y preferencia estricta por modelo.
4. Entregar fuentes estructuradas al cliente, separadas del texto del modelo.
5. Elegir texto o visión según los adjuntos.
6. Generar con Groq principal y OpenRouter fallback, sin `maxRetries` de Groq.
7. Persistir mensajes y fuentes de forma idempotente.

Habrá un diagnóstico administrativo autenticado y sanitizado para verificar:

- Conexión a la base RAG.
- Servicio de embeddings.
- Recuperación híbrida.
- Disponibilidad de las claves Groq sin revelarlas.
- Fallback OpenRouter.
- Modelo de visión configurado.
- Worker de PDF y render de páginas.
- Último cursor y último error de ingestión.

El proveedor y modelo usados se registrarán como telemetría interna sanitizada, sin exponer claves ni contenido técnico completo.

## 7. Auditoría y reemplazo de prompts

Los prompts antiguos no se reutilizarán. La auditoría detectó reglas contradictorias, referencias técnicas no verificadas, porcentajes inventados, componentes específicos aplicados sin evidencia y ejemplos desactualizados. Las rutas heredadas que todavía los consuman quedarán fuera del flujo V2 y luego se desactivarán.

El prompt V2 será corto, versionado y testeable. Sus reglas obligatorias serán:

- Usar primero la evidencia recuperada y citar documento/página o reparación.
- No convertir el síntoma del usuario en una supuesta evidencia histórica.
- No afirmar que una página contiene un dato que no aparece en el fragmento recuperado.
- Separar hechos, hipótesis y próximos pasos.
- Reconocer evidencia insuficiente y pedir una medición concreta.
- No inventar porcentajes, valores, componentes, precios ni resultados.
- Respetar marca, modelo y plataforma; nunca mezclar marcas.
- Priorizar procedimientos reversibles y seguros antes de retirar, puentear o inyectar.

Cada respuesta guardará la versión del prompt y los identificadores públicos de las fuentes para poder auditar regresiones.

## 8. Fuentes del RAG nuevo

Solo se indexarán dos familias de fuentes:

1. **Reparaciones canónicas:** reconstruidas desde las tablas técnicas autorizadas, sanitizadas y clasificadas por resultado.
2. **PDF técnicos:** los 1.814 archivos del RAID, fragmentados por página y sección, con metadatos normalizados de marca, modelo, documento y página.

No se migrarán los 688 artículos de `repair_knowledge`, los vectores de `repair_embeddings`, los 4 `cerebro_schematics` ni los chats anteriores. Ninguna ruta V2 consultará esas tablas.

Los datos heredados quedarán aislados y sin consumidores. Después de validar el producto nuevo se preparará un inventario y backup para que el usuario decida si desea archivarlos o eliminarlos físicamente.

## 9. Sincronización incremental de reparaciones

El worker mantendrá acceso `SELECT` únicamente sobre las tablas técnicas autorizadas. Usará un cursor persistente `(updatedAt, id)` en `rag_ingestion_jobs`.

En cada ciclo:

1. Leer un lote ordenado posterior al cursor.
2. Reconstruir el documento desde problema, diagnóstico, diagnóstico enriquecido, observaciones, repuestos y estados.
3. Sanear datos personales e importes.
4. Calcular el hash.
5. Omitir versiones idénticas.
6. Insertar la nueva versión y retirar la anterior en una transacción.
7. Actualizar el cursor solo después del commit.

La autoridad se recalculará como `CONFIRMED_SUCCESS`, `FAILED` o `INCOMPLETE`. El proceso se ejecutará al iniciar y periódicamente. Un fallo conservará el cursor anterior y registrará un error sanitizado.

La sincronización no será solo para reparaciones nuevas: reindexará cualquier reparación cuyo `updatedAt` cambie.

## 10. Evaluación técnica obligatoria

Antes de habilitar Cerebro V2 se construirá un conjunto de pruebas doradas con casos reales sanitizados de distintas marcas y tipos de falla. Cada caso evaluará:

- Aislamiento de marca y modelo.
- Recuperación de la reparación o página esperada.
- Interpretación del síntoma y las mediciones aportadas.
- Primera medición concreta y segura.
- Ausencia de UUID, precios, datos personales y afirmaciones no respaldadas.
- Cita correcta y render de la página indicada.
- Comportamiento explícito cuando no existe evidencia suficiente.
- Fallback real cuando falla el proveedor principal.

El caso SM-A405FN con consumo fijo de 0,08 A formará parte del conjunto de regresión. No se aprobará solo porque la API responda 200: deberá ofrecer una secuencia diagnóstica útil para un técnico y fundamentada en fuentes.

También se realizará una sesión de aceptación con un técnico: consultas reales, mediciones sucesivas, recuperación de chats, apertura de páginas y evaluación de utilidad. Los resultados fallidos se usarán para ajustar recuperación, metadatos o prompt, no para agregar conocimiento inventado al prompt.

## 11. Seguridad y errores

- La base principal no recibirá escrituras del worker.
- Toda ruta nueva verificará sesión, rol y pertenencia del recurso.
- Los PDF y páginas renderizadas continuarán protegidos por sesión y secreto interno.
- No se expondrán credenciales, rutas físicas ni fuentes completas en logs.
- Un fallo de RAG mostrará un estado visible; no se inventará evidencia.
- Un fallo del proveedor usará el siguiente proveedor configurado sin reintentos automáticos de Groq.
- Se mantendrá el aislamiento estricto por marca en recuperación, prompt y pruebas.

## 12. Criterios de aceptación

- ADMIN y TECHNICIAN ven la misma interfaz V2; VENDOR no accede.
- No aparecen Wiki, schematics, tokens, modo mentor ni guardar resumen.
- El historial V2 comienza vacío y guarda únicamente chats nuevos.
- Nuevo chat, reabrir, renombrar y eliminar funcionan sin duplicados.
- Texto devuelve respuesta y fuentes estructuradas.
- Imagen usa visión saludable o muestra un error explícito.
- Una cita renderiza dentro del chat la página correcta con zoom y navegación.
- Una reparación creada o modificada aparece tras el siguiente ciclo.
- Una reparación sin cambios no crea otra versión.
- Las fuentes V2 se limitan a reparaciones canónicas y los 1.814 PDF.
- La pantalla administrativa confirma salud o error de cada dependencia sin secretos.
- Los casos dorados y la aceptación del técnico alcanzan los umbrales definidos en el plan de implementación.
- Tests, TypeScript, lint de archivos tocados, build y comprobación de diff pasan.

## 13. Despliegue y rollback

El despliegue será aditivo:

1. Crear persistencia V2 y sincronización incremental.
2. Auditar proveedores, reemplazar prompt y agregar evaluación.
3. Implementar fuentes estructuradas y render de páginas.
4. Implementar el shell V2 para ambos roles.
5. Ejecutar pruebas autenticadas, casos dorados y aceptación técnica.
6. Habilitar V2 y observar salud, calidad y sincronización.

El rollback volverá al commit anterior de la aplicación. La base RAG y las tablas heredadas permanecerán intactas; no será necesaria una restauración de datos.
