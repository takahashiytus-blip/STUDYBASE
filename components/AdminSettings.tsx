
import React, { useState } from 'react';
import { AdminConfig } from '../types';

interface AdminSettingsProps {
  adminConfig: AdminConfig;
  onUpdate: (updates: Partial<AdminConfig>) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ adminConfig, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: adminConfig.name,
    loginId: adminConfig.loginId,
    password: adminConfig.passwordHash,
    confirmPassword: adminConfig.passwordHash,
    location: adminConfig.location,
    wordKingClassroomRecord: adminConfig.wordKingClassroomRecord,
    wordKingClassroomHolder: adminConfig.wordKingClassroomHolder
  });
  const [isSaved, setIsSaved] = useState(false);

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
    <div className="space-y-8 animate-fadeIn max-w-2xl">
      <header>
        <h2 className="text-3xl font-black text-slate-800">設定変更</h2>
        <p className="text-slate-500 font-medium">管理者の表示名およびログイン情報を管理します</p>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white flex items-center gap-6">
          <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">🏢</div>
          <div>
            <h3 className="text-xl font-bold">管理者アカウント設定</h3>
            <p className="text-slate-400 text-sm">システム全体の最高権限アカウントです</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">管理者名 (表示名)</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-slate-800 font-bold transition-all"
                  placeholder="例: 学士館 統括室"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">教室所在地</label>
                <input 
                  type="text" 
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-slate-800 font-bold transition-all"
                  placeholder="例: 埼玉県さいたま市"
                />
              </div>
            </div>

            <div className="space-y-4 p-6 bg-amber-50 rounded-2xl border border-amber-100">
               <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                 <span>👑</span> 英単語王 教室最高記録設定
               </label>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 block mb-1 ml-1">最高スコア</span>
                    <input 
                        type="number" 
                        required
                        value={formData.wordKingClassroomRecord}
                        onChange={(e) => setFormData({ ...formData, wordKingClassroomRecord: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-200 focus:border-amber-500 outline-none text-slate-800 font-black text-xl transition-all"
                      />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 block mb-1 ml-1">記録保持者名</span>
                    <input 
                        type="text" 
                        required
                        value={formData.wordKingClassroomHolder}
                        onChange={(e) => setFormData({ ...formData, wordKingClassroomHolder: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white border-2 border-amber-200 focus:border-amber-500 outline-none text-slate-800 font-bold text-base transition-all"
                      />
                  </div>
               </div>
                <p className="text-[10px] text-amber-500 font-bold mt-2 ml-1">※ 不適切な名前が表示されている場合や、記録のリセット時に使用してください。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ログインID</label>
                <input 
                  type="text" 
                  required
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-slate-800 font-bold transition-all"
                  placeholder="IDを入力"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">新しいパスワード</label>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-slate-800 font-bold transition-all"
                  placeholder="パスワード"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">パスワード（確認）</label>
              <input 
                type="password" 
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-slate-800 font-bold transition-all"
                placeholder="パスワードを再入力"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex flex-col items-center gap-4">
            <button 
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <span>💾</span> 設定を保存する
            </button>
            
            {isSaved && (
              <p className="text-emerald-600 font-bold text-sm animate-fadeIn">✓ 設定が正常に更新されました</p>
            )}
          </div>
        </form>
      </div>

      <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex items-start gap-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-white text-amber-500 flex items-center justify-center text-3xl shrink-0 shadow-sm border border-amber-100">💡</div>
        <div>
          <h4 className="font-black text-slate-800 mb-2 text-lg">セキュリティに関する注意</h4>
          <p className="text-slate-600 leading-relaxed font-medium">
            管理者パスワードを変更した後は、次回ログイン時から新しいパスワードが必要になります。ログインIDとパスワードは忘れないよう、安全に管理してください。
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
