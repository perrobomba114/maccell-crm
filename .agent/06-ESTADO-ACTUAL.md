# 06 - Estado Actual y Funcionalidades (Verificado Diciembre 2025)

Este documento refleja el estado REAL del sistema tras las últimas implementaciones de Reparaciones, Notificaciones y Stock.

## 1. Módulo de Reparaciones (Repair System) - COMPLETO
Se ha implementado el flujo completo de servicio técnico:
*   **Roles**:
    *   **Vendor**: Crea la orden ("Nuevo Ingreso"). Formulario simplificado (sin selección de repuestos).
    *   **Technician**: Ve reparaciones asignadas o globales. Diagnostica, agrega repuestos y cambia estados.
    *   **Admin**: Visión global y métricas.
*   **Scanner**: Implementación de `html5-qrcode` para escanear repuestos y buscar clientes.
*   **Stock Automático**: Al asignar un repuesto a una reparación, el stock (`stockLocal`) se descuenta automáticamente.
*   **Estados**: Flujo definido en `RepairStatus` (Pendiente, En Revisión, Aprobado, Reparado, Entregado).

## 2. Sistema de Notificaciones (Notification System) - COMPLETO
Sistema de alertas en tiempo real para todos los roles.
*   **Modelo**: `Notification` (Title, Message, Type, ActionData).
*   **UI**: `NotificationBell` en el Header. Visible en modo Dark/Light.
*   **Actionable**: Soporte para notificaciones que requieren respuesta (Aceptar/Rechazar), útil para transferencias de stock o asignaciones.
*   **Polling**: Actualización automática cada 30 segundos.

## 3. Módulo de Productos y Stock
*   **Multi-Sucursal**: `Product` es global, `ProductStock` es por sucursal.
*   **Categorías**: Diferenciación entre `PRODUCT` (Venta) y `PART` (Repuesto).

## 4. Infraestructura y Estabilidad
*   **Tech Stack**: Next.js 16, React 19, Prisma 7, PostgreSQL.
*   **Server Actions**: Lógica de negocio dividida en `src/lib/actions/` (Reparaciones, Notificaciones) y `src/actions/` (Auth).
*   **Service Layer**: Nueva capa de servicios de dominio en `src/lib/services/` (BusinessHours, Customers, Tickets) para lógica reutilizable.
*   **Auth**: Sesiones basadas en cookies (sin NextAuth), lógica propia en `src/actions/auth-actions.ts`.
*   **Build**: Se recomienda usar `npm run dev:clean` si surgen problemas de caché con Webpack/Turbopack.

## 5. Próximos Pasos (Roadmap)
1.  **Refinamiento de UX**: Mejorar feedback visual en transiciones de estado de reparación.
2.  **Reportes**: Dashboards de productividad para técnicos.
3.  **Facturación**: Integración final del módulo de ventas.
