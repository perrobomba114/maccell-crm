"use client";

import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ClipboardPlus, Wrench } from "lucide-react";

import { createRepairAction } from "@/lib/actions/repairs";
import { printRepairTicket, printWetReport } from "@/lib/print-utils";
import { normalizeRepairIntake, summarizeRepairIntake } from "@/lib/repairs/intake";
import { businessHoursService } from "@/lib/services/business-hours";
import {
    CreateRepairFormFields,
    type WarrantyRepairSelection,
} from "./create-repair-form-fields";
import {
    createInitialRepairFormState,
    createRepairFormReducer,
    type CreateRepairFormErrors,
} from "./create-repair-form-state";
import { RepairCreateConfirmDialog } from "./repair-create-confirm-dialog";

interface CreateRepairFormProps {
    branchId: string;
    userId: string;
    redirectPath?: string;
    hidePrice?: boolean;
    hideParts?: boolean;
    ticketPrefix?: string | null;
    vendors?: {
        id: string;
        name: string;
        branch: { id: string; name: string; code: string } | null;
    }[];
}

function roundUpTo15(date: Date): Date {
    const rounded = new Date(date);
    const remainder = rounded.getMinutes() % 15;
    if (remainder === 0) return rounded;
    rounded.setMinutes(rounded.getMinutes() + 15 - remainder);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
}

function getInitialPromisedAt(): Date {
    const target = roundUpTo15(businessHoursService.addBusinessMinutes(new Date(), 60));
    return businessHoursService.ensureBusinessHours(target);
}

