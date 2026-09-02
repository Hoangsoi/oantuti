import React, { useState, useEffect } from 'react';
import { Room, Move, User } from '../types';
import { api } from '../services/api';
import { shareTelegramLink, triggerHapticImpact } from '../services/telegram';
import { MoveButton } from '../components/MoveButton';
import { Users, Plus, KeyRound, Copy, Share2, Check, Lock, Coins, ShieldAlert } from 'lucide-react';

interface RoomPageProps {
  currentUser: User | null;
  initialRoom?: Room | null;
  onFinishRoomMatch: (matchResult: any) => void;
  onBackHome: () => void;
  onOpenTopup: () => void;
}

const MOVE_EMOJI: Record<Move, { emoji: string; title: string }> = {
  rock: { emoji: '✊', title: 'BÚA' },
  paper: { emoji: '✋', title: 'BAO' },
  scissors: { emoji: '✌️', title: 'KÉO' },
};

const SHUFFLE_EMOJIS = ['✊', '✋', '✌️'];

export const RoomPage: React.FC<RoomPageProps> = ({ currentUser, initialRoom, onFinishRoomMatch, onBackHome, onOpenTopup }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'lobby'>(initialRoom ? 'lobby' : 'menu');
  const [inputCode, setInputCode] = useState<string>('');
  const [selectedBet, setSelectedBet] = useState<number>(5000);
  const [room, setRoom] = useState<Room | null>(initialRoom || null);

  useEffect(() => {
    if (initialRoom) {
      setRoom(initialRoom);
      setActiveTab('lobby');
    }
  }, [initialRoom]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Selected Move & 10s Reveal Phase
  const [mySelectedMove, setMySelectedMove] = useState<Move | null>(null);
  const [selectionTimeLeft, setSelectionTimeLeft] = useState<number>(10);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [revealTimeLeft, setRevealTimeLeft] = useState<number>(10);
  const [shuffleIndex, setShuffleIndex] = useState<number>(0);

  // 10-Second Move Selection Countdown Timer in Room
  useEffect(() => {
    if (!room || activeTab !== 'lobby' || isRevealing) return;
    const hasGuestJoined = !!(room.host_id && room.guest_id);
    const isHostUser = currentUser && room.host_id === currentUser.id;
    const myMoveLocked = isHostUser ? room.has_host_locked : room.has_guest_locked;

    if (!hasGuestJoined || myMoveLocked) return;

    if (selectionTimeLeft <= 0) {
      // 10s selection timeout expired! Declare Timeout Loss
      const betAmount = room.bet_amount || 0;
      const timeoutLossMatch = {
        id: room.id,
        player_id: currentUser?.id || 0,
        opponent_type: 'pvp',
        player_move: 'rock' as Move,
        opponent_move: 'paper' as Move,
        result: 'lose' as const,
        rating_before: currentUser?.rating || 1200,
        rating_change: -8,
        rating_after: Math.max(0, (currentUser?.rating || 1200) - 8),
        coins_change: -betAmount,
        created_at: new Date().toISOString(),
      };
      onFinishRoomMatch(timeoutLossMatch);
      return;
    }

    const timer = setTimeout(() => {
      setSelectionTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [room, activeTab, isRevealing, selectionTimeLeft, currentUser, onFinishRoomMatch]);

  // 1. Polling Room State every 2 seconds when in room lobby
  useEffect(() => {
    if (!room || activeTab !== 'lobby') return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getRoomState(room.room_code);
        setRoom(updated);

        // Check if both locked and room completed
        if (updated.status === 'completed' && !isRevealing) {
          setIsRevealing(true);
          setRevealTimeLeft(10);
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [room, activeTab, isRevealing]);

  // 2. Opponent Emoji Shuffling Animation during 10s Reveal
  useEffect(() => {
    if (!isRevealing) return;
    const interval = setInterval(() => {
      setShuffleIndex((prev) => (prev + 1) % SHUFFLE_EMOJIS.length);
    }, 200);
    return () => clearInterval(interval);
  }, [isRevealing]);

  // 3. 10-Second Reveal Countdown Timer
  useEffect(() => {
    if (!isRevealing) return;

    if (revealTimeLeft <= 0) {
      if (room && currentUser) {
        const isHostUser = room.host_id === currentUser.id;
        const myMove = isHostUser ? room.host_move : room.guest_move;
        const opponentMove = isHostUser ? room.guest_move : room.host_move;

        let result: 'win' | 'lose' | 'draw' = 'draw';
        if (room.winner_id === currentUser.id) {
          result = 'win';
        } else if (room.winner_id !== null) {
          result = 'lose';
        }

        const betAmount = room.bet_amount || 0;
        const totalPot = betAmount * 2;
        const houseFee = Math.floor(totalPot * 0.05);
        const winnerNetGain = betAmount - houseFee;
        const coinsChange = result === 'win' ? winnerNetGain : result === 'lose' ? -betAmount : 0;

        const simulatedMatch = {
          id: room.id,
          player_id: currentUser.id,
          opponent_type: 'pvp',
          player_move: myMove || 'rock',
          opponent_move: opponentMove || 'scissors',
          result,
          rating_before: currentUser.rating,
          rating_change: result === 'win' ? 12 : result === 'lose' ? -8 : 0,
          rating_after: currentUser.rating + (result === 'win' ? 12 : result === 'lose' ? -8 : 0),
          coins_change: coinsChange,
          created_at: new Date().toISOString(),
        };

        onFinishRoomMatch(simulatedMatch);
      }
      return;
    }

    const timer = setTimeout(() => {
      triggerHapticImpact('light');
      setRevealTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRevealing, revealTimeLeft, room, currentUser, onFinishRoomMatch]);

  const [customRoomName, setCustomRoomName] = useState<string>('');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [joinPasswordInput, setJoinPasswordInput] = useState<string>('');

  // Create New Room
  const handleCreateRoom = async () => {
    triggerHapticImpact('medium');
    setLoading(true);
    setError(null);
    try {
      const created = await api.createRoom(selectedBet, customRoomName, customPassword);
      setRoom(created);
      setActiveTab('lobby');
    } catch (err: any) {
      setError(err.message || 'Không thể tạo phòng');
    } finally {
      setLoading(false);
    }
  };

  // Join Existing Room
  const handleJoinRoom = async (codeToJoin?: string) => {
    const code = codeToJoin || inputCode;
    if (!code || code.trim().length < 4) {
      setError('Vui lòng nhập mã phòng hợp lệ');
      return;
    }

    triggerHapticImpact('medium');
    setLoading(true);
    setError(null);
    try {
      const joined = await api.joinRoom(code, joinPasswordInput);
      setRoom(joined);
      setActiveTab('lobby');
    } catch (err: any) {
      setError(err.message || 'Không thể tham gia phòng này');
    } finally {
      setLoading(false);
    }
  };

  // Lock in Move
  const handleSelectMove = async (move: Move) => {
    if (!room || mySelectedMove || loading) return;
    setMySelectedMove(move);
    setLoading(true);
    try {
      const updated = await api.playRoomMove(room.room_code, move);
      setRoom(updated);

      if (updated.status === 'completed') {
        setIsRevealing(true);
        setRevealTimeLeft(10);
      }
    } catch (err: any) {
      setMySelectedMove(null);
      setError(err.message || 'Không thể khóa nước đi');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareRoom = () => {
    if (!room) return;
    const botName = import.meta.env.VITE_BOT_USERNAME || 'OanTuTiBot';
    const roomLink = `https://t.me/${botName}?startapp=room_${room.room_code}`;
    const betText = room.bet_amount > 0 ? `💰 Mức cược: ${room.bet_amount.toLocaleString()} Xu` : '🆓 Phòng tự do';
    const shareText = `⚔️ VÀO PHÒNG ĐẤU OẲN TÙ TÌ CÙNG TÔI!\n🔑 Mã phòng: ${room.room_code}\n${betText}\n👉 Bấm link để tham gia ngay:`;
    shareTelegramLink(roomLink, shareText);
  };

  // -------------------------------------------------------------
  // RENDER PHASE 1: MENU (Create or Join)
  // -------------------------------------------------------------
  if (activeTab === 'menu') {
    return (
      <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto justify-between pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackHome}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 hover:bg-slate-700"
          >
            ← TRANG CHỦ
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-black text-white">PHÒNG CƯỢC PVP</h1>
          </div>
        </div>

        {/* Center Actions */}
        <div className="my-auto space-y-5 text-center py-4">
          <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black tracking-widest uppercase">
            🪙 THÁCH ĐẤU & CƯỢC XU GAME
          </div>
          <h2 className="text-3xl font-black text-white">PHÒNG ĐẤU CƯỢC</h2>
          
          {/* User Coin Balance Banner */}
          <div className="card-glass p-3 flex items-center justify-between border-amber-500/30 bg-amber-500/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span>Số dư Xu của bạn:</span>
              <span className="text-amber-400 font-black text-sm">🪙 {currentUser?.coins ? currentUser.coins.toLocaleString() : 0} Xu</span>
            </div>
            <button
              onClick={onOpenTopup}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow active:scale-95"
            >
              + NẠP XU
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          {/* Create Room Box & Bet Selector */}
          <div className="card-glass p-5 space-y-4 border-amber-500/30">
            <div className="text-left space-y-2">
              <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                TÊN PHÒNG ĐẤU:
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="Nhập tên phòng (VD: Phòng Thách Đấu Solo)"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 text-white font-bold text-xs rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="text-left space-y-2">
              <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                CHỌN HOẶC NHẬP MỨC CƯỢC PHÒNG (XU):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000, 50000, 100000, 500000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setSelectedBet(amount)}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all border ${
                      selectedBet === amount
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md scale-105'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {amount.toLocaleString()} Xu
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  type="number"
                  min={100}
                  step={100}
                  placeholder="Hoặc nhập tay số Xu cược tùy chọn (VD: 25000)..."
                  value={selectedBet || ''}
                  onChange={(e) => setSelectedBet(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full p-3 bg-slate-950 border border-slate-700 text-amber-400 font-black text-xs rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="text-left space-y-2">
              <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                KHÓA MẬT KHẨU PHÒNG (TÙY CHỌN):
              </label>
              <input
                type="password"
                maxLength={20}
                placeholder="Nhập khóa phòng (Để trống nếu không khóa)"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 text-amber-400 font-black text-xs rounded-xl focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 font-normal">
                💡 Nếu để trống, phòng sẽ hiển thị <strong>"Không khóa"</strong> tại sảnh và cho phép mọi người tham gia hoặc xem trực tiếp.
              </p>
            </div>

            {/* Platform 5% Fee Warning */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 font-semibold text-left flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Nền tảng giữ <strong className="text-amber-400 font-black">5% giá phòng cược</strong> (Ví dụ: Phòng cược 10,000 Xu thu phí 500 Xu, người thắng nhận +9,500 Xu).
              </span>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full py-4 btn-game-primary text-xl shadow-amber-500/30"
            >
              <Plus className="w-6 h-6 mr-2" />
              <span>➕ TẠO PHÒNG MỚI</span>
            </button>
          </div>

          {/* Join Room Box */}
          <div className="card-glass p-5 space-y-3 border-slate-700">
            <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>NHẬP MÃ PHÒNG & MẬT KHẨU (NẾU CÓ):</span>
            </div>

            <div className="space-y-2">
              <input
                type="number"
                placeholder="Mã phòng (VD: 839210)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                maxLength={6}
                className="bg-slate-900 border border-slate-700 text-amber-400 font-black text-lg text-center tracking-widest p-3 rounded-xl w-full focus:outline-none focus:border-amber-400"
              />
              <input
                type="password"
                placeholder="Mật khẩu phòng (Để trống nếu phòng không khóa)"
                value={joinPasswordInput}
                onChange={(e) => setJoinPasswordInput(e.target.value)}
                maxLength={20}
                className="bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs text-center p-3 rounded-xl w-full focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={loading || !inputCode}
                className="w-full py-3 btn-game-secondary text-sm font-black"
              >
                VÀO PHÒNG
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PHASE 2: LOBBY & GAMEPLAY
  // -------------------------------------------------------------
  if (!room || !currentUser) return null;

  const isHost = room.host_id === currentUser.id;
  const hasGuestJoined = !!room.guest_id;
  const myMoveLocked = isHost ? room.has_host_locked : room.has_guest_locked;

  const betAmt = room.bet_amount || 0;
  const houseFee = Math.floor(betAmt * 0.05);
  const winnerNetGain = betAmt - houseFee;

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto justify-between pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('menu')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
        >
          ← RỜI PHÒNG
        </button>

        {/* Room Code Badge */}
        <div className="flex items-center gap-2 bg-slate-800/90 border border-amber-500/40 px-3 py-1.5 rounded-2xl shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Mã Phòng:</span>
          <span className="text-lg font-black text-amber-400 tracking-wider">{room.room_code}</span>
        </div>
      </div>

      {/* 10S REVEAL COUNTDOWN PHASE */}
      {isRevealing ? (
        <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 py-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-extrabold text-xs tracking-widest uppercase">
            ⏳ ĐANG CHỜ MỞ KẾT QUẢ
          </div>

          <div className="relative flex items-center justify-center w-36 h-36">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping"></div>
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex flex-col items-center justify-center shadow-2xl shadow-amber-500/40 border-4 border-amber-300">
              <span className="text-5xl font-black text-slate-950">{revealTimeLeft}</span>
              <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">GIÂY</span>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white">ĐANG KHÓA NƯỚC ĐI...</h2>
          <p className="text-xs text-slate-300 font-semibold max-w-xs">
            Cả 2 đối thủ đã chọn xong! Kết quả sẽ được công bố sau <span className="text-amber-400 font-black">{revealTimeLeft} giây</span>
          </p>

          {/* Both Choices Mystery Box */}
          <div className="card-glass p-5 w-full border-slate-700/80 my-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> BẠN (ĐÃ CHỌN)
                </span>
                <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-inner mb-2 animate-bounce">
                  {mySelectedMove ? MOVE_EMOJI[mySelectedMove].emoji : '❓'}
                </div>
              </div>

              <div className="flex flex-col items-center border-l border-slate-700/80">
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                  ĐỐI THỦ
                </span>
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center text-4xl shadow-inner mb-2 animate-pulse">
                  {SHUFFLE_EMOJIS[shuffleIndex]}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* NORMAL LOBBY / SELECTION PHASE */
        <div className="my-auto space-y-5">
          {/* Room Name & Spectator Info Banner */}
          <div className="card-glass p-3 border-slate-700/80 bg-slate-900/90 flex items-center justify-between text-xs font-extrabold">
            <span className="text-amber-400 font-black truncate max-w-[170px]">
              {room.room_name || 'Phòng Đấu Cược'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1">
                👁️ {room.spectator_count || 0} Người xem
              </span>
              {room.has_password ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                  🔒 Có khóa
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  🔓 Không khóa
                </span>
              )}
            </div>
          </div>

          {/* Room Bet & Payout Info Banner */}
          <div className="card-glass p-3 border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs font-extrabold">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Coins className="w-4 h-4" />
              <span>Mức cược: {betAmt > 0 ? `${betAmt.toLocaleString()} Xu` : 'Tự do'}</span>
            </div>
            {betAmt > 0 && (
              <div className="text-emerald-400">
                Thắng nhận: +{winnerNetGain.toLocaleString()} Xu (Phí 5% giá phòng)
              </div>
            )}
          </div>

          {/* Waiting for Guest Banner */}
          {!hasGuestJoined && (
            <div className="card-glass p-5 text-center space-y-4 border-amber-500/30 bg-slate-900/90">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto animate-pulse">
                ⏳
              </div>
              <h3 className="text-lg font-black text-amber-400">ĐANG CHỜ ĐỐI THỦ VÀO PHÒNG...</h3>
              <p className="text-xs text-slate-300 font-semibold">
                Gửi mã phòng <span className="text-amber-400 font-extrabold text-sm">{room.room_code}</span> cho bạn bè tham gia!
              </p>

              <div className="flex items-center gap-2 justify-center pt-2">
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép mã'}</span>
                </button>

                <button
                  onClick={handleShareRoom}
                  className="px-4 py-2 rounded-xl btn-game-primary text-xs font-black flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>CHIA SẺ LINK</span>
                </button>
              </div>
            </div>
          )}

          {/* Both Players Status Cards */}
          {hasGuestJoined && (
            <div className="card-glass p-4 border-slate-700/80">
              <div className="grid grid-cols-2 gap-4 items-center text-center">
                {/* Host Info */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                    {room.host_id === currentUser.id ? 'BẠN (HOST)' : 'ĐỐI THỦ (HOST)'}
                  </div>
                  <img
                    src={room.host_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${room.host_id}`}
                    alt={room.host_name || 'Host'}
                    className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover bg-slate-900 mb-1"
                  />
                  <span className="text-xs font-extrabold text-white truncate max-w-[100px]">
                    {room.host_name || 'Người chơi 1'}
                  </span>
                  <div className="mt-1">
                    {room.has_host_locked ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Đã chọn ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 animate-pulse">
                        Đang suy nghĩ...
                      </span>
                    )}
                  </div>
                </div>

                {/* Guest Info */}
                <div className="flex flex-col items-center border-l border-slate-700/80">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                    {room.guest_id === currentUser.id ? 'BẠN' : 'ĐỐI THỦ'}
                  </div>
                  <img
                    src={room.guest_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${room.guest_id}`}
                    alt={room.guest_name || 'Guest'}
                    className="w-12 h-12 rounded-full border-2 border-indigo-400 object-cover bg-slate-900 mb-1"
                  />
                  <span className="text-xs font-extrabold text-white truncate max-w-[100px]">
                    {room.guest_name || 'Người chơi 2'}
                  </span>
                  <div className="mt-1">
                    {room.has_guest_locked ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Đã chọn ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 animate-pulse">
                        Đang suy nghĩ...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Move Choices when room is ready */}
          {hasGuestJoined && !myMoveLocked && (
            <div className="space-y-3">
              <div className="card-glass p-3 flex items-center justify-between border-amber-500/40 bg-amber-500/10">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <span className="animate-pulse text-base">⏳</span>
                  <span>Thời gian chọn nước đi:</span>
                </div>
                <span className={`text-xl font-black ${selectionTimeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-amber-400'}`}>
                  {selectionTimeLeft}s
                </span>
              </div>

              <div className="text-center text-xs font-black text-amber-400 uppercase tracking-wider">
                CHỌN NƯỚC ĐI CỦA BẠN:
              </div>
              <MoveButton
                move="rock"
                onClick={handleSelectMove}
                disabled={loading}
              />
              <MoveButton
                move="paper"
                onClick={handleSelectMove}
                disabled={loading}
              />
              <MoveButton
                move="scissors"
                onClick={handleSelectMove}
                disabled={loading}
              />
            </div>
          )}

          {/* My Move Locked Indicator */}
          {hasGuestJoined && myMoveLocked && (
            <div className="card-glass p-6 text-center space-y-3 border-emerald-500/30 bg-emerald-500/5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl mx-auto">
                ✓
              </div>
              <h3 className="text-lg font-black text-emerald-400">BẠN ĐÃ KHÓA NƯỚC ĐI!</h3>
              <p className="text-xs text-slate-300 font-semibold">
                Đang chờ đối thủ chọn xong... Kết quả sẽ tự động mở sau 10s!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
