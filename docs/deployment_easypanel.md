# �️ GUÍA DEFINITIVA: Despliegue de Maccell CRM en Easypanel (Paso a Paso)

Si es la primera vez que usas Easypanel, esta guía te llevará de la mano. Sigue los números en orden y no te saltes ninguno.

---

## 🏗️ PASO 1: Crear el Espacio de Trabajo
1.  Entra a tu Easypanel (ej: `http://TU_IP:3000`).
2.  En el menú de la izquierda, haz clic en **"Projects"**.
3.  Haz clic en el botón superior derecho **"+ Create Project"**.
4.  Nombre: `maccell-crm`. Haz clic en **"Create"**.

---

## 🗄️ PASO 2: Configurar la Base de Datos (Postgres)
1.  Dentro del proyecto, haz clic en el botón central **"Add Service"**.
2.  Selecciona **"Database"** y luego busca **"Postgres"**.
3.  **Nombre**: Ponle `postgres` (muy importante para la URL luego).
4.  En la pantalla que aparece, haz clic en el botón verde **"Deploy"** arriba a la derecha.
5.  **Obtener la URL**: Cuando diga "Running", ve a la pestaña **"Environment"** de este servicio Postgres. Copia la variable `DATABASE_URL` (puedes hacer clic en el mini icono de copiar).

---

## 🚀 PASO 3: Configurar la Aplicación (El Corazón del Sistema)
1.  Vuelve a la pantalla principal del proyecto (haciendo clic en el nombre `maccell-crm` arriba).
2.  Haz clic en **"Add Service"** -> **"App"**.
3.  **Nombre**: Ponle `app-crm`. Haz clic en **"Create"**.

Ahora verás una pantalla con varias pestañas arriba (General, Source, Build, etc.). **Vamos a configurarlas una por una:**

### A - Pestaña "SOURCE" (De dónde viene el código)
1.  Selecciona **"GitHub"**.
2.  Pega tu link: `https://github.com/perrobomba114/maccell-crm.git`
3.  En "Branch", asegúrate que diga `main`.
4.  Haz clic en el botón **"Save"** que está abajo.

### B - Pestaña "ENVIRONMENT" (Las llaves del sistema)
1.  Haz clic en **"+ Add Environment Variable"**.
2.  **Key**: `DATABASE_URL` | **Value**: (Pega aquí la URL que copiaste en el Paso 2).
    *   *Nota: Si tu contraseña tiene $, asegúrate de usar la versión codificada que te pasé antes.*
3.  Añade otra variable: **Key**: `NODE_ENV` | **Value**: `production`.
4.  Haz clic en **"Save"**.

### C - Pestaña "BUILD" (Cómo se arma el programa) - CRUCIAL
1.  En "Build Method", elige **"Nixpacks"**.
2.  Busca el campo **"Install Command"** y escribe exactamente esto:
    `npm install --legacy-peer-deps`
3.  Busca el campo **"Build Command"** y escribe:
    `npm run build`
4.  Busca el campo **"Start Command"** y escribe:
    `npx prisma generate && npx prisma migrate deploy && npm run start`
    *(Esto hace que se creen las tablas de la base de datos automáticamente al encender).*
5.  Haz clic en **"Save"**.

### D - Pestaña "RESOURCES" (La potencia del servidor)
1.  Busca el campo **"Memory Limit (MB)"**.
2.  Borra el numero que tenga y escribe: **`2048`**.
    *   *Si dejas menos de esto, el servidor de DonWeb "matará" la instalación porque se queda sin fuerza.*
3.  Haz clic en **"Save"**.

### E - Pestaña "DOMAINS" (Tu dirección web)
1.  Haz clic en **"+ Add Domain"**.
2.  En **"Host"**, pon tu subdominio (ej: `crm.tusitio.com`).
3.  Asegúrate que la casilla **"HTTPS"** esté marcada.
4.  En **"Port"**, pon **`3000`**.
5.  Haz clic en **"Save"**.

---

## 🏁 PASO 4: El Despliegue Final
1.  Una vez configurado todo lo anterior, haz clic en el botón grande verde **"Deploy"** (arriba a la derecha).
2.  **Cómo saber si va bien**: Haz clic en la pestaña **"Deployments"**. Verás un registro nuevo. Haz clic en él para ver las letras blancas en el cuadro negro.
3.  **Si ves errores**: Copia esas letras y pásamelas. Si todo sale bien, al final dirá "Running" y podrás entrar a tu web.

---

## 🛠️ ¿Cómo sé si el proyecto está "bien cargado"?
*   Si en los logs de **Deployments** ves que Easypanel descarga archivos de GitHub con éxito, está bien cargado.
*   Si el error es "No such image", es que falló el paso de **BUILD** (revisa el Paso 3-C y 3-D de esta guía).
