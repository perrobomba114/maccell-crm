import { format } from "date-fns";
import { es } from "date-fns/locale";
import { printHtml, SHARED_CSS, wrapHtml } from "./core";

type SaleTicketBranch = {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    imageUrl?: string | null;
};

type SaleTicketItem = {
    name: string;
    quantity: number;
    price: number;
};

export const printSaleTicket = (data: {
    branch: SaleTicketBranch;
    items: SaleTicketItem[];
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
            ${items.map((item) => `
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

export const printInvoiceTicket = (data: {
    branch: SaleTicketBranch;
    items: SaleTicketItem[];
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
    billingEntity?: 'MACCELL' | '8BIT';
    customerIvaCondition?: string;
}) => {
    const { branch, items, total, paymentMethod, invoice, vendorName, date, billingEntity, customerIvaCondition } = data;
    const logoUrl = branch?.imageUrl || "/logo.jpg";


    // Determine Issuer Details
    const is8Bit = billingEntity === '8BIT';
    // Macell: 30717390314, 8Bit: 30719022274 (from env)
    const issuerCuit = is8Bit ? 30719022274 : 30717390314;
    const issuerName = is8Bit ? "8 BIT ACCESORIOS" : "MACCELL";
    const issuerAddress = is8Bit ? "Av. 14 4568, Berazategui" : (branch?.address || "Av. 14 4780, Berazategui");
    const issuerIibb = is8Bit ? 30719022274 : 30717390314;
    const issuerStartDate = is8Bit ? "01/05/2024" : "01/01/2024";
    const issuerCondition = "IVA RESP. INSCRIPTO"; // Both are RI

    // Parse Voucher Number Details Safely
    const vNumberStr = invoice.number.toString();
    const isHyphenated = vNumberStr.includes('-');
    const displayPtoVta = isHyphenated ? vNumberStr.split('-')[0] : invoice.salesPoint.toString();
    const displayNroVal = isHyphenated ? vNumberStr.split('-')[1] : vNumberStr;

    const formattedPtoVta = displayPtoVta.padStart(5, '0');
    const formattedNroComp = displayNroVal.padStart(8, '0');

    // AFIP QR Data
    const formattedDate = format(date, "yyyy-MM-dd");

    const qrData = {
        ver: 1,
        fecha: formattedDate,
        cuit: issuerCuit,
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
            <div style="font-size: 24px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase;">${issuerName}</div>
            <div style="font-size: 11px; margin-bottom: 8px;">${issuerAddress}</div>

            <div style="display: flex; border: 1px solid black; margin: 10px 0; min-height: 60px;">
                <div style="flex: 1.2; font-size: 10px; text-align: left; padding: 5px; border-right: 1px solid black; display: flex; flex-direction: column; justify-content: center;">
                    <b>CUIT:</b> ${issuerCuit}<br/>
                    <b>IIBB:</b> ${issuerIibb}<br/>
                    <b>Inicio:</b> ${issuerStartDate}<br/>
                    <b>${issuerCondition}</b>
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
                    ${items.map((item) => `
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
        </div>

        ${(invoice.type === "A" && customerIvaCondition?.toLowerCase().includes("monotributo")) ? `
            <div style="margin: 10px 0; border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; font-weight: bold; background: #eee;">
                El crédito fiscal discriminado en el presente comprobante, sólo podrá ser computado a efectos del Régimen de Sostenimiento e Inclusión Fiscal para Pequeños Contribuyentes de la Ley Nº 27.618
            </div>
        ` : ''}

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
