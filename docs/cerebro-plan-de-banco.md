# Cerebro en el banco de MACCELL

El resultado que buscamos es que un técnico pueda decidir qué comprobar, interpretar el resultado y volver al mismo ticket sin perder el hilo. La cantidad de documentos indexados no mide ese resultado.

## Circuito implementado en el chat

1. Abrir una reparación asignada y usar el síntoma del ticket o escribir la pregunta del técnico.
2. Para un síntoma inicial de carga, encendido, SIM o reinicios, recoger la observación que separa dos escenarios. Una lectura ambigua se aclara antes de interpretarla. Una respuesta nueva incorpora el resultado previo.
3. Para consultas funcionales abiertas, buscar antecedentes del mismo modelo. Para una consulta de circuito, recuperar documentación. Una consulta directa por la ubicación de un designador puede abrir el componente del boardview con marca y modelo comprobados.
4. Validar la decisión antes de mostrarla. Cuando falla el proveedor o falta evidencia, registrar la limitación y mantener la observación humana.
5. Al finalizar, usar el cierre técnico existente para registrar intervención y verificación. Un diagnóstico generado no se convierte en un caso resuelto por sí mismo.

## Validación con el taller pendiente

| Etapa | Trabajo | Evidencia de salida |
| --- | --- | --- |
| Línea de base | Tomar tickets recientes de fallas distintas. Un técnico señala la pregunta que necesitaba responder, qué había probado y qué resultado le permitió avanzar. Reservar algunos tickets para evaluación final. | Casos anonimizados con resultado esperado y procedencia. |
| Evaluación a ciegas | Comparar la respuesta actual y la candidata para el mismo estado del ticket, sin mostrar versión. Marcar si responde la pregunta, repite trabajo, inventa un dato o aporta una decisión comprobable. | Recuento por síntoma y ejemplos de desacuerdo revisados por técnicos. |
| Esquemáticos | En placas que el taller tenga a mano, abrir el enlace, contrastar revisión y componente y registrar referencias ausentes o erróneas. | Cada ubicación mostrada en la muestra lleva al componente de la variante correcta. |
| Piloto | Observar el uso durante reparaciones reales y registrar tiempo hasta la primera acción útil, consultas abandonadas y si el técnico volvió a usarlo. Comparar con la línea de base. | Resultados del taller por caso y decisión de ampliar, corregir o retirar cada flujo. |
| Aprendizaje | Incorporar solo cierres con resultado comprobado al conjunto de evaluación. Reejecutar conversaciones con proveedor disponible, caído y con evidencia contradictoria. | Ningún pin, medición, ubicación o causa inventada en el conjunto revisado. |

Una prueba automática puede descartar una regresión específica. La aceptación del diagnóstico queda a cargo de quien trabaja sobre la placa.
