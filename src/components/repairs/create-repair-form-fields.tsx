"use client";

import type { Dispatch } from "react";
import { CalendarClock, Droplets, Loader2, Save, ShieldCheck, Smartphone, Ticket, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerForm } from "./customer-form";
import { DeviceDetails } from "./device-details";
import { PromisedDateSelector } from "./promised-date-selector";
import { RepairFormSection } from "./repair-form-section";
import { RepairImages } from "./repair-images";
import { RepairIntakeFields } from "./repair-intake-fields";
import { SmartPriceInput } from "./smart-price-input";
import { SparePartSelector } from "./spare-part-selector";
import { TicketInput } from "./ticket-input";
import { WarrantySection } from "./warranty-section";
import type { CreateRepairFormAction, CreateRepairFormState } from "./create-repair-form-state";

export type WarrantyRepairSelection = {
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    problemDescription?: string | null;
};

type VendorOption = {
    id: string;
    name: string;
    branch: { id: string; name: string; code: string } | null;
};

interface CreateRepairFormFieldsProps {
    state: CreateRepairFormState;
    dispatch: Dispatch<CreateRepairFormAction>;
    branchId: string;
    activeBranchId: string;
    activeTicketPrefix?: string | null;
    vendors?: VendorOption[];
    hidePrice: boolean;
    hideParts: boolean;
    onWarrantySelect: (repair: WarrantyRepairSelection | null) => void;
    onPriceChange: (event: { target: { value: string } }) => void;
}

export function CreateRepairFormFields({
    state,
    dispatch,
    branchId,
    activeBranchId,
    activeTicketPrefix,
    vendors,
    hidePrice,
    hideParts,
    onWarrantySelect,
    onPriceChange,
}: CreateRepairFormFieldsProps) {
    const {
        selectedUserId, isSubmitting, isWarranty, isWet, originalRepairId,
        customerName, customerPhone, customerEmail, brand, model, problem,
        promisedAt, ticketNumber, selectedParts, estimatedPrice, errors, intake,
    } = state;

    return (
        <div className="rounded-[28px] border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.12] via-card/80 to-violet-500/[0.12] p-2 shadow-xl shadow-black/15 sm:p-3">
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                    <RepairFormSection
                        step={1}
                        title="Cliente"
                        icon={UserRound}
                        className="h-full"
                        action={<WarrantySection
                            isWarranty={isWarranty}
                            onIsWarrantyChange={(value) => dispatch({ type: "setField", field: "isWarranty", value })}
                            originalRepairId={originalRepairId}
                            onOriginalRepairChange={(value) => dispatch({ type: "setField", field: "originalRepairId", value })}
                            onRepairSelected={onWarrantySelect}
                            branchId={branchId}
                            compact
                        />}
                    >
                        {vendors && vendors.length > 0 ? (
                            <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Vendedor responsable</label>
                            <Select value={selectedUserId} onValueChange={(value) => dispatch({ type: "setField", field: "selectedUserId", value })}>
                                <SelectTrigger className="min-h-11 w-full bg-background/70"><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                                <SelectContent>
                                    {vendors.map((vendor) => (
                                        <SelectItem key={vendor.id} value={vendor.id}>
                                            {vendor.name} {vendor.branch ? `(${vendor.branch.name})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        ) : null}
                        <CustomerForm
                        name={customerName}
                        onNameChange={(value) => dispatch({ type: "setField", field: "customerName", value })}
                        phone={customerPhone}
                        onPhoneChange={(value) => dispatch({ type: "setField", field: "customerPhone", value })}
                        email={customerEmail}
                        onEmailChange={(value) => dispatch({ type: "setField", field: "customerEmail", value })}
                        errors={errors}
                        />
                    </RepairFormSection>

                    <RepairFormSection
                        step={2}
                        title="Dispositivo"
                        icon={Smartphone}
                        className="h-full"
                    >
                        <DeviceDetails
                        brand={brand}
                        onBrandChange={(value) => dispatch({ type: "setField", field: "brand", value })}
                        model={model}
                        onModelChange={(value) => dispatch({ type: "setField", field: "model", value: value.toUpperCase() })}
                        problem={problem}
                        onProblemChange={(value) => dispatch({ type: "setField", field: "problem", value })}
                        errors={errors}
                        />
                    </RepairFormSection>

                    <RepairFormSection
                        step={3}
                        title="Recepción"
                        icon={ShieldCheck}
                        className="lg:col-span-2"
                    >
                        <RepairIntakeFields
                        value={intake}
                        error={errors.intake}
                        onChange={(value) => dispatch({ type: "setIntake", value })}
                        />
                    </RepairFormSection>
                    <RepairFormSection
                        step={4}
                        title="Ticket y evidencia"
                        icon={Ticket}
                        className="lg:col-span-2"
                    >
                        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                            <div className="flex min-h-36 items-center rounded-2xl border border-sky-500/30 bg-sky-500/[0.09] p-4">
                                <div className="w-full">
                                <TicketInput
                                    value={ticketNumber}
                                    onChange={(value) => dispatch({ type: "setField", field: "ticketNumber", value })}
                                    branchId={activeBranchId}
                                    ticketPrefix={activeTicketPrefix}
                                    error={errors.ticket}
                                />
                                </div>
                            </div>
                            <div className="min-h-36 rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.09] p-4">
                                <RepairImages />
                            </div>
                            {!hideParts ? (
                                <div className="lg:col-span-2">
                                    <SparePartSelector
                                        selectedParts={selectedParts}
                                        onPartsChange={(value) => dispatch({ type: "setField", field: "selectedParts", value })}
                                        hidePrice={hidePrice}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </RepairFormSection>

                    <RepairFormSection
                        step={5}
                        title="Valor y entrega"
                        icon={CalendarClock}
                        className="lg:col-span-2"
                    >
                        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                            <div className="flex h-full flex-col gap-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.09] p-4">
                                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
                                    <Checkbox
                                        id="isWet"
                                        checked={isWet}
                                        onCheckedChange={(checked) => dispatch({ type: "setField", field: "isWet", value: checked === true })}
                                        className="data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500"
                                    />
                                    <Droplets aria-hidden="true" className="h-5 w-5 shrink-0 text-cyan-500" />
                                    <span className="min-w-0">
                                        <Label htmlFor="isWet" className="cursor-pointer text-sm font-semibold text-foreground">
                                            Equipo mojado o con humedad
                                        </Label>
                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                            Requiere informe técnico y firma adicional.
                                        </span>
                                    </span>
                                </label>

                                <div className="space-y-2">
                                    <Label htmlFor="estimated-price" className="text-sm font-medium">Valor estimado</Label>
                                    <SmartPriceInput value={estimatedPrice} onChange={onPriceChange} error={errors.price} />
                                    {errors.price ? <p role="alert" className="text-sm font-medium text-destructive">{errors.price}</p> : null}
                                </div>
                            </div>

                            <div className="flex h-full flex-col gap-5 rounded-2xl border border-sky-500/30 bg-sky-500/[0.09] p-4">
                                <PromisedDateSelector
                                    date={promisedAt}
                                    onChange={(value) => dispatch({ type: "setField", field: "promisedAt", value })}
                                />
                                <Button type="submit" className="mt-auto min-h-12 w-full rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/20" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" /> : <Save aria-hidden="true" className="mr-2 h-5 w-5" />}
                                    <span aria-live="polite">{isSubmitting ? "Registrando reparación…" : "Ingresar reparación"}</span>
                                </Button>
                            </div>
                        </div>
                    </RepairFormSection>
            </div>
        </div>
    );
}
