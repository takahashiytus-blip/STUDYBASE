
import React, { useState, useMemo, useEffect } from 'react';
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

// 科目マスター定義（国語 数学 社会 理科 英語）
const JHS_SUBJECTS = ['国語', '数学', '社会', '理科', '英語'];
const HS_SUBJECTS_MASTER = [
  '英語R', '英語L', '数学IA', '数学IIBC', '数学III', 
  '国語(現)', '国語(古漢)', '物理', '化学', '生物', '地学', 
  '世界史', '日本史', '地理', '倫政', '情報I', '小論文'
];

export const MockExamCenter: React.FC<MockExamCenterProps> = ({ 
  students, mockExams, role, currentUserId, onSave, onDelete 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const isPrivileged = role === 'instructor' || role === 'admin';
  const filteredMocks = role === 'student' ? mockExams.filter(m => m.studentId === currentUserId) : mockExams;

  const [formData, setFormData] = useState<{
    studentId: string;
    examName: string;
    examDate: string;
    scores: Record<string, number>;
  }>({
    studentId: role === 'student' ? currentUserId : '',
    examName: '',
    examDate: getLocalISOString(),
    scores: {}
  });

  // モーダル表示時に状態を強制初期化する（同期不具合の防止）
  useEffect(() => {
    if (showAddModal) {
      const initialSid = role === 'student' ? currentUserId : '';
      const student = students.find(s => s.id === initialSid);
      const isHS = student?.grade.includes('高校');
      const initialScores: Record<string, number> = {};
      
      if (student && !isHS) {
        JHS_SUBJECTS.forEach(sub => initialScores[sub] = 0);
      }

      setFormData({
        studentId: initialSid,
        examName: '',
        examDate: getLocalISOString(),
        scores: initialScores
      });
    }
  }, [showAddModal, role, currentUserId, students]);

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === formData.studentId), 
  [formData.studentId, students]);

  const isHighSchool = selectedStudent?.grade.includes('高校');

  // 生徒選択時に科目を「確実に」同期
  const handleStudentChange = (sid: string) => {
    const student = students.find(s => s.id === sid);
    const isHS = student?.grade.includes('高校');
    const initialScores: Record<string, number> = {};
    
    if (student && !isHS) {
      JHS_SUBJECTS.forEach(sub => initialScores[sub] = 0);
    }
    
    setFormData(prev => ({
      ...prev,
      studentId: sid,
      scores: initialScores
    }));
  };

  const handleScoreChange = (subject: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [subject]: Number(val) }
    }));
  };

  const addHSSubject = (subject: string) => {
    if (formData.scores[subject] !== undefined) return;
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [subject]: 0 }
    }));
  };

  const removeSubject = (subject: string) => {
    const newScores = { ...formData.scores };
    delete newScores[subject];
    setFormData(prev => ({ ...prev, scores: newScores }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) return alert("生徒を選択してください。");
    if (Object.keys(formData.scores).length === 0) return alert("スコアを入力してください。");

    const formattedScores: Record<string, SubjectData> = {};
    Object.entries(formData.scores).forEach(([sub, score]) => {
      formattedScores[sub] = { score: score as number };
    });

    onSave({
      id: generateUniqueId('mock'),
      studentId: formData.studentId,
      examName: formData.examName,
      examDate: formData.examDate,
      scores: formattedScores
    });
    setShowAddModal(false);
    // 保存後にフォームをクリア（次回の不整合を防止）
    setFormData({
      studentId: role === 'student' ? currentUserId : '',
      examName: '',
      examDate: getLocalISOString(),
      scores: {}
    });
  };

  const inputStyle = "w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold shadow-sm transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">模試成績データベース</h2>
          <p className="text-slate-500 font-medium">志望校判定と学力推移をデジタル管理します</p>
        </div>
        {isPrivileged && (
          <button onClick={() => setShowAddModal(true)} className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <span className="text-lg">＋</span> 成績データを登録
          </button>
        )}
      </header>

      {filteredMocks.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-300 shadow-sm">
           <span className="text-7xl block mb-6 grayscale opacity-20">📊</span>
           <p className="text-xl font-bold text-slate-400">登録されている模試成績はありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMocks.map(exam => (
            <div key={exam.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg relative group overflow-hidden hover:border-indigo-400 hover:shadow-indigo-100/50 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{exam.examDate.replace(/-/g, '.')}</p>
                  <h3 className="text-xl font-black text-slate-800 leading-tight">{exam.examName}</h3>
                  {isPrivileged && (
                    <p className="text-[10px] font-bold text-slate-400 mt-1.5 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
                      {students.find(s => s.id === exam.studentId)?.name} さん
                    </p>
                  )}
                </div>
                {isPrivileged && (
                  <button onClick={() => onDelete?.(exam.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm">✕</button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-auto">
                 {Object.entries(exam.scores).map(([subject, data]) => (
                   <div key={subject} className="flex flex-col p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{subject}</span>
                     <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-black text-slate-800">{(data as SubjectData).score}</span>
                       <span className="text-[8px] font-bold text-slate-400">pts</span>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-white/20 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 md:p-10 text-white flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-2xl font-black tracking-tight uppercase">成績データ入力</h3>
                 <p className="text-indigo-100 text-xs mt-1 font-bold">正確な数値を入力してください</p>
               </div>
               <button onClick={() => setShowAddModal(false)} className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-rose-500 flex items-center justify-center transition-all">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 md:p-10 space-y-8 overflow-y-auto focus:outline-none custom-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {role !== 'student' && (
                  <div className="col-span-full space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">対象生徒</label>
                    <select required className={inputStyle} value={formData.studentId} onChange={e => handleStudentChange(e.target.value)}>
                      <option value="">生徒を選択</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">模試名称</label>
                  <input required placeholder="例: 全県模試 第3回" className={inputStyle} value={formData.examName} onChange={e => setFormData(prev => ({...prev, examName: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">実施日</label>
                  <input type="date" className={inputStyle} value={formData.examDate} onChange={e => setFormData(prev => ({...prev, examDate: e.target.value}))} />
                </div>
              </div>
              
              <div className="space-y-6 pt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-indigo-600 uppercase tracking-widest ml-1">科目別スコア入力</label>
                    {isHighSchool && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">高校生モード: 科目追加可能</span>
                    )}
                 </div>

                 {isHighSchool && (
                   <div className="flex flex-wrap gap-2 mb-6">
                     {HS_SUBJECTS_MASTER.map(sub => (
                       <button 
                         key={sub} 
                         type="button"
                         onClick={() => addHSSubject(sub)}
                         disabled={formData.scores[sub] !== undefined}
                         className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border-2 ${
                           formData.scores[sub] !== undefined 
                           ? 'bg-slate-50 border-slate-100 text-slate-300' 
                           : 'bg-white border-indigo-50 text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 shadow-sm'
                         }`}
                       >
                         ＋ {sub}
                       </button>
                     ))}
                   </div>
                 )}

                 {/* 
                     重要：keyに studentId を含めることで、生徒を切り替えた瞬間に 
                     DOM要素ごと強制的に再生成させ、入力値の残留（同期不具合）を物理的に防ぎます 
                 */}
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" key={formData.studentId}>
                    {Object.entries(formData.scores).map(([sub, score]) => (
                      <div 
                        key={`input-${formData.studentId}-${sub}`} 
                        className="relative group animate-fadeIn"
                      >
                        <div className="bg-slate-50/50 p-4 rounded-[1.8rem] border-2 border-slate-200 focus-within:border-indigo-600 focus-within:bg-white focus-within:shadow-lg transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase">{sub}</span>
                            {isHighSchool && (
                              <button type="button" onClick={() => removeSubject(sub)} className="text-[10px] text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">削除</button>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <input 
                              type="number" 
                              placeholder="0"
                              required
                              value={score === 0 ? '' : score}
                              className="w-full bg-transparent text-center font-black text-3xl text-slate-900 outline-none placeholder:text-slate-200" 
                              onChange={e => handleScoreChange(sub, e.target.value)} 
                            />
                            <span className="text-[10px] font-black text-slate-300">pts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
                 
                 {Object.keys(formData.scores).length === 0 && (
                   <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/30">
                     {formData.studentId ? "右上のボタンから科目を追加してください" : "先に生徒を選択してください"}
                   </div>
                 )}
              </div>

              <div className="flex gap-4 pt-8 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-xs tracking-widest">キャンセル</button>
                <button 
                  type="submit" 
                  disabled={Object.keys(formData.scores).length === 0}
                  className="flex-[2] bg-indigo-600 text-white py-5 rounded-[1.8rem] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 uppercase text-sm tracking-widest disabled:bg-slate-100 disabled:shadow-none disabled:text-slate-400"
                >
                  データを確定して保存 ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
