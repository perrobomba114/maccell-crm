# Acceso del equipo y presentación del chat

## Objetivo

Aclarar que la ausencia de una credencial puede significar que el equipo no tiene bloqueo o que el cliente no autoriza el acceso; mantener los chats disponibles durante el diagnóstico; y distinguir visualmente a cada rol dentro de una conversación.

## Decisiones confirmadas

### Acceso del equipo

- La opción persistida continúa siendo `RepairAccessType.NONE`; no se agrega una migración ni se cambia información histórica.
- En el formulario se mostrará **“Sin código / No autoriza”**.
- La descripción será **“El equipo no tiene bloqueo o el cliente no autoriza el acceso”**.
- `formatRepairAccess("NONE")` devolverá **“Sin código / No autoriza”**, por lo que el texto quedará asentado en el comprobante impreso y en los resúmenes que reutilizan este formateador.
- La revisión final del ingreso usará el mismo lenguaje para evitar mensajes contradictorios.

### Ciclo de vida del chat

- Estados activos: Pendiente, Tomada, En proceso, Pausada, Finalizado OK, Sin solución y los estados operativos 8/9 existentes.
- Estados archivados y de solo lectura: Entregada (`6`) y Entregada con factura (`10`).
- La bandeja, la búsqueda, el modo de solo lectura y la navegación al detalle compartirán las mismas constantes de estado.
- No se modifican reparaciones ni mensajes existentes; el cambio solamente reclasifica su bandeja según el estado actual de la reparación.

### Colores de mensajes

- Vendedor (`VENDOR`): verde esmeralda.
- Técnico (`TECHNICIAN`): azul.
- Administrador (`ADMIN`): negro con borde gris visible.
- Los tres estilos tendrán texto blanco y contraste suficiente en tema oscuro.
- La alineación seguirá indicando mensajes propios y ajenos, pero el color dependerá siempre del rol del remitente.
- Nombre, rol, respuesta citada, horario y confirmación de lectura deberán conservar legibilidad dentro de cada color.

## Alternativas descartadas

- Crear un cuarto tipo de acceso “No autoriza”: distinguiría los casos en datos, pero requiere migración y una decisión adicional en recepción. El pedido confirmado solicita una opción combinada.
- Archivar al finalizar el trabajo técnico: oculta la conversación antes de la entrega y contradice el flujo operativo confirmado.
- Colorear según mensaje propio/ajeno: no permite identificar rápidamente vendedor, técnico y administrador.

## Pruebas

- Prueba del texto de `NONE` y de su uso en formulario, revisión e impresión.
- Prueba de estados: `5` y `7` activos; `6` y `10` archivados/solo lectura.
- Prueba de navegación para estados activos y archivados.
- Prueba de estilos por cada rol, sin depender del usuario actual.
- Suite completa, TypeScript, ESLint de archivos tocados, verificación de whitespace y build de producción.

## Fuera de alcance

- Cambiar el enum o guardar por separado “sin bloqueo” y “no autoriza”.
- Alterar mensajes, reparaciones o comprobantes ya almacenados.
- Cambiar permisos de acceso al chat.
