
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { Report, Student, UserRole, StudySession, MockExam, TimetableEntry, Instructor } from '../types';

interface DashboardProps {
  reports: Report[];
  students: Student[];
  instructors: Instructor[];
  role: UserRole;
  mockExams?: MockExam[];
  currentUserStudent?: Student;
  currentUserId: string;
  allSessions: StudySession[];
  onLogSession: (session: StudySession) => void;
  timetable: TimetableEntry[];
  onUpdateTimetable: (newTimetable: TimetableEntry[]) => void;
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SUBJECT_CONFIG: Record<string, { color: string; label: string }> = {
  '数学': { color: '#6366f1', label: '数' },
  '英語': { color: '#f43f5e', label: '英' },
  '国語': { color: '#f59e0b', label: '国' },
  '理科': { color: '#10b981', label: '理' },
  '社会': { color: '#0ea5e9', label: '社' },
  'その他': { color: '#64748b', label: '他' },
};

const DAY_NAMES_JP = ['日', '月', '火', '水', '木', '金', '土'];

const Dashboard: React.FC<DashboardProps> = ({ 
  reports, 
  students, 
  instructors,
  role, 
  mockExams = [], 
  currentUserStudent, 
  currentUserId,
  allSessions, 
  onLogSession,
  timetable,
  onUpdateTimetable
}) => {
  const isPrivileged = role === 'instructor' || role === 'admin';
  const isAdmin = role === 'admin';
  const isParent = role === 'parent';
  const isStudent = role === 'student';

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'up' | 'down'>('up');
  const timerRef = useRef<number | null>(null);

  // カウントダウン1 (志望校入試など)
  const [target1Label, setTarget1Label] = useState(localStorage.getItem('target1Label') || '高校入試当日');
  const [target1DateStr, setTarget1DateStr] = useState(localStorage.getItem('target1Date') || '2025-03-10');
  
  // カウントダウン2 (定期テストなど)
  const [target2Label, setTarget2Label] = useState(localStorage.getItem('target2Label') || '次回の定期テスト');
  const [target2DateStr, setTarget2DateStr] = useState(localStorage.getItem('target2Date') || '2024-11-20');
  
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);

