import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { checkTicketAvailability } from "@/lib/actions/repairs";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface TicketInputProps {
    value: string;
    onChange: (val: string) => void;
    branchId: string;
    ticketPrefix?: string | null;
    error?: string;
}

export function TicketInput({ value, onChange, branchId, ticketPrefix, error: externalError }: TicketInputProps) {
    const [isChecking, setIsChecking] = useState(false);
    const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const debouncedValue = useDebounce(value, 500);

    // Auto-check logic
    useEffect(() => {
        const check = async () => {
            if (!debouncedValue || debouncedValue.length < 5) {
                setStatus("idle");
                return;
            }

            // Don't check if it's just a raw number being typed, wait for format?
            // Actually user wants "warning if exists".

            setIsChecking(true);
            try {
                const result = await checkTicketAvailability(debouncedValue, branchId);
                if (result.available) {
                    setStatus("valid");
                    setErrorMessage(null);
                } else {
                    setStatus("invalid");
                    setErrorMessage(result.error || `El ticket ${debouncedValue} ya existe`);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsChecking(false);
            }
        };

        void check();
    }, [debouncedValue, branchId]);

    const handleBlur = () => {
        if (!value || !ticketPrefix) return;

        // If user typed only numbers, format it
        if (/^\d+$/.test(value)) {
            const padded = value.padStart(8, '0');
            const formatted = `${ticketPrefix}-${padded}`;
            onChange(formatted);
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="ticket-number" className="text-sm font-medium">Número de ticket</Label>
            <div className="relative">
                <Input
                    id="ticket-number"
                    name="ticket-number"
                    aria-label="Número de Ticket"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value.toUpperCase());
                        setStatus("idle");
                        setErrorMessage(null);
                    }}
                    onBlur={handleBlur}
                    placeholder={ticketPrefix ? `${ticketPrefix}-00000000` : "TICKET #"}
                    className={cn(
                        "min-h-11 bg-background/70 pr-11 text-base font-semibold uppercase tracking-wide",
                        status === "valid" && "border-emerald-500/80 bg-emerald-500/5 focus-visible:ring-emerald-500/20",
                        (status === "invalid" || externalError) && "border-destructive bg-destructive/5 focus-visible:ring-destructive/20",
                    )}
                />
                <div aria-live="polite" className="absolute inset-y-0 right-3 flex items-center">
                    {isChecking ? <Loader2 aria-label="Verificando ticket" className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
                    {!isChecking && status === "valid" ? <CheckCircle2 aria-label="Ticket disponible" className="h-5 w-5 text-emerald-500" /> : null}
                    {!isChecking && (status === "invalid" || externalError) ? <XCircle aria-label="Ticket no disponible" className="h-5 w-5 text-destructive" /> : null}
                </div>
            </div>

            {(status === "invalid" || externalError) ? (
                <p role="alert" className="flex items-center gap-1 text-sm font-medium text-destructive">
                    {errorMessage || externalError}
                </p>
            ) : (
                <p className="text-xs leading-5 text-muted-foreground">Usá el código de sucursal seguido del número correlativo.</p>
            )}
        </div>
    );
}
