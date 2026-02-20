import React, { useState, useMemo } from 'react';
import { Student, Report, UserRole, StudySession, IQResult } from '../types';
import { FACULTY_OPTIONS } from '../constants';
import ReportList from './ReportList';
import { getLocalISOString, parseSafeDate, generateUniqueId } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface StudentCenterProps {
  students: Student[];
  reports: Report[];
  allSessions: StudySession[];
  instructors: { id: string; name: string }[];
  currentUser: { role: UserRole; id: string; name: string };
  onAddMessage: (reportId: string, text: string) => void;
  onDeleteMessage: (reportId: string, messageId: string) => void;
  onMarkResolved: (reportId: string) => void;
  onAddStudent?: (student: Omit<Student, 'id' | 'instructorIds'>) => void;
  onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void;
  onDeleteStudent?: (studentId: string) => void;
}

export const StudentCenter: React.FC<StudentCenterProps> = ({ 
  students, reports, allSessions, instructors, currentUser, 
  onAddMessage, onDeleteMessage, onMarkResolved, onAddStudent, onUpdateStudent, onDeleteStudent 
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const studentReports = reports.filter(r => r.studentId === selectedStudentId);
  const isAdmin = currentUser.role === 'admin';

  // 統計データの計算
  const stats = useMemo(() => {
    if (!selectedStudentId) return null;
    const sessions = allSessions.filter(s => s.studentId === selectedStudentId);
    
    // 過去7日間の学習時間
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = sessions.filter(s => s.date === dateStr).reduce((acc, curr) => acc + curr.minutes, 0);
      last7Days.push({ name: dateStr.split('-').slice(1).join('/'), hours: (mins / 60).toFixed(1) });
    }

    return { last7Days };
  }, [selectedStudentId, allSessions]);

  const inputStyle = "w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">生徒管理センター</h2>
          <p className="text-slate-500 font-medium">生徒の学習状況の分析と、アカウント管理を行います</p>
        </div>
        {isAdmin && onAddStudent && (
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
            <span>＋</span> 新規生徒を登録
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Student List */}
        <div className="lg:col-span-3 space-y-3">
          {students.map(student => (
            <button
              key={student.id}
              onClick={() => { setSelectedStudentId(student.id); setIsEditing(false); }}
              className={`w-full p-5 rounded-[2rem] border transition-all text-left flex items-center gap-4 ${
                selectedStudentId === student.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl'
                  : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedStudentId === student.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                {student.name[0]}
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">{student.name}</p>
                <p className={`text-[10px] font-black uppercase ${selectedStudentId === student.id ? 'text-indigo-200' : 'text-slate-400'}`}>{student.grade}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-9">
          {selectedStudent ? (
            <div className="space-y-8 animate-slideUp">
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 md:p-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedStudent.name}</h3>
                    <p className="text-slate-500 font-bold">{selectedStudent.grade} • 志望: {selectedStudent.targetSchool || '未設定'}</p>
                  </div>
                  <div className="flex gap-3">
                    {isAdmin && (
                      <button onClick={() => {
                        if (window.confirm('この生徒の全データを削除しますか？')) {
                          onDeleteStudent?.(selectedStudent.id);
                          setSelectedStudentId(null);
                        }
                      }} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">🗑</button>
                    )}
                    <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-3 bg-white text-indigo-600 border border-indigo-100 rounded-2xl font-bold shadow-sm hover:bg-indigo-50 transition-all">
                      {isEditing ? '完了' : '編集'}
                    </button>
                  </div>
                </div>

                <div className="p-8 md:p-10">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="text-xs font-black text-slate-400 ml-1">氏名</label><input className={inputStyle} value={selectedStudent.name} onChange={e => onUpdateStudent?.(selectedStudent.id, { name: e.target.value })} /></div>
                      <div><label className="text-xs font-black text-slate-400 ml-1">学年</label><input className={inputStyle} value={selectedStudent.grade} onChange={e => onUpdateStudent?.(selectedStudent.id, { grade: e.target.value })} /></div>
                      <div><label className="text-xs font-black text-slate-400 ml-1">志望校</label><input className={inputStyle} value={selectedStudent.targetSchool} onChange={e => onUpdateStudent?.(selectedStudent.id, { targetSchool: e.target.value })} /></div>
                      <div>
                        <label className="text-xs font-black text-slate-400 ml-1">志望系統</label>
                        <select className={inputStyle} value={selectedStudent.targetFaculty} onChange={e => onUpdateStudent?.(selectedStudent.id, { targetFaculty: e.target.value })}>
                          <option value="">未選択</option>
                          {FACULTY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2"><label className="text-xs font-black text-slate-400 ml-1">講師へのメッセージ</label><textarea className={inputStyle} rows={3} value={selectedStudent.weeklyInstructorMessage} onChange={e => onUpdateStudent?.(selectedStudent.id, { weeklyInstructorMessage: e.target.value })} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">週間学習時間 (h)</h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.last7Days}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                              <YAxis fontSize={10} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} />
                              <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Latest IQ Test</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-slate-800">{selectedStudent.iqHistory?.[0]?.estimatedIQ || '---'}</span>
                          <span className="text-sm font-bold text-slate-400">Score</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">英単語王ベスト: {selectedStudent.wordKingBest || 0}語</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-sm">
                <ReportList 
                  reports={studentReports} 
                  students={students} 
                  currentUser={currentUser} 
                  onAddMessage={onAddMessage} 
                  onDeleteMessage={onDeleteMessage} 
                  onMarkResolved={onMarkResolved}
                  title={`${selectedStudent.name} さんの報告書`}
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-300">
              <span className="text-7xl mb-6 grayscale">👤</span>
              <p className="text-xl font-bold text-slate-400">生徒を選択してください</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-indigo-600 p-8 text-white"><h3 className="text-xl font-black">新規生徒登録</h3></div>
            <form onSubmit={e => {
              e.preventDefault();
              const target = e.target as any;
              onAddStudent?.({
                name: target.name.value,
                grade: target.grade.value,
                loginId: target.loginId.value,
                password: target.password.value,
                targetSchool: target.targetSchool.value
              });
              setShowAddModal(false);
            }} className="p-8 space-y-4">
              <input name="name" placeholder="氏名" required className={inputStyle} />
              <input name="grade" placeholder="学年" required className={inputStyle} />
              <input name="targetSchool" placeholder="志望校" className={inputStyle} />
              <input name="loginId" placeholder="ログインID" required className={inputStyle} />
              <input name="password" placeholder="パスワード" required className={inputStyle} />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 font-bold text-slate-400">キャンセル</button>
                <button type="submit" className="flex-2 bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg">登録する</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
