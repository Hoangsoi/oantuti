import { query, pool } from '../database';
import { Room, Move, User } from '../types';
import { determineResult } from './game.service';
import { recordWagerAndCheckVipUpgrade } from './vip.service';

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
    // Get currently active bot host_ids in waiting rooms
    const activeBotHostsRes = await query<{ host_id: number }>(
      "SELECT host_id FROM rooms WHERE status = 'waiting' AND is_bot_room = true"
    );
    const activeBotHostIds = new Set(activeBotHostsRes.rows.map((r) => r.host_id));

    // Filter available bot profiles whose botUser.id is NOT currently active
    const availableProfiles = [];
    for (const profile of VIRTUAL_BOT_PROFILES) {
      const botUser = await getOrCreateBotUser(profile);
      if (!activeBotHostIds.has(botUser.id)) {
        availableProfiles.push({ profile, botUser });
      }
    }

    const currentCount = activeBotHostIds.size;
    const TARGET_BOT_ROOMS = Math.min(6, VIRTUAL_BOT_PROFILES.length);

    if (currentCount < TARGET_BOT_ROOMS && availableProfiles.length > 0) {
      const needed = TARGET_BOT_ROOMS - currentCount;
      const shuffled = availableProfiles.sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(needed, shuffled.length); i++) {
        const { profile, botUser } = shuffled[i];
        const betAmount = BET_TIERS[Math.floor(Math.random() * BET_TIERS.length)];
        let roomCode = generateRoomCode();
        const roomName = `Phòng của ${profile.name}`;

        await query(
          `INSERT INTO rooms (room_code, host_id, bet_amount, room_name, password, status, is_bot_room)
           VALUES ($1, $2, $3, $4, NULL, 'waiting', true)`,
          [roomCode, botUser.id, betAmount, roomName]
        );
      }
    }
  } catch (err) {
    console.error('[Virtual Room Service] Exception ensuring virtual rooms:', err);
  }
}

export async function getWaitingRooms(): Promise<Room[]> {
  await ensureVirtualRooms();

  const res = await query(
    `SELECT r.*,
            false as has_password,
            h.first_name as host_name, h.photo_url as host_avatar
     FROM rooms r
     JOIN users h ON r.host_id = h.id
     WHERE r.status = 'waiting' AND (r.password IS NULL OR r.password = '')
     ORDER BY r.created_at DESC
     LIMIT 50`
  );
  return res.rows.map((r) => ({ ...r, password: undefined }));
}

