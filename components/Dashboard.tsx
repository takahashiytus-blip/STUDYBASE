
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { generateStudyAdvice } from '../services/geminiService';
import { Report, Student, UserRole, StudySession, MockExam, TimetableEntry, Instructor, InterviewSlot, InterviewRecord, AdminConfig } from '../types';
import { parseSafeDate, getLocalISOString } from '../utils';
import { SUBJECT_CONFIG, JHS_SUBJECTS, HS_SUBJECTS } from '../constants';

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
  onUpdateTimetable: (newTimetable: TimetableEntry[], deletedIds?: string[]) => void;
  onUpdateStudent?: (id: string, updates: Partial<Student>) => void;
  interviewSlots: InterviewSlot[];
  interviewRecords: InterviewRecord[];
  adminConfig: AdminConfig;
  groupLessonLogs?: any[];
}

const calculateRemainingDays = (targetDateStr: string) => {
  if (!targetDateStr) return 0;
  const target = parseSafeDate(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
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
  timetable = [],
  onUpdateTimetable,
  onUpdateStudent,
  interviewSlots = [],
  interviewRecords = [],
  adminConfig,
  groupLessonLogs = []
}) => {
  const isPrivileged = role === 'instructor' || role === 'admin';
  const isAdmin = role === 'admin';
  const isStudent = role === 'student';

  const showAnnouncement = adminConfig.isAnnouncementActive && adminConfig.announcement && 
    (role === 'admin' || (adminConfig.announcementTargetIds || []).includes(currentUserId));

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'up' | 'down'>('up');
  const [advisorMessage, setAdvisorMessage] = useState<string>('「目標に向かって、一歩ずつ進んでいきましょう。継続は力なり！」');
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const hasFetchedAdvice = useRef(false);

  const fetchAdvice = async (force = false) => {
    if (role === 'student' && currentUserStudent) {
      if (!force && hasFetchedAdvice.current) return;
      
      setIsGeneratingAdvice(true);
      try {
        const studentReports = reports.filter(r => r.studentId === currentUserId);
        const advice = await generateStudyAdvice(
          currentUserStudent.name,
          currentUserStudent.grade,
          studentReports
        );
        setAdvisorMessage(`「${advice}」`);
        hasFetchedAdvice.current = true;
      } catch (error) {
        console.error('Failed to generate study advice:', error);
      } finally {
        setIsGeneratingAdvice(false);
      }
    }
  };

  useEffect(() => {
    if (role === 'student' && currentUserStudent && !hasFetchedAdvice.current) {
      fetchAdvice();
    }
  }, [role, currentUserId, currentUserStudent]);
  const [customMins, setCustomMins] = useState('25');
  const timerRef = useRef<number | null>(null);

  // 学年に応じた初期科目の設定
  const isHS = currentUserStudent?.grade.includes('高校');
  const initialSubject = isHS ? '数学IA' : '数学';
  
  const [logSubject, setLogSubject] = useState(initialSubject);
  const [logMinutes, setLogMinutes] = useState('60');

  // 学年が変わった場合（ログインユーザー切り替え時など）に科目をリセット
  useEffect(() => {
    setLogSubject(isHS ? '数学IA' : '数学');
  }, [isHS]);

  const [target1Label, setTarget1Label] = useState(currentUserStudent?.targets?.label1 || '高校入試当日');
  const [target1DateStr, setTarget1DateStr] = useState(currentUserStudent?.targets?.date1 || '2025-03-10');
  const [target2Label, setTarget2Label] = useState(currentUserStudent?.targets?.label2 || '次回の定期テスト');
  const [target2DateStr, setTarget2DateStr] = useState(currentUserStudent?.targets?.date2 || '2024-11-20');
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);

  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (currentUserStudent?.targets) {
      setTarget1Label(currentUserStudent.targets.label1);
      setTarget1DateStr(currentUserStudent.targets.date1);
      setTarget2Label(currentUserStudent.targets.label2);
      setTarget2DateStr(currentUserStudent.targets.date2);
    }
  }, [currentUserStudent?.targets]);

  const handleSaveTargets = () => {
    if (onUpdateStudent && currentUserStudent) {
      onUpdateStudent(currentUserStudent.id, {
        targets: {
          label1: target1Label,
          date1: target1DateStr,
          label2: target2Label,
          date2: target2DateStr
        }
      });
    }
    setIsEditingCountdown(false);
  };

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

  const rankingData = useMemo(() => {
    const stats: Record<string, number> = {};
    students.forEach(s => stats[s.id] = 0);
    allSessions.forEach(s => {
      const d = parseSafeDate(s.date);
      if (d >= monday && d <= sunday) {
        stats[s.studentId] = (stats[s.studentId] || 0) + s.minutes;
      }
    });
    // StudyPlusの時間も加算
    students.forEach(s => {
      if (s.studyPlusMinutes) {
        Object.entries(s.studyPlusMinutes).forEach(([date, subjects]) => {
          const d = parseSafeDate(date);
          if (d >= monday && d <= sunday) {
            const dayTotal = Object.values(subjects).reduce((a, b) => a + b, 0);
            stats[s.id] = (stats[s.id] || 0) + dayTotal;
          }
        });
      }
    });
    return Object.entries(stats)
      .map(([id, minutes]) => ({ id, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [allSessions, students, monday, sunday]);

  const topStats = useMemo(() => {
    const top = rankingData[0];
    return {
      minutes: top?.minutes || 0,
      hours: ((top?.minutes || 0) / 60).toFixed(1)
    };
  }, [rankingData]);

  const myStats = useMemo(() => {
    const sid = currentUserStudent?.id || currentUserId;
    const minutes = rankingData.find(r => r.id === sid)?.minutes || 0;
    const rank = rankingData.findIndex(r => r.id === sid) + 1;
    return { minutes, hours: (minutes / 60).toFixed(1), rank };
  }, [rankingData, currentUserStudent, currentUserId]);

  const filteredSessions = useMemo(() => {
    const sid = currentUserStudent?.id || currentUserId;
    return allSessions.filter(s => {
      const d = parseSafeDate(s.date);
      return s.studentId === sid && d >= monday && d <= sunday;
    });
  }, [allSessions, monday, sunday, currentUserStudent, currentUserId]);

  const weeklyTotalHours = useMemo(() => {
    const totalMins = filteredSessions.reduce((acc, curr) => acc + curr.minutes, 0);
    const sid = currentUserStudent?.id || currentUserId;
    const student = students.find(s => s.id === sid);
    let spMins = 0;
    if (student?.studyPlusMinutes) {
      Object.entries(student.studyPlusMinutes).forEach(([date, subjects]) => {
        const d = parseSafeDate(date);
        if (d >= monday && d <= sunday) {
          spMins += Object.values(subjects).reduce((a, b) => a + b, 0);
        }
      });
    }
    return ((totalMins + spMins) / 60).toFixed(1);
  }, [filteredSessions, students, currentUserStudent, currentUserId, monday, sunday]);

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

  const handleSetTimer = (m: number) => {
    setTimerSeconds(m * 60);
    setTimerMode('down');
    setIsTimerRunning(false);
  };

  const handleManualLog = () => {
    const sid = currentUserStudent?.id || currentUserId;
    const mins = parseInt(logMinutes) || 0;
    if (mins <= 0) return;

    onLogSession({
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      studentId: sid,
      date: getLocalISOString(),
      subject: logSubject,
      minutes: mins
    });

    // 重要な修正：同期不具合を防ぐため、保存後に入力状態をリセット
    setLogMinutes('60');
  };

  const diffDays1 = useMemo(() => calculateRemainingDays(target1DateStr), [target1DateStr]);
  const diffDays2 = useMemo(() => calculateRemainingDays(target2DateStr), [target2DateStr]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayNameJp = DAY_NAMES_JP[d.getDay()];
      const entry: any = { dateLabel: dayNameJp, date: dateStr };
      
      // SUBJECT_CONFIGに存在する全科目の集計を行う
      Object.keys(SUBJECT_CONFIG).forEach(sub => {
        const mins = filteredSessions.filter(s => s.date === dateStr && s.subject === sub).reduce((a, c) => a + c.minutes, 0);
        if (mins > 0) entry[sub] = parseFloat((mins / 60).toFixed(1));
      });

      // StudyPlusの時間を追加
      const sid = currentUserStudent?.id || currentUserId;
      const student = students.find(s => s.id === sid);
      const spDayData = student?.studyPlusMinutes?.[dateStr] || {};
      
      Object.entries(spDayData).forEach(([sub, mins]) => {
        const key = `SP_${sub}`;
        entry[key] = parseFloat((mins / 60).toFixed(1));
      });

      data.push(entry);
    }
    return data;
  }, [filteredSessions, monday, students, currentUserStudent, currentUserId]);

  const avgScore = useMemo(() => {
    const relevantReports = (role === 'student' || role === 'parent')
      ? reports.filter(r => r.studentId === currentUserId)
      : reports;
    const scores = relevantReports.filter(r => r.quizScore !== undefined).map(r => r.quizScore as number);
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '---';
  }, [reports, role, currentUserId]);

  const todayDayOfWeek = new Date().getDay();
  
  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    return (interviewSlots || [])
      .filter(s => {
        const isParticipant = role === 'admin' || s.interviewerId === currentUserId || s.studentId === (currentUserStudent?.id || currentUserId);
        const isBooked = s.status === 'booked' || s.status === 'confirmed';
        const isFuture = new Date(s.date) >= new Date(now.setHours(0,0,0,0));
        return isParticipant && isBooked && isFuture;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 3);
  }, [interviewSlots, role, currentUserId, currentUserStudent]);

  const myTimetable = useMemo(() => {
    const safeTimetable = timetable || [];
    if (isAdmin) return [...safeTimetable].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    if (role === 'instructor') return safeTimetable.filter(t => t.instructorId === currentUserId).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    const sid = currentUserStudent?.id || currentUserId;
    return safeTimetable.filter(t => t.studentId === sid || (t.studentIds && t.studentIds.includes(sid))).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  }, [timetable, currentUserId, isAdmin, role, currentUserStudent]);

  const currentSubjectList = isHS ? HS_SUBJECTS : JHS_SUBJECTS;

  const myRecentLogs = useMemo(() => {
    if (isPrivileged) return [];
    const sid = currentUserStudent?.id || currentUserId;
    const myTimetableIds = (timetable || [])
      .filter(t => t.studentId === sid || (t.studentIds && t.studentIds.includes(sid)))
      .map(t => t.id);
    
    return (groupLessonLogs || [])
      .filter(l => myTimetableIds.includes(l.timetableId))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [groupLessonLogs, timetable, currentUserId, currentUserStudent, isPrivileged]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter">{isAdmin ? '管理者ダッシュボード' : isPrivileged ? '講師ダッシュボード' : 'STUDY BASE'}</h2>
          <p className="text-[11px] md:text-sm text-slate-500 font-medium italic">{isAdmin ? '校舎全体の稼働状況を一括管理' : '継続は、やがて自信に変わる。'}</p>
        </div>
      </header>

      {showAnnouncement && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] shadow-sm animate-fadeIn flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">📢</div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">《お知らせ》</h4>
            <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{adminConfig.announcement}</p>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${role === 'parent' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5 md:gap-6`}>
        {!isPrivileged ? (
          <>
            <div className="bg-white p-7 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 relative z-10">Class Ranking</p>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-[10px] font-black text-slate-400">第</span>
                <span className="text-5xl font-black text-slate-800">{myStats.rank}</span>
                <span className="text-lg font-bold text-slate-400">位</span>
              </div>
              <div className="mt-4 flex items-center gap-2 relative z-10">
                <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase">👑 Top: {topStats.hours}h</span>
                {myStats.rank === 1 ? (
                  <span className="text-[9px] font-black text-emerald-500">あなたがトップです！</span>
                ) : (
                  <span className="text-[9px] font-black text-slate-400">あと {(parseFloat(topStats.hours) - parseFloat(myStats.hours)).toFixed(1)}h</span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-indigo-950 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative group overflow-hidden border border-white/10 h-[140px]">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em]">Target 1</p>
                  {isStudent && (
                    <button onClick={() => isEditingCountdown ? handleSaveTargets() : setIsEditingCountdown(true)} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditingCountdown ? '✓' : '✎'}
                    </button>
                  )}
                </div>
                {isEditingCountdown && isStudent ? (
                  <div className="space-y-2 z-10">
                    <input type="text" value={target1Label} onChange={(e) => setTarget1Label(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none" placeholder="目標名" />
                    <input type="date" value={target1DateStr} onChange={(e) => setTarget1DateStr(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none" />
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{diffDays1}</span>
                      <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Days</span>
                    </div>
                    <p className="text-[11px] text-indigo-100 font-black truncate mt-1">{target1Label}</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-800 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center relative group overflow-hidden border border-white/10 h-[140px]">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target 2</p>
                </div>
                {isEditingCountdown && isStudent ? (
                  <div className="space-y-2 z-10">
                    <input type="text" value={target2Label} onChange={(e) => setTarget2Label(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none" placeholder="目標名" />
                    <input type="date" value={target2DateStr} onChange={(e) => setTarget2DateStr(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-1 text-[11px] text-white outline-none" />
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">{diffDays2}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Days</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-black truncate mt-1">{target2Label}</p>
                  </div>
                )}
              </div>
            </div>
            {isStudent && (
              <div className="bg-slate-900 p-7 md:p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col relative overflow-hidden border border-white/5">
                <div className="flex justify-between items-start mb-4 z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Focus Timer</p>
                  <div className="flex bg-white/10 p-1 rounded-xl">
                    <button onClick={() => setTimerMode('up')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${timerMode === 'up' ? 'bg-indigo-600 text-white' : 'text-slate-50'}`}>UP</button>
                    <button onClick={() => setTimerMode('down')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${timerMode === 'down' ? 'bg-indigo-600 text-white' : 'text-slate-50'}`}>DOWN</button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-6 z-[20]">
                  <span className={`text-6xl font-mono font-black tracking-tighter ${timerSeconds === 0 && timerMode === 'down' ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>{formatTime(timerSeconds)}</span>
                  <div className="w-full space-y-4">
                    <div className="grid grid-cols-5 gap-1.5">
                      {[25, 45, 60, 75, 90].map(m => (
                        <button key={m} onClick={() => handleSetTimer(m)} className="bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-[11px] font-black transition-all border border-white/5">{m}m</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1 group">
                        <input type="number" value={customMins} onChange={(e) => setCustomMins(e.target.value)} placeholder="分を入力" className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-indigo-500 transition-all" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">Min</span>
                      </div>
                      <button onClick={() => handleSetTimer(parseInt(customMins) || 0)} className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-xl text-[12px] font-black shadow-lg">設定</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full justify-center">
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`flex-1 py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 border-2 ${isTimerRunning ? 'bg-rose-50 border-rose-400/50 text-rose-600' : 'bg-indigo-600 border-indigo-500 text-white'}`}>
                      {isTimerRunning ? <span className="text-xl font-black">PAUSE</span> : <span className="text-xl font-black">START</span>}
                    </button>
                    <button onClick={() => { setTimerSeconds(0); setIsTimerRunning(false); }} className="w-14 py-4 rounded-2xl bg-white/10 flex items-center justify-center text-xs text-slate-400 border border-white/10 font-black">RESET</button>
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
          <h3 className="text-xl font-black flex items-center gap-2"><span className="text-2xl">🗓️</span>{isAdmin ? '校舎全スケジュール' : isPrivileged ? '授業スケジュール' : '通塾スケジュール'}</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly View</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 0].map(day => {
            const dayItems = myTimetable.filter(t => t.dayOfWeek === day);
            return (
              <div key={day} className={`flex flex-col h-full rounded-2xl p-3 ${day === todayDayOfWeek ? 'bg-indigo-50 ring-2 ring-indigo-500/20 shadow-sm' : 'bg-slate-50'}`}>
                <span className={`text-center text-[11px] font-black mb-2 ${day === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{DAY_NAMES_JP[day]}</span>
                <div className="space-y-2 flex-1">
                  {dayItems.length === 0 ? (<div className="h-full flex items-center justify-center opacity-20"><span className="text-[10px] font-bold">---</span></div>) : 
                    dayItems.map(item => (
                      <div key={item.id} className={`p-2 rounded-xl shadow-sm border flex flex-col items-center text-center ${item.lessonType === 'group' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                        <span className={`text-[8px] font-black leading-none mb-1 uppercase ${item.lessonType === 'group' ? 'text-emerald-600' : 'text-indigo-500'}`}>{item.startTime}</span>
                        <span className="text-[10px] font-black text-slate-800 leading-tight">{item.subject}</span>
                        {item.lessonType === 'group' ? (
                          <div className="mt-1 flex flex-col gap-0.5 leading-none overflow-hidden border-t border-emerald-100 pt-1">
                            <span className="text-[7px] text-emerald-700 font-black truncate w-full">{item.groupName || '集団授業'}</span>
                            {isAdmin && (<span className="text-[6px] text-emerald-500 font-bold truncate w-full mt-0.5">{instructors.find(i => i.id === item.instructorId)?.name}</span>)}
                          </div>
                        ) : (
                          (isAdmin || role === 'instructor') && (
                            <div className="mt-1 flex flex-col gap-0.5 leading-none overflow-hidden border-t border-slate-50 pt-1">
                              <span className="text-[7px] text-slate-500 font-bold truncate w-full">{students.find(s => s.id === item.studentId)?.name}</span>
                              <span className="text-[6px] text-slate-400 font-medium truncate w-full">{students.find(s => s.id === item.studentId)?.grade}</span>
                              {isAdmin && (<span className="text-[6px] text-indigo-300 font-bold truncate w-full mt-0.5">{instructors.find(i => i.id === item.instructorId)?.name}</span>)}
                            </div>
                          )
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!isPrivileged && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800">学習記録</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Ranking: {myStats.rank}位
                    </span>
                    <p className="text-xs font-bold text-slate-400">{monday.toLocaleDateString('ja-JP')} 〜 {sunday.toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <button 
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-indigo-600 transition-all font-black border border-slate-100"
                    title="先週"
                  >
                    ←
                  </button>
                  {weekOffset !== 0 && (
                    <button 
                      onClick={() => setWeekOffset(0)}
                      className="px-4 py-2 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      今週
                    </button>
                  )}
                  <button 
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-indigo-600 transition-all font-black border border-slate-100"
                    title="翌週"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Your Total</p>
                    <p className="text-2xl font-black text-indigo-600">{weeklyTotalHours}<span className="text-xs font-normal ml-0.5 opacity-50">h</span></p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Top Score</p>
                    <p className="text-2xl font-black text-amber-500">{topStats.hours}<span className="text-xs font-normal ml-0.5 opacity-50">h</span></p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Class Rank</p>
                    <p className="text-2xl font-black text-slate-800">{myStats.rank}<span className="text-xs font-normal ml-0.5 opacity-50">位</span></p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${parseFloat(weeklyTotalHours) > 10 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                      {parseFloat(weeklyTotalHours) > 10 ? 'EXCELLENT' : 'KEEP GOING'}
                    </span>
                 </div>
              </div>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dateLabel" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" iconSize={4} wrapperStyle={{ paddingTop: '20px', fontSize: '8px' }} />
                    {/* 設定されている全科目を動的に描画 */}
                    {Object.entries(SUBJECT_CONFIG).map(([sub, config]) => (
                      <Bar key={sub} dataKey={sub} name={config.label} fill={config.color} stackId="a" barSize={14} />
                    ))}
                    {/* StudyPlusの科目別データを描画 */}
                    {isStudent && students.find(s => s.id === (currentUserStudent?.id || currentUserId))?.studyPlusMinutes && 
                      Array.from(new Set(
                        Object.values(students.find(s => s.id === (currentUserStudent?.id || currentUserId))?.studyPlusMinutes || {})
                          .flatMap(subjects => Object.keys(subjects))
                      )).map(sub => (
                        <Bar key={`SP_${sub}`} dataKey={`SP_${sub}`} name={`SP:${sub}`} fill="#10b981" stackId="a" barSize={14} opacity={0.7} />
                      ))
                    }
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {weekOffset === 0 && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-4">学習内容を記録する</h4>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">科目 ({isHS ? '高校生モード' : '中学生モード'})</label>
                    <select 
                      value={logSubject} 
                      onChange={(e) => setLogSubject(e.target.value)} 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-500 outline-none font-bold shadow-sm transition-all"
                    >
                      {currentSubjectList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="w-full md:w-32"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">時間(分)</label>
                    <input 
                      type="number" 
                      value={logMinutes} 
                      onChange={(e) => setLogMinutes(e.target.value)} 
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-500 outline-none font-bold text-center shadow-sm transition-all" 
                    />
                  </div>
                  <button onClick={handleManualLog} className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95">記録を保存</button>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-8">
            {upcomingInterviews.length > 0 && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>🗓️</span> 次回の面談予定
                </h4>
                <div className="space-y-3">
                  {upcomingInterviews.map(slot => (
                    <div key={slot.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-400">{slot.date}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${slot.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {slot.status === 'confirmed' ? '確定' : '予約中'}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800">{slot.startTime} 〜 {slot.endTime}</p>
                      <p className="text-[10px] font-bold text-slate-500">
                        {role === 'student' || role === 'parent' ? `担当: ${slot.interviewerName}` : `対象: ${slot.studentName} 様`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {myRecentLogs.length > 0 && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>📝</span> 最近の授業ログ
                </h4>
                <div className="space-y-4">
                  {myRecentLogs.map(log => {
                    const lesson = timetable.find(t => t.id === log.timetableId);
                    return (
                      <div key={log.id} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-emerald-600">{log.date}</span>
                          <span className="text-[10px] font-black text-slate-400">{lesson?.subject}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-2">{log.content}</p>
                        {log.homework && (
                          <div className="mt-2 pt-2 border-t border-emerald-200/50">
                            <p className="text-[10px] text-slate-500"><span className="font-bold">宿題:</span> {log.homework}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {currentUserStudent?.weeklyInstructorMessage && (<div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-200 shadow-md"><h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2"><span>👨‍🏫</span> 講師からの言葉</h4><p className="text-sm font-bold text-slate-800 leading-relaxed italic">「{currentUserStudent.weeklyInstructorMessage}」</p></div>)}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-lg relative group">
              <h4 className="text-[10px] font-black text-indigo-100 uppercase mb-4 flex justify-between items-center">
                <span>Study Advisor</span>
                <div className="flex items-center gap-2">
                  {isGeneratingAdvice && <span className="animate-pulse text-[8px]">AI生成中...</span>}
                  <button 
                    onClick={() => fetchAdvice(true)} 
                    disabled={isGeneratingAdvice}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] transition-all"
                    title="アドバイスを更新"
                  >
                    🔄
                  </button>
                </div>
              </h4>
              <p className="text-[15px] font-bold leading-relaxed italic text-white drop-shadow-sm">
                {advisorMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
