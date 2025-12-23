04 - Base de Datos e Infraestructura

1. Docker y Entorno Local

Todo el entorno de desarrollo corre sobre Docker para asegurar que todos los desarrolladores tengan las mismas versiones de base de datos.

Archivo: docker-compose.yml (en la raíz).

Servicio: PostgreSQL 15 Alpine.

Volumen: Persistente (no pierdes datos al apagar el contenedor).

Para iniciar el entorno:

docker-compose up -d


2. Prisma ORM (La única fuente de verdad)

Archivo: prisma/schema.prisma.

Regla de Idioma: El esquema de base de datos DEBE estar en INGLÉS.

Tablas Core: User, Branch, Role (Enum).

Tablas Negocio: Product, Category, ProductStock, StockTransfer, Sale, Ticket.

Tablas Reparaciones: Repair, Customer, RepairStatus, RepairObservation, RepairPart, SparePart.

Tablas Sistema: Notification.

Columnas: firstName, price, createdAt.

Sincronización: Cada vez que modifiques el schema.prisma:

npx prisma db push


3. Data Access Layer (DAL)

Aunque usamos Prisma directamente en Server Actions simples, para consultas complejas o repetitivas, se recomienda crear funciones reutilizables en `src/lib/services/` (Data Access Layer).

Ejemplo: `customerService.findOrCreate(...)` en `src/lib/services/customers.ts`

4. Tipado (TypeScript + Zod)

Jamás usar any.

Prisma genera los tipos automáticamente (User, Product).

Para validar formularios (entradas de usuario), USAR ZOD.

Validar en el cliente (antes de enviar).

Validar en el servidor (dentro de la Server Action) por seguridad.