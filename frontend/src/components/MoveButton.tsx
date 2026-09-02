import React from 'react';
import { Move } from '../types';

import { playSelectSound } from '../services/sound';

interface MoveButtonProps {
  move: Move;
  onClick: (move: Move) => void;
  disabled?: boolean;
  selected?: boolean;
}

const MOVE_CONFIG: Record<Move, { emoji: string; title: string; color: string; hoverColor: string; borderColor: string }> = {
  rock: {
    emoji: '✊',
    title: 'BÚA',
    color: 'from-amber-600 to-red-600',
    hoverColor: 'from-amber-500 to-red-500',
    borderColor: 'border-amber-400/50',
  },
  paper: {
    emoji: '✋',
    title: 'BAO',
    color: 'from-blue-600 to-indigo-600',
    hoverColor: 'from-blue-500 to-indigo-500',
    borderColor: 'border-blue-400/50',
  },
  scissors: {
    emoji: '✌️',
    title: 'KÉO',
    color: 'from-emerald-600 to-teal-600',
    hoverColor: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-400/50',
  },
};

export const MoveButton: React.FC<MoveButtonProps> = ({ move, onClick, disabled = false, selected = false }) => {
  const config = MOVE_CONFIG[move];

  const handleClick = () => {
    playSelectSound();
    onClick(move);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full py-4 px-4 rounded-2xl border-2 ${config.borderColor} bg-gradient-to-r ${
        selected ? 'ring-4 ring-amber-400 scale-105' : ''
      } ${config.color} hover:${config.hoverColor} text-white shadow-xl transition-all duration-150 active:scale-95 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center gap-4">
        <span className="text-4xl filter drop-shadow group-hover:scale-110 transition-transform">
          {config.emoji}
        </span>
        <span className="text-2xl font-black tracking-wider text-shadow">{config.title}</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
        ➔
      </div>
    </button>
  );
};
