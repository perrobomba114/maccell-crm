from __future__ import annotations

from dataclasses import replace
import unittest
from unittest.mock import MagicMock, patch

from cerebro_rag.authority import Authority, classify_authority
from cerebro_rag.repair_indexer import (
    RepairIndexer,
    authority_evidence,
    repair_quality_fingerprint,
    verified_learning_authority,
)
from cerebro_rag.repair_quality import REPAIR_QUALITY_POLICY_VERSION
from cerebro_rag.repairs import RepairSource, build_repair_content


def repair_source() -> RepairSource:
    return RepairSource(
        repair_id="repair-1",
        ticket_number="MAC-1",
        brand="Motorola",
        model="E7",
        problem="No enciende",
        diagnosis="",
        enriched_diagnosis="",
        observations=("Se reemplazó el pin de carga y se verificó encendido",),
        parts=("Pin de carga",),
        current_status="Finalizado OK",
        prior_statuses=("En proceso",),
        learning_record=None,
    )


class RepairIndexerQualityTest(unittest.TestCase):
    def test_policy_change_reprocesses_ready_document_with_unchanged_text(self) -> None:
        connection = MagicMock()

        def execute(query: str, *_: object) -> MagicMock:
            result = MagicMock()
            if "metadata->>'repair_quality_policy_version'" in query:
                result.fetchone.return_value = ("READY", str(REPAIR_QUALITY_POLICY_VERSION - 1), "old")
            elif "SELECT id FROM rag_model_versions" in query:
                result.fetchone.return_value = ("model-version",)
            return result

        connection.execute.side_effect = execute
        embeddings = MagicMock()
        embeddings.embed_passages.return_value = [(0.1, 0.2)]
        indexer = RepairIndexer(connection, embeddings)

        with patch.object(indexer, "_persist") as persist:
            indexed, skipped = indexer.index_batch([repair_source()])

        self.assertEqual((indexed, skipped), (1, 0))
        embeddings.embed_passages.assert_called_once()
        persist.assert_called_once()

    def test_current_policy_skips_ready_document_with_unchanged_text(self) -> None:
        connection = MagicMock()
        result = MagicMock()
        source = repair_source()
        result.fetchone.return_value = (
            "READY",
            str(REPAIR_QUALITY_POLICY_VERSION),
            repair_quality_fingerprint(source),
        )
        connection.execute.return_value = result
        embeddings = MagicMock()
        indexer = RepairIndexer(connection, embeddings)

        self.assertEqual(indexer.index_batch([source]), (0, 1))
        embeddings.embed_passages.assert_not_called()

    def test_final_unrepaired_cycle_retires_existing_document(self) -> None:
        source = repair_source()
        source = replace(
            source,
            current_status="Entregado",
            prior_statuses=("En proceso", "No Reparado"),
        )
        connection = MagicMock()
        embeddings = MagicMock()
        indexer = RepairIndexer(connection, embeddings)

        self.assertEqual(indexer.index_batch([source]), (0, 1))
        retire_query = connection.execute.call_args_list[0].args[0]
        self.assertIn("SET retired_at = now()", retire_query)
        embeddings.embed_passages.assert_not_called()

    def test_document_headers_do_not_substitute_for_authority_evidence(self) -> None:
        source = replace(repair_source(), observations=(), parts=())

        self.assertEqual(authority_evidence(source), "")

    def test_reported_technical_success_remains_retrievable_but_incomplete(self) -> None:
        source = repair_source()

        self.assertNotEqual(authority_evidence(source), "")
        self.assertEqual(
            classify_authority(
                source.current_status,
                list(source.prior_statuses),
                authority_evidence(source),
                verified_learning_authority(source),
            ),
            Authority.INCOMPLETE,
        )

    def test_stale_reviewed_learning_is_not_confirmed_or_training_eligible(self) -> None:
        source = replace(repair_source(), learning_record={
            "authority": "CONFIRMED_SUCCESS",
            "trainingEligible": True,
            "rootCause": "No determinada",
            "confirmingEvidence": "",
            "intervention": "Se revisó el equipo",
            "verification": "",
        })

        self.assertEqual(verified_learning_authority(source), "")
        self.assertEqual(
            classify_authority(
                source.current_status,
                list(source.prior_statuses),
                authority_evidence(source),
                verified_learning_authority(source),
            ),
            Authority.INCOMPLETE,
        )

    def test_only_golden_learning_can_be_confirmed_success(self) -> None:
        source = replace(repair_source(), learning_record={
            "authority": "CONFIRMED_SUCCESS",
            "trainingEligible": True,
            "rootCause": "Filtro FL2201 abierto",
            "confirmingEvidence": "Continuidad abierta a ambos lados de FL2201",
            "intervention": "Se reemplazó FL2201",
            "verification": "Imagen estable durante prueba funcional",
        })

        self.assertEqual(
            classify_authority(
                source.current_status,
                list(source.prior_statuses),
                authority_evidence(source),
                verified_learning_authority(source),
            ),
            Authority.CONFIRMED_SUCCESS,
        )

    def test_approval_reprocesses_ready_document_with_identical_content(self) -> None:
        before, after = quality_transition(False, True)
        self.assertEqual(build_repair_content(before), build_repair_content(after))
        self.assertNotEqual(repair_quality_fingerprint(before), repair_quality_fingerprint(after))
        self.assert_quality_change_reindexes(before, after)

    def test_revocation_reprocesses_ready_document_with_identical_content(self) -> None:
        before, after = quality_transition(True, False)
        self.assertEqual(build_repair_content(before), build_repair_content(after))
        self.assertNotEqual(repair_quality_fingerprint(before), repair_quality_fingerprint(after))
        self.assert_quality_change_reindexes(before, after)

    def assert_quality_change_reindexes(self, before: RepairSource, after: RepairSource) -> None:
        connection = MagicMock()

        def execute(query: str, *_: object) -> MagicMock:
            result = MagicMock()
            if "metadata->>'repair_quality_policy_version'" in query:
                result.fetchone.return_value = (
                    "READY",
                    str(REPAIR_QUALITY_POLICY_VERSION),
                    repair_quality_fingerprint(before),
                )
            elif "SELECT id FROM rag_model_versions" in query:
                result.fetchone.return_value = ("model-version",)
            return result

        connection.execute.side_effect = execute
        embeddings = MagicMock()
        embeddings.embed_passages.return_value = [(0.1, 0.2)]
        indexer = RepairIndexer(connection, embeddings)
        with patch.object(indexer, "_persist") as persist:
            self.assertEqual(indexer.index_batch([after]), (1, 0))
        persist.assert_called_once()


def quality_transition(before_approved: bool, after_approved: bool) -> tuple[RepairSource, RepairSource]:
    technical = {
        "rootCause": "Filtro FL2201 abierto",
        "confirmingEvidence": "Continuidad abierta a ambos lados de FL2201",
        "intervention": "Se reemplazó FL2201",
        "verification": "Imagen estable durante prueba funcional",
    }
    source = repair_source()
    before = replace(source, learning_record={
        **technical,
        "authority": "CONFIRMED_SUCCESS" if before_approved else "INCOMPLETE",
        "trainingEligible": before_approved,
    })
    after = replace(source, learning_record={
        **technical,
        "authority": "CONFIRMED_SUCCESS" if after_approved else "INCOMPLETE",
        "trainingEligible": after_approved,
    })
    return before, after


if __name__ == "__main__":
    unittest.main()
