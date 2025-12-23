02 - Arquitectura de Trabajo y Roles

La estructura de archivos de Next.js App Router se utiliza para reforzar la seguridad y la separación de roles.

1. Mapa de Carpetas (The Source of Truth)

src/
├── app/
│   ├── (auth)/                 <-- Grupo de rutas públicas (Login)
│   │   ├── login/
│   │   └── layout.tsx          <-- Layout simple (centrado)
│   │
│   ├── admin/                  <-- 🔒 ZONA ADMINISTRADOR
│   │   ├── layout.tsx          <-- Sidebar ADMIN + Header
│   │   ├── dashboard/          <-- KPIs Generales
│   │   ├── usuarios/           <-- ABM Usuarios
│   │   └── ...
│   │
│   ├── vendor/                 <-- 🔒 ZONA VENDEDOR
│   │   ├── layout.tsx          <-- Sidebar VENTA + Header
│   │   ├── pos/                <-- Punto de Venta
│   │   └── mis-ventas/         <-- Historial personal
│   │
│   └── technician/             <-- 🔒 ZONA TÉCNICO
│       ├── layout.tsx          <-- Sidebar TALLER + Header
│       └── tickets/            <-- Gestión de reparaciones
│
├── actions/                    <-- Server Actions (Backend Logic)
├── lib/                        <-- Utilidades (DB, Auth, Formatters)
└── middleware.ts               <-- El Portero (Seguridad Global)


2. Sistema de Middleware y Protección

El archivo src/middleware.ts es la primera línea de defensa.

Intercepta cada solicitud.

Verifica la cookie de sesión.

Lógica de Rebote:

Si un VENDOR intenta entrar a /admin, el middleware lo expulsa inmediatamente.

Si un usuario no logueado intenta entrar a cualquier ruta protegida, va al /login.

3. Redirección Inteligente (Login)

No existe una "Home Page" genérica. En src/actions/auth-actions.ts:

Usuario ingresa credenciales.

Sistema valida rol.

Switch Case:

ADMIN -> Redirige a /admin/dashboard

VENDOR -> Redirige a /vendor/pos

TECHNICIAN -> Redirige a /technician/tickets

Esto: Toasts: Usar sonner o toast para feedback de acciones (ej: "Producto guardado correctamente").

Notificaciones: Usar NotificationBell para alertas asíncronas (ej: "Nueva reparación asignada").
optimiza el flujo de trabajo: cada empleado aterriza directamente en su herramienta de trabajo.