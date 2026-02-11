"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Smartphone } from "lucide-react";
import { checkImei } from "@/actions/imei-action";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ImeiData {
    bloqueado: string;
    gsmaStatus: string;
    mensaje_gsma?: string;
    codigo_error?: string;
    marca?: string;
    modell?: string;
}

export function ImeiChecker() {
    const [imei, setImei] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImeiData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!imei || imei.length < 14) {
            setError("Por favor ingrese un IMEI válido (15 dígitos)");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await checkImei(imei);
            if (response.success && response.data) {
                setResult(response.data);
            } else {
                setError(response.error || "No se pudo obtener información del sistema ENACOM");
            }
        } catch (err) {
            setError("Error al conectar con el servicio. Intente nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const isBlocked = result?.bloqueado === "SI" || result?.bloqueado === "Si";

    // Determine the status text and description
    const statusText = isBlocked ? "Bloqueado / No Válido" : "Válido";
    const descriptionText = result
        ? (result.gsmaStatus || result.mensaje_gsma || (isBlocked ? "El dispositivo se encuentra bloqueado o reportado." : "El dispositivo no figura denunciado por robo, hurto o extravío."))
        : "";

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Consulta Oficial ENACOM</CardTitle>
                            <CardDescription>
                                Verificación de estado de IMEI en base de datos nacional e internacional
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Label htmlFor="imei-input" className="sr-only">Número de IMEI</Label>
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="imei-input"
                                name="imei-number"
                                aria-label="Número de IMEI"
                                placeholder="Ingrese el número IMEI (15 dígitos)"
                                value={imei}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 15);
                                    setImei(val);
                                }}
                                className="pl-10 text-lg tracking-widest font-mono"
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" size="lg" disabled={isLoading || imei.length < 14} className="min-w-[140px]">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Consultando
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Consultar
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Marque <strong>*#06#</strong> en el teclado de llamadas del dispositivo para obtener el número de IMEI Real (físico).</span>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error en la consulta</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className={`overflow-hidden border-t-4 ${isBlocked ? 'border-t-destructive shadow-destructive/10' : 'border-t-green-500 shadow-green-500/10'} shadow-lg`}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Resultado de la consulta</CardTitle>
                            <CardDescription className="font-mono text-base">IMEI: {imei}</CardDescription>
                        </CardHeader>

                        <div className="px-6 pb-6">
                            <div className={`p-6 rounded-xl border ${isBlocked ? 'bg-destructive/5 border-destructive/20' : 'bg-green-500/5 border-green-500/20'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {isBlocked ? (
                                        <XCircle className="h-8 w-8 text-destructive" />
                                    ) : (
                                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
                                    )}

                                    <h3 className={`text-2xl font-bold ${isBlocked ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}>
                                        Estado: {statusText}
                                    </h3>
                                </div>

                                <p className="text-lg leading-relaxed font-medium opacity-90">
                                    {descriptionText}
                                </p>
                            </div>

                            {/* Additional Details if available */}
                            {(result.marca || result.modell) && (
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted rounded-lg">
                                        <span className="text-xs text-muted-foreground uppercase font-bold">Marca Detectada</span>
                                        <p className="font-semibold">{result.marca || "-"}</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <span className="text-xs text-muted-foreground uppercase font-bold">Modelo</span>
                                        <p className="font-semibold">{result.modell || "-"}</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end">
                                <span className="text-xs text-muted-foreground">Fuente: Base de Datos ENACOM</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
