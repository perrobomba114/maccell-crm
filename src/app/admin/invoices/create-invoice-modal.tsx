"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, CircleCheck, Loader2 } from "lucide-react";
import { useInvoiceForm } from "@/hooks/use-invoice-form";
import { InvoiceCustomerSection } from "./components/InvoiceCustomerSection";
import { InvoiceConfigSection } from "./components/InvoiceConfigSection";
import { InvoiceItemsSection } from "./components/InvoiceItemsSection";
import { InvoiceTotalsSummary } from "./components/InvoiceTotalsSummary";
import type { InvoiceBranchOption } from "@/types/invoice-form";

export function CreateInvoiceModal({ branches, userId }: { branches: InvoiceBranchOption[], userId: string }) {
    const {
        open, setOpen, isLoading, isSearching,
        branchId, setBranchId, salesPoint, setSalesPoint,
        invoiceType, setInvoiceType, billingEntity, setBillingEntity,
        concept, setConcept, serviceDateFrom, setServiceDateFrom,
        serviceDateTo, setServiceDateTo, paymentDueDate, setPaymentDueDate,
        docType, docNumber, setDocNumber,
        customerName, setCustomerName, customerAddress, setCustomerAddress,
        ivaCondition, items, totals,
        handleAddItem, handleRemoveItem, handleUpdateItem,
        handleSearchCuit, handleSubmit
    } = useInvoiceForm(branches, userId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500/30">
                    <Plus className="w-4 h-4 mr-2" /> Emitir Factura Admin
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[95vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-0 rounded-3xl gap-0 shadow-2xl">
                <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-950 sticky top-0 z-20">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <CircleCheck className="w-8 h-8 text-blue-500" /> Generador de Comprobantes AFIP
                        </DialogTitle>
                        <div className="hidden lg:flex gap-4">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white hover:bg-zinc-900">Cancelar</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="bg-white hover:bg-zinc-200 text-black font-black px-8 h-12 rounded-xl transition-all active:scale-95"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                EMITIR FACTURA {invoiceType}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 pb-32">
                    <InvoiceCustomerSection
                        docNumber={docNumber}
                        docType={docType}
                        customerName={customerName}
                        customerAddress={customerAddress}
                        ivaCondition={ivaCondition}
                        isSearching={isSearching}
                        setDocNumber={setDocNumber}
                        setCustomerName={setCustomerName}
                        setCustomerAddress={setCustomerAddress}
                        handleSearchCuit={handleSearchCuit}
                    />

                    <InvoiceConfigSection
                        billingEntity={billingEntity}
                        invoiceType={invoiceType}
                        concept={concept}
                        serviceDateFrom={serviceDateFrom}
                        serviceDateTo={serviceDateTo}
                        paymentDueDate={paymentDueDate}
                        branchId={branchId}
                        branches={branches}
                        setBillingEntity={setBillingEntity}
                        setInvoiceType={setInvoiceType}
                        setConcept={setConcept}
                        setServiceDateFrom={setServiceDateFrom}
                        setServiceDateTo={setServiceDateTo}
                        setPaymentDueDate={setPaymentDueDate}
                        setBranchId={setBranchId}
                    />

                    <div className="lg:col-span-12">
                        <InvoiceItemsSection
                            items={items}
                            handleAddItem={handleAddItem}
                            handleUpdateItem={handleUpdateItem}
                            handleRemoveItem={handleRemoveItem}
                        />
                    </div>
                </div>

                <div className="sticky bottom-0 z-30 p-8 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
                        <div className="lg:col-span-8 flex flex-col gap-2">
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Entidad de Facturación Activa</p>
                            <div className="flex gap-4">
                                <div className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${billingEntity === 'MACCELL' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600 opacity-50'}`}>MACCELL S.A.</div>
                                <div className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${billingEntity === '8BIT' ? 'bg-purple-600/10 border-purple-500 text-purple-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600 opacity-50'}`}>8 BIT SOLUCIONES</div>
                            </div>
                        </div>
                        <div className="lg:col-span-4">
                            <InvoiceTotalsSummary totals={totals} />
                            <div className="lg:hidden mt-6">
                                <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-white hover:bg-zinc-200 text-black font-black h-14 rounded-xl text-lg">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "EMITIR FACTURA"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
