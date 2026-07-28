# Patrón direccional para el ingreso de reparaciones

## Objetivo

Hacer que la cuadrícula de desbloqueo sea legible antes y después de marcar puntos, y mostrar sin ambigüedad el orden y la dirección del patrón ingresado.

## Diseño visual

- La cuadrícula conserva el tono ámbar de la sección Recepción.
- Cada punto vacío muestra un aro ámbar visible y un indicador central, incluso sin selección.
- Cada punto seleccionado usa fondo ámbar sólido, borde claro y el número de orden dentro del círculo.
- Cada par consecutivo de puntos se conecta mediante una línea ámbar con halo oscuro.
- La línea termina en una flecha antes del punto de destino para indicar la dirección sin tapar el número.
- Las conexiones se dibujan debajo de los botones para conservar la interacción y el foco accesible.

## Comportamiento

- Se mantiene la selección mediante toque, clic o arrastre.
- Un punto ya seleccionado no se repite.
- Las flechas se actualizan inmediatamente al agregar cada punto.
- `Limpiar` elimina puntos, líneas y flechas.
- El valor persistido conserva el formato existente; no requiere cambios de base de datos ni del servidor.

## Implementación

- El trazado se realizará con un SVG superpuesto dentro del tablero.
- Las coordenadas de los nueve puntos serán constantes y corresponderán a una cuadrícula de 3 × 3.
- Los extremos de cada segmento se recortarán al borde de los círculos para que la flecha no atraviese los puntos.
- La lógica geométrica se mantendrá separada del JSX principal mediante funciones puras y constantes nombradas.
- El componente seguirá por debajo del límite de 300 líneas; si el resultado lo supera, el tablero se extraerá a un componente dedicado.

## Accesibilidad y adaptación

- Cada punto conserva su nombre accesible y añade la posición seleccionada.
- El SVG será decorativo y no interceptará eventos del puntero.
- El tablero conservará un tamaño táctil mínimo de 44 px por punto.
- En móvil se centrará; en escritorio permanecerá alineado a la derecha dentro del panel compacto.

## Verificación

- Revisión visual con patrón vacío y con recorridos horizontales, verticales y diagonales.
- Validación de TypeScript, lint de archivos modificados, `git diff --check` y build de producción.
- No se crearán ni ejecutarán tests automatizados por indicación del usuario.

