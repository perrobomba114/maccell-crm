"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, CircleCheck, FileCheck2, Loader2, Plus, ShieldAlert } from "lucide-react";
import { useInvoiceForm } from "@/hooks/use-invoice-form";
import { InvoiceCustomerSection } from "./components/InvoiceCustomerSection";
import { InvoiceConfigSection } from "./components/InvoiceConfigSection";
import { InvoiceItemsSection } from "./components/InvoiceItemsSection";
import { InvoiceTotalsSummary } from "./components/InvoiceTotalsSummary";
import type { InvoiceBranchOption } from "@/types/invoice-form";

export function CreateInvoiceModal({ branches }: { branches: InvoiceBranchOption[] }) {
    const form = useInvoiceForm(branches);
    const activeBranch = branches.find((branch) => branch.id === form.branchId);
    const salesPoint = form.billingEntity === "8BIT" ? 3 : 10;

    return (
        <Dialog open={form.open} onOpenChange={form.setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 font-bold text-white hover:bg-emerald-500">
                    <Plus className="h-4 w-4" /> Emitir factura
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[94vh] max-w-[96vw] gap-0 overflow-y-auto rounded-xl border-border bg-background p-0 shadow-2xl lg:max-w-5xl">
                <DialogHeader className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <DialogTitle className="flex items-center gap-2 text-lg font-black sm:text-xl">
                            <CircleCheck className="h-5 w-5 text-emerald-500" />
                            {form.step === "FORM" ? "Nueva factura electrónica" : form.step === "REVIEW" ? "Revisar antes de emitir" : "Factura autorizada"}
                        </DialogTitle>
                        <span className="rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Paso {form.step === "FORM" ? "1 de 2" : form.step === "REVIEW" ? "2 de 2" : "completado"}
                        </span>
                    </div>
                </DialogHeader>

                {form.step === "FORM" ? (
                    <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-12">
                        <InvoiceCustomerSection
                            docNumber={form.docNumber}
                            docType={form.docType}
                            customerName={form.customerName}
                            customerAddress={form.customerAddress}
                            ivaCondition={form.ivaCondition}
                            isSearching={form.isSearching}
                            setDocNumber={form.setDocNumber}
                            setCustomerName={form.setCustomerName}
                            setCustomerAddress={form.setCustomerAddress}
                            handleSearchCuit={form.handleSearchCuit}
                        />
                        <InvoiceConfigSection
                            billingEntity={form.billingEntity}
                            invoiceType={form.invoiceType}
                            concept={form.concept}
                            paymentMethod={form.paymentMethod}
                            serviceDateFrom={form.serviceDateFrom}
                            serviceDateTo={form.serviceDateTo}
                            paymentDueDate={form.paymentDueDate}
                            branchId={form.branchId}
                            branches={branches}
                            branchesByEntity={form.branchesByEntity}
                            setBillingEntity={form.setBillingEntity}
                            setInvoiceType={form.setInvoiceType}
                            setConcept={form.setConcept}
                            setPaymentMethod={form.setPaymentMethod}
                            setServiceDateFrom={form.setServiceDateFrom}
                            setServiceDateTo={form.setServiceDateTo}
                            setPaymentDueDate={form.setPaymentDueDate}
                            setBranchId={form.setBranchId}
                        />
                        <div className="lg:col-span-12">
                            <InvoiceItemsSection
                                items={form.items}
                                handleAddItem={form.handleAddItem}
                                handleUpdateItem={form.handleUpdateItem}
                                handleRemoveItem={form.handleRemoveItem}
                            />
                        </div>
                    </div>
                ) : form.step === "REVIEW" ? (
                    <div className="space-y-5 p-5 sm:p-6">
                        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                            <p><b>La emisión en ARCA es irreversible.</b> Verificá entidad, receptor e importes antes de confirmar.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <ReviewField label="Entidad fiscal" value={form.billingEntity === "8BIT" ? "8 Bit Accesorios" : "MACCELL"} />
                            <ReviewField label="Punto de venta" value={String(salesPoint).padStart(5, "0")} />
                            <ReviewField label="Comprobante" value={`Factura ${form.invoiceType}`} />
                            <ReviewField label="Sucursal" value={activeBranch?.name || "Sin seleccionar"} />
                            <ReviewField label="Receptor" value={form.customerName} />
                            <ReviewField label="Documento" value={form.docNumber || "Consumidor final"} />
                            <ReviewField label="Condición IVA" value={form.ivaCondition} />
                            <ReviewField label="Concepto" value={form.concept === 1 ? "Productos" : form.concept === 2 ? "Servicios" : "Mixto"} />
                            <ReviewField label="Medio de pago" value={form.paymentMethod === "CASH" ? "Efectivo" : form.paymentMethod === "CARD" ? "Tarjeta" : "Mercado Pago"} />
                        </div>
                        <div className="rounded-lg border">
                            {form.items.map((item) => (
                                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 border-b px-4 py-3 text-sm last:border-0">
                                    <span>{item.quantity} × {item.description}</span>
                                    <b className="tabular-nums">${(item.quantity * item.unitPrice).toLocaleString("es-AR")}</b>
                                </div>
                            ))}
                        </div>
                        <InvoiceTotalsSummary totals={form.totals} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 p-8 text-center">
                        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                        <div><h3 className="text-xl font-black">Factura guardada correctamente</h3><p className="text-sm text-muted-foreground">ARCA autorizó el comprobante y quedó sincronizado localmente.</p></div>
                        <div className="grid w-full max-w-xl gap-3 rounded-lg border p-4 text-left sm:grid-cols-2">
                            <ReviewField label="Comprobante" value={form.result?.voucherNumber || "—"} />
                            <ReviewField label="CAE" value={form.result?.cae || "—"} />
                        </div>
                    </div>
                )}

                <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t bg-background/95 p-4 backdrop-blur sm:flex-row sm:justify-end">
                    {form.step === "FORM" ? (
                        <>
                            <Button variant="ghost" onClick={() => form.setOpen(false)}>Cancelar</Button>
                            <Button onClick={form.handleReview} className="bg-emerald-600 font-bold text-white hover:bg-emerald-500">
                                <FileCheck2 className="h-4 w-4" /> Revisar factura
                            </Button>
                        </>
                    ) : form.step === "REVIEW" ? (
                        <>
                            <Button variant="outline" onClick={() => form.setStep("FORM")} disabled={form.isLoading}><ArrowLeft className="h-4 w-4" /> Corregir</Button>
                            <Button onClick={form.handleSubmit} disabled={form.isLoading} className="bg-rose-600 font-black text-white hover:bg-rose-500">
                                {form.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                                {form.isLoading ? "Emitiendo en ARCA…" : "Confirmar y emitir en ARCA"}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => form.setOpen(false)} className="bg-emerald-600 font-bold text-white hover:bg-emerald-500">Cerrar</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ReviewField({ label, value }: { label: string; value: string }) {
    return <div className="min-w-0 rounded-md bg-muted/40 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>;
}
