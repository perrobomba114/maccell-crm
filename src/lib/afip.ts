import { Arca } from '@arcasdk/core';
import fs from 'fs';
import path from 'path';

// Environment variables
const PRODUCTION = String(process.env.AFIP_PRODUCTION).toLowerCase() === 'true';
const CUIT = parseInt(process.env.AFIP_CUIT || '0');

console.log(`[AFIP] Initializing Client. Production: ${PRODUCTION} (Env: ${process.env.AFIP_PRODUCTION})`);

export async function getAfipClient() {
    // Resolve certificate paths
    const certDir = path.resolve(process.cwd(), 'afip-certs');
    const certPath = path.join(certDir, process.env.AFIP_CERT || 'cert.pem');
    const keyPath = path.join(certDir, process.env.AFIP_KEY || 'key.pem');

    // Read certificate contents (REQUIRED for @arcasdk/core)
    let certContent = '';
    let keyContent = '';

    try {
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            certContent = fs.readFileSync(certPath, 'utf8');
            keyContent = fs.readFileSync(keyPath, 'utf8');
        } else if (process.env.AFIP_CERT && process.env.AFIP_KEY) {
            // Fallback to ENV vars
            certContent = process.env.AFIP_CERT;
            keyContent = process.env.AFIP_KEY;

            // Handle Base64 from ENV if needed
            if (!certContent.includes('BEGIN CERTIFICATE')) {
                certContent = Buffer.from(certContent, 'base64').toString('utf-8');
            }
            if (!keyContent.includes('BEGIN PRIVATE KEY')) {
                keyContent = Buffer.from(keyContent, 'base64').toString('utf-8');
            }
        } else {
            throw new Error(`Certificates not found at ${certPath} and not in ENV.`);
        }

    } catch (error) {
        console.error("❌ Error reading certificates:", error);
        throw new Error("Could not read AFIP certificates.");
    }

    // Initialize ARCA Client
    const arca = new Arca({
        cuit: CUIT,
        cert: certContent,
        key: keyContent,
        production: PRODUCTION,
        useSoap12: false,
        useHttpsAgent: true // REQUIRED for Node.js > 18 to handle AFIP legacy ciphers (dh key too small)
    });

    return arca;
}

export async function getServerStatus() {
    try {
        const arca = await getAfipClient();
        const status = await arca.electronicBillingService.getServerStatus();
        return { success: true, status };
    } catch (error: any) {
        console.error('Error checking AFIP status:', error);
        return { success: false, error: error.message || String(error) };
    }
}

/**
 * Get Last Voucher Number
 */
