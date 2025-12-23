"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser } from "@/actions/user-actions";
import { toast } from "sonner";
import { Role } from "@prisma/client";

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branches: Array<{ id: string; name: string; code: string }>;
}

export function CreateUserDialog({ open, onOpenChange, branches }: CreateUserDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "VENDOR" as Role,
        branchId: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate that vendors must have a branch
            if (formData.role === "VENDOR" && !formData.branchId) {
                toast.error("Los vendedores deben tener una sucursal asignada");
                setLoading(false);
                return;
            }

            // Prepare data - send null for branchId if empty and not VENDOR
            const submitData = {
                ...formData,
                branchId: formData.branchId || null,
            };

            const result = await createUser(submitData);

            if (result.success) {
                toast.success("Usuario creado exitosamente");
                onOpenChange(false);
                // Reset form
                setFormData({
                    name: "",
                    email: "",
                    password: "",
                    role: "VENDOR" as Role,
                    branchId: "",
                });
            } else {
                toast.error(result.error || "Error al crear usuario");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                        Agrega un nuevo usuario al sistema. Los campos marcados son obligatorios.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Rol *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                            >
                                <SelectTrigger id="role">
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
                            <Label htmlFor="branch">
                                Sucursal {formData.role === "VENDOR" ? "*" : "(Opcional)"}
                            </Label>
                            <Select
                                value={formData.branchId}
                                onValueChange={(value) => setFormData({ ...formData, branchId: value === "none" ? "" : value })}
                            >
                                <SelectTrigger id="branch">
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
                            {loading ? "Creando..." : "Crear Usuario"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
