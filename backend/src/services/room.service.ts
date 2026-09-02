import { query, pool } from '../database';
import { Room, Move, User } from '../types';
import { determineResult } from './game.service';

const VIRTUAL_BOT_PROFILES = [
  { name: 'Minh Quân', tgId: -101, seed: 'minh_quan_99' },
  { name: 'Bảo Trâm', tgId: -102, seed: 'bao_tram_88' },
  { name: 'Hoàng Nam', tgId: -103, seed: 'hoang_nam_77' },
  { name: 'Khánh Linh', tgId: -104, seed: 'khanh_linh_66' },
  { name: 'Tiến Dũng', tgId: -105, seed: 'tien_dung_55' },
  { name: 'Phương Thảo', tgId: -106, seed: 'phuong_thao_44' },
  { name: 'Hải Đăng', tgId: -107, seed: 'hai_dang_33' },
  { name: 'Thu Trang', tgId: -108, seed: 'thu_trang_22' },
  { name: 'Trọng Hiếu', tgId: -109, seed: 'trong_hieu_11' },
  { name: 'Ngọc Ánh', tgId: -110, seed: 'ngoc_anh_10' },
  { name: 'Gia Huy', tgId: -111, seed: 'gia_huy_12' },
  { name: 'Thùy Dương', tgId: -112, seed: 'thuy_duong_14' },
  { name: 'Đức Anh', tgId: -113, seed: 'duc_anh_16' },
  { name: 'Hương Giang', tgId: -114, seed: 'huong_giang_18' },
  { name: 'Quốc Bảo', tgId: -115, seed: 'quoc_bao_20' },
];

const BET_TIERS = [0, 5000, 10000, 20000, 50000, 100000];

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getOrCreateBotUser(profile: typeof VIRTUAL_BOT_PROFILES[0]): Promise<User> {
  const check = await query<User>('SELECT * FROM users WHERE telegram_id = $1', [profile.tgId]);
  if (check.rows.length > 0) return check.rows[0];

  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.seed}`;
  const res = await query<User>(
    `INSERT INTO users (telegram_id, first_name, photo_url, rating, coins, referral_code)
     VALUES ($1, $2, $3, 1200, 9999999, $4)
     RETURNING *`,
    [profile.tgId, profile.name, avatar, `REF_BOT_${Math.abs(profile.tgId)}`]
  );
  return res.rows[0];
}

export async function ensureVirtualRooms(): Promise<void> {
  try {
    const waitingRes = await query('SELECT COUNT(*) as count FROM rooms WHERE status = $1 AND is_bot_room = true', ['waiting']);
    const count = parseInt(waitingRes.rows[0]?.count || '0', 10);

    const TARGET_BOT_ROOMS = 6;
    if (count < TARGET_BOT_ROOMS) {
      const needed = TARGET_BOT_ROOMS - count;
      for (let i = 0; i < needed; i++) {
        const profile = VIRTUAL_BOT_PROFILES[Math.floor(Math.random() * VIRTUAL_BOT_PROFILES.length)];
        const botUser = await getOrCreateBotUser(profile);

        const betAmount = BET_TIERS[Math.floor(Math.random() * BET_TIERS.length)];
        let roomCode = generateRoomCode();

        await query(
          `INSERT INTO rooms (room_code, host_id, bet_amount, status, is_bot_room)
           VALUES ($1, $2, $3, 'waiting', true)`,
          [roomCode, botUser.id, betAmount]
        );
      }
    }
  } catch (err) {
    console.error('[Virtual Room Service] Exception ensuring virtual rooms:', err);
  }
}

export async function getWaitingRooms(): Promise<Room[]> {
  // Auto replenish virtual bot rooms to ensure lobby is always active
  await ensureVirtualRooms();

  const res = await query(
    `SELECT r.*,
            h.first_name as host_name, h.photo_url as host_avatar
     FROM rooms r
     JOIN users h ON r.host_id = h.id
     WHERE r.status = 'waiting'
     ORDER BY r.created_at DESC
     LIMIT 50`
  );
  return res.rows;
}

export async function createRoom(hostId: number, betAmount: number = 0): Promise<Room> {
  const safeBet = Math.max(0, Math.floor(betAmount));

  // Check host coin balance if bet is specified
  if (safeBet > 0) {
    const userRes = await query<User>('SELECT coins FROM users WHERE id = $1', [hostId]);
    if (userRes.rows.length === 0 || userRes.rows[0].coins < safeBet) {
      throw new Error(`Số dư Xu Game của bạn không đủ (${safeBet.toLocaleString()} Xu). Vui lòng nạp thêm Xu Game!`);
    }
  }

  let roomCode = generateRoomCode();
  let attempts = 0;

  while (attempts < 5) {
    const check = await query('SELECT id FROM rooms WHERE room_code = $1 AND status != $2', [roomCode, 'completed']);
    if (check.rows.length === 0) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  await query(
    `INSERT INTO rooms (room_code, host_id, bet_amount, status, is_bot_room)
     VALUES ($1, $2, $3, 'waiting', false)`,
    [roomCode, hostId, safeBet]
  );

  return getRoomState(hostId, roomCode);
}

export async function joinRoom(guestId: number, roomCode: string): Promise<Room> {
  const cleanCode = roomCode.trim();
  const roomRes = await query<Room>('SELECT * FROM rooms WHERE room_code = $1', [cleanCode]);

  if (roomRes.rows.length === 0) {
    throw new Error('Mã phòng không tồn tại');
  }

  const room = roomRes.rows[0];

  if (room.host_id === guestId) {
    return getRoomState(guestId, cleanCode);
  }

  if (room.status === 'completed') {
    throw new Error('Phòng đấu này đã kết thúc');
  }

  if (room.guest_id && room.guest_id !== guestId) {
    throw new Error('Phòng đấu này đã đủ 2 người chơi');
  }

  // Check guest coin balance if room has bet_amount
  if (room.bet_amount > 0) {
    const guestRes = await query<User>('SELECT coins FROM users WHERE id = $1', [guestId]);
    if (guestRes.rows.length === 0 || guestRes.rows[0].coins < room.bet_amount) {
      throw new Error(`Số dư Xu của bạn không đủ để tham gia phòng cược ${room.bet_amount.toLocaleString()} Xu`);
    }
  }

  await query(
    `UPDATE rooms 
     SET guest_id = $1, status = 'ready', updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [guestId, room.id]
  );

  return getRoomState(guestId, cleanCode);
}

