import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Global lock to prevent multiple print dialogs from colliding/freezing
 */
// Use a timestamp to prevent race conditions but allow auto-recovery after 5 seconds
let lastPrintTime = 0;
const PRINT_LOCK_DURATION = 5000; // 5 seconds lock

/**
 * Robust printing helper that uses a hidden iframe.
 * Handles timeouts and cleanup to prevent freezing.
 */
// Classic Iframe Write Strategy (Restoring original behavior)
const printHtml = (htmlContent: string) => {
    const now = Date.now();
    if (now - lastPrintTime < 2000) {
        console.warn("Print ignored (spam protection).");
        return;
    }
    lastPrintTime = now;

    try {
        // 1. Create Iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.border = 'none';
        iframe.style.opacity = '0.01'; // Hidden but renderable
        iframe.style.pointerEvents = 'none';

        document.body.appendChild(iframe);

        // 2. Open Document and Write
        // This preserves the current Origin (localhost) so relative paths like /logo.jpg work!
        const doc = iframe.contentWindow?.document;
        if (!doc) {
            console.error("Iframe document not accessible");
            document.body.removeChild(iframe);
            return;
        }

        doc.open();
        doc.write(htmlContent);
        doc.close();

        // 3. Wait for Load (Images, QR)
        iframe.onload = () => {
            // 4. Trace focus and Print
            setTimeout(() => {
                try {
                    if (!iframe.contentWindow) return;

                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();

                    // Restore main focus
                    window.focus();
                } catch (e) {
                    console.error("Print error:", e);
                } finally {
                    // Cleanup after a delay to allow print dialog to finish
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 5000); // 5s wait to be safe
                }
            }, 500); // 500ms allows images to render layout
        };

        // Fallback cleanup
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 60000);

    } catch (e) {
        console.error("Print setup failed:", e);
    }
};

// --- Shared CSS for Receipts ---
const SHARED_CSS = `
    body { 
        font-family: 'Courier New', monospace; 
        width: 80mm; 
        margin: 0; 
        padding: 2mm; 
        font-size: 16px; 
        color: black; 
        font-weight: bold; 
    }
    .header { 
        text-align: center; 
        margin-bottom: 10px; 
        border-bottom: 2px dashed black; 
        padding-bottom: 10px; 
    }
    .logo { 
        width: 40mm; 
        height: auto; 
        margin: 0 auto 5px auto; 
        display: block; 
        object-fit: contain;
    }
    .branch-name {
        font-size: 24px;
        font-weight: 900;
        margin: 5px 0;
        text-transform: uppercase;
    }
    .branch-info {
        font-size: 14px;
        margin-top: 2px;
        white-space: pre-wrap;
    }
    .date {
        font-size: 14px;
        margin-top: 5px;
    }
    .row { 
        display: flex; 
        justify-content: space-between; 
        margin-bottom: 5px;
    }
    .col-qty { width: 15%; text-align: left; }
    .col-desc { width: 55%; text-align: left; white-space: normal; }
    .col-price { width: 30%; text-align: right; }
    
    .total-section {
        margin-top: 15px;
        border-top: 2px dashed black;
        padding-top: 10px;
    }
    .total-row {
        display: flex; 
        justify-content: space-between; 
        font-size: 24px;
        font-weight: 900;
    }
    .payment-method {
        font-size: 14px;
        text-align: right;
        margin-top: 5px;
        text-transform: uppercase;
    }
    .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 14px;
    }
    .qr-container {
        text-align: center;
        margin-top: 20px;
    }
    @media print {
        @page { margin: 0; size: 80mm auto; }
        body { width: 80mm; padding: 2mm; }
    }
`;

// --- Helper to wrap content ---
// REMOVED: Internal script tags. Passively rendered.
const wrapHtml = (title: string, styles: string, bodyContent: string) => `
    <html>
        <head>
            <title>${title}</title>
            <style>
                ${styles}
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
    </html>
`;

