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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="customer-name" className="after:content-['*'] after:ml-0.5 after:text-red-500">Nombre Completo</Label>
                    <Input
                        id="customer-name"
                        name="customer-name"
                        value={name}
                        onChange={handleNameChange} onBlur={handleNameBlur}
                        placeholder="Juan Pérez"
                        autoComplete="name"
                        className={cn("min-h-11 bg-background/70 text-base", errors?.name && "border-destructive focus-visible:ring-destructive/20")}
                    />
                    {errors?.name ? <p role="alert" className="text-xs font-medium text-destructive">{errors.name}</p> : null}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customer-phone" className="after:content-['*'] after:ml-0.5 after:text-red-500">Teléfono (10 dígitos)</Label>
                    <Input
                        id="customer-phone"
                        name="customer-phone"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="1234567890"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        className={cn("min-h-11 bg-background/70 text-base tabular-nums", errors?.phone && "border-destructive focus-visible:ring-destructive/20")}
                    />
                    {errors?.phone ? <p role="alert" className="text-xs font-medium text-destructive">{errors.phone}</p> : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customer-email">Email (Opcional)</Label>
                    <Input
                        id="customer-email"
                        name="customer-email"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        placeholder="juan@email.com"
                        type="email"
                        autoComplete="email"
                        className="min-h-11 bg-background/70 text-base"
                    />
                </div>
        </div>
    );
}
