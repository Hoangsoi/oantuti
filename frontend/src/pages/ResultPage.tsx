import React from 'react';
import { Match, Move } from '../types';
import { Confetti } from '../components/Confetti';
import { RotateCcw, Home, Trophy } from 'lucide-react';

interface ResultPageProps {
  match: Match | null;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

const MOVE_EMOJI: Record<Move, { emoji: string; title: string }> = {
  rock: { emoji: '✊', title: 'BÚA' },
  paper: { emoji: '✋', title: 'BAO' },
  scissors: { emoji: '✌️', title: 'KÉO' },
};

export const ResultPage: React.FC<ResultPageProps> = ({ match, onPlayAgain, onGoHome }) => {
  if (!match) {
    return (
      <div className="flex flex-col min-h-screen px-4 py-12 max-w-md mx-auto items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl border border-amber-500/30">
          🏆
        </div>
        <h1 className="text-xl font-black text-amber-400">TRẬN ĐẤU ĐÃ KẾT THÚC</h1>
        <p className="text-xs text-slate-300 font-semibold">Cảm ơn bạn đã tham gia trận đấu!</p>
        <button
          onClick={onGoHome}
          className="px-6 py-3.5 btn-game-primary text-xs font-black rounded-xl"
        >
          🏠 QUAY LẠI TRANG CHỦ
        </button>
      </div>
    );
  }

  const isWin = match.result === 'win';
  const isLose = match.result === 'lose';
  const isDraw = match.result === 'draw';

  const playerMoveInfo = MOVE_EMOJI[match.player_move];
  const opponentMoveInfo = MOVE_EMOJI[match.opponent_move];

  return (
    <div className="flex flex-col min-h-screen px-4 py-8 max-w-md mx-auto justify-between pb-24 text-center">
      {isWin && <Confetti />}

      {/* Result Status Title Header */}
      <div className="my-auto">
        {isWin && (
          <div className="animate-bounce">
            <span className="text-6xl">🎉</span>
            <h1 className="text-4xl font-black text-emerald-400 tracking-wider mt-2 text-shadow">
              BẠN THẮNG!
            </h1>
            <p className="text-xs text-emerald-300 font-bold mt-1">Chiến thuật tuyệt vời!</p>
          </div>
        )}

        {isLose && (
          <div className="animate-shake">
            <span className="text-6xl">😢</span>
            <h1 className="text-4xl font-black text-red-500 tracking-wider mt-2 text-shadow">
              BẠN THUA!
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Đừng nản lòng, hãy thử lại nhé!</p>
          </div>
        )}

        {isDraw && (
          <div>
            <span className="text-6xl">🤝</span>
            <h1 className="text-4xl font-black text-blue-400 tracking-wider mt-2 text-shadow">
              HÒA!
            </h1>
            <p className="text-xs text-blue-300 font-bold mt-1">Trận đấu cực kỳ cân sức!</p>
          </div>
        )}
      </div>

      {/* VS Comparison Card */}
      <div className="card-glass p-6 my-6 border-slate-700/80">
        <div className="grid grid-cols-2 gap-4 items-center">
          {/* Player Choice */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">BẠN</span>
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-inner mb-2">
              {playerMoveInfo.emoji}
            </div>
            <span className="text-sm font-extrabold text-amber-400">{playerMoveInfo.title}</span>
          </div>

          {/* Opponent Choice */}
          <div className="flex flex-col items-center border-l border-slate-700/80">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ĐỐI THỦ</span>
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-inner mb-2">
              {opponentMoveInfo.emoji}
            </div>
            <span className="text-sm font-extrabold text-indigo-400">{opponentMoveInfo.title}</span>
          </div>
        </div>

        {/* Rating & Coins Change Display */}
        <div className="mt-6 pt-4 border-t border-slate-700/80 space-y-2">
          {match.coins_change !== undefined && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-bold text-slate-300">Biến động Xu:</span>
              <span
                className={`text-2xl font-black ${
                  match.coins_change > 0
                    ? 'text-emerald-400'
                    : match.coins_change < 0
                    ? 'text-red-400'
                    : 'text-amber-400'
                }`}
              >
                {match.coins_change > 0
                  ? `+${match.coins_change.toLocaleString()} Xu`
                  : match.coins_change < 0
                  ? `${match.coins_change.toLocaleString()} Xu`
                  : '0 Xu (Hoàn cược)'}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-400">Điểm số:</span>
            <span
              className={`text-base font-black ${
                match.rating_change > 0
                  ? 'text-emerald-400'
                  : match.rating_change < 0
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              {match.rating_change > 0 ? `+${match.rating_change}` : match.rating_change} điểm
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 my-auto w-full">
        <button onClick={onPlayAgain} className="w-full py-4 btn-game-primary text-xl">
          <RotateCcw className="w-6 h-6 mr-2" />
          <span>🔄 ĐẤU LẠI</span>
        </button>

        <button onClick={onGoHome} className="w-full py-3.5 btn-game-secondary text-base">
          <Home className="w-5 h-5 mr-2" />
          <span>🏠 VỀ TRANG CHỦ</span>
        </button>
      </div>
    </div>
  );
};
