import { query, pool } from '../database';
import { GameResult, Match, Move, User } from '../types';

const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export function determineResult(playerMove: Move, opponentMove: Move): GameResult {
  if (playerMove === opponentMove) return 'draw';

  if (
    (playerMove === 'rock' && opponentMove === 'scissors') ||
    (playerMove === 'scissors' && opponentMove === 'paper') ||
    (playerMove === 'paper' && opponentMove === 'rock')
  ) {
    return 'win';
  }

  return 'lose';
}

export async function playMatch(userId: number, playerMove: Move): Promise<{ match: Match; updatedUser: User }> {
  if (!MOVES.includes(playerMove)) {
    throw new Error('Lựa chọn không hợp lệ. Phải là rock, paper hoặc scissors');
  }

  // Generate random opponent move (server decision)
  const opponentMove = MOVES[Math.floor(Math.random() * MOVES.length)];
  const result = determineResult(playerMove, opponentMove);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch user current data with row locking
    const userRes = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('Người dùng không tồn tại');
    }

    const user = userRes.rows[0];
    const ratingBefore = user.rating;

    let ratingChange = 0;
    let newWins = user.wins;
    let newLosses = user.losses;
    let newDraws = user.draws;
    let newCurrentStreak = user.current_streak;
    let newBestStreak = user.best_streak;

    if (result === 'win') {
      ratingChange = 12;
      newWins += 1;
      newCurrentStreak += 1;
      if (newCurrentStreak > newBestStreak) {
        newBestStreak = newCurrentStreak;
      }
    } else if (result === 'lose') {
      ratingChange = -8;
      newLosses += 1;
      newCurrentStreak = 0;
    } else {
      ratingChange = 0;
      newDraws += 1;
    }

    const ratingAfter = Math.max(0, ratingBefore + ratingChange);
    const newTotalMatches = user.total_matches + 1;

    // Update user stats
    const updatedUserRes = await client.query<User>(
      `UPDATE users
       SET rating = $1,
           wins = $2,
           losses = $3,
           draws = $4,
           total_matches = $5,
           current_streak = $6,
           best_streak = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [ratingAfter, newWins, newLosses, newDraws, newTotalMatches, newCurrentStreak, newBestStreak, userId]
    );

    const updatedUser = updatedUserRes.rows[0];

    // Insert match record
    const matchRes = await client.query<Match>(
      `INSERT INTO matches (player_id, opponent_type, player_move, opponent_move, result, rating_before, rating_change, rating_after)
       VALUES ($1, 'bot', $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, playerMove, opponentMove, result, ratingBefore, ratingChange, ratingAfter]
    );

    await client.query('COMMIT');

    return {
      match: matchRes.rows[0],
      updatedUser,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
