"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBranch } from "@/actions/branch-actions";
import { uploadBranchImage } from "@/actions/upload-actions";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface EditBranchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branch: {
        id: string;
        name: string;
        code: string;
        address: string | null;
        phone: string | null;
        imageUrl: string | null;
    } | null;
}

export function EditBranchDialog({ open, onOpenChange, branch }: EditBranchDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        phone: "",
        image: null as File | null,
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (branch) {
            setFormData({
                name: branch.name,
                code: branch.code,
                address: branch.address || "",
                phone: branch.phone || "",
                image: null,
            });
            setCurrentImageUrl(branch.imageUrl);
            setImagePreview(null);
        }
    }, [branch]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, image: file });

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setFormData({ ...formData, image: null });
        setImagePreview(null);
        setCurrentImageUrl(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!branch) return;

        setLoading(true);

        try {
            let imageUrl = currentImageUrl;

            // Upload new image if present
            if (formData.image) {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(formData.image!);
                });

                const uploadResult = await uploadBranchImage(base64, formData.image.name);
                if (uploadResult.success) {
                    imageUrl = uploadResult.imageUrl ?? null;
                } else {
                    toast.error(uploadResult.error || "Error al subir la imagen");
                    setLoading(false);
                    return;
                }
            }

            const result = await updateBranch(branch.id, {
                name: formData.name,
                code: formData.code,
                address: formData.address || undefined,
                phone: formData.phone || undefined,
                imageUrl: imageUrl || undefined,
            });

            if (result.success) {
                toast.success("Sucursal actualizada exitosamente");
                onOpenChange(false);
            } else {
                toast.error(result.error || "Error al actualizar sucursal");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    if (!branch) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Sucursal</DialogTitle>
                    <DialogDescription>
                        Actualiza la información de la sucursal.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Nombre *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-code">Código *</Label>
                            <Input
                                id="edit-code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-address">Dirección</Label>
                            <Input
                                id="edit-address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Ej: Av. Principal 123"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-phone">Teléfono</Label>
                            <Input
                                id="edit-phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Ej: +54 11 1234-5678"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-image">Imagen</Label>
                            {imagePreview || currentImageUrl ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview || currentImageUrl!}
                                        alt="Branch image"
                                        className="w-full h-32 object-cover rounded-md border"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-gray-400 transition-colors">
                                    <label htmlFor="edit-image" className="cursor-pointer">
                                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-600">Click para subir una imagen</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 5MB</p>
                                        <input
                                            id="edit-image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Actualizando..." : "Actualizar Sucursal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
