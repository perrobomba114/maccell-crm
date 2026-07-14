from __future__ import annotations

import re
from dataclasses import dataclass

from cerebro_rag.normalize import normalize_brand, normalize_model


REPAIR_EXPORT_QUERY = """
SELECT
    repair.id,
    repair."ticketNumber" AS ticket_number,
    repair."deviceBrand" AS brand,
    repair."deviceModel" AS model,
    repair."problemDescription" AS problem,
    COALESCE(repair.diagnosis, '') AS diagnosis,
    COALESCE(repair."diagnosisEnriched", '') AS enriched_diagnosis,
    status.name AS current_status,
    COALESCE(observation.items, '[]'::jsonb) AS observations,
    COALESCE(part.items, '[]'::jsonb) AS parts,
    COALESCE(history.items, '[]'::jsonb) AS prior_statuses
FROM repairs AS repair
JOIN repair_statuses AS status ON status.id = repair."statusId"
LEFT JOIN LATERAL (
    SELECT jsonb_agg(value.content ORDER BY value."createdAt") AS items
    FROM repair_observations AS value
    WHERE value."repairId" = repair.id
) AS observation ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(value.name ORDER BY link."assignedAt") AS items
    FROM repair_parts AS link
    JOIN spare_parts AS value ON value.id = link."sparePartId"
    WHERE link."repairId" = repair.id
) AS part ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(value.name ORDER BY transition."createdAt") AS items
    FROM repair_status_history AS transition
    JOIN repair_statuses AS value ON value.id = transition."toStatusId"
    WHERE transition."repairId" = repair.id
) AS history ON true
ORDER BY repair."updatedAt", repair.id
"""


EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:\+?54\s*)?(?:9\s*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{4}[\s.-]*\d{4}")
PRICE_PATTERN = re.compile(r"(?:US\$|USD|ARS|\$)\s*\d[\d.,]*", re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class RepairSource:
    repair_id: str
    ticket_number: str
    brand: str
    model: str
    problem: str
    diagnosis: str
    enriched_diagnosis: str
    observations: tuple[str, ...]
    parts: tuple[str, ...]
    current_status: str
    prior_statuses: tuple[str, ...]


def sanitize_technical_text(value: str) -> str:
    sanitized = EMAIL_PATTERN.sub("[EMAIL_REMOVIDO]", value)
    sanitized = PHONE_PATTERN.sub("[TELEFONO_REMOVIDO]", sanitized)
    sanitized = PRICE_PATTERN.sub("[PRECIO_REMOVIDO]", sanitized)
    return re.sub(r"\s+", " ", sanitized).strip()


def build_repair_content(source: RepairSource) -> str:
    brand = normalize_brand(source.brand)
    model = normalize_model(brand, source.model)
    solution = " | ".join(filter(None, map(sanitize_technical_text, source.observations)))
    parts = " | ".join(filter(None, map(sanitize_technical_text, source.parts)))
    sections = (
        f"DISPOSITIVO: {brand} {model}",
        f"PROBLEMA: {sanitize_technical_text(source.problem)}",
        f"DIAGNOSTICO: {sanitize_technical_text(source.diagnosis)}",
        f"SOLUCION: {solution}",
        f"REPUESTOS: {parts}",
        f"ESTADO: {sanitize_technical_text(source.current_status)}",
        f"EVIDENCIA: {sanitize_technical_text(source.enriched_diagnosis)}",
    )
    return "\n".join(sections)
