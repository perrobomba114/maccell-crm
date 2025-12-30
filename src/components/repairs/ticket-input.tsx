import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { checkTicketAvailability } from "@/lib/actions/repairs";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce"; // Assuming this exists or I will create a simple timer

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

    // Auto-check logic
    useEffect(() => {
        const check = async () => {
            if (!value || value.length < 5) {
                setStatus("idle");
                return;
            }

            // Don't check if it's just a raw number being typed, wait for format?
            // Actually user wants "warning if exists".

            setIsChecking(true);
            try {
                const result = await checkTicketAvailability(value, branchId);
                if (result.available) {
                    setStatus("valid");
                    setErrorMessage(null);
                } else {
                    setStatus("invalid");
                    setErrorMessage(result.error || `El ticket ${value} ya existe`);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsChecking(false);
            }
        };

        const timer = setTimeout(() => {
            check();
        }, 500); // Debounce 500ms

        return () => clearTimeout(timer);
    }, [value, branchId]);

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
            <div className="relative">
                <Input
                    id="ticket-number"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value.toUpperCase());
                        setStatus("idle");
                        setErrorMessage(null);
                    }}
                    onBlur={handleBlur}
                    placeholder={ticketPrefix ? `${ticketPrefix}-00000000` : "TICKET #"}
                    className={cn(
                        "text-lg font-bold uppercase tracking-wider h-12 border-2 pr-10",
                        status === "valid" && "border-green-600 focus-visible:ring-green-600 bg-green-50",
                        (status === "invalid" || externalError) && "border-red-600 focus-visible:ring-red-600 bg-red-50",
                        status === "idle" && "border-input"
                    )}
                />
                <div className="absolute right-3 top-3">
                    {isChecking && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                    {!isChecking && status === "valid" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                    {!isChecking && (status === "invalid" || externalError) && <XCircle className="h-6 w-6 text-red-600" />}
                </div>
            </div>

            {(status === "invalid" || externalError) && (
                <p className="text-sm text-red-700 font-bold flex items-center gap-1">
                    {errorMessage || externalError}
                </p>
            )}
            {/* Hide "Available" text to keep it clean, icon is enough? Or keep it? User said "warning if 22 exists". */}
        </div>
    );
}
