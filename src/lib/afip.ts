import { Arca } from '@arcasdk/core';
import fs from 'fs';
import path from 'path';
import { constants } from 'crypto';
import { db } from "@/lib/db";


// Helper to handle currency rounding
const formatAmount = (num: number) => Math.round(num * 100) / 100;

// Environment variables
const PRODUCTION = String(process.env.AFIP_PRODUCTION).toLowerCase() === 'true';
const CUIT = parseInt(process.env.AFIP_CUIT || '0');

console.warn(`[DEBUG] [AFIP] Initializing Client. Production: ${PRODUCTION} (Env: ${process.env.AFIP_PRODUCTION})`);

export async function getAfipClient(branchId?: string, forceEntity?: 'MACCELL' | '8BIT') {
    let shouldUse8Bit = false;

    // Determine credentials: Force Entity takes precedence, then Branch
    if (forceEntity) {
        shouldUse8Bit = forceEntity === '8BIT';
        console.warn(`[DEBUG] [AFIP] Forcing entity to: ${forceEntity}`);
    } else if (branchId) {
        try {
            const branch = await db.branch.findUnique({
                where: { id: branchId },
                select: { code: true }
            });
            if (branch && branch.code === '8BIT') {
                shouldUse8Bit = true;
            }
        } catch (error) {
            console.error("Error fetching branch for AFIP context:", error);
            // Fallback to default
        }
    }

    // Select Credentials based on context
    let selectedCuit = CUIT;
    let selectedCertEnv = process.env.AFIP_CERT;
    let selectedKeyEnv = process.env.AFIP_KEY;

    if (shouldUse8Bit) {
        console.warn("[DEBUG] [AFIP] Using credentials for **8 BIT ACCESORIOS**");
        const cuit8bit = process.env.AFIP_CUIT_8BIT;
        if (cuit8bit) selectedCuit = parseInt(cuit8bit);

        selectedCertEnv = process.env.AFIP_CERT_8BIT;
        selectedKeyEnv = process.env.AFIP_KEY_8BIT;
    } else {
        console.warn("[DEBUG] [AFIP] Using default credentials (MACCELL)");
    }


    // Resolve certificate paths (Legacy file fallback mostly for default)
    const certDir = path.resolve(process.cwd(), 'afip-certs');
    // We only use file paths as fallback if ENV is missing and we are in default mode.
    // For 8BIT, we expect ENV vars mainly, but could support files if needed.
    // Simplifying logic: Prioritize ENV content.

    let certContent = '';
    let keyContent = '';

    try {
        // 1. Try ENV Content directly
        if (selectedCertEnv && selectedKeyEnv) {
            console.warn(`[DEBUG] [AFIP] Loaded credentials from ENV for ${shouldUse8Bit ? '8BIT' : 'DEFAULT'}`);
            certContent = selectedCertEnv;
            keyContent = selectedKeyEnv;
        }
        // 2. Fallback to Files
        else {
            // For 8BIT, we look for specific files if ENV is missing
            const certFilename = shouldUse8Bit ? 'cert_8bit.crt' : (process.env.AFIP_CERT || 'cert.pem');
            const keyFilename = shouldUse8Bit ? 'key_8bit.key' : (process.env.AFIP_KEY || 'key.pem');

            const certPath = path.join(certDir, certFilename);
            const keyPath = path.join(certDir, keyFilename);

            console.warn(`[DEBUG] [AFIP] Looking for credentials at: ${certPath}`);

            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                certContent = fs.readFileSync(certPath, 'utf8');
                keyContent = fs.readFileSync(keyPath, 'utf8');
            } else {
                // Critical Error if 8BIT credentials are missing
                if (shouldUse8Bit) {
                    throw new Error(`CRÍTICO: No se encontraron credenciales para 8 BIT. Revise variables AFIP_CERT_8BIT / AFIP_KEY_8BIT o archivos ${certFilename}.`);
                }
                throw new Error(`Certificates not found in ENV or at ${certPath}`);
            }
        }

        // DEBUG: Print credential details (Partial)
        console.warn(`[DEBUG] [AFIP] CUIT: ${selectedCuit}`);
        console.warn(`[DEBUG] [AFIP] Cert Start: ${certContent.substring(0, 30)}...`);
        console.warn(`[DEBUG] [AFIP] Cert End: ...${certContent.substring(certContent.length - 30)}`);
        console.warn(`[DEBUG] [AFIP] Key Length: ${keyContent.length}`);

        // Handle Base64 from ENV if needed
        if (!certContent.includes('-----BEGIN')) {
            certContent = Buffer.from(certContent, 'base64').toString('utf-8');
        }
        if (!keyContent.includes('-----BEGIN')) {
            keyContent = Buffer.from(keyContent, 'base64').toString('utf-8');
        }

    } catch (error) {
        console.error("❌ Error reading certificates:", error);
        throw new Error("Could not read AFIP certificates.");
    }

    // Initialize ARCA Client
    // TECH_DEBT(2026-04): @arcasdk/core options type is incomplete (missing
    // useSoap12, useHttpsAgent, ciphers, minVersion, secureOptions, rejectUnauthorized).
    // Impacto: pierde verificación de tipos en init de AFIP.
    // Fix real: contribuir tipos upstream o declarar interfaz local completa.
    const arca = new Arca({
        cuit: selectedCuit, // Use the selected CUIT
        cert: certContent,
        key: keyContent,
        production: PRODUCTION,
        useSoap12: false,
        useHttpsAgent: true,
        ciphers: 'DEFAULT:@SECLEVEL=0',
        minVersion: 'TLSv1',
        secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
        rejectUnauthorized: false
    } as ConstructorParameters<typeof Arca>[0]);

    return arca;
}