function formatNumber(value: string): string {
    return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function CreateRepairForm({
    branchId,
    userId,
    redirectPath = "/admin/repairs",
    hidePrice = false,
    hideParts = false,
    ticketPrefix,
    vendors,
}: CreateRepairFormProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const confirmationAcceptedRef = useRef(false);
    const [state, dispatch] = useReducer(
        createRepairFormReducer,
        undefined,
        () => createInitialRepairFormState(getInitialPromisedAt(), userId),
    );
    const selectedVendor = vendors?.find((vendor) => vendor.id === state.selectedUserId);
    const activeBranchId = selectedVendor?.branch?.id ?? branchId;
    const activeTicketPrefix = selectedVendor?.branch?.code ?? ticketPrefix;
    const intakeSummary = summarizeRepairIntake(state.intake);

    const handlePriceChange = (event: { target: { value: string } }) => {
        dispatch({
            type: "setField",
            field: "estimatedPrice",
            value: formatNumber(event.target.value),
        });
    };

    const handleWarrantySelect = (repair: WarrantyRepairSelection | null) => {
        if (!repair) return;
        dispatch({ type: "setField", field: "customerName", value: repair.customerName || "" });
        dispatch({ type: "setField", field: "customerPhone", value: repair.customerPhone || "" });
        dispatch({ type: "setField", field: "customerEmail", value: repair.customerEmail || "" });
        dispatch({ type: "setField", field: "brand", value: repair.deviceBrand || "" });
        dispatch({ type: "setField", field: "model", value: repair.deviceModel || "" });
        dispatch({ type: "setField", field: "problem", value: `GARANTIA - ${repair.problemDescription || ""}` });
        dispatch({ type: "setField", field: "estimatedPrice", value: "0" });
        toast.info("Datos cargados del ticket original");
    };

    const validateForm = (): CreateRepairFormErrors => {
        const errors: CreateRepairFormErrors = {};
        if (!state.customerName) errors.name = "Requerido";
        if (!state.customerPhone || state.customerPhone.length !== 10) errors.phone = "10 dígitos";
        if (!state.brand) errors.brand = "Requerido";
        if (!state.model) errors.model = "Requerido";
        if (!state.problem) errors.problem = "Requerido";
        if (!state.ticketNumber) errors.ticket = "Requerido";
        if (state.isWarranty && !state.originalRepairId) errors.warranty = "Falta original";
        if (state.estimatedPrice.replace(/\./g, "") === "") errors.price = "Requerido";

        const intakeResult = normalizeRepairIntake(state.intake);
        if (!intakeResult.success) errors.intake = intakeResult.error;
        return errors;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        dispatch({ type: "setField", field: "isSubmitting", value: true });
        dispatch({ type: "setField", field: "errors", value: {} });

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            dispatch({ type: "setField", field: "errors", value: errors });
            dispatch({ type: "setField", field: "isSubmitting", value: false });
            toast.error("Datos incompletos.");
            return;
        }

        if (!confirmationAcceptedRef.current) {
            dispatch({ type: "setField", field: "showConfirmDialog", value: true });
            dispatch({ type: "setField", field: "isSubmitting", value: false });
            return;
        }

        try {
            const formData = new FormData(event.currentTarget);
            formData.set("branchId", activeBranchId);
            formData.set("userId", state.selectedUserId);
            formData.set("estimatedPrice", state.estimatedPrice.replace(/\./g, ""));
            formData.set("isWarranty", String(state.isWarranty));
            formData.set("isWet", String(state.isWet));
            formData.set("accessType", state.intake.accessType);
            formData.set("accessCredential", state.intake.accessCredential ?? "");
            formData.set("hasSimCard", String(state.intake.hasSimCard));
            formData.set("hasMemoryCard", String(state.intake.hasMemoryCard));
            if (state.originalRepairId) formData.set("originalRepairId", state.originalRepairId);
            formData.set("customerName", state.customerName);
            formData.set("customerPhone", state.customerPhone);
            formData.set("customerEmail", state.customerEmail);
            formData.set("deviceBrand", state.brand);
            formData.set("deviceModel", state.model);
            formData.set("problemDescription", state.problem);
            formData.set("notes", state.notes);
            formData.set("promisedAt", state.promisedAt.toISOString());
            formData.set("ticketNumber", state.ticketNumber);
            formData.set("spareParts", JSON.stringify(state.selectedParts.map((part) => ({ id: part.id, quantity: 1 }))));

            const result = await createRepairAction(formData);
            if (!result.success || !result.repair) {
                toast.error(result.error);
                return;
            }

            const repair = result.repair;
            toast.success("Reparación registrada.");
            printRepairTicket(repair);
            if (repair.isWet) {
                setTimeout(() => printWetReport(repair), 2500);
            }
            setTimeout(() => router.push(redirectPath), repair.isWet ? 4000 : 1500);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error inesperado";
            console.error(message);
            toast.error("Error inesperado");
        } finally {
            confirmationAcceptedRef.current = false;
            dispatch({ type: "setField", field: "isSubmitting", value: false });
            dispatch({ type: "setField", field: "showConfirmDialog", value: false });
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const target = event.target as HTMLElement;
        const focusOrder = [
            "customer-name", "customer-phone", "customer-email", "device-brand",
            "device-model", "device-problem", "access-credential", "estimated-price", "ticket-number",
        ];
        const currentIndex = focusOrder.indexOf(target.id);
        const nextId = focusOrder[currentIndex + 1];
        if (currentIndex >= 0 && nextId) document.getElementById(nextId)?.focus();
    };

    const confirmSubmission = () => {
        confirmationAcceptedRef.current = true;
        formRef.current?.requestSubmit();
    };

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 md:py-6"
        >
            <header className="relative mb-5 overflow-hidden rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-sm sm:px-6">
                <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Wrench aria-hidden="true" className="h-6 w-6" />
                        </span>
                        <div>
                            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                <ClipboardPlus aria-hidden="true" className="h-4 w-4" />
                                Servicio técnico
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Nuevo ingreso</h1>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                                Registrá el equipo y verificá la recepción con el cliente antes de generar el ticket.
                            </p>
                        </div>
                    </div>
                    <ol aria-label="Flujo del formulario" className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                        {["Cliente", "Equipo", "Recepción", "Ticket", "Entrega"].map((label, index) => (
                            <li key={label} className="flex items-center gap-2">
                                <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5">
                                    {index + 1}. {label}
                                </span>
                                {index < 4 ? <ArrowRight aria-hidden="true" className="hidden h-3.5 w-3.5 text-border sm:block" /> : null}
                            </li>
                        ))}
                    </ol>
                </div>
            </header>
            <CreateRepairFormFields
                state={state}
                dispatch={dispatch}
                branchId={branchId}
                activeBranchId={activeBranchId}
                activeTicketPrefix={activeTicketPrefix}
                vendors={vendors}
                hidePrice={hidePrice}
                hideParts={hideParts}
                onWarrantySelect={handleWarrantySelect}
                onPriceChange={handlePriceChange}
            />
            <RepairCreateConfirmDialog
                open={state.showConfirmDialog}
                accessLabel={intakeSummary.accessLabel}
                accessoriesLabel={intakeSummary.accessoriesLabel}
                isWet={state.isWet}
                onOpenChange={(value) => dispatch({ type: "setField", field: "showConfirmDialog", value })}
                onConfirm={confirmSubmission}
            />
        </form>
    );
}
