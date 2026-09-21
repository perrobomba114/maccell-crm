# Taxonomía publicada del árbol de esquemáticos

## Objetivo

Reemplazar el árbol de directorios del Workbench de MACCELL por una vista
derivada, estable y técnicamente verificable. Debe permitir que técnicos y
administradores encuentren documentación de teléfonos y consolas sin exponer
nombres de archivo, carpetas de origen, duplicados históricos ni categorías
inventadas.

## Problema confirmado

El Workbench sirve hoy un catálogo de despliegue separado del catálogo maestro.
Además, `tree.ts` usa con demasiada confianza `asset.model` y el último segmento
de la ruta como modelo comercial. En el inventario real eso convierte nombres
como `A10 pcb layer.pdf`, `Trouble shooting`, `General` y `Schematic and Silk`
en carpetas de modelo. El catálogo maestro también contiene entradas históricas
duplicadas y falsos positivos de consolas; por lo tanto no puede mostrarse de
forma directa sin una vista reconciliada.

## Alcance

- Corregir la taxonomía que el Workbench presenta y los conteos que muestra.
- Mantener la biblioteca física en `/mnt/data2` sin mover, borrar ni renombrar
  archivos.
- Duplicar por SHA-256 sólo en la vista de presentación, conservando el activo
  que la aplicación abre.
- Mostrar consolas únicamente desde sus rutas canónicas actuales.
- Mantener búsqueda, pairing PDF-PCBE y acceso por `asset.id` compatibles.
- Agregar pruebas de regresión con Apple, Samsung, Motorola y las cuatro
  familias de consolas.

## Fuera de alcance

- No crear nodos `Tablets`, `Computadoras`, `Notebook` ni `Por clasificar`.
  Sólo se publica una familia cuando hay activos válidos con esa familia.
- No inferir modelos con IA ni modificar identidades automáticamente.
- No reclamar cobertura RAG por el solo hecho de que un activo figure en el
  árbol.
- No migrar físicamente el catálogo maestro ni reindexar embeddings en esta
  entrega.

## Contrato de la vista

La vista trabaja sobre activos `ready` y construye una identidad de navegación:

```ts
type TreeIdentity = {
  platform: "mobile" | "console";
  family?: "Nintendo" | "PlayStation" | "Steam Deck" | "Xbox";
  manufacturer?: string;
  model: string;
  role: "Placas" | "Esquemáticos" | "Manuales técnicos" | "Casos de reparación" | "Documentos";
};
```

La raíz queda así:

```text
Apple / Samsung / Motorola / Xiaomi / …
  └─ modelo técnico verificable
     └─ tipo de documento

Consolas
  ├─ Nintendo
  │  └─ modelo técnico
  ├─ PlayStation
  ├─ Steam Deck
  └─ Xbox
```

`Consolas` es un contenedor de presentación, no una marca. Las familias se
obtienen exclusivamente de los segmentos canónicos `pcbe/Consolas/<familia>/`
y `pdf/Consolas/<familia>/`; una coincidencia textual en un nombre de archivo
no puede crear ni alimentar una familia de consola.

Para móviles, el modelo se acepta de metadatos sólo si no es un nombre de
archivo, rol documental, carpeta técnica ni etiqueta genérica. Si los
metadatos no superan esa validación, se intenta el primer segmento de ruta que
no sea técnico y que no contenga extensión. Si tampoco hay evidencia, el
activo no se publica en el árbol hasta tener una identidad revisada por un
administrador. El activo no se borra ni deja de estar disponible por ID.

## Fuente y reconciliación

La carga del catálogo debe admitir una fuente canónica configurada mediante
`SCHEMATICS_ROOT`; el catálogo de despliegue se considera una copia de trabajo,
no la autoridad cuando exista el catálogo maestro montado. Antes de formar el
árbol se aplican estas reglas:

1. Descarta registros cuyo `relativePath` no existe bajo el root activo.
2. Conserva un único registro por SHA-256, con preferencia por una ruta
   canónica `pcbe/` o `pdf/` frente a una ruta histórica `Consolas/`.
3. Conserva activos de hash distinto aunque compartan nombre.
4. No mezcla marcas ni plataformas al agrupar modelo o buscar contrapartes.

La implementación deberá exponer conteos de activos publicados y de activos
pendientes de identidad de forma administrativa, sin crear carpetas visibles
para los pendientes.

## Rol y modelo

Las etiquetas técnicas (`sources`, `pdf`, `pcbe`, `schematic`, `boardview`,
`troubleshooting`, `service`, `manual`, `documents`, `repair case`, etc.) nunca
son modelos. Los nombres que terminan en una extensión soportada, contienen
`pcb layer`, `schematic`, `diagram`, `layout`, `manual`, `notes`, `FAQ` o son
etiquetas de rol conocidas tampoco pueden ser modelos. Estas reglas deben ser
normalizadas, testeables y conservadoras: es preferible retener un activo para
revisión a inventar un modelo.

La distinción Qualcomm/Intel, códigos de placa y revisiones se conserva como
variante cuando la identidad del activo la declare o la ruta canónica lo
evidencie; no se aplana por heurística.

## Seguridad y rendimiento

El árbol se calcula en servidor desde el catálogo ya cargado, no realiza un
escaneo de `/mnt/data2` al escribir en el filtro ni desde el cliente. Las
operaciones de reconciliación usan mapas por SHA-256 y rutas normalizadas. La
pantalla mantiene el árbol compacto y sólo expande nodos a petición del usuario.
No se expone la ruta absoluta, contenido de archivos ni fuentes históricas a
roles técnicos que no tengan el permiso existente de administración.

## Criterios de aceptación

- Apple no muestra nombres de PDF, `General`, `FAQs`, `Component notes` ni
  roles como modelos.
- Samsung no muestra `Trouble shooting` ni `Schematic and Silk` como modelos.
- Motorola no muestra `PCB layout...pdf` ni `Esquematico...pdf` como modelos.
- Consolas muestra Nintendo (53), PlayStation (73), Steam Deck (8) y Xbox (49)
  desde los activos físicos canónicos: 183 en total en la fotografía validada.
- Registros históricos de consola no inflan ese total ni clasifican laptops o
  documentación de reguladores como PlayStation/Nintendo.
- No se muestra ninguna carpeta de plataforma genérica sin activos válidos.
- Abrir, buscar y vincular documentos existentes sigue funcionando por ID.
- La suite de árbol cubre deduplicación SHA, familias de consola por ruta,
  rechazo de modelos ruidosos y conservación de variantes técnicas.

## Verificación y rollback

La publicación se verifica con pruebas unitarias, `tsc`, lint de archivos
tocados, `git diff --check`, build y una comprobación visual autenticada del
Workbench. Antes de cambiar la fuente activa se registra el conteo actual y se
mantiene el catálogo de despliegue intacto; rollback consiste en desactivar la
nueva vista/capa de reconciliación, nunca en restaurar ni borrar archivos.
