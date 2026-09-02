import React from 'react';
import { User } from '../types';
import { Trophy, Plus, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onProfileClick?: () => void;
  onTopupClick?: () => void;
  onAdminClick?: () => void;
}

const ADMIN_TELEGRAM_ID = import.meta.env.VITE_ADMIN_ID || '8780377211';

export const Header: React.FC<HeaderProps> = ({ user, onProfileClick, onTopupClick, onAdminClick }) => {
  if (!user) return null;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Người chơi';
  const avatarUrl = user.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.telegram_id}`;
  const isAdmin = String(user.telegram_id) === String(ADMIN_TELEGRAM_ID);

  return (
    <div className="w-full px-4 pt-4 pb-2">
      <div className="card-glass p-3 flex items-center justify-between border-amber-500/20 shadow-amber-500/5">
        {/* Left: Avatar & Name */}
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-3 cursor-pointer group active:opacity-80 transition-opacity"
        >
          <div className="relative">
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-12 h-12 rounded-full ring-2 ring-amber-400/80 object-cover bg-slate-900"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.telegram_id}`;
              }}
            />
            <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 font-black text-[9px] px-1 shadow ${
              isAdmin ? 'bg-purple-600 text-white' : 'bg-amber-500 text-slate-950'
            }`}>
              {isAdmin ? 'ADMIN' : 'PRO'}
            </div>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white leading-tight truncate max-w-[120px] sm:max-w-[160px]">
              {fullName}
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              @{user.username || `user_${user.telegram_id.toString().slice(-4)}`}
            </p>
          </div>
        </div>

        {/* Right: Coins, Rating & Admin Button */}
        <div className="flex flex-col items-end gap-1">
          {/* Admin Dashboard Badge (Only for Admin User) */}
          {isAdmin && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="px-2.5 py-0.5 rounded-xl bg-purple-600/30 border border-purple-400/60 text-purple-300 hover:text-white font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>QUẢN TRỊ ADMIN</span>
            </button>
          )}

          {/* Coin Balance Badge with Topup + Button */}
          <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-xl text-amber-300 font-extrabold text-xs">
            <span>🪙 {user.coins ? user.coins.toLocaleString() : 0} Xu</span>
            {onTopupClick && (
              <button
                onClick={onTopupClick}
                className="p-0.5 rounded-md bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-transform"
                title="Nạp Xu"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-xl text-amber-400 font-extrabold text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span>{user.rating.toLocaleString()} điểm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
