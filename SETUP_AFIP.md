# Guía de Configuración AFIP (Local y Producción)

Esta guía explica cómo configurar los certificados y variables de entorno para la facturación electrónica, tanto en tu computadora (Local) como en Producción (GitHub/Vercel), **sin comprometer la seguridad**.

---

## 🔒 1. Configuración Local (Tu PC)

Para trabajar localmente, usamos archivos físicos. **Estos archivos NO se subirán a GitHub** (ya están ignorados en `.gitignore`).

### Pasos:
1.  **Carpeta de Certificados**:
    Asegurate de que existe la carpeta `afip-certs` en la raíz del proyecto (ya fue creada).
2.  **Archivos**:
    Copia tus archivos descargados de AFIP dentro de esa carpeta con estos nombres exactos:
    - `cert.pem`
    - `key.pem`
3.  **Variables de Entorno (.env)**:
    Abre tu archivo `.env` y agrega tu CUIT:
    ```env
    AFIP_CUIT=20123456789
    AFIP_PRODUCTION=false  # Pon true cuando estés listo para producción
    ```

¡Listo! El sistema leerá automáticamente los archivos de la carpeta `afip-certs`.

---

## ☁️ 2. Configuración en GitHub / Producción (Vercel)

Para subir tu proyecto a internet (Vercel) o usar GitHub Actions, **NO debes subir los archivos .pem**. En su lugar, usaremos **Variables de Entorno**.

### Pasos:
1.  **Codificar Certificados (Opcional pero recomendado)**:
    Para evitar problemas con los saltos de línea al copiar y pegar, es mejor convertir los archivos a Base64.
    
    En tu terminal (Mac/Linux), ejecuta:
    ```bash
    base64 -i afip-certs/cert.pem
    ```
    *(Copia el resultado largo que sale en pantalla)*

    Luego haz lo mismo para la llave:
    ```bash
    base64 -i afip-certs/key.pem
    ```

2.  **Agregar Variables en Vercel / GitHub**:
    Ve a la sección **Settings > Environment Variables** de tu plataforma y agrega:

    | Nombre | Valor |
    |--------|-------|
    | `AFIP_CUIT` | Tu número de CUIT (ej. 20123456789) |
    | `AFIP_PRODUCTION` | `true` (para facturas reales) |
    | `AFIP_CERT` | Pega el contenido del certificado (Text o Base64) |
    | `AFIP_KEY` | Pega el contenido de la llave (Text o Base64) |

### ¿Cómo funciona?
El sistema está programado para intentar leer los archivos fisicos primero. Si no los encuentra (como pasa en la nube), buscará estas variables de entorno (`AFIP_CERT` y `AFIP_KEY`), creará los archivos temporales necesarios automáticamente y conectará con AFIP.

---

## ⚠️ Seguridad
- Nunca elimines `afip-certs/` del archivo `.gitignore`.
- Nunca compartas tus archivos `.key` con nadie.
