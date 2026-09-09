# Auditoría de Cerebro AI y propuesta de mejora

Fecha: 9 de septiembre de 2026. Código analizado: `5ee8944`.

## Conclusión

Cerebro tiene elementos aprovechables —reparación vinculada, búsqueda híbrida, biblioteca PDF/PCBE, citas y preguntas guiadas—, pero el flujo actual no constituye un proceso de diagnóstico consistente. Recupera fragmentos, redacta una recomendación y agrega preguntas independientes. La pertinencia de un antecedente, su resultado técnico, la procedencia de una medición y el progreso del diagnóstico no están controlados de extremo a extremo.

La prioridad es corregir selección y clasificación de evidencia, identidad del dispositivo y continuidad del razonamiento. Cambiar únicamente el modelo o el aspecto visual no resuelve las fallas reproducidas.

El objetivo operativo debe ser asistir cualquier modelo identificable, utilizar documentación exacta cuando exista y explicitar lo que falta. No es posible prometer que cualquier teléfono será reparable. Sí se puede exigir que cada paso sea justificable, conserve mediciones y descarte hipótesis de manera consistente.

## Alcance y límites de la evidencia

- Capturas proporcionadas por David.
- Lectura del chat real en `sistema.maccell.com.ar/technician/cerebro`, ticket **MAC1-00001340**, Motorola E7. Se verificó el mismo contenido de las capturas.
- Consulta de historial de producción con la sesión técnica existente y apertura de dos tickets E7. El historial visible está limitado a esa sesión; no constituye inventario de todas las reparaciones de la empresa.
- Inspección de API de chat, recuperación RAG/biblioteca, prompts, validación, normalización, UI, aprendizaje, worker de reparaciones y evaluación.
- Consultas SQL exclusivamente de lectura sobre `localhost:5434/maccell_db`, servido por Docker local. Esta base es auxiliar: sus cantidades no se presentan como cantidades de producción.
- Dokploy MACCELL informó aplicación `done`, con el despliegue titulado `fix(cerebro): restaurar consulta de biblioteca técnica`. Esto no prueba calidad del diagnóstico.
- La pantalla de producción mostró **Servicio degradado**. El MCP de logs devolvió HTTP 500 y la navegación al endpoint de salud fue bloqueada por el cliente del navegador. No se pudo determinar en esta auditoría qué dependencia origina ese indicador.
- No se alteraron reparaciones, chats, índices, configuración ni despliegues. El único archivo agregado es este informe.

## Lo que ocurre con el E7

### 1. El antecedente mostrado no documenta una solución exitosa

La tarjeta de **MAC1-00000241** muestra, en la página de producción:

> DIAGNOSTICO: No se dispone de repuestos necesarios para efectuar la reparación requerida.
> SOLUCION: Reparación tomada por técnico.

La captura además muestra una marca verde; el componente actual dibuja esa marca cuando la autoridad es `CONFIRMED_SUCCESS`. El contenido visible no respalda esa clasificación. No debe confundirse una semejanza de ingreso —apagado, módulo trizado, carga 0.6— con un antecedente de reparación confirmada.

El código actual del worker ya exige autoridad de cierre estructurado para confirmar éxito. La discrepancia con la tarjeta sugiere revisar documentos históricos, versión del worker y reclasificación pendiente; no se verificó cuál de esas causas explica el registro de producción. Modificar el clasificador no actualiza por sí solo documentos antiguos.

### 2. Existen antecedentes E7 que merecen ser comparados

Verificados en el historial de producción:

