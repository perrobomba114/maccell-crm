03 - Componentes UI, UX y Diseño (Shadcn System)

Este proyecto utiliza un sistema de diseño estricto basado en Shadcn/ui, Tailwind CSS y Framer Motion.

1. La Regla del "Responsive Si o Si"

El sistema debe ser perfectamente funcional en un iPhone SE, un iPad y un Monitor 4K.

Patrón de Tablas Responsivas (DataTables)

Las tablas de datos son el elemento más difícil en móviles.

Estrategia: Ocultar columnas menos importantes en pantallas pequeñas.

Implementación:

<TableHead>Producto</TableHead>
{/* Visible solo en Tablet (md) en adelante */}
<TableHead className="hidden md:table-cell">SKU</TableHead>
<TableHead className="hidden md:table-cell">Categoría</TableHead>
<TableHead>Precio</TableHead>


Mobile View: En la celda principal, mostrar información resumida:

<TableCell>
  <div className="font-bold">{item.name}</div>
  {/* Información extra solo visible en móvil */}
  <div className="md:hidden text-xs text-muted-foreground">
    SKU: {item.sku}
  </div>
</TableCell>


Grids Adaptables

Nunca usar anchos fijos (w-[500px]). Usar Grids:

<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Cards aquí */}
</div>


2. Shadcn UI (Mandatorio)

No inventes componentes. Usa los que están en src/components/ui.

Botones: Usar variantes (default, secondary, destructive, ghost).

Inputs: Siempre dentro de un Form o con Label asociado.

Cards: Usar CardHeader, CardContent, CardFooter para mantener consistencia.

Toasts28: ├── lib/actions/                <-- Server Actions (Backend Logic)
"Producto guardado correctamente").

3. Estética y Animaciones

Transiciones: Todo cambio de estado (hover, open modal) debe tener una transición suave.

Clase Tailwind: transition-all duration-300 ease-in-out.

Framer Motion: Para elementos que entran a la pantalla (ej. cargar un dashboard).

<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
   <DashboardContent />
</motion.div>


Scrollbars: Se ha configurado una scrollbar personalizada en globals.css que respeta el tema (Dark/Light). No la elimines.

4. Temas (Dark/Light Mode)

Todos los colores deben usar variables CSS de Tailwind (bg-background, text-foreground, border-border).

❌ NUNCA USAR: bg-white, text-black.

✅ SIEMPRE USAR: bg-card, text-card-foreground.

Esto garantiza que el modo oscuro funcione automáticamente sin código extra.