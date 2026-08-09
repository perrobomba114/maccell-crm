# Filtro de entregas en Stock de Reparaciones

## Objetivo

El gráfico administrativo **Stock de Reparaciones** debe representar los equipos que todavía permanecen físicamente en una sucursal. Una reparación con estado **Finalizada OK** debe seguir visible mientras no haya sido entregada. Una reparación entregada no debe contar, aunque por una inconsistencia histórica su estado actual todavía sea **Finalizada OK**.

## Criterio funcional

Una reparación se incluye en el gráfico cuando se cumplen ambas condiciones:

- Su estado actual no es `REPAIR_STATUS.DELIVERED` (`10`).
- No tiene ningún `SaleItem` vinculado mediante `repairId`.

La relación con `SaleItem` es la segunda evidencia de entrega creada por el checkout del POS. Al eliminar una venta, Prisma elimina sus ítems por cascada y el flujo existente restaura la reparación a estado **Finalizada OK**; por lo tanto, esa reparación vuelve a ser elegible para el gráfico.

## Diseño técnico

Se extraerá un constructor pequeño y tipado del filtro Prisma en un módulo de estadísticas de reparaciones. `getBranchStats` consumirá ese filtro en su `groupBy` por sucursal y estado. Esto evita duplicar números mágicos y permite probar la política sin conectar una base de datos.

No se modificará el componente React, los textos del gráfico, el esquema Prisma ni los datos existentes.

## Casos cubiertos

- **Finalizada OK sin venta:** se incluye.
- **Finalizada OK con venta vinculada:** se excluye.
- **Entregada (estado 10):** se excluye, exista o no una venta vinculada.
- **Otros estados sin venta:** se incluyen con el comportamiento actual.
- **Venta eliminada:** al desaparecer el `SaleItem` y restaurarse el estado 5, vuelve a incluirse.

## Pruebas y verificación

Se agregará un test unitario de la política del filtro con expectativas literales. Primero deberá fallar porque el constructor todavía no existe o la consulta actual no usa la política completa; luego se implementará el cambio mínimo y se verificará el test.

El cierre incluirá `npm test`, `npx tsc --noEmit`, lint de los archivos TypeScript tocados, `git diff --check` y `npm run build`, según el gate de MACCELL.

## Fuera de alcance

- Migrar o reescribir estados históricos.
- Cambiar el proceso de checkout o eliminación de ventas.
- Rediseñar el dashboard o renombrar el gráfico.
- Alterar qué estados técnicos se consideran finalizados.
