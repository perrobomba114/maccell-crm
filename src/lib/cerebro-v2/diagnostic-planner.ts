export type DiagnosticSubsystem = "POWER" | "BATTERY" | "CHARGING" | "BOOT" | "DISPLAY" | "RF";

const SUBSYSTEM_TERMS: Readonly<Record<DiagnosticSubsystem, readonly string[]>> = {
    POWER: ["POWER ON", "PWR ON", "POWER", "PMIC", "POWER KEY", "VBAT", "VDD MAIN", "TRST_N", "RESET", "OSCILLATOR", "CLOCK", "SHORT CIRCUIT"],
    BATTERY: ["BATTERY", "BATT", "PP_BATT", "NTC", "BATTERY CONNECTOR"],
    CHARGING: ["CHARGING", "USB", "VBUS", "CHARGE IC", "DOCK FLEX"],
    BOOT: ["BOOT", "RESET", "CLOCK", "NAND", "CPU"],
    DISPLAY: ["DISPLAY", "LCD OFF", "LCD", "OLED", "BACKLIGHT", "LUZ DE FONDO", "MIPI"],
    RF: ["RF", "BASEBAND", "ANTENNA", "SIM", "NETWORK"],
};

export function inferDiagnosticSubsystems(text: string): DiagnosticSubsystem[] {
    const value = text.toUpperCase();
    const result = new Set<DiagnosticSubsystem>();
    if (/NO ENCIENDE|NO PRENDE|CONSUMO|CORTO|APAG/.test(value)) result.add("POWER");
    if (/BATER|BATT|DESCARG/.test(value)) result.add("BATTERY");
    if (/NO CARGA|CARGA|USB|VBUS|CONECTOR/.test(value)) result.add("CHARGING");
    if (/LOGO|REINIC|BOOT|RECOVERY|DFU/.test(value)) result.add("BOOT");
    if (/PANTALLA|DISPLAY|IMAGEN|BACKLIGHT|LUZ DE FONDO|FONDO|NEGRA/.test(value)) result.add("DISPLAY");
    if (/SEÑAL|SENAL|RED|SIM|BASEBAND/.test(value)) result.add("RF");
    return [...result];
}

export type TechnicalSearchInput = {
    brand: string;
    model: string;
    problem: string;
    latestText: string;
    observations: readonly string[];
};

export function buildTechnicalSearchQuery(input: TechnicalSearchInput): string {
    const base = [input.problem, input.latestText, ...input.observations.slice(-6)].filter(Boolean).join(" ");
    const subsystems = inferDiagnosticSubsystems(base);
    const expansion = subsystems.flatMap((subsystem) => SUBSYSTEM_TERMS[subsystem]);
    return [...new Set([input.brand, input.model, base, ...expansion])].join(" ").slice(0, 2_000);
}

export function diagnosticSubsystemTerms(text: string): string[] {
    return inferDiagnosticSubsystems(text).flatMap((subsystem) => SUBSYSTEM_TERMS[subsystem]);
}