export async function createRoom(
  hostId: number,
  betAmount: number = 0,
  roomName?: string,
  password?: string
): Promise<Room> {
  const safeBet = Math.max(0, Math.floor(betAmount));

  // If player is in an active match in progress ('ready'), prevent creating new room until match ends
  const existingActive = await query<Room>(
    "SELECT room_code FROM rooms WHERE host_id = $1 AND status = 'ready'",
    [hostId]
  );
  if (existingActive.rows.length > 0) {
    throw new Error(
      `Bạn đang có 1 trận đấu đang diễn ra (#${existingActive.rows[0].room_code}). Vui lòng hoàn thành ván đấu trước khi tạo phòng mới!`
    );
  }

  // Auto-expire any unjoined waiting rooms hosted by this user
  await query(
    "UPDATE rooms SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE host_id = $1 AND status = 'waiting'",
    [hostId]
  );

  const userRes = await query<User>('SELECT first_name, coins FROM users WHERE id = $1', [hostId]);
  if (userRes.rows.length === 0) throw new Error('Người dùng không tồn tại');
  const user = userRes.rows[0];

  if (safeBet > 0 && user.coins < safeBet) {
    throw new Error(`Số dư Xu Game của bạn không đủ (${safeBet.toLocaleString()} Xu). Vui lòng nạp thêm Xu Game!`);
  }

  const finalRoomName = roomName && roomName.trim() ? roomName.trim() : `Phòng của ${user.first_name || 'Chủ phòng'}`;
  const finalPassword = password && password.trim() ? password.trim() : null;

  let roomCode = generateRoomCode();
  let attempts = 0;

  while (attempts < 5) {
    const check = await query('SELECT id FROM rooms WHERE room_code = $1 AND status != $2', [roomCode, 'completed']);
    if (check.rows.length === 0) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  await query(
    `INSERT INTO rooms (room_code, host_id, bet_amount, room_name, password, status, is_bot_room)
     VALUES ($1, $2, $3, $4, $5, 'waiting', false)`,
    [roomCode, hostId, safeBet, finalRoomName, finalPassword]
  );

  return getRoomState(hostId, roomCode);
}

export async function joinRoom(guestId: number, roomCode: string, inputPassword?: string): Promise<Room> {
  const cleanCode = roomCode.trim();
  const roomRes = await query<Room>('SELECT * FROM rooms WHERE room_code = $1', [cleanCode]);

  if (roomRes.rows.length === 0) {
    throw new Error('Mã phòng không tồn tại');
  }

  const room = roomRes.rows[0];

  if (room.host_id === guestId) {
    return getRoomState(guestId, cleanCode);
  }

  // Password verification if room is password protected
  if (room.password && room.password.trim() !== '') {
    if (!inputPassword || inputPassword.trim() !== room.password.trim()) {
      throw new Error('Mật khẩu phòng đấu không chính xác! Vui lòng nhập đúng khóa phòng.');
    }
  }

  if (room.status === 'completed') {
    throw new Error('Phòng đấu này đã kết thúc');
  }

  if (room.guest_id && room.guest_id !== guestId) {
    throw new Error('Phòng đấu này đã đủ 2 người chơi');
  }

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

export async function spectateRoom(userId: number, roomCode: string): Promise<Room> {
  const cleanCode = roomCode.trim();
  const roomRes = await query<Room>('SELECT * FROM rooms WHERE room_code = $1', [cleanCode]);
  if (roomRes.rows.length === 0) throw new Error('Phòng đấu không tồn tại');

  const room = roomRes.rows[0];
  if (room.password && room.password.trim() !== '') {
    throw new Error('Phòng có khóa mật khẩu không hỗ trợ vào xem trực tiếp');
  }

  await query('UPDATE rooms SET spectator_count = spectator_count + 1 WHERE id = $1', [room.id]);
  return getRoomState(userId, cleanCode);
}

export async function getRoomState(userId: number, roomCode: string): Promise<Room> {
  const cleanCode = roomCode.trim();
  const res = await query(
    `SELECT r.*,
            (r.password IS NOT NULL AND r.password != '') as has_password,
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
  const isHost = Number(room.host_id) === Number(userId);
  const isGuest = Number(room.guest_id) === Number(userId);

  const has_host_locked = !!room.host_move;
  const has_guest_locked = !!room.guest_move;

  let safeHostMove = room.host_move;
  let safeGuestMove = room.guest_move;

  // Check if requesting user is a Company Account (Tài khoản công ty)
  let isCompanyAccount = false;
  try {
    const userCheck = await query<User>('SELECT is_company_account FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length > 0 && userCheck.rows[0].is_company_account) {
      isCompanyAccount = true;
    }
  } catch (e) {}

  if (room.status !== 'completed' && !isCompanyAccount) {
    if (!isHost) safeHostMove = null;
    if (!isGuest) safeGuestMove = null;
  }

  return {
    ...room,
    password: undefined, // Never leak plain room password
    host_move: safeHostMove,
    guest_move: safeGuestMove,
    has_host_locked,
    has_guest_locked,
    is_company_account: isCompanyAccount,
  };
}

async function processReferralCommissions(
  client: any,
  playerId: number,
  betAmount: number,
  roomId: number
): Promise<void> {
  if (betAmount <= 0) return;

  const TIER_RATES = [0.010, 0.004, 0.003, 0.002, 0.001]; // F1: 1.0%, F2: 0.4%, F3: 0.3%, F4: 0.2%, F5: 0.1%
  let currentUserId = playerId;

  for (let level = 1; level <= 5; level++) {
    const parentRes = await client.query('SELECT referred_by FROM users WHERE id = $1', [currentUserId]);
    if (parentRes.rows.length === 0 || !parentRes.rows[0].referred_by) {
      break;
    }

    const referrerId = parentRes.rows[0].referred_by;
    const rate = TIER_RATES[level - 1];
    const commissionAmount = Math.floor(betAmount * rate);

    if (commissionAmount > 0) {
      await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [commissionAmount, referrerId]);

      await client.query(
        `INSERT INTO referral_commissions (referrer_id, referred_id, level, amount, room_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [referrerId, playerId, level, commissionAmount, roomId]
      );
    }

    currentUserId = referrerId;
  }
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

    // If room is completed from a previous round, auto-reset it for the new round
    if (room.status === 'completed') {
      await client.query(
        `UPDATE rooms 
         SET host_move = NULL, guest_move = NULL, status = CASE WHEN guest_id IS NOT NULL THEN 'ready' ELSE 'waiting' END, winner_id = NULL, result = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [room.id]
      );
      room.host_move = null;
      room.guest_move = null;
      room.status = room.guest_id ? 'ready' : 'waiting';
      room.winner_id = null;
      room.result = null;
    }

    const isHost = Number(room.host_id) === Number(userId);
    const isGuest = Number(room.guest_id) === Number(userId);

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
      const botWinRate = parseInt(process.env.BOT_WIN_RATE || '70', 10);
      const roll = Math.floor(Math.random() * 100);

      if (roll < botWinRate) {
        if (newGuestMove === 'rock') newHostMove = 'paper';
        else if (newGuestMove === 'paper') newHostMove = 'scissors';
        else if (newGuestMove === 'scissors') newHostMove = 'rock';
      } else {
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
      houseFee = Math.floor(betAmount * 0.05); // Platform fee is 5% of the room bet amount
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

      // Distribute 5-Level Referral Commissions & Track VIP Wager Progression
      if (betAmount > 0) {
        await processReferralCommissions(client, room.host_id, betAmount, room.id);
        await recordWagerAndCheckVipUpgrade(client, room.host_id, betAmount);

        if (room.guest_id && !room.is_bot_room) {
          await processReferralCommissions(client, room.guest_id, betAmount, room.id);
          await recordWagerAndCheckVipUpgrade(client, room.guest_id, betAmount);
        }
      }
    }

    await client.query(
      `UPDATE rooms 
       SET host_move = $1, guest_move = $2, status = $3, winner_id = $4, result = $5, fee_amount = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [newHostMove, newGuestMove, status, winnerId, gameResult, houseFee, room.id]
    );

    await client.query('COMMIT');

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

  if (Number(room.host_id) !== Number(userId) && Number(room.guest_id) !== Number(userId)) {
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
