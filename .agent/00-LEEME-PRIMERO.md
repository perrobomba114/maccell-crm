🛑 PROTOCOLO DE DESARROLLO MACCELL CRM (STRICT MODE)

ADVERTENCIA: Si eres un desarrollador humano o una IA asistiendo en este proyecto, DETENTE. No escribas una sola línea de código sin haber leído y procesado los siguientes documentos.

Este proyecto sigue una arquitectura Next.js App Router altamente opinionada y estricta para evitar deuda técnica y "código espagueti".

📚 Índice de Documentación (Lectura Secuencial)

01-LOGICA-TRABAJO.md:

Define CÓMO pensar antes de codificar.

Reglas de "Cero Parches" y "Atomización".

Uso de Server Actions vs Hooks.

02-ARQUITECTURA-ROLES.md:

Explica DÓNDE va cada archivo.

Sistema de seguridad basado en roles (Admin/Vendor/Technician).

Middleware y redirecciones inteligentes.

03-UI-UX-SHADCN.md:

Estándares visuales (Shadcn/UI, Tailwind).

Reglas de Responsividad (Mobile-First obligatoria).

Animaciones y Feedback.

04-BASE-DATOS-INFRA.md:

Infraestructura Docker local.

Reglas de Prisma (Schema en Inglés).

Data Access Layer.

05-WORKFLOW-DETALLADO.md:

Guía paso a paso para instalar el proyecto desde cero.

"Receta de Cocina" para crear una nueva funcionalidad (Feature) sin romper nada.

06-ESTADO-ACTUAL.md:

Resumen del módulo de Productos, Stock, Reparaciones y Sistema de Notificaciones. ¡LECTURA OBLIGATORIA!

⚠️ Reglas Inquebrantables del Proyecto

Prohibido el Espagueti: Si un archivo page.tsx supera las 100 líneas, está mal diseñado. Atomiza en componentes.

Segregación de Roles: Un vendedor NUNCA debe cargar código de administrador. Usa las carpetas src/app/admin, src/app/vendor, etc.

Base de Datos en Inglés: Las tablas y columnas se nombran en inglés. La UI en español.

Reemplazo Total: Al pedir cambios a la IA, exige el archivo completo. No aceptes instrucciones parciales como "cambia la línea 40".Next.js 16 often throws 'AbortError' when multiple 'next dev' processes are fighting for resources or ports. Make sure to kill all old processes before starting a new one.
