
import React, { useState } from 'react';
import { UserRole, Report } from '../types';
import { ROLE_LABELS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userName: string;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  reports: Report[];
}

const Layout: React.FC<LayoutProps> = ({ children, role, userName, onLogout, activeTab, setActiveTab, reports }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isPrivileged = role === 'instructor' || role === 'admin';
  const isAdmin = role === 'admin';
  
  const reportsWithAction = reports.filter(r => r.needsAction).length;

  const navItems = isPrivileged
    ? [
        { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
        ...(isAdmin ? [
          { id: 'instructors', label: '講師管理', icon: '👨‍🏫' },
          { id: 'salary', label: '給与計算', icon: '💰' }
        ] : []),
        { id: 'word-king', label: '英単語王', icon: '👑' },
        { id: 'create', label: '報告書作成', icon: '📝' },
        { id: 'interview', label: '面談資料', icon: '🤝' },
        { id: 'mock', label: '模試成績', icon: '🏆' },
        { id: 'messages', label: 'リクエスト', icon: '💬', badge: reportsWithAction },
        { id: 'students', label: '生徒管理', icon: '👥' },
        ...(isAdmin ? [{ id: 'settings', label: 'システム設定', icon: '⚙️' }] : []),
      ]
    : [
        { id: 'dashboard', label: 'Study Base', icon: '📈' },
        ...(role !== 'parent' ? [{ id: 'word-king', label: '英単語王', icon: '👑' }] : []),
        { id: 'reports', label: '指導報告書', icon: '📄' },
        { id: 'mock', label: '模試成績', icon: '🏆' },
      ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setIsMenuOpen(false); 
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f8fafc] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 bg-[#0f172a] text-white p-4 flex justify-between items-center shadow-lg z-[70] h-16 shrink-0 border-b border-white/5">
        <div className="flex flex-col items-center flex-1">
          <span className="text-[8px] font-bold tracking-[0.2em] text-indigo-300 uppercase leading-none mb-1">受験専門塾</span>
          <h1 className="text-xl font-black tracking-tighter leading-none">学士館</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl active:scale-90 transition-transform absolute right-4"
        >
          {isMenuOpen ? <span className="text-xl">✕</span> : <span className="text-xl">☰</span>}
        </button>
      </div>

      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[51] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 w-72 md:w-64 bg-[#0f172a] text-white flex flex-col shrink-0 z-[55] shadow-2xl transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 shrink-0 hidden md:flex flex-col items-center justify-center border-b border-white/5 bg-black/20">
          <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase mb-1 opacity-80">受験専門塾</span>
          <h1 className="text-3xl font-black tracking-tighter text-white">学士館</h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl opacity-90">{item.icon}</span>
                <span className="font-semibold text-[13px] tracking-tight">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black ring-2 ring-[#0f172a]">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 bg-black/10 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className={`w-10 h-10 shrink-0 rounded-xl ${role === 'admin' ? 'bg-rose-500' : 'bg-slate-700'} flex items-center justify-center font-black shadow-lg text-white text-base border border-white/10`}>
              {userName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate text-white leading-none mb-1">{userName}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-xs bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 px-4 py-3 rounded-xl transition-all duration-200 font-bold border border-white/5"
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#f8fafc]">
        <div className="max-w-[1200px] mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
