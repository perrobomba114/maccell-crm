"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { login } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Zod validation schema (Step 33)
const loginSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
    password: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginCard() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // React Hook Form with Zod (Step 34)
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // Submit handler with Server Action integration (Step 35)
    const onSubmit = (values: LoginFormValues) => {
        startTransition(async () => {
            try {
                const result = await login(values.email, values.password);

                if (result.success && result.redirectPath) {
                    toast.success("¡Bienvenido!");
                    router.push(result.redirectPath); // Step 36: Client-side redirect
                } else {
                    toast.error(result.error || "Error al iniciar sesión");
                }
            } catch (error) {
                toast.error("Error del servidor");
            }
        });
    };

    return (
        // Framer Motion animation with enhanced effects
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Card className="relative overflow-hidden border-2 border-primary/10 shadow-2xl backdrop-blur-sm bg-card/95">
                {/* Gradient overlay for premium look */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

                <CardHeader className="space-y-6 text-center relative z-10">
                    {/* Logo with animations */}
                    <motion.div
                        className="flex justify-center"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <div className="relative group">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse"></div>

                            {/* Logo container */}
                            <motion.div
                                className="relative w-64 h-auto"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Image
                                    src="/logo.jpg"
                                    alt="Maccell Logo"
                                    width={256}
                                    height={256}
                                    className="h-auto w-auto max-w-full drop-shadow-2xl mx-auto"
                                    priority
                                />
                            </motion.div>
                        </div>
                    </motion.div>



                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        <CardDescription className="text-base">
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </motion.div>
                </CardHeader>

                <CardContent className="relative z-10">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" suppressHydrationWarning>
                            {/* Email field with animation */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                            >
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="usuario@maccell.com"
                                                    type="email"
                                                    autoComplete="email"
                                                    disabled={isPending}
                                                    className="h-11 transition-all duration-300 border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 hover:border-primary/30"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </motion.div>

                            {/* Password field with animation */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                            >
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="••••••"
                                                    type="password"
                                                    autoComplete="current-password"
                                                    disabled={isPending}
                                                    className="h-11 transition-all duration-300 border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 hover:border-primary/30"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </motion.div>

                            {/* Submit button with animation */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                            >
                                <Button
                                    type="submit"
                                    className="w-full h-11 font-semibold text-lg"
                                    disabled={isPending}
                                    size="lg"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Iniciando sesión...
                                        </>
                                    ) : (
                                        "Iniciar Sesión"
                                    )}
                                </Button>
                            </motion.div>
                        </form>
                    </Form>

                    {/* Forgot password link with animation */}
                    <motion.div
                        className="mt-6 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                    >
                        <button
                            type="button"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline"
                            disabled
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </motion.div>
                </CardContent>

                {/* Footer */}
                <CardFooter className="relative z-10 flex-col space-y-2 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground bg-gradient-to-t from-muted/10 to-transparent">
                    <p>© 2025 Maccell. Todos los derechos reservados.</p>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
