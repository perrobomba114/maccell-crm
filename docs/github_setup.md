# 🛠️ Guía Paso a Paso: Subir Maccell CRM a GitHub

Esta guía te ayudará a configurar Git y subir todo tu proyecto a un repositorio de GitHub de forma limpia y segura, corrigiendo errores de configuración inicial.

---

## 1. Configuración de Identidad (Esencial)
Antes de subir nada, Git necesita saber quién eres. Ejecuta estos comandos en la **Terminal** de VS Code uno por uno:

1.  **Configura tu nombre**:
    ```bash
    git config --global user.name "Tu Nombre"
    ```
2.  **Configura tu correo** (el mismo de tu cuenta de GitHub):
    ```bash
    git config --global user.email "tu@email.com"
    ```

---

## 2. Preparar los Archivos para el Primer Envío
Tu proyecto ya tiene Git iniciado, pero hay muchos archivos nuevos que no han sido registrados.

1.  **Añadir todos los archivos nuevos y cambios**:
    ```bash
    git add .
    ```
    *(Esto "prepara" todos los archivos para ser subidos).*

2.  **Crear el primer registro (Commit)**:
    ```bash
    git commit -m "Primer guardado: Estructura base y guías de despliegue"
    ```

---

## 3. Crear el Repositorio en la Nube (GitHub)
Ahora debemos crear el espacio en internet donde vivirá el código:

1.  Entra a [github.com](https://github.com/) e inicia sesión.
2.  Haz clic en el botón verde **"New"** (o en el icono **+** arriba a la derecha -> **New repository**).
3.  **Repository name**: Escribe `maccell-crm`.
4.  **Public/Private**: Elige **Private** (Recomendado para proteger tus accesos a DB).
5.  **IMPORTANTE**: No marques ninguna casilla de "Initialize this repository with..." (ni README, ni .gitignore, ni license). Déjalo vacío.
6.  Haz clic en **"Create repository"**.

---

## 4. Vincular tu Computadora con GitHub
Al crear el repo, GitHub te mostrará una página con comandos. Busca la sección que dice **"...or push an existing repository from the command line"** y copia los comandos, o ejecútalos así:

1.  **Vincular el servidor**:
    *(Copia la URL que te da GitHub, se ve así: `https://github.com/TU_USUARIO/maccell-crm.git`)*
    ```bash
    git remote add origin https://github.com/TU_USUARIO/maccell-crm.git
    ```

2.  **Asegurar que la rama se llame main**:
    ```bash
    git branch -M main
    ```

---

## 5. Subir el Código (Push)
Finalmente, envía tus archivos a la nube:

1.  **Subir archivos**:
    ```bash
    git push -u origin main
    ```

2.  **Autenticación**:
    *   Si es la primera vez, se abrirá una ventana en tu navegador pidiendo permiso.
    *   Haz clic en **"Authorize GitHub"**.

---

## 🏁 ¡Listo!
Ahora puedes entrar a tu página de GitHub y verás todos tus archivos allí.

### ¿Qué hacer si hay cambios nuevos en el futuro?
Cada vez que hagas un cambio y quieras subirlo, solo necesitas 3 comandos:
```bash
git add .
git commit -m "Descripción de lo que cambiaste"
git push
```

---

### 🚨 Solución a errores comunes
*   **"Error: remote origin already exists"**: Significa que ya habías intentado vincularlo. Corrígelo con:
    `git remote remove origin` y luego vuelve al Paso 4.
*   **"Permission denied"**: Asegúrate de que el email del Paso 1 sea el mismo de tu cuenta de GitHub.
