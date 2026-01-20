"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, X, ImagePlus, Camera } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { CustomerForm } from "./customer-form";
import { DeviceDetails } from "./device-details";
import { getImgUrl, isValidImg } from "@/lib/utils";
import { ImagePreviewModal } from "./image-preview-modal";
import { updateRepairAction } from "@/lib/actions/repairs";
import { Trash2 } from "lucide-react";
import { PromisedDateSelector } from "./promised-date-selector";
import { SparePartSelector, SparePartItem } from "./spare-part-selector";
import { SafeImageThumbnail } from "./safe-image-thumbnail";

interface EditRepairFormProps {
    repair: any;
    statuses: any[];
    technicians: any[]; // New Prop
    userId: string;
    redirectPath?: string;
}



export function EditRepairForm({ repair, statuses, technicians, userId, redirectPath = "/admin/repairs" }: EditRepairFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial State populated from Repair
    const [customerName, setCustomerName] = useState(repair.customer.name);
    const [customerPhone, setCustomerPhone] = useState(repair.customer.phone);
    const [customerEmail, setCustomerEmail] = useState(repair.customer.email || "");
    const [brand, setBrand] = useState(repair.deviceBrand);
    const [model, setModel] = useState(repair.deviceModel);
    const [problem, setProblem] = useState(repair.problemDescription);
    const [notes, setNotes] = useState("");
    const [promisedAt, setPromisedAt] = useState<Date>(new Date(repair.promisedAt));
    const [existingImages, setExistingImages] = useState<string[]>((repair.deviceImages || []).filter(isValidImg));
    const [newImages, setNewImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [estimatedPrice, setEstimatedPrice] = useState(repair.estimatedPrice.toString());
    const [statusId, setStatusId] = useState<string>(repair.statusId.toString());
    const [diagnosis, setDiagnosis] = useState(repair.diagnosis || "");

    // New Fields
    const [isWarranty, setIsWarranty] = useState<boolean>(repair.isWarranty || false);
    const [assignedUserId, setAssignedUserId] = useState<string>(repair.assignedUserId || "");

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const [errors, setErrors] = useState<any>({});

    const initialParts = repair.parts ? repair.parts.map((rp: any) => ({
        id: rp.sparePart.id,
        name: rp.sparePart.name,
        qty: rp.quantity,
        price: rp.sparePart.priceArg,
        stock: rp.sparePart.stockLocal
    })) : [];

    const [selectedParts, setSelectedParts] = useState<SparePartItem[]>(initialParts);

    const formatNumber = (value: string) => {
        const number = value.replace(/\D/g, "");
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const formatted = formatNumber(value);
        setEstimatedPrice(formatted);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewImages(prev => [...prev, ...files]);

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeExistingImage = (url: string) => {
        setExistingImages(prev => prev.filter(img => img !== url));
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleImageClick = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
    };

    const allImagesForViewer = [...existingImages, ...previews].filter(isValidImg);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const newErrors: any = {};
        if (!customerName) newErrors.name = "Requerido";
        if (!customerPhone || customerPhone.length !== 10) newErrors.phone = "10 dígitos";
        if (!brand) newErrors.brand = "Requerido";
        if (!model) newErrors.model = "Requerido";
        if (!problem) newErrors.problem = "Requerido";

        const rawPrice = estimatedPrice.replace(/\./g, "");
        if (rawPrice === "" || rawPrice === null) newErrors.price = "Requerido";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            toast.error("Datos incompletos.");
            return;
        }

        try {
            const formData = new FormData();
            formData.set("repairId", repair.id);
            formData.set("userId", userId);

            const cleanPrice = estimatedPrice.replace(/\./g, "");
            formData.set("estimatedPrice", cleanPrice);

            formData.set("customerName", customerName);
            formData.set("customerPhone", customerPhone);
            formData.set("customerEmail", customerEmail);
            formData.set("deviceBrand", brand);
            formData.set("deviceModel", model);
            formData.set("problemDescription", problem);
            formData.set("notes", notes);
            formData.set("promisedAt", promisedAt.toISOString());
            formData.set("statusId", statusId);
            formData.set("diagnosis", diagnosis);
            formData.set("isWarranty", String(isWarranty)); // Send boolean as string
            if (assignedUserId && assignedUserId !== "unassigned") formData.set("assignedUserId", assignedUserId);

            formData.set("existingImages", JSON.stringify(existingImages));
            newImages.forEach(file => formData.append("images", file));

            formData.set("spareParts", JSON.stringify(selectedParts.map(p => ({ id: p.id, quantity: 1 }))));

            const result = await updateRepairAction(formData);
            if (result.success) {
                toast.success("Reparación actualizada.");
                router.push(redirectPath);
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="h-full w-full bg-background flex flex-col space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold uppercase">Cliente</h2>
                        <CustomerForm
                            name={customerName} onNameChange={setCustomerName}
                            phone={customerPhone} onPhoneChange={setCustomerPhone}
                            email={customerEmail} onEmailChange={setCustomerEmail}
                            errors={errors}
                        />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold uppercase">Dispositivo</h2>
                        <DeviceDetails
                            brand={brand} onBrandChange={setBrand}
                            model={model} onModelChange={setModel}
                            problem={problem} onProblemChange={setProblem}
                            errors={errors}
                        />
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="isWarranty"
                                checked={isWarranty}
                                onCheckedChange={(checked: boolean) => setIsWarranty(checked === true)}
                            />
                            <label
                                htmlFor="isWarranty"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Es Garantía
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold uppercase">Valor, Asignación y Entrega</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Estado</label>
                                <Select value={statusId} onValueChange={setStatusId}>
                                    <SelectTrigger className="font-bold">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status.id} value={status.id.toString()}>
                                                {status.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Valor Estimado</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                    <Input
                                        value={estimatedPrice}
                                        onChange={handlePriceChange}
                                        className={`pl-8 font-bold ${errors.price ? "border-red-500" : ""}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1">Técnico Asignado</label>
                            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Técnico" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Sin Asignar</SelectItem>
                                    {technicians.map((tech) => (
                                        <SelectItem key={tech.id} value={tech.id}>
                                            {tech.name} ({tech.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Handle "unassigned" value logic if needed, currently string "unassigned" would flow but backend might expect null or ignore. 
                                 Correct approach: "unassigned" does not match any ID, backend update logic handles valid IDs. 
                                 Or better: if value is "unassigned", send empty string implies unassign? 
                                 Current backend: `assignedUserId || null`. So empty string becomes null. Perfect.
                                 Wait, "unassigned" string is truthy. 
                                 Let's make sure SelectItem value="" works or handle it. 
                                 Radix Select usually doesn't like empty string values for items sometimes.
                                 Let's use a clear approach. 
                             */}
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1">Fecha Prometida</label>
                            <PromisedDateSelector
                                date={promisedAt}
                                onChange={setPromisedAt}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1">Diagnóstico del Técnico</label>
                            <Textarea
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                placeholder="Escriba el diagnóstico del técnico aquí..."
                                className="min-h-[100px] border-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold uppercase">Repuestos (Opcional)</h2>
                        <SparePartSelector
                            selectedParts={selectedParts}
                            onPartsChange={setSelectedParts}
                        />
                        <p className="text-xs text-muted-foreground">Nota: Al guardar, se reemplazarán los repuestos asignados.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold uppercase">Imágenes del Equipo</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {/* Existing Images */}
                            {existingImages.map((src, idx) => {
                                const url = getImgUrl(src);
                                if (!url) return null;
                                return (
                                    <SafeImageThumbnail
                                        key={`existing-${idx}`}
                                        src={url}
                                        alt="Existing"
                                        onClick={() => handleImageClick(idx)}
                                        onDelete={() => removeExistingImage(src)}
                                    />
                                );
                            })}

                            {/* New Image Previews */}
                            {previews.map((src, idx) => (
                                <div key={`new-${idx}`} className="relative aspect-square border border-blue-400 rounded-lg overflow-hidden group cursor-pointer">
                                    <img
                                        src={src}
                                        alt="New"
                                        className="object-cover w-full h-full transition-transform hover:scale-105"
                                        onClick={() => handleImageClick(existingImages.length + idx)}
                                    />
                                    <div className="absolute top-1 left-1 bg-blue-500 text-[8px] text-white px-1 rounded z-10">NUEVA</div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeNewImage(idx); }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {/* Add Button */}
                            <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground mt-1">Añadir</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <ImagePreviewModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={allImagesForViewer}
                currentIndex={viewerIndex}
                onIndexChange={setViewerIndex}
            />

            <div className="pt-4 border-t flex justify-end">
                <Button
                    type="submit"
                    size="lg"
                    className="font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                    GUARDAR CAMBIOS
                </Button>
            </div>
        </form>
    );
}
