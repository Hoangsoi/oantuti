import React from 'react';
import { ActivePage } from '../types';
import { Trophy, User, Gift, Users, Home, Wallet } from 'lucide-react';

import { playClickSound } from '../services/sound';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate }) => {
  const navItems: { page: ActivePage; label: string; icon: React.ReactNode }[] = [
    { page: 'home', label: 'Trang chủ', icon: <Home className="w-5 h-5" /> },
    { page: 'wallet', label: 'Ví & Nạp', icon: <Wallet className="w-5 h-5" /> },
    { page: 'leaderboard', label: 'Xếp hạng', icon: <Trophy className="w-5 h-5" /> },
    { page: 'rewards', label: 'Thưởng', icon: <Gift className="w-5 h-5" /> },
    { page: 'referral', label: 'Mời bạn', icon: <Users className="w-5 h-5" /> },
    { page: 'profile', label: 'Hồ sơ', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 px-2 pb-3 pt-1">
      <nav className="card-glass border-slate-700/90 py-2 px-1 flex items-center justify-around shadow-2xl bg-slate-900/95 backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          const handleTabClick = () => {
            playClickSound();
            onNavigate(item.page);
          };

          return (
            <button
              key={item.page}
              onClick={handleTabClick}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-amber-400 bg-amber-500/10 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className={isActive ? 'animate-bounce-short' : ''}>{item.icon}</div>
              <span className="text-[10px] font-bold mt-1 tracking-tighter">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
