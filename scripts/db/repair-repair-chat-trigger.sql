\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION notify_repair_chat_change() RETURNS TRIGGER AS $$
DECLARE
    event_type TEXT;
BEGIN
    IF OLD."assignedUserId" IS DISTINCT FROM NEW."assignedUserId" THEN
        event_type := 'access.changed';
    ELSIF OLD."statusId" IS DISTINCT FROM NEW."statusId" THEN
        event_type := 'status.changed';
    ELSE
        RETURN NEW;
    END IF;

    PERFORM pg_notify('repair_chat_events', json_build_object(
        'eventId', md5(random()::TEXT || clock_timestamp()::TEXT),
        'type', event_type,
        'repairId', NEW."id",
        'branchId', NEW."branchId",
        'assignedUserId', NEW."assignedUserId",
        'previousAssignedUserId', OLD."assignedUserId",
        'occurredAt', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS repair_chat_change_notify ON repairs;
CREATE TRIGGER repair_chat_change_notify
AFTER UPDATE OF "assignedUserId", "statusId" ON repairs
FOR EACH ROW EXECUTE FUNCTION notify_repair_chat_change();

COMMIT;
