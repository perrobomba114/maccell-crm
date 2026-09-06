from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TechnicalTermMapping:
    source_terms: tuple[str, ...]
    standard_spanish: str
    description: str
    subsystem: str
    search_tokens: tuple[str, ...]


TECHNICAL_JARGON: tuple[TechnicalTermMapping, ...] = (
    TechnicalTermMapping(
        source_terms=("TAIL PLUG", "TAIL ROW", "DOCK FLEX", "TAIL PLUG FLEX", "CHARGING FLEX", "NOT CHARGING", "CHARGING FAULT", "NO CARGA"),
        standard_spanish="flex de pin de carga / subplaca de carga",
        description="Módulo o flex inferior donde se conecta el cable USB/Lightning; conduce la línea VBUS (5V).",
        subsystem="CHARGING",
        search_tokens=("TAIL PLUG", "DOCK FLEX", "SUBPLACA", "PIN DE CARGA", "PUERTO DE CARGA", "VBUS", "CHARGING", "NOT CHARGING", "CIRCUITO DE CARGA"),
    ),
    TechnicalTermMapping(
        source_terms=("INSURANCE RESISTANCE", "FUSE RESISTOR", "SAFETY RESISTOR", "SECURITY RESISTANCE", "FUSE RESISTANCE"),
        standard_spanish="resistencia fusible / fusible de protección de paso",
        description="Componente de baja resistencia (0Ω a 2.2Ω) que protege la línea VBUS o alimentación contra sobrecorriente.",
        subsystem="CHARGING",
        search_tokens=("INSURANCE RESISTANCE", "FUSE RESISTOR", "FUSIBLE", "RESISTENCIA FUSIBLE", "0 OHM"),
    ),
    TechnicalTermMapping(
        source_terms=("MIDDLE LAYER", "TIN DRAGGING", "DRAG TIN", "SANDWICH BOARD", "MIDDLE FRAME LAYER", "INTERPOSER"),
        standard_spanish="capa intermedia (interposer) / arrastre de estaño en placa sándwich",
        description="Interconexión entre placa cara A y B. El arrastre de estaño puede volar resistencias o pistas de unión.",
        subsystem="GENERAL",
        search_tokens=("MIDDLE LAYER", "INTERPOSER", "CAPA MEDIA", "SANDWICH", "DRAG TIN", "TIN DRAGGING"),
    ),
    TechnicalTermMapping(
        source_terms=("FLYING WIRE", "FLY LINE", "FLYING LINE", "JUMP WIRE", "JUMPER WIRE"),
        standard_spanish="puente / micro-jumper con hilo de cobre esmaltado",
        description="Reconstrucción física de una pista cortada o pad desprendido mediante micro-hilo de cobre aislado.",
        subsystem="GENERAL",
        search_tokens=("FLYING WIRE", "FLY LINE", "JUMPER", "PUENTE", "HILO DE COBRE"),
    ),
    TechnicalTermMapping(
        source_terms=("FLOWER SCREEN", "WHITE SCREEN", "GREEN SCREEN", "YELLOW SCREEN", "WSOD", "COLOR LINES"),
        standard_spanish="pantalla con líneas / pantalla blanca o verde / artefactos visuales (WSOD)",
        description="Falla de señal diferencial MIPI, falta de voltajes de polarización OLED/LCD o flex de pantalla fisurado.",
        subsystem="DISPLAY",
        search_tokens=("FLOWER SCREEN", "WHITE SCREEN", "GREEN SCREEN", "WSOD", "PANTALLA BLANCA", "PANTALLA VERDE"),
    ),
    TechnicalTermMapping(
        source_terms=("BOTTOM VIEW", "PINOUT BOTTOM", "CHIP BOTTOM"),
        standard_spanish="vista inferior de pines / pinout BGA",
        description="Diagrama de distribución de esferas y pads visto desde la cara inferior del integrado o procesador.",
        subsystem="GENERAL",
        search_tokens=("BOTTOM VIEW", "PINOUT", "PADS", "BGA"),
    ),
    TechnicalTermMapping(
        source_terms=("BTB CONNECTOR", "BOARD TO BOARD", "FPC CONNECTOR"),
        standard_spanish="conector FPC / conector placa a placa",
        description="Conector multipin de montaje superficial que vincula periféricos con la placa madre.",
        subsystem="GENERAL",
        search_tokens=("BTB", "FPC", "CONNECTOR", "CONECTOR FPC", "BOARD TO BOARD"),
    ),
    TechnicalTermMapping(
        source_terms=("DIODE VALUE", "GROUND RESISTANCE", "DIODE DROP", "DIODE MODE"),
        standard_spanish="caída de tensión en escala de diodo (respecto a tierra GND)",
        description="Medición con multímetro en escala de diodo (punta roja a GND, punta negra al pin de prueba).",
        subsystem="GENERAL",
        search_tokens=("DIODE VALUE", "DIODE MODE", "ESCALA DE DIODO", "CAIDA DE TENSION", "GROUND RESISTANCE"),
    ),
    TechnicalTermMapping(
        source_terms=("STARTUP SHORT CONTACT", "BOOT TRIGGER", "POWER TRIGGER CONTACT"),
        standard_spanish="test point de encendido / pad de Power Key a tierra",
        description="Pad o punto de prueba que simula la pulsación del botón de encendido al conectarlo a tierra.",
        subsystem="POWER",
        search_tokens=("STARTUP SHORT CONTACT", "BOOT TRIGGER", "POWER ON TEST POINT", "PWR KEY TP"),
    ),
    TechnicalTermMapping(
        source_terms=("BACKLIGHT LINES", "BACKLIGHT CIRCUIT", "BL LINES", "LINEAS DE BACKLIGHT"),
        standard_spanish="líneas de retroiluminación (ánodo VLED+ y cátodos de retorno VLED-)",
        description="Circuito elevador (Boost) que genera entre 20V y 35V para iluminar los LEDs de la pantalla.",
        subsystem="DISPLAY",
        search_tokens=("BACKLIGHT", "LINEAS DE BACKLIGHT", "ANODO", "CATODO", "VLED", "LED_A", "LED_K", "VBOOST"),
    ),
    TechnicalTermMapping(
        source_terms=("MAINBOARD MARKING FAULT", "FAULT MARKING", "POINT FAULT MAP"),
        standard_spanish="mapa de fallas típicas sobre serigrafía de placa",
        description="Documento de servicio que marca visualmente los componentes más propensos a fallar según el síntoma.",
        subsystem="GENERAL",
        search_tokens=("MAINBOARD MARKING FAULT", "FAULT MAP", "MAPA DE FALLAS"),
    ),
    TechnicalTermMapping(
        source_terms=("NO BASEBAND", "NO BASE BELT", "BASEBAND FAULT", "NO MODEM"),
        standard_spanish="falla de módem de radiofrecuencia (Baseband)",
        description="Ausencia de firmware de módem en Ajustes o falta de IMEI.",
        subsystem="RF",
        search_tokens=("BASEBAND", "BASE BELT", "MODEM", "NO MODEM", "SIN IMEI"),
    ),
)


def translate_technical_term(raw_term: str) -> str | None:
    term = raw_term.strip().upper()
    for mapping in TECHNICAL_JARGON:
        if any(t == term or term in t for t in mapping.source_terms):
            return mapping.standard_spanish
    return None


def expand_technical_lexicon(text: str) -> list[str]:
    upper = text.upper()
    expanded: set[str] = set()
    for mapping in TECHNICAL_JARGON:
        if (
            any(t in upper for t in mapping.source_terms)
            or any(t in upper for t in mapping.search_tokens)
            or mapping.standard_spanish.upper() in upper
        ):
            expanded.update(mapping.search_tokens)
    return sorted(expanded)
