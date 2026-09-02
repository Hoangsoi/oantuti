import React, { useState, useEffect } from 'react';
import { Match, Move } from '../types';
import { MoveButton } from '../components/MoveButton';
import { Timer, Zap, AlertCircle, Lock } from 'lucide-react';
import { triggerHapticImpact } from '../services/telegram';

interface GamePageProps {
  onPlay: (move: Move) => Promise<Match>;
  onFinishReveal: (match: Match) => void;
  onCancel: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}

const MOVE_EMOJI: Record<Move, { emoji: string; title: string }> = {
  rock: { emoji: '✊', title: 'BÚA' },
  paper: { emoji: '✋', title: 'BAO' },
  scissors: { emoji: '✌️', title: 'KÉO' },
};

const SHUFFLE_EMOJIS = ['✊', '✋', '✌️'];

export const GamePage: React.FC<GamePageProps> = ({
  onPlay,
  onFinishReveal,
  onCancel,
  isLoading,
  errorMessage,
}) => {
  // Phase 1: Selecting (10s timer)
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);

  // Phase 2: Revealing (10s countdown)
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [revealTimeLeft, setRevealTimeLeft] = useState<number>(10);
  const [shuffleIndex, setShuffleIndex] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<Match | null>(null);

  // 1. 10-Second Selection Timer
  useEffect(() => {
    if (selectedMove || isRevealing || isLoading) return;

    if (timeLeft <= 0) {
      // User failed to select move in 10s -> Declare Timeout Loss
      const timeoutLossMatch: Match = {
        id: Date.now(),
        player_id: 0,
        opponent_type: 'bot',
        player_move: 'rock',
        opponent_move: 'paper',
        result: 'lose',
        rating_before: 1200,
        rating_change: -8,
        rating_after: 1192,
        coins_change: -100,
        created_at: new Date().toISOString(),
      };
      onFinishReveal(timeoutLossMatch);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, selectedMove, isRevealing, isLoading]);

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
      // 10s countdown completed! Transition to result page
      if (matchResult) {
        onFinishReveal(matchResult);
      }
      return;
    }

    const timer = setTimeout(() => {
      triggerHapticImpact('light');
      setRevealTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRevealing, revealTimeLeft, matchResult, onFinishReveal]);

  // Handle user selecting a move
  const handleSelectMove = async (move: Move) => {
    if (selectedMove || isRevealing) return;

    setSelectedMove(move);
    setIsRevealing(true);
    setRevealTimeLeft(10);

    try {
      const match = await onPlay(move);
      setMatchResult(match);
    } catch (e) {
      // If API fails, reset state
      setIsRevealing(false);
      setSelectedMove(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto justify-between pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        {!isRevealing ? (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 hover:bg-slate-700"
          >
            ✕ HỦY
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400 font-extrabold text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>ĐÃ ĐÓNG BỎ CHỌN</span>
          </div>
        )}

        {/* Timer Badge (5s selection or 10s reveal) */}
        <div className="flex items-center gap-2 bg-slate-800/90 border border-amber-500/40 px-4 py-2 rounded-2xl shadow-lg">
          <Timer className={`w-5 h-5 ${isRevealing ? 'text-amber-400 animate-spin' : timeLeft <= 2 ? 'text-red-500 animate-ping' : 'text-amber-400'}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {isRevealing ? 'Mở kết quả:' : 'Thời gian:'}
          </span>
          <span className={`text-2xl font-black ${isRevealing ? 'text-amber-400' : timeLeft <= 2 ? 'text-red-500' : 'text-amber-400'}`}>
            {isRevealing ? `${revealTimeLeft}s` : `${timeLeft}s`}
          </span>
        </div>
      </div>

      {/* PHASE 1: SELECTING MOVE (5s) */}
      {!isRevealing ? (
        <>
          <div className="my-auto text-center py-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs mb-3 tracking-widest uppercase">
              ⚔️ TRẬN ĐẤU SOLO VỚI MÁY
            </div>
            <h2 className="text-3xl font-black text-white tracking-wide">CHỌN CỦA BẠN</h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Hãy chọn nước đi chiến thuật trước khi hết giờ!
            </p>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="space-y-4 my-auto">
            <MoveButton
              move="rock"
              onClick={handleSelectMove}
              disabled={isLoading || selectedMove !== null}
              selected={selectedMove === 'rock'}
            />
            <MoveButton
              move="paper"
              onClick={handleSelectMove}
              disabled={isLoading || selectedMove !== null}
              selected={selectedMove === 'paper'}
            />
            <MoveButton
              move="scissors"
              onClick={handleSelectMove}
              disabled={isLoading || selectedMove !== null}
              selected={selectedMove === 'scissors'}
            />
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 text-amber-300 font-extrabold text-sm animate-pulse">
                <Zap className="w-4 h-4 animate-spin" />
                <span>Đang gửi nước đi...</span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* PHASE 2: 10-SECOND COUNTDOWN REVEAL */
        <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 py-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-extrabold text-xs tracking-widest uppercase">
            ⏳ ĐANG CHỜ MỞ KẾT QUẢ
          </div>

          {/* Large 10s Circle Counter */}
          <div className="relative flex items-center justify-center w-36 h-36">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping"></div>
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex flex-col items-center justify-center shadow-2xl shadow-amber-500/40 border-4 border-amber-300">
              <span className="text-5xl font-black text-slate-950">{revealTimeLeft}</span>
              <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">GIÂY</span>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white">ĐANG KHÓA NƯỚC ĐI...</h2>
          <p className="text-xs text-slate-300 font-semibold max-w-xs">
            Cả 2 bên đã chọn xong! Kết quả sẽ được công bố sau <span className="text-amber-400 font-black">{revealTimeLeft} giây</span>
          </p>

          {/* Player Choice vs Opponent Shuffling Mystery Box */}
          <div className="card-glass p-5 w-full border-slate-700/80 my-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              {/* Player Selected Move */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> BẠN (ĐÃ CHỌN)
                </span>
                <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-inner mb-2 animate-bounce">
                  {selectedMove ? MOVE_EMOJI[selectedMove].emoji : '❓'}
                </div>
                <span className="text-sm font-black text-white">
                  {selectedMove ? MOVE_EMOJI[selectedMove].title : ''}
                </span>
              </div>

              {/* Opponent Shuffling Mystery Choice */}
              <div className="flex flex-col items-center border-l border-slate-700/80">
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                  ĐỐI THỦ
                </span>
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center text-4xl shadow-inner mb-2 animate-pulse">
                  {SHUFFLE_EMOJIS[shuffleIndex]}
                </div>
                <span className="text-xs font-bold text-slate-400 italic">Đang giữ bí mật...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
