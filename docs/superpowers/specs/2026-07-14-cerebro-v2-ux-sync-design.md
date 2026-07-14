# Cerebro V2 — UX unificada y sincronización continua

**Fecha:** 2026-07-14  
**Estado:** Aprobado conceptualmente por el usuario  
**Alcance:** Reemplazo completo de la interfaz heredada de Cerebro, migración controlada del conocimiento técnico útil y sincronización automática de reparaciones nuevas o modificadas.

## 1. Objetivo

Cerebro debe ser una única herramienta de diagnóstico técnico para usuarios `ADMIN` y `TECHNICIAN`. La pantalla debe concentrarse en consultar, responder, mostrar evidencia y abrir documentación. No debe exponer funciones heredadas que ya no formen parte del flujo V2.

La aplicación conservará el historial de conversaciones, utilizará exclusivamente el RAG aislado para evidencia y mantendrá dicho RAG actualizado sin escribir en la base principal.

## 2. Situación actual verificada

La interfaz desplegada todavía monta `CerebroLayout`, un componente heredado de 485 líneas que incluye:

- Wiki Técnica y edición manual de artículos.
- Carga manual de schematics.
- Acción “Guardar Wiki”.
- Indicador de tokens.
- Eventos globales `window.dispatchEvent`.
- Paneles y controles que no están conectados al RAG V2.

La base principal conserva:

- 1.870 filas en `repair_embeddings`.
- 688 artículos en `repair_knowledge`.
- 4 filas en `cerebro_schematics`.
- 18 conversaciones y 76 mensajes de Cerebro.

El RAG V2 contiene las 3.308 reparaciones del corte inicial. El proceso masivo pasó después a los PDF, por lo que actualmente no existe reconciliación continua de reparaciones nuevas o modificadas.

## 3. Experiencia de usuario

### 3.1 Dirección visual

La herramienta seguirá una estética industrial y operativa, inspirada en instrumental de laboratorio: fondo oscuro neutro, alto contraste, tipografía legible, acentos verdes para evidencia disponible y ámbar para estados incompletos. No utilizará gradientes decorativos, paneles superpuestos innecesarios ni una apariencia de landing page.

La prioridad visual será:

1. Dispositivo seleccionado.
2. Consulta y respuesta.
3. Evidencia recuperada.
4. Acceso al documento fuente.

### 3.2 Estructura

La pantalla tendrá cuatro áreas funcionales:

1. **Barra superior:** marca, modelo, estado del RAG y acción “Nueva consulta”.
2. **Historial plegable:** conversaciones del usuario agrupadas por fecha, con selección y eliminación.
3. **Chat central:** mensajes, estado de procesamiento y compositor.
4. **Panel contextual de fuentes:** oculto cuando no hay evidencia; muestra reparaciones, Wiki migrada y PDF relevantes.

En dispositivos móviles, historial y fuentes serán paneles temporales. En escritorio, el chat conservará el ancho principal y las fuentes ocuparán una columna secundaria únicamente cuando se abran.

### 3.3 Compositor

El compositor incluirá:

- Texto técnico.
- Marca obligatoria.
- Modelo obligatorio.
- Adjuntar imágenes.
- Enviar y detener generación.

No incluirá:

- Adjuntar PDF manualmente.
- Modo guiado.
- Guardar en Wiki.
- Resumen automático.
- Contador de tokens.

Las imágenes solo se mostrarán como disponibles cuando exista un proveedor de visión configurado. Si falla la visión, el usuario recibirá un error explícito y la imagen no se tratará silenciosamente como texto.

### 3.4 Respuestas y evidencia

Cada respuesta mantendrá el formato técnico directo de Cerebro V2. Las fuentes se enviarán al cliente como datos estructurados independientes del texto generado.

Cada fuente mostrará:

- Tipo: reparación, conocimiento técnico o PDF.
- Marca y modelo normalizados.
- Título o ticket.
- Autoridad: éxito confirmado, documento técnico, incompleto o fallido.
- Página cuando corresponda.
- Fragmento utilizado.

Los PDF se abrirán mediante el proxy autenticado existente y posicionados en la página citada. Los casos fallidos se identificarán visualmente como contraejemplos y nunca como soluciones confirmadas.

## 4. Arquitectura frontend

Se crearán componentes V2 nuevos, cada uno por debajo de 300 líneas:

- `cerebro-v2-shell.tsx`: composición general y estado de paneles.
- `cerebro-v2-header.tsx`: dispositivo, estado y nueva consulta.
- `cerebro-v2-history.tsx`: historial de conversaciones.
- `cerebro-v2-chat.tsx`: lista de mensajes y streaming.
- `cerebro-v2-composer.tsx`: texto e imágenes.
- `cerebro-v2-sources.tsx`: evidencia estructurada.
- `use-cerebro-v2-chat.ts`: transporte, persistencia y errores.

No se extenderá `CerebroLayout`. Las páginas de administrador y técnico montarán directamente el shell V2. Las conversaciones y mensajes existentes continuarán usando `cerebro_conversations` y `cerebro_messages`.

Los eventos globales de Wiki serán eliminados del flujo. La comunicación entre componentes se realizará mediante props, estado local acotado y callbacks estables.

## 5. API de chat y visión

`POST /api/cerebro-v2/chat` seguirá autenticando antes de leer el cuerpo y continuará restringido a `ADMIN` y `TECHNICIAN`.

