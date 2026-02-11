"use server";

import net from "net";
import os from "os";

export type PrinterDiscoveryResult = {
    ip: string;
    hostname?: string;
};

import dgram from "dgram";

/**
 * Scans the local network for devices with port 9100 open (common for printers).
 * Now scans ALL non-internal IPv4 subnets found on the host.
 */
export async function scanForPrinters(): Promise<{ success: boolean; printers: PrinterDiscoveryResult[]; error?: string }> {
    try {
        const interfaces = os.networkInterfaces();
        const subnetPrefixes: string[] = [];

        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (!iface) continue;
            for (const alias of iface) {
                if (alias.family === "IPv4" && !alias.internal) {
                    const parts = alias.address.split(".");
                    if (parts.length === 4) {
                        const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
                        if (!subnetPrefixes.includes(prefix)) {
                            subnetPrefixes.push(prefix);
                        }
                    }
                }
            }
        }

        if (subnetPrefixes.length === 0) {
            return { success: false, printers: [], error: "No se pudo determinar ninguna subred local." };
        }

        const foundPrinters = new Map<string, PrinterDiscoveryResult>();

        // 1. Try UDP Discovery (Zebra specific)
        const udpPrinters = await discoverZebraUDP();
        udpPrinters.forEach(p => foundPrinters.set(p.ip, p));

        // 2. TCP Port Scan (Fallback/Complement)
        // If we already found some via UDP, we still scan to be thorough, 
        // but maybe we can be more selective. For now, let's scan all prefixes.
        const port = 9100;
        const timeout = 400; // Increased timeout slightly for reliability

        for (const prefix of subnetPrefixes) {
            const scanPromises = [];
            for (let i = 1; i < 255; i++) {
                const ip = `${prefix}.${i}`;
                scanPromises.push(checkPort(ip, port, timeout));
            }

            const results = await Promise.all(scanPromises);
            results.forEach(res => {
                if (res.open && !foundPrinters.has(res.ip)) {
                    foundPrinters.set(res.ip, { ip: res.ip });
                }
            });
        }

        return { success: true, printers: Array.from(foundPrinters.values()) };

    } catch (error) {
        console.error("Error scanning printers:", error);
        return { success: false, printers: [], error: "Error interno al escanear la red." };
    }
}

/**
 * Discovers Zebra printers using UDP broadcast on port 4201.
 */
async function discoverZebraUDP(): Promise<PrinterDiscoveryResult[]> {
    return new Promise((resolve) => {
        const printers: PrinterDiscoveryResult[] = [];
        const client = dgram.createSocket("udp4");

        // Discovery packet: magic bytes for Zebra
        const message = Buffer.from([0x2e, 0x2c, 0x3a, 0x01, 0x00, 0x00]);

        client.on("message", (msg, rinfo) => {
            // Response starts with 0x3a2c2e
            if (msg.length >= 3 && msg[0] === 0x3a && msg[1] === 0x2c && msg[2] === 0x2e) {
                printers.push({ ip: rinfo.address });
            }
        });

        client.on("error", (err) => {
            console.error("UDP Discovery Error:", err);
        });

        client.bind(0, () => {
            client.setBroadcast(true);
            // Broadcast to 255.255.255.255
            client.send(message, 0, message.length, 4201, "255.255.255.255");

            // Wait 1.5 seconds for responses
            setTimeout(() => {
                client.close();
                resolve(printers);
            }, 1500);
        });
    });
}

function checkPort(ip: string, port: number, timeout: number): Promise<{ ip: string; open: boolean }> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;

        socket.setTimeout(timeout);

        socket.on("connect", () => {
            status = true;
            socket.destroy();
        });

        socket.on("timeout", () => {
            socket.destroy();
        });

        socket.on("error", () => {
            // connection refused or other error
            socket.destroy();
        });

        socket.on("close", () => {
            resolve({ ip, open: status });
        });

        socket.connect(port, ip);
    });
}

/**
 * Sends raw ZPL code to the specified printer IP on port 9100.
 */
export async function printLabelZPL(printerIp: string, zplData: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
        const client = new net.Socket();
        const port = 9100;

        // Set a reasonable timeout for the print connection
        client.setTimeout(5000);

        client.connect(port, printerIp, () => {
            client.write(zplData, () => {
                client.end(); // Close after writing
                resolve({ success: true });
            });
        });

        client.on("timeout", () => {
            client.destroy();
            resolve({ success: false, error: "Tiempo de espera agotado al conectar con la impresora." });
        });

        client.on("error", (err) => {
            client.destroy();
            resolve({ success: false, error: `Error de conexión: ${err.message}` });
        });
    });
}
// ... imports
import fs from "fs";
import path from "path";

// ... existing code

/**
 * Uploads the custom font (maccell.ttf) to the printer's E: drive (Flash memory).
 * This uses the ~DY command to download the file.
 */
export async function uploadFontToPrinter(printerIp: string): Promise<{ success: boolean; error?: string }> {
    try {
        const fontPath = path.join(process.cwd(), "public/fonts/maccell.ttf");

        if (!fs.existsSync(fontPath)) {
            return { success: false, error: "Archivo de fuente no encontrado en el servidor." };
        }

        const fontBuffer = fs.readFileSync(fontPath);
        const fileSize = fontBuffer.length;

        // ZPL Command ~DY: Download Object
        // Format: ~DYd:f,b,x,t,w,data
        // d: device (E for Flash)
        // f: file name (MACCELL) - Extension is implied by 't' but usually we just name it filename
        // b: format (T for TrueType) -> Actually 'B' for binary is safer, or 'P' for protected? 
        // Let's use generic binary download:
        // ~DYE:MACCELL.TTF,B,T,${fileSize},,${data}

        // NOTE: For fonts, standard practice in node is often to hex encode or base64, 
        // but raw socket write supports buffers. We need to construct a buffer.

        const header = `~DYE:MACCELL.TTF,B,T,${fileSize},,`;
        const headerBuffer = Buffer.from(header);

        // Combine header + file + footer (footer usually not needed for ~DY but can send a check)
        // We'll just send the raw command.

        const totalBuffer = Buffer.concat([headerBuffer, fontBuffer]);

        return new Promise((resolve) => {
            const client = new net.Socket();
            client.setTimeout(10000); // 10s for large file upload

            client.connect(9100, printerIp, () => {
                client.write(totalBuffer, () => {
                    client.end();
                    resolve({ success: true });
                });
            });

            client.on("error", (err) => {
                resolve({ success: false, error: err.message });
            });

            client.on("timeout", () => {
                client.destroy();
                resolve({ success: false, error: "Timeout al enviar fuente" });
            });
        });

    } catch (e: any) {
        console.error("Error uploading font:", e);
        return { success: false, error: e.message };
    }
}
