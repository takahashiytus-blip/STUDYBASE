
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
    wordKingClassroomHolder: adminConfig.wordKingClassroomHolder,
    isMaintenanceMode: adminConfig.isMaintenanceMode || false
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
      wordKingClassroomHolder: adminConfig.wordKingClassroomHolder,
      isMaintenanceMode: adminConfig.isMaintenanceMode || false
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
      wordKingClassroomHolder: formData.wordKingClassroomHolder,
      isMaintenanceMode: formData.isMaintenanceMode
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
        <div className="bg-indigo-950 p-8 text-white flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">🎨</div>
          <div>
            <h3 className="text-xl font-bold">ブランドアセット</h3>
            <p className="text-indigo-300 text-sm">StudyBaseのロゴやアイコンをダウンロードできます</p>
          </div>
        </div>
        <div className="p-8 md:p-10 space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-40 h-40 bg-slate-900 rounded-[2rem] flex items-center justify-center p-4 shadow-inner">
              <img src="/studybase-logo.svg" alt="StudyBase Logo" className="w-full h-full" />
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="text-lg font-black text-slate-800">StudyBase オフィシャルロゴ</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                報告書や掲示物、SNSなどで使用できる公式ロゴデータ（SVG形式）です。拡大しても画質が劣化しません。
              </p>
              <div className="flex flex-wrap gap-3">
                <a 
                  href="/studybase-logo.svg" 
                  download="studybase-logo.svg"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>📥</span> SVG
                </a>
                <button 
                  onClick={() => {
                    const img = new Image();
                    const svgUrl = '/studybase-logo.svg';
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 1024;
                      canvas.height = 1024;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, 0, 0, 1024, 1024);
                        const pngUrl = canvas.toDataURL('image/png');
                        const downloadLink = document.createElement('a');
                        downloadLink.href = pngUrl;
                        downloadLink.download = 'studybase-logo.png';
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                      }
                    };
                    img.src = svgUrl;
                  }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>🖼️</span> PNG
                </button>
                <button 
                  onClick={() => {
                    fetch('/studybase-logo.svg')
                      .then(r => r.text())
                      .then(text => {
                        navigator.clipboard.writeText(text);
                        alert('SVGコードをクリップボードにコピーしました');
                      });
                  }}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all active:scale-95"
                >
                  コードをコピー
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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

            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 space-y-4">
               <div className="flex items-center justify-between">
                 <div className="space-y-1">
                   <label className="block text-xs font-black text-red-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <span>🛠️</span> メンテナンスモード
                   </label>
                   <p className="text-[10px] font-bold text-red-400 ml-1">有効にすると、管理者以外のログインが制限されます</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setFormData({ ...formData, isMaintenanceMode: !formData.isMaintenanceMode })}
                   className={`w-14 h-8 rounded-full transition-all relative ${formData.isMaintenanceMode ? 'bg-red-600' : 'bg-slate-200'}`}
                 >
                   <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isMaintenanceMode ? 'left-7' : 'left-1'}`} />
                 </button>
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
