
import React, { useState, useEffect } from 'react';
import { UserRole, Student, Instructor, AdminConfig } from '../types';

interface AccountSettingsProps {
  currentUser: { id: string; name: string; role: UserRole };
  students: Student[];
  instructors: Instructor[];
  adminConfig: AdminConfig;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onUpdateInstructor: (id: string, updates: Partial<Instructor>) => void;
  onUpdateAdminConfig: (updates: Partial<AdminConfig>) => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  currentUser,
  students,
  instructors,
  adminConfig,
  onUpdateStudent,
  onUpdateInstructor,
  onUpdateAdminConfig
}) => {
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    confirmPassword: ''
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentUser.role === 'admin') {
      setFormData(prev => ({ ...prev, loginId: adminConfig.loginId || '', password: adminConfig.passwordHash || '', confirmPassword: adminConfig.passwordHash || '' }));
    } else if (currentUser.role === 'instructor') {
      const instructor = instructors.find(i => i.id === currentUser.id);
      if (instructor) {
        setFormData(prev => ({ ...prev, loginId: instructor.loginId || '', password: instructor.password || '', confirmPassword: instructor.password || '' }));
      }
    } else {
      const student = students.find(s => s.id === currentUser.id);
      if (student) {
        setFormData(prev => ({ ...prev, loginId: student.loginId || '', password: student.password || '', confirmPassword: student.password || '' }));
      }
    }
  }, [currentUser, students, instructors, adminConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('パスワードが一致しません。');
      return;
    }

    if (currentUser.role === 'admin') {
      onUpdateAdminConfig({
        loginId: formData.loginId,
        passwordHash: formData.password
      });
    } else if (currentUser.role === 'instructor') {
      onUpdateInstructor(currentUser.id, {
        loginId: formData.loginId,
        password: formData.password
      });
    } else {
      onUpdateStudent(currentUser.id, {
        loginId: formData.loginId,
        password: formData.password
      });
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">アカウント設定</h2>
        <p className="text-slate-500 font-medium">自身のログインIDとパスワードを変更できます</p>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">👤</div>
          <div>
            <h3 className="text-xl font-bold">{currentUser.name} 様</h3>
            <p className="text-indigo-100 text-sm uppercase tracking-widest font-black">{currentUser.role}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ログインID</label>
              <input 
                type="text" required
                value={formData.loginId}
                onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">新しいパスワード</label>
                <input 
                  type="password" required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">パスワード（確認）</label>
                <input 
                  type="password" required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                />
              </div>
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

export default AccountSettings;