| Ticket | Ingreso / problema | Informe y resultado visibles | Uso correcto |
|---|---|---|---|
| MAC2-00001619 | E7; cambio de módulo; ingresó apagado | Reemplazo de módulo y pin de carga; equipo mojado. Historial: No Reparado, reapertura, Finalizado OK, Entregado | Antecedente de intervención documentada. Hay diferencias relevantes y faltan mediciones para atribuir una causa única |
| MAC1-00000140 | E7; batería hinchada; no enciende; carga lenta | “Cambio de bateria ok , huella cortada”; Entregado; sin una secuencia completa de cierre técnico | Antecedente con resultado declarado en nota. Puede orientar una comprobación, no demostrar que el E7 actual tiene la misma falla |
| MAC2-00001398 | E7; no carga y no enciende | Historial listado: Entregado, previo No Reparado | No ofrecer como solución exitosa |
| MAC3-00000190 | E7; no enciende, carga muy débil | Historial listado: Entregado, previo No Reparado | No ofrecer como solución exitosa |

No basta filtrar por estado actual 5/6/10. Un equipo puede entregarse sin reparación. Tampoco sirve excluir todo ticket que alguna vez pasó por No Reparado: MAC2-00001619 fue reabierto y después finalizó OK. Se necesita el resultado del último ciclo técnico y su respaldo documental.

### 3. “0.6” se transforma en una medición que nadie informó

El ingreso dice “recibe carga 0.6”; la respuesta afirma “carga de 0.6 V”. No se conocen unidad, instrumento, punto ni condición de esa observación.

La página 4 recuperada contiene `Vout = 0.6V x (1+R518/R519)`. El validador actual admite cualquier valor/unidad que encuentre en cualquiera de los documentos. Reproduje que permite la frase incorrecta porque existe `0.6V` en esa fórmula. Esto prueba la debilidad del guard; no permite reconstruir con certeza el razonamiento interno del modelo.

### 4. Dos próximos pasos diferentes

La respuesta pide medir PWRKEY, mientras los botones preguntan consumo en fuente. Se construyen por separado. El técnico recibe dos instrucciones con apariencia de ser la siguiente acción.

Además, `PWRKEY[4]` se trata como pin físico sin mostrar conector y numeración verificados. El texto extraído no basta para determinar si `[4]` es una referencia entre hojas. La interpretación debe verificarse visualmente antes de presentar un punto de prueba.

Observar un cambio de nivel en un punto tampoco demuestra por sí solo que llega correctamente al destino ni que el pulsador sea la única causa si no cambia. Esas conclusiones exceden la medición descrita.

## Hallazgos técnicos

### A. Recuperación y contexto

1. **Los cupos desplazan casos anteriores.** `retrieval.ts:275` reserva la mitad para PDF; `resilient-retrieval.ts:21` vuelve a reservar biblioteca y recorta la lista anterior. La corrección de preservación rescata solo el primer REPAIR. Una prueba con cuatro casos disponibles terminó en siete PDF y una reparación. No es un máximo universal de un caso, pero sí una combinación reproducible que explica el patrón observado.

2. **Falta pertinencia específica para “no enciende”.** `retrieval.ts:175` tiene filtros particulares para reinicios y RF, pero deja pasar los otros casos sin exigir coincidencia del síntoma técnico y de una intervención útil. “Ingresó apagado” puede dominar aunque el ticket sea administrativo o de display.

3. **Rango semántico no equivale a evidencia suficiente.** El ranking usa posiciones y bonos por modelo, documento y subsistema. No hay un filtro general de relevancia mínima para la decisión diagnóstica. Una página que menciona POWER puede competir aunque sea de RF o sensores.

4. **El contexto se corta por caracteres.** `prompt.ts:41` reparte 8.000 caracteres entre las fuentes; con ocho, cada fuente recibe como máximo 1.000. Los cierres estructurados están al final del contenido de reparaciones y pueden quedar truncados. Se conserva el ingreso y se pierde el resultado que permitiría interpretar el antecedente.

5. **Las tarjetas muestran el comienzo del texto.** `message-content.ts:56` reduce cada fuente a 260 caracteres; `cerebro-v2-sources.tsx` muestra dos líneas. No hay síntoma, causa, intervención, verificación y motivo de relevancia separados. Se muestran todas las fuentes recuperadas aunque el texto solo utilice E1.

