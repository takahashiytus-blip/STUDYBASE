
import React, { useState, useEffect } from 'react';
import { AdminConfig } from '../types';

interface AdminSettingsProps {
  adminConfig: AdminConfig;
  onUpdate: (updates: Partial<AdminConfig>) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ adminConfig, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: adminConfig.name,
    loginId: adminConfig.loginId,
    password: adminConfig.passwordHash || '',
    confirmPassword: adminConfig.passwordHash || '',
    location: adminConfig.location,
    wordKingClassroomRecord: adminConfig.wordKingClassroomRecord,
    wordKingClassroomHolder: adminConfig.wordKingClassroomHolder
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setFormData({
      name: adminConfig.name,
      loginId: adminConfig.loginId,
      password: adminConfig.passwordHash || '',
      confirmPassword: adminConfig.passwordHash || '',
      location: adminConfig.location,
      wordKingClassroomRecord: adminConfig.wordKingClassroomRecord,
      wordKingClassroomHolder: adminConfig.wordKingClassroomHolder
    });
  }, [adminConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('パスワードが一致しません。');
      return;
    }

    onUpdate({
      name: formData.name,
      loginId: formData.loginId,
      passwordHash: formData.password,
      location: formData.location,
      wordKingClassroomRecord: Number(formData.wordKingClassroomRecord),
      wordKingClassroomHolder: formData.wordKingClassroomHolder
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-800">システム設定</h2>
        <p className="text-slate-500 font-medium">教室全体の情報と管理者アカウントを管理します</p>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">🏢</div>
          <div>
            <h3 className="text-xl font-bold">管理者設定</h3>
            <p className="text-slate-400 text-sm">システム全体の最高権限アカウント</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">管理者表示名</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">教室所在地</label>
                <input 
                  type="text" required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                />
              </div>
            </div>

            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
               <label className="block text-xs font-black text-amber-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                 <span>👑</span> 英単語王 教室最高記録
               </label>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 block mb-1">記録スコア</span>
                    <input 
                        type="number" required
                        value={formData.wordKingClassroomRecord}
                        onChange={(e) => setFormData({ ...formData, wordKingClassroomRecord: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-200 font-black text-xl"
                      />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 block mb-1">記録保持者</span>
                    <input 
                        type="text" required
                        value={formData.wordKingClassroomHolder}
                        onChange={(e) => setFormData({ ...formData, wordKingClassroomHolder: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-200 font-bold"
                      />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ログインID</label>
                <input 
                  type="text" required
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</label>
                <input 
                  type="password" required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">パスワード（確認）</label>
              <input 
                type="password" required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex flex-col items-center gap-4">
            <button 
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <span>💾</span> 変更を保存する
            </button>
            {isSaved && <p className="text-emerald-600 font-bold text-sm animate-fadeIn">✓ 設定を保存しました</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