export async function getRoomState(userId: number, roomCode: string): Promise<Room> {
  const cleanCode = roomCode.trim();
  const res = await query(
    `SELECT r.*,
            h.first_name as host_name, h.photo_url as host_avatar,
            g.first_name as guest_name, g.photo_url as guest_avatar
     FROM rooms r
     JOIN users h ON r.host_id = h.id
     LEFT JOIN users g ON r.guest_id = g.id
     WHERE r.room_code = $1`,
    [cleanCode]
  );

  if (res.rows.length === 0) {
    throw new Error('Không tìm thấy phòng đấu');
  }

  const room = res.rows[0];
  const isHost = room.host_id === userId;
  const isGuest = room.guest_id === userId;

  const has_host_locked = !!room.host_move;
  const has_guest_locked = !!room.guest_move;

  let safeHostMove = room.host_move;
  let safeGuestMove = room.guest_move;

  if (room.status !== 'completed') {
    if (!isHost) safeHostMove = null;
    if (!isGuest) safeGuestMove = null;
  }

  return {
    ...room,
    host_move: safeHostMove,
    guest_move: safeGuestMove,
    has_host_locked,
    has_guest_locked,
  };
}

export async function playRoomMove(userId: number, roomCode: string, move: Move): Promise<Room> {
  if (!['rock', 'paper', 'scissors'].includes(move)) {
    throw new Error('Nước đi không hợp lệ');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const roomRes = await client.query<Room>('SELECT * FROM rooms WHERE room_code = $1 FOR UPDATE', [roomCode.trim()]);
    if (roomRes.rows.length === 0) {
      throw new Error('Phòng không tồn tại');
    }

    const room = roomRes.rows[0];

    if (room.status === 'completed') {
      throw new Error('Trận đấu phòng này đã hoàn thành');
    }

    const isHost = room.host_id === userId;
    const isGuest = room.guest_id === userId;

    if (!isHost && !isGuest) {
      throw new Error('Bạn không phải người chơi trong phòng này');
    }

    let newHostMove = room.host_move;
    let newGuestMove = room.guest_move;

    if (isHost) {
      if (room.host_move) throw new Error('Bạn đã khóa nước đi rồi');
      newHostMove = move;
    } else {
      if (room.guest_move) throw new Error('Bạn đã khóa nước đi rồi');
      newGuestMove = move;
    }

    // ----------------------------------------------------------------------
    // VIRTUAL BOT ROOM RIGGED MOVE RESOLUTION ENGINE
    // ----------------------------------------------------------------------
    if (room.is_bot_room && isGuest && !newHostMove) {
      // Calculate Bot host move based on Admin configured botWinRate % (Default 70%)
      const botWinRate = parseInt(process.env.BOT_WIN_RATE || '70', 10);
      const roll = Math.floor(Math.random() * 100);

      if (roll < botWinRate) {
        // Bot wins (70% probability): Bot chooses move that BEATS guest move
        if (newGuestMove === 'rock') newHostMove = 'paper';
        else if (newGuestMove === 'paper') newHostMove = 'scissors';
        else if (newGuestMove === 'scissors') newHostMove = 'rock';
      } else {
        // Player wins (30% probability): Bot chooses move that LOSES to guest move
        if (newGuestMove === 'rock') newHostMove = 'scissors';
        else if (newGuestMove === 'paper') newHostMove = 'rock';
        else if (newGuestMove === 'scissors') newHostMove = 'paper';
      }
    }

    let status: Room['status'] = room.status;
    let winnerId: number | null = null;
    let gameResult: any = null;
    let houseFee = 0;

    if (newHostMove && newGuestMove) {
      status = 'completed';
      const hostOutcome = determineResult(newHostMove, newGuestMove);
      gameResult = hostOutcome;

      const hostRes = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [room.host_id]);
      const guestRes = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [room.guest_id]);

      const hostUser = hostRes.rows[0];
      const guestUser = guestRes.rows[0];

      let hostRatingChange = 0;
      let guestRatingChange = 0;

      const betAmount = room.bet_amount || 0;
      const totalPot = betAmount * 2;
      houseFee = Math.floor(totalPot * 0.05); // Platform keeps 5% fee from winner
      const winnerNetGain = betAmount - houseFee;

      if (hostOutcome === 'win') {
        winnerId = room.host_id;
        hostRatingChange = 12;
        guestRatingChange = -8;

        await client.query(
          'UPDATE users SET rating = rating + 12, coins = coins + $1, wins = wins + 1, total_matches = total_matches + 1, current_streak = current_streak + 1 WHERE id = $2',
          [winnerNetGain, room.host_id]
        );

        await client.query(
          'UPDATE users SET rating = GREATEST(0, rating - 8), coins = GREATEST(0, coins - $1), losses = losses + 1, total_matches = total_matches + 1, current_streak = 0 WHERE id = $2',
          [betAmount, room.guest_id]
        );
      } else if (hostOutcome === 'lose') {
        winnerId = room.guest_id;
        hostRatingChange = -8;
        guestRatingChange = 12;

        await client.query(
          'UPDATE users SET rating = GREATEST(0, rating - 8), coins = GREATEST(0, coins - $1), losses = losses + 1, total_matches = total_matches + 1, current_streak = 0 WHERE id = $2',
          [betAmount, room.host_id]
        );

        await client.query(
          'UPDATE users SET rating = rating + 12, coins = coins + $1, wins = wins + 1, total_matches = total_matches + 1, current_streak = current_streak + 1 WHERE id = $2',
          [winnerNetGain, room.guest_id]
        );
      } else {
        await client.query('UPDATE users SET draws = draws + 1, total_matches = total_matches + 1 WHERE id = $1', [room.host_id]);
        await client.query('UPDATE users SET draws = draws + 1, total_matches = total_matches + 1 WHERE id = $1', [room.guest_id]);
      }

      await client.query(
        `INSERT INTO matches (player_id, opponent_type, player_move, opponent_move, result, rating_before, rating_change, rating_after)
         VALUES ($1, 'pvp', $2, $3, $4, $5, $6, $7)`,
        [room.host_id, newHostMove, newGuestMove, hostOutcome, hostUser.rating, hostRatingChange, Math.max(0, hostUser.rating + hostRatingChange)]
      );

      const guestOutcome = hostOutcome === 'win' ? 'lose' : hostOutcome === 'lose' ? 'win' : 'draw';
      await client.query(
        `INSERT INTO matches (player_id, opponent_type, player_move, opponent_move, result, rating_before, rating_change, rating_after)
         VALUES ($1, 'pvp', $2, $3, $4, $5, $6, $7)`,
        [room.guest_id, newGuestMove, newHostMove, guestOutcome, guestUser.rating, guestRatingChange, Math.max(0, guestUser.rating + guestRatingChange)]
      );
    }

    await client.query(
      `UPDATE rooms 
       SET host_move = $1, guest_move = $2, status = $3, winner_id = $4, result = $5, fee_amount = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [newHostMove, newGuestMove, status, winnerId, gameResult, houseFee, room.id]
    );

    await client.query('COMMIT');

    // Trigger async replenishment of virtual rooms so fresh rooms appear immediately
    ensureVirtualRooms();

    return getRoomState(userId, roomCode);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function resetRoom(userId: number, roomCode: string): Promise<Room> {
  const cleanCode = roomCode.trim();
  const roomRes = await query<Room>('SELECT * FROM rooms WHERE room_code = $1', [cleanCode]);
  if (roomRes.rows.length === 0) throw new Error('Phòng không tồn tại');
  const room = roomRes.rows[0];

  if (room.host_id !== userId && room.guest_id !== userId) {
    throw new Error('Bạn không có quyền thao tác trên phòng này');
  }

  await query(
    `UPDATE rooms 
     SET host_move = NULL, guest_move = NULL, status = CASE WHEN guest_id IS NOT NULL THEN 'ready' ELSE 'waiting' END, winner_id = NULL, result = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [room.id]
  );

  return getRoomState(userId, cleanCode);
}

export async function leaveRoom(userId: number, roomCode: string): Promise<void> {
  const cleanCode = roomCode.trim();
  const roomRes = await query<Room>('SELECT * FROM rooms WHERE room_code = $1', [cleanCode]);
  if (roomRes.rows.length === 0) return;
  const room = roomRes.rows[0];

  if (room.host_id === userId) {
    await query("UPDATE rooms SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [room.id]);
  } else if (room.guest_id === userId) {
    await query("UPDATE rooms SET guest_id = NULL, status = 'waiting', host_move = NULL, guest_move = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [room.id]);
  }
}