6. **La wiki no participa en esta ruta.** Aunque forma parte del discurso general de Cerebro, `retrieval.ts` admite REPAIR/PDF y la biblioteca añade BOARD. Si se pretende usar conocimiento revisado de la wiki hay que incorporarlo con procedencia y control de calidad, o dejar de prometerlo en esta ruta.

### B. Identidad, razonamiento y mediciones

7. **La biblioteca permite mezclar variantes.** `library-retrieval.ts:82` acepta coincidencias por subcadena. Una prueba devolvió un documento `MOTO E7 PLUS` para `MOTO E7`; al construir la fuente se lo etiqueta con el modelo solicitado. Es una falla reproducida con datos sintéticos, no una afirmación de que las capturas usaron un esquema E7 Plus. Se pierde precisamente la diferencia que el prompt necesitaría detectar.

8. **Hay reglas específicas de plataforma sin guard suficiente.** `guided-diagnosis.ts:46` pide panic de iOS ante reinicios sin recibir marca/plataforma. Reproduje ese resultado para “Motorola E7 se reinicia”. `diagnostic-planner.ts` también expande términos de plataforma y designadores fijos para consultas genéricas; deben depender de identidad y evidencia.

9. **No hay un estado diagnóstico consolidado.** Se guardan mensajes y algunas respuestas guiadas, pero el generador recibe los últimos ocho mensajes (`chat/route.ts:59`). La búsqueda se arma con ingreso, último texto, observaciones CRM y opción actual; no con el conjunto de mediciones anteriores del chat. Esto permite repetir pruebas, recuperar fuentes inadecuadas después de varios pasos o perder descartes antiguos.

10. **El validador verifica presencia, no significado.** `grounding.ts:8` no vincula valor con equipo, circuito, punto, unidad, instrumento, condición, fuente y afirmación. Tampoco valida pines, inferencias causales, uso correcto de cada cita o contradicción entre texto y botones. Puede borrar una medición real del técnico si no figura en un PDF.

11. **El prompt combina exceso de restricciones con ejemplos específicos.** Prohíbe nombrar conceptos fuera del texto recuperado y a la vez introduce topologías y ejemplos de determinados modelos. Debe separar procedimiento general revisado, documentación exacta, conocimiento orientativo y hechos medidos. Una prueba reversible de periférico no debería depender de reunir dos casos históricos de display.

12. **La visión no cubre la nueva biblioteca por esta ruta.** `visual-evidence.ts:10` excluye fuentes con `workbenchUrl`, incluso PDF. La extracción de etiquetas de texto no preserva topología, pines ni ramas de un diagrama. Los hechos visuales además se agregan como texto sin una asociación estructurada completa a cada afirmación. Se necesita validar página/crop y mantener procedencia, sin inferir conexiones desde proximidad visual.

### C. Calidad y aprendizaje

13. **El filtro de utilidad es demasiado débil.** `repairs.py:150` considera útil cualquier candidato sanitizado de al menos 12 caracteres. “Cliente no autoriza” o “no hay repuestos” no son una solución técnica. El contenido aún incluye ingreso completo y un SOLUCION formado a partir de observaciones filtradas por patrones.

14. **Clasificación antigua puede persistir.** `repair_indexer.py:60` omite documentos READY con el mismo hash del contenido. Cambiar reglas de clasificación, estados previos o política de calidad no garantiza modificar ese hash. Hace falta versión de política, reprocesamiento controlado e invalidación del índice correspondiente. No eliminar historial operativo.

15. **El cierre estructurado existe en backend pero no aparece integrado al técnico.** Hay `RepairLearningRecord` y endpoints de closure/review; la búsqueda de consumidores en componentes y flujos de técnico no encontró una interfaz para completar ese cierre. La tabla local consultada estaba vacía; su cantidad en producción no fue verificada. No se puede afirmar que el taller esté alimentando este circuito de aprendizaje.

