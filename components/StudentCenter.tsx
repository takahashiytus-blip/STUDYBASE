
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Report, UserRole, StudySession, IQResult, InterviewRecord } from '../types';
import { FACULTY_OPTIONS, SUBJECT_CONFIG } from '../constants';
import ReportList from './ReportList';
import { getLocalISOString, parseSafeDate, generateUniqueId } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface StudentCenterProps {
  students: Student[];
  reports: Report[];
  allSessions: StudySession[];
  instructors: { id: string; name: string }[];
  currentUser: { role: UserRole; id: string; name: string };
  interviewRecords: InterviewRecord[];
  onAddMessage: (reportId: string, text: string) => void;
  onDeleteMessage: (reportId: string, messageId: string) => void;
  onMarkResolved: (reportId: string) => void;
  onUpdateReport?: (reportId: string, updates: Partial<Report>) => void;
  onDeleteReport?: (reportId: string) => void;
  onAddStudent?: (student: Omit<Student, 'id' | 'instructorIds'>) => void;
  onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void;
  onDeleteStudent?: (studentId: string) => void;
}

export const StudentCenter: React.FC<StudentCenterProps> = ({ 
  students, reports, allSessions, instructors, currentUser, interviewRecords = [],
  onAddMessage, onDeleteMessage, onMarkResolved, onUpdateReport, onDeleteReport, onAddStudent, onUpdateStudent, onDeleteStudent 
}) => {
  console.log("[StudentCenter] Received students count:", students.length);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedAiRecId, setExpandedAiRecId] = useState<string | null>(null);
  const [attendanceRange, setAttendanceRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
  const studentReports = useMemo(() => reports.filter(r => r.studentId === selectedStudentId), [reports, selectedStudentId]);
  const studentInterviewRecords = useMemo(() => 
    interviewRecords.filter(r => r.studentId === selectedStudentId).sort((a, b) => b.date.localeCompare(a.date)),
    [interviewRecords, selectedStudentId]
  );
  
  const attendanceCount = useMemo(() => {
    if (!selectedStudentId) return 0;
    return reports.filter(r => 
      r.studentId === selectedStudentId && 
      r.date >= attendanceRange.start && 
      r.date <= attendanceRange.end
    ).length;
  }, [reports, selectedStudentId, attendanceRange]);

  const isAdmin = currentUser.role === 'admin';
  const isPrivileged = isAdmin || currentUser.role === 'instructor';

  // 重要：同期による削除への追従ロジック
  // 選択中の生徒がリストから消えた（他デバイスで削除された）場合、選択を解除する
  useEffect(() => {
    if (selectedStudentId && !students.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(null);
      setIsEditing(false);
    }
  }, [students, selectedStudentId]);

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
      const entry: any = { 
        name: dateStr.split('-').slice(1).join('/'),
        date: dateStr
      };

      // StudyBaseの科目別集計
      Object.keys(SUBJECT_CONFIG).forEach(sub => {
        const mins = sessions.filter(s => s.date === dateStr && s.subject === sub).reduce((acc, curr) => acc + curr.minutes, 0);
        if (mins > 0) entry[sub] = parseFloat((mins / 60).toFixed(1));
      });

      // StudyPlusの科目別集計
      const spDayData = selectedStudent?.studyPlusMinutes?.[dateStr] || {};
      Object.entries(spDayData).forEach(([sub, mins]) => {
        const key = `SP_${sub}`;
        entry[key] = parseFloat((mins / 60).toFixed(1));
      });

      last7Days.push(entry);
    }

    return { last7Days };
  }, [selectedStudentId, allSessions, selectedStudent]);

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
        <div className="lg:col-span-4 space-y-3">
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
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${selectedStudentId === student.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                {student.name[0]}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg truncate">{student.name}</p>
                <p className={`text-[10px] font-black uppercase ${selectedStudentId === student.id ? 'text-indigo-200' : 'text-slate-400'}`}>{student.grade}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-8">
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
                      <div className="relative">
                        <button 
                          onClick={() => setShowDeleteConfirm(selectedStudent.id)}
                          className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
                          title="削除"
                        >
                          🗑
                        </button>
                        
                        {showDeleteConfirm === selectedStudent.id && (
                          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-slideUp">
                              <h4 className="text-xl font-black text-slate-800 mb-2">生徒データの削除</h4>
                              <p className="text-slate-500 text-sm font-medium mb-6">
                                {selectedStudent.name} さんの全データを削除しますか？この操作は取り消せません。
                              </p>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                                >
                                  キャンセル
                                </button>
                                <button 
                                  onClick={() => {
                                    onDeleteStudent?.(selectedStudent.id);
                                    setShowDeleteConfirm(null);
                                    setSelectedStudentId(null);
                                  }}
                                  className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                                >
                                  削除する
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                      <div><label className="text-xs font-black text-slate-400 ml-1">志望校</label><input className={inputStyle} value={selectedStudent.targetSchool || ''} onChange={e => onUpdateStudent?.(selectedStudent.id, { targetSchool: e.target.value })} /></div>
                      <div><label className="text-xs font-black text-slate-400 ml-1">ログインID</label><input className={inputStyle} value={selectedStudent.loginId || ''} onChange={e => onUpdateStudent?.(selectedStudent.id, { loginId: e.target.value })} /></div>
                      <div><label className="text-xs font-black text-slate-400 ml-1">パスワード</label><input className={inputStyle} value={selectedStudent.password || ''} onChange={e => onUpdateStudent?.(selectedStudent.id, { password: e.target.value })} /></div>
                      <div><label className="text-xs font-black text-slate-400 ml-1">StudyPlus ID</label><input className={inputStyle} value={selectedStudent.studyPlusId || ''} placeholder="連携用IDを入力" onChange={e => onUpdateStudent?.(selectedStudent.id, { studyPlusId: e.target.value })} /></div>
                      <div>
                        <label className="text-xs font-black text-slate-400 ml-1">志望系統</label>
                        <select className={inputStyle} value={selectedStudent.targetFaculty} onChange={e => onUpdateStudent?.(selectedStudent.id, { targetFaculty: e.target.value })}>
                          <option value="">未選択</option>
                          {FACULTY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2"><label className="text-xs font-black text-slate-400 ml-1">講師へのメッセージ</label><textarea className={inputStyle} rows={3} value={selectedStudent.weeklyInstructorMessage || ''} onChange={e => onUpdateStudent?.(selectedStudent.id, { weeklyInstructorMessage: e.target.value })} /></div>
                      
                      <div className="md:col-span-2 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                        <h4 className="text-sm font-black text-emerald-700 mb-4 flex items-center justify-between">
                          <span className="flex items-center gap-2"><span>📱</span> StudyPlus 連携データ管理</span>
                          {selectedStudent.studyPlusLastSynced && (
                            <span className="text-[9px] font-bold text-emerald-500">最終同期: {new Date(selectedStudent.studyPlusLastSynced).toLocaleString('ja-JP')}</span>
                          )}
                        </h4>
                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 mb-2 uppercase">Manual Data Entry (Simulated Sync)</p>
                            <div className="flex flex-wrap gap-2">
                              <input type="date" id="sp-date" className="flex-1 min-w-[140px] px-4 py-2 rounded-xl border border-emerald-200 text-sm font-bold outline-none" defaultValue={getLocalISOString()} />
                              <select id="sp-sub" className="flex-1 min-w-[100px] px-4 py-2 rounded-xl border border-emerald-200 text-sm font-bold outline-none">
                                {Object.keys(SUBJECT_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <div className="relative w-24">
                                <input type="number" id="sp-mins" placeholder="分" className="w-full px-4 py-2 rounded-xl border border-emerald-200 text-sm font-bold outline-none pr-8" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">分</span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  const date = (document.getElementById('sp-date') as HTMLInputElement).value;
                                  const sub = (document.getElementById('sp-sub') as HTMLSelectElement).value;
                                  const mins = parseInt((document.getElementById('sp-mins') as HTMLInputElement).value) || 0;
                                  if (date && mins > 0) {
                                    const currentSP = selectedStudent.studyPlusMinutes || {};
                                    const dayData = currentSP[date] || {};
                                    onUpdateStudent?.(selectedStudent.id, {
                                      studyPlusMinutes: { 
                                        ...currentSP, 
                                        [date]: { ...dayData, [sub]: (dayData[sub] || 0) + mins }
                                      }
                                    });
                                    alert('StudyPlusデータを反映しました');
                                  }
                                }}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-xs shadow-md hover:bg-emerald-700 transition-all active:scale-95"
                              >
                                反映
                              </button>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-emerald-100">
                            <button 
                              type="button"
                              onClick={() => {
                                if (!selectedStudent.studyPlusId) {
                                  alert('先にStudyPlus IDを設定してください');
                                  return;
                                }
                                alert(`${selectedStudent.studyPlusId} のデータを同期中... (シミュレーション)`);
                                // 過去7日間のランダムなデータを生成してシミュレーション
                                const mockSP: Record<string, Record<string, number>> = { ...selectedStudent.studyPlusMinutes };
                                const subjects = ['数学', '英語', '国語', '理科', '社会'];
                                for(let i=0; i<7; i++) {
                                  const d = new Date();
                                  d.setDate(d.getDate() - i);
                                  const ds = d.toISOString().split('T')[0];
                                  const dayData: Record<string, number> = {};
                                  subjects.forEach(s => {
                                    if (Math.random() > 0.3) {
                                      dayData[s] = Math.floor(Math.random() * 60) + 15;
                                    }
                                  });
                                  mockSP[ds] = dayData;
                                }
                                onUpdateStudent?.(selectedStudent.id, { 
                                  studyPlusMinutes: mockSP,
                                  studyPlusLastSynced: new Date().toISOString()
                                });
                              }}
                              className="w-full bg-white text-emerald-600 border-2 border-emerald-200 py-4 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                            >
                              <span>🔄</span> 一括同期を実行
                            </button>
                            <p className="text-[9px] text-emerald-400 mt-2 text-center font-bold">※ StudyPlus IDに紐づく過去7日間の学習データを自動取得します</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center justify-between">
                          <span>学習時間分析 (h)</span>
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-600 rounded-full"></span><span className="text-[8px]">Study Base</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span><span className="text-[8px]">StudyPlus</span></span>
                          </span>
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={stats?.last7Days}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                              <YAxis fontSize={10} axisLine={false} tickLine={false} />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              {/* StudyBaseの科目別データを描画 */}
                              {Object.entries(SUBJECT_CONFIG).map(([sub, config]) => (
                                <Bar key={sub} dataKey={sub} name={sub} fill={config.color} stackId="a" />
                              ))}
                              {/* StudyPlusの科目別データを描画 */}
                              {selectedStudent?.studyPlusMinutes && 
                                Array.from(new Set(
                                  Object.values(selectedStudent.studyPlusMinutes).flatMap(subjects => Object.keys(subjects))
                                )).map(sub => (
                                  <Bar key={`SP_${sub}`} dataKey={`SP_${sub}`} name={`SP:${sub}`} fill="#10b981" stackId="a" opacity={0.7} />
                                ))
                              }
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* 科目別内訳のリスト表示 */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {Array.from(new Set([
                            ...allSessions.filter(s => s.studentId === selectedStudent.id).map(s => s.subject),
                            ...Object.values(selectedStudent.studyPlusMinutes || {}).flatMap(subjects => Object.keys(subjects))
                          ])).map(sub => {
                            const baseMins = allSessions.filter(s => s.studentId === selectedStudent.id && s.subject === sub).reduce((a, c) => a + c.minutes, 0);
                            const spMins = Object.values(selectedStudent.studyPlusMinutes || {}).reduce((a, c) => a + (c[sub] || 0), 0);
                            if (baseMins === 0 && spMins === 0) return null;
                            
                            return (
                              <div key={sub} className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUBJECT_CONFIG[sub]?.color || '#10b981' }}></span>
                                <span className="text-[10px] font-bold text-slate-700">{sub}</span>
                                <span className="text-[10px] font-black text-slate-400">{((baseMins + spMins) / 60).toFixed(1)}h</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Latest IQ Test</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-slate-800">{selectedStudent.iqHistory?.[0]?.estimatedIQ || '---'}</span>
                          <span className="text-sm font-bold text-slate-400">Score</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">英単語王ベスト: {selectedStudent.wordKingBest || 0}語</p>
                        
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">授業回数集計</p>
                          <div className="flex items-center gap-2 mb-4">
                            <input 
                              type="date" 
                              value={attendanceRange.start}
                              onChange={e => setAttendanceRange(prev => ({ ...prev, start: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold outline-none"
                            />
                            <span className="text-slate-400">~</span>
                            <input 
                              type="date" 
                              value={attendanceRange.end}
                              onChange={e => setAttendanceRange(prev => ({ ...prev, end: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold outline-none"
                            />
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">期間内の授業数</span>
                            <span className="text-2xl font-black text-indigo-600">{attendanceCount} <span className="text-[10px] text-slate-400">回</span></span>
                          </div>
                        </div>

                        {isPrivileged && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Account Info</p>
                            <p className="text-xs font-bold text-slate-600">ID: <span className="font-mono">{selectedStudent.loginId || '未設定'}</span></p>
                            <p className="text-xs font-bold text-slate-600">PW: <span className="font-mono">{selectedStudent.password || '未設定'}</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  <span>📅</span> 面談記録・AI分析履歴
                </h3>
                <div className="space-y-4">
                  {studentInterviewRecords.map(record => (
                    <div key={record.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black text-slate-800">{record.date}</p>
                          <p className="text-[10px] font-bold text-slate-400">担当: {record.interviewerName}</p>
                        </div>
                        {record.aiMaterial && (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-widest">AI Generated</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">面談内容</p>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{record.content}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">次回アクション</p>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{record.nextActions}</p>
                        </div>
                      </div>

                      {record.aiMaterial && (
                        <div className="pt-4 border-t border-slate-200">
                          <button 
                            onClick={() => setExpandedAiRecId(expandedAiRecId === record.id ? null : record.id)}
                            className="text-[10px] font-black text-indigo-600 flex items-center gap-2 hover:text-indigo-700 transition-colors"
                          >
                            {expandedAiRecId === record.id ? '🔼 AI分析詳細を閉じる' : '🔽 AI分析詳細を表示'}
                          </button>
                          {expandedAiRecId === record.id && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                <div>
                                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">成長点</p>
                                  <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{record.aiMaterial.growthPoints}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-rose-600 uppercase mb-1">課題</p>
                                  <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{record.aiMaterial.challenges}</p>
                                </div>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                <div>
                                  <p className="text-[8px] font-black text-indigo-600 uppercase mb-1">推奨校</p>
                                  <p className="text-[9px] font-bold text-slate-500">公立: {record.aiMaterial.suggestedSchools.public.challenge.join(', ')} / {record.aiMaterial.suggestedSchools.public.realistic.join(', ')}</p>
                                  <p className="text-[9px] font-bold text-slate-500">私立: {record.aiMaterial.suggestedSchools.private.challenge.join(', ')} / {record.aiMaterial.suggestedSchools.private.solid.join(', ')}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">推奨学習時間</p>
                                  <div className="flex flex-wrap gap-1">
                                    {record.aiMaterial.requiredStudyHours.subjectBreakdown.map((s, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-slate-50 rounded text-[8px] font-bold border border-slate-100">{s.subject}: {s.hours}h</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {studentInterviewRecords.length === 0 && (
                    <p className="text-center py-10 text-slate-400 font-bold text-sm bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      過去の面談記録はありません
                    </p>
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
                  onUpdateReport={onUpdateReport}
                  onDeleteReport={onDeleteReport}
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
