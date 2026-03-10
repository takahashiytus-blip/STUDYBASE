
import React, { useState } from 'react';
import { Student, UserRole } from '../types';

interface StudentSettingsProps {
  student: Student;
  role: UserRole;
  onUpdate: (id: string, updates: Partial<Student>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const StudentSettings: React.FC<StudentSettingsProps> = ({ student, role, onUpdate, showToast }) => {
  const [newPassword, setNewPassword] = useState('');
  const [newTargetSchool, setNewTargetSchool] = useState(student.targetSchool || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const updates: Partial<Student> = {};
      
      if (role === 'parent') {
        if (newPassword) updates.parentPassword = newPassword;
      } else {
        if (newPassword) updates.password = newPassword;
        if (newTargetSchool !== student.targetSchool) updates.targetSchool = newTargetSchool;
      }

      if (Object.keys(updates).length === 0) {
        showToast('変更内容がありません');
        return;
      }

      await onUpdate(student.id, updates);
      showToast('設定を更新しました');
      setNewPassword('');
    } catch (err) {
      showToast('更新に失敗しました', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const inputStyle = "w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all text-slate-700";

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-10 text-white">
          <h2 className="text-3xl font-black tracking-tighter italic">SETTINGS</h2>
          <p className="text-indigo-100 font-bold mt-2 opacity-80 uppercase tracking-widest text-xs">アカウント設定</p>
        </div>
        
        <form onSubmit={handleUpdate} className="p-10 space-y-8">
          <div className="space-y-6">
            {role === 'student' && (
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">志望校</label>
                <input 
                  type="text" 
                  value={newTargetSchool} 
                  onChange={e => setNewTargetSchool(e.target.value)}
                  placeholder="志望校を入力"
                  className={inputStyle}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">
                {role === 'parent' ? '保護者用パスワード変更' : '生徒用パスワード変更'}
              </label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)}
                placeholder="新しいパスワードを入力 (空欄で変更なし)"
                className={inputStyle}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isUpdating}
            className={`w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUpdating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>更新中...</span>
              </>
            ) : (
              <span>設定を保存する</span>
            )}
          </button>
        </form>
      </div>

      <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-8">
        <div className="flex gap-4">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-black text-amber-900 mb-1">パスワードについて</h4>
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              {role === 'parent' 
                ? 'ここで設定したパスワードは保護者専用です。生徒用パスワードとは別に管理されます。' 
                : 'ここで設定したパスワードは生徒専用です。保護者用パスワードは保護者ページから変更できます。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSettings;
