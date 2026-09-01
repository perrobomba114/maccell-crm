# Reactivación de reparaciones por vendedor — Diseño

## Objetivo

Evitar que los técnicos reciban en su lista operativa reparaciones detenidas por diagnóstico, confirmación del cliente o falta de repuestos, y permitir que un vendedor de la misma sucursal las reactive de forma trazable para devolverlas a la cola de ingreso técnico.

## Alcance

El cambio cubre el ciclo de reparaciones del portal del técnico y del vendedor:

- Visibilidad de estados en `Trabajo Disponible`, `Reparaciones` y `Reparaciones Activas`.
- Historial del vendedor para reparaciones detenidas.
- Reactivación autorizada por vendedor de la misma sucursal.
- Persistencia de la transición y registro visible en el historial.
- Notificaciones al vendedor y a los técnicos de la sucursal.
- Pruebas de permisos, filtros, transición y regresiones.

No incluye modificar el modelo de garantías ni crear una columna adicional de “estado anterior”. El modelo existente `RepairStatusHistory` ya conserva cada transición con estado origen, estado destino, usuario y fecha.

## Estados involucrados

Se usarán las constantes semánticas existentes:

| Estado | ID | Tratamiento |
|---|---:|---|
| Para Retirar/Ingresado | 1 | Cola de trabajo disponible y reparaciones activas del vendedor |
| Tomado por Técnico | 2 | Reparación operativa asignable/gestionable por el técnico |
| En Proceso | 3 | Reparación operativa asignada al técnico |
| Pausado | 4 | Reparación operativa asignada al técnico |
| Diagnosticado | 7 | Fuera de la cola técnica; visible en historial del vendedor |
| Esperando Confirmación | 8 | Fuera de la cola técnica; visible en historial del vendedor |
| Esperando Repuestos | 9 | Fuera de la cola técnica; visible en historial del vendedor |

## Reglas de visibilidad

### Portal del técnico

- `/technician/tickets` continúa siendo la cola para reparaciones en estado `1` sin técnico asignado.
- `/technician/repairs` solo carga estados `2`, `3` y `4`, y muestra reparaciones asignadas al técnico autenticado más las reparaciones `Tomado por Técnico` sin asignar que ya forman parte del flujo de retiro/asignación existente.
- Los estados `7`, `8` y `9` no se envían al navegador del técnico ni aparecen como acciones de “Reactivar”.

### Portal del vendedor

- `/vendor/repairs/active` solo carga estados `1`, `2`, `3` y `4`.
- `/vendor/repairs/history` incluye estados finalizados y detenidos: `5`, `6`, `7`, `8`, `9` y `10`.
- Las reparaciones en estados `7`, `8` y `9` muestran la acción `Reactivar para técnico` en desktop y móvil.

## Reactivación

La acción de servidor recibirá únicamente el identificador de la reparación y resolverá el usuario autenticado. No confiará en un `userId` enviado por el cliente.

Autorización:

- Un usuario `VENDOR` puede reactivar si su `branchId` coincide con el `branchId` de la reparación.
- Un usuario `ADMIN` conserva capacidad de gestión.
- Otros roles reciben `No autorizado`.

La operación se ejecutará en una transacción y solo tendrá éxito si la reparación sigue en `7`, `8` o `9`:

1. Leer el estado actual y el usuario de la reparación dentro de la transacción.
2. Cambiar `statusId` a `1`.
3. Establecer `assignedUserId` en `null`.
4. Limpiar `startedAt` y `finishedAt` para que vuelva a ser una reparación operativa, sin borrar `diagnosis`, repuestos ni datos del ingreso.
5. Crear `RepairStatusHistory` con `fromStatusId` igual al estado detenido y `toStatusId` igual a `1`, usando el vendedor autenticado.
6. Crear una observación: `Reactivada por [vendedor]. Estado anterior: [estado]. Disponible nuevamente para técnico.`

La condición de estado en la actualización será optimista para evitar doble reactivación desde dos sesiones. Una segunda ejecución devolverá error y no creará historial duplicado.

## Notificaciones

Cuando el técnico cambie una reparación a `7`, `8` o `9`, el usuario que realizó el ingreso recibirá una notificación con enlace al historial del vendedor.

Cuando un vendedor reactive una reparación, los técnicos de la misma sucursal y los técnicos globales sin sucursal recibirán una notificación de nueva reparación disponible con enlace a `/technician/tickets`.

Las notificaciones se crearán fuera de la transacción principal, con errores registrados sin revertir una transición ya confirmada. La acción será idempotente respecto de la transición: no se notificará una segunda reactivación que no haya cambiado el estado.

## Interfaz

- Añadir el botón `Reactivar para técnico` a las filas desktop y tarjetas mobile del historial.
- Mostrar estado de carga por reparación y confirmación antes de ejecutar.
- Tras éxito, mostrar un toast, actualizar la ruta y quitar la reparación del historial si ya no cumple el filtro; aparecerá en activos y en trabajo disponible.
- Mantener la vista de detalle y su timeline: la última entrada debe mostrar, por ejemplo, `Esperando Confirmación → Para Retirar/Ingresado`, con usuario y fecha.
- El detalle no debe exponer datos de otras sucursales.

## Diseño técnico

Se reutilizarán `REPAIR_STATUS`, `RepairStatusHistory`, `createNotificationAction`, `revalidatePath` y los componentes actuales de historial. Se añadirá un módulo pequeño para la mutación de reactivación y helpers semánticos de filtros si los archivos actuales superan su responsabilidad.

No se hará una migración Prisma.

## Manejo de errores

- Reparación inexistente: error visible y ninguna mutación.
- Usuario no autorizado o de otra sucursal: error visible y ninguna mutación.
- Estado no reactivable o cambio concurrente: error visible y ninguna mutación.
- Fallo de notificación después de la transición: la reparación permanece correctamente reactivada y el fallo queda registrado mediante `console.error` sin datos sensibles.

## Criterios de aceptación

1. Un técnico autenticado no recibe estados `7`, `8` ni `9` en `/technician/repairs`.
2. Un vendedor no ve estados `7`, `8` ni `9` en `/vendor/repairs/active`.
3. Un vendedor ve esos estados en `/vendor/repairs/history` y puede reactivar desde desktop y móvil.
4. Un vendedor de otra sucursal no puede reactivar la reparación.
5. La reactivación deja exactamente `statusId=1` y `assignedUserId=null`.
6. La transición conserva diagnóstico y genera una entrada de historial con estado anterior, estado `1`, usuario y fecha.
7. La reparación reactivada aparece en la cola de trabajo disponible y en reparaciones activas del vendedor.
8. El vendedor recibe la notificación al quedar la reparación en estado detenido.
9. Los técnicos reciben la notificación al reactivarse una reparación.
10. Los tests de estados, permisos, concurrencia lógica, notificaciones y UI pasan junto con la suite existente.
