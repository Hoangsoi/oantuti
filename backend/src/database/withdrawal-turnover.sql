CREATE TABLE IF NOT EXISTS user_withdrawal_turnover (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  required_wager BIGINT NOT NULL DEFAULT 0 CHECK (required_wager >= 0),
  completed_wager BIGINT NOT NULL DEFAULT 0 CHECK (completed_wager >= 0 AND completed_wager <= required_wager),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Establish a conservative baseline for existing accounts. Completed, non-draw
-- rounds can satisfy approved deposits that already existed before this migration.
INSERT INTO user_withdrawal_turnover (user_id, required_wager, completed_wager)
SELECT
  u.id,
  COALESCE(d.required_wager, 0),
  LEAST(COALESCE(d.required_wager, 0), COALESCE(w.completed_wager, 0))
FROM users u
LEFT JOIN (
  SELECT user_id, SUM(coins)::BIGINT AS required_wager
  FROM transactions
  WHERE type = 'deposit' AND status = 'approved'
  GROUP BY user_id
) d ON d.user_id = u.id
LEFT JOIN (
  SELECT player_id, SUM(bet_amount)::BIGINT AS completed_wager
  FROM (
    SELECT host_id AS player_id, bet_amount
    FROM room_rounds
    WHERE status = 'completed' AND result <> 'draw'
    UNION ALL
    SELECT guest_id AS player_id, bet_amount
    FROM room_rounds
    WHERE status = 'completed' AND result <> 'draw'
  ) qualifying_rounds
  GROUP BY player_id
) w ON w.player_id = u.id
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_turnover_incomplete
ON user_withdrawal_turnover (user_id)
WHERE completed_wager < required_wager;