### D. Experiencia y comprobación

16. **La tarjeta de reparación no abre el antecedente.** Reproducido en producción. `cerebro-v2-shell.tsx:112` solo renderiza visor para fuentes PDF. La fuente REPAIR se selecciona, pero no tiene vista de detalle.

17. **“Servicio degradado” no informa el alcance.** La pantalla lo muestra sin aclarar qué capacidad falta en ese diagnóstico. `health.ts` mezcla salud de biblioteca, worker y existencia de configuración; la comprobación de visión no sigue todas las alternativas que realmente usa el generador. El estado debería describir consecuencias concretas: por ejemplo, búsqueda histórica no disponible o PDF visible sin análisis visual.

18. **Las pruebas no representan el trabajo de banco.** Los 42 tests enfocados ejecutados pasaron y, aun así, las cuatro pruebas de falla dieron los resultados incorrectos descritos. El test denominado technician-golden revisa un prompt, no una sesión real. `scripts/cerebro-v2-evaluate.ts` usa recuperación, orden de proveedores, tratamiento de imágenes y límite de salida diferentes de la API real; no reproduce fielmente el recorrido de producción.

## Enfoques considerados

| Enfoque | Ventaja | Límite |
|---|---|---|
| Ajustar prompt y aumentar cantidad de fuentes | Cambio pequeño | Conserva selección débil, fuentes mal clasificadas y dos próximos pasos |
| Cambiar modelo o entrenar uno con todo el historial | Puede mejorar redacción o razonamiento | No corrige documentos desplazados, etiquetas falsas ni falta de cierres; puede aprender errores |
| Reconstruir el flujo diagnóstico sobre los módulos existentes | Ataca causas observadas y conserva biblioteca/CRM | Requiere cambios coordinados, migración de calidad y validación real |

Recomendación: tercer enfoque, por etapas verificables. Comparar modelos después con el mismo conjunto de evidencia y casos; decidir por utilidad, latencia y costo medidos.

## Diseño propuesto

### 1. Expediente diagnóstico persistente por reparación

Mantener identidad confirmada —marca, modelo, variante, placa y revisión cuando estén disponibles—; síntoma de ingreso; síntomas confirmados en banco; antecedentes de golpe/líquido/intervención; pruebas realizadas; mediciones y descartes.

Cada medición debe registrar valor, unidad, instrumento, punto, condición, origen y fecha. “0.6” permanece como observación ambigua hasta aclararse. El sistema conserva también resultados negativos y pruebas ya realizadas, aunque el chat tenga muchas rondas.

Distinguir: comunicado por cliente/vendedor, observado por técnico, dato documental, caso histórico e hipótesis. Una afirmación de la IA nunca se convierte por sí sola en evidencia del equipo.

### 2. Búsquedas separadas antes de combinar evidencia

- Casos del taller: mismo modelo/variante compatible, síntoma comparable y resultado técnico, con filtros de calidad y trazabilidad.
- Manuales de servicio y casos documentados: procedimiento pertinente al síntoma y a la etapa actual.
- Esquema/PCBE: circuito y punto requeridos para la comprobación elegida.

Normalizar “no enciende”, “no prende”, “muerto” e “ingresa apagado” sin tratarlos como equivalentes confirmados. “Ingresó apagado” es contexto; no demuestra ausencia de arranque.

