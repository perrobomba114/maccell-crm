import { createAfipInvoice } from "@/lib/afip";
import { getIvaConditionId } from "@/lib/afip-utils";

const formatAmount = (num: number) => Math.round(num * 100) / 100;

export async function generateAfipInvoiceForSale(data: any, branchId: string) {
    const voucherType = data.invoiceData.invoiceType === "A" ? 1 : 6;
    let docTypeCode = 99;
    if (data.invoiceData.docType === "CUIT") docTypeCode = 80;
    if (data.invoiceData.docType === "DNI") docTypeCode = 96;

    const docNumber = parseInt(data.invoiceData.docNumber.replace(/\D/g, '')) || 0;

    let totalNet21 = 0;
    let totalVat21 = 0;
    let totalNet105 = 0;
    let totalVat105 = 0;

    for (const item of data.items) {
        const itemTotal = item.price * item.quantity;
        const rate = 1.21;
        const net = itemTotal / rate;
        const vat = itemTotal - net;

        totalNet21 += net;
        totalVat21 += vat;
    }

    const finalNet21 = formatAmount(totalNet21);
    const finalVat21 = formatAmount(totalVat21);
    const finalNet105 = formatAmount(totalNet105);
    const finalVat105 = formatAmount(totalVat105);

    const totalNet = finalNet21 + finalNet105;
    const totalVat = finalVat21 + finalVat105;

    const ivaItems = [];
    if (finalNet21 > 0) {
        ivaItems.push({ id: 5, base: finalNet21, amount: finalVat21 });
    }
    if (finalNet105 > 0) {
        ivaItems.push({ id: 4, base: finalNet105, amount: finalVat105 });
    }

    const afipRes = await createAfipInvoice({
        salesPoint: data.invoiceData.salesPoint,
        type: voucherType,
        concept: data.invoiceData.concept || 1,
        docType: docTypeCode,
        docNumber: docNumber,
        cbteDesde: 0,
        cbteHasta: 0,
        amount: data.total,
        vatAmount: formatAmount(totalVat),
        netAmount: formatAmount(totalNet),
        exemptAmount: 0,
        ivaItems: ivaItems,
        serviceDateFrom: data.invoiceData.serviceDateFrom,
        serviceDateTo: data.invoiceData.serviceDateTo,
        paymentDueDate: data.invoiceData.paymentDueDate,
        ivaConditionId: getIvaConditionId(data.invoiceData.ivaCondition || ""),
        branchId: branchId
    });

    if (!afipRes.success || !afipRes.data) {
        throw new Error(afipRes.error || "Error desconocido en AFIP");
    }

    const caeData = afipRes.data as any;
    const rawVoucher = caeData.voucherNumber || caeData.cbteNro || caeData.CbteNro || (caeData.FECAESolicitarResult ? caeData.FECAESolicitarResult.FeDetReq[0].CbteDesde : undefined);
    const rawCae = caeData.cae || caeData.CAE || (caeData.FECAESolicitarResult ? caeData.FECAESolicitarResult.FeDetReq[0].CAE : undefined);
    const rawCaeFchVto = caeData.caeFchVto || caeData.CAEFchVto || (caeData.FECAESolicitarResult ? caeData.FECAESolicitarResult.FeDetReq[0].CAEFchVto : undefined);

    const voucherStr = rawVoucher ? String(rawVoucher).trim() : '';
    const caeStr = rawCae ? String(rawCae).trim() : '';
    if (!voucherStr || !caeStr) {
        throw new Error("AFIP no devolvió CAE ni Número de Comprobante válidos.");
    }

    let caeExpiresAt: Date | null = null;
    if (rawCaeFchVto) {
        const raw = String(rawCaeFchVto);
        const y = raw.slice(0, 4);
        const m = raw.slice(4, 6);
        const d = raw.slice(6, 8);
        caeExpiresAt = new Date(`${y}-${m}-${d}`);
    }

    const ptoVta = data.invoiceData.salesPoint.toString().padStart(5, '0');
    const voucherNum = voucherStr.padStart(8, '0');
    const voucherNumberString = `${ptoVta}-${voucherNum}`;

    return {
        cae: caeStr,
        voucherNumber: voucherNumberString,
        caeExpiresAt,
        totalNet,
        totalVat
    };
}
