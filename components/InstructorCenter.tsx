
import React, { useState } from 'react';
import { Instructor, Student } from '../types';

interface InstructorCenterProps {
  instructors: Instructor[];
  students: Student[];
  onAssignStudent: (studentId: string, instructorId: string) => void;
  onRemoveStudent: (studentId: string, instructorId: string) => void;
  onUpdateInstructor: (instructorId: string, updates: Partial<Instructor>) => void;
  onDeleteInstructor?: (instructorId: string) => void;
}

const InstructorCenter: React.FC<InstructorCenterProps> = ({ 
  instructors, 
  students, 
  onAssignStudent, 
  onRemoveStudent,
  onUpdateInstructor,
  onDeleteInstructor
}) => {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editLoginId, setEditLoginId] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const selectedInstructor = instructors.find(i => i.id === selectedInstructorId);
  
  const assignedStudents = selectedInstructorId 
    ? students.filter(s => s.instructorIds.includes(selectedInstructorId))
    : [];
  
  const availableStudents = selectedInstructorId
    ? students.filter(s => !s.instructorIds.includes(selectedInstructorId))
    : [];

  const getInstructorNames = (ids: string[]) => {
    return ids.map(id => instructors.find(i => i.id === id)?.name || id).join(', ');
  };

  const handleStartEdit = () => {
    if (!selectedInstructor) return;
    setEditName(selectedInstructor.name);
    setEditSpecialty(selectedInstructor.specialty);
    setEditLoginId(selectedInstructor.loginId || '');
    setEditPassword(selectedInstructor.password || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedInstructorId) return;
    onUpdateInstructor(selectedInstructorId, { 
      name: editName, 
      specialty: editSpecialty,
      loginId: editLoginId,
      password: editPassword
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!selectedInstructorId || !onDeleteInstructor) return;
    if (window.confirm(`${editName} 講師の情報を完全に削除しますか？担当生徒の紐付けも解除されます。`)) {
      onDeleteInstructor(selectedInstructorId);
      setSelectedInstructorId(null);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-black text-slate-800">講師・生徒管理</h2>
        <p className="text-slate-500 font-medium">講師の基本情報、およびログインアカウントの設定を行います</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Instructor List (Left Side) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">講師一覧</h3>
          <div className="space-y-3">
            {instructors.map((instructor) => (
              <button
                key={instructor.id}
                onClick={() => {
                  setSelectedInstructorId(instructor.id);
                  setIsEditing(false);
                }}
                className={`w-full p-6 rounded-[2rem] border transition-all text-left flex items-center gap-4 ${
                  selectedInstructorId === instructor.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl translate-x-2'
                    : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-200 shadow-sm'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                  selectedInstructorId === instructor.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {instructor.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate">{instructor.name}</p>
                  <p className={`text-[10px] font-medium uppercase tracking-widest truncate ${
                    selectedInstructorId === instructor.id ? 'text-indigo-100' : 'text-slate-400'
                  }`}>
                    {instructor.specialty}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Assignment View (Right Side) */}
        <div className="lg:col-span-8">
          {selectedInstructor ? (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden animate-slideUp">
              <div className="p-8 md:p-10 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-4">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">講師氏名</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-lg font-black bg-white border border-indigo-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-indigo-300"
                          placeholder="講師名"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">担当教科・専門</label>
                        <input 
                          type="text" 
                          value={editSpecialty}
                          onChange={(e) => setEditSpecialty(e.target.value)}
                          className="text-sm font-medium bg-white border border-indigo-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-indigo-300"
                          placeholder="担当教科など"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-black text-slate-900 truncate">{selectedInstructor.name} 講師</h3>
                      <p className="text-slate-500 font-medium">{selectedInstructor.specialty}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleDelete}
                        className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl text-xs font-bold shadow-sm border border-rose-100 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-2"
                      >
                        🗑 講師を削除
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="bg-white text-slate-500 px-6 py-3 rounded-2xl text-xs font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        キャンセル
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors"
                      >
                        保存する
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={handleStartEdit}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-xs font-bold shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors"
                      >
                        ✎ 情報を編集
                      </button>
                      <div className="bg-white px-5 py-2 rounded-2xl shadow-sm border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase text-center">担当数</p>
                        <p className="text-2xl font-black text-indigo-600 text-center">{assignedStudents.length}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="p-8 md:p-10 bg-slate-50/50">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">🔑</span>
                    認証情報の設定
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ログインID</label>
                      <input 
                        type="text" 
                        value={editLoginId}
                        onChange={(e) => setEditLoginId(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold"
                        placeholder="半角英数字"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</label>
                      <input 
                        type="text" 
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold"
                        placeholder="パスワード"
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400 leading-relaxed italic">
                    ※ ログインIDとパスワードは、講師が「Study Base」にログインする際に使用されます。
                  </p>
                </div>
              ) : (
                <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Account Summary */}
                  <div className="col-span-full bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-8 mb-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ログインID</p>
                      <p className="font-mono font-bold text-slate-700">{selectedInstructor.loginId || '未設定'}</p>
                    </div>
                    <div className="flex-1 border-l border-slate-100 pl-8">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">パスワード</p>
                      <p className="font-mono font-bold text-slate-700">{selectedInstructor.password ? '********' : '未設定'}</p>
                    </div>
                  </div>

                  {/* Currently Assigned */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">👤</span>
                      現在担当中の生徒
                    </h4>
                    <div className="space-y-3">
                      {assignedStudents.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                          担当生徒はいません
                        </div>
                      ) : (
                        assignedStudents.map(student => (
                          <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{student.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{student.grade}</p>
                            </div>
                            <button 
                              onClick={() => onRemoveStudent(student.id, selectedInstructor.id)}
                              className="text-rose-500 hover:bg-rose-100 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                              title="担当から外す"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Available to Assign */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">➕</span>
                      担当を追加可能
                    </h4>
                    <div className="space-y-3">
                      {availableStudents.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-sm">
                          追加可能な生徒はいません
                        </div>
                      ) : (
                        availableStudents.map(student => (
                          <button
                            key={student.id}
                            onClick={() => onAssignStudent(student.id, selectedInstructor.id)}
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all text-left shadow-sm group"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 group-hover:text-indigo-700 truncate">{student.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">{student.grade}</span>
                                {student.instructorIds.length > 0 && (
                                  <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                                    担当: {getInstructorNames(student.instructorIds)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-indigo-600 font-black text-xl ml-2">+</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-100">
                <p className="text-xs text-slate-400 leading-relaxed italic text-center">
                  ※ 複数の講師が同じ生徒を「担当」として持つことができます。<br/>
                  担当を外しても、その生徒のデータや他の講師との紐付けは削除されません。
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-300">
              <span className="text-7xl mb-6 grayscale">👨‍🏫</span>
              <p className="text-xl font-bold text-slate-400">管理する講師を選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorCenter;
