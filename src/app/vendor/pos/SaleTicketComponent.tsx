
import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface SaleTicketProps {
    branch: any;
    items: any[];
    total: number;
    method: string;
    date: Date;
    saleId?: string;
}

export const SaleTicketComponent = React.forwardRef<HTMLDivElement, SaleTicketProps>((props, ref) => {
    const { branch, items, total, method, date, saleId } = props;
    const logoUrl = branch?.imageUrl || "/logo.jpg";
    const name = branch?.name?.toLowerCase() || "";

    // Determine Review URL (kept logically but QR removed per previous stability fix)
    let reviewUrl = "";
    if (name.includes("maccell 1")) reviewUrl = "https://g.page/r/CXxoxXDBkdUHEBM/review";
    else if (name.includes("maccell 2")) reviewUrl = "https://g.page/r/CUDOPxaFDtE8EBM/review";
    else if (name.includes("maccell 3")) reviewUrl = "https://g.page/r/CaCjgfR2f4GbEBM/review";
    else if (name.includes("8 bits")) reviewUrl = "https://g.page/r/CYdXt1QE9sJAEBM/review";

    return (
        <div ref={ref} className="print-container" style={{
            fontFamily: "'Courier New', monospace",
            width: "80mm",
            margin: "0",
            padding: "2mm",
            fontSize: "12px", // Slightly smaller base for better fit
            color: "black",
            fontWeight: "bold",
            backgroundColor: "white"
        }}>
            <style type="text/css" media="print">
                {`
                   @page { margin: 0; size: 80mm auto; }
                   body { margin: 0; padding: 0; }
                   .print-container { width: 100%; }
                `}
            </style>

            {/* HEADER */}
            <div style={{ textAlign: "center", marginBottom: "10px", borderBottom: "2px dashed black", paddingBottom: "10px" }}>
                <img src={logoUrl} alt="Logo" style={{ width: "40mm", height: "auto", margin: "0 auto 5px auto", display: "block", filter: "grayscale(100%)" }} onError={(e) => e.currentTarget.style.display = 'none'} />

                <div style={{ fontSize: "16px", fontWeight: 900, margin: "5px 0", textTransform: "uppercase" }}>
                    {branch?.name || "MACCELL"}
                </div>

                {branch?.address && (
                    <div style={{ fontSize: "10px", marginTop: "2px", whiteSpace: "pre-wrap" }}>
                        {branch.address}
                    </div>
                )}
                {branch?.phone && (
                    <div style={{ fontSize: "10px", marginTop: "2px" }}>
                        Tel: {branch.phone}
                    </div>
                )}

                <div style={{ fontSize: "10px", marginTop: "5px" }}>
                    {format(date, "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
                {saleId && (
                    <div style={{ fontSize: "10px" }}>Ticket #{saleId.slice(-6)}</div>
                )}
            </div>

            {/* ITEMS */}
            <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid black", paddingBottom: "2px", marginBottom: "5px", fontWeight: 900, fontSize: "10px" }}>
                    <span style={{ width: "15%", textAlign: "left" }}>CANT</span>
                    <span style={{ width: "55%", textAlign: "left" }}>DESCRIPCION</span>
                    <span style={{ width: "30%", textAlign: "right" }}>TOTAL</span>
                </div>
                {items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontSize: "11px" }}>
                        <span style={{ width: "15%", textAlign: "left" }}>{item.quantity}</span>
                        <span style={{ width: "55%", textAlign: "left", whiteSpace: "normal" }}>{item.name}</span>
                        <span style={{ width: "30%", textAlign: "right" }}>${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                ))}
            </div>

            {/* TOTALS */}
            <div style={{ marginTop: "10px", borderTop: "2px dashed black", paddingTop: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 900 }}>
                    <span>TOTAL</span>
                    <span>${total.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "10px", textAlign: "right", marginTop: "2px", textTransform: "uppercase" }}>
                    PAGO: {method}
                </div>
            </div>

            {/* FOOTER */}
            <div style={{ textAlign: "center", marginTop: "15px", fontSize: "10px" }}>
                <div>¡Muchas gracias por su compra!</div>
                <div>Lo esperamos nuevamente.</div>
            </div>

            {/* INVISIBLE SPACER FOR THERMAL CUTTER */}
            <div style={{ height: "10mm" }}></div>
        </div>
    );
});

SaleTicketComponent.displayName = "SaleTicketComponent";
