export type DiagnosticSubsystem = "POWER" | "BATTERY" | "CHARGING" | "BOOT" | "RESTART" | "DISPLAY" | "RF";

const SUBSYSTEM_TERMS: Readonly<Record<DiagnosticSubsystem, readonly string[]>> = {
    POWER: ["POWER ON", "PWR ON", "POWER", "PMIC", "POWER KEY", "VBAT", "VDD MAIN", "RESET", "OSCILLATOR", "CLOCK", "SHORT CIRCUIT"],
    BATTERY: ["BATTERY", "BATT", "PP_BATT", "NTC", "BATTERY CONNECTOR"],
    CHARGING: ["CHARGING", "USB", "VBUS", "CHARGE IC", "DOCK FLEX", "FUSE RESISTOR", "TYPE-C", "NOT CHARGING", "PUERTO DE CARGA"],
    BOOT: ["BOOT", "RESET", "CLOCK", "NAND", "CPU"],
    RESTART: ["RESTART", "REBOOT", "WATCHDOG", "RESET", "I2C SENSOR"],
    DISPLAY: ["DISPLAY", "LCD OFF", "LCD", "OLED", "BACKLIGHT", "LUZ DE FONDO", "MIPI", "WSOD", "WHITE SCREEN", "GREEN SCREEN", "FLOWER SCREEN", "FLYING WIRE", "PANTALLA BLANCA", "PANTALLA VERDE", "LCM", "DISP_PWR", "TOUCH", "ANODO", "CATODO", "LED_A", "LED_K", "VLED", "VBOOST", "LINEAS DE BACKLIGHT", "LUZ"],
    RF: [
        "RF",
        "BASEBAND",
        "ANTENNA",
        "SIM",
        "SIM CARD",
        "SIM CONNECTOR",
        "SIM DETECT",
        "SIM DATA",
        "SIM CLK",
        "SIM RST",
        "UIM",
        "NETWORK",
    ],
};
const APPLE_TERMS: Partial<Record<DiagnosticSubsystem, readonly string[]>> = {
    CHARGING: ["TIGRIS", "HYDRA", "TRISTAR", "MIDDLE LAYER", "TAIL PLUG", "LIGHTNING", "SIN RAYO", "INSURANCE RESISTANCE", "CAPA MEDIA", "INTERPOSER"],
    RESTART: ["PANIC FULL", "PANIC", "THERMALMONITORD", "MISSING SENSOR"],
};

export function inferDiagnosticSubsystems(text: string): DiagnosticSubsystem[] {
    const value = text.toUpperCase();
    const result = new Set<DiagnosticSubsystem>();
    if (/NO ENCIENDE|NO PRENDE|CONSUMO|CORTO|APAG|DEAD/.test(value)) result.add("POWER");
    if (/BATER|BATT|DESCARG/.test(value)) result.add("BATTERY");
    if (/NO CARGA|NO DETECTA (?:EL )?CARGADOR|CARGA (?:LENTA|INTERMITENTE|SOLO)|USB|VBUS|CONECTOR (?:DE )?CARGA|SIN RAYO|NO RECONOCE (?:LA )?PC|NOT CHARGING|CHARGING FAULT|LIGHTNING|DOCK|TAIL PLUG|MIDDLE LAYER/.test(value)) result.add("CHARGING");
    if (/LOGO|BOOT|RECOVERY|DFU/.test(value)) result.add("BOOT");
    if (/REINIC|REBOOT|PANIC|WATCHDOG|THERMALMONITORD|MISSING SENSOR/.test(value)) result.add("RESTART");
    if (/PANTALLA|DISPLAY|IMAGEN|BACKLIGHT|LUZ DE FONDO|FONDO|NEGRA|BLANCA|VERDE|WSOD|SCREEN|TOUCH|T[AÁ]CTIL|FLOWER SCREEN|FAILURE|LUZ|ANODO|CATODO|LED_A|LED_K/.test(value)) result.add("DISPLAY");
    if (/SEÑAL|SENAL|RED|SIM|BASEBAND|ANTENA|ANTENNA|IMEI|(?:NO\s+LEE|SIN)\s+(?:EL\s+)?CHIP/.test(value)) result.add("RF");
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
    const measured = input.observations.flatMap(observation => {
        const signal = observation.match(/\b\d+(?:[.,]\d+)?\s*(?:mA|A|mV|V|ohm)|\b(?:[RCULFDJ]\d{2,6}|TP\d{2,6})\b/i);
        if (!signal) return [];
        const index = signal.index ?? 0;
        return [observation.slice(Math.max(0, index - 60), index + 160)];
    });
    const retained = [...new Set(measured)].join(" ").slice(0, 900);
    const recent = input.observations.slice(-3).join(" ").slice(0, 200);
    const base = [input.latestText.slice(0, 350), retained, input.problem.slice(0, 300), recent].filter(Boolean).join(" ");
    const subsystems = inferDiagnosticSubsystems(base);
    const expansion = subsystems.flatMap((subsystem) => [...SUBSYSTEM_TERMS[subsystem], ...(input.brand.toUpperCase() === "APPLE" ? APPLE_TERMS[subsystem] ?? [] : [])]);
    return [...new Set([input.brand, input.model, base, ...expansion])].join(" ").slice(0, 2_000);
}

export function diagnosticSubsystemTerms(text: string, brand?: string): string[] {
    return inferDiagnosticSubsystems(text).flatMap((subsystem) => [...SUBSYSTEM_TERMS[subsystem], ...(brand?.toUpperCase() === "APPLE" ? APPLE_TERMS[subsystem] ?? [] : [])]);
}
