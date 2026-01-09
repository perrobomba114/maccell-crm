
import { getAfipClient } from "../lib/afip";

async function main() {
    const CUIT = 30673377544;
    console.log(`Analyzing CUIT: ${CUIT}`);

    try {
        const arca = await getAfipClient();
        const taxPayer = await arca.registerScopeThirteenService.getTaxpayerDetails(CUIT);
        console.log("Full Object:", JSON.stringify(taxPayer, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
