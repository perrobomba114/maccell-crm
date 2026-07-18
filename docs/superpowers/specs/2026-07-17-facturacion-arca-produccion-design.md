# Facturación y conciliación ARCA de producción

## Objetivo

Corregir el módulo de facturación para que muestre importes fiscales inequívocos, concilie el período mensual completo de MACCELL y 8BIT contra ARCA y permita emitir comprobantes administrativos con validaciones y recuperación segura.

## Causas verificadas

- El control actual limita cada entidad y tipo a los últimos 120 números (`MAX_SCAN_PER_RANGE_DEFAULT`). Por eso los importes de $2.341.000 y $1.958.000 son una muestra de ventas emitidas, no compras ni el total mensual.
- El presupuesto global de 12 segundos puede cortar incluso esa muestra y devolver resultados parciales.
- La UI mezcla el total del período con una muestra ARCA y usa una grilla de tres columnas que estira dos tarjetas cortas a la altura del control largo.
- El Web Service WSFEv1 no ofrece una consulta por mes. La documentación oficial expone `FECompUltimoAutorizado` por CUIT, punto de venta y tipo, y `FECompConsultar` por tipo, punto de venta y número.
- La emisión administrativa confía en `userId`, entidad, punto de venta y sucursal enviados por el navegador, no autentica la Server Action y no deja un registro recuperable si ARCA autoriza pero falla la persistencia local.

## Alternativas consideradas

1. Mantener la muestra de 120 y aclarar el texto. Es rápida, pero no satisface una conciliación mensual y puede ocultar comprobantes faltantes.
2. Consultar únicamente los números existentes en la base local. Permite validar cada factura local, pero no detecta comprobantes que existan en ARCA y falten localmente.
3. Usar los métodos oficiales para descubrir los límites del período y consultar todos los comprobantes. Es la opción seleccionada porque permite una conciliación real y bidireccional.

## Diseño funcional

### Conciliación mensual completa

- Trabajar por entidad fiscal, punto de venta y tipo de comprobante (A=1, B=6, C=11).
- Obtener el último autorizado con `getLastVoucher`.
- Localizar por fecha los límites inferior y superior del mes mediante consultas acotadas y búsqueda binaria sobre la numeración monotónica.
- Consultar todos los números comprendidos en esos límites con concurrencia limitada, timeout por request y sin un corte arbitrario de 120.
- Un lookup fallido vuelve incompleta la conciliación; nunca se presenta como conciliada una lectura parcial.
- Comparar por clave exacta `entidad:punto-de-venta:tipo:número`. El punto de venta se obtiene del número real, no de una constante implícita.
- Exponer totales y conteos locales/ARCA del período completo, además de números presentes sólo en ARCA o sólo localmente.
- La ausencia de credenciales o una falla de ARCA mantiene visibles los datos locales y muestra un estado de error; no inventa ceros fiscales.

### Persistencia y actualización

- Guardar el último resultado por período y entidad, con estado `RUNNING`, `COMPLETE` o `FAILED`, fecha de lectura y detalle de discrepancias.
- La pantalla lee el último resultado persistido al abrirse.
- “Actualizar ARCA” inicia una nueva lectura explícita. Mientras corre, la UI conserva el último resultado válido y muestra progreso/estado.
- Los meses cerrados se reutilizan hasta una actualización manual; el mes corriente se marca con su fecha de última lectura.

### Significado de los importes

- “Ventas facturadas” = importe total de comprobantes emitidos.
- “Neto gravado” = suma neta de comprobantes emitidos.
- “IVA débito fiscal” = IVA de ventas emitidas.
- No se mostrará “IVA compras” ni “crédito fiscal” porque el sistema no integra comprobantes recibidos de proveedores.

### UX aprobada

- Aplicar el layout compacto A.
- Encabezado con período, cantidad de comprobantes y acción principal “Emitir factura”.
- Cuatro indicadores compactos: ventas facturadas, neto gravado, IVA débito y estado de conciliación.
- Control ARCA horizontal de ancho completo con una fila por entidad: local, ARCA, diferencia, conteos y estado.
- Alertas resumidas y accionables; el detalle técnico queda en una sección desplegable.
- La tabla comienza inmediatamente después del control, sin grandes áreas vacías.
- En mobile, indicadores en dos columnas y conciliación en tarjetas apiladas.

### Emisión administrativa segura

- Autenticar la Server Action y exigir rol ADMIN.
- Ignorar `userId`, punto de venta y entidad fiscal enviados por el cliente. Derivarlos del usuario/sucursal seleccionada y de una configuración fiscal del servidor.
- Validar payload, importes positivos, fechas, documento, condición IVA, relación Factura A/CUIT/Responsable Inscripto y pertenencia de sucursal.
- Mostrar un paso de revisión antes de la operación irreversible con entidad, punto de venta, tipo, receptor, conceptos, neto, IVA y total.
- Crear un intento de emisión persistente con identificador idempotente antes de llamar a ARCA.
- Al autorizar, guardar CAE, vencimiento y número exacto. Luego crear venta, ítems, pago e invoice en una transacción local.
- Si ARCA autoriza y falla la transacción, dejar el intento como `AUTHORIZED_PENDING_SYNC`; una reanudación sincroniza el comprobante mediante `FECompConsultar` sin emitir otro.
- Un doble clic o reintento con el mismo identificador nunca genera dos comprobantes.

## Manejo de errores

- Los errores se normalizan para el usuario sin exponer CUIT, certificados ni respuestas sensibles.
- Una conciliación con consultas fallidas se marca `INCOMPLETE`, no conciliada.
- Una autorización ARCA sin persistencia local genera un aviso crítico recuperable, no un error genérico.
- No se agregan `console.log`; sólo errores reales y mensajes sin datos sensibles.

## Pruebas

- Tests unitarios de límites mensuales, parsing de fecha/número, comparación bidireccional, fallos parciales y redondeo monetario.
- Tests de validación de emisión, derivación de entidad/punto de venta, idempotencia y recuperación posterior a autorización.
- Tests de UI para etiquetas fiscales, estados completo/incompleto y paso de confirmación.
- Verificación visual responsive y navegación de teclado.
- No se emiten comprobantes reales en las pruebas automatizadas o manuales; ARCA se simula.

## Fuera de alcance

- IVA crédito fiscal por compras/proveedores. Requiere importar comprobantes recibidos desde otro servicio/libro IVA y no debe inferirse desde gastos locales.
- Cambios al flujo POS no relacionados, salvo reutilizar utilidades fiscales seguras si es necesario.
