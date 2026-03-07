
import React, { useState, useEffect } from 'react';
import { AdminConfig, Student, Instructor } from '../types';

interface AdminSettingsProps {
  adminConfig: AdminConfig;
  onUpdate: (updates: Partial<AdminConfig>) => void;
  onSync: () => void;
  students: Student[];
  instructors: Instructor[];
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ adminConfig, onUpdate, onSync, students, instructors }) => {
  const [formData, setFormData] = useState({
    name: adminConfig.name,
    loginId: adminConfig.loginId,
    password: adminConfig.passwordHash || '',
    confirmPassword: adminConfig.passwordHash || '',
    location: adminConfig.location,
    wordKingClassroomRecord: adminConfig.wordKingClassroomRecord,
    wordKingClassroomHolder: adminConfig.wordKingClassroomHolder,
    isMaintenanceMode: adminConfig.isMaintenanceMode || false,
    announcement: adminConfig.announcement || '',
    announcementTargetIds: adminConfig.announcementTargetIds || [],
    isAnnouncementActive: adminConfig.isAnnouncementActive || false
  });
  const [isSaved, setIsSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // 外部からの更新（同期など）を反映させるが、ユーザーが入力中の場合は邪魔しない
  useEffect(() => {
    if (!isUserInteracting) {
      setFormData({
        name: adminConfig.name,
        loginId: adminConfig.loginId,
        password: adminConfig.passwordHash || '',
        confirmPassword: adminConfig.passwordHash || '',
        location: adminConfig.location,
        wordKingClassroomRecord: adminConfig.wordKingClassroomRecord,
        wordKingClassroomHolder: adminConfig.wordKingClassroomHolder,
        isMaintenanceMode: adminConfig.isMaintenanceMode || false,
        announcement: adminConfig.announcement || '',
        announcementTargetIds: adminConfig.announcementTargetIds || [],
        isAnnouncementActive: adminConfig.isAnnouncementActive || false
      });
    }
  }, [adminConfig, isUserInteracting]);

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
      isMaintenanceMode: formData.isMaintenanceMode,
      announcement: formData.announcement,
      announcementTargetIds: formData.announcementTargetIds,
      isAnnouncementActive: formData.isAnnouncementActive
    });
    
    setIsSaved(true);
    setIsUserInteracting(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleTarget = (id: string) => {
    setIsUserInteracting(true);
    setFormData(prev => {
      const ids = prev.announcementTargetIds.includes(id)
        ? prev.announcementTargetIds.filter(i => i !== id)
        : [...prev.announcementTargetIds, id];
      return { ...prev, announcementTargetIds: ids };
    });
  };

  const filteredUsers = [...students, ...instructors].filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-800">システム設定</h2>
        <p className="text-slate-500 font-medium">教室全体の情報と管理者アカウントを管理します</p>
      </header>

      {/* お知らせ設定 */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">📢</div>
            <div>
              <h3 className="text-xl font-bold">お知らせ配信</h3>
              <p className="text-indigo-100 text-sm">ダッシュボード上部にメッセージを表示します</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsUserInteracting(true);
              setFormData({ ...formData, isAnnouncementActive: !formData.isAnnouncementActive });
            }}
            className={`w-14 h-8 rounded-full transition-all relative ${formData.isAnnouncementActive ? 'bg-emerald-400' : 'bg-white/20'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isAnnouncementActive ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        <div className={`p-8 md:p-10 space-y-6 transition-all ${!formData.isAnnouncementActive ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">メッセージ内容</label>
            <textarea 
              placeholder="例: 《お知らせ》3月8日9:00~12:00 でアプリのメンテナンスを実施いたします"
              value={formData.announcement}
              onFocus={() => setIsUserInteracting(true)}
              onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all min-h-[100px]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">配信対象の選択</label>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {formData.announcementTargetIds.length} 名選択中
              </span>
            </div>
            
            <input 
              type="text"
              placeholder="名前で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-500"
            />

            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl p-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (formData.announcementTargetIds.length === [...students, ...instructors].length) {
                    setFormData({ ...formData, announcementTargetIds: [] });
                  } else {
                    setFormData({ ...formData, announcementTargetIds: [...students, ...instructors].map(u => u.id) });
                  }
                }}
                className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-between"
              >
                <span>全選択 / 解除</span>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData.announcementTargetIds.length === [...students, ...instructors].length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                  {formData.announcementTargetIds.length === [...students, ...instructors].length && <span className="text-white text-[10px]">✓</span>}
                </div>
              </button>
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleTarget(user.id)}
                  className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${'grade' in user ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {'grade' in user ? '生徒' : '講師'}
                    </span>
                    <span>{user.name}</span>
                  </div>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData.announcementTargetIds.includes(user.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {formData.announcementTargetIds.includes(user.id) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
            <button 
              type="button"
              onClick={onSync}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
            >
              <span>🔄</span> データを最新に更新（同期）
            </button>
            {isSaved && <p className="text-emerald-600 font-bold text-sm animate-fadeIn">✓ 設定を保存しました</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
