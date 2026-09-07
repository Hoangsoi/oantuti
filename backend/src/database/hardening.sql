ALTER TABLE rooms ADD COLUMN IF NOT EXISTS round_no INT NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS round_deadline TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS escrow_funded BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_rematch BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS guest_rematch BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE referral_commissions ADD COLUMN IF NOT EXISTS round_no INT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payout_details JSONB;

-- Old ready rooms never held funds. Cancel them without touching balances.
UPDATE rooms SET status = 'expired' WHERE status = 'ready' AND NOT escrow_funded;

CREATE TABLE IF NOT EXISTS room_rounds (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  round_no INT NOT NULL,
  host_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  guest_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  host_is_house BOOLEAN NOT NULL,
  guest_is_house BOOLEAN NOT NULL,
  bet_amount INT NOT NULL CHECK (bet_amount >= 0),
  fee_amount INT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  winner_id INT REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'completed')),
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  UNIQUE(room_id, round_no)
);

CREATE TABLE IF NOT EXISTS coin_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delta BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO coin_ledger(user_id, delta, balance_after, reason)
SELECT id, coins, coins, 'opening_balance' FROM users;
CREATE OR REPLACE FUNCTION audit_coin_balance() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO coin_ledger(user_id, delta, balance_after, reason)
    VALUES (NEW.id, NEW.coins, NEW.coins, COALESCE(NULLIF(current_setting('app.coin_reason', true), ''), 'account_created'));
  ELSIF NEW.coins <> OLD.coins THEN
    INSERT INTO coin_ledger(user_id, delta, balance_after, reason)
    VALUES (NEW.id, NEW.coins - OLD.coins, NEW.coins, COALESCE(NULLIF(current_setting('app.coin_reason', true), ''), 'balance_update'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_coin_audit AFTER INSERT OR UPDATE OF coins ON users
FOR EACH ROW EXECUTE FUNCTION audit_coin_balance();
ALTER TABLE users ADD CONSTRAINT users_coins_nonnegative CHECK (coins >= 0);
CREATE INDEX IF NOT EXISTS idx_coin_ledger_user ON coin_ledger(user_id, id);
CREATE INDEX IF NOT EXISTS idx_rooms_deadline ON rooms(round_deadline) WHERE status = 'ready';

CREATE OR REPLACE FUNCTION protect_financial_history() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financial history is immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER immutable_coin_ledger BEFORE UPDATE OR DELETE ON coin_ledger
FOR EACH ROW EXECUTE FUNCTION protect_financial_history();
CREATE OR REPLACE FUNCTION protect_completed_round() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Completed rounds cannot be changed or removed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER immutable_completed_round BEFORE UPDATE OR DELETE ON room_rounds
FOR EACH ROW EXECUTE FUNCTION protect_completed_round();

-- Preserve financial records even when an administrator removes a profile.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
