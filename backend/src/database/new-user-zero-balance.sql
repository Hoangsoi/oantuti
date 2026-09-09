-- Existing balances remain unchanged. Only accounts created after this
-- migration use a zero opening balance unless a trusted server flow assigns one.
ALTER TABLE users ALTER COLUMN coins SET DEFAULT 0;
