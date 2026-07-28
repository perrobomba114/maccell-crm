# Diseño uniforme del ingreso de reparaciones

## Objetivo

Rediseñar `/vendor/repairs/create` como una herramienta operativa oscura, clara y uniforme para vendedores, sin modificar el contrato de datos ni el comportamiento del alta de reparaciones.

## Dirección visual

- Mantener el lenguaje oscuro de MACCELL con superficies carbón y azul noche.
- Usar azul como acción principal, cian para estados seleccionados y ámbar solo para advertencias o verificaciones importantes.
- Eliminar la mezcla actual de bloques negros, azules y amarillos con estilos independientes.
- Usar exclusivamente iconos Lucide; no usar emojis como iconos estructurales.
- Mantener una densidad propia de CRM: compacta, pero con controles de al menos 44 px y separación basada en múltiplos de 4/8 px.

## Arquitectura de la página

### Encabezado

Un encabezado compacto presentará:

- Icono y título `Nuevo ingreso`.
- Texto breve que explique el objetivo de la pantalla.
- Indicador lineal de las cinco secciones: Cliente, Equipo, Recepción, Ticket y Entrega.

No será un hero de marketing ni un wizard. El formulario seguirá visible en una sola página para conservar velocidad operativa.

### Composición responsive

- Escritorio: grilla equilibrada con el contenido principal a la izquierda y los datos operativos/finales a la derecha.
- Tablet: columnas adaptables sin anchos rígidos ni desbordamiento horizontal.
- Móvil: una sola columna en orden lógico y barra inferior de acción que no cubra contenido.
- Ancho máximo consistente con el resto del CRM.

### Secciones

Todas las secciones compartirán un componente visual común:

- Número de paso en una insignia.
- Icono Lucide, título y descripción corta.
- Superficie, borde, radio, padding y jerarquía tipográfica uniformes.
- Estados de foco, error, selección y deshabilitado visibles en ambos temas soportados por el CRM.

El orden será:

1. Cliente y garantía.
2. Dispositivo y falla.
3. Recepción: código/PIN, patrón o sin código; chip/SIM y memoria.
4. Ticket, repuestos y fotografías.
5. Condición de humedad, valor estimado y fecha de entrega.

## Componentes e interacción

- Los campos conservarán etiquetas visibles, placeholders auxiliares y errores locales.
- La selección de acceso será un control segmentado accesible con `aria-pressed`.
- El patrón conservará la interacción táctil y los botones individuales como alternativa al arrastre.
- Chip/SIM, memoria y humedad usarán tarjetas seleccionables coherentes, sin depender solo del color.
- El botón `Ingresar reparación` será la única acción primaria y mostrará carga mientras se envía.
- En móvil la acción primaria podrá permanecer visible mediante una barra sticky con espacio reservado en el contenido.
- Las transiciones serán de 150–250 ms, solo para foco, selección y aparición de contenido, respetando `prefers-reduced-motion`.

## Confirmación

El diálogo final conservará la verificación obligatoria, pero adoptará el mismo sistema visual del formulario:

- Título y resumen claros, sin tipografía sobredimensionada.
- Filas separadas para acceso, accesorios y humedad.
- Acción secundaria `Volver a revisar` y primaria `Confirmar y registrar`.
- El código o patrón seguirá siendo privado y nunca aparecerá en impresiones o vistas públicas.

## Límites técnicos

- No cambiar Prisma, Server Actions ni reglas de validación.
- Reutilizar shadcn/ui, Tailwind y Lucide ya instalados.
- Mantener los componentes por debajo de 300 líneas; extraer una tarjeta de sección si evita duplicación.
- No agregar dependencias, temporizadores, hooks condicionales ni tipos `any`.
- No modificar navegación global, sidebar o header del portal vendedor.

## Validación

- Verificar visualmente en 375 px, 768 px y escritorio.
- Comprobar teclado, foco visible, etiquetas, estados seleccionados y objetivos táctiles.
- Probar código/PIN, patrón de cuatro puntos, sin código, SIM, memoria y humedad sin crear datos innecesarios.
- Ejecutar tests existentes, TypeScript, ESLint de archivos tocados, `git diff --check` y build de producción.

## Criterios de aceptación

- La página se percibe como una sola interfaz y no como módulos de estilos diferentes.
- La jerarquía y el orden de llenado son evidentes sin instrucciones externas.
- No existe desplazamiento horizontal en móvil.
- La acción principal siempre es fácil de localizar.
- El flujo y los datos enviados permanecen equivalentes al comportamiento actual.
