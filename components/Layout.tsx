
import React, { useState, useEffect } from 'react';
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
  isCloudConnected?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, role, userName, onLogout, activeTab, setActiveTab, reports, isCloudConnected }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isPrivileged = role === 'instructor' || role === 'admin';
  const isAdmin = role === 'admin';
  
  const reportsWithAction = reports.filter(r => r.needsAction).length;

  const navItems = isPrivileged
    ? [
        { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
        ...(isAdmin ? [
          { id: 'instructors', label: '講師管理', icon: '👨‍🏫' },
          { id: 'salary', label: '給与計算', icon: '💰' },
          { id: 'timetable', label: '時間割管理', icon: '📅' },
        ] : []),
        { id: 'word-king', label: '英単語王', icon: '👑' },
        { id: 'iq-test', label: '知能診断', icon: '🧠' },
        { id: 'create', label: '報告書作成', icon: '📝' },
        { id: 'interview-management', label: '面談予約・記録', icon: '📅' },
        { id: 'interview', label: '面談資料AI', icon: '🤝' },
        { id: 'mock', label: '模試成績', icon: '🏆' },
        { id: 'messages', label: 'リクエスト', icon: '💬', badge: reportsWithAction },
        { id: 'students', label: '生徒管理', icon: '👥' },
        { id: 'account', label: 'アカウント設定', icon: '👤' },
        ...(isAdmin ? [{ id: 'settings', label: 'システム設定', icon: '⚙️' }] : []),
      ]
    : [
        { id: 'dashboard', label: 'Study Base', icon: '📈' },
        ...(role !== 'parent' ? [
          { id: 'word-king', label: '英単語王', icon: '👑' },
          { id: 'iq-test', label: '知能診断', icon: '🧠' },
        ] : []),
        { id: 'reports', label: '指導報告書', icon: '📄' },
        { id: 'interview-management', label: '面談予約', icon: '📅' },
        { id: 'mock', label: '模試成績', icon: '🏆' },
        { id: 'account', label: 'アカウント設定', icon: '👤' },
      ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setIsMenuOpen(false); 
  };

  // メニュー開閉時に背後のスクロールを制御
  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[#f8fafc] overflow-hidden">
      {/* Mobile Header - Added safe-area padding for notch devices */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0f172a] text-white px-4 flex justify-between items-center shadow-lg z-[70] h-[calc(64px+env(safe-area-inset-top))] border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 flex-1">
          <img src="/studybase-logo.svg" alt="StudyBase Logo" className="w-8 h-8" />
          <h1 className="text-xl font-black tracking-tighter leading-none uppercase">Study Base</h1>
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[71] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar - Added safe-area padding for home indicators */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 w-72 md:w-64 bg-[#0f172a] text-white flex flex-col shrink-0 z-[75] shadow-2xl transition-transform duration-300 ease-in-out pb-[env(safe-area-inset-bottom)]
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 shrink-0 hidden md:flex flex-col items-center justify-center border-b border-white/5 bg-black/20">
          <img src="/studybase-logo.svg" alt="StudyBase Logo" className="w-16 h-16 mb-2" />
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase">Study Base</h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
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
            <div className={`w-10 h-10 shrink-0 rounded-xl ${role === 'admin' ? 'bg-rose-500' : 'bg-slate-700'} flex items-center justify-center font-black shadow-lg text-white text-base border border-white/10 relative`}>
              {userName[0]}
              {isCloudConnected !== undefined && (
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0f172a] ${isCloudConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} title={isCloudConnected ? 'クラウド同期中' : 'ローカルモード'} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate text-white leading-none mb-1">{userName}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{ROLE_LABELS[role]}</p>
                {isCloudConnected && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 rounded font-black uppercase tracking-tighter">Live</span>}
              </div>
            </div>
            {isCloudConnected && (
              <button 
                onClick={() => window.location.reload()} 
                className="ml-auto w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-slate-400"
                title="手動更新"
              >
                🔄
              </button>
            )}
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-xs bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 px-4 py-3 rounded-xl transition-all duration-200 font-bold border border-white/5 active:scale-95"
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main 
        className="flex-1 overflow-y-auto relative bg-[#f8fafc] focus:outline-none scroll-smooth pt-[calc(64px+env(safe-area-inset-top))] md:pt-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-[1200px] mx-auto p-5 md:p-12 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