export const printRepairTicket = (repair: any) => {
    if (!repair) return;
    const logoUrl = repair.branch?.imageUrl || "/logo.jpg";

    const content = `
        <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
            <div class="branch-name">${repair.branch?.name || "MACCELL"}</div>
            ${repair.branch?.address ? `<div class="branch-info">${repair.branch.address}</div>` : ''}
            ${repair.branch?.phone ? `<div class="branch-info">Tel: ${repair.branch.phone}</div>` : ''}
            
            <div style="margin-top: 10px; text-transform: uppercase; border-top: 1px solid black; border-bottom: 1px solid black; padding: 5px 0; display: inline-block;">
                Comprobante de Reparación
            </div>
            
            <div style="font-size: 24px; font-weight: 900; margin: 5px 0;">#${repair.ticketNumber}</div>
            <div class="date">${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</div>
        </div>

        <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 900;">CLIENTE</div>
            <div style="font-size: 16px; font-weight: bold;">${repair.customer?.name || "Consumidor Final"}</div>
        </div>
        
        <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 900;">DISPOSITIVO</div>
            <div style="font-size: 16px; font-weight: bold;">${repair.deviceBrand} ${repair.deviceModel}</div>
        </div>
        
         <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 900;">PROBLEMA / DIAGNÓSTICO</div>
            <div style="font-style: italic; font-size: 14px;">"${repair.problemDescription}"</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 5px;">* No se pudieron comprobar sus funciones.</div>
        </div>

        ${repair.parts && repair.parts.length > 0 ? `
            <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
                <div style="font-size: 12px; font-weight: 900;">REPUESTOS</div>
                ${repair.parts.map((p: any) => `
                    <div style="font-size: 14px; margin-bottom: 2px;">
                        <span>${p.quantity}x ${p.sparePart?.name || "Repuesto"}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div style="border-bottom: 3px solid black; padding-bottom: 10px;">
            <div class="row">
                <span style="font-size: 18px; font-weight: 900;">TOTAL ESTIMADO</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; text-align: right;">$${repair.estimatedPrice?.toLocaleString() || "0"}</div>
            <div class="row" style="margin-top: 10px; justify-content: flex-end;">
                <span class="label" style="margin-right: 5px;">PROMETIDO:</span>
                <span class="value" style="margin-bottom: 0;">${format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}</span>
            </div>
            <div style="font-size: 16px; font-weight: 900; text-align: center; margin-top: 5px; text-transform: uppercase;">
                PARA RETIRAR EL EQUIPO SI O SI NECESITA ESTE COMPROBANTE
            </div>
        </div>

        <div style="font-family: sans-serif; font-size: 11px; text-align: left; margin-top: 15px; font-weight: bold; line-height: 1.1;">
            <div style="text-decoration: underline; margin-bottom: 2px;">TÉRMINOS Y CONDICIONES:</div> 
            1. ACEPTACIÓN: La entrega del equipo implica la conformidad total con el presupuesto y estas condiciones.<br/> 
            2. GARANTÍA LIMITADA: Validez de 30 días corridos. Cubre exclusivamente la mano de obra realizada y los repuestos reemplazados en esta orden.<br/> 
            3. EXCLUSIONES: La garantía se anula automáticamente por: Golpes, trizaduras o presión en pantalla. Signos de humedad, sulfatación o mojaduras. Fajas de garantía rotas o manipulación ajena.<br/> 
            4. ABANDONO: El cliente dispone de 90 días corridos para retirar el equipo tras el aviso. Pasado este plazo, el equipo se considerará abandonado, pasando a disposición de la empresa para cubrir costos, sin derecho a reclamo posterior.<br/> 
            5. RESPONSABILIDAD DE DATOS: La empresa no se responsabiliza por la pérdida de información (fotos, contactos, etc.). Se sugiere backup previo.
        </div>

        <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/estado/' + repair.ticketNumber)}" style="width: 100px; height: 100px; margin: 0 auto; display: block;" alt="QR Ticket" />
            <div style="font-size: 10px; margin-top: 5px;">Escaneá para saber el estado de tu equipo</div>
            <div style="font-size: 10px; font-weight: bold;">Ticket #${repair.ticketNumber}</div>
        </div>

        <div style="margin-top: 200px; border-top: 2px solid black; text-align: center; padding-top: 5px; font-size: 14px; font-weight: bold;">
            Firma del Cliente / Aceptación
        </div>
    `;

    printHtml(wrapHtml(`Ticket #${repair.ticketNumber}`, SHARED_CSS, content));
};

export const printSaleTicket = (data: {
    branch: any;
    items: any[];
    total: number;
    method: string;
    date: Date;
    saleId?: string;
    vendorName?: string;
}) => {
    const { branch, items, total, method, date, saleId, vendorName } = data;
    const logoUrl = branch?.imageUrl || "/logo.jpg";

    // Logic for QR/Review link
    const name = branch?.name?.toLowerCase() || "";
    let reviewUrl = "";
    if (name.includes("maccell 1")) reviewUrl = "https://g.page/r/CXxoxXDBkdUHEBM/review";
    else if (name.includes("maccell 2")) reviewUrl = "https://g.page/r/CUDOPxaFDtE8EBM/review";
    else if (name.includes("maccell 3")) reviewUrl = "https://g.page/r/CaCjgfR2f4GbEBM/review";
    else if (name.includes("8 bits")) reviewUrl = "https://g.page/r/CYdXt1QE9sJAEBM/review";

    const content = `
        <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
            <div class="branch-name">${branch?.name || "MACCELL"}</div>
            ${branch?.address ? `<div class="branch-info">${branch.address}</div>` : ''}
            ${branch?.phone ? `<div class="branch-info">Tel: ${branch.phone}</div>` : ''}
            <div class="date">${format(date, "dd/MM/yyyy HH:mm", { locale: es })}</div>
            ${saleId ? `<div class="date">Ticket #${saleId.slice(-6)}</div>` : ''}
        </div>

        <div style="margin-bottom: 10px;">
            <div class="row" style="border-bottom: 2px solid black; font-size: 14px; padding-bottom: 5px; margin-bottom: 10px; font-weight: 900;">
                <span class="col-qty">CANT</span>
                <span class="col-desc">DESCRIPCION</span>
                <span class="col-price">TOTAL</span>
            </div>
            ${items.map((item: any) => `
                <div class="row" style="font-size: 16px;">
                    <span class="col-qty">${item.quantity}</span>
                    <span class="col-desc">${item.name}</span>
                    <span class="col-price">$${(item.price * item.quantity).toLocaleString()}</span>
                </div>
            `).join('')}
        </div>

        <div class="total-section">
            <div class="total-row">
                <span>TOTAL</span>
                <span>$${total.toLocaleString()}</span>
            </div>
            ${(() => {
            const methodMap: Record<string, string> = {
                "CASH": "EFECTIVO",
                "CARD": "TARJETA",
                "SPLIT": "DIVIDIDO",
                "MERCADOPAGO": "MERCADOPAGO"
            };
            const displayMethod = methodMap[method] || method;
            return `<div class="payment-method">PAGO: ${displayMethod}</div>`;
        })()}
        </div>

        ${reviewUrl ? `
            <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reviewUrl)}" style="width: 120px; height: 120px; display: block; margin: 0 auto;" />
                <div style="font-size: 12px; font-weight: bold; margin-top: 5px;">¡ESCANEA Y VALORANOS!</div>
            </div>
        ` : ''}

        ${vendorName ? `
            <div style="text-align: center; margin-top: 10px; font-size: 12px; font-weight: bold;">
                Fuiste atendido por ${vendorName}
            </div>
        ` : ''}

        <div class="footer">
            <div>¡Muchas gracias por su compra!</div>
            <div>Lo esperamos nuevamente.</div>
        </div>
    `;

    printHtml(wrapHtml("Ticket Venta", SHARED_CSS, content));
};

export const printCashShiftClosureTicket = (data: {
    branch: any;
    user: any;
    shift: { startAmount: number; startTime: Date };
    summary: any;
    billCounts: Record<number, number>;
    finalCount: number;
    employeeCount: number;
}) => {
    const { branch, user, shift, summary, billCounts, finalCount, employeeCount } = data;
    const logoUrl = branch?.imageUrl || "/logo.jpg";
    const bonusPerEmp = summary ? Math.round((summary.totalSales * (summary.totalSales > 1200000 ? 0.02 : 0.01)) / 500) * 500 : 0;
    const totalBonus = bonusPerEmp * employeeCount;
    const expectedNet = (summary?.expectedCash || 0) - totalBonus;
    const diff = finalCount - expectedNet;

    const content = `
        <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
            <div style="font-size: 20px; font-weight: 900; margin: 5px 0; text-transform: uppercase;">CIERRE DE CAJA</div>
            <div>${branch?.name || "SUCURSAL"}</div>
            <div>${branch?.address || ""}</div>
            <div>${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</div>
            <div style="margin-top:5px;">Cajero: ${user?.name || "N/A"}</div>
        </div>

        <div class="row">
            <span>FONDO INICIAL:</span>
            <span>$${shift.startAmount.toLocaleString()}</span>
        </div>

        <div style="font-size: 16px; font-weight: 900; text-align: center; margin-top: 15px; margin-bottom: 5px; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 3px 0;">VENTAS DEL TURNO</div>
        <div class="row">
            <span>EFECTIVO:</span>
            <span>$${(summary?.cashSales || 0).toLocaleString()}</span>
        </div>
        <div class="row">
            <span>TARJETA:</span>
            <span>$${(summary?.cardSales || 0).toLocaleString()}</span>
        </div>
        <div class="row">
            <span>MERCADOPAGO:</span>
            <span>$${(summary?.mpSales || 0).toLocaleString()}</span>
        </div>
        <div class="row" style="font-size: 16px; margin-top: 5px;">
            <span>TOTAL VENTAS:</span>
            <span>$${(summary?.totalSales || 0).toLocaleString()}</span>
        </div>

        <div style="font-size: 16px; font-weight: 900; text-align: center; margin-top: 15px; margin-bottom: 5px; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 3px 0;">GASTOS Y PREMIOS</div>
        <div class="row">
            <span>GASTOS OPERATIVOS:</span>
            <span>-$${(summary?.expenses || 0).toLocaleString()}</span>
        </div>
        <div class="row" style="margin-top: 5px;">
            <span>EMPLEADOS:</span>
            <span>${employeeCount}</span>
        </div>
        <div class="row">
            <span>PREMIO P/EMP:</span>
            <span>$${bonusPerEmp.toLocaleString()}</span>
        </div>
        <div class="row">
            <span>TOTAL PREMIOS (${summary.totalSales > 1200000 ? "2%" : "1%"}):</span>
            <span>-$${totalBonus.toLocaleString()}</span>
        </div>

        <div style="font-size: 16px; font-weight: 900; text-align: center; margin-top: 15px; margin-bottom: 5px; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 3px 0;">ARQUEO DE EFECTIVO</div>
        ${[20000, 10000, 2000, 1000, 500, 200, 100].map(denom => {
        const count = billCounts[denom] || 0;
        if (count === 0) return '';
        return `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>$${denom.toLocaleString()} x ${count}</span>
                    <span>$${(denom * count).toLocaleString()}</span>
                </div>
            `;
    }).join('')}
        <div class="row" style="margin-top:5px; border-top: 1px solid black;">
            <span>TOTAL CONTADO:</span>
            <span style="font-size: 16px;">$${finalCount.toLocaleString()}</span>
        </div>

        <div style="font-size: 16px; font-weight: 900; text-align: center; margin-top: 15px; margin-bottom: 5px; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 3px 0;">RESULTADO</div>
        <div class="row">
            <span>ESPERADO (SISTEMA):</span>
            <span>$${expectedNet.toLocaleString()}</span>
        </div>
        
        <div style="border: 2px solid black; padding: 5px; text-align: center; margin-top: 10px; font-size: 16px;">
            <div>DIFERENCIA</div>
            <div style="font-size: 20px; font-weight: 900;">$${diff.toLocaleString()}</div>
            <div style="font-size: 12px;">${diff === 0 ? "EXCELENTE" : diff > 0 ? "SOBRANTE" : "FALTANTE"}</div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px;">
            <div>Firma del Cajero</div>
            <br/><br/><br/>
            <div style="border-top: 1px solid black; width: 80%; margin: 0 auto;"></div>
        </div>
    `;

    printHtml(wrapHtml("Cierre de Caja", SHARED_CSS, content));
};

export const printInvoiceTicket = (data: {
    branch: any;
    items: any[];
    total: number;
    paymentMethod: string;
    invoice: {
        type: "A" | "B";
        number: string;
        cae: string;
        caeExpiresAt: Date;
        customerName: string;
        customerDocType: string;
        customerDoc: string;
        customerAddress?: string;
        salesPoint: number;
    };
    vendorName?: string;
    date: Date;
}) => {
    const { branch, items, total, paymentMethod, invoice, vendorName, date } = data;
    const logoUrl = branch?.imageUrl || "/logo.jpg";

    // Parse Voucher Number Details Safely
    const vNumberStr = invoice.number.toString();
    const isHyphenated = vNumberStr.includes('-');
    const displayPtoVta = isHyphenated ? vNumberStr.split('-')[0] : invoice.salesPoint.toString();
    const displayNroVal = isHyphenated ? vNumberStr.split('-')[1] : vNumberStr;

    const formattedPtoVta = displayPtoVta.padStart(5, '0');
    const formattedNroComp = displayNroVal.padStart(8, '0');

    // AFIP QR Data
    const formattedDate = format(date, "yyyy-MM-dd");
    const ISSUER_CUIT = 30717390314;

    const qrData = {
        ver: 1,
        fecha: formattedDate,
        cuit: ISSUER_CUIT,
        ptoVta: parseInt(displayPtoVta),
        tipoCmp: invoice.type === "A" ? 1 : 6,
        nroCmp: parseInt(displayNroVal),
        importe: total,
        moneda: "PES",
        ctz: 1,
        tipoDocRec: invoice.customerDocType === "CUIT" ? 80 : (invoice.customerDocType === "DNI" ? 96 : 99),
        nroDocRec: parseInt(invoice.customerDoc.replace(/\D/g, '')) || 0,
        tipoCodAut: "E",
        codAut: parseInt(invoice.cae)
    };

    const qrJson = JSON.stringify(qrData);
    const qrBase64 = btoa(qrJson);
    const qrUrl = "https://www.afip.gob.ar/fe/qr/?p=" + qrBase64;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`;

    const content = `
        <div class="header" style="text-align: center;">
            <div style="font-size: 24px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase;">${branch?.name || "MACCELL"}</div>
            <div style="font-size: 11px; margin-bottom: 8px;">${branch?.address || ""}</div>
            
            <div style="display: flex; border: 1px solid black; margin: 10px 0; min-height: 60px;">
                <div style="flex: 1.2; font-size: 10px; text-align: left; padding: 5px; border-right: 1px solid black; display: flex; flex-direction: column; justify-content: center;">
                    <b>CUIT:</b> 30-71739031-4<br/>
                    <b>IIBB:</b> 30717390314<br/>
                    <b>Inicio:</b> 01/01/2024<br/>
                    <b>IVA RESP. INSCRIPTO</b>
                </div>
                
                <div style="width: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; margin: -1px;">
                    <div style="border: 2px solid black; width: 35px; height: 35px; font-size: 24px; font-weight: 900; line-height: 32px; text-align: center; margin-bottom: 2px;">${invoice.type}</div>
                    <div style="font-size: 8px; font-weight: bold;">Cod. 00${invoice.type === "A" ? 1 : 6}</div>
                </div>
                
                <div style="flex: 1.2; font-size: 11px; text-align: right; padding: 5px; border-left: 1px solid black; display: flex; flex-direction: column; justify-content: center;">
                    <b style="font-size: 12px;">FACTURA</b><br/>
                    <b>P.V.:</b> ${formattedPtoVta}<br/>
                    <b>Nro:</b> ${formattedNroComp}
                </div>
            </div>
            
            <div style="text-align: right; font-size: 13px; font-weight: bold; margin-bottom: 5px;">FECHA: ${format(date, "dd/MM/yyyy", { locale: es })}</div>
        </div>

        <div style="margin: 10px 0; padding: 8px; border: 1px solid black; border-radius: 4px;">
            <div style="font-size: 10px; font-weight: 900; color: #333; margin-bottom: 4px; border-bottom: 1px solid #ddd; text-align: left;">RECEPTOR</div>
            <div style="font-size: 15px; font-weight: bold; text-align: left;">${invoice.customerName}</div>
            <div style="font-size: 13px; text-align: left;">
                ${invoice.customerDocType === "FINAL" ? "CONSUMIDOR FINAL" : `<b>${invoice.customerDocType}:</b> ${invoice.customerDoc}`}
            </div>
            ${invoice.customerAddress ? `<div style="font-size: 12px; text-align: left;"><b>DIR:</b> ${invoice.customerAddress}</div>` : ''}
            <div style="font-size: 12px; text-align: left;"><b>IVA:</b> ${invoice.type === "A" ? "RESPONSABLE INSCRIPTO" : "CONSUMIDOR FINAL"}</div>
        </div>

        <div style="margin-bottom: 15px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="border-bottom: 2px solid black; font-weight: 900; font-size: 12px;">
                        <th style="text-align: left; padding: 3px 0;">DESC.</th>
                        <th style="text-align: center; width: 40px;">CANT</th>
                        <th style="text-align: right; width: 80px;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item: any) => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 5px 0; text-align: left;">${item.name}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: right;">$${(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="total-section" style="border-top: 2px solid black; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: 900;">
                <span>TOTAL</span>
                <span>$${total.toLocaleString()}</span>
            </div>
            <div style="font-size: 13px; margin-top: 5px; font-weight: bold; text-align: right;">
                PAGO: ${(() => {
            const methodMap: Record<string, string> = {
                "CASH": "EFECTIVO",
                "CARD": "TARJETA",
                "SPLIT": "PAGO MULTIPLE",
                "MERCADOPAGO": "MERCADOPAGO / QR"
            };
            return methodMap[paymentMethod] || paymentMethod.toUpperCase();
        })()}
            </div>
        </div>

        <div class="qr-container" style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
            <img src="${qrImgUrl}" style="width: 130px; height: 130px;" onerror="this.style.display='none'" />
            <div style="margin-top: 8px; text-align: center;">
                <img src="https://www.afip.gob.ar/images/logo_afip.png" style="width: 70px;" onerror="this.style.display='none'" />
                <div style="font-size: 9px; color: #666; margin-top: 2px;">Comprobante Autorizado por AFIP</div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 15px; font-size: 14px; border: 1px dashed black; padding: 8px;">
            <div><b>CAE:</b> ${invoice.cae}</div>
            <div><b>VTO. CAE:</b> ${format(new Date(invoice.caeExpiresAt), "dd/MM/yyyy")}</div>
        </div>
        
        <div class="footer" style="font-size: 10px; margin-top: 20px; text-align: center; color: #666;">
            Comprobante Oficial de Venta<br/>
            Maccell CRM
        </div>
    `;

    printHtml(wrapHtml(`Factura ${invoice.type} - ${formattedPtoVta}-${formattedNroComp}`, SHARED_CSS, content));
};
