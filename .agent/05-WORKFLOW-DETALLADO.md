05 - Workflow Detallado (Paso a Paso)

Este documento explica cómo inicializar el proyecto y, lo más importante, cómo crear una nueva funcionalidad (Feature) desde cero siguiendo las reglas de atomización.

A. Inicialización del Proyecto (Solo una vez)

Crear App:

npx create-next-app@latest maccell-crm --typescript --tailwind --eslint


Instalar Shadcn:

cd maccell-crm
npx shadcn@latest init


Instalar Librerías Core:

npm install framer-motion lucide-react next-themes zod clsx tailwind-merge
npm install -D prisma


Configurar Docker:

Crear docker-compose.yml (Ver archivo proporcionado).

Ejecutar docker-compose up -d.

Configurar Prisma:

npx prisma init

Configurar .env con la URL de Postgres.

Definir modelos en prisma/schema.prisma.

npx prisma db push.

Crear Estructura de Carpetas:

Crear directorios src/app/admin, src/app/vendor, etc.

B. "La Receta": Cómo crear una Feature Nueva

Supongamos que queremos crear el módulo de "Gestión de Proveedores" para el Administrador. Sigue estos pasos en orden estricto:

Paso 1: Definir Datos (Backend)

Abre prisma/schema.prisma.

Agrega el modelo Supplier (en inglés).

Ejecuta npx prisma db push.

Paso 2: Crear Lógica de Servidor (Actions)

Crea el archivo src/lib/actions/supplier-actions.ts.

Escribe funciones asíncronas:

getSuppliers()

createSupplier(data)

updateSupplier(id, data)

deleteSupplier(id)

Asegúrate de agregar revalidatePath('/admin/proveedores') al final de las mutaciones para refrescar la UI.

Paso 3: Crear Componentes UI (Atomizados)

Crea la carpeta src/app/admin/proveedores/_components/. Dentro crea:

supplier-table.tsx:

Recibe data como prop.

Usa Shadcn Table.

Implementa hidden md:table-cell para móvil.

supplier-form.tsx:

Usa react-hook-form y zod.

Llama a la Server Action createSupplier en el onSubmit.

supplier-dialog.tsx:

Un modal que contiene el formulario para crear/editar.

Paso 4: Ensamblar la Página (Page)

Crea src/app/admin/proveedores/page.tsx.

import { getSuppliers } from "@/actions/supplier-actions"
import { SupplierTable } from "./_components/supplier-table"
import { SupplierDialog } from "./_components/supplier-dialog"

export default async function ProveedoresPage() {
  // 1. Obtener datos (Server Side)
  const suppliers = await getSuppliers()

  // 2. Renderizar
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Proveedores</h1>
        <SupplierDialog /> {/* Botón de Crear */}
      </div>
      
      {/* Tabla con datos pasados como props */}
      <SupplierTable data={suppliers} />
    </div>
  )
}


Paso 5: Testear Responsividad

Abre el navegador en modo desarrollador.

Verifica vista móvil (iPhone SE). ¿Se rompe la tabla? -> Oculta columnas.

Verifica Modo Oscuro.

Siguiendo esta receta, el código nunca se mezclará y siempre sabrás dónde buscar un error.