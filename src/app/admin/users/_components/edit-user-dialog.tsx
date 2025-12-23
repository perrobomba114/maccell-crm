"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUser } from "@/actions/user-actions";
import { toast } from "sonner";
import { Role } from "@prisma/client";

interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: {
        id: string;
        name: string;
        email: string;
        role: Role;
        branchId: string | null;
    } | null;
    branches: Array<{ id: string; name: string; code: string }>;
}

export function EditUserDialog({ open, onOpenChange, user, branches }: EditUserDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        password: string;
        role: Role;
        branchId: string;
    }>({
        name: "",
        email: "",
        password: "",
        role: "VENDOR" as Role,
        branchId: "",
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: "",
                role: user.role,
                branchId: user.branchId || "",
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            // Validate that vendors must have a branch
            if (formData.role === "VENDOR" && !formData.branchId) {
                toast.error("Los vendedores deben tener una sucursal asignada");
                setLoading(false);
                return;
            }

            const updateData: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                branchId: formData.branchId || null,
            };

            // Only include password if it was filled in
            if (formData.password) {
                updateData.password = formData.password;
            }

            const result = await updateUser(user.id, updateData);

            if (result.success) {
                toast.success("Usuario actualizado exitosamente");
                onOpenChange(false);
            } else {
                toast.error(result.error || "Error al actualizar usuario");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>
                        Actualiza la información del usuario. Deja la contraseña vacía si no deseas cambiarla.
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
                            <Label htmlFor="edit-email">Email *</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                minLength={6}
                                placeholder="Dejar vacío para no cambiar"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-role">Rol *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                            >
                                <SelectTrigger id="edit-role">
                                    <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Administrador</SelectItem>
                                    <SelectItem value="VENDOR">Vendedor</SelectItem>
                                    <SelectItem value="TECHNICIAN">Técnico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-branch">
                                Sucursal {formData.role === "VENDOR" ? "*" : "(Opcional)"}
                            </Label>
                            <Select
                                value={formData.branchId || "none"}
                                onValueChange={(value) => setFormData({ ...formData, branchId: value === "none" ? "" : value })}
                            >
                                <SelectTrigger id="edit-branch">
                                    <SelectValue placeholder="Seleccionar sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {formData.role !== "VENDOR" && (
                                        <SelectItem value="none">Sin Sucursal</SelectItem>
                                    )}
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name} ({branch.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Actualizando..." : "Actualizar Usuario"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
