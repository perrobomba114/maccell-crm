export type TechnicalTermMapping = {
    sourceTerms: readonly string[];
    standardSpanish: string;
    description: string;
    subsystem: "CHARGING" | "DISPLAY" | "POWER" | "RF" | "GENERAL";
    searchTokens: readonly string[];
};

export const TECHNICAL_JARGON: readonly TechnicalTermMapping[] = [
    {
        sourceTerms: ["TAIL PLUG", "TAIL ROW", "DOCK FLEX", "TAIL PLUG FLEX", "CHARGING FLEX", "NOT CHARGING", "CHARGING FAULT", "NO CARGA"],
        standardSpanish: "flex de pin de carga / subplaca de carga",
        description: "Módulo o flex inferior donde se conecta el cable USB/Lightning; conduce la línea de alimentación VBUS (5V).",
        subsystem: "CHARGING",
        searchTokens: ["TAIL PLUG", "DOCK FLEX", "SUBPLACA", "PIN DE CARGA", "PUERTO DE CARGA", "VBUS", "CHARGING", "NOT CHARGING", "CIRCUITO DE CARGA"],
    },
    {
        sourceTerms: ["INSURANCE RESISTANCE", "FUSE RESISTOR", "SAFETY RESISTOR", "SECURITY RESISTANCE", "FUSE RESISTANCE"],
        standardSpanish: "resistencia fusible / fusible de protección de paso",
        description: "Componente de baja resistencia (0Ω a 2.2Ω) que protege la línea VBUS o alimentación contra sobrecorriente. Si se abre o desprende, corta el suministro eléctrico.",
        subsystem: "CHARGING",
        searchTokens: ["INSURANCE RESISTANCE", "FUSE RESISTOR", "FUSIBLE", "RESISTENCIA FUSIBLE", "0 OHM", "PUPER_FUSE"],
    },
    {
        sourceTerms: ["MIDDLE LAYER", "TIN DRAGGING", "DRAG TIN", "SANDWICH BOARD", "MIDDLE FRAME LAYER", "INTERPOSER"],
        standardSpanish: "capa intermedia (interposer) / arrastre de estaño en placa sándwich",
        description: "Estructura de interconexión entre la placa cara A (lógica) y cara B (radiofrecuencia). El arrastre de estaño con cautín/malla puede volar resistencias o pistas de unión.",
        subsystem: "GENERAL",
        searchTokens: ["MIDDLE LAYER", "INTERPOSER", "CAPA MEDIA", "SANDWICH", "DRAG TIN", "TIN DRAGGING"],
    },
    {
        sourceTerms: ["FLYING WIRE", "FLY LINE", "FLYING LINE", "JUMP WIRE", "JUMPER WIRE"],
        standardSpanish: "puente / micro-jumper con hilo de cobre esmaltado",
        description: "Reconstrucción física de una pista cortada o pad desprendido mediante micro-hilo de cobre aislado.",
        subsystem: "GENERAL",
        searchTokens: ["FLYING WIRE", "FLY LINE", "JUMPER", "PUENTE", "HILO DE COBRE"],
    },
    {
        sourceTerms: ["FLOWER SCREEN", "WHITE SCREEN", "GREEN SCREEN", "YELLOW SCREEN", "WSOD", "COLOR LINES", "STRIPES SCREEN"],
        standardSpanish: "pantalla con líneas / pantalla blanca o verde / artefactos visuales (WSOD)",
        description: "Falla de señal diferencial MIPI, falta de voltajes de polarización OLED/LCD (AVDD, VBOOST, VDDIO) o flex de pantalla fisurado.",
        subsystem: "DISPLAY",
        searchTokens: ["FLOWER SCREEN", "WHITE SCREEN", "GREEN SCREEN", "WSOD", "PANTALLA BLANCA", "PANTALLA VERDE", "LINEAS DISPLAY"],
    },
    {
        sourceTerms: ["BOTTOM VIEW", "PINOUT BOTTOM", "CHIP BOTTOM"],
        standardSpanish: "vista inferior de pines / pinout BGA",
        description: "Diagrama de distribución de esferas y pads visto desde la cara inferior del integrado o procesador.",
        subsystem: "GENERAL",
        searchTokens: ["BOTTOM VIEW", "PINOUT", "PADS", "BGA"],
    },
    {
        sourceTerms: ["BTB CONNECTOR", "BOARD TO BOARD", "FPC CONNECTOR"],
        standardSpanish: "conector FPC / conector placa a placa (Board to Board)",
        description: "Conector multipin de montaje superficial que vincula periféricos (pantalla, cámaras, batería, flex de carga) con la placa.",
        subsystem: "GENERAL",
        searchTokens: ["BTB", "FPC", "CONNECTOR", "CONECTOR FPC", "BOARD TO BOARD"],
    },
    {
        sourceTerms: ["DIODE VALUE", "GROUND RESISTANCE", "DIODE DROP", "DIODE MODE"],
        standardSpanish: "caída de tensión en escala de diodo (respecto a tierra GND)",
        description: "Medición con multímetro en escala de diodo (punta roja a chasis/GND, punta negra al pin de prueba) en milivoltios para detectar líneas abiertas (OL) o en corto (0.000V).",
        subsystem: "GENERAL",
        searchTokens: ["DIODE VALUE", "DIODE MODE", "ESCALA DE DIODO", "CAIDA DE TENSION", "GROUND RESISTANCE"],
    },
    {
        sourceTerms: ["STARTUP SHORT CONTACT", "BOOT TRIGGER", "POWER TRIGGER CONTACT"],
        standardSpanish: "test point de encendido / pad de Power Key a tierra",
        description: "Pad o punto de prueba que simula la pulsación del botón de encendido al conectarlo brevemente a tierra (GND).",
        subsystem: "POWER",
        searchTokens: ["STARTUP SHORT CONTACT", "BOOT TRIGGER", "POWER ON TEST POINT", "PWR KEY TP"],
    },
    {
        sourceTerms: ["BACKLIGHT LINES", "BACKLIGHT CIRCUIT", "BL LINES", "LINEAS DE BACKLIGHT"],
        standardSpanish: "líneas de retroiluminación (ánodo VLED+ y cátodos de retorno VLED-)",
        description: "Circuito elevador (Boost) que genera entre 20V y 35V para alimentar los LEDs de la pantalla, con retorno regulado por PWM.",
        subsystem: "DISPLAY",
        searchTokens: ["BACKLIGHT", "LINEAS DE BACKLIGHT", "ANODO", "CATODO", "VLED", "LED_A", "LED_K", "VBOOST"],
    },
    {
        sourceTerms: ["MAINBOARD MARKING FAULT", "FAULT MARKING", "POINT FAULT MAP"],
        standardSpanish: "mapa de fallas típicas sobre serigrafía de placa",
        description: "Documento de servicio que marca visualmente los componentes más propensos a fallar según el síntoma observado.",
        subsystem: "GENERAL",
        searchTokens: ["MAINBOARD MARKING FAULT", "FAULT MAP", "MAPA DE FALLAS"],
    },
    {
        sourceTerms: ["NO BASEBAND", "NO BASE BELT", "BASEBAND FAULT", "NO MODEM"],
        standardSpanish: "falla de módem de radiofrecuencia (Baseband)",
        description: "Ausencia de firmware de módem en Ajustes o falta de IMEI, comúnmente por fisura de pads en placa sándwich o falla del PMIC de RF.",
        subsystem: "RF",
        searchTokens: ["BASEBAND", "BASE BELT", "MODEM", "NO MODEM", "SIN IMEI"],
    },
];

/**
 * Traduce un término técnico literal de herramientas chinas/inglesas a su equivalente en español de banco.
 */
export function translateTechnicalTerm(rawTerm: string): string | null {
    const term = rawTerm.trim().toUpperCase();
    for (const mapping of TECHNICAL_JARGON) {
        if (mapping.sourceTerms.some((t) => t === term || term.includes(t))) {
            return mapping.standardSpanish;
        }
    }
    return null;
}

/**
 * Expande una consulta o síntoma con los términos técnicos y sinónimos relevantes en ambas direcciones.
 */
export function expandTechnicalLexicon(text: string): string[] {
    const upper = text.toUpperCase();
    const expanded = new Set<string>();

    for (const mapping of TECHNICAL_JARGON) {
        const matchesSource = mapping.sourceTerms.some((term) => upper.includes(term));
        const matchesSearch = mapping.searchTokens.some((token) => upper.includes(token));
        const matchesSpanish = upper.includes(mapping.standardSpanish.toUpperCase());

        if (matchesSource || matchesSearch || matchesSpanish) {
            for (const token of mapping.searchTokens) {
                expanded.add(token);
            }
        }
    }

    return [...expanded];
}
