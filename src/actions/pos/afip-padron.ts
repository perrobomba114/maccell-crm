"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { getTaxpayerDetails } from "@/lib/afip";

export async function getAfipPadronData(cuit: string) {
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };
    
    const cleanCuit = cuit.replace(/\D/g, "");
    if (cleanCuit.length !== 11) {
        return { success: false, error: "CUIT inválido (debe tener 11 números)" };
    }

    const cuitNum = parseFloat(cleanCuit);

    return await getTaxpayerDetails(cuitNum);
}
