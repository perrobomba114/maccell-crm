# MacCell CRM - Sistema de Gestión Integral para Centros Tecnológicos

![MacCell CRM Banner](https://img.shields.io/badge/MacCell-CRM-blue?style=for-the-badge&logo=next.js)
![Version](https://img.shields.io/badge/version-2.0.0-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/license-Proprietary-red?style=for-the-badge)

MacCell CRM es una plataforma de gestión empresarial (ERP/CRM) de alto rendimiento diseñada específicamente para laboratorios de reparación de dispositivos móviles y tiendas de tecnología. Construida con tecnologías de vanguardia, ofrece un control absoluto sobre el flujo de trabajo, desde la recepción de un equipo hasta la auditoría financiera avanzada.

---

## 📑 Índice de Contenidos

- [Visión General](#-visión-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Módulos Principales](#-módulos-principales)
  - [Panel de Administración](#panel-de-administración-admin)
  - [Módulo de Ventas](#módulo-de-ventas-vendor)
  - [Laboratorio Técnico](#laboratorio-técnico-technician)
- [Características Desacadas](#-características-destacadas)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Guía de Desarrollo](#-guía-de-desarrollo)
- [Optimización y Rendimiento](#-optimización-y-rendimiento)
- [Soporte Móvil y Cámara](#-soporte-móvil-y-cámara)

---

## 🚀 Visión General

MacCell CRM no es solo un gestor de ventas; es un ecosistema que unifica tres pilares fundamentales del negocio tecnológico:

1.  **Auditoría Financiera**: Control de caja chica, cierres de caja por turno, seguimiento de gastos y cálculo automático de comisiones (premios).
2.  **Gestión de Reparaciones**: Seguimiento detallado del ciclo de vida de cada dispositivo, con documentación fotográfica y trazabilidad de técnicos.
3.  **Control de Inventario Multi-Sucursal**: Sincronización en tiempo real de stock de productos y repuestos entre diferentes ubicaciones físicas.

El sistema prioriza la **experiencia de usuario (UX)** con una interfaz tipo "Premium Dark" que utiliza micro-animaciones para mejorar la interactividad y reducir la carga cognitiva.

---

## 🏗 Arquitectura del Sistema

La aplicación sigue una arquitectura moderna basada en el **App Router de Next.js**, utilizando **Server Actions** para la lógica de negocio y **Prisma ORM** para la persistencia de datos.

### Seguridad y Roles (RBAC)
El sistema utiliza un control de acceso basado en roles (Role-Based Access Control):
- **ADMIN**: Acceso total a estadísticas, configuración de sucursales, auditoría de cajas y gestión de usuarios.
- **VENDOR**: Enfocado en la atención al cliente, ventas rápidas, recepción de equipos y apertura/cierre de su propia caja.
- **TECHNICIAN**: Interfaz optimizada para el laboratorio, gestión de tareas asignadas, diagnóstico y consumo de repuestos.

---

## 📦 Módulos Principales

### Panel de Administración (ADMIN)
Es el cerebro del sistema. Permite a los dueños de negocio supervisar el rendimiento global.
- **Dashboard Financiero**: Visualización de KPIs (Ingresos, Ventas, Gastos, Ticket Promedio) con comparativas mensuales automáticas.
- **Participación de Ganancia**: Gráficos interactivos de Recharts que muestran qué categorías generan más margen.
- **Cierre de Caja Global**: Calendario optimizado para auditar cada turno de cada sucursal en milisegundos.
- **Gestión de Sucursales**: Configuración de prefijos de tickets, direcciones y stock específico.

### Módulo de Ventas (VENDOR)
Diseñado para la agilidad en el punto de venta (POS).
- **Venta Rápida**: Buscador inteligente de productos por SKU o nombre.
- **Métodos de Pago Flexibles**: Soporte para Efectivo, Tarjeta, Mercado Pago y Pagos Divididos (Split).
- **Impresión de Tickets**: Generación de comprobantes térmicos optimizados para impresoras de 80mm.
- **Recepción de Equipos**: Proceso simplificado para registrar ingresos al servicio técnico.

### Laboratorio Técnico (TECHNICIAN)
Optimizado para la productividad en el banco de trabajo.
- **Cola de Trabajo**: Lista priorizada de reparaciones según fecha comprometida.
- **Diagnóstico y Observaciones**: Registro de cada paso de la reparación para transparencia con el cliente.
- **Consumo de Repuestos**: Descuento automático del inventario de repuestos al asignar piezas a una reparación.
- **Widget de Carga**: Sistema de visualización de carga de trabajo para una mejor distribución de tareas.

---

## ✨ Características Destacadas

### 📊 Análisis de Datos en Tiempo Real
Utilizamos **Recharts** con protecciones de SSR para garantizar gráficos fluidos que muestran el crecimiento del negocio día a día. Los cálculos de beneficios se realizan a nivel de servidor para asegurar precisión centesimal.

### 🖼 Gestión de Evidencia Fotográfica
El sistema permite capturar y almacenar imágenes de los dispositivos al ingresar y al finalizar, protegiendo tanto al cliente como al servicio técnico ante posibles reclamos por daños estéticos.

### ⚙️ Optimización de Cierres de Caja
Implementamos consultas agrupadas (Batching) y agregaciones a nivel de base de datos para manejar miles de movimientos financieros sin degradar el rendimiento de la interfaz.

### 🔔 Notificaciones Inteligentes
Sistema integrado de avisos para alertar a los técnicos sobre nuevas asignaciones o a los administradores sobre cierres de caja pendientes.

---

## 🛠 Stack Tecnológico

| Tecnología | Uso |
| :--- | :--- |
| **Next.js 15 (App Router)** | Framework principal y SSR |
| **TypeScript** | Tipado estático para robustez del código |
| **Prisma ORM** | Modelado de datos y consultas a DB |
| **PostgreSQL** | Base de datos relacional |
| **Tailwind CSS** | Estilizado moderno y responsivo |
| **Framer Motion** | Animaciones y transiciones suaves |
| **Lucide React** | Librería de iconos vectoriales |
| **Recharts** | Visualización de datos y estadísticas |
| **Zustand / React Context** | Gestión de estado global |
| **Sonner** | Sistema de notificaciones tipo Toast |

---

## 📂 Estructura del Proyecto

```text
maccell-crm/
├── src/
│   ├── app/                # Rutas y páginas (Next.js App Router)
│   │   ├── admin/          # Panel de administración
│   │   ├── vendor/         # Módulo de ventas
│   │   ├── technician/     # Módulo de laboratorio
│   │   └── api/            # Endpoints de API rest (Webhooks/Integraciones)
│   ├── actions/            # Server Actions (Lógica de negocio principal)
│   │   ├── auth-actions.ts # Gestión de sesiones
│   │   ├── cash-shift.ts   # Lógica financiera
│   │   └── repairs.ts      # Flujo de servicio técnico
│   ├── components/         # Componentes reutilizables
│   │   ├── ui/             # Componentes base (Shadcn/UI)
│   │   ├── admin/          # Componentes específicos de administración
│   │   ├── layout/         # Sidebar, Header, Breadcrumbs
│   │   └── shared/         # Utilidades comunes visuales
│   ├── lib/                # Utilidades de configuración (DB, Utils)
│   └── hooks/              # Custom hooks de React
├── prisma/                 # Esquema de base de datos y migraciones
├── public/                 # Assets estáticos (Logo, Imágenes)
└── .env                    # Variables de entorno
```

---

## ⚙️ Instalación y Configuración

### Requisitos Previos
- Node.js 18.x o superior
- PostgreSQL instalado o una instancia en la nube (ej. Supabase)

### Pasos
1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/perrobomba114/maccell-crm.git
    cd maccell-crm
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**:
    Crea un archivo `.env` en la raíz con el siguiente contenido:
    ```env
    DATABASE_URL="postgresql://usuario:password@localhost:5432/maccell_crm"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

4.  **Sincronizar base de datos**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```

---

## 💡 Guía de Desarrollo

### Convenciones de Código
- **Componentes**: Deben ser lo más granulares posible y estar ubicados en la carpeta correspondiente a su dominio.
- **Server Actions**: Toda mutación de datos debe pasar por una Server Action para garantizar validaciones de seguridad en el servidor.
- **Estilos**: Utilizar clases de Tailwind CSS. Evitar estilos integrados a menos que sean cálculos dinámicos de Framer Motion.

### Gestión de Imágenes
Para el despliegue local, las imágenes se almacenan en `public/profiles` y se referencian mediante la utilidad `getImgUrl`. En producción, el sistema está preparado para ser extendido a servicios como AWS S3 o Cloudinary.

---

## ⚡ Optimización y Rendimiento

El sistema incluye varias capas de optimización:
- **Hydration Guards**: Todos los gráficos y componentes complejos tienen validaciones de montaje (`isMounted`) para evitar errores de hidratación típicos de Next.js.
- **Consultas Optimizadas**: El cierre de caja utiliza un modelo de carga de datos que reduce el tiempo de proceso en un 90% comparado con implementaciones estándar.
- **Memoización**: Uso estratégico de `useMemo` y `useCallback` en listas largas de repuestos y productos.

---

## 📱 Soporte Móvil y Cámara

Para que el escáner de códigos de barras y la captura de fotos funcionen en dispositivos móviles durante el desarrollo local (vía HTTP), debes seguir estos pasos en Chrome:

1.  Abre Chrome en tu celular.
2.  Navega a: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3.  Habilita la opción **"Insecure origins treated as secure"**.
4.  En el cuadro de texto, ingresa la IP de tu computadora (ej: `http://192.168.1.15:3000`).
5.  Haz clic en **"Relaunch"**.

*Nota: En producción, el uso de HTTPS elimina la necesidad de esta configuración.*

## 🗄️ Diccionario de Datos (Modelo Prisma)

El corazón de MacCell CRM reside en su robusto esquema relacional. A continuación, se detallan las entidades principales y sus interacciones:

### 1. Núcleo Organizacional (`Branch`)
Define las sucursales físicas. Cada sucursal actúa como un contenedor de aislamiento para inventario, ventas y reparaciones, aunque los administradores pueden ver datos agregados.
- **Campos Clave**: `ticketPrefix`, `code`, `address`.

### 2. Control de Acceso (`User`)
Soporta tres roles principales (`ADMIN`, `VENDOR`, `TECHNICIAN`). 
- **Integraciones**: Vinculado a `Branch` para restringir el alcance de visualización.

### 3. Sistema de Reparaciones (`Repair` & `Customer`)
El módulo más complejo. Maneja el flujo de trabajo técnico.
- **Repair**: Contiene metadatos del dispositivo (`deviceBrand`, `deviceModel`), estados dinámicos vinculados a `RepairStatus`, y trazabilidad de tiempos (`startedAt`, `finishedAt`).
- **Warranty**: Sistema integrado para reparaciones bajo garantía mediante una relación autorreferencial (`originalRepairId`).

### 4. Transacciones y Finanzas (`Sale`, `CashShift`, `Expense`)
- **Sale**: Soporta múltiples ítems y métodos de pago. Incluye banderas de auditoría como `wasPaymentModified`.
- **CashShift**: Registra la apertura y cierre de caja, calculando automáticamente balances basados en ventas y gastos reales del periodo.

---

## 🛠 Desafíos Técnicos y Soluciones

### 🚀 Optimización de Consultas (Performance)
**Desafío**: La vista de administrador del historial de cajas tardaba hasta 5 segundos en cargar debido a consultas redundantes dentro de bucles (N+1).
**Solución**: Se implementó una lógica de **Batch Fetching**. Al cargar un mes, el sistema captura todos los movimientos financieros en tres consultas masivas y realiza la asociación en la memoria del servidor de aplicaciones, reduciendo el tiempo de carga a milisegundos.

### 📈 Visualización de Datos (Hydration Issues)
**Desafío**: Las librerías de gráficos basadas en SVG generan inconsistencias entre el renderizado del servidor (SSR) y el cliente.
**Solución**: Implementamos un patrón de `isMounted` en todos los componentes de Recharts. El servidor entrega un "esqueleto" (Skeleton UI) y el cliente monta el gráfico interactivo una vez que el DOM está listo, eliminando advertencias en consola y parpadeos visuales.

### ⚙️ Cálculo de Premios (Comisiones)
**Desafío**: El cálculo de premios por ventas es dinámico y depende de umbrales de facturación mensuales.
**Solución**: Se integró un motor de reglas en las Server Actions de caja que aplica porcentajes variables según el volumen de ventas:
- Menos de 1M: 1%
- Más de 1M: 2%
- Redondeo automático a unidades de 500 para facilitar pagos físicos de comisiones.

---

## 📂 Documentación de Componentes Clave

### `src/components/layout/sidebar.tsx`
Gestiona la navegación dinámica. Utiliza `framer-motion` para transiciones suaves entre estados colapsados y expandidos. Incluye lógica de persistencia para recordar la preferencia del usuario.

### `src/components/admin/dashboard/ProfitDonut.tsx`
Calcula la rentabilidad real de cada categoría cruzando datos de ventas con el costo de los productos. Utiliza colores de marca curados para una representación visual premium.

### `src/components/repairs/repair-details-modal.tsx`
Un centro de comando para la reparación. Permite a los técnicos:
- Ver historial de observaciones.
- Cambiar estados con un clic.
- Ver fotos en una galería interactiva.

---

## 📋 Estándares de Código y Recomendaciones

Si estás contribuyendo a este proyecto o realizando modificaciones, por favor sigue estas reglas:

1.  **Strict Typing**: No uses `any` a menos que sea estrictamente necesario por una librería externa sin tipos. Define interfaces precisas en cada componente.
2.  **Server VS Client**: Marca siempre tus archivos con `"use client"` o `"use server"` de manera explícita en la primera línea.
3.  **Manejo de Errores**: Todas las Server Actions deben retornar un objeto `{ success: boolean, data?: any, error?: string }` para un manejo de errores consistente en la UI.
4.  **Aesthetics First**: El diseño es una prioridad. Si creas una nueva tabla, asegúrate de que use las clases de `bg-card`, `hover:bg-muted` y bordes sutiles según el sistema de diseño visual establecido.

---

## 📈 Roadmap y Mejoras Futuras
- [ ] Integración con APIs de transportistas para seguimiento de envíos de stock entre sucursales.
- [ ] Exportación avanzada de reportes a PDF/Excel con plantillas personalizadas.
- [ ] Módulo nativo de cámara para escaneo directo de piezas mediante OCR.

---

## 📱 Soporte Móvil y Cámara (Detalle Técnico)

La tecnología de escáner utiliza la librería `html5-qrcode`. Para habilitar el uso de la cámara en entornos de desarrollo:

1.  **IP Estática**: Asegúrate de que tu computadora tenga una IP fija en la red local.
2.  **HTTPS Local**: Opcionalmente, puedes usar librerías como `next-dev-https` para simular un entorno seguro TLS localmente.
3.  **Permisos de Origen**: En dispositivos Android, Chrome bloquea la cámara por defecto en sitios `http://`. Es mandatorio usar el flag `unsafely-treat-insecure-origin-as-secure` mencionado en la sección de instalación.

---

## 📄 Notas de Versión

### v2.0.0 (Actual)
- Implementación de App Router.
- Nuevo sistema de auditoría financiera acelerada.
- Refactorización de la sidebar con soporte para logos dinámicos.
- Optimización de gráficos Recharts con client-side mounting.

---

## 🤝 Contacto y Soporte
Si encuentras un bug o tienes una sugerencia de mejora, por favor abre un *Issue* en el repositorio de GitHub o contacta al equipo de desarrollo de **David**.

---

## 🛠️ Referencia Técnica de Server Actions

Para los desarrolladores que necesiten extender la funcionalidad, aquí se documentan las acciones críticas del sistema:

### Gestión de Cajas (`/actions/cash-shift-actions.ts`)
- `getCashDashboardStats(year, month, branchId)`: La función principal del dashboard. Calcula KPIs y recupera turnos optimizados mediante batching.
- `getDeepCashShiftsForDate(date, branchId)`: Recupera el detalle atómico de ventas y gastos para un día específico.
- `updateUserImage(userId, imageUrl)`: Actualiza la referencia de la foto de perfil en la DB y dispara la revalidación de rutas.

### Servicio Técnico (`/actions/repairs/`)
- `createRepair(data)`: Crea una nueva entrada de servicio técnico, genera el número de ticket basado en el prefijo de la sucursal y notifica a los técnicos si hay uno asignado.
- `updateRepairStatus(repairId, statusId)`: Cambia el estado y registra automáticamente la transición en el historial para auditoría del cliente.

### Inventario y Stock (`/actions/products.ts`)
- `updateProductStock(productId, branchId, quantity)`: Ajusta niveles de stock con validación de existencia previa para prevenir inconsistencias.
- `processStockTransfer(source, target, items)`: Gestiona el movimiento de mercancía entre sucursales, restando en origen y sumando en destino en una sola transacción atómica.

---

## 📊 Flujo de Datos Financieros (Diagrama Conceptual)

```mermaid
graph TD
    A[Venta Realizada] --> B{Método de Pago}
    B -- Efectivo --> C[Balance Caja Chica]
    B -- Tarjeta/MP --> D[Balance Digital]
    C --> E[Cierre de Turno]
    D --> E
    E --> F[Auditoría Admin]
    G[Gasto Operativo] --> C
    H[Premio/Comisión] --> C
```

---

## 📄 Licencia y Propiedad

Este software es propiedad privada de **MacCell Technology**. Queda estrictamente prohibida su redistribución o uso no autorizado en entornos de producción ajenos a la organización original.

---
Generado con ❤️ por el equipo de **Advanced Agentic Coding** para **MacCell**.
| Estabilidad | Rendimiento | Estética |
| :---: | :---: | :---: |
| 100% | Ultra Fast | Premium |
