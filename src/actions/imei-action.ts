"use server";

import * as cheerio from "cheerio";

interface ImeiResult {
    bloqueado: string;
    gsmaStatus: string;
    mensaje_gsma?: string;
    codigo_error?: string;
}

// List of modern User Agents to rotate
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export async function checkImei(imei: string) {
    try {
        const userAgent = getRandomUserAgent();
        const fakeIp = getRandomIP();

        // Headers to mimic organic unique users
        const baseHeaders = {
            "User-Agent": userAgent,
            "X-Forwarded-For": fakeIp,
            "Client-IP": fakeIp,
            "X-Real-IP": fakeIp,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Accept-Language": "es-419,es;q=0.9,en;q=0.8"
        };

        // 1. Fetch initial page to get tokens
        const initialRes = await fetch("https://imei.enacom.gob.ar/", {
            headers: baseHeaders,
            cache: "no-store"
        });

        const html = await initialRes.text();

        // Handle cookies logic
        let cookiesArray: string[] = [];
        const rawCookie = initialRes.headers.get("set-cookie");
        if (rawCookie) {
            // Split cookies safely
            const cookies = rawCookie.split(/,(?=\s*[a-zA-Z0-9_-]+=)/).map(c => c.trim().split(';')[0]);
            cookiesArray = cookies;
        }

        if (cookiesArray.length === 0) {
            // If no cookies, sometimes it's because we are blocked or cached.
            // But let's proceed to see if we can find tokens anyway (unlikely)
            console.error("No cookies received from ENACOM.");
        }

        const cookieHeader = cookiesArray.join('; ');

        // Extract CSRF Token
        const csrfMatch = html.match(/data-csrf="([^"]+)"/);
        const token = csrfMatch ? csrfMatch[1] : null;

        // Extract Livewire Snapshot
        const snapshotMatch = html.match(/wire:snapshot="([^"]+)"/);
        const snapshotRaw = snapshotMatch ? snapshotMatch[1] : null;

        if (!token || !snapshotRaw) {
            // Check if we hit the limit text in HTML
            if (html.includes("límite de 5 consultas") || html.includes("excedido")) {
                throw new Error("Has excedido el límite de consultas ENACOM (IP Bloqueada temporalmente).");
            }
            console.error("Tokens match failed");
            throw new Error("Error al iniciar la sesión con ENACOM (Tokens)");
        }

        const snapshot = snapshotRaw.replace(/&quot;/g, '"');

        // 2. Prepare payload
        const payload = {
            _token: token,
            components: [
                {
                    snapshot: snapshot,
                    updates: { imei: imei },
                    calls: [
                        { path: "", method: "consultar", params: [] }
                    ]
                }
            ]
        };

        // 3. Send request
        const updateRes = await fetch("https://imei.enacom.gob.ar/livewire/update", {
            method: "POST",
            headers: {
                ...baseHeaders,
                "Content-Type": "application/json",
                "Cookie": cookieHeader,
                "X-CSRF-TOKEN": token,
                "X-Livewire": "true",
                "Referer": "https://imei.enacom.gob.ar/",
                "Origin": "https://imei.enacom.gob.ar"
            },
            body: JSON.stringify(payload)
        });

        if (!updateRes.ok) {
            const errorText = await updateRes.text();
            if (updateRes.status === 419) {
                throw new Error("La sesión expiró. Intente nuevamente.");
            }
            if (updateRes.status === 429) {
                throw new Error("Demasiadas consultas. Espere unos minutos.");
            }
            throw new Error(`Error en la respuesta de ENACOM: ${updateRes.status}`);
        }

        const data = await updateRes.json();

        // 4. Parse response
        if (data.components && data.components[0] && data.components[0].snapshot) {
            const returnedSnapshot = JSON.parse(data.components[0].snapshot);
            const resultado = returnedSnapshot.data.resultado;

            // Check for explicit error messages in data
            if (returnedSnapshot.data.error) {
                return { success: false, error: returnedSnapshot.data.error };
            }

            if (resultado && Array.isArray(resultado) && resultado.length > 0) {
                return { success: true, data: resultado[0] as ImeiResult };
            }
        }

        return { success: false, error: "No se encontró información para este IMEI" };

    } catch (error: any) {
        console.error("Error checking IMEI:", error);
        return { success: false, error: error.message || "Error interno del servidor" };
    }
}
