
import React, { useState, useEffect } from 'react';
import { Student, MockExam, UserRole, SubjectData } from '../types';
import { getLocalISOString, generateUniqueId } from '../App';

interface MockExamCenterProps {
  students: Student[];
  mockExams: MockExam[];
  role: UserRole;
  currentUserId: string;
  onSave: (exam: MockExam) => void;
  onUpdate?: (exam: MockExam) => void;
  onDelete?: (id: string) => void;
}

const JUNIOR_HIGH_SUBJECTS = [
  { id: 'japanese', label: '国語' },
  { id: 'math', label: '数学' },
  { id: 'english', label: '英語' },
  { id: 'science', label: '理科' },
  { id: 'social', label: '社会' },
];

const HIGH_SCHOOL_SUBJECTS = {
  english: [
    { id: 'eng_reading', label: '英語(R)' },
    { id: 'eng_listening', label: '英語(L)' },
  ],
  math: [
    { id: 'math1a', label: '数学I・A' },
    { id: 'math2bc', label: '数学II・B・C' },
  ],
  japanese: [
    { id: 'japanese_total', label: '国語(全体)' },
  ],
  science: [
    { id: 'physics', label: '物理' },
    { id: 'chemistry', label: '化学' },
    { id: 'biology', label: '生物' },
    { id: 'geology', label: '地学' },
    { id: 'physics_base', label: '物理基礎' },
    { id: 'chemistry_base', label: '化学基礎' },
    { id: 'biology_base', label: '生物基礎' },
    { id: 'geology_base', label: '地学基礎' },
  ],
  social: [
    { id: 'history_japan', label: '日本史' },
    { id: 'history_world', label: '世界史' },
    { id: 'geography', label: '地理' },
    { id: 'public_ethics', label: '公共・倫理' },
    { id: 'public_politics', label: '公共・政経' },
  ],
  other: [
    { id: 'info', label: '情報' },
  ]
};

