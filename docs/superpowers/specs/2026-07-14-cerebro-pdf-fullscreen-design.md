# Visor PDF fullscreen de Cerebro

## Objetivo

Mostrar cada página técnica citada por Cerebro ocupando toda la ventana para que un técnico pueda inspeccionar un schematic sin abandonar el chat.

## Interacción confirmada

- Al seleccionar una fuente PDF se abre un modal fijo sobre toda la aplicación; no se usa una sheet lateral.
- La cabecera conserva título, marca, modelo, página actual y un botón visible para cerrar.
- La barra de herramientas permite página anterior/siguiente, escribir un número de página, reducir, ampliar y restablecer el zoom.
- El área de trabajo admite desplazamiento horizontal y vertical cuando la página supera el viewport.
- `Escape` cierra el visor y el scroll del documento de fondo queda bloqueado mientras el modal está abierto.
- La página citada se abre inicialmente al 100%; el zoom queda limitado entre 50% y 400%.

## Accesibilidad y errores

El contenedor usa semántica de diálogo modal, nombre accesible, botones con etiquetas y foco inicial en cerrar. Si una página no puede renderizarse, se conserva la navegación y se muestra un error dentro del área de trabajo.

## Alcance

No cambia la API, el formato de fuentes ni el almacenamiento del chat. Se reutiliza el endpoint autenticado que ya devuelve cada página como imagen.
