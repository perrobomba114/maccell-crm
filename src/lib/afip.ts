import { Arca } from '@arcasdk/core';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { constants } from 'crypto';
import tls from 'tls';

// --- NUCLEAR FIX FOR AFIP SSL ERROR (DH KEY TOO SMALL) ---
// Monkey-patch tls.createSecureContext to force legacy settings globally.
// This is necessary because some libraries (like node-soap used by AFIP SDKs) 
// might not forward custom agent options correctly to the low-level TLS socket.
const origCreateSecureContext = tls.createSecureContext;
(tls as any).createSecureContext = function (options: any) {
    if (!options) options = {};
    // Force legacy ciphers and lower security level
    options.ciphers = 'DEFAULT:@SECLEVEL=0';
    options.minVersion = 'TLSv1';
    // Force legacy server connect behavior
    options.secureOptions = (options.secureOptions || 0) | constants.SSL_OP_LEGACY_SERVER_CONNECT;
    return origCreateSecureContext.call(tls, options);
};

// Patch Global Agent as well just in case
try {
    https.globalAgent.options.ciphers = 'DEFAULT:@SECLEVEL=0';
    https.globalAgent.options.minVersion = 'TLSv1';
} catch (e) {
    console.warn("Could not set global https agent options", e);
}

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
            if (!certContent.includes('-----BEGIN')) {
                certContent = Buffer.from(certContent, 'base64').toString('utf-8');
            }
            if (!keyContent.includes('-----BEGIN')) {
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
        useHttpsAgent: true,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        minVersion: 'TLSv1',
        secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
        rejectUnauthorized: false
    } as any);

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

        const res = await arca.electronicBillingService.createNextVoucher(payload) as any;
        console.log("AFIP SDK Result:", JSON.stringify(res, null, 2));

        // SDK returns { cae: string, caeFchVto: string, response: object }
        // If rejected, cae is empty string.
        if (res.cae && res.cae !== "") {
            return {
                success: true,
                data: {
                    cae: res.cae,
                    caeFchVto: res.caeFchVto,
                    // Typically SDK returns raw response in 'response'
                    voucherNumber: res.response?.FeDetResp?.FECAEDetResponse?.[0]?.CbteDesde || payload.CbteDesde
                }
            };
        }

        // FAILURE HANDLING
        const rawResponse = res.response || {};

        // 1. Global Errors
        const errors = rawResponse.Errors?.Err || rawResponse.Errors;
        if (errors && Array.isArray(errors) && errors.length > 0) {
            const msg = errors.map((e: any) => `(${e.Code}) ${e.Msg}`).join(". ");
            throw new Error(`Rechazo AFIP: ${msg}`);
        }

        // 2. Observations in Detail
        const detResp = rawResponse.FeDetResp?.FECAEDetResponse?.[0];
        const obs = detResp?.Observaciones?.Obs;
        if (obs && Array.isArray(obs) && obs.length > 0) {
            const msg = obs.map((o: any) => `(${o.Code}) ${o.Msg}`).join(". ");
            throw new Error(`AFIP Observaciones: ${msg}`);
        }

        // 3. Fallback
        console.error("Critical: SDK Response unexpected", res);
        throw new Error("AFIP rechazó la operación (CAE vacío) sin reportar errores explícitos.");


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
        // ARCA SDK might return it as `domicilioFiscal` object or `domicilio` array inside datosGenerales
        let domicilioRaw = datosGenerales.domicilioFiscal || datosGenerales.domicilio || taxPayer.domicilio;

        // If it's an array, try to find FISCAL, otherwise take first
        if (Array.isArray(domicilioRaw)) {
            domicilioRaw = domicilioRaw.find((d: any) => d.tipoDomicilio === 'FISCAL') || domicilioRaw[0];
        }

        const address = domicilioRaw ? `${domicilioRaw.direccion}, ${domicilioRaw.localidad || ''}, ${domicilioRaw.descripcionProvincia || domicilioRaw.dscrPcia || ''}` : "Domicilio Desconocido";

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

        const taxes = getTaxes(datosRegimen);
        console.log(`[AFIP] CUIT ${cuit} Taxes:`, JSON.stringify(taxes));

        // Extract 'formaJuridica' for refined fallback
        const formaJuridica = datosGenerales.formaJuridica || "";

        // Tax Codes Definitions
        const COD_MONOTRIBUTO = [20];
        const COD_RESP_INSCRIPTO = [30, 33, 34]; // 30=IVA, 33/34 variants
        const COD_GANANCIAS = [10, 11];          // Often implies RI
        const COD_EXENTO = [32, 4];              // 32=Exento commonly used, 4=Condition Exento

        // 1. Check Monotributo (Explicit Object or Code 20)
        const hasMonotributoTax = taxes.some((t: any) => COD_MONOTRIBUTO.includes(parseInt(t.idImpuesto)));
        if (isMonotributo || hasMonotributoTax) {
            condition = "Monotributo";
            isMonotributo = true;
        } else {
            // 2. Analyze other taxes
            const hasRI = taxes.some((t: any) => COD_RESP_INSCRIPTO.includes(parseInt(t.idImpuesto)));
            const hasGanancias = taxes.some((t: any) => COD_GANANCIAS.includes(parseInt(t.idImpuesto)));
            const hasExento = taxes.some((t: any) => COD_EXENTO.includes(parseInt(t.idImpuesto)));

            if (hasExento) {
                // Explicit Exento Tax
                condition = "IVA Exento";
                isExento = true;
            } else if (hasRI) {
                // Explicit IVA (30)
                condition = "Responsable Inscripto";
                isRespInscripto = true;
            } else if (hasGanancias) {
                // Ganancias but no explicit IVA -> Strong indicator of RI
                condition = "Responsable Inscripto";
                isRespInscripto = true;
            } else {
                // Fallback for Companies (Juridica) or Entities with NO taxes
                if (taxPayer.tipoPersona === "JURIDICA") {
                    // Refined logic: Distinguish Non-Profits from Commercial
                    const fjUpper = formaJuridica.toUpperCase();
                    const isNonProfit = [
                        "ASOCIACION", "FUNDACION", "IGLESIA", "CULTO",
                        "COOPERADORA", "BIBLIOTECA", "ORGAN. PUBLICO",
                        "ORGANISMO", "ESTADO", "GOBIERNO", "MUNICIPALIDAD"
                    ].some(k => fjUpper.includes(k));

                    if (isNonProfit) {
                        condition = "IVA Exento";
                        isExento = true;
                        console.log(`[AFIP] Fallback: Juridica (Non-Profit) defaulted to Exento`);
                    } else {
                        // Likely SA, SRL, SAS -> RI
                        condition = "Responsable Inscripto";
                        isRespInscripto = true;
                        console.log(`[AFIP] Fallback: Juridica (Commercial) defaulted to RI`);
                    }
                } else {
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
