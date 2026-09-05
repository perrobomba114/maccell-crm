-- Existing pages stay untrusted until the indexer recalculates their content digest.
ALTER TABLE schematics.pages ADD COLUMN content_sha256 char(64);
