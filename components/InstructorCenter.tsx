
import React, { useState } from 'react';
import { Instructor, Student } from '../types';

interface InstructorCenterProps {
  instructors: Instructor[];
  students: Student[];
  onAssignStudent: (studentId: string, instructorId: string) => void;
  onRemoveStudent: (studentId: string, instructorId: string) => void;
  onUpdateInstructor: (instructorId: string, updates: Partial<Instructor>) => void;
  onAddInstructor?: (instructor: Omit<Instructor, 'id'>) => void;
  onDeleteInstructor?: (instructorId: string) => void;
}

const InstructorCenter: React.FC<InstructorCenterProps> = ({ 
  instructors, 
  students, 
  onAssignStudent, 
  onRemoveStudent,
  onUpdateInstructor,
  onAddInstructor,
  onDeleteInstructor
}) => {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editLoginId, setEditLoginId] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [addFormData, setAddFormData] = useState({ name: '', specialty: '数学・理科', loginId: '', password: '' });

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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddInstructor) {
      onAddInstructor(addFormData);
      setShowAddModal(false);
      setAddFormData({ name: '', specialty: '数学・理科', loginId: '', password: '' });
    }
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">講師・生徒管理</h2>
          <p className="text-slate-500 font-medium">講師の基本情報、およびログインアカウントの設定を行います</p>
        </div>
        {onAddInstructor && (
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
            <span>＋</span> 新規講師を登録
          </button>
        )}
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
                </div>
              ) : (
                <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
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
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

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
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{student.grade}</p>
                            </div>
                            <span className="text-indigo-600 font-black text-xl ml-2">+</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-300">
              <span className="text-7xl mb-6 grayscale">👨‍🏫</span>
              <p className="text-xl font-bold text-slate-400">管理する講師を選択してください</p>
            </div>
          )}
        </div>
      </div>

      {/* 新規講師登録モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-indigo-600 p-8 text-white relative">
              <h3 className="text-xl font-black">新規講師登録</h3>
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">氏名</label>
                  <input required type="text" value={addFormData.name} onChange={(e) => setAddFormData({...addFormData, name: e.target.value})} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">担当・専門</label>
                  <input required type="text" value={addFormData.specialty} onChange={(e) => setAddFormData({...addFormData, specialty: e.target.value})} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ログインID</label>
                  <input required type="text" value={addFormData.loginId} onChange={(e) => setAddFormData({...addFormData, loginId: e.target.value})} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</label>
                  <input required type="text" value={addFormData.password} onChange={(e) => setAddFormData({...addFormData, password: e.target.value})} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-black text-slate-400">キャンセル</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">登録する</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorCenter;
