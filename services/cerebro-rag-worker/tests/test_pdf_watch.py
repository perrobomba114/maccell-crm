import unittest
from contextlib import nullcontext
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch
from cerebro_rag.cli import index_pdfs
from cerebro_rag.pdf_inventory import PdfInventoryEntry, PdfIdentity


class PdfWatchTest(unittest.TestCase):
    def test_incremental_preserves_ready_and_reported_failures_and_indexes_new(self):
        root=Path('/library')
        identity=PdfIdentity('SAMSUNG','SM-A022M','SCHEMATIC','service')
        entries=[PdfInventoryEntry(root/name,Path(name),sha,identity) for name,sha in [('old.pdf','a'),('failed.pdf','b'),('new.pdf','c')]]
        connection=Mock()
        def execute(sql,*_):
            if 'pg_try_advisory_lock' in sql:return Mock(fetchone=lambda:(True,))
            if 'SELECT relative_path,sha256' in sql:return Mock(fetchall=lambda:[('old.pdf','a'),('failed.pdf','b')])
            return Mock()
        connection.execute.side_effect=execute
        settings=SimpleNamespace(library_root=root,page_cache_root=Path('/cache'),rag_database_url=SimpleNamespace(get_secret_value=lambda:'test'))
        with patch('cerebro_rag.cli.psycopg.connect',return_value=nullcontext(connection)), patch('cerebro_rag.cli.iter_pdf_inventory',return_value=iter(entries)), patch('cerebro_rag.cli.published_pdf_paths',return_value=[e.absolute_path for e in entries]), patch('cerebro_rag.cli.catalog_pdf_aliases'), patch('cerebro_rag.cli.get_worker_embedding_service'), patch('cerebro_rag.cli.PdfIndexer') as factory:
            factory.return_value.index.return_value=('id',1,1,False)
            index_pdfs(settings,25,None,incremental=True)
            factory.return_value.index.assert_called_once_with(entries[2],force=False)

    def test_busy_lock_does_not_mutate_or_start_indexing(self):
        connection=Mock()
        connection.execute.return_value.fetchone.return_value=(False,)
        settings=SimpleNamespace(library_root=Path('/library'),rag_database_url=SimpleNamespace(get_secret_value=lambda:'test'))
        with patch('cerebro_rag.cli.psycopg.connect',return_value=nullcontext(connection)), patch('cerebro_rag.cli.PdfIndexer') as factory:
            index_pdfs(settings,25,None,incremental=True)
            factory.assert_not_called()
            self.assertEqual(connection.execute.call_count,1)

    def test_readmitted_current_document_reactivates_without_reextracting(self):
        from cerebro_rag.indexer import PdfIndexer
        from cerebro_rag.page_metadata import INDEX_SCHEMA_VERSION
        connection=Mock()
        connection.execute.return_value.fetchone.return_value=('READY',str(INDEX_SCHEMA_VERSION))
        indexer=PdfIndexer(connection,Mock(),Path('/cache'))
        indexer.versions=Mock()
        indexer.versions.create_or_get.return_value='existing-id'
        entry=PdfInventoryEntry(Path('/library/a.pdf'),Path('a.pdf'),'a',PdfIdentity('SAMSUNG','SM-A022M','SCHEMATIC','service'))
        with patch('cerebro_rag.indexer.extract_pdf_pages') as extract:
            self.assertEqual(indexer.index(entry),('existing-id',0,0,True))
            indexer.versions.mark_ready.assert_called_once_with('existing-id')
            extract.assert_not_called()
