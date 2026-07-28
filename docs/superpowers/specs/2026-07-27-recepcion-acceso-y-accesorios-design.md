# Recepción de acceso y accesorios en reparaciones

## Objetivo

Mejorar el formulario existente de alta de reparaciones para que vendedores registren de manera inequívoca el método de acceso del equipo y si el cliente entrega una tarjeta SIM o una tarjeta de memoria.

## Alcance

El cambio se integra en `vendor/repairs/create` y en cualquier otro flujo que reutilice `CreateRepairForm`. Mantiene la estructura visual actual, agrega datos persistentes a `Repair` y evita exponer credenciales en comprobantes, notificaciones o seguimiento público.

## Modelo de datos

Agregar el enum Prisma `RepairAccessType` y los siguientes campos a `Repair`:

- `accessType`: tipo de acceso con valores `CODE`, `PATTERN` o `NONE`.
- `accessCredential`: contenido del código o secuencia del patrón; es nulo cuando `accessType` es `NONE`.
- `hasSimCard`: booleano, falso por defecto.
- `hasMemoryCard`: booleano, falso por defecto.

El patrón se persistirá como una secuencia ordenada de posiciones de una cuadrícula 3x3, por ejemplo `1-2-5-8`. La migración será aditiva y asignará `NONE`, `false` y `false` a reparaciones existentes.

## Experiencia de usuario

Agregar una sección compacta debajo de los datos del dispositivo:

1. Un selector visible con `Código/PIN`, `Patrón` y `Sin código`.
2. `Código/PIN` muestra un campo que admite PIN numérico o contraseña alfanumérica.
3. `Patrón` muestra una cuadrícula 3x3 que permite dibujar o seleccionar la secuencia y ofrece una acción para limpiarla.
4. `Sin código` oculta y limpia cualquier credencial previamente ingresada.
5. Dos controles independientes indican `Deja chip/SIM` y `Deja tarjeta de memoria`; ambos empiezan desactivados.

La confirmación final resumirá el tipo de acceso y los accesorios recibidos. Nunca mostrará el valor del código o patrón.

## Componentes y límites

`src/components/repairs/create-form.tsx` supera las 300 líneas. Antes de sumar comportamiento se extraerán:

- Un componente de recepción del equipo responsable del selector de acceso, captura de patrón y accesorios.
- Tipos y validación pura de los datos de recepción, reutilizables por formulario y tests.
- El contenido del diálogo final, si fuera necesario para mantener el formulario principal por debajo del límite establecido.

El formulario principal seguirá coordinando el envío, pero delegará la interfaz y validación específicas.

## Flujo de datos y validación

- El formulario enviará `accessType`, `accessCredential`, `hasSimCard` y `hasMemoryCard` mediante `FormData`.
- `CODE` exige una credencial no vacía después de recortar espacios.
- `PATTERN` exige al menos cuatro posiciones únicas de la cuadrícula.
- `NONE` fuerza `accessCredential` a `null` aunque el cliente haya cambiado desde otro tipo de acceso.
- La Server Action repetirá la validación; no confiará únicamente en el cliente.
- Valores desconocidos o combinaciones inválidas devolverán un error descriptivo sin crear la reparación.

## Seguridad y visibilidad

- El valor de `accessCredential` no se incluirá en tickets impresos, notificaciones, URLs, logs ni seguimiento público.
- Solo las vistas privadas operativas que realmente lo necesiten podrán solicitarlo a la base de datos.
- El resumen de confirmación mostrará únicamente `Código/PIN registrado`, `Patrón registrado` o `Sin código`.
- La presencia de SIM y memoria podrá imprimirse como constancia de accesorios recibidos.

## Impresión y consumo posterior

El comprobante de recepción incorporará un renglón de accesorios con `SIM` y/o `Tarjeta de memoria` cuando correspondan, o `Sin SIM ni memoria` cuando ninguno haya sido declarado. No imprimirá la credencial.

Las vistas técnicas deberán mostrar el tipo de acceso, la credencial cuando corresponda y los accesorios entregados. Si esa visualización requiere tocar un componente grande, se extraerá una tarjeta pequeña de datos de recepción en lugar de agregar lógica al archivo existente.

## Errores y compatibilidad

- Reparaciones existentes se interpretarán como `Sin código`, sin SIM y sin memoria.
- Si falla la validación de recepción, se conservarán los datos completados en el formulario y se marcará la sección correspondiente.
- La migración no modifica estados, precios, fechas, imágenes ni relaciones existentes.

## Pruebas

El desarrollo seguirá TDD:

- Validación de `CODE`, `PATTERN` y `NONE`.
- Limpieza de credenciales al cambiar a `NONE`.
- Serialización estable de patrones.
- Persistencia de los dos indicadores de accesorios.
- Garantía de que la credencial no aparece en el contenido impreso.
- Prueba del formulario para visibilidad condicional y resumen, usando las herramientas de test disponibles en el proyecto.

La verificación final incluirá `npm test`, TypeScript, lint de archivos tocados, `git diff --check`, build y una comprobación del flujo en el navegador local.

## Fuera de alcance

- Cifrado de credenciales a nivel de columna.
- Historial de cambios de credenciales.
- Registro de otros accesorios como cargador, funda o bandeja SIM.
- Rediseño completo del formulario de creación.
