# Coherencia de la mejora de diagnósticos con Groq

## Problema

Al finalizar una reparación, el técnico puede mejorar su informe con Groq. La mejora actual recibe el informe técnico y el reporte de ingreso, pero el prompt no diferencia con suficiente claridad qué fuente confirma el trabajo realizado. Como resultado, puede convertir una acción como “pegar módulo” en “reemplazar módulo”.

El caso confirmado `MAC1-00001114` ingresó como “Pegar módulo / ingresa con módulo despegado” y terminó guardado como “Se realizó el reemplazo y fijación del módulo. Se observa que el marco se encuentra doblado.” No hay evidencia textual que autorice afirmar un reemplazo.

Una revisión de 25 cierres recientes también encontró expresiones impropias o confusas, como “reemplazo del patrón”, “reemplazo de la cuenta” y una construcción defectuosa sobre un circuito integrado.

## Objetivo

La mejora debe sonar como el informe de un técnico profesional, pero ser breve y comprensible para un cliente sin conocimientos técnicos. Debe mejorar redacción y ortografía sin inventar trabajos, componentes, mediciones, resultados ni conclusiones.

## Fuentes y autoridad

- El texto escrito por el técnico es la única fuente que puede confirmar qué trabajo se realizó.
- El reporte de ingreso del vendedor aporta el pedido original y el estado de recepción. Sirve para detectar contradicciones y orientar el vocabulario, pero no confirma una reparación.
- La marca y el modelo solo contextualizan el equipo. No autorizan inferencias sobre componentes o procedimientos.
- Ante ambigüedad, la salida debe conservar una redacción literal y prudente. No debe completar información probable.

## Diseño

### Construcción del prompt

La ruta de mejora separará explícitamente:

1. El reporte de ingreso del vendedor.
2. El informe original del técnico.
3. Las reglas de transformación.

El prompt indicará que solo se puede profesionalizar el informe técnico y que el reporte de ingreso no describe necesariamente una tarea realizada. Incluirá ejemplos positivos y negativos centrados en acciones frecuentes del taller.

Ejemplo obligatorio:

- Ingreso: “Pegar módulo / ingresa con módulo despegado”.
- Informe técnico: “se pego modulo marco doblado”.
- Salida válida: “Se realizó la fijación del módulo. El marco se encuentra doblado.”
- Salida prohibida: cualquier afirmación de cambio, instalación o reemplazo.

La generación utilizará baja variabilidad para priorizar fidelidad sobre creatividad.

### Control automático de coherencia

Después de la generación, un validador determinista comparará el informe original del técnico con la respuesta. Inicialmente cubrirá familias de acciones de alto impacto semántico:

- cambio, reemplazo, sustitución o instalación;
- reparación o reconstrucción;
- limpieza, baño químico o mantenimiento;
- medición, prueba o diagnóstico confirmado.

Una familia de acciones solo podrá aparecer en la salida si está expresada en el texto original del técnico mediante alguno de sus términos equivalentes. El reporte del vendedor no habilita estas afirmaciones.

Si la respuesta introduce una acción no respaldada, la API la rechazará. La interfaz conservará el texto original y mostrará una advertencia clara para que el técnico lo revise; nunca guardará silenciosamente la respuesta incoherente.

### Lenguaje esperado

- Frases cortas y directas.
- Terminología técnica común del taller, explicada de manera comprensible cuando sea necesario.
- Sin saludos, encabezados, precios, recomendaciones comerciales ni procedimientos no informados.
- Sin cambiar una observación por una acción realizada.
- Sin presentar el pedido del vendedor como resultado confirmado.

## Flujo de datos

1. El técnico escribe su informe y solicita la mejora.
2. La interfaz envía el informe original, el reporte de ingreso, la marca y el modelo.
3. La API valida la sesión y los campos recibidos.
4. Groq genera una versión profesional bajo las reglas de autoridad.
5. El validador compara las acciones de la salida con el informe original.
6. Si la salida es coherente, la interfaz la muestra para revisión y el técnico decide si confirma el cierre.
7. Si la salida agrega acciones, la API devuelve un error controlado y la interfaz mantiene intacto el informe original.

## Manejo de errores

- Una respuesta incoherente no reemplazará el texto del técnico.
- Una indisponibilidad de Groq conservará el comportamiento actual de error recuperable.
- Los mensajes no expondrán prompts, datos sensibles ni claves.
- No se agregarán reintentos automáticos de Groq que puedan agravar límites de cuota.

## Pruebas

Las pruebas unitarias cubrirán, como mínimo:

- `pegar/fijar módulo` no autoriza `reemplazar módulo`;
- `cambiar módulo` sí autoriza una redacción de reemplazo;
- el reporte del vendedor no autoriza por sí solo una acción;
- observaciones como `marco doblado` se conservan sin convertirlas en reparaciones;
- términos equivalentes dentro de cada familia de acciones;
- rechazo de una salida incoherente sin alterar el texto original;
- construcción del prompt con fuentes claramente delimitadas.

La ruta conservará sus pruebas de autenticación, validación, indisponibilidad del modelo y respuesta exitosa.

## Fuera de alcance

- Modificar reparaciones históricas.
- Generar automáticamente un diagnóstico a partir del reporte del vendedor.
- Cambiar el modelo de datos para almacenar dos versiones del informe.
- Auditar cada respuesta mediante una segunda llamada a Groq.
- Rediseñar el modal de cierre técnico.

## Criterios de aceptación

- El caso `MAC1-00001114` nunca produce una afirmación de reemplazo a partir de “pegar/fijar”.
- Ninguna acción de alto impacto aparece sin respaldo en el informe original del técnico.
- La salida conserva el significado y resulta clara para el cliente.
- Ante una alucinación detectada, el texto original permanece visible e intacto.
- Las pruebas de regresión y las verificaciones obligatorias del repositorio pasan.
