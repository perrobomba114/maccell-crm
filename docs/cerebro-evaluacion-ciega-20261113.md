# Evaluación de Cerebro con reparaciones entregadas · 13 de noviembre

Se seleccionaron ocho motivos distintos entre los últimos 70 tickets entregados con diagnóstico escrito y vocabulario de verificación. Se excluyeron ingresos que ya pedían explícitamente cambiar una pieza. Se conservaron tres tickets adicionales para una segunda pasada. La muestra intencional mide problemas del recorrido de banco y no estima la precisión para todo el taller.

Cerebro recibió marca, modelo y motivo de recepción. Se omitieron diagnóstico, texto enriquecido, imágenes, observaciones posteriores e historial. El número del ticket se usó para excluir su antecedente y la nueva versión también excluye la identidad de la reparación en PostgreSQL. El cotejo leyó el diagnóstico escrito después de obtener las respuestas. Las pruebas no modificaron reparaciones ni crearon chats comerciales.

| Ticket | Qué registró el técnico | Qué hizo Cerebro tras la corrección |
| --- | --- | --- |
| MAC2-00002559 · XR | Batería desconectada. El bloqueo impidió verificar el reinicio informado. | Reconoció el logo y preguntó por el patrón del reinicio. No identificó la batería. |
| MAC2-00002550 · One Fusion | Cambio de módulo, equipo funcionando. | Propuso seguir la zona sin respuesta al girar la interfaz. La prueba orienta, no confirma el módulo. |
| MAC2-00002542 · A06 | Antenas conectadas correctamente. El técnico atribuyó la falla a la placa. | Separó detección de SIM de registro en red. No localizó una avería de placa. |
| MAC2-00002437 · Edge 30 | Altavoz correctamente conectado. El cierre no documenta recuperación del audio. | Propuso reproducir audio local con otras salidas desactivadas. |
| MAC2-00002239 · A12 | Pantalla con imagen correcta. El técnico identificó falla de placa. | Preguntó por actividad del equipo. El primer paso no distingue por sí solo pantalla y placa. |
| MAC2-00002345 · G56 | Batería reactivada y funcionamiento correcto. | Preguntó por actividad. No identificó la batería. |
| MAC2-00002321 · iPhone 13 | Mantenimiento, chasis reemplazado y calentamiento observado. El cierre informa funcionamiento correcto. | Empezó por el patrón táctil y dejó el botón de volumen pendiente. |
| MAC2-00002481 · iPhone 11 | Prueba con batería y módulo sin imagen ni arranque. Diagnóstico de placa lógica. | Empezó por descartar accesorios de carga. No identificó la causa. |
| MAC1-00001645 · A13 | Retiraron el templado. El equipo respondió y el técnico registró daño en el sensor. | En la primera pasada pidió contexto genérico. Tras la corrección pidió probar ambas transiciones del sensor durante una llamada. |
| MAC1-00001582 · A15 | Cambio de módulo y funcionamiento correcto. | Preguntó por actividad. Sin diagnóstico de componente. |
| MAC2-00002424 · A02 | Cambio de módulo y funcionamiento correcto. | Pidió unidad, instrumento y condición de la lectura informada. |

En la primera vuelta, cuatro de los ocho ingresos recibieron una pregunta genérica por fallo del proveedor. En el XR se perdió el logo como dato de recepción. Al repetir esos ocho ingresos, todos devolvieron una comprobación concreta por protocolo. En las preguntas abiertas también se observaron antecedentes del mismo modelo pero de otro síntoma, y una propuesta que confundía prueba de imagen con prueba táctil. Se corrigieron el filtrado y la validación. Los resultados repetidos sobre los casos corregidos son regresiones, no una validación independiente.

Se revisaron las respuestas por afirmación y se cotejó lo que fue comprobado, lo que solo quedó informado y lo que quedó sin verificar. Referencias metodológicas: [RAGChecker](https://arxiv.org/abs/2408.08067) y [evaluaciones de agentes de Anthropic](https://www.anthropic.com/research/demystifying-evals-for-ai-agents).

En una repetición final con preguntas abiertas sobre táctil, señal y altavoz, Groq respondió la de táctil. Para señal y altavoz se activó el protocolo de banco y se informó la indisponibilidad del proveedor. Esta muestra no demuestra resolución autónoma de las reparaciones. La presentación del paso vigente y el acceso al historial se probaron en Chrome con una sesión simulada.
