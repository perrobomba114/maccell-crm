\set ON_ERROR_STOP on

DO $$
DECLARE
    missing_objects TEXT[] := ARRAY[]::TEXT[];
    access_values TEXT[];
BEGIN
    IF to_regclass('public.repair_learning_records') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_learning_records');
    END IF;

    IF (
        SELECT count(*)
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
              'repair_learning_records_pkey',
              'repair_learning_records_repairId_key',
              'repair_learning_records_authority_trainingEligible_idx',
              'repair_learning_records_technicianId_idx'
          )
    ) <> 4 THEN
        missing_objects := array_append(missing_objects, 'repair_learning_records indexes');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name = 'repair_learning_records_repairId_fkey'
          AND constraint_type = 'FOREIGN KEY'
    ) THEN
        missing_objects := array_append(missing_objects, 'repair_learning_records repair foreign key');
    END IF;

    SELECT array_agg(e.enumlabel::TEXT ORDER BY e.enumsortorder)
    INTO access_values
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RepairAccessType';

    IF access_values IS DISTINCT FROM ARRAY['CODE', 'PATTERN', 'NONE']::TEXT[] THEN
        missing_objects := array_append(missing_objects, 'RepairAccessType values');
    END IF;

    IF (
        SELECT count(*)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repairs'
          AND column_name IN ('accessType', 'accessCredential', 'hasSimCard', 'hasMemoryCard')
    ) <> 4 THEN
        missing_objects := array_append(missing_objects, 'repair intake columns');
    END IF;

    IF to_regclass('public.repair_chats') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_chats');
    END IF;
    IF to_regclass('public.repair_chat_messages') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_chat_messages');
    END IF;
    IF to_regclass('public.repair_chat_read_cursors') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_chat_read_cursors');
    END IF;

    IF (
        SELECT count(*)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('repair_chats', 'repair_chat_messages', 'repair_chat_read_cursors')
    ) <> 18 THEN
        missing_objects := array_append(missing_objects, 'repair chat columns');
    END IF;

    IF (
        SELECT count(*)
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name IN (
              'repair_chats_repairId_fkey',
              'repair_chat_messages_chatId_fkey',
              'repair_chat_messages_senderId_fkey',
              'repair_chat_messages_replyToId_fkey',
              'repair_chat_read_cursors_chatId_fkey',
              'repair_chat_read_cursors_userId_fkey'
          )
    ) <> 6 THEN
        missing_objects := array_append(missing_objects, 'repair chat foreign keys');
    END IF;

    IF (
        SELECT count(*)
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('repair_chats', 'repair_chat_messages', 'repair_chat_read_cursors')
    ) <> 10 THEN
        missing_objects := array_append(missing_objects, 'repair chat indexes');
    END IF;

    IF cardinality(missing_objects) > 0 THEN
        RAISE EXCEPTION 'Baseline abortado; faltan objetos: %', array_to_string(missing_objects, ', ');
    END IF;
END;
$$;

SELECT 'baseline_preflight_ok' AS result;