  useEffect(() => {
    localStorage.setItem('target1Label', target1Label);
    localStorage.setItem('target1Date', target1DateStr);
    localStorage.setItem('target2Label', target2Label);
    localStorage.setItem('target2Date', target2DateStr);
  }, [target1Label, target1DateStr, target2Label, target2DateStr]);

  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, sunday } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; 
    const m = new Date(now);
    m.setDate(now.getDate() - dayOfWeek + 1 + (weekOffset * 7));
    m.setHours(0, 0, 0, 0);
    const s = new Date(m);
    s.setDate(m.getDate() + 6);
    s.setHours(23, 59, 59, 999);
    return { monday: m, sunday: s };
  }, [weekOffset]);

  const filteredSessions = useMemo(() => {
    const sid = currentUserStudent?.id || currentUserId;
    return allSessions.filter(s => {
      const parts = s.date.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return s.studentId === sid && d >= monday && d <= sunday;
    });
  }, [allSessions, monday, sunday, currentUserStudent, currentUserId]);

  const weeklyTotalHours = useMemo(() => {
    const totalMins = filteredSessions.reduce((acc, curr) => acc + curr.minutes, 0);
    return (totalMins / 60).toFixed(1);
  }, [filteredSessions]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(s => {
          if (timerMode === 'down') {
            if (s <= 1) {
              setIsTimerRunning(false);
              return 0;
            }
            return s - 1;
          }
          return s + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning, timerMode]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const diffDays1 = useMemo(() => {
    const target = new Date(target1DateStr + 'T00:00:00');
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [target1DateStr]);

  const diffDays2 = useMemo(() => {
    const target = new Date(target2DateStr + 'T00:00:00');
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [target2DateStr]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      const dayNameJp = DAY_NAMES_JP[d.getDay()];
      const entry: any = { dateLabel: dayNameJp, date: dateStr };
      Object.keys(SUBJECT_CONFIG).forEach(sub => {
        const mins = filteredSessions.filter(s => s.date === dateStr && s.subject === sub).reduce((a, c) => a + c.minutes, 0);
        entry[sub] = parseFloat((mins / 60).toFixed(1));
      });
      data.push(entry);
    }
    return data;
  }, [filteredSessions, monday]);

  const avgScore = useMemo(() => {
    const scores = reports.filter(r => r.quizScore !== undefined).map(r => r.quizScore as number);
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '---';
  }, [reports]);

  const todayDayOfWeek = new Date().getDay();
  const todaysFullTimetable = useMemo(() => {
    return timetable.filter(t => t.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetable, todayDayOfWeek]);

  const myTimetable = useMemo(() => {
    if (isPrivileged && role !== 'admin') {
      return timetable.filter(t => t.instructorId === currentUserId)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    } else {
      const sid = currentUserStudent?.id || currentUserId;
      return timetable.filter(t => t.studentId === sid)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    }
  }, [timetable, currentUserId, isPrivileged, currentUserStudent, role]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter">
            {isAdmin ? '管理者ダッシュボード' : isPrivileged ? '講師ダッシュボード' : 'STUDY BASE'}
          </h2>
          <p className="text-[11px] md:text-sm text-slate-500 font-medium italic">
            {isAdmin ? '校舎全体の稼働状況を一括管理' : '継続は、やがて自信に変わる。'}
          </p>
        </div>
      </header>

      <div className={`grid grid-cols-1 ${role === 'parent' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5 md:gap-6`}>
        {!isPrivileged ? (
          <>
            <div className="bg-white p-7 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">Quiz Average</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-800">{avgScore}</span>
                <span className="text-lg font-bold text-slate-400">pt</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Target 1 Card */}
              <div className="bg-indigo-950 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative group overflow-hidden border border-white/10 h-[140px]">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em]">Target 1</p>
                  {isStudent && (
                    <button onClick={() => setIsEditingCountdown(!isEditingCountdown)} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
                  )}
                </div>
                {isEditingCountdown && isStudent ? (
                  <div className="space-y-2 z-10">
                    <input type="text" value={target1Label} onChange={(e) => setTarget1Label(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none focus:bg-white/30" />
                    <input type="date" value={target1DateStr} onChange={(e) => setTarget1DateStr(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none focus:bg-white/30" />
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{diffDays1 > 0 ? diffDays1 : 0}</span>
                      <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Days</span>
                    </div>
                    <p className="text-[11px] text-indigo-100 font-black truncate mt-1">{target1Label}</p>
                  </div>
                )}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
              </div>

              {/* Target 2 Card */}
              <div className="bg-slate-800 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative group overflow-hidden border border-white/10 h-[140px]">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target 2</p>
                </div>
                {isEditingCountdown && isStudent ? (
                  <div className="space-y-2 z-10">
                    <input type="text" value={target2Label} onChange={(e) => setTarget2Label(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none focus:bg-white/30" />
                    <input type="date" value={target2DateStr} onChange={(e) => setTarget2DateStr(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none focus:bg-white/30" />
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">{diffDays2 > 0 ? diffDays2 : 0}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Days</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-black truncate mt-1">{target2Label}</p>
                  </div>
                )}
              </div>
            </div>

            {isStudent && (
              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col relative overflow-hidden border border-white/5">
                <div className="flex justify-between items-start mb-6 z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Focus Timer</p>
                  <div className="flex bg-white/10 p-1 rounded-xl">
                    <button onClick={() => setTimerMode('up')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${timerMode === 'up' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>UP</button>
                    <button onClick={() => setTimerMode('down')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${timerMode === 'down' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>DOWN</button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-6 z-[20]">
                  <span className={`text-6xl font-mono font-black tracking-tighter ${timerSeconds === 0 && timerMode === 'down' ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                    {formatTime(timerSeconds)}
                  </span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all shadow-xl active:scale-95 border-4 ${isTimerRunning ? 'bg-rose-500 border-rose-400/50' : 'bg-indigo-500 border-indigo-400/50'}`}>
                      {isTimerRunning ? <span className="text-3xl text-white">■</span> : <span className="text-4xl ml-1 text-white">▶</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Students</p><p className="text-4xl font-black">{students.length}</p></div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Monthly Reports</p><p className="text-4xl font-black">{reports.length}</p></div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Average Score</p><p className="text-4xl font-black">{avgScore}</p></div>
          </div>
        )}
      </div>

      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black flex items-center gap-2"><span className="text-2xl">🗓️</span> 通塾スケジュール</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly View</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 0].map(day => {
            const dayItems = myTimetable.filter(t => t.dayOfWeek === day);
            return (
              <div key={day} className={`flex flex-col h-full rounded-2xl p-3 ${day === todayDayOfWeek ? 'bg-indigo-50 ring-2 ring-indigo-500/20 shadow-sm' : 'bg-slate-50'}`}>
                <span className={`text-center text-[11px] font-black mb-2 ${day === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{DAY_NAMES_JP[day]}</span>
                <div className="space-y-2 flex-1">
                  {dayItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center opacity-20"><span className="text-[10px] font-bold">---</span></div>
                  ) : (
                    dayItems.map(item => (
                      <div key={item.id} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <span className="text-[8px] font-black text-indigo-500 leading-none mb-1 uppercase">{item.startTime}</span>
                        <span className="text-[10px] font-black text-slate-800 leading-tight">{item.subject}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!isPrivileged && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">学習記録</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{monday.toLocaleDateString('ja-JP')} 〜 {sunday.toLocaleDateString('ja-JP')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase">Weekly Total</p>
                <p className="text-xl font-black text-indigo-600">{weeklyTotalHours} h</p>
              </div>
            </div>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={4} wrapperStyle={{ paddingTop: '20px', fontSize: '8px' }} />
                  {Object.entries(SUBJECT_CONFIG).map(([sub, config]) => <Bar key={sub} dataKey={sub} name={config.label} fill={config.color} stackId="a" barSize={14} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-8">
            {currentUserStudent?.weeklyInstructorMessage && (
              <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-200 shadow-md">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2"><span>👨‍🏫</span> 講師からの言葉</h4>
                <p className="text-sm font-bold text-slate-800 leading-relaxed italic italic">「{currentUserStudent.weeklyInstructorMessage}」</p>
              </div>
            )}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-lg">
               <h4 className="text-[10px] font-black text-indigo-100 uppercase mb-4">Study Advisor</h4>
               <p className="text-[15px] font-bold leading-relaxed italic text-white drop-shadow-sm">「目標に向かって、一歩ずつ進んでいきましょう。継続は力なり！」</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
