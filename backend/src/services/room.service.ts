import { readSettings } from './settings.service';
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
  { name: 'Tuấn Kiệt', tgId: -116, seed: 'tuan_kiet_22' },
  { name: 'Thanh Hằng', tgId: -117, seed: 'thanh_hang_24' },
  { name: 'Quang Huy', tgId: -118, seed: 'quang_huy_26' },
  { name: 'Mỹ Duyên', tgId: -119, seed: 'my_duyen_28' },
  { name: 'Anh Tuấn', tgId: -120, seed: 'anh_tuan_30' },
  { name: 'Yến Nhi', tgId: -121, seed: 'yen_nhi_32' },
  { name: 'Minh Trí', tgId: -122, seed: 'minh_tri_34' },
  { name: 'Ánh Tuyết', tgId: -123, seed: 'anh_tuyet_36' },
  { name: 'Hữu Thắng', tgId: -124, seed: 'huu_thang_38' },
  { name: 'Kim Ngân', tgId: -125, seed: 'kim_ngan_40' },
  { name: 'Đăng Khoa', tgId: -126, seed: 'dang_khoa_42' },
  { name: 'Bảo Ngọc', tgId: -127, seed: 'bao_ngoc_44' },
  { name: 'Văn Khoa', tgId: -128, seed: 'van_khoa_46' },
  { name: 'Tuyết Nhi', tgId: -129, seed: 'tuyet_nhi_48' },
  { name: 'Gia Bảo', tgId: -130, seed: 'gia_bao_50' },
  { name: 'Thảo Nguyên', tgId: -131, seed: 'thao_nguyen_52' },
  { name: 'Tấn Phát', tgId: -132, seed: 'tan_phat_54' },
  { name: 'Thanh Trúc', tgId: -133, seed: 'thanh_truc_56' },
  { name: 'Hùng Cường', tgId: -134, seed: 'hung_cuong_58' },
  { name: 'Phương Linh', tgId: -135, seed: 'phuong_linh_60' },
  { name: 'Việt Anh', tgId: -136, seed: 'viet_anh_62' },
  { name: 'Khánh An', tgId: -137, seed: 'khanh_an_64' },
  { name: 'Huy Hoàng', tgId: -138, seed: 'huy_hoang_66' },
  { name: 'Trâm Anh', tgId: -139, seed: 'tram_anh_68' },
  { name: 'Trung Hiếu', tgId: -140, seed: 'trung_hieu_70' },
];

const BET_TIERS = [
  0,        // Miễn phí
  0,        // Miễn phí
  1000,     // < 10k
  2000,     // < 10k
  5000,     // < 10k
  10000,    // 10k - 50k
  20000,    // 10k - 50k
  30000,    // 10k - 50k
  50000,    // 10k - 50k
  100000,   // > 50k
  200000,   // > 50k
  500000,   // > 50k
  1000000,  // > 50k
];

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateBotRoomName(profileName: string, betAmount: number): string {
  const titlesForFree = [
    `Phòng của ${profileName}`,
    `Giao lưu 1vs1 vui vẻ`,
    `Solo tập luyện không cược`,
    `Phòng tự do của ${profileName}`,
  ];

  const titlesForSmall = [
    `Solo nhẹ nhàng ${betAmount.toLocaleString()} Xu`,
    `Phòng của ${profileName}`,
    `Vào làm trận ${betAmount.toLocaleString()} Xu`,
    `Giao lưu vui vẻ ${betAmount.toLocaleString()} Xu`,
  ];

  const titlesForMedium = [
    `Thách đấu ${betAmount.toLocaleString()} Xu`,
    `Vào gáy đi bạn ơi (${betAmount.toLocaleString()} Xu)`,
    `Phòng cược ${betAmount.toLocaleString()} Xu uy tín`,
    `Phòng của ${profileName}`,
    `Solo gánh kèo ${betAmount.toLocaleString()} Xu`,
  ];

  const titlesForHigh = [
    `💥 TAY TO VÀO ${(betAmount / 1000).toLocaleString()}K XU`,
    `🔥 THÁCH ĐẤU CAO THỦ ${(betAmount / 1000).toLocaleString()}K`,
    `💎 VIP Arena ${(betAmount / 1000).toLocaleString()}K Xu`,
    `🏆 Đã tay thì vào ${(betAmount / 1000).toLocaleString()}K`,
    `Phòng cược khủng của ${profileName}`,
  ];

  let pool = titlesForSmall;
  if (betAmount === 0) pool = titlesForFree;
  else if (betAmount >= 10000 && betAmount <= 50000) pool = titlesForMedium;
  else if (betAmount > 50000) pool = titlesForHigh;

  return pool[Math.floor(Math.random() * pool.length)];
}

