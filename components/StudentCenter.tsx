
import React, { useState, useMemo } from 'react';
import { Student, Report, UserRole, StudySession } from '../types';
import { FACULTY_OPTIONS } from '../constants';
import ReportList from './ReportList';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StudentCenterProps {
  students: Student[];
  reports: Report[];
  allSessions: StudySession[];
  currentUser: { role: UserRole; id: string; name: string };
  onAddMessage: (reportId: string, text: string) => void;
  onMarkResolved: (reportId: string) => void;
  onAddStudent?: (student: Omit<Student, 'id' | 'instructorIds'>) => void;
  onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void;
  onDeleteStudent?: (studentId: string) => void;
}

const SUBJECT_CONFIG: Record<string, { color: string; label: string }> = {
  '数学': { color: '#6366f1', label: '数学' },
  '英語': { color: '#f43f5e', label: '英語' },
  '国語': { color: '#f59e0b', label: '国語' },
  '理科': { color: '#10b981', label: '理科' },
  '社会': { color: '#0ea5e9', label: '社会' },
  'その他': { color: '#64748b', label: 'その他' },
};

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StudentCenter: React.FC<StudentCenterProps> = ({ 
  students, 
  reports, 
  allSessions,
  currentUser, 
  onAddMessage, 
  onMarkResolved,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [weeklyMessage, setWeeklyMessage] = useState('');
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', 
    grade: '',
    loginId: '',
    password: '',
    targetSchool: '',
    targetFaculty: ''
  });

  const isAdmin = currentUser.role === 'admin';

  const filteredStudents = currentUser.role === 'admin' 
    ? students 
    : students.filter(s => s.instructorIds.includes(currentUser.id));

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const studentReports = reports.filter(r => r.studentId === selectedStudentId);

  // 指定された生徒の週間学習時間を計算
  const getWeeklyHoursForStudent = (studentId: string) => {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mins = allSessions
      .filter(s => {
        if (s.studentId !== studentId) return false;
        const parts = s.date.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d >= monday && d <= sunday;
      })
      .reduce((acc, curr) => acc + curr.minutes, 0);
    
    return (mins / 60).toFixed(1);
  };

  // グラフ用データ構築（詳細表示用）
  const chartData = useMemo(() => {
    if (!selectedStudentId) return [];
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      const dayName = DAY_NAMES_SHORT[d.getDay()];
      const displayLabel = `${d.getMonth() + 1}/${d.getDate()} ${dayName}`;
      
      const entry: any = { dateLabel: displayLabel, date: dateStr };
      Object.keys(SUBJECT_CONFIG).forEach(sub => {
        const mins = allSessions
          .filter(s => s.studentId === selectedStudentId && s.date === dateStr && s.subject === sub)
          .reduce((acc, curr) => acc + curr.minutes, 0);
        entry[sub] = parseFloat((mins / 60).toFixed(1));
      });
      data.push(entry);
    }
    return data;
  }, [selectedStudentId, allSessions]);

  const handleUpdateWeeklyMessage = () => {
    if (!selectedStudentId || !onUpdateStudent) return;
    setIsUpdatingMessage(true);
    onUpdateStudent(selectedStudentId, { weeklyInstructorMessage: weeklyMessage });
    setTimeout(() => setIsUpdatingMessage(false), 800);
  };

  const handleOpenAdd = () => {
    setFormData({ name: '', grade: '', loginId: '', password: '', targetSchool: '', targetFaculty: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormData({ 
      name: student.name, 
      grade: student.grade,
      loginId: student.loginId || '',
      password: student.password || '',
      targetSchool: student.targetSchool || '',
      targetFaculty: student.targetFaculty || ''
    });
    setEditStudentId(student.id);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editStudentId && onUpdateStudent) {
      onUpdateStudent(editStudentId, formData);
      setEditStudentId(null);
    } else if (onAddStudent) {
      onAddStudent(formData);
      setShowAddModal(false);
    }
  };

  const handleDelete = (studentId: string, studentName: string) => {
    if (window.confirm(`${studentName}さんのデータを削除しますか？`)) {
      if (onDeleteStudent) onDeleteStudent(studentId);
    }
  };

  const isHighSchool = formData.grade.includes('高校');

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {!selectedStudentId ? (
        <>
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800">{isAdmin ? '全生徒一覧' : '担当生徒一覧'}</h2>
              <p className="text-slate-500 font-medium">生徒の学習量とアカウント状況を把握します</p>
            </div>
            {isAdmin && onAddStudent && (
              <button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><span>＋</span> 新規生徒登録</button>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-400"><p className="text-lg font-bold">表示可能な生徒がいません</p></div>
            ) : (
              filteredStudents.map((student) => {
                const hours = getWeeklyHoursForStudent(student.id);
                return (
                  <div key={student.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col relative">
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(student)} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors shadow-sm">✎</button>
                        <button onClick={() => handleDelete(student.id, student.name)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors shadow-sm">🗑</button>
                      </div>
                    )}
                    <div onClick={() => { setSelectedStudentId(student.id); setWeeklyMessage(student.weeklyInstructorMessage || ''); }} className="cursor-pointer">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">{student.name[0]}</div>
                        <div className="flex flex-col items-end gap-2">
                           <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">{student.grade}</span>
                           <span className={`text-[11px] font-black px-3 py-1 rounded-xl shadow-sm ${parseFloat(hours) > 10 ? 'bg-emerald-500 text-white' : parseFloat(hours) > 0 ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                             今週: {hours}h
                           </span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">{student.name} さん</h3>
                      <div className="flex flex-col gap-1 mb-4">
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">ID: {student.loginId || '未設定'}</span>
                        {student.targetSchool && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">🏫 {student.targetSchool}</span>}
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] text-indigo-500 font-black uppercase">詳細とメッセージ ➔</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedStudentId(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all">←</button>
              <div>
                <h2 className="text-3xl font-black text-slate-800">{selectedStudent?.name} さんの状況</h2>
                <p className="text-slate-500 font-medium">今週の学習量とメッセージ管理</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               {/* 週間学習グラフ（講師用） */}
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                 <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">📊</span>
                   週間学習推移
                 </h4>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="dateLabel" fontSize={9} tickLine={false} axisLine={false} />
                       <YAxis fontSize={9} tickLine={false} axisLine={false} />
                       <Tooltip />
                       <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: 'bold' }} />
                       {Object.entries(SUBJECT_CONFIG).map(([sub, config]) => (
                         <Bar key={sub} dataKey={sub} name={config.label} fill={config.color} stackId="a" barSize={14} />
                       ))}
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                 <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">指導報告書アーカイブ</h4>
                 <ReportList reports={studentReports} students={students} currentUser={currentUser} onAddMessage={onAddMessage} onMarkResolved={onMarkResolved} hideHeader={true} />
               </div>
            </div>

            <div className="space-y-8">
              {/* 講師メッセージ送信フォーム */}
              <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <span className="text-base">💬</span>
                   今週の激励メッセージ
                </h4>
                <textarea 
                  value={weeklyMessage}
                  onChange={(e) => setWeeklyMessage(e.target.value)}
                  placeholder="今週の学習状況を見てアドバイスを入力してください。生徒の STUDY BASE 画面に即座に表示されます。"
                  className="w-full h-40 bg-white/80 p-5 rounded-2xl border-2 border-rose-100 outline-none text-sm font-bold text-slate-700 leading-relaxed focus:bg-white focus:border-rose-400 transition-all placeholder:text-rose-200"
                />
                <button 
                  onClick={handleUpdateWeeklyMessage}
                  disabled={isUpdatingMessage}
                  className={`w-full mt-4 py-4 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 ${isUpdatingMessage ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                >
                  {isUpdatingMessage ? '更新完了！ ✓' : 'メッセージを更新する'}
                </button>
                <p className="text-[9px] text-rose-400 mt-3 text-center font-bold">
                  ※最後に送信した内容がトップ画面の「担当講師からの言葉」になります
                </p>
              </div>

              <div className="bg-indigo-950 p-8 rounded-[2.5rem] shadow-xl text-white">
                <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-6">生徒基本情報</h4>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] text-indigo-400">学年</span>
                    <span className="text-sm font-bold">{selectedStudent?.grade}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] text-indigo-400">第一志望</span>
                    <span className="text-sm font-bold">{selectedStudent?.targetSchool || '未設定'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* モーダル類 (既存のまま) */}
      {(showAddModal || editStudentId) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full h-[90vh] max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp flex flex-col">
            <div className="bg-indigo-600 p-8 text-white relative shrink-0">
              <h3 className="text-xl font-black">{editStudentId ? '生徒情報の編集' : '新規生徒登録'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditStudentId(null); }} className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">氏名</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">学年 / 区分</label>
                  <input type="text" required value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold bg-slate-50" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">第一志望校</label>
                  <input type="text" value={formData.targetSchool} onChange={(e) => setFormData({ ...formData, targetSchool: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold bg-white shadow-sm" />
                </div>
                {isHighSchool && (
                  <div className="space-y-2 animate-fadeIn">
                    <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-1 ml-1">志望学部系統</label>
                    <select value={formData.targetFaculty} onChange={(e) => setFormData({ ...formData, targetFaculty: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 outline-none font-bold bg-indigo-50/30">
                      <option value="">志望学部を選択してください</option>
                      {FACULTY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">ログインID</label>
                    <input type="text" value={formData.loginId} onChange={(e) => setFormData({ ...formData, loginId: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold bg-white shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">パスワード</label>
                    <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold bg-white shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => { setShowAddModal(false); setEditStudentId(null); }} className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-50">キャンセル</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">{editStudentId ? '更新を保存する' : '生徒を登録する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCenter;
