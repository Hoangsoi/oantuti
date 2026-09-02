import React, { useState, useEffect } from 'react';
import { Room, User } from '../types';
import { api } from '../services/api';
import { triggerHapticImpact, triggerHapticNotification } from '../services/telegram';
import { Swords, RefreshCw, Plus, Bot, Coins, ShieldAlert, Sparkles, ArrowLeft, Lock, Unlock, Eye, KeyRound, X } from 'lucide-react';

interface LobbyPageProps {
  user: User | null;
  onBackHome: () => void;
  onJoinRoom: (room: Room) => void;
  onPlayBot: () => void;
  onCreateRoomModal: () => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  user,
  onBackHome,
  onJoinRoom,
  onPlayBot,
  onCreateRoomModal,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<'all' | 'free' | '5k' | '10k' | '50k'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Room Password Modal State
  const [passwordModalRoom, setPasswordModalRoom] = useState<Room | null>(null);
  const [inputPassword, setInputPassword] = useState<string>('');

  const fetchRooms = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getWaitingRooms();
      setRooms(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải danh sách phòng chờ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinClick = (room: Room) => {
    triggerHapticImpact('medium');
    if (room.has_password && room.host_id !== user?.id) {
      // Open password modal
      setPasswordModalRoom(room);
      setInputPassword('');
      setErrorMsg(null);
    } else {
      executeJoin(room.room_code);
    }
  };

  const executeJoin = async (roomCode: string, pwd?: string) => {
    setJoiningCode(roomCode);
    setErrorMsg(null);
    try {
      const joinedRoom = await api.joinRoom(roomCode, pwd);
      triggerHapticNotification('success');
      setPasswordModalRoom(null);
      onJoinRoom(joinedRoom);
    } catch (err: any) {
      triggerHapticNotification('error');
      setErrorMsg(err.message || 'Không thể tham gia phòng này');
    } finally {
      setJoiningCode(null);
    }
  };

  const handleSpectate = async (roomCode: string) => {
    setJoiningCode(roomCode);
    triggerHapticImpact('medium');
    try {
      const roomState = await api.spectateRoom(roomCode);
      onJoinRoom(roomState);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể vào xem trận đấu');
    } finally {
      setJoiningCode(null);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterTier === 'free') return r.bet_amount === 0;
    if (filterTier === '5k') return r.bet_amount === 5000;
    if (filterTier === '10k') return r.bet_amount === 10000;
    if (filterTier === '50k') return r.bet_amount >= 50000;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1 hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>TRANG CHỦ</span>
        </button>

        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-400 animate-pulse" />
          <h1 className="text-xl font-black text-amber-400 tracking-wide">SẢNH PHÒNG ĐẤU</h1>
        </div>
      </div>

      {/* User Quick Balance Banner */}
      <div className="card-glass p-3 flex items-center justify-between border-amber-500/30 bg-slate-900/90">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span>Số dư của bạn:</span>
          <span className="text-amber-400 font-black text-sm">🪙 {user?.coins ? user.coins.toLocaleString() : 0} Xu</span>
        </div>
        <button
          onClick={fetchRooms}
          className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onPlayBot}
          className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <Bot className="w-4 h-4 text-emerald-200" />
          <span>🤖 CHƠI VỚI BOT MIỄN PHÍ</span>
        </button>

        <button
          onClick={onCreateRoomModal}
          className="py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 text-blue-200" />
          <span>➕ TẠO PHÒNG MỚI</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tier Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(
          [
            { id: 'all', label: 'Tất cả 🌐' },
            { id: 'free', label: 'Miễn phí 🎁' },
            { id: '5k', label: '5k Xu 🪙' },
            { id: '10k', label: '10k Xu 🪙' },
            { id: '50k', label: '50k+ Xu 💎' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTier(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              filterTier === t.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Room List Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
          <span>PHÒNG ĐANG CHỜ ĐỐI THỦ ({filteredRooms.length})</span>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
            Tự động cập nhật 5s
          </span>
        </div>

        {loading && rooms.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-bold">Đang tải danh sách phòng chờ...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="card-glass p-8 text-center space-y-3 border-slate-800">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-2xl border border-amber-500/20">
              🏝️
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-300 uppercase">Chưa có phòng nào ở mức cược này</h3>
              <p className="text-[11px] text-slate-400">Hãy bấm nút "➕ TẠO PHÒNG MỚI" ở trên để làm Chủ Phòng và chờ người chơi khác vào thách đấu!</p>
            </div>
            <button
              onClick={onCreateRoomModal}
              className="px-5 py-2.5 btn-game-primary text-xs font-black rounded-xl inline-block"
            >
              ➕ TẠO PHÒNG NGAY
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRooms.map((room) => {
              const isMyRoom = user && room.host_id === user.id;
              const canAfford = user ? user.coins >= room.bet_amount : false;

              return (
                <div
                  key={room.id}
                  className="card-glass p-3.5 flex flex-col space-y-2 border-slate-700/80 hover:border-amber-500/50 transition-all bg-slate-900/90"
                >
                  {/* Room Name & Password Indicator Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-amber-400 truncate max-w-[200px]">
                      {room.room_name || `Phòng của ${room.host_name || 'Host'}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {room.has_password ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Có khóa</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>Không khóa</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Host Info & Room Code */}
                    <div className="flex items-center gap-3">
                      <img
                        src={room.host_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${room.host_id}`}
                        alt={room.host_name || 'Host'}
                        className="w-11 h-11 rounded-full border-2 border-amber-400/80 object-cover bg-slate-950"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate max-w-[110px]">
                            {room.host_name || 'Chủ phòng'}
                          </span>
                          {isMyRoom && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-600 text-white">
                              BẠN
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <span>Mã: <strong className="text-amber-400">#{room.room_code}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Bet Amount & Action Buttons */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black text-xs flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{room.bet_amount === 0 ? 'Miễn phí' : `${room.bet_amount.toLocaleString()} Xu`}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!room.has_password && !isMyRoom && (
                          <button
                            onClick={() => handleSpectate(room.room_code)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1"
                            title="XEM TRỰC TIẾP"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[10px]">Xem</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleJoinClick(room)}
                          disabled={joiningCode === room.room_code || (!canAfford && !isMyRoom)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1 active:scale-95 transition-all ${
                            isMyRoom
                              ? 'bg-purple-600 hover:bg-purple-500 text-white'
                              : !canAfford
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                          }`}
                        >
                          {joiningCode === room.room_code ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>{isMyRoom ? 'VÀO PHÒNG CỦA BẠN' : !canAfford ? 'THIẾU XU' : '⚔️ ĐẤU NGAY'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Prompt Modal */}
      {passwordModalRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass w-full max-w-xs p-5 space-y-4 border-amber-500/40 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <KeyRound className="w-4 h-4" />
                <span>NHẬP KHÓA PHÒNG</span>
              </div>
              <button
                onClick={() => setPasswordModalRoom(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-300 font-bold">
                Phòng <span className="text-amber-400 font-black">#{passwordModalRoom.room_code}</span> có cài đặt mật khẩu khóa phòng.
              </p>
              <input
                type="password"
                maxLength={20}
                placeholder="Nhập khóa phòng..."
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 text-amber-400 font-black text-center text-sm rounded-xl focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPasswordModalRoom(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
              >
                HỦY
              </button>

              <button
                onClick={() => executeJoin(passwordModalRoom.room_code, inputPassword)}
                disabled={!inputPassword.trim() || joiningCode === passwordModalRoom.room_code}
                className="py-2.5 btn-game-primary text-xs font-black rounded-xl flex items-center justify-center gap-1"
              >
                {joiningCode === passwordModalRoom.room_code ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>VÀO PHÒNG</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
