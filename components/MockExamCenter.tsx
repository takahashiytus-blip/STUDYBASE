
import React, { useState, useEffect } from 'react';
import { Student, MockExam, UserRole, SubjectData } from '../types';
import { getLocalISOString, generateUniqueId } from '../utils';

interface MockExamCenterProps {
  students: Student[];
  mockExams: MockExam[];
  role: UserRole;
  currentUserId: string;
  onSave: (exam: MockExam) => void;
  onUpdate?: (exam: MockExam) => void;
  onDelete?: (id: string) => void;
}

export const MockExamCenter: React.FC<MockExamCenterProps> = ({ 
  students, mockExams, role, currentUserId, onSave, onUpdate, onDelete 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const isPrivileged = role === 'instructor' || role === 'admin';
  const filteredMocks = role === 'student' ? mockExams.filter(m => m.studentId === currentUserId) : mockExams;

  const [formData, setFormData] = useState({
    studentId: role === 'student' ? currentUserId : '',
    examName: '',
    examDate: getLocalISOString(),
    scores: { '数学': { score: 0 }, '英語': { score: 0 }, '国語': { score: 0 } }
  });

  const inputStyle = "w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: generateUniqueId('mock') } as MockExam);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">模試成績管理</h2>
          <p className="text-slate-500 font-medium">志望校判定と学力の推移を記録します</p>
        </div>
        {isPrivileged && (
          <button onClick={() => setShowAddModal(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl">成績を登録</button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMocks.map(exam => (
          <div key={exam.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.examDate}</p>
                <h3 className="text-xl font-black text-slate-800">{exam.examName}</h3>
              </div>
              {isPrivileged && (
                <button onClick={() => onDelete?.(exam.id)} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              )}
            </div>
            <div className="space-y-4">
               {/* Fix: Explicitly cast data to SubjectData to resolve property 'score' not existing on type 'unknown' during Object.entries mapping */}
               {Object.entries(exam.scores).map(([subject, data]) => {
                 const subjectData = data as SubjectData;
                 return (
                   <div key={subject} className="flex justify-between items-center">
                     <span className="font-bold text-slate-500">{subject}</span>
                     <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-slate-800">{subjectData.score}</span>
                       <span className="text-[10px] font-black text-slate-300">点</span>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black mb-8">模試成績登録</h3>
            <form onSubmit={handleSave} className="space-y-5">
              {role !== 'student' && (
                <select required className={inputStyle} value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})}>
                  <option value="">生徒を選択</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <input required placeholder="模試名称 (例: 第1回 北辰テスト)" className={inputStyle} value={formData.examName} onChange={e => setFormData({...formData, examName: e.target.value})} />
              <input type="date" className={inputStyle} value={formData.examDate} onChange={e => setFormData({...formData, examDate: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                 {['数学', '英語', '国語'].map(sub => (
                   <div key={sub}>
                     <label className="text-[10px] font-black text-slate-400 ml-1">{sub}</label>
                     <input type="number" className={inputStyle} placeholder="点数" onChange={e => setFormData({
                       ...formData, scores: { ...formData.scores, [sub]: { score: Number(e.target.value) } }
                     })} />
                   </div>
                 ))}
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 font-bold text-slate-400">キャンセル</button>
                <button type="submit" className="flex-2 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
