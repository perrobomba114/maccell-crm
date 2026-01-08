export const vendorLinks = [
    { href: "/vendor/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/vendor/pos", label: "Punto de Venta", icon: "ShoppingCart" },
    { href: "/vendor/sales", label: "Mis Ventas", icon: "Receipt" },
    { href: "/vendor/repairs/create", label: "Nuevo Ingreso", icon: "Wrench" },
    { href: "/vendor/repairs/active", label: "Reparaciones Activas", icon: "List" },
    { href: "/vendor/repairs/history", label: "Historial de Reparacion", icon: "History" },
    { href: "/vendor/stock", label: "Consulta Stock", icon: "Box" },
    { href: "/vendor/products", label: "Productos", icon: "Package" },
];

export const technicianLinks = [
    { href: "/technician/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/technician/tickets", label: "Trabajo Disponible", icon: "ClipboardList" },
    { href: "/technician/repairs", label: "Reparaciones", icon: "Wrench" },
    { href: "/technician/history", label: "Historial", icon: "History" },
    { href: "/technician/returns", label: "Devoluciones", icon: "RotateCcw" },
    { href: "/vendor/stock", label: "Consulta Stock", icon: "Box" },
];

export const adminGroups = [
    {
        label: "Principal",
        items: [
            { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        ]
    },
    {
        label: "Gestión Comercial",
        items: [
            { href: "/admin/sales", label: "Ventas", icon: "ShoppingCart" },
            { href: "/admin/invoices", label: "Facturas", icon: "FileText" },
            { href: "/admin/cash-shifts", label: "Cierre de Caja", icon: "Banknote" },
        ]
    },
    {
        label: "Inventario",
        items: [
            { href: "/admin/products", label: "Productos", icon: "Package" },
            { href: "/admin/categories", label: "Categorías", icon: "ClipboardList" },
            { href: "/admin/repuestos", label: "Repuestos", icon: "Settings" }, // Using Settings icon for parts as placeholder or Wrench
            { href: "/admin/transfers", label: "Transferencias", icon: "History" },
            { href: "/admin/discounts", label: "Descuentos", icon: "Percent" },
        ]
    },
    {
        label: "Servicio Técnico",
        items: [
            { href: "/admin/repairs", label: "Reparaciones", icon: "Wrench" },
            { href: "/admin/returns", label: "Devoluciones", icon: "RotateCcw" },
        ]
    },
    {
        label: "Sistema",
        items: [
            { href: "/admin/users", label: "Usuarios", icon: "Users" },
            { href: "/admin/branches", label: "Sucursales", icon: "Building2" },
            { href: "/admin/import", label: "Importar", icon: "BarChart3" },
        ]
    }
];
