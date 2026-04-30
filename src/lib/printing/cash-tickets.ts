import { format } from "date-fns";
import { es } from "date-fns/locale";
import { printHtml, SHARED_CSS, wrapHtml } from "./core";

type TicketBranch = {
    name?: string | null;
    address?: string | null;
    imageUrl?: string | null;
};

type CashShiftSummary = {
    calculatedBonus?: number | null;
    totalSales: number;
    expectedCash?: number | null;
    cashSales?: number | null;
    cardSales?: number | null;
    mpSales?: number | null;
    expenses?: number | null;
};

export const printCashShiftClosureTicket = (data: {
    branch: TicketBranch;
    user: { name?: string | null };
    shift: { startAmount: number; startTime: Date };
    summary: CashShiftSummary;
    billCounts: Record<number, number>;
    finalCount: number;
    employeeCount: number;
}) => {
    const { branch, user, shift, summary, billCounts, finalCount, employeeCount } = data;
    const logoUrl = branch?.imageUrl || "/logo.jpg";
    // Prefer the server-calculated bonus to ensure consistency. Fallback to local calc rounding UP to 1000.
    const bonusPerEmp = summary?.calculatedBonus ?? (summary ? Math.ceil((summary.totalSales * (summary.totalSales >= 1200000 ? 0.02 : 0.01)) / 1000) * 1000 : 0);
    const totalBonus = bonusPerEmp * employeeCount;
    // Note: expectedCash in summary might already account for expenses but not bonus dynamically?
    // In getShiftSummary, expectedCash = start + sales - expenses.
    // So Net Expected = expectedCash - totalBonus.
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
            <span>TOTAL PREMIOS (${summary.totalSales >= 1200000 ? "2%" : "1%"}):</span>
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
