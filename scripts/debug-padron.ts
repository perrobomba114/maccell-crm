
import { getTaxpayerDetails } from "../src/lib/afip";
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const cuit = 20307204933;
    console.log(`🔍 Querying AFIP Padron for CUIT: ${cuit}`);

    try {
        const result = await getTaxpayerDetails(cuit);
        console.log("---------------------------------------------------");
        console.log("RESULTADO PROCESADO:");
        console.log(JSON.stringify(result, null, 2));
        console.log("---------------------------------------------------");

        // Note: The raw response is logged inside getTaxpayerDetails in src/lib/afip.ts
        // but we might want to see the specific taxes array if the function returns it or if we modify the function to expose it.
        // For now, looking at the processed result + standard logs will help.
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
