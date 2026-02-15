
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { Report, Student, UserRole, StudySession, MockExam } from '../types';
// Fix: Import generateLearningAdvice from geminiService to fetch AI suggestions
import { generateLearningAdvice } from '../services/geminiService';

interface DashboardProps {
  reports: Report[];
  students: Student[];
  role: UserRole;
  mockExams?: MockExam[];
  currentUserStudent?: Student;
  allSessions: StudySession[];
  onLogSession: (session: StudySession) => void;
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SUBJECT_CONFIG: Record<string, { color: string; label: string }> = {
  '数学': { color: '#6366f1', label: '数学' },
  '英語': { color: '#f43f5e', label: '英語' },
  '国語': { color: '#f59e0b', label: '国語' },
  '理科': { color: '#10b981', label: '理科' },
  '社会': { color: '#0ea5e9', label: '社会' },
  'その他': { color: '#64748b', label: 'その他' },
};

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  if (!payload.value) return null;
  const [datePart, dayPart] = payload.value.split(' ');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#64748b" className="font-bold">
        <tspan x="0" fontSize="10">{datePart}</tspan>
        <tspan x="0" dy="12" fontSize="8" fill="#94a3b8" fontWeight="normal">{dayPart}</tspan>
      </text>
    </g>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ reports, students, role, mockExams = [], currentUserStudent, allSessions, onLogSession }) => {
  const isPrivileged = role === 'instructor' || role === 'admin';

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'up' | 'down'>('up');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Double Countdown
  const [target1Label, setTarget1Label] = useState('高校入試当日');
  const [target1DateStr, setTarget1DateStr] = useState('2025-03-10');
  const [target2Label, setTarget2Label] = useState('学年末テスト');
  const [target2DateStr, setTarget2DateStr] = useState('2025-02-20');
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);

  // Study Log
  const [weekOffset, setWeekOffset] = useState(0);
  const todayStr = getLocalDateString(new Date());
  const [inputSubject, setInputSubject] = useState('数学');
  const [inputMinutes, setInputMinutes] = useState('');
  const [inputDate, setInputDate] = useState(todayStr); 

  // Fix: Define missing aiAdvice state to resolve line 400 error
  const [aiAdvice, setAiAdvice] = useState('データを分析して、最適なアドバイスを生成します...');

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

  const setTimerPreset = (mins: number) => {
    setTimerSeconds(mins * 60);
    setTimerMode('down');
    setIsTimerRunning(false);
    setShowCustomInput(false);
  };

  const handleCustomSet = () => {
    const mins = parseInt(customInput);
    if (!isNaN(mins) && mins > 0) {
      setTimerSeconds(mins * 60);
      setTimerMode('down');
      setIsTimerRunning(false);
      setShowCustomInput(false);
      setCustomInput('');
    }
  };

  const handleLogStudy = () => {
    const mins = parseInt(inputMinutes);
    if (!isNaN(mins) && mins > 0) {
      onLogSession({
        id: Math.random().toString(36).substr(2, 9),
        studentId: currentUserStudent?.id || 'me',
        date: inputDate,
        subject: inputSubject,
        minutes: mins
      });
      setInputMinutes('');
    }
  };

  const getDiffDays = (dateStr: string) => {
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const targetMid = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = targetMid.getTime() - nowMid.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const diffDays1 = useMemo(() => getDiffDays(target1DateStr), [target1DateStr]);
  const diffDays2 = useMemo(() => getDiffDays(target2DateStr), [target2DateStr]);

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
    const sid = currentUserStudent?.id || 's1';
    return allSessions.filter(s => {
      if (s.studentId !== sid) return false;
      const parts = s.date.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d >= monday && d <= sunday;
    });
  }, [allSessions, monday, sunday, currentUserStudent]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      const displayLabel = `${d.getMonth() + 1}/${d.getDate()} ${DAY_NAMES_SHORT[d.getDay()]}`;
      const entry: any = { dateLabel: displayLabel, date: dateStr };
      Object.keys(SUBJECT_CONFIG).forEach(sub => {
        const mins = filteredSessions.filter(s => s.date === dateStr && s.subject === sub).reduce((a, c) => a + c.minutes, 0);
        entry[sub] = parseFloat((mins / 60).toFixed(1));
      });
      data.push(entry);
    }
    return data;
  }, [filteredSessions, monday]);

  const weeklyTotalHours = useMemo(() => {
    const totalMins = filteredSessions.reduce((acc, curr) => acc + curr.minutes, 0);
    return (totalMins / 60).toFixed(1);
  }, [filteredSessions]);

  const reportChartData = reports.filter(r => r.quizScore !== undefined).map(r => ({ date: r.date.split('-').slice(1).join('/'), score: r.quizScore })).slice(-10);
  const avgScore = reportChartData.length > 0 ? (reportChartData.reduce((a, c) => a + (c.score || 0), 0) / reportChartData.length).toFixed(1) : '---';

  const classroomData = useMemo(() => {
    const userTime = parseFloat(weeklyTotalHours);
    const others = [22.4, 18.5, 15.2, 12.0, 10.5, 8.2, 5.0, 4.5, 3.2];
    const all = [...others, userTime].sort((a, b) => b - a);
    const rank = all.indexOf(userTime) + 1;
    return { rank, total: all.length, topTime: all[0] };
  }, [weeklyTotalHours]);

  // Fix: Add effect to fetch fresh AI Advice when student or stats change
  useEffect(() => {
    const fetchAdvice = async () => {
      if (!isPrivileged && currentUserStudent) {
        try {
          const advice = await generateLearningAdvice(currentUserStudent.name, weeklyTotalHours);
          setAiAdvice(advice);
        } catch (error) {
          console.error("Advice generation error:", error);
        }
      }
    };
    fetchAdvice();
  }, [isPrivileged, currentUserStudent, weeklyTotalHours]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{isPrivileged ? 'ダッシュボード' : 'STUDY BASE'}</h2>
          <p className="text-slate-500 font-medium italic">継続は、やがて自信に変わる。</p>
        </div>
      </header>

      <div className={`grid grid-cols-1 ${role === 'parent' ? 'md:grid-cols-1 max-w-xs' : 'md:grid-cols-3'} gap-6`}>
        {!isPrivileged ? (
          <>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">Quiz Average</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-800">{avgScore}</span>
                <span className="text-lg font-bold text-slate-400">pt</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Countdown 1 */}
              <div className="bg-indigo-950 p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Target 1</p>
                  <button onClick={() => setIsEditingCountdown(!isEditingCountdown)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditingCountdown ? '✓' : '✎'}
                  </button>
                </div>
                {isEditingCountdown ? (
                  <div className="space-y-2 z-10 animate-fadeIn">
                    <input type="text" value={target1Label} onChange={(e) => setTarget1Label(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 text-xs font-bold text-white outline-none" placeholder="目標1の名称" />
                    <input type="date" value={target1DateStr} onChange={(e) => setTarget1DateStr(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 text-xs font-bold text-white outline-none" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{diffDays1 > 0 ? diffDays1 : 0}</span>
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Days Left</span>
                    </div>
                    <p className="text-[10px] text-indigo-100 mt-1 font-black tracking-widest truncate">{target1Label}</p>
                  </>
                )}
              </div>

              {/* Countdown 2 */}
              <div className="bg-indigo-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Target 2</p>
                </div>
                {isEditingCountdown ? (
                  <div className="space-y-2 z-10 animate-fadeIn">
                    <input type="text" value={target2Label} onChange={(e) => setTarget2Label(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 text-xs font-bold text-white outline-none" placeholder="目標2の名称" />
                    <input type="date" value={target2DateStr} onChange={(e) => setTarget2DateStr(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 text-xs font-bold text-white outline-none" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{diffDays2 > 0 ? diffDays2 : 0}</span>
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Days Left</span>
                    </div>
                    <p className="text-[10px] text-indigo-100 mt-1 font-black tracking-widest truncate">{target2Label}</p>
                  </>
                )}
              </div>
            </div>

            {/* Enhanced Focus Timer */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Focus Timer</p>
                <div className="flex bg-white/5 p-1 rounded-xl">
                  <button onClick={() => setTimerMode('up')} className={`px-2 py-1 rounded text-[9px] font-black transition-all ${timerMode === 'up' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>UP</button>
                  <button onClick={() => setTimerMode('down')} className={`px-2 py-1 rounded text-[9px] font-black transition-all ${timerMode === 'down' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>DOWN</button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-6 z-[20]">
                <span className={`text-6xl font-mono font-black tracking-tighter ${timerSeconds === 0 && timerMode === 'down' ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                  {formatTime(timerSeconds)}
                </span>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsTimerRunning(!isTimerRunning)} 
                    className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center transition-all shadow-[0_0_40px_rgba(79,70,229,0.3)] active:scale-90 border-4 ${
                      isTimerRunning ? 'bg-rose-500 border-rose-400/50' : 'bg-indigo-500 border-indigo-400/50'
                    }`}
                  >
                    {isTimerRunning ? <span className="text-4xl text-white">■</span> : <span className="text-5xl text-white ml-2">▶</span>}
                  </button>
                  <button 
                    onClick={() => { setTimerSeconds(0); setIsTimerRunning(false); }} 
                    className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all border border-white/10"
                  >
                    ⟲
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 z-10">
                {!showCustomInput ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {[50, 60, 70, 80, 90].map(m => (
                      <button key={m} onClick={() => setTimerPreset(m)} className="px-3 py-1.5 bg-white/5 hover:bg-indigo-600/30 rounded-lg text-[10px] font-black border border-white/5 transition-all">{m}m</button>
                    ))}
                    <button onClick={() => setShowCustomInput(true)} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black border border-indigo-500/30">+ Custom</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <input type="number" placeholder="分" autoFocus value={customInput} onChange={(e) => setCustomInput(e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500" />
                    <button onClick={handleCustomSet} className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black">Set</button>
                    <button onClick={() => setShowCustomInput(false)} className="text-slate-500 text-[10px] font-bold px-2">✕</button>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none"></div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Students</p>
               <p className="text-4xl font-black text-slate-800">{students.length}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Reports This Month</p>
               <p className="text-4xl font-black text-slate-800">{reports.length}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Average Score</p>
               <p className="text-4xl font-black text-slate-800">{avgScore}</p>
            </div>
          </>
        )}
      </div>

      {!isPrivileged && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white px-4 py-8 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800">学習記録</h3>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">←</button>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter whitespace-nowrap">{monday.toLocaleDateString('ja-JP')} 〜 {sunday.toLocaleDateString('ja-JP')}</p>
                  <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">→</button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase">Total</p>
                <p className="text-xl font-black text-indigo-600">{weeklyTotalHours} <span className="text-xs font-bold">h</span></p>
              </div>
            </div>
            <div className="h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" stroke="#94a3b8" tickLine={false} axisLine={false} interval={0} tick={<CustomXAxisTick />} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: 'bold' }} />
                  {Object.entries(SUBJECT_CONFIG).map(([sub, config]) => <Bar key={sub} dataKey={sub} name={config.label} fill={config.color} stackId="a" radius={[0, 0, 0, 0]} barSize={16} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="pt-8 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1 ml-1 uppercase">実施日</label>
                <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1 ml-1 uppercase">科目</label>
                <select value={inputSubject} onChange={(e) => setInputSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none">
                  {Object.keys(SUBJECT_CONFIG).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1 ml-1 uppercase">時間 (分)</label>
                <input type="number" value={inputMinutes} onChange={(e) => setInputMinutes(e.target.value)} placeholder="例: 60" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none" />
              </div>
              <button onClick={handleLogStudy} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-lg hover:bg-black active:scale-95 transition-all">記録する</button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Classroom Ranking</h4>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">My Rank</p>
                  <p className="text-3xl font-black text-indigo-700">{classroomData.rank} 位</p>
                </div>
                <div className="flex-1 text-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Top Student</p>
                  <p className="text-3xl font-black text-emerald-400">{classroomData.topTime} h</p>
                </div>
              </div>
            </div>
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
               <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">AI Learning Advisor</h4>
               <p className="text-sm font-bold leading-relaxed italic">「{aiAdvice}」</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
