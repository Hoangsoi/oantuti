import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { triggerHapticImpact, triggerHapticNotification } from '../services/telegram';
import { X } from 'lucide-react';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const TopupModal: React.FC<TopupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTopup = async (amount: number) => {
    setLoading(true);
    setError(null);
    triggerHapticImpact('medium');
    try {
      const updated = await api.topupCoins(amount);
      triggerHapticNotification('success');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Không thể nạp Xu Game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="card-glass w-full max-w-sm p-6 text-center space-y-4 border-amber-500/40 relative bg-slate-900/95 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto shadow-lg">
          🪙
        </div>

        <div>
          <h2 className="text-xl font-black text-white">NẠP XU GAME (MIỄN PHÍ)</h2>
          <p className="text-xs text-slate-300 font-semibold mt-1">
            Chọn gói Xu Game để nạp ngay và bắt đầu tạo phòng cược!
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={() => handleTopup(1000)}
            disabled={loading}
            className="w-full p-3.5 card-glass hover:bg-slate-800 flex items-center justify-between border-amber-500/30 group active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🪙</span>
              <div className="text-left">
                <div className="text-sm font-black text-amber-400">+1,000 XU GAME</div>
                <div className="text-[10px] text-slate-400 font-semibold">Tặng thêm khi trải nghiệm</div>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
              MIỄN PHÍ
            </div>
          </button>

          <button
            onClick={() => handleTopup(5000)}
            disabled={loading}
            className="w-full p-3.5 card-glass hover:bg-slate-800 flex items-center justify-between border-amber-500/30 group active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div className="text-left">
                <div className="text-sm font-black text-amber-400">+5,000 XU GAME</div>
                <div className="text-[10px] text-slate-400 font-semibold">Gói đại gia phòng cược</div>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
              MIỄN PHÍ
            </div>
          </button>

          <button
            onClick={() => handleTopup(10000)}
            disabled={loading}
            className="w-full p-3.5 card-glass hover:bg-slate-800 flex items-center justify-between border-amber-500/30 group active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <div className="text-left">
                <div className="text-sm font-black text-amber-400">+10,000 XU GAME</div>
                <div className="text-[10px] text-slate-400 font-semibold">Gói thần tài Oẳn Tù Tì</div>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
              MIỄN PHÍ
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
