# Recuperación local y MCP Dokploy — Diseño

## Objetivo

Recuperar la MacBook como entorno de desarrollo fiel a `origin/main`, validar el proyecto completo y dejar operativos los MCP `dokploy_maccell` y `dokploy_sin_rival`, sin modificar aplicaciones, datos, despliegues ni configuración remota de producción.

## Estado comprobado

- `origin/main` apunta a `9d0a3adf5746a57fa7b3835b789623427425e470`, el mismo commit desplegado para MACCELL.
- El `HEAD` local apunta a un commit divergente, `b4cd6da921c1bb8c4bd202b080892b20a927a0ae`.
- El worktree contiene exactamente 821 eliminaciones de archivos versionados, sin archivos modificados ni nuevos.
- `.env` existe localmente, está ignorado por Git y no debe imprimirse ni incorporarse a commits.
- `dokploy_maccell` ya usa una instalación fija del MCP oficial y una consulta GET autenticada respondió HTTP 200.
- `dokploy_sin_rival` todavía depende de `npx`, el patrón que causó timeouts de inicialización.

## Diseño de recuperación

1. Crear una copia privada y local de `.env` fuera del repositorio, conservando sus permisos y sin mostrar contenido.
2. Guardar las 821 eliminaciones en un `git stash` nombrado para que sean recuperables.
3. Preservar el commit divergente local mediante una referencia de respaldo antes de mover `main`.
4. Ejecutar `git fetch origin` y alinear `main` exactamente con `origin/main`.
5. Confirmar que el worktree quede limpio y que vuelvan a existir `package.json`, `prisma/schema.prisma` y `src/`.
6. Instalar dependencias con `npm ci --legacy-peer-deps`, ejecutar `prisma generate` y validar el proyecto con los gates de MACCELL.

No se aplicará el stash automáticamente: queda únicamente como respaldo recuperable, porque representa las eliminaciones accidentales.

## Diseño de los MCP

Cada instancia conservará credenciales y URL independientes. Ambas usarán:

- Transporte local `stdio`.
- Una versión fija del paquete MCP oficial instalada fuera del repositorio.
- Ejecución directa con Node, sin resolución dinámica mediante `npx`.
- `DOKPLOY_REDACT_ENV=true` para impedir que secretos alcancen el contexto del modelo.
- Un backup recuperable de `~/.codex/config.toml` antes de editarlo.

La validación de cada instancia constará de:

1. `initialize` MCP.
2. `tools/list`.
3. Una llamada GET `project.all` resumida únicamente como éxito/error y cantidad, sin mostrar contenido.

No se invocarán herramientas POST, deploy, redeploy, restart, stop, migraciones ni cambios de configuración remota.

## Verificación local

Después de recuperar el repositorio se ejecutarán, en este orden:

1. `npm ci --legacy-peer-deps`.
2. `npx prisma generate`.
3. `npm test`.
4. `npx tsc --noEmit`.
5. ESLint sobre archivos cambiados; si no hay código cambiado, se registrará como no aplicable.
6. `git diff --check`.
7. `npm run build`.

Los fallos preexistentes se informarán con salida concreta y no se ocultarán mediante los workarounds de Next.js.

## Seguridad y recuperación

- No se mostrarán valores de `.env`, API keys, certificados, tokens, contraseñas ni respuestas completas de Dokploy.
- No se hará push ni deploy.
- No se tocará la base de datos local o remota con `db push`, `migrate deploy` o comandos equivalentes.
- La copia de `.env`, el stash y la referencia del commit local permitirán recuperar el estado anterior.
- Si `origin/main` cambia durante el procedimiento, se detendrá la alineación y se volverá a verificar el objetivo.

## Criterios de éxito

- `main` local coincide con el commit verificado de `origin/main` y el worktree está limpio.
- Los archivos esenciales del proyecto están presentes.
- Dependencias y Prisma están generados.
- Los gates de prueba y build tienen resultados explícitos.
- Ambos MCP inicializan y completan una consulta GET read-only autenticada.
- No se produjo ninguna mutación en producción.
