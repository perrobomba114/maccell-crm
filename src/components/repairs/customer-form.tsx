"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CustomerFormProps {
    name: string;
    onNameChange: (val: string) => void;
    phone: string;
    onPhoneChange: (val: string) => void;
    email: string;
    onEmailChange: (val: string) => void;
    errors?: {
        name?: string;
        phone?: string;
        email?: string;
    }
}

export function CustomerForm({
    name, onNameChange,
    phone, onPhoneChange,
    email, onEmailChange,
    errors
}: CustomerFormProps) {

    // Auto-format Name: Title Case
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Simple capitalization on blur usually, but user asked "Formateo automático Title Case"
        // Let's do it on Change but carefully not to mess typing. 
        // Better on Blur or just CSS capitalize? CSS is visual only.
        // Let's do it on Blur to be safe, or just store as is and format on submit.
        onNameChange(val);
    };

    const handleNameBlur = () => {
        // Convert to Title Case
        const formatted = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        onNameChange(formatted);
    };

    // Phone: Numbers only, limit 10
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
        onPhoneChange(val);
    };

    return (
        <div className="space-y-4 border p-4 rounded-lg bg-card">
            <h3 className="font-semibold flex items-center gap-2">👤 Información del Cliente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Nombre Completo</Label>
                    <Input
                        id="customer-name"
                        value={name}
                        onChange={handleNameChange} onBlur={handleNameBlur}
                        placeholder="Juan Pérez"
                        className={cn(errors?.name && "border-red-500")}
                    />
                    {errors?.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Teléfono (10 dígitos)</Label>
                    <Input
                        id="customer-phone"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="1234567890"
                        className={cn(errors?.phone && "border-red-500")}
                    />
                    {errors?.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label>Email (Opcional)</Label>
                    <Input
                        id="customer-email"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        placeholder="juan@email.com"
                        type="email"
                    />
                </div>
            </div>
        </div>
    );
}