const MockExamCenter: React.FC<MockExamCenterProps> = ({ 
  students, 
  mockExams, 
  role, 
  currentUserId,
  onSave, 
  onUpdate, 
  onDelete 
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(getLocalISOString());
  const [scores, setScores] = useState<Record<string, SubjectData>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const isPrivileged = role === 'instructor' || role === 'admin';

  useEffect(() => {
    if (!isPrivileged) {
      setSelectedStudentId(currentUserId);
    }
  }, [isPrivileged, currentUserId]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const isHighSchool = selectedStudent?.grade.includes('高校');
  
  const studentExams = mockExams
    .filter(e => e.studentId === selectedStudentId)
    .sort((a, b) => {
      const partsA = a.examDate.split('-').map(Number);
      const partsB = b.examDate.split('-').map(Number);
      const dA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
      const dB = new Date(partsB[0], partsB[1] - 1, partsB[2]);
      return dB.getTime() - dA.getTime();
    });

  const handleValueChange = (id: string, field: keyof SubjectData, value: string) => {
    if (!isPrivileged) return;
    setScores(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value === '' ? undefined : Number(value)
      }
    }));
  };

  const handleEditClick = (exam: MockExam) => {
    if (!isPrivileged) return;
    setEditingExamId(exam.id);
    setExamName(exam.examName);
    setExamDate(exam.examDate);
    setScores(exam.scores);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setExamName('');
    setExamDate(getLocalISOString());
    setScores({});
    setEditingExamId(null);
    setShowForm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrivileged) return;
    if (!selectedStudentId || !examName) return;

    if (editingExamId && onUpdate) {
      const updatedExam: MockExam = {
        id: editingExamId,
        studentId: selectedStudentId,
        examName,
        examDate,
        scores
      };
      onUpdate(updatedExam);
    } else {
      const newExam: MockExam = {
        id: generateUniqueId('exam'),
        studentId: selectedStudentId,
        examName,
        examDate,
        scores
      };
      onSave(newExam);
    }

    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    if (!isPrivileged || !onDelete) return;
    if (window.confirm('この成績データを完全に削除しますか？')) {
      onDelete(id);
    }
  };

  const renderSubjectGrid = () => {
    if (!selectedStudent) return null;

    if (!isHighSchool) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {JUNIOR_HIGH_SUBJECTS.map(sub => (
            <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block border-b border-slate-100 pb-2">{sub.label}</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">得点</span>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="点"
                    disabled={!isPrivileged}
                    value={scores[sub.id]?.score ?? ''}
                    onChange={(e) => handleValueChange(sub.id, 'score', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">偏差値</span>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="偏差値"
                    disabled={!isPrivileged}
                    value={scores[sub.id]?.deviation ?? ''}
                    onChange={(e) => handleValueChange(sub.id, 'deviation', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold text-sm text-indigo-600 disabled:bg-slate-100 disabled:text-indigo-300"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {Object.entries(HIGH_SCHOOL_SUBJECTS).map(([category, subs]) => (
          <div key={category} className="space-y-4">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 border-l-4 border-indigo-400 pl-3">
              {category === 'english' ? '外国語' : category === 'math' ? '数学' : category === 'japanese' ? '国語' : category === 'science' ? '理科' : category === 'social' ? '地歴公民' : 'その他'}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subs.map(sub => (
                <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <label className="text-[10px] font-black text-slate-500 truncate block border-b border-slate-100 pb-2">{sub.label}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400">得点</span>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="点"
                        disabled={!isPrivileged}
                        value={scores[sub.id]?.score ?? ''}
                        onChange={(e) => handleValueChange(sub.id, 'score', e.target.value)}
                        className="w-full px-2 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400">偏差値</span>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="偏"
                        disabled={!isPrivileged}
                        value={scores[sub.id]?.deviation ?? ''}
                        onChange={(e) => handleValueChange(sub.id, 'deviation', e.target.value)}
                        className="w-full px-2 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold text-indigo-600 disabled:bg-slate-100 disabled:text-indigo-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">模試成績管理</h2>
          <p className="text-slate-500 font-medium">生徒の外部模試結果（得点・偏差値）を記録し、推移を分析します</p>
        </div>
        {isPrivileged && selectedStudentId && !showForm && (
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            ＋ 新規成績を登録
          </button>
        )}
      </header>

      {isPrivileged && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6 no-print">
          <div className="flex-1 w-full">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">対象生徒を選択</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                resetForm();
              }}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-lg font-bold transition-all"
            >
              <option value="">生徒を選択してください</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isPrivileged && selectedStudent && (
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-lg text-white animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🎒</div>
            <div>
              <h3 className="text-2xl font-black">{selectedStudent.name} さんの成績</h3>
              <p className="text-indigo-100 font-medium text-sm">これまでに登録された外部模試の結果です</p>
            </div>
          </div>
        </div>
      )}

      {showForm && isPrivileged && (
        <div className="animate-slideUp bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-indigo-50">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl">🏆</span>
              <h4 className="text-xl font-black text-slate-800">
                {editingExamId ? '模試成績の再編集' : '新規成績の入力'}
              </h4>
            </div>
            <button onClick={resetForm} className="text-slate-400 hover:text-rose-500 transition-colors">✕ キャンセル</button>
          </div>
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">模試名</label>
                <input 
                  type="text" 
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="例: 第1回 全統記述模試"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">実施日</label>
                <input 
                  type="date" 
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
              <h5 className="text-sm font-black text-slate-600 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-xs">📊</span>
                科目別スコアと偏差値
              </h5>
              {renderSubjectGrid()}
            </div>

            <button 
              type="submit"
              className={`w-full py-5 rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all text-white ${
                editingExamId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {editingExamId ? '更新を保存して再登録する' : '成績を保存して公開する'}
            </button>
          </form>
        </div>
      )}

      {!selectedStudentId ? (
        <div className="py-32 flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 text-slate-300">
          <span className="text-8xl mb-6 grayscale opacity-20">🏆</span>
          <p className="text-xl font-bold">生徒を選択して成績を表示します</p>
        </div>
      ) : studentExams.length === 0 && !showForm ? (
        <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 text-slate-300">
          <span className="text-6xl mb-4 grayscale opacity-30">📭</span>
          <p className="text-lg font-bold text-slate-400">模試データがまだ登録されていません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {studentExams.map(exam => (
            <div key={exam.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group">
              <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{exam.examDate}</p>
                  <h4 className="text-xl font-black text-slate-800">{exam.examName}</h4>
                </div>
                {isPrivileged && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleEditClick(exam)}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
                      title="編集する"
                    >
                      ✎
                    </button>
                    {onDelete && (
                      <button 
                        onClick={() => handleDeleteClick(exam.id)}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                        title="削除する"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {/* Fix: Added explicit type casting for 'data' when filtering and mapping over Object.entries(exam.scores) to resolve 'unknown' property access errors. */}
                  {Object.entries(exam.scores).filter(([_, data]) => (data as SubjectData).score !== undefined || (data as SubjectData).deviation !== undefined).map(([id, data]) => {
                    const subjectData = data as SubjectData;
                    let label = id;
                    const jh = JUNIOR_HIGH_SUBJECTS.find(s => s.id === id);
                    if (jh) label = jh.label;
                    else {
                      Object.values(HIGH_SCHOOL_SUBJECTS).flat().forEach(s => {
                        if (s.id === id) label = s.label;
                      });
                    }

                    return (
                      <div key={id} className="bg-white border border-slate-100 px-5 py-4 rounded-3xl shadow-sm flex flex-col gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">{label}</span>
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold">得点</span>
                            <span className="text-xl font-black text-slate-800">{subjectData.score ?? '--'}<span className="text-[10px] ml-0.5 text-slate-400 font-normal">点</span></span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-indigo-400 font-bold">偏差値</span>
                            <span className="text-xl font-black text-indigo-600">
                              <span className="text-[10px] mr-1 text-indigo-300 font-normal">SS</span>
                              {subjectData.deviation ?? '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockExamCenter;