export async function getLastVoucher(salesPoint: number, type: number) {
    try {
        const arca = await getAfipClient();
        const last = await arca.electronicBillingService.getLastVoucher(salesPoint, type);
        return { success: true, lastVoucher: last.cbteNro };
    } catch (error: any) {
        console.error("AFIP LastVoucher Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Create Invoice
 */
export async function createAfipInvoice(data: {
    salesPoint: number;
    type: number; // 1=A, 6=B, 11=C
    concept: number; // 1=Products, 2=Services, 3=Products and Services
    docType: number; // 80=CUIT, 96=DNI, 99=Consumidor Final
    docNumber: number; // Customer ID
    cbteDesde: number; // Usually last + 1 - Ignored by createNextVoucher
    cbteHasta: number; // Same as desde - Ignored by createNextVoucher
    amount: number; // Total
    vatAmount: number; // Importe IVA
    netAmount: number; // Importe Neto
    exemptAmount: number; // Exempt
    serviceDateFrom?: string;
    serviceDateTo?: string;
    paymentDueDate?: string;
}) {
    try {
        const arca = await getAfipClient();

        // Construct payload for createNextVoucher (INextVoucher)
        const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');

        // Prepare IVA array
        // NOTE: This logic assumes a single VAT rate (21% or similar) or simplifies the split.
        // If your business logic supports multiple VAT rates, you need to pass them in 'data'.
        // For now, we replicate previous simple logic: One IVA block if amount > 0.

        const ivaArray = [];
        if (data.vatAmount > 0) {
            // Check based on rate? 
            // Warning: We are hardcoding ID 5 (21%) for now as per previous code implies standard VAT.
            // Ideally should be dynamic.
            ivaArray.push({
                'Id': 5,
                'BaseImp': data.netAmount,
                'Importe': data.vatAmount
            });
        }

        const payload: any = {
            'CantReg': 1,
            'PtoVta': data.salesPoint,
            'CbteTipo': data.type,
            'Concepto': data.concept,
            'DocTipo': data.docType,
            'DocNro': data.docNumber,
            'CbteFch': parseInt(date),
            'ImpTotal': data.amount,
            'ImpTotConc': 0,
            'ImpNeto': data.netAmount,
            'ImpOpEx': data.exemptAmount,
            'ImpIVA': data.vatAmount,
            'ImpTrib': 0,
            'MonId': 'PES',
            'MonCotiz': 1
        };

        if (ivaArray.length > 0) {
            payload['Iva'] = ivaArray;
        }

        // If Concept is Service (2) or Mixed (3), dates are required
        if (data.concept === 2 || data.concept === 3) {
            if (!data.serviceDateFrom || !data.serviceDateTo || !data.paymentDueDate) {
                throw new Error("Fechas de servicio requeridas para Concepto 2 o 3");
            }
            // Ensure dates are YYYYMMDD number
            payload['FchServDesde'] = data.serviceDateFrom.replace(/-/g, '');
            payload['FchServHasta'] = data.serviceDateTo.replace(/-/g, '');
            payload['FchVtoPago'] = data.paymentDueDate.replace(/-/g, '');
        }

        console.log("Creating Next Voucher with Payload:", JSON.stringify(payload, null, 2));

        const res = await arca.electronicBillingService.createNextVoucher(payload);

        // Response format from @arcasdk/core might differ slightly, verify type ICreateVoucherResult
        return { success: true, data: res };

    } catch (error: any) {
        console.error("AFIP CreateVoucher Error:", error);
        return { success: false, error: error.message || JSON.stringify(error) };
    }
}

/**
 * Get Taxpayer Details (Padrón A13)
 */
export async function getTaxpayerDetails(cuit: number) {
    try {
        const arca = await getAfipClient();
        console.log(`[AFIP] Fetching details for CUIT ${cuit}...`);

        const taxPayer = await arca.registerScopeThirteenService.getTaxpayerDetails(cuit);

        if (!taxPayer) {
            return { success: false, error: "No se encontraron datos para este CUIT." };
        }

        // Helper to safely access data whether it's nested (ARCA SDK) or flat
        const datosGenerales = taxPayer.datosGenerales || taxPayer;
        const datosRegimen = taxPayer.datosRegimenGeneral || taxPayer.datosRegimenGeneral;
        const datosMonotributo = taxPayer.datosMonotributo || taxPayer.datosMonotributo;

        // Extract Name/Business Name
        const name = datosGenerales.razonSocial ||
            (datosGenerales.apellido ? `${datosGenerales.apellido} ${datosGenerales.nombre}` : "") ||
            "Desconocido";

        // Extract Address
        // ARCA SDK might return it as `domicilioFiscal` object or raw array
        const domicilio = datosGenerales.domicilioFiscal || (Array.isArray(taxPayer.domicilio) ? taxPayer.domicilio[0] : taxPayer.domicilio);
        const address = domicilio ? `${domicilio.direccion}, ${domicilio.localidad || ''}, ${domicilio.dscrPcia || ''}` : "";

        // Determine if they can receive Factura A
        // Determine if they can receive Factura A
        // Detectar condición IVA
        let condition = "Consumidor Final";
        let isRespInscripto = false;
        let isMonotributo = !!datosMonotributo;
        let isExento = false;

        // Helper to normalize taxes list (handle array, single object, or different property names)
        const getTaxes = (regimen: any) => {
            if (!regimen) return [];
            const taxes = regimen.impuesto || regimen.impuestos;
            if (Array.isArray(taxes)) return taxes;
            if (taxes && typeof taxes === 'object') return [taxes];
            return [];
        };

        if (isMonotributo) {
            condition = "Monotributo";
        } else {
            // General Regime or Unspecified
            const taxes = getTaxes(datosRegimen);

            // Check for specific taxes
            const hasIVA = taxes.some((i: any) => i.idImpuesto == 30);
            const hasGanancias = taxes.some((i: any) => i.idImpuesto == 10 || i.idImpuesto == 11);
            const hasExento = taxes.some((i: any) => i.idImpuesto == 32); // Some use 32 for Exempt, though strictly it might be Retentions. 
            // Also check for "IVA Exento" via absence of 30 but presence of correct Exempt codes if available.
            // But relying on "Juridica -> RI" fallback is safer for the reported issue.

            if (hasIVA || hasGanancias) {
                // If they have IVA or Ganancias (General Regime), they are likely Responsable Inscripto.
                condition = "Responsable Inscripto";
                isRespInscripto = true;
            } else if (hasExento) {
                condition = "IVA Exento";
                isExento = true;
            } else {
                // Fallback for Companies (Personas Jurídicas)
                // If it's a company and NOT Monotributo, default to Responsable Inscripto.
                // This fixes the issue where companies were defaulting to Exento/Final because of missing explicit tax codes in A13.
                if (taxPayer.tipoPersona === "JURIDICA") {
                    condition = "Responsable Inscripto";
                    isRespInscripto = true;
                } else {
                    // Individuals with no taxes -> Consumidor Final
                    condition = "Consumidor Final";
                }
            }
        }

        // Return structured data
        return {
            success: true,
            data: {
                name,
                address,
                isRespInscripto,
                isMonotributo,
                ivaCondition: condition,
                cuit: cuit
            }
        };

    } catch (error: any) {
        console.error("AFIP Padron Error:", error);
        const message = error.message || "";
        if (message.includes("401") || message.includes("Unauthorized")) {
            return {
                success: false,
                error: "Permiso denegado en AFIP (401). Verifica certificados."
            };
        }
        return { success: false, error: "Error consultando AFIP: " + message };
    }
}
