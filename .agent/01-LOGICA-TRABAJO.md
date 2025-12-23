01 - Lógica de Trabajo y Filosofía de Código

Este documento detalla la mentalidad necesaria para trabajar en el proyecto. El objetivo es mantener el código mantenible, limpio y escalable.

1. Atomización del Código (Separation of Concerns)

No queremos archivos gigantes (God Objects). Dividimos la responsabilidad en tres capas físicas:

A. La Capa de Datos (Server Actions)

Ubicación: src/lib/actions/ (o src/lib/actions/auth para auth)

Responsabilidad: Hablar con la base de datos (Prisma), validar datos (Zod) y retornar resultados puros.

Regla: NUNCA escribir consultas a la BD dentro de un componente de UI (.tsx).

Ejemplo: crearProducto(data), obtenerVentasDelDia().

B. La Capa Lógica (Custom Hooks)

Ubicación: _hooks/ (dentro de la carpeta de la feature).

Responsabilidad: Manejar estados complejos (useState, useEffect), lógica de formularios y llamadas a las Server Actions.

Regla: Si tienes más de 3 useState en tu vista, muévelos a un hook useNombreFeature.ts.

C. La Capa Visual (UI Components & Pages)

Ubicación: page.tsx y _components/.

Responsabilidad: SOLO mostrar datos y capturar eventos.

Regla: El archivo page.tsx debe ser "tonto". Solo junta piezas.

2. Co-locación (Colocation)

Para evitar una carpeta components con 500 archivos mezclados, usamos co-locación.

Si un componente se usa en múltiples lugares: Va a src/components/shared.

Si un componente es exclusivo de una vista (ej. Ticket de Venta): Debe vivir dentro de la carpeta de esa ruta.

Estructura Correcta:

src/app/vendor/pos/
├── page.tsx               <-- La página principal
├── actions.ts             <-- Server Actions específicas de POS
├── _components/           <-- Componentes exclusivos de POS
│   ├── ticket-summary.tsx
│   ├── product-search.tsx
│   └── payment-modal.tsx
└── _hooks/
    └── use-pos-logic.ts   <-- Lógica del carrito de compras


3. Protocolo de Interacción con IA (Anti-Lobotomía)

Cuando se solicitan cambios o correcciones de bugs, se debe seguir estrictamente este protocolo para evitar romper código existente:

Contexto Completo: Siempre proveer el archivo actual completo.

Solicitud de Salida: La IA debe generar el archivo ENTERO nuevamente.

❌ INCORRECTO: "Agrega esta función al final del archivo".

✅ CORRECTO: "Reescribe el archivo ticket-summary.tsx completo con la corrección aplicada".

Prohibido Comentar Código Viejo: No dejes código comentado "por si acaso". Si se borra, se borra. Git guarda el historial.