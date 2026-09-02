import { query } from '../database';
import { Match } from '../types';

export async function getUserMatches(userId: number, limit: number = 20): Promise<Match[]> {
  const result = await query<Match>(
    'SELECT * FROM matches WHERE player_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}
