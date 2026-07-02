# Dynamic Upload Storage

## Regla

Los archivos subidos por usuarios no se guardan en `public/`.

- Estáticos versionados: `public/`
- Uploads persistentes: `upload/`
- URL pública única: `/api/uploads/<bucket>/<archivo>`

Buckets actuales:

- `upload/repairs/images`
- `upload/branches`
- `upload/profiles`
- `upload/knowledge`
- `upload/pantallas`

## Por Qué

En producción standalone, Next.js no garantiza servir archivos agregados dinámicamente a `public/` después del build. El incidente del 2026-07-02 mostró el síntoma:

- `/repairs/images/MAC2-00001450_1783000663897-6653.jpg` devolvía `404`.
- `/api/uploads/repairs/images/MAC2-00001450_1783000663897-6653.jpg` devolvía `200 image/jpeg`.

El endpoint `/api/uploads/[...path]` busca primero en `upload/` y después en `public/` para compatibilidad con referencias viejas.

## Contrato De Código

- Crear URLs nuevas con `/api/uploads/...`.
- Renderizar imágenes con `getImgUrl(...)` cuando el valor venga de DB o de datos legacy.
- No guardar paths nuevos como `/repairs/images`, `/branches`, `/profiles` ni `/knowledge`.
- Aceptar imágenes de reparación como `image/*` y convertirlas server-side a JPEG antes de escribirlas en `upload/repairs/images`.
- No usar `next/image` para ocultar problemas de storage; la URL debe abrir directo en navegador.

## Migración

Orden en producción:

1. Desplegar primero el código que normaliza URLs a `/api/uploads/...`.
2. Confirmar que `/api/uploads/...` funciona para una imagen todavía ubicada en `public/`.
3. Ejecutar la migración con `--execute`.
4. Confirmar que el volumen persistente de Dokploy apunta a `/app/upload`.

Primero revisar:

```bash
npm run uploads:migrate -- --dry-run
```

Mover:

```bash
npm run uploads:migrate -- --execute
```

Después verificar una imagen real:

```bash
curl -I http://localhost:3000/api/uploads/repairs/images/NOMBRE.jpg
```

## Checklist Antes De Producción

- `npm test`
- `npx tsc --noEmit`
- `git diff --check`
- ESLint sobre archivos tocados
- `npm run dev` y abrir una reparación con imágenes nuevas y viejas
- Confirmar que `/api/uploads/...` responde `200` para imágenes migradas
- Confirmar volumen persistente `/app/upload` en Dokploy antes de redeploys

## Referencias

- Next.js docs: `public/` sirve assets desde la raíz, pero no debe ser el storage de uploads dinámicos.
- Discusión oficial de Next.js: archivos agregados a `public/` después del build no son una estrategia confiable para persistencia; usar endpoint/storage persistente.
- Stack Overflow: cuando `next/image` o static export no pueden resolver/optimizar imágenes dinámicas, la salida estable es servir una URL real y verificable con `<img>` o endpoint propio.