async function inRoomTransaction<T>(work: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize room accounting, including referral ancestors, across processes.
    // Individual wallet operations still lock user rows and remain independent.
    await client.query('SELECT pg_advisory_xact_lock(718204)');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function lockedRoom(client: import('pg').PoolClient, code: string): Promise<Room> {
  const res = await client.query<Room>('SELECT * FROM rooms WHERE room_code = $1 FOR UPDATE', [code.trim()]);
  if (!res.rows.length) throw new Error('Phòng không tồn tại');
  return res.rows[0];
}

function requirePlayer(room: Room, userId: number) {
  if (Number(room.host_id) !== userId && Number(room.guest_id) !== userId) throw new Error('Bạn không phải người chơi trong phòng này');
}

async function fundRound(client: import('pg').PoolClient, room: Room) {
  if (!room.guest_id || room.host_id === room.guest_id) throw new Error('Cần hai người chơi để bắt đầu');
  const players = await client.query<User>('SELECT * FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[room.host_id, room.guest_id]]);
  if (players.rows.length !== 2 || players.rows.some(u => u.is_blocked || u.coins < room.bet_amount)) {
    throw new Error('Một người chơi bị khóa hoặc không đủ Xu cho ván mới');
  }
  const active = await client.query("SELECT id FROM rooms WHERE id <> $1 AND status = 'ready' AND (host_id = ANY($2::int[]) OR guest_id = ANY($2::int[]))", [room.id, [room.host_id, room.guest_id]]);
  if (active.rows.length) throw new Error('Một người chơi đang tham gia ván khác');
  await client.query("UPDATE rooms SET status='expired' WHERE id <> $1 AND status='waiting' AND host_id = ANY($2::int[])", [room.id,[room.host_id,room.guest_id]]);
  const nextRound = room.round_no + 1;
  await client.query("SELECT set_config('app.coin_reason', $1, true)", [`room:${room.id}:round:${nextRound}:escrow`]);
  await client.query('UPDATE users SET coins = coins - $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::int[])', [room.bet_amount, [room.host_id, room.guest_id]]);
  const host = players.rows.find(u => u.id === room.host_id)!;
  const guest = players.rows.find(u => u.id === room.guest_id)!;
  await client.query(`INSERT INTO room_rounds(room_id, round_no, host_id, guest_id, host_is_house, guest_is_house, bet_amount)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`, [room.id, nextRound, room.host_id, room.guest_id, Number(host.telegram_id) < 0 || !!host.is_company_account, Number(guest.telegram_id) < 0 || !!guest.is_company_account, room.bet_amount]);
  await client.query(`UPDATE rooms SET status = 'ready', round_no = $2, escrow_funded = true,
    host_move = NULL, guest_move = NULL, winner_id = NULL, result = NULL, fee_amount = 0,
    host_rematch = false, guest_rematch = false, round_deadline = CURRENT_TIMESTAMP + INTERVAL '20 seconds',
    updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [room.id, nextRound]);
}

export async function ensureVirtualRooms(): Promise<void> {
  await inRoomTransaction(async client => {
    await client.query(`UPDATE rooms SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'waiting' AND ((is_bot_room AND created_at < CURRENT_TIMESTAMP - INTERVAL '3 minutes')
        OR (NOT is_bot_room AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 seconds'))`);
    
    // Always ensure virtual bots (telegram_id < 0) have sufficient coins to host all bet tiers
    await client.query('UPDATE users SET coins = 9999999 WHERE telegram_id < 0 AND coins < 1000000');

    // Fetch existing profiles once; only seed missing users.
    const bots = await client.query<User>('SELECT * FROM users WHERE telegram_id = ANY($1::bigint[])', [VIRTUAL_BOT_PROFILES.map(p => p.tgId)]);
    const byTg = new Map(bots.rows.map(u => [Number(u.telegram_id), u]));
    for (const profile of VIRTUAL_BOT_PROFILES) {
      if (!byTg.has(profile.tgId)) {
        const res = await client.query<User>(`INSERT INTO users(telegram_id, first_name, photo_url, rating, coins, referral_code)
          VALUES ($1,$2,$3,1200,9999999,$4) ON CONFLICT(telegram_id) DO UPDATE SET coins = 9999999 RETURNING *`,
          [profile.tgId, profile.name, `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.seed}`, `REF_BOT_${Math.abs(profile.tgId)}`]);
        byTg.set(profile.tgId, res.rows[0]);
      } else {
        // Ensure bot object in memory has full balance
        const botObj = byTg.get(profile.tgId)!;
        botObj.coins = 9999999;
      }
    }
    const active = await client.query<{host_id:number; status:string}>("SELECT host_id, status FROM rooms WHERE is_bot_room AND status IN ('waiting','ready')");
    const occupied = new Set(active.rows.map(r => r.host_id));
    let needed = 22 - active.rows.filter(r => r.status === 'waiting').length;
    for (const profile of [...VIRTUAL_BOT_PROFILES].sort(() => Math.random() - 0.5)) {
      if (needed <= 0) break;
      const bot = byTg.get(profile.tgId)!;
      if (occupied.has(bot.id) || bot.is_blocked) continue;
      const tiers = BET_TIERS.filter(b => b <= (bot.coins || 9999999));
      const bet = tiers[Math.floor(Math.random() * tiers.length)] || 0;
      const created = await client.query(`INSERT INTO rooms(room_code, host_id, bet_amount, room_name, status, is_bot_room)
        VALUES ($1,$2,$3,$4,'waiting',true) ON CONFLICT(room_code) DO NOTHING RETURNING id`,
        [generateRoomCode(), bot.id, bet, generateBotRoomName(profile.name, bet)]);
      if (created.rows.length) needed--;
    }
  });
}

export async function getWaitingRooms(): Promise<Room[]> {
  const res = await query(`SELECT r.*, (r.password IS NOT NULL AND r.password <> '') AS has_password,
    h.first_name AS host_name, h.photo_url AS host_avatar FROM rooms r JOIN users h ON h.id = r.host_id
    WHERE r.status = 'waiting' AND NOT h.is_blocked ORDER BY r.created_at DESC LIMIT 50`);
  return res.rows.map(r => ({ ...r, password: undefined }));
}

export async function createRoom(hostId: number, betAmount = 0, roomName?: string, password?: string): Promise<Room> {
  if (!Number.isInteger(betAmount) || betAmount < 0 || betAmount > 1000000) throw new Error('Mức cược không hợp lệ');
  const code = await inRoomTransaction(async client => {
    const user = (await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [hostId])).rows[0];
    if (!user || user.is_blocked || user.coins < betAmount) throw new Error('Tài khoản không đủ điều kiện hoặc không đủ Xu');
    const active = await client.query("SELECT id FROM rooms WHERE status = 'ready' AND (host_id = $1 OR guest_id = $1)", [hostId]);
    if (active.rows.length) throw new Error('Vui lòng hoàn thành ván đang chơi');
    await client.query("UPDATE rooms SET status = 'expired' WHERE host_id = $1 AND status = 'waiting'", [hostId]);
    for (let i = 0; i < 20; i++) {
      const code = generateRoomCode();
      const res = await client.query(`INSERT INTO rooms(room_code,host_id,bet_amount,room_name,password,status,is_bot_room)
        VALUES ($1,$2,$3,$4,$5,'waiting',false) ON CONFLICT(room_code) DO NOTHING RETURNING id`,
        [code,hostId,betAmount,roomName?.trim() || `Phòng của ${user.first_name}`,password?.trim() || null]);
      if (res.rows.length) return code;
    }
    throw new Error('Chưa tạo được mã phòng, vui lòng thử lại');
  });
  return getRoomState(hostId, code);
}

export async function joinRoom(guestId: number, roomCode: string, inputPassword?: string): Promise<Room> {
  await inRoomTransaction(async client => {
    const room = await lockedRoom(client, roomCode);
    if (room.status === 'expired' || room.status === 'completed') throw new Error('Phòng đã kết thúc');
    if (room.host_id === guestId || room.guest_id === guestId) return;
    if (room.status !== 'waiting' || room.guest_id) throw new Error('Phòng đã đủ người chơi');
    if (room.password && room.password !== inputPassword?.trim()) throw new Error('Mật khẩu phòng không chính xác');
    room.guest_id = guestId;
    await client.query('UPDATE rooms SET guest_id = $2 WHERE id = $1', [room.id, guestId]);
    await fundRound(client, room);
  });
  return getRoomState(guestId, roomCode);
}

export async function spectateRoom(userId: number, roomCode: string): Promise<Room> {
  return getRoomState(userId, roomCode);
}

export async function getRoomState(userId: number, roomCode: string): Promise<Room> {
  const res = await query(`SELECT r.*, CURRENT_TIMESTAMP AS server_time,
    (r.password IS NOT NULL AND r.password <> '') AS has_password,
    h.first_name AS host_name, h.photo_url AS host_avatar, g.first_name AS guest_name, g.photo_url AS guest_avatar
    FROM rooms r JOIN users h ON h.id = r.host_id LEFT JOIN users g ON g.id = r.guest_id WHERE room_code = $1`, [roomCode.trim()]);
  const room = res.rows[0];
  if (!room) throw new Error('Không tìm thấy phòng đấu');
  const isHost = Number(room.host_id) === userId;
  const isGuest = Number(room.guest_id) === userId;
  if (room.password && !isHost && !isGuest) throw new Error('Phòng có mật khẩu không hỗ trợ xem');
  if (isHost && room.status === 'waiting') {
    await query("UPDATE rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'waiting'", [room.id]);
  }
  // Item 7: retain the existing company-account visibility policy.
  const requester = (await query<User>('SELECT is_company_account FROM users WHERE id = $1', [userId])).rows[0];
  const isCompanyAccount = !!requester?.is_company_account;
  return { ...room, password: undefined,
    host_move: room.status === 'completed' || isHost || isCompanyAccount ? room.host_move : null,
    guest_move: room.status === 'completed' || isGuest || isCompanyAccount ? room.guest_move : null,
    has_host_locked: !!room.host_move, has_guest_locked: !!room.guest_move, is_company_account: isCompanyAccount };
}

async function payCommissions(client: import('pg').PoolClient, playerId: number, bet: number, room: Room) {
  const visited = new Set([playerId]);
  let current = playerId;
  const rates = [0.010, 0.004, 0.003, 0.002, 0.001];
  for (let i = 0; i < rates.length; i++) {
    const parent = (await client.query('SELECT referred_by FROM users WHERE id = $1', [current])).rows[0]?.referred_by;
    if (!parent || visited.has(parent)) break;
    visited.add(parent);
    const amount = Math.floor(bet * rates[i]);
    if (amount > 0) {
      await client.query("SELECT set_config('app.coin_reason', $1, true)", [`room:${room.id}:round:${room.round_no}:referral:${playerId}:${i+1}`]);
      await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [amount, parent]);
      await client.query('INSERT INTO referral_commissions(referrer_id,referred_id,level,amount,room_id,round_no) VALUES ($1,$2,$3,$4,$5,$6)', [parent,playerId,i+1,amount,room.id,room.round_no]);
    }
    current = parent;
  }
}

async function settleRound(client: import('pg').PoolClient, room: Room, hostMove: Move, guestMove: Move) {
  if (room.status !== 'ready' || !room.escrow_funded || !room.guest_id) throw new Error('Ván chưa được giữ tiền');
  const players = (await client.query<User>('SELECT * FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[room.host_id, room.guest_id]])).rows;
  const outcome = determineResult(hostMove, guestMove);
  const fee = outcome === 'draw' ? 0 : Math.floor(room.bet_amount * 0.05);
  const winner = outcome === 'draw' ? null : outcome === 'win' ? room.host_id : room.guest_id;
  const completed = await client.query(`UPDATE room_rounds SET status = 'completed', winner_id = $3, result = $4,
    fee_amount = $5, completed_at = CURRENT_TIMESTAMP WHERE room_id = $1 AND round_no = $2 AND status = 'ready' RETURNING id`,
    [room.id,room.round_no,winner,outcome,fee]);
  if (!completed.rows.length) throw new Error('Ván đã được quyết toán');
  for (const player of players) {
    const isHost = player.id === room.host_id;
    const result = outcome === 'draw' ? 'draw' : player.id === winner ? 'win' : 'lose';
    const ratingChange = result === 'win' ? 12 : result === 'lose' ? -8 : 0;
    const payout = result === 'draw' ? room.bet_amount : result === 'win' ? room.bet_amount * 2 - fee : 0;
    await client.query("SELECT set_config('app.coin_reason', $1, true)", [`room:${room.id}:round:${room.round_no}:settlement`]);
    await client.query(`UPDATE users SET coins = coins + $2, rating = GREATEST(0,rating + $3),
      wins = wins + $4, losses = losses + $5, draws = draws + $6, total_matches = total_matches + 1,
      best_streak = CASE WHEN $4 = 1 THEN GREATEST(best_streak,current_streak+1) ELSE best_streak END,
      current_streak = CASE WHEN $4 = 1 THEN current_streak+1 WHEN $5 = 1 THEN 0 ELSE current_streak END,
      updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [player.id,payout,ratingChange,Number(result==='win'),Number(result==='lose'),Number(result==='draw')]);
    await client.query(`INSERT INTO matches(player_id,opponent_type,player_move,opponent_move,result,rating_before,rating_change,rating_after)
      VALUES ($1,'pvp',$2,$3,$4,$5,$6,$7)`, [player.id,isHost?hostMove:guestMove,isHost?guestMove:hostMove,result,player.rating,ratingChange,Math.max(0,player.rating+ratingChange)]);
    if (outcome !== 'draw' && room.bet_amount > 0 && Number(player.telegram_id) > 0) {
      await client.query(
        `INSERT INTO user_withdrawal_turnover (user_id, required_wager, completed_wager)
         VALUES ($1, 0, 0)
         ON CONFLICT (user_id) DO UPDATE
         SET completed_wager = LEAST(
               user_withdrawal_turnover.required_wager,
               user_withdrawal_turnover.completed_wager + $2
             ),
             updated_at = CURRENT_TIMESTAMP`,
        [player.id, room.bet_amount]
      );
      await payCommissions(client, player.id, room.bet_amount, room);
      await recordWagerAndCheckVipUpgrade(client, player.id, room.bet_amount);
    }
  }
  await client.query(`UPDATE rooms SET host_move=$2,guest_move=$3,status='completed',winner_id=$4,result=$5,
    fee_amount=$6,escrow_funded=false,round_deadline=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [room.id,hostMove,guestMove,winner,outcome,fee]);
}

function losingMove(move: Move): Move { return move === 'rock' ? 'scissors' : move === 'paper' ? 'rock' : 'paper'; }
async function timeoutRound(client: import('pg').PoolClient, room: Room) {
  const host = room.host_move || (room.guest_move ? losingMove(room.guest_move) : 'rock');
  const guest = room.guest_move || (room.host_move ? losingMove(room.host_move) : 'rock');
  await settleRound(client, room, host, guest);
}

export async function resolveRoomTimeout(roomCode: string): Promise<void> {
  await inRoomTransaction(async client => {
    const room = await lockedRoom(client, roomCode);
    if (room.status === 'ready' && room.round_deadline && new Date(room.round_deadline).getTime() <= Date.now()) await timeoutRound(client, room);
  });
}

export async function playRoomMove(userId: number, roomCode: string, move: Move, roundNo: number): Promise<Room> {
  if (!['rock','paper','scissors'].includes(move)) throw new Error('Nước đi không hợp lệ');
  await inRoomTransaction(async client => {
    const room = await lockedRoom(client, roomCode);
    requirePlayer(room, userId);
    if (roundNo !== room.round_no) throw new Error('Ván đã thay đổi, vui lòng tải lại');
    if (room.status === 'completed') return;
    if (room.status !== 'ready' || !room.escrow_funded) throw new Error('Ván chưa sẵn sàng');
    if (room.round_deadline && new Date(room.round_deadline).getTime() <= Date.now()) { await timeoutRound(client, room); return; }
    const blocked = (await client.query('SELECT is_blocked FROM users WHERE id = $1', [userId])).rows[0]?.is_blocked;
    if (blocked) throw new Error('Tài khoản đã bị khóa');
    const isHost = room.host_id === userId;
    const existing = isHost ? room.host_move : room.guest_move;
    if (existing) { if (existing === move) return; throw new Error('Bạn đã khóa nước đi'); }
    let host = isHost ? move : room.host_move;
    const guest = isHost ? room.guest_move : move;
    // Item 7: preserve configured bot win rate and move selection behavior.
    if (room.is_bot_room && !isHost && !host && guest) {
      const { botWinRate } = await readSettings(client);
      host = Math.floor(Math.random()*100) < botWinRate ? losingMove(losingMove(guest)) : losingMove(guest);
    }
    if (host && guest) await settleRound(client, room, host, guest);
    else await client.query('UPDATE rooms SET host_move=$2,guest_move=$3 WHERE id=$1', [room.id,host,guest]);
  });
  return getRoomState(userId, roomCode);
}

export async function resetRoom(userId: number, roomCode: string, roundNo: number): Promise<Room> {
  await inRoomTransaction(async client => {
    const room = await lockedRoom(client, roomCode);
    requirePlayer(room,userId);
    // A repeated consent request must never create a second round.
    if (room.round_no === roundNo + 1 && room.status === 'ready') return;
    if (room.round_no !== roundNo || room.status !== 'completed') throw new Error('Chỉ được chơi lại sau khi ván kết thúc');
    room.host_rematch = !!room.host_rematch || userId === room.host_id || !!room.is_bot_room;
    room.guest_rematch = !!room.guest_rematch || userId === room.guest_id;
    await client.query('UPDATE rooms SET host_rematch=$2,guest_rematch=$3 WHERE id=$1', [room.id,room.host_rematch,room.guest_rematch]);
    if (room.host_rematch && room.guest_rematch) await fundRound(client,room);
  });
  return getRoomState(userId,roomCode);
}

export async function leaveRoom(userId: number, roomCode: string): Promise<void> {
  await inRoomTransaction(async client => {
    const room = await lockedRoom(client,roomCode);
    requirePlayer(room,userId);
    if (room.status === 'ready') throw new Error('Ván đang diễn ra; hãy hoàn thành hoặc chờ hết thời gian');
    if (room.status === 'expired') return;
    await client.query("UPDATE rooms SET status='expired', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [room.id]);
  });
}

export function startRoomMaintenance() {
  let running = false;
  let lastLobbyUpdate = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = await query("SELECT room_code FROM rooms WHERE status='ready' AND round_deadline <= CURRENT_TIMESTAMP LIMIT 100");
      for (const room of due.rows) await resolveRoomTimeout(room.room_code);
      if (Date.now()-lastLobbyUpdate >= 15000) { await ensureVirtualRooms(); lastLobbyUpdate=Date.now(); }
    } catch (error) { console.error('Room maintenance failed', error); }
    finally { running=false; }
  };
  void tick();
  const timer = setInterval(() => void tick(),1000);
  timer.unref();
  return () => clearInterval(timer);
}
