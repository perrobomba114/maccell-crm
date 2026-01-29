"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Droplets, AlertTriangle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { WarrantySection } from "./warranty-section";
import { CustomerForm } from "./customer-form";
import { DeviceDetails } from "./device-details";
import { TicketInput } from "./ticket-input";
import { RepairImages } from "./repair-images";
import { PromisedDateSelector } from "./promised-date-selector";
import { SparePartSelector, SparePartItem } from "./spare-part-selector";
import { SmartPriceInput } from "./smart-price-input";
import { createRepairAction } from "@/lib/actions/repairs";
import { printRepairTicket, printWetReport } from "@/lib/print-utils";

interface CreateRepairFormProps {
    branchId: string;
    userId: string;
    redirectPath?: string;
    hidePrice?: boolean;
    hideParts?: boolean;
    ticketPrefix?: string | null;
    vendors?: { id: string; name: string; branch: { id: string; name: string; code: string } | null }[];
}

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { businessHoursService } from "@/lib/services/business-hours";

// Helper for rounding up to next 15 minutes
function roundUpTo15(date: Date): Date {
    const d = new Date(date);
    const minutes = d.getMinutes();
    const remainder = minutes % 15;
    if (remainder === 0) return d; // Already on 15m mark? Keep it or add 15? User said "redondeado". 
    // Usually if it is 09:35 -> 09:45. 
    // If it is 09:30 -> 09:30.
    const add = 15 - remainder;
    d.setMinutes(minutes + add);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

export function CreateRepairForm({ branchId, userId, redirectPath = "/admin/repairs", hidePrice = false, hideParts = false, ticketPrefix, vendors }: CreateRepairFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Vendor Selection State
    const [selectedUserId, setSelectedUserId] = useState(userId);
    const selectedVendor = vendors?.find(v => v.id === selectedUserId);

    // Determine active branch context
    // If a vendor is selected and has a branch, use that. Otherwise fallback to prop.
    const activeBranchId = selectedVendor?.branch?.id ?? branchId;
    // Assuming ticket prefix is the branch code? The prop `ticketPrefix` comes from server.
    // We should try to derive it from the selected vendor's branch code if available.
    const activeTicketPrefix = selectedVendor?.branch?.code ?? ticketPrefix;

    // Form State
    const [isWarranty, setIsWarranty] = useState(false);
    const [isWet, setIsWet] = useState(false);
    const [originalRepairId, setOriginalRepairId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [problem, setProblem] = useState("");
    const [notes, setNotes] = useState("");
    const [promisedAt, setPromisedAt] = useState<Date>(() => {
        // "Now + 1 hour (business time) -> Rounded to 15m"
        const now = new Date();
        // 1. Add 60 business minutes
        let target = businessHoursService.addBusinessMinutes(now, 60);
        // 2. Round up to next 15m slot
        target = roundUpTo15(target);
        // 3. Ensure we didn't push into a closed slot (or if roundUp pushed it there)
        target = businessHoursService.ensureBusinessHours(target);

        return target;
    });
    const [ticketNumber, setTicketNumber] = useState("");
    const [selectedParts, setSelectedParts] = useState<SparePartItem[]>([]);
    const [estimatedPrice, setEstimatedPrice] = useState(""); // Controlled input for formatting
    const [errors, setErrors] = useState<any>({});

    // Helper to format number with dots
    const formatNumber = (value: string) => {
        // Remove non-digits
        const number = value.replace(/\D/g, "");
        // Format with dots
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const formatted = formatNumber(value);
        setEstimatedPrice(formatted);
    };

    const handleWarrantySelect = (repair: any) => {
        if (!repair) return;
        setCustomerName(repair.customerName || "");
        setCustomerPhone(repair.customerPhone || "");
        setCustomerEmail(repair.customerEmail || "");
        setBrand(repair.deviceBrand || "");
        setModel(repair.deviceModel || "");
        setProblem(`GARANTIA - ${repair.problemDescription || ""}`);
        setEstimatedPrice("0");
        toast.info("Datos cargados del ticket original");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // Client Validation
        const newErrors: any = {};
        if (!customerName) newErrors.name = "Requerido";
        if (!customerPhone || customerPhone.length !== 10) newErrors.phone = "10 dígitos";
        if (!brand) newErrors.brand = "Requerido";
        if (!model) newErrors.model = "Requerido";
        if (!problem) newErrors.problem = "Requerido";
        if (!ticketNumber) newErrors.ticket = "Requerido";
        if (isWarranty && !originalRepairId) newErrors.warranty = "Falta original";

        // Validate Price (Must be present, 0 is OK)
        // Clean dots for validation
        const rawPrice = estimatedPrice.replace(/\./g, "");
        if (rawPrice === "" || rawPrice === null) {
            newErrors.price = "Requerido";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            toast.error("Datos incompletos.");
            return;
        }

        // --- STAGE 1: Checklist Warning ---
        if (!showConfirmDialog) {
            setShowConfirmDialog(true);
            setIsSubmitting(false);
            return;
        }

        // --- STAGE 2: Real Submission ---
        try {
            const formData = new FormData(e.currentTarget);
            formData.set("branchId", activeBranchId); // Use dynamic branch ID
            // Use selected vendor if available, otherwise default to prop (current user)
            formData.set("userId", selectedUserId);

            // Clean price for submission
            const cleanPrice = estimatedPrice.replace(/\./g, "");
            formData.set("estimatedPrice", cleanPrice);

            formData.set("estimatedPrice", cleanPrice);

            formData.set("isWarranty", String(isWarranty));
            formData.set("isWet", String(isWet));
            if (originalRepairId) formData.set("originalRepairId", originalRepairId);
            formData.set("customerName", customerName);
            formData.set("customerPhone", customerPhone);
            formData.set("customerEmail", customerEmail);
            formData.set("deviceBrand", brand);
            formData.set("deviceModel", model);
            formData.set("problemDescription", problem);
            formData.set("notes", notes);
            formData.set("promisedAt", promisedAt.toISOString());
            formData.set("ticketNumber", ticketNumber);
            formData.set("spareParts", JSON.stringify(selectedParts.map(p => ({ id: p.id, quantity: 1 }))));

            const result = await createRepairAction(formData);
            if (result.success) {
                toast.success("Reparación registrada.");

                // Auto-print Ticket
                if (result.repair) {
                    printRepairTicket(result.repair);

                    // Auto-print Wet Report if applicable (delayed to avoid spam protection)
                    if ((result.repair as any).isWet) {
                        setTimeout(() => {
                            printWetReport(result.repair);
                        }, 2500);
                    }
                }

                // Redirect after delay to allow print to trigger
                setTimeout(() => {
                    const finalPath = redirectPath;
                    router.push(finalPath);
                }, (result.repair as any).isWet ? 4000 : 1500);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error inesperado");
        } finally {
            setIsSubmitting(false);
            setShowConfirmDialog(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            // STRICTLY prevent default form submission on Enter in all cases
            e.preventDefault();

            const target = e.target as HTMLElement;

            // List of Input IDs in order for navigation
            const focusOrder = [
                "customer-name",
                "customer-phone",
                "customer-email",
                "device-brand",
                "device-model",
                "device-problem",
                "estimated-price",
                "ticket-number"
            ];

            const currentIndex = focusOrder.indexOf(target.id);
            if (currentIndex !== -1 && currentIndex < focusOrder.length - 1) {
                const nextId = focusOrder[currentIndex + 1];
                const nextElement = document.getElementById(nextId);
                if (nextElement) {
                    nextElement.focus();
                }
            }
            // If it's the last element (ticket-number), we DO NOT submit. 
            // We just stop there. User must click the button.
        }
    };

    return (
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="w-full max-w-5xl mx-auto p-4 md:p-6" suppressHydrationWarning>
            <div className="bg-card border rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6">
                    {/* SECTION: CUSTOMER */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">1. Cliente</h2>
                            <WarrantySection
                                isWarranty={isWarranty}
                                onIsWarrantyChange={setIsWarranty}
                                originalRepairId={originalRepairId}
                                onOriginalRepairChange={setOriginalRepairId}
                                onRepairSelected={handleWarrantySelect}
                                branchId={branchId}
                                compact={true}
                            />
                        </div>

                        {/* VENDOR SELECTION (Admin only if vendors prop provided) */}
                        {vendors && vendors.length > 0 && (
                            <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                                    Vendedor Responsable
                                </label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue placeholder="Seleccionar vendedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name} {vendor.branch ? `(${vendor.branch.name})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <CustomerForm
                            name={customerName} onNameChange={setCustomerName}
                            phone={customerPhone} onPhoneChange={setCustomerPhone}
                            email={customerEmail} onEmailChange={setCustomerEmail}
                            errors={errors}
                        />
                    </div>

                    <div className="h-px bg-border w-full" />

                    {/* SECTION: DEVICE */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">2. Dispositivo</h2>
                        <DeviceDetails
                            brand={brand} onBrandChange={setBrand}
                            model={model} onModelChange={(val) => setModel(val.toUpperCase())}
                            problem={problem} onProblemChange={setProblem}
                            errors={errors}
                        />
                    </div>

                    {/* SECTION: PRICE */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">3. Valor Reparación</h2>
                        <div className="relative">
                            {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span> */}
                            {/* Replaced with SmartPriceInput which handles styling internally but we need to match layout */}
                            <SmartPriceInput
                                value={estimatedPrice}
                                onChange={(e) => {
                                    // Make sure we pass a compatible event-like object or adapt handlePriceChange
                                    handlePriceChange(e as any);
                                }}
                                error={errors.price}
                            />
                        </div>
                        {errors.price && <p className="text-sm text-red-500 font-medium">{errors.price}</p>}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-6">

                    {/* TICKET */}
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">4. Ticket</h2>
                        <TicketInput
                            value={ticketNumber}
                            onChange={setTicketNumber}
                            branchId={activeBranchId} // Use dynamic branch ID
                            ticketPrefix={activeTicketPrefix} // Use dynamic prefix
                            error={errors.ticket}
                        />
                    </div>

                    <div className="h-px bg-border w-full" />

                    {/* PARTS */}
                    {!hideParts && (
                        <div className="space-y-2">
                            <SparePartSelector
                                selectedParts={selectedParts}
                                onPartsChange={setSelectedParts}
                                hidePrice={hidePrice}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <RepairImages />
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center space-x-3">
                        <Checkbox
                            id="isWet"
                            checked={isWet}
                            onCheckedChange={(c) => setIsWet(c === true)}
                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="isWet"
                                className="text-sm font-bold text-blue-500 flex items-center gap-2 cursor-pointer"
                            >
                                <Droplets className="w-4 h-4" />
                                EQUIPO MOJADO / CON HUMEDAD
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Se requiere informe técnico y firma adicional.
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-border w-full" />

                    {/* DATE & SAVE */}
                    <div className="space-y-4 mt-auto pt-4 md:pt-0">
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">5. Entrega</h2>
                            <PromisedDateSelector
                                date={promisedAt}
                                onChange={setPromisedAt}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 w-6 h-6" /> INGRESAR REPARACIÓN</>}
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="w-[95vw] sm:max-w-5xl bg-zinc-950 border-zinc-800 border-2 p-6 sm:p-10">
                    <AlertDialogHeader className="flex flex-col items-center justify-center">
                        <AlertDialogTitle className="text-xl sm:text-3xl font-black text-center text-yellow-500 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 uppercase tracking-tighter">
                            <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12" />
                            ¡ADVERTENCIA DE SEGURIDAD!
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-6 pt-4 w-full">
                            <Alert className="bg-yellow-500/10 border-yellow-500/50 p-6 flex flex-col items-center text-center">
                                <div className="flex flex-col items-center justify-center w-full">
                                    <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
                                    <AlertTitle className="text-2xl font-bold text-yellow-500 mb-4 block">CHECKLIST OBLIGATORIO</AlertTitle>
                                    <AlertDescription className="text-xl text-yellow-100/90 leading-relaxed font-medium w-full">
                                        Antes de continuar, debés confirmar que realizaste las siguientes preguntas al cliente:
                                        <div className="flex justify-center w-full">
                                            <ul className="list-disc text-left mt-6 space-y-4 text-yellow-400 font-bold text-lg inline-block">
                                                <li>¿Solicitaste el PATRÓN o PIN de desbloqueo?</li>
                                                <li>¿Preguntaste si el equipo se MOJÓ o tuvo líquidos?</li>
                                            </ul>
                                        </div>
                                    </AlertDescription>
                                </div>
                            </Alert>
                            <p className="text-zinc-400 text-center text-lg italic">
                                La omisión de estos datos dificulta el trabajo técnico y retrasa la reparación.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 justify-center items-center">
                        <AlertDialogCancel className="w-full sm:w-1/2 h-14 sm:h-16 text-sm sm:text-lg bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                            VOLVER A LOS DATOS
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                // Trigger submission again, this time with showConfirmDialog = true
                                // We simulate a form submission event
                                const form = document.querySelector('form');
                                if (form) {
                                    const event = new Event('submit', { cancelable: true, bubbles: true });
                                    form.dispatchEvent(event);
                                }
                            }}
                            className="w-full sm:w-1/2 h-14 sm:h-16 text-base sm:text-xl font-black bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_30px_rgba(234,179,8,0.3)] whitespace-normal"
                        >
                            SÍ, TODO VERIFICADO - REGISTRAR
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    );
}
