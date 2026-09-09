ALTER TABLE matches ADD COLUMN IF NOT EXISTS coins_change INT;

-- room_rounds and matches use CURRENT_TIMESTAMP in the same settlement transaction,
-- so their timestamps identify the corresponding historical player rows exactly.
UPDATE matches m
SET coins_change = CASE
  WHEN m.result = 'win' THEN rr.bet_amount - rr.fee_amount
  WHEN m.result = 'lose' THEN -rr.bet_amount
  ELSE 0
END
FROM room_rounds rr
WHERE m.coins_change IS NULL
  AND m.opponent_type = 'pvp'
  AND m.created_at = rr.completed_at
  AND m.player_id IN (rr.host_id, rr.guest_id);

UPDATE matches SET coins_change = 0
WHERE coins_change IS NULL AND opponent_type = 'bot';

