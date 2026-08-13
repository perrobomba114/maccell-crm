# Notificaciones obligatorias de cambios de precio en POS

## Objetivo

Garantizar que toda venta con un precio distinto al precio vigente de la reparación o producto deje una notificación persistida para cada administrador, incluso cuando el precio original sea cero o el vendedor edite el importe más de una vez. La venta no debe depender del sonido, polling o renderizado de la notificación en la interfaz.

## Problema observado

El POS conserva el precio original con `originalPrice || price`. Como cero es un valor falso en JavaScript, una segunda edición puede reemplazar el precio original por el precio modificado. El servidor actualmente confía en ese dato enviado por el cliente y ejecuta la creación de notificaciones después de confirmar la transacción de venta. Por eso una venta puede quedar persistida sin que exista el registro de alerta correspondiente.

## Diseño aprobado

### Fuente de verdad del precio

El checkout resolverá en el servidor el precio original de cada ítem antes de guardar la venta:

- Reparaciones: `Repair.estimatedPrice`, preservando explícitamente el valor cero.
- Productos: precio vigente del producto en la base de datos.

El valor enviado por el navegador no será la autoridad para decidir si hubo una modificación. El servidor construirá los ítems normalizados y los usará tanto al guardar `SaleItem.originalPrice` como al detectar cambios.

### Persistencia atómica

La creación de la venta, sus ítems y una notificación para cada usuario con rol `ADMIN` ocurrirá dentro de la misma transacción de Prisma. Si la transacción se confirma, existirán tanto la venta como los registros de notificación. Esto elimina la ventana actual en la que la venta se confirma y luego falla una operación independiente de notificación.

La entrega visual sigue desacoplada: polling, campana, sonido o una sesión administradora desconectada no bloquean el checkout. Cuando la interfaz vuelva a consultar, encontrará la notificación persistida.

Una indisponibilidad total de PostgreSQL impedirá guardar tanto la venta como la notificación; no existe un estado válido en el que la venta pueda persistirse sin base de datos.

### Defensa en el cliente

El POS cambiará la selección del precio original de `originalPrice || price` a `originalPrice ?? price`. De esta manera, cero se preservará durante todas las ediciones del carrito. Esta capa mejora la representación inmediata del carrito, pero la garantía de negocio permanecerá en el servidor.

### Alcance de la alerta

Se notificará cuando la diferencia absoluta entre el precio vigente y el precio vendido sea mayor a un centavo. La alerta incluirá vendedor, número de venta, ítem, precio original, precio cobrado y motivo. No se generará alerta cuando los importes sean equivalentes.

## Manejo de errores

- No se dependerá de una acción secundaria posterior a la venta para persistir la alerta.
- La interfaz no esperará confirmación de reproducción de sonido o recepción en tiempo real.
- Los errores de transacción conservarán el comportamiento actual del checkout: no se reportará una venta exitosa si sus datos esenciales no pudieron persistirse.

## Pruebas de regresión

Se cubrirán como mínimo estos escenarios:

1. Reparación con precio vigente `$0` vendida a `$30.000`: guarda `originalPrice: 0` y genera alerta.
2. Reparación con precio vigente `$0`, editada más de una vez y vendida a `$95.000`: conserva el cero y genera alerta.
3. Ítem vendido al mismo precio vigente: no genera alerta.
4. Venta con más de un ítem: la alerta enumera solamente los ítems modificados.
5. La persistencia genera una notificación para cada administrador existente.

## Fuera de alcance

- Cambiar el mecanismo de polling o el sonido de la campana.
- Reenviar notificaciones por correo, WhatsApp o servicios externos.
- Modificar ventas históricas o fabricar retroactivamente alertas faltantes.
