# Reimpresión de cierre y estabilidad del historial de repuestos

## Objetivo

Resolver dos problemas operativos independientes sin modificar datos históricos ni agregar migraciones:

1. Permitir que un vendedor reimprima el último cierre de caja propio de la fecha seleccionada desde **Mis Ventas**.
2. Evitar que una fila cambie de posición al marcar o desmarcar su control en **Historial de Repuestos**.

## Reimpresión del cierre de caja

### Interfaz

- Agregar el botón **Reimprimir cierre** junto al indicador **Total filtrado**.
- El botón usa la fecha seleccionada en los filtros de Mis Ventas.
- Mientras consulta, queda deshabilitado y muestra estado de carga.
- Si no existe un cierre propio para esa fecha, mostrar un aviso y no abrir la impresión.
- Si hubo varios cierres, reimprimir automáticamente el último cierre completado.

### Seguridad y consulta

- Crear una Server Action dedicada y autenticada.
- Aceptar una fecha civil `YYYY-MM-DD` y resolver su rango con las utilidades de zona horaria de Argentina.
- Autorizar únicamente al vendedor autenticado.
- Buscar una caja `CLOSED` cuyo `userId` sea el del vendedor y cuyo inicio pertenezca a la fecha solicitada.
- Elegir la última por `endTime` y usar un desempate estable.
- Acotar ventas y gastos al intervalo real `startTime`–`endTime` y al mismo vendedor/sucursal.

### Comprobante

- Reutilizar `printCashShiftClosureTicket` para conservar el formato actual.
- Reconstruir efectivo, tarjeta, MercadoPago, total, gastos, premio, esperado y diferencia a partir de los datos persistidos.
- Usar `endAmount` como total contado y `employeeCount` como cantidad de empleados.
- Los cierres históricos no mostrarán denominaciones porque los conteos de billetes no se almacenan actualmente.
- No se agregan columnas ni migraciones.

## Historial de repuestos estable

### Causa

El control actual llama `router.refresh()` después de cada cambio. Esto reemplaza los datos renderizados y deja que la base vuelva a decidir el orden. El orden solo por `createdAt` tampoco define qué ocurre cuando dos movimientos comparten la misma marca temporal.

### Corrección

- Mantener una copia local sincronizada de las filas visibles.
- Al confirmar la Server Action, actualizar solo `isChecked` de la fila afectada.
- Recalcular localmente los KPI de controlados y pendientes.
- No refrescar ni reordenar la tabla al pulsar el control.
- Mantener el orden original mediante una actualización inmutable por ID.
- Agregar un desempate estable por `id` después de `createdAt` en la consulta del servidor.
- Conservar el refresh completo únicamente para acciones que realmente cambian el conjunto, como sincronizar reparaciones.

### División del componente

`HistoryClient` supera las 300 líneas. Antes de agregar comportamiento se extraerá la lógica de estado y control a una unidad enfocada, reduciendo el componente principal y manteniendo separadas la presentación y la actualización optimista.

## Errores y concurrencia

- La fila solo cambia localmente después de una respuesta exitosa del servidor.
- Mientras una fila se actualiza, su botón queda deshabilitado para impedir dobles pulsaciones.
- Si falla la acción, la fila conserva su estado y posición y se muestra el error.
- La acción devuelve el nuevo valor persistido de `isChecked`, evitando invertir el estado a partir de información vieja.

## Pruebas

- Pruebas puras de cálculo del comprobante: métodos de pago, gastos, premio, esperado y diferencia.
- Pruebas de selección del último cierre y validación de fecha.
- Prueba de actualización inmutable: cambia `isChecked` sin cambiar el orden de IDs.
- Prueba estructural de la UI del botón de reimpresión y del control sin `router.refresh()`.
- Gates completos: TypeScript, lint de archivos tocados, `git diff --check`, Vitest y build de producción.

## Fuera de alcance

- Persistir el detalle de denominaciones de billetes para cierres futuros.
- Elegir manualmente entre varios cierres del mismo día.
- Cambiar o recalcular datos de cierres ya guardados.
