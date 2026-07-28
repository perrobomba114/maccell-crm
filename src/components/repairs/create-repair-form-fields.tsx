"use client";

import type { Dispatch } from "react";
import { Droplets, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerForm } from "./customer-form";
import { DeviceDetails } from "./device-details";
import { PromisedDateSelector } from "./promised-date-selector";
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
        <div className="grid grid-cols-1 gap-8 rounded-xl border bg-card p-6 shadow-sm md:grid-cols-2">
            <div className="flex flex-col gap-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">1. Cliente</h2>
                        <WarrantySection
                            isWarranty={isWarranty}
                            onIsWarrantyChange={(value) => dispatch({ type: "setField", field: "isWarranty", value })}
                            originalRepairId={originalRepairId}
                            onOriginalRepairChange={(value) => dispatch({ type: "setField", field: "originalRepairId", value })}
                            onRepairSelected={onWarrantySelect}
                            branchId={branchId}
                            compact
                        />
                    </div>

                    {vendors && vendors.length > 0 ? (
                        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                            <label className="mb-1 block text-sm font-medium text-muted-foreground">Vendedor Responsable</label>
                            <Select value={selectedUserId} onValueChange={(value) => dispatch({ type: "setField", field: "selectedUserId", value })}>
                                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
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
                </div>

                <div className="h-px w-full bg-border" />
                <div className="space-y-4">
                    <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">2. Dispositivo</h2>
                    <DeviceDetails
                        brand={brand}
                        onBrandChange={(value) => dispatch({ type: "setField", field: "brand", value })}
                        model={model}
                        onModelChange={(value) => dispatch({ type: "setField", field: "model", value: value.toUpperCase() })}
                        problem={problem}
                        onProblemChange={(value) => dispatch({ type: "setField", field: "problem", value })}
                        errors={errors}
                    />
                    <RepairIntakeFields
                        value={intake}
                        error={errors.intake}
                        onChange={(value) => dispatch({ type: "setIntake", value })}
                    />
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">3. Valor reparación</h2>
                    <SmartPriceInput value={estimatedPrice} onChange={onPriceChange} error={errors.price} />
                    {errors.price ? <p className="text-sm font-medium text-red-500">{errors.price}</p> : null}
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="space-y-2">
                    <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">4. Ticket</h2>
                    <TicketInput
                        value={ticketNumber}
                        onChange={(value) => dispatch({ type: "setField", field: "ticketNumber", value })}
                        branchId={activeBranchId}
                        ticketPrefix={activeTicketPrefix}
                        error={errors.ticket}
                    />
                </div>

                <div className="h-px w-full bg-border" />
                {!hideParts ? (
                    <SparePartSelector
                        selectedParts={selectedParts}
                        onPartsChange={(value) => dispatch({ type: "setField", field: "selectedParts", value })}
                        hidePrice={hidePrice}
                    />
                ) : null}
                <RepairImages />

                <div className="flex items-center space-x-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                    <Checkbox
                        id="isWet"
                        checked={isWet}
                        onCheckedChange={(checked) => dispatch({ type: "setField", field: "isWet", value: checked === true })}
                        className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="isWet" className="flex cursor-pointer items-center gap-2 text-sm font-bold text-blue-500">
                            <Droplets className="h-4 w-4" /> EQUIPO MOJADO / CON HUMEDAD
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Se requiere informe técnico y firma adicional.</p>
                    </div>
                </div>

                <div className="h-px w-full bg-border" />
                <div className="mt-auto space-y-4 pt-4 md:pt-0">
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold uppercase tracking-tight text-foreground">5. Entrega</h2>
                        <PromisedDateSelector
                            date={promisedAt}
                            onChange={(value) => dispatch({ type: "setField", field: "promisedAt", value })}
                        />
                    </div>
                    <Button type="submit" className="h-14 w-full rounded-lg text-xl font-bold shadow-md" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-6 w-6" /> INGRESAR REPARACIÓN</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
