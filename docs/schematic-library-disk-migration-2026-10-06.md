# Biblioteca de esquemáticos en el disco de 4 TB

Migración aplicada y verificada el 6 de octubre de 2026. Código publicado en `main`, commit `b6c38a4411547c541cb954f93e9dc38193ce239f`.

## Almacenamiento y espacio

- Ruta operativa: `/mnt/ESQUEMATICO`.
- Disco: `/dev/sdb1`, UUID `fa0a1b6a-f35b-49ab-820d-49d86c4d1d17`.
- Directorio físico: `/mnt/COMICS/ESQUEMATICOS`; un bind mount persistente lo expone en `/mnt/ESQUEMATICO`. Son accesos al mismo contenido, no dos copias ni una partición nueva.
- Entrada fstab con dependencia de `/mnt/COMICS`, respaldada antes del cambio.
- RAID al finalizar: 468 GiB totales, 319 GiB usados, 125 GiB disponibles, 72% de ocupación. Antes tenía aproximadamente 30 GiB disponibles y 94% de ocupación. Durante la migración los builds agregaron imágenes Docker; no se hizo limpieza indiscriminada de imágenes.
- Se retiraron del RAID 23.633 copias verificadas: 109.684.745.386 bytes (102,15 GiB). `/mnt/data2` conserva únicamente una guía de redirección.

## Organización

- `pdf/<Marca>/<Modelo>/`: PDF junto a imágenes y videos del mismo modelo.
- `pcbe/<Marca>/<Modelo>/`: placas.
- Se trasladaron 138 imágenes/videos; 55 se asociaron a carpetas de PDF mediante un código de placa Samsung con una única coincidencia. Los casos ambiguos conservaron sus códigos.
- `CURSO` permanece intacto, fuera del manifiesto de retiro del RAID. Se comprobaron sus siete carpetas de módulos en el navegador.
- Históricos, staging y evidencias se conservaron. No se eliminaron documentos ni se reconstruyeron bases, páginas o vectores.
- `AGENT.md` y `AGENTS.md` instalados en la raíz nueva. El organizador coloca imágenes junto a PDF y excluye `CURSO` de las normalizaciones.

## Servicios y publicación

| Servicio | Montaje | Despliegue |
| --- | --- | --- |
| CRM | `/mnt/ESQUEMATICO` → `/app/upload/schematics/sources` | `al1MtIjjVd4bf086FuKY9`, done |
| RAG: worker, ingestion-sequential, repair-sync e indexador técnico | `/mnt/ESQUEMATICO` → rutas internas existentes, solo lectura | `mMgN3rIlFVQCd2Msf9Axt`, done |
| Filebrowser | `/mnt/ESQUEMATICO` → `/srv/esquematicos` | `CCunZW5wJCKwJTpeVZRTe`, done |

Filebrowser conserva los permisos de todos sus usuarios. El usuario `maccell` cambió de scope `/disco-1-8tb-B` a `/esquematicos`, conservando lectura y descarga. Los administradores ven `esquematicos` desde la raíz. Se retiró el directorio vacío del antiguo montaje de Filebrowser.

La revisión servida del CRM tiene `version.txt=1791300370`, coincidente entre HTTP y contenedor. El organizador servido coincide por SHA-256 con el commit local: `84a1cbc6123006171debce41cec7b77a5184dc791eb306d6f93b9d49e5c96ad6`.

## Verificación

- SHA-256 origen/destino de los 23.633 archivos, con tamaño y mtime estables durante la lectura: sin diferencias.
- Catálogo y SQL: 9.503 assets, cero rutas faltantes. Misma huella antes/después de IDs, rutas relativas y hashes: `c89550fd680c62ede5acbbeed752337684701b72b866a96aac5bb7a0bd590dd8`.
- Usuario real de Filebrowser: 9.503 archivos publicados legibles, cero inaccesibles.
- Navegador autenticado: biblioteca `esquematicos`, carpetas `pdf`, `pcbe`, `CURSO` y siete módulos de cursos. La interfaz informa capacidad de 3,58 TiB del disco nuevo.
- CRM: búsquedas de iPhone 13 Pro Max, A03 core, Moto g7 power, Redmi note 12 y PS5; lectura PDF y geometría PCBE Apple/Samsung/Motorola. Se conserva la limitación previa del PCBE de PS5 sin geometría decodificada; el traslado no la modifica.
- RAG: diez grupos de documentos respondieron HTTP 206 con firma `%PDF` desde el montaje nuevo. Esta prueba valida entrega documental, no exhaustividad del índice ni todos los posibles diagnósticos.
- Pruebas locales: 11 tests del organizador, lint del script OCR, `tsc --noEmit`, build y `git diff --check`.

## Evidencia y recuperación

En el servidor: `/home/maccell/library-disk-migration-20261006/`, con acceso restringido. Contiene manifiestos SHA-256, mapa de reubicación de medios, comprobaciones de servicios y diario de retiro. El backup de la base Filebrowser permanece restringido allí; no se publica dentro de la biblioteca.

Copias de las evidencias sin credenciales: `/mnt/ESQUEMATICO/.library-history/2026-10-06-disk-migration/`.

El mapa `media-arranged.json` conserva para cada archivo el origen, destino, tamaño y SHA-256. Cualquier recuperación debe usar ese mapa, verificar espacio disponible y hashes, y restaurar montajes/scopes coherentemente. No ejecutar rsync del árbol antiguo sobre la biblioteca reorganizada: reintroduciría la raíz `media`.
