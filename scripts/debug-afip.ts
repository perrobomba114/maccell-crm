
import dotenv from 'dotenv';
import { Arca } from '@arcasdk/core';
import fs from 'fs';
import path from 'path';

// Load Environment
dotenv.config();

console.log("=== ARCA DIAGNOSTIC ===");
const PRODUCTION = String(process.env.AFIP_PRODUCTION).toLowerCase() === 'true';
const CUIT = parseInt(process.env.AFIP_CUIT || '0');
console.log(`ENV PRODUCTION: ${PRODUCTION}`);
console.log(`ENV CUIT: ${CUIT}`);

const certDir = path.resolve(process.cwd(), 'afip-certs');
const certPath = path.join(certDir, process.env.AFIP_CERT || 'cert.pem');
const keyPath = path.join(certDir, process.env.AFIP_KEY || 'key.pem');

async function run() {
    try {
        console.log("Reading certificates...");
        const certContent = fs.readFileSync(certPath, 'utf8');
        const keyContent = fs.readFileSync(keyPath, 'utf8');

        console.log("Initializing ARCA...");
        const arca = new Arca({
            cuit: CUIT,
            cert: certContent,
            key: keyContent,
            production: PRODUCTION,
            useSoap12: false,
            useHttpsAgent: true
        });

        // 1. Check Server Status
        console.log("\n--- Checking Server Status (Electronic Billing) ---");
        const status = await arca.electronicBillingService.getServerStatus();
        console.log("✅ Server Status:", JSON.stringify(status, null, 2));

        // 2. Check Padrón A13
        console.log("\n--- Checking Padrón A13 ---");
        const details = await arca.registerScopeThirteenService.getTaxpayerDetails(CUIT);
        console.log("✅ Padrón A13 Details:", JSON.stringify(details, null, 2));

        console.log("\n✅ DIAGNOSTIC COMPLETE: SUCCESS");

    } catch (error: any) {
        console.error("\n❌ DIAGNOSTIC FAILED");
        console.error(error);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    }
}

run();
