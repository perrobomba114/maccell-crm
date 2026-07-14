import type { GuidedAnswer, GuidedOption, GuidedQuestion } from "./types";

type GuidedQuestionInput = {
    repairProblem: string;
    latestText: string;
    evidenceDocumentIds: readonly string[];
};

function option(
    id: string,
    label: string,
    value: string,
    conditions = "Equipo conectado a fuente de laboratorio al intentar encender",
): GuidedOption {
    return {
        id,
        label,
        observation: {
            kind: "behavior",
            value,
            conditions,
        },
    };
}

export function buildGuidedQuestion(input: GuidedQuestionInput): GuidedQuestion | null {
    const context = `${input.repairProblem} ${input.latestText}`.toUpperCase();
    const sourceDocumentIds = [...new Set(input.evidenceDocumentIds)].slice(0, 8);
    if (/NO\s+(?:LEE|RECONOCE|DETECTA).*?(?:CHIP|SIM)|SIN\s+(?:CHIP|SIM)|INSERTAR\s+SIM/.test(context)) {
        const conditions = "Probá una SIM conocida como funcional, con la bandeja correcta, y reiniciá el equipo";
        return {
            id: crypto.randomUUID(),
            prompt: "Con una SIM conocida como funcional, ¿qué estado muestra el equipo?",
            measurement: "Separar detección de SIM de registro y señal de red",
            conditions,
            options: [
                option("sim-not-detected", "Sigue indicando Sin SIM", "KNOWN_SIM_NOT_DETECTED", conditions),
                option("sim-detected-no-service", "Detecta SIM, pero dice Sin servicio", "SIM_DETECTED_NO_SERVICE", conditions),
                option("sim-registered-no-signal", "Reconoce operador, pero no tiene señal", "SIM_REGISTERED_NO_SIGNAL", conditions),
                option("sim-intermittent", "La detección aparece y desaparece", "SIM_DETECTION_INTERMITTENT", conditions),
            ],
            sourceDocumentIds,
            allowFreeText: true,
        };
    }
    if (/REINIC|REBOOT|PANIC|WATCHDOG|CADA\s+(?:3|TRES)\s+MIN/.test(context)) {
        const conditions = "Abrí Ajustes > Privacidad y seguridad > Análisis y mejoras > Datos de análisis, sin borrar registros";
        return {
            id: crypto.randomUUID(),
            prompt: "¿Qué registro reciente aparece en Datos de análisis después del reinicio?",
            measurement: "Clasificar el reinicio mediante el registro de panic de iOS",
            conditions,
            options: [
                option("panic-full", "Aparece panic-full o panic-base", "IOS_PANIC_LOG_PRESENT", conditions),
                option("watchdog-missing-sensor", "Indica watchdog o missing sensor", "IOS_WATCHDOG_SENSOR_LOG", conditions),
                option("no-recent-panic", "No aparece un panic reciente", "NO_RECENT_IOS_PANIC", conditions),
                option("cannot-open-settings", "No puedo entrar a Ajustes", "CANNOT_ACCESS_IOS_SETTINGS", conditions),
            ],
            sourceDocumentIds,
            allowFreeText: true,
        };
    }
    if (/NO (?:DA|TIENE) (?:LUZ DE FONDO|IMAGEN)|BACKLIGHT|PANTALLA NEGRA|IMAGEN TENUE/.test(context)) {
        const conditions = "Encendé el equipo con un módulo conocido y observá la pantalla con una linterna lateral";
        return {
            id: crypto.randomUUID(),
            prompt: "Con una linterna sobre la pantalla, ¿se observa imagen tenue?",
            measurement: "Separar señal de imagen de alimentación/backlight",
            conditions,
            options: [
                option("faint-image", "Sí, hay imagen tenue", "FAINT_IMAGE_PRESENT", conditions),
                option("no-image", "No hay ninguna imagen", "NO_DISPLAY_IMAGE", conditions),
                option("intermittent-light", "La iluminación aparece intermitente", "BACKLIGHT_INTERMITTENT", conditions),
                option("not-tested-display", "Todavía no lo probé", "DISPLAY_FLASHLIGHT_TEST_PENDING", conditions),
            ],
            sourceDocumentIds,
            allowFreeText: true,
        };
    }
    if (/0\.000|PULSO Y VUELVE|CONSUMO FIJO BAJO|LIMITA POR CORTO|SUBE ALTO/.test(input.latestText.toUpperCase())) {
        return {
            id: crypto.randomUUID(),
            prompt: "¿Qué comprobación adicional ya realizaste sobre alimentación y encendido?",
            measurement: "Comprobación de la ruta de encendido",
            conditions: "Respondé solo con una comprobación realmente realizada; no asumas el resultado.",
            options: [
                option("known-battery", "Probé batería conocida y no cambió", "KNOWN_GOOD_BATTERY_NO_CHANGE"),
                option("power-key", "Verifiqué pulsador/flex de encendido", "POWER_KEY_CHECKED"),
                option("usb-detect", "La PC detecta el equipo", "USB_ENUMERATION_PRESENT"),
                option("none-yet", "Todavía no hice otra prueba", "NO_ADDITIONAL_TEST"),
            ],
            sourceDocumentIds,
            allowFreeText: true,
        };
    }
    if (/NO ENCIENDE|NO PRENDE|SUGER|QU[EÉ] MIDO|DIAGN/.test(context)) {
        return {
            id: crypto.randomUUID(),
            prompt: "¿Qué comportamiento de consumo muestra la fuente al presionar encendido?",
            measurement: "Patrón de consumo en fuente",
            conditions: "Conectá la placa a una fuente limitada y presioná encendido sin inyectar tensión en una línea.",
            options: [
                option("zero", "Permanece en 0.000 A", "ZERO_CURRENT"),
                option("pulse-zero", "Hace un pulso y vuelve a 0", "PULSE_TO_ZERO"),
                option("fixed-low", "Queda en consumo fijo bajo", "FIXED_LOW_CURRENT"),
                option("high-short", "Sube alto o limita por corto", "HIGH_CURRENT_OR_SHORT"),
            ],
            sourceDocumentIds,
            allowFreeText: true,
        };
    }
    if (/NO (?:RECIBE )?CARGA|NO DETECTA (?:EL )?CARGADOR|CARGA (?:LENTA|INTERMITENTE|SOLO)|USB|VBUS|PIN (?:DE )?CARGA|CONECTOR (?:DE )?CARGA/.test(context)) {
        return {
            id: crypto.randomUUID(),
            prompt: "¿Qué reacción presenta al conectar un cargador y cable comprobados?",
            measurement: "Comportamiento de carga",
            conditions: "Usá cargador y cable conocidos como funcionales y observá el equipo sin intervenir la placa.",
            options: [
                option("no-reaction", "No detecta conexión", "NO_USB_REACTION"),
                option("intermittent", "Conecta y desconecta", "INTERMITTENT_USB"),
                option("charges-off", "Carga solamente apagado", "CHARGES_WHEN_OFF"),
            ],
            sourceDocumentIds,
            allowFreeText: true,
        };
    }
    return null;
}

export function validateGuidedAnswer(
    question: GuidedQuestion | null,
    answer: GuidedAnswer | undefined,
): GuidedOption | null {
    if (!question || !answer || answer.questionId !== question.id) return null;
    return question.options.find((candidate) => candidate.id === answer.optionId) ?? null;
}
