# Diseño: skill `auditar-garantias-maccell`

## Objetivo

Crear una skill local y versionada para investigar garantías de MACCELL con rapidez, datos de producción y consultas de solo lectura. Debe producir tanto resúmenes operativos como detalle individual sin exponer credenciales ni modificar infraestructura o registros.

## Ubicación y estructura

Crear la skill en `.agents/skills/auditar-garantias-maccell/` con:

- `SKILL.md`: disparadores, flujo obligatorio, criterios de atribución y formato de entrega.
- `agents/openai.yaml`: nombre visible, descripción corta y prompt sugerido.
- `scripts/auditar-garantias.sql`: consulta parametrizada para resumen y detalle.
- `scripts/validar-consulta.sh`: validación estática del SQL y ejecución opcional en una conexión provista por el entorno, sin credenciales embebidas.

No crear README, changelog ni archivos auxiliares que dupliquen instrucciones.

## Alcance funcional

La skill debe aceptar o inferir razonablemente:

- Fecha inicial y final, interpretadas en `America/Argentina/Buenos_Aires`.
- Técnico, sucursal, estado o ticket opcionales.
- Criterio de atribución:
  - `asignado`: garantía contada al `assignedUserId` de la garantía.
  - `original`: garantía atribuida al técnico asignado en `originalRepairId`.
  - `ambos`: presentar ambos criterios y sus diferencias; será el valor recomendado.
- Salida resumida, detalle completo o CSV.

El informe debe incluir:

- Cantidad de reparaciones y garantías.
- Tasa de garantía con numerador y denominador explícitos.
- Participación por técnico.
- Estados actuales y advertencia de que pueden cambiar luego del corte.
- Distribución por sucursal y por mes.
- Precio estimado total y promedio, claramente distinguido del importe cobrado.
- Ticket, fechas, técnico asignado, técnico original, sucursal, equipo, problema, diagnóstico, estado, reparación original y precio estimado.
- Garantías sin `originalRepairId`, referencias originales inexistentes y cambios de técnico entre reparación original y garantía.

## Acceso y seguridad

1. Usar el MCP `dokploy_maccell` para identificar el proyecto `MACCELL CRM`, la aplicación y el PostgreSQL operativo. No confundirlo con la base RAG ni con Supabase.
2. Consultar el PostgreSQL operativo dentro del contenedor identificado por Dokploy mediante el acceso remoto ya configurado en el entorno.
3. Ejecutar siempre dentro de `BEGIN READ ONLY`, con `statement_timeout`, `lock_timeout`, `ON_ERROR_STOP` y `ROLLBACK`.
4. No abrir puertos, crear backups, schedules, deployments ni modificar configuración para obtener acceso.
5. No guardar ni imprimir passwords, claves API, certificados, tokens o cadenas de conexión.
6. Si no existe acceso remoto seguro, detener la consulta y explicar el bloqueo; no sustituir silenciosamente la base por Supabase, una copia local o RAG.

## Fechas y consistencia

Los campos `timestamp without time zone` de Prisma se tratarán como UTC. Para un rango local inclusivo `[desde, hasta]`, convertir los límites a UTC y usar intervalo semiabierto:

```text
createdAt >= desde_local convertido a UTC
createdAt < día posterior a hasta_local convertido a UTC
```

La agrupación mensual se hará sobre la fecha convertida a Argentina. El resultado debe informar la hora de corte y señalar reparaciones cuyo estado haya cambiado después de un informe comparado.

## Modelo de datos

Tablas centrales:

- `repairs`: garantía, reparación original, asignación, estado, sucursal, fechas y precio estimado.
- `users`: técnicos.
- `branches`: sucursales.
- `repair_statuses`: nombres actuales de estados; no usar números mágicos para presentar resultados.
- `repair_status_history`: reconstrucción de cambios posteriores al corte cuando se compara un informe histórico.

La consulta debe detectar el esquema en producción y fallar de forma descriptiva si falta una columna requerida.

## Formato de respuesta

Responder primero con el veredicto o hallazgo principal. Después presentar:

1. Resumen general.
2. Comparación de atribución asignada vs. original cuando corresponda.
3. Estados, sucursales y meses.
4. Anomalías y limitaciones.
5. Ruta del CSV si fue solicitado y generado.

No incluir datos personales innecesarios. Mostrar clientes únicamente cuando el usuario pida detalle individual y tenga autorización para consultarlo.

## Manejo de errores

- Base equivocada: detenerse y mostrar qué recurso de Dokploy no coincide.
- Rango inválido: pedir o normalizar las fechas antes de consultar.
- Técnico ambiguo: listar coincidencias sin ejecutar un informe atribuido incorrectamente.
- Totales inconsistentes: recalcular desde filas base y señalar la fórmula exacta.
- Estado cambiado: consultar `repair_status_history` y diferenciar “al corte” de “actual”.
- Garantía huérfana: conservarla en el total asignado y marcar que no puede atribuirse al técnico original.

## Verificación

Antes de considerar terminada la skill:

- Ejecutar una prueba de referencia sin la skill y documentar los errores de interpretación observados.
- Validar el directorio con `quick_validate.py`.
- Revisar `agents/openai.yaml` contra `SKILL.md`.
- Validar sintaxis y carácter de solo lectura del SQL.
- Ejecutar una auditoría real acotada y reconciliar resumen contra detalle.
- Comprobar que no existan secretos ni operaciones de escritura.
- Ejecutar `git diff --check`.

## Fuera de alcance

- Cambiar garantías, reparaciones, técnicos o estados.
- Determinar responsabilidad laboral o aplicar sanciones.
- Calcular importes efectivamente cobrados sin incorporar explícitamente ventas y pagos.
- Publicar o enviar informes a terceros.