export async function getServerStatus() {
    try {
        const arca = await getAfipClient();
        const status = await arca.electronicBillingService.getServerStatus();
        return { success: true, status };
    } catch (error: unknown) {
        console.error('Error checking AFIP status:', error);
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
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
    } catch (error: unknown) {
        console.error("AFIP LastVoucher Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
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
    ivaItems?: { id: number, base: number, amount: number }[]; // Explicit IVA blocks
    ivaConditionId?: number; // New Field for IVA Receptor (Mandatory April 2026)
    branchId?: string; // Optional: To support multi-branch credentials
    billingEntity?: 'MACCELL' | '8BIT'; // Optional: Explicit override
}) {
    try {
        // Pass branchId and billingEntity to client factory to select correct CUIT/Cert
        const arca = await getAfipClient(data.branchId, data.billingEntity);

        // Construct payload for createNextVoucher (INextVoucher)
        const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');

        const ivaArray = [];
        let calculatedNet = 0;
        let calculatedVat = 0;

        if (data.ivaItems && data.ivaItems.length > 0) {
            for (const item of data.ivaItems) {
                ivaArray.push({
                    'Id': item.id,
                    'BaseImp': item.base,
                    'Importe': item.amount
                });
                calculatedNet += item.base;
                calculatedVat += item.amount;
            }
        } else if (data.vatAmount > 0) {
            ivaArray.push({
                'Id': 5,
                'BaseImp': data.netAmount,
                'Importe': data.vatAmount
            });
            calculatedNet = data.netAmount;
            calculatedVat = data.vatAmount;
        }

        // --- NUCLEAR CONSISTENCY FIX (Error 10051) ---
        // AFIP demands that ImpTotal = ImpNeto + ImpIVA + ImpOpEx + ImpTrib + ImpTotConc
        // Even 0.01 difference will trigger rejection.
        const headerAmount = formatAmount(calculatedNet + calculatedVat + data.exemptAmount);

        // TECH_DEBT(2026-04): el tipo INextVoucher del SDK marca CbteFch como string,
        // pero en producción se viene enviando como number (parseInt) sin problemas con AFIP.
        // No cambiamos el runtime para evitar regresiones en facturación. CondicionIVAReceptorId
        // se asigna condicionalmente más abajo, por eso usamos un tipo permisivo para inicializar.
        // Fix real: validar contra AFIP si CbteFch acepta string y migrar a INextVoucher.
        const payload: Record<string, string | number | Array<Record<string, number>>> = {
            'CantReg': 1,
            'PtoVta': data.salesPoint,
            'CbteTipo': data.type,
            'Concepto': data.concept,
            'DocTipo': data.docType,
            'DocNro': data.docNumber,
            'CbteFch': parseInt(date),
            'ImpTotal': headerAmount,
            'ImpTotConc': 0,
            'ImpNeto': formatAmount(calculatedNet),
            'ImpOpEx': data.exemptAmount || 0,
            'ImpIVA': formatAmount(calculatedVat),
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

        // --- IVA RECEPTOR CONDITION (Future Mandatory) ---
        // Map incoming condition text or ID to AFIP Code
        let condicionIvaId = 5; // Default: Consumidor Final
        if (data.ivaConditionId) {
            condicionIvaId = data.ivaConditionId;
        }

        payload['CondicionIVAReceptorId'] = condicionIvaId;
        console.warn(`[DEBUG] [AFIP] Invoicing with CondicionIVAReceptorId: ${condicionIvaId}`);

        // TECH_DEBT(2026-04): SDK retorna shape no documentado en ICreateVoucherResult
        // (response.FeDetResp / Errors). Casteamos vía unknown a interfaz mínima local.
        // Fix real: usar tipos públicos del SDK cuando se expongan.
        type AfipErrItem = { Code: number | string; Msg: string };
        type AfipVoucherResponse = {
            cae?: string;
            caeFchVto?: string;
            response?: {
                FeDetResp?: {
                    FECAEDetResponse?: Array<{
                        CbteDesde?: number;
                        Observaciones?: { Obs?: AfipErrItem[] };
                    }>;
                };
                Errors?: { Err?: AfipErrItem[] } | AfipErrItem[];
            };
        };
        // SDK input type es INextVoucher; usamos cast porque el payload se construye dinámicamente.
        const res = await arca.electronicBillingService.createNextVoucher(payload as unknown as Parameters<typeof arca.electronicBillingService.createNextVoucher>[0]) as unknown as AfipVoucherResponse;
        console.warn("[DEBUG] AFIP SDK Result:", JSON.stringify(res, null, 2));

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

        // 1. Global Errors — el SDK puede devolver Errors anidado en .Err o como array directo
        const rawErrors = rawResponse.Errors;
        const errors = Array.isArray(rawErrors) ? rawErrors : rawErrors?.Err;
        if (errors && Array.isArray(errors) && errors.length > 0) {
            const msg = errors.map((e) => `(${e.Code}) ${e.Msg}`).join(". ");
            throw new Error(`Rechazo AFIP: ${msg}`);
        }

        // 2. Observations in Detail
        const detResp = rawResponse.FeDetResp?.FECAEDetResponse?.[0];
        const obs = detResp?.Observaciones?.Obs;
        if (obs && Array.isArray(obs) && obs.length > 0) {
            const msg = obs.map((o) => `(${o.Code}) ${o.Msg}`).join(". ");
            throw new Error(`AFIP Observaciones: ${msg}`);
        }

        // 3. Fallback
        console.error("Critical: SDK Response unexpected", res);
        throw new Error("AFIP rechazó la operación (CAE vacío) sin reportar errores explícitos.");


    } catch (error: unknown) {
        console.error("AFIP CreateVoucher Error:", error);
        // Clean error message if it's an Error object
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
    }
}

/**
 * Get Taxpayer Details (Padrón A13)
 */
type AfipDomicilio = {
    tipoDomicilio?: string;
    direccion?: string;
    calle?: string;
    localidad?: string;
    descripcionProvincia?: string;
    dscrPcia?: string;
};

type AfipTaxItem = {
    idImpuesto?: string | number;
    id?: string | number;
};

// TECH_DEBT(2026-04): el SDK tipa el resultado con [key: string]: any.
// Usamos un tipo local que cubre los campos accedidos (todos opcionales para
// soportar fallbacks taxPayer.persona ?? taxPayer ?? root).
// Fix real: el SDK debería exportar un tipo concreto para Padron A13.
type AfipPadronNode = {
    persona?: AfipPadronNode;
    datosGenerales?: AfipPadronNode;
    datosRegimenGeneral?: AfipPadronNode;
    datosMonotributo?: AfipPadronNode;
    domicilioFiscal?: AfipDomicilio | AfipDomicilio[];
    domicilio?: AfipDomicilio | AfipDomicilio[];
    errorConstancia?: { error?: string; codigo?: number };
    razonSocial?: string;
    apellido?: string;
    nombre?: string;
    tipoClave?: string;
    idActividadPrincipal?: string | number;
    descripcionActividadPrincipal?: string;
    formaJuridica?: string;
    tipoPersona?: string;
    estadoClave?: string;
    impuesto?: AfipTaxItem | AfipTaxItem[];
    impuestos?: AfipTaxItem | AfipTaxItem[];
    categoria?: string;
};

export async function getTaxpayerDetails(cuit: number) {
    try {
        const arca = await getAfipClient();
        console.warn(`[DEBUG] [AFIP] Fetching details for CUIT ${cuit}...`);

        const taxPayer = await arca.registerScopeThirteenService.getTaxpayerDetails(cuit) as unknown as AfipPadronNode | null;

        if (!taxPayer) {
            return { success: false, error: "No se encontraron datos para este CUIT." };
        }

        // --- IMPROVED DATA EXTRACTION ---
        const root: AfipPadronNode = taxPayer.persona || taxPayer;
        const datosGenerales: AfipPadronNode = root.datosGenerales || taxPayer.datosGenerales || root;
        const datosRegimen = root.datosRegimenGeneral || taxPayer.datosRegimenGeneral;
        const datosMonotributo = root.datosMonotributo || taxPayer.datosMonotributo;

        if (!datosGenerales && root.errorConstancia) {
            return { success: false, error: `AFIP: ${root.errorConstancia.error || "Error de constancia."}` };
        }

        // Extract Name/Business Name
        const name = datosGenerales.razonSocial ||
            (datosGenerales.apellido ? `${datosGenerales.apellido} ${datosGenerales.nombre}` : "") ||
            "Desconocido";

        // Extract Address
        let domicilioRaw = datosGenerales.domicilioFiscal || datosGenerales.domicilio || root.domicilio;
        if (Array.isArray(domicilioRaw)) {
            domicilioRaw = domicilioRaw.find((d) => d.tipoDomicilio === 'FISCAL') || domicilioRaw[0];
        }

        const address = domicilioRaw ? `${domicilioRaw.direccion || domicilioRaw.calle || ''}, ${domicilioRaw.localidad || ''}, ${domicilioRaw.descripcionProvincia || domicilioRaw.dscrPcia || ''}` : "Domicilio Desconocido";

        // Detectar condición IVA
        let condition = "Consumidor Final";
        let isRespInscripto = false;
        // Optimization: Only count as monotributo if it has category or taxes
        let isMonotributo = !!(datosMonotributo && (datosMonotributo.categoria || datosMonotributo.impuesto));
        let isExento = false;

        // Helper to normalize taxes list
        const getTaxes = (regimen: AfipPadronNode | undefined): AfipTaxItem[] => {
            if (!regimen) return [];
            const taxes = regimen.impuesto || regimen.impuestos;
            if (Array.isArray(taxes)) return taxes;
            if (taxes && typeof taxes === 'object') return [taxes];
            return [];
        };

        const taxes = getTaxes(datosRegimen);
        console.warn(`[DEBUG] [AFIP] CUIT ${cuit} Taxes:`, JSON.stringify(taxes));

        // Tax Codes Definitions
        const COD_MONOTRIBUTO = [20];
        const COD_RESP_INSCRIPTO = [30, 31, 33, 34, 308, 358]; // Added 308/358 (Autonomos) as indicators of RI if not Monotributo

        const COD_GANANCIAS = [10, 11];
        const COD_EXENTO = [32, 4, 15];

        // 1. Check Monotributo (Explicit Object or Code 20)
        const taxCode = (t: AfipTaxItem) => parseInt(String(t.idImpuesto || t.id || 0));
        const hasMonotributoTax = taxes.some((t) => COD_MONOTRIBUTO.includes(taxCode(t)));

        if (isMonotributo || hasMonotributoTax) {
            condition = "Monotributo";
            isMonotributo = true;
        } else {
            // 2. Analyze other taxes
            const hasRI = taxes.some((t) => COD_RESP_INSCRIPTO.includes(taxCode(t)));
            const hasGanancias = taxes.some((t) => COD_GANANCIAS.includes(taxCode(t)));
            const hasExento = taxes.some((t) => COD_EXENTO.includes(taxCode(t)));

            if (hasExento) {
                condition = "IVA Exento";
                isExento = true;
            } else if (hasRI || hasGanancias) {
                condition = "Responsable Inscripto";
                isRespInscripto = true;
            } else {
                // FALLBACK: If it's ACTIVO but taxes are empty (common in some A13 responses)
                const tipoClave = (datosGenerales.tipoClave || "").toUpperCase();
                const hasActivity = !!(datosGenerales.idActividadPrincipal || datosGenerales.descripcionActividadPrincipal);

                if (root.tipoPersona === "JURIDICA") {
                    const fj = (datosGenerales.formaJuridica || "").toUpperCase();
                    const isNP = ["ASOCIACION", "FUNDACION", "COOPERADORA", "ESTADO", "MUNICIPALIDAD"].some(k => fj.includes(k));
                    if (isNP) {
                        condition = "IVA Exento";
                        isExento = true;
                    } else {
                        condition = "Responsable Inscripto";
                        isRespInscripto = true;
                    }
                } else if (root.tipoPersona === "FISICA" && root.estadoClave === "ACTIVO") {
                    // Logic: If they have a "CUIL", they are usually Consumidor Final (employees/unregistered).
                    // If they have a "CUIT" and an "Actividad", they are registered in AFIP (RI or Monotributo).
                    // Since we already checked Monotributo above, if they have an Activity and CUIT, they are RI.
                    if (tipoClave === "CUIT" && hasActivity) {
                        condition = "Responsable Inscripto";
                        isRespInscripto = true;
                        console.warn(`[DEBUG] [AFIP] CUIT ${cuit} - Active CUIT with activity but no taxes fetched. Assuming RI.`);
                    } else {
                        condition = "Consumidor Final";
                        console.warn(`[DEBUG] [AFIP] CUIT ${cuit} - Active ${tipoClave} with no explicit activity/taxes. Assuming CF.`);
                    }
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

    } catch (error: unknown) {
        console.error("AFIP Padron Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("401") || message.includes("Unauthorized")) {
            return {
                success: false,
                error: "Permiso denegado en AFIP (401). Verifica certificados."
            };
        }
        return { success: false, error: "Error consultando AFIP: " + message };
    }
}