Recuperar candidatos y volver a ordenarlos por pertinencia al caso completo. Los fragmentos necesitan encabezados de contexto verificables; no inventar contexto faltante mediante resúmenes. La recuperación contextual y el reranking son técnicas documentadas por [Anthropic](https://www.anthropic.com/engineering/contextual-retrieval); su ganancia en MACCELL debe medirse con datos propios.

Mostrar hasta tres antecedentes pertinentes por defecto, si existen; botón “Ver más antecedentes”. No rellenar con casos irrelevantes para completar cupo. Separar coincidencia exacta, procedimiento general y ausencia de evidencia exacta. El ranking no debe presentarse como probabilidad de falla.

Deduplicar por fuente, versión y página entre ambas bibliotecas. Reservar presupuesto de contexto para síntoma confirmado, intervención y verificación de los casos; después agregar extractos documentales de la comprobación actual.

### 3. Calidad histórica sin borrar información

Derivar el resultado del último ciclo de reparación. Una entrega o factura no confirma éxito técnico. Conservar por separado el cierre administrativo.

Categorías útiles para el técnico: solución verificada; intervención con resultado declarado pero documentación incompleta; diagnóstico no confirmado; sin intervención por falta de autorización/repuestos; no reparado. Los dos últimos no alimentan el índice de soluciones exitosas.

Reprocesar el índice existente con versión de política y conservar originales. No inventar mediciones al destilar tickets antiguos. Registrar por qué se incluyó, degradó o excluyó cada antecedente. Las soluciones de modelos distintos no se transfieren por parecido del nombre.

### 4. Un único plan para texto, botones y búsqueda

El motor produce una decisión estructurada: etapa, incertidumbre que intenta resolver, comprobación actual, prerrequisitos, fuente, punto o prueba funcional, condiciones y resultados admitidos. De esa decisión salen la explicación y los controles de respuesta.

El técnico ve un recorrido estable: confirmar síntoma → descartar causas periféricas pertinentes → caracterizar alimentación/arranque cuando corresponda → localizar circuito → medir → intervenir con justificación → verificar reparación.

No es una secuencia eléctrica universal. El manual y la condición observada determinan las ramas; deben admitirse resultados inesperados, inconclusos y “no tengo ese instrumento”. El objetivo es una comprobación actual clara y un panorama breve de lo ya descartado.

Validar plataforma, contradicciones con mediciones previas y fundamento de valores/pines antes de mostrar la respuesta. La presencia literal de `0.6V` en una fuente no autoriza aplicarlo a otra línea ni atribuirlo al técnico.

### 5. Vista pensada para trabajo de banco

Orden recomendado de la pantalla:

1. Equipo, síntoma confirmado y etapa actual en una cabecera compacta.
2. **Qué comprobar ahora**: una tarjeta principal con motivo, preparación, instrumento si corresponde, ubicación y entrada de resultado.
3. **Casos parecidos del taller**: síntoma, trabajo realizado, resultado, diferencias y ticket que abre un detalle técnico autorizado.
4. **Qué sabemos / qué falta**: mediciones y descartes persistentes, corregibles por el técnico.
5. Documentación utilizada, con página/componente y resumen de qué respalda; resto de fuentes bajo expansión.

Evitar repetir el ingreso entero y ocho tarjetas grandes en cada turno. Mantener el chat para observaciones libres, imágenes y explicaciones, con el expediente accesible. El Workbench debe abrir exactamente la página/punto documentado y permitir volver al diagnóstico sin perder contexto.

### 6. Aprendizaje al cerrar el trabajo

Integrar el cierre existente al flujo de finalizar reparación. Preparar un borrador a partir de mediciones y acciones registradas; el técnico confirma síntoma, causa cuando esté demostrada, intervención y prueba final. Admitir causas no determinadas sin inventarlas.

La verificación debe ser específica de la falla y del equipo; no basta “OK” genérico. Reingresos y garantías deben permitir revisar la confianza del caso previo. Revisar los cierres antes de destinarlos a entrenamiento; evaluar primero recuperación y calidad de datos.

## Orden de implementación y aceptación

| Etapa | Entrega | Condición para darla por terminada |
|---|---|---|
| 1. Integridad de evidencia | Unidades/procedencia, variantes exactas, plataforma, clasificación histórica | No aceptar E7 Plus como E7; no pedir panic iOS a Motorola; no aceptar una nota administrativa como solución; no derivar 0.6 V de “carga 0.6” |
| 2. Historial útil | Búsqueda de casos independiente, resumen técnico, detalle que abre, índice reprocesado | Los antecedentes elegibles conocidos del E7 aparecen y explican diferencias; exclusiones tienen motivo; auditoría de frescura en producción |
| 3. Diagnóstico continuo | Expediente persistente y plan único | Texto y botones coinciden; conserva pruebas después de más de ocho mensajes y al reabrir; admite observaciones contradictorias |
| 4. Documentos accionables | Recuperación por etapa y evidencia visual con procedencia | Página, designador y prueba corresponden al modelo/placa; no se confunde referencia de hoja con pin; sin geometría inventada |
| 5. Cierre y aprendizaje | Interfaz de cierre, revisión y reingresos | Un cierre real confirmado llega al índice y luego se recupera como caso con su prueba final |
| 6. Validación con técnicos | Evaluador común a producción y sesiones reales | Mejora comprobada en utilidad de próximos pasos, tiempo de diagnóstico y calidad de resultados; sin mezclar fallas de modelo, datos y servicio |

Propuesta de evaluación inicial: conjunto revisado de 30–50 casos que cubra marcas, variantes y fallas de encendido, carga, display, reinicios, RF, audio y líquido. Reservar casos no usados para ajustar reglas. Cuando se evalúa un caso histórico como consulta, excluir ese mismo ticket y sus duplicados para evitar que la prueba revele su propia solución.

Medir recuperación de antecedentes correctos dentro de los primeros resultados; proporción de citas realmente usadas y verificables; consistencia del siguiente paso; retención de mediciones; repeticiones innecesarias; latencia/errores; y evaluación del técnico de si la comprobación permite avanzar. Las tasas reales de reparación deben considerar dificultad y disponibilidad de repuestos, no atribuirse automáticamente a la IA.

## Ejemplo de respuesta mejorada para esta consulta

Este es un ejemplo de presentación, no un diagnóstico confirmado ni una respuesta ya implementada:

> **Motorola E7 · no enciende**
>
> El ingreso indica “recibe carga 0.6”, pero todavía no sabemos la unidad ni dónde se midió. No alcanza para atribuir la falla al botón o al PMIC.
>
> **Antecedentes para comparar**
> - MAC1-00000140: no encendía y presentaba batería hinchada; la nota informa cambio de batería OK. Falta comprobar si tu equipo presenta esa condición.
> - MAC2-00001619: ingresó apagado; se documentó cambio de módulo y pin de carga. También estaba mojado; no demuestra que la causa del equipo actual sea la misma.
>
> **Primero aclaremos la medición existente:** ese “0.6”, ¿se leyó en un medidor USB, en la fuente de banco o en el multímetro? Indicá unidad y si fue antes o durante el intento de encendido.
>
> Con esa información se elige una sola comprobación siguiente y se registra su resultado.

Después debe diferenciarse ausencia de encendido de ausencia de imagen y usarse lo que el técnico ya comprobó. Si el técnico aporta de entrada una medición completa, no corresponde volver a preguntarla.

## Verificación realizada

- 42 tests enfocados existentes: **pasan**.
- Cuatro reproducciones aisladas con datos sintéticos: confirmaron fallas de procedencia numérica, guard de plataforma, distribución de evidencia y mezcla de variantes.
- Navegador de producción: diagnóstico E7 y antecedente sin solución verificados; tarjeta REPAIR no abre detalle; historial y dos informes E7 consultados.
- SQL local: consultas en modo de solo lectura; no se usaron cantidades locales como inventario de producción.
- TypeScript, lint y build: no ejecutados porque no se modificó código. `git diff --check`: pasa.
- Pendientes de verificación operacional: cantidad y autoridad de casos en RAG productivo, versión efectiva del worker, frescura de sincronización y causa del indicador de degradación.

La implementación no forma parte de esta entrega de análisis. Ningún hallazgo se marca como corregido.
