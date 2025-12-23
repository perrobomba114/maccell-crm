"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Lock, User as UserIcon, Loader2, Upload } from "lucide-react";
import { updateUserPassword, updateUserImage } from "@/actions/profile-actions";
import { uploadProfileImage } from "@/actions/upload-actions";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
    user: any;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Las nuevas contraseñas no coinciden");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);
        try {
            const result = await updateUserPassword(
                user.id,
                passwordData.currentPassword,
                passwordData.newPassword
            );

            if (result.success) {
                toast.success("Contraseña actualizada correctamente");
                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });
            } else {
                toast.error(result.error || "Error al actualizar la contraseña");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("La imagen no debe superar los 5MB");
            return;
        }

        const toastId = toast.loading("Subiendo imagen...");

        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const uploadResult = await uploadProfileImage(base64, file.name);

            if (uploadResult.success && uploadResult.imageUrl) {
                const updateResult = await updateUserImage(user.id, uploadResult.imageUrl);

                if (updateResult.success) {
                    toast.success("Imagen de perfil actualizada", { id: toastId });
                    router.refresh();
                } else {
                    toast.error("Error al guardar la referencia de la imagen", { id: toastId });
                }
            } else {
                toast.error(uploadResult.error || "Error al subir la imagen", { id: toastId });
            }
        } catch (error) {
            toast.error("Error inesperado al subir la imagen", { id: toastId });
        }
    };

    return (
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Información General</TabsTrigger>
                <TabsTrigger value="security">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Imagen de Perfil</CardTitle>
                        <CardDescription>
                            Haz clic en la imagen para cambiar tu foto de perfil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Avatar className="h-32 w-32 border-4 border-background shadow-xl transition-opacity group-hover:opacity-75">
                                <AvatarImage src={user.imageUrl || ""} className="object-cover" />
                                <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                                <Camera className="h-8 w-8 text-white drop-shadow-lg" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Formatos soportados: JPG, PNG. Máx. 5MB.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Información Personal</CardTitle>
                        <CardDescription>
                            Tus datos básicos de identificación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input id="name" value={user.name} disabled />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" value={user.email} disabled />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Cambiar Contraseña</CardTitle>
                        <CardDescription>
                            Asegúrate de usar una contraseña segura que no uses en otros sitios.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handlePasswordSubmit}>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                                <Input
                                    id="currentPassword"
                                    name="currentPassword"
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Actualizar Contraseña
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
