# Avisos de entrega bloqueada en POS

## Objetivo

Cuando un vendedor intenta entregar desde el POS una reparación cuyo estado todavía impide la entrega, mantener la operación bloqueada y hacer visible la intervención requerida tanto para el técnico como para todos los administradores.

## Alcance funcional

- El intento de entrega continúa bloqueado para los estados definidos por la política vigente de POS.
- Se identifica el evento con `actionData.type = "BLOCKED_REPAIR_DELIVERY"`; la interfaz no deduce el comportamiento analizando el título o el mensaje.
- El evento incluye como mínimo `repairId`, `ticketNumber`, `vendorName`, `statusId` y `statusName`.
- El técnico asignado recibe una notificación persistente. Si la reparación no tiene técnico asignado, la reciben los técnicos de la sucursal, igual que en el flujo actual.
- Cada usuario con rol `ADMIN` recibe una notificación persistente en su campanita.
- La notificación del técnico mantiene un enlace directo a `/technician/repairs?repairId=<repairId>`.
- La notificación administrativa informa que el vendedor notificó al técnico para cambiar el estado, identifica ticket, vendedor y estado actual, y enlaza a la edición administrativa de la reparación.

## Experiencia del técnico

La campanita continúa consultando las notificaciones mediante el polling compartido existente. Cuando aparece una notificación nueva cuyo evento es `BLOCKED_REPAIR_DELIVERY`, muestra una sola vez un toast personalizado:

- color azul, visualmente distinto del aviso rojo de vencimiento;
- sonido inmediato usando el audio de notificaciones disponible;
- posición superior central;
- duración indefinida hasta interacción;
- detalle del vendedor, ticket y estado que debe cambiar;
- acción principal `Editar estado`;
- acción secundaria para cerrar el aviso.

Al pulsar `Editar estado`, el toast se cierra, la notificación se marca como leída y el técnico navega a `/technician/repairs?repairId=<repairId>`. La tabla de reparaciones activas usa ese parámetro para abrir directamente el detalle de la reparación, desde donde el técnico puede cambiar el estado.

El toast se dispara por el ID único de la notificación, no por el ID de reparación. Un mismo aviso no reaparece en cada ciclo de polling ni al actualizar el estado local. Un nuevo intento posterior genera una nueva notificación y puede producir un nuevo toast.

## Experiencia administrativa

Todos los usuarios con rol `ADMIN` reciben en la campanita una notificación informativa con un texto equivalente a:

> El vendedor {vendorName} notificó al técnico para cambiar el estado del ticket #{ticketNumber}, actualmente en {statusName}.

El aviso administrativo no genera el toast azul reservado al técnico. Su enlace abre `/admin/repairs/<repairId>/edit` para que el administrador pueda revisar la reparación.

## Flujo de datos

1. El checkout detecta una reparación con estado bloqueado antes de crear la venta.
2. El servicio de política obtiene las reparaciones bloqueadas y sus destinatarios técnicos.
3. El mismo servicio consulta todos los administradores y crea las notificaciones de técnico y administrador en paralelo.
4. Cada notificación guarda datos estructurados del evento en `actionData`.
5. La campanita del técnico recibe el nuevo registro en el siguiente polling, reproduce sonido y muestra el toast azul.
6. La acción del toast marca el registro como leído y navega al detalle solicitado.

No se agrega otro `setInterval`, monitor ni canal de tiempo real; se reutiliza `usePolling` de la campanita.

## Errores y consistencia

- Un fallo al crear una notificación no puede habilitar la entrega bloqueada.
- La creación de avisos mantiene ejecución paralela y resultados verificables; no se agregan rechazos silenciosos.
- Si el navegador bloquea la reproducción automática, se conserva el fallback de audio ante la siguiente interacción del usuario.
- Los datos de la reparación y destinatarios se consultan por IDs y roles, nunca por nombre de sucursal.

## Pruebas

- La política crea el evento estructurado para el técnico asignado.
- Sin técnico asignado, notifica a los técnicos de la sucursal.
- Notifica a todos los usuarios con rol `ADMIN`.
- Los textos y enlaces de técnico y administrador son correctos.
- La campanita reconoce el tipo estructurado sin analizar texto.
- Cada ID de notificación dispara como máximo un toast.
- `Editar estado` marca la notificación como leída y navega a `/technician/repairs?repairId=<repairId>`.
- Las notificaciones comunes y las administrativas no disparan el toast azul.

## Fuera de alcance

- WebSockets, SSE o cambios de infraestructura en tiempo real.
- Modificar los estados que bloquean actualmente la entrega.
- Cambiar la lógica con la que el técnico actualiza el estado dentro del detalle de reparación.
