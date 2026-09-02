import React from 'react';
import { ActivePage } from '../types';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  // Hide Navbar during active gameplay to focus on choices
  const showNavbar = activePage !== 'game';

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col relative shadow-2xl bg-gradient-to-b from-slate-950 via-[#0F172A] to-slate-950">
        <main className="flex-1">{children}</main>
        {showNavbar && <Navbar activePage={activePage} onNavigate={onNavigate} />}
      </div>
    </div>
  );
};
