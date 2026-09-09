-- Complete the existing read-only Cerebro export role. Never create a role or grant writes.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rag_reader') THEN
        IF has_table_privilege('rag_reader', 'public.repairs', 'SELECT') THEN
            GRANT SELECT ON TABLE public.repair_learning_records TO rag_reader;
        END IF;
    END IF;
END
$$;
