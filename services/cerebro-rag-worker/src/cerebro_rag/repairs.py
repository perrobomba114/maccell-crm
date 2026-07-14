from __future__ import annotations

import re
from dataclasses import dataclass

from cerebro_rag.normalize import normalize_brand, normalize_model


REPAIR_EXPORT_BASE = """
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
    COALESCE(history.items, '[]'::jsonb) AS prior_statuses,
    learning.record AS learning_record,
    GREATEST(
        repair."updatedAt",
        COALESCE(observation.latest, repair."updatedAt"),
        COALESCE(part.latest, repair."updatedAt"),
        COALESCE(history.latest, repair."updatedAt"),
        COALESCE(learning.latest, repair."updatedAt")
    ) AS effective_updated_at
FROM repairs AS repair
JOIN repair_statuses AS status ON status.id = repair."statusId"
LEFT JOIN LATERAL (
    SELECT jsonb_agg(value.content ORDER BY value."createdAt") AS items,
           MAX(value."createdAt") AS latest
    FROM repair_observations AS value
    WHERE value."repairId" = repair.id
) AS observation ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(value.name ORDER BY link."assignedAt") AS items,
           MAX(link."assignedAt") AS latest
    FROM repair_parts AS link
    JOIN spare_parts AS value ON value.id = link."sparePartId"
    WHERE link."repairId" = repair.id
) AS part ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(value.name ORDER BY transition."createdAt") AS items,
           MAX(transition."createdAt") AS latest
    FROM repair_status_history AS transition
    JOIN repair_statuses AS value ON value.id = transition."toStatusId"
    WHERE transition."repairId" = repair.id
) AS history ON true
LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
        'symptom', record.symptom,
        'rootCause', record."rootCause",
        'confirmingEvidence', record."confirmingEvidence",
        'intervention', record.intervention,
        'verification', record.verification,
        'affectedReferences', record."affectedReferences",
        'authority', record.authority,
        'trainingEligible', record."trainingEligible"
    ) AS record,
    record."updatedAt" AS latest
    FROM repair_learning_records AS record
    WHERE record."repairId" = repair.id
) AS learning ON true
WHERE repair."statusId" IN (5, 6, 7, 8, 9, 10)
"""

REPAIR_EXPORT_QUERY = REPAIR_EXPORT_BASE + "\nORDER BY effective_updated_at, repair.id"

REPAIR_SYNC_QUERY = f"""
WITH repair_source AS (
{REPAIR_EXPORT_BASE}
)
SELECT * FROM repair_source
WHERE (effective_updated_at, id) > (%s::timestamptz, %s)
ORDER BY effective_updated_at, id
LIMIT %s
"""


EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:\+?54\s*)?(?:9\s*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{4}[\s.-]*\d{4}")
PRICE_PATTERN = re.compile(r"(?:US\$|USD|ARS|\$)\s*\d[\d.,]*", re.IGNORECASE)
OPERATIONAL_OBSERVATION_PATTERN = re.compile(
    r"^(?:reparaci[oó]n\s+)?(?:tomada por t[eé]cnico|cobrada en venta|asignada a|estado cambiado)",
    re.IGNORECASE,
)


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
    learning_record: dict[str, object] | None


def sanitize_technical_text(value: str) -> str:
    sanitized = EMAIL_PATTERN.sub("[EMAIL_REMOVIDO]", value)
    sanitized = PHONE_PATTERN.sub("[TELEFONO_REMOVIDO]", sanitized)
    sanitized = PRICE_PATTERN.sub("[PRECIO_REMOVIDO]", sanitized)
    return re.sub(r"\s+", " ", sanitized).strip()


def technical_observations(values: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(value for value in values if not OPERATIONAL_OBSERVATION_PATTERN.match(value.strip()))


def has_useful_technical_content(source: RepairSource) -> bool:
    candidates = (
        source.diagnosis,
        source.enriched_diagnosis,
        *technical_observations(source.observations),
        *structured_learning_values(source.learning_record),
    )
    return any(len(sanitize_technical_text(value)) >= 12 for value in candidates)


def structured_learning_values(record: dict[str, object] | None) -> tuple[str, ...]:
    if not record:
        return ()
    fields = ("symptom", "rootCause", "confirmingEvidence", "intervention", "verification")
    return tuple(str(record.get(field) or "") for field in fields)


def build_repair_content(source: RepairSource) -> str:
    brand = normalize_brand(source.brand)
    model = normalize_model(brand, source.model)
    solution = " | ".join(filter(None, map(sanitize_technical_text, technical_observations(source.observations))))
    parts = " | ".join(filter(None, map(sanitize_technical_text, source.parts)))
    learning = source.learning_record or {}
    references = learning.get("affectedReferences")
    affected_references = " | ".join(
        sanitize_technical_text(str(value))
        for value in references
    ) if isinstance(references, list) else ""
    sections = (
        f"DISPOSITIVO: {brand} {model}",
        f"PROBLEMA: {sanitize_technical_text(source.problem)}",
        f"DIAGNOSTICO: {sanitize_technical_text(source.diagnosis)}",
        f"SOLUCION: {solution}",
        f"REPUESTOS: {parts}",
        f"ESTADO: {sanitize_technical_text(source.current_status)}",
        f"EVIDENCIA: {sanitize_technical_text(source.enriched_diagnosis)}",
        f"SINTOMA_CONFIRMADO: {sanitize_technical_text(str(learning.get('symptom') or ''))}",
        f"CAUSA_CONFIRMADA: {sanitize_technical_text(str(learning.get('rootCause') or ''))}",
        f"MEDICION_CONFIRMATORIA: {sanitize_technical_text(str(learning.get('confirmingEvidence') or ''))}",
        f"INTERVENCION_CONFIRMADA: {sanitize_technical_text(str(learning.get('intervention') or ''))}",
        f"VERIFICACION_FINAL: {sanitize_technical_text(str(learning.get('verification') or ''))}",
        f"REFERENCIAS_AFECTADAS: {affected_references}",
    )
    return "\n".join(sections)
