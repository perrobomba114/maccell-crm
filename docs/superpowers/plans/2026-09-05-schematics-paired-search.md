# Búsqueda y navegación de esquemáticos

Alcance aprobado por David: implementar apertura conjunta, búsqueda recíproca, índices precargados y completar índices técnicos/semánticos.

## Contratos

- Conservar originales, hashes, estados de revisión y trabajos ajenos.
- No inferir compatibilidad eléctrica de una carpeta. Autoenlace solo por identidad verificada o evidencia del documento que declara el modelo y código/revisión de la placa; enlaces confirmados por administrador quedan asociados a ambos SHA-256.
- Al cambiar equipo retirar el documento anterior incompatible. Un PDF ausente se informa; no se sustituye por otra variante.
- Selección de referencias exacta, común a placa/PDF. Índice local precargado con fallback HTTP, cancelación de respuestas obsoletas y estado parcial visible.
- Indexadores reanudables, concurrencia acotada, errores por archivo y sin duplicar procesos.

## Ejecución

- [x] Baseline: 358 pruebas pasan. Fallo reproducido en producción con 13 Pro Max y PDF anterior.
- [x] Catálogo: ranking por modelo/referencia, tipo documental y alias; pruebas de variantes y orden.
- [x] Parejas: resolver documentos compatibles y preferir esquema principal; validación administrativa persistida y pruebas de hash/aislamiento.
- [x] Visor: limpiar contrapartes incompatibles, sincronizar selección manual y clic, precargar referencias.
- [ ] Indexadores: procesar pendientes técnicos y semánticos de forma reanudable; comprobar cobertura real.
- [x] Localizar/importar PDF real del 13 Pro Max si está disponible en las fuentes autorizadas.
- [ ] Revisión, TypeScript, ESLint, diff-check, tests, build y navegador.
- [ ] Publicar cambios autorizados y comprobar deploy terminal mediante dokploy_maccell; verificar índices y navegación reales.

La skill de ejecución recomienda agentes: el trabajo del indexador y el inventario de fuentes se delegan con archivos separados. Navegación y catálogo se implementan en esta tarea.

## Verificación previa a publicación

- 391/391 pruebas; TypeScript, ESLint de archivos modificados y diff check correctos. El detector textual del script de seguridad confunde `AbortSignal.any` con un tipo `any`; los temporizadores detectados pertenecen al proceso simulado de una prueba, no a la aplicación.
- PDF real: 132 páginas indexadas, cero fallos. Prueba Chrome: placa abre automáticamente su PDF, U4400 salta a página 2 y R4451 seleccionado desde el PDF centra la placa. Restauración conserva página y referencia.
- Build local intentado: bloqueo externo UNABLE_TO_GET_ISSUER_CERT_LOCALLY al descargar Google Fonts. La compilación del despliegue debe verificarse antes del cierre.
- Cobertura completa de producción y RAG aún pendiente de verificar.