El flujo será:

1. Validar marca, modelo, mensajes e imágenes.
2. Generar embedding de la consulta.
3. Recuperar evidencia con aislamiento obligatorio de marca.
4. Emitir al stream un bloque de fuentes estructuradas.
5. Elegir modelo de texto o visión según los adjuntos.
6. Emitir la respuesta del modelo con `maxRetries: 0`.
7. Persistir la conversación sin duplicar mensajes.

Groq seguirá siendo principal y OpenRouter fallback. El identificador del modelo de visión será configurable por entorno para no depender de un modelo retirado.

## 6. Datos heredados

### 6.1 Datos conservados

`cerebro_conversations` y `cerebro_messages` permanecen activos porque forman parte de la UX nueva.

### 6.2 Wiki técnica

Los 688 registros de `repair_knowledge` se migrarán al RAG aislado como `source_type = 'WIKI'`:

- Se normalizarán marca y modelo.
- Se sanearán datos personales, teléfonos, correos e importes.
- Se generarán embeddings BGE-M3 de 1.024 dimensiones.
- Se versionarán por hash.
- Se marcarán con autoridad `TECHNICAL_DOCUMENT`.

La Wiki dejará de editarse desde Cerebro. Su contenido histórico quedará disponible como evidencia de solo lectura.

### 6.3 Embeddings antiguos

`repair_embeddings` no se migrará porque contiene vectores antiguos de 384 dimensiones derivados de información que ya fue reconstruida desde las tablas canónicas.

La tabla no se eliminará durante este cambio. Quedará sin consumidores y podrá archivarse en una tarea posterior, después de backup y período de observación.

### 6.4 Schematics antiguos

Los 4 registros de `cerebro_schematics` se auditarán por contenido y correspondencia con los PDF del RAID. Si existe un PDF equivalente, prevalecerá el PDF. Solo se migrará texto único, identificable y técnicamente útil; no se crearán fuentes duplicadas.

## 7. Sincronización incremental de reparaciones

El worker mantendrá acceso `SELECT` únicamente sobre las tablas técnicas autorizadas de la base principal.

La sincronización utilizará un cursor persistente compuesto por `updatedAt` e `id`, almacenado en `rag_ingestion_jobs`. En cada ciclo:

1. Leer un lote ordenado de reparaciones posteriores al cursor.
2. Reconstruir el documento técnico desde problema, diagnóstico, diagnóstico enriquecido, observaciones, repuestos y estados.
3. Sanear información personal e importes.
4. Calcular el hash del contenido.
5. Omitir versiones idénticas.
6. Insertar la nueva versión y retirar la anterior en una transacción.
7. Actualizar el cursor solo después del commit del lote.

La autoridad se recalculará en cada versión:

- `CONFIRMED_SUCCESS`: diagnóstico con estado final exitoso actual o histórico.
- `FAILED`: estado “No Reparado”.
- `INCOMPLETE`: diagnóstico ausente o reparación todavía no confirmada.

El servicio se ejecutará periódicamente y también al iniciar el Compose. Si un ciclo falla, conservará el cursor anterior, registrará un error sanitizado y reintentará sin perder reparaciones.

La actualización no será “solo nuevas”: también reindexará reparaciones existentes cuyo `updatedAt` cambie, por ejemplo al agregar diagnóstico, observación, repuesto o cambiar el estado.

## 8. Seguridad y errores

- La base principal no recibirá escrituras del worker.
- Las rutas antiguas de Wiki y schematics dejarán de estar accesibles desde la UI y se retirarán o responderán como función descontinuada.
- Los PDF continuarán protegidos por sesión y secreto interno.
- No se expondrán rutas físicas, credenciales ni contenido completo de fuentes en logs.
- Un fallo de RAG mostrará un estado visible; no se inventará evidencia.
- Un fallo del proveedor intentará el siguiente proveedor configurado sin reintentos automáticos de Groq.

## 9. Verificación

La entrega se considerará funcional cuando:

- ADMIN y TECHNICIAN vean la misma interfaz V2.
- VENDOR no pueda acceder.
- No aparezcan Wiki, carga de schematics, tokens, modo guiado ni guardar resumen.
- El historial existente continúe disponible.
- Una consulta de texto devuelva respuesta y fuentes estructuradas.
- Una imagen utilice visión o muestre un error explícito.
- Una cita PDF abra el archivo y página correctos.
- Una reparación creada o modificada aparezca en el RAG después del siguiente ciclo.
- Una reparación sin cambios no genere una versión duplicada.
- Los 688 artículos técnicos válidos queden consultables desde el RAG nuevo.
- Los tests, TypeScript, lint de archivos tocados, build y comprobación de diff pasen.

## 10. Despliegue

El despliegue será aditivo:

1. Implementar y probar sincronización y migración.
2. Migrar Wiki y auditar schematics sin borrar datos antiguos.
3. Desplegar APIs y fuentes estructuradas.
4. Desplegar el shell V2 para ambas páginas.
5. Ejecutar pruebas autenticadas de chat, visión y PDF.
6. Observar logs y métricas de sincronización.

El rollback consiste en volver al commit anterior de la aplicación. La base RAG y las tablas heredadas permanecen intactas, por lo que el rollback no requiere restauración de datos.
