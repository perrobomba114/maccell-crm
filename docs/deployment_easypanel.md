# 🚀 Guía Ultra-Detallada: Despliegue de Maccell CRM en Easypanel

Esta guía está diseñada para que cualquier persona, siguiendo los pasos numerados, pueda desplegar el sistema en **DonWeb Cloud** usando **Easypanel** sin cometer errores técnicos.

---

## 📋 Requisitos Previos (Antes de empezar)
1.  **Easypanel**: Tenerlo instalado y accesible (normalmente en `http://IP-DE-TU-SERVER:3000`).
2.  **GitHub/GitLab**: El código de `maccell-crm` debe estar subido a un repositorio privado o público.
3.  **Dominio**: Tener un subdominio (ej: `crm.tudominio.com`) apuntando a la IP de tu servidor DonWeb mediante un registro A.

---

## 🪜 Paso a Paso Completo

### 1. Crear el Proyecto Contenedor
1.  Entra a tu panel de Easypanel.
2.  En el menú lateral izquierdo, haz clic en **"Projects"**.
3.  Haz clic en el botón azul **"+ Create Project"** (arriba a la derecha).
4.  En "Name", escribe exactamente: `maccell-crm`.
5.  Haz clic en **"Create"**.

### 2. Desplegar la Base de Datos (PostgreSQL)
1.  Dentro del proyecto `maccell-crm`, haz clic en **"+ Add Service"**.
2.  Selecciona la opción **"Database"**.
3.  Busca y selecciona **"Postgres"**.
4.  **Configuración del Servicio**:
    *   **Name**: Déjalo como `postgres`.
    *   **Image**: Selecciona `postgres:15-alpine` (es la más estable y ligera).
5.  Haz clic en **"Create"**.
6.  Ahora estarás en la pantalla del servicio Postgres. Haz clic en el botón verde **"Deploy"** y espera a que diga "Running".
7.  **IMPORTANTE (No te saltes esto)**: 
    *   Ve a la pestaña **"Environment"**.
    *   Busca la variable que dice `DATABASE_URL`. Easypanel la genera sola (ej: `postgres://user:pass@PROJECT_NAME-postgres:5432/db`).
    *   **Cópiala en un bloc de notas**. La usaremos en el paso 4.

### 3. Crear el Servicio de la Aplicación
1.  Vuelve a la pantalla principal del proyecto `maccell-crm`.
2.  Haz clic en **"+ Add Service"**.
3.  Selecciona la opción **"App"**.
4.  En "Name", escribe: `crm-app`.
5.  Haz clic en **"Create"**.

### 4. Conectar tu Repositorio de Código
1.  Dentro del servicio `crm-app`, ve a la pestaña **"Source"**.
2.  Selecciona **"GitHub"** (u otro).
3.  Haz clic en **"Connect GitHub"** y autoriza a Easypanel.
4.  **Repo**: Busca y selecciona `maccell-crm`.
5.  **Branch**: Escribe `main` (o la rama donde esté tu código final).
6.  Haz clic en **"Save"**.

### 5. Configurar Variables de Entorno (El "motor" de la app)
1.  En el servicio `crm-app`, ve a la pestaña **"Environment"**.
2.  Añade las siguientes variables una por una (clic en "+ Add Environment Variable"):
    *   **DATABASE_URL**: Pega la URL que copiaste en el Paso 2 (ej: `postgres://user:pass@maccell-crm-postgres:5432/db`).
    *   **NODE_ENV**: Escribe `production`.
    *   **NEXT_PUBLIC_APP_URL**: Escribe `https://tu-subdominio.com`.
3.  Haz clic en **"Save"**.

### 6. Configuración de Construcción (Nixpacks)
1.  En la misma pantalla, ve a la pestaña **"Build"**.
2.  En **"Build Method"**, asegúrate de que esté seleccionado **"Nixpacks"**.
3.  Easypanel detectará automáticamente que es Next.js. Si te pide comandos manuales, usa estos:
    *   **Install Command**: `npm install`
    *   **Build Command**: `npm run build`
    *   **Start Command**: `npm run start`
4.  Haz clic en **"Save"**.

### 7. Configurar el Dominio y SSL
1.  Ve a la pestaña **"Domains"**.
2.  Haz clic en **"+ Add Domain"**.
3.  En "Host", escribe tu subdominio completo (ej: `crm.tusitio.com`).
4.  **Port**: Escribe `3000` (es el puerto por defecto de Next.js).
5.  **HTTPS**: Asegúrate de que la casilla de HTTPS esté marcada. Easypanel activará **Let's Encrypt** automáticamente.
6.  Haz clic en **"Save"**.

### 8. Configurar Almacenamiento Persistente (Fotos y Perfiles)
*Sin este paso, si el servidor se reinicia, perderás las fotos que subas.*
1.  Ve a la pestaña **"Storage"**.
2.  Haz clic en **"+ Add Mount"**.
3.  **Primer Volumen (Sucursales)**:
    *   **Mount Type**: `Volume`
    *   **Name**: `v-branches`
    *   **Mount Path**: `/app/public/branches`
4.  Haz clic en **"+ Add Mount"** de nuevo.
5.  **Segundo Volumen (Perfiles)**:
    *   **Mount Type**: `Volume`
    *   **Name**: `v-profiles`
    *   **Mount Path**: `/app/public/profiles`
6.  Haz clic en **"Save"**.

### 9. Automatizar las Migraciones de Base de Datos
1.  Ve a la pestaña **"Deploy"**.
2.  Busca el campo **"Post-deployment Command"**.
3.  Escribe: `npx prisma migrate deploy`
    *   *Esto asegura que cada vez que actualices el sistema, las tablas se creen solas.*
4.  Haz clic en **"Save"**.

### 10. Despliegue Final
1.  Haz clic en el botón grande y verde que dice **"Deploy"** (arriba a la derecha).
2.  Haz clic en la pestaña **"Logs"** para ver el progreso.
    *   Verás como descarga las dependencias y hace el "build".
3.  Cuando veas el mensaje `Ready on http://localhost:3000`, significa que terminó con éxito.

---

## 🏁 Verificación de Funcionamiento
1.  Abre tu navegador en `https://tu-subdominio.com`.
2.  Deberías ver la pantalla de login.
3.  Prueba subir una imagen de perfil en tu cuenta para verificar que el **Paso 8 (Storage)** funciona correctamente.

## 🛠️ Solución de Errores Comunes
*   **Error "Prisma Client not initialized"**: Asegúrate de que el comando `npx prisma generate` se ejecute durante el build. Nixpacks suele hacerlo solo, pero si falla, puedes añadirlo al "Build Command" como: `npx prisma generate && npm run build`.
*   **Out of Memory (RAM)**: Si el build falla en DonWeb, ve a la pestaña **"Resources"** de la app y aumenta el **Memory Limit** temporalmente a `2GB`.
*   **SSL Pendiente**: Si tu dominio no carga, espera 5 minutos; Let's Encrypt tarda un poco en validar el certificado la primera vez.
