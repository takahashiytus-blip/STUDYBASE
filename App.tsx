
import React, { useState, useEffect } from 'react';
import { AppState, UserRole, Report, MockExam, Student, Instructor, TimetableEntry, StudySession, AdminConfig, ReportMessage } from './types';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { MOCK_STUDENTS, MOCK_INSTRUCTORS, MOCK_REPORTS, MOCK_TIMETABLE } from './constants';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import StudentCenter from './components/StudentCenter';
import SalaryCenter from './components/SalaryCenter';
import InterviewCenter from './components/InterviewCenter';
import MockExamCenter from './components/MockExamCenter';
import WordKing from './components/WordKing';
import TimetableManager from './components/TimetableManager';
import AdminSettings from './components/AdminSettings';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ email: '', password: '', newPassword: '' });
  const [authError, setAuthError] = useState('');
  const [loginView, setLoginView] = useState<'login' | 'reset' | 'update-password'>('login');
  const [resetSent, setResetSent] = useState(false);

  // 管理者メールアドレスの定数
  const ADMIN_EMAIL = 'takahashi@koeikai.jp';

  const [state, setState] = useState<AppState>({
    currentUser: { role: 'student', id: '', name: '' },
    students: [],
    instructors: [],
    reports: [],
    mockExams: [],
    adminConfig: { 
      name: '学士館 統括室', 
      loginId: ADMIN_EMAIL, 
      location: '東京都杉並区', 
      wordKingClassroomRecord: 124, 
      wordKingClassroomHolder: '初代王' 
    }
  });

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  useEffect(() => {
    const initApp = async () => {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase!.auth.getSession();
      if (session) {
        await handleAuthSession(session);
      } else {
        setIsLoading(false);
      }
    };

    initApp();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setLoginView('update-password');
        } else if (session) {
          await handleAuthSession(session);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleAuthSession = async (session: any) => {
    const userId = session.user.id;
    const email = session.user.email;
    setIsLoading(true);

    try {
      const { data: admin } = await supabase!.from('admin_config').select('*').eq('login_id', email).maybeSingle();
      if (admin) {
        setState(prev => ({ 
          ...prev, 
          currentUser: { role: 'admin', id: userId, name: admin.name }, 
          adminConfig: { ...admin, loginId: admin.login_id, wordKingClassroomRecord: admin.word_king_classroom_record, wordKingClassroomHolder: admin.word_king_classroom_holder } 
        }));
        setIsAuthenticated(true);
        await refreshAllData();
        return;
      }

      const { data: instructor } = await supabase!.from('instructors').select('*').eq('id', userId).maybeSingle();
      if (instructor) {
        setState(prev => ({ ...prev, currentUser: { role: 'instructor', id: userId, name: instructor.name } }));
        setIsAuthenticated(true);
        await refreshAllData();
        return;
      }

      const { data: student } = await supabase!.from('students').select('*').eq('id', userId).maybeSingle();
      if (student) {
        setState(prev => ({ ...prev, currentUser: { role: 'student', id: userId, name: student.name } }));
        setIsAuthenticated(true);
        await refreshAllData();
        return;
      }

      setAuthError(`DB未登録：${email} は管理テーブルに見つかりません。`);
      await supabase!.auth.signOut();
    } catch (e) {
      setAuthError('データ照合中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (isDemoMode || !supabase) return;
    try {
      const [r, m, s, i, sess, tt] = await Promise.all([
        supabase.from('reports').select('*').order('date', { ascending: false }),
        supabase.from('mock_exams').select('*'),
        supabase.from('students').select('*'),
        supabase.from('instructors').select('*'),
        supabase.from('study_sessions').select('*'),
        supabase.from('timetable').select('*')
      ]);
      // Fixed: mapping snake_case from DB to camelCase properties required by types.ts
      setState(prev => ({
        ...prev,
        reports: (r.data || []).map(item => ({ 
          ...item, 
          studentId: item.student_id, 
          sessionYear: item.session_year, 
          sessionMonth: item.session_month, 
          sessionCount: item.session_count, 
          attendanceStatus: item.attendance_status, 
          rawNotes: item.raw_notes, 
          homeworkAssigned: item.homework_assigned, 
          homeworkCompletion: item.homework_completion, 
          proposedSelfStudyDays: item.proposed_self_study_days, 
          generatedContent: item.generated_content, 
          quizScore: item.quiz_score, 
          needsAction: item.needs_action 
        })),
        mockExams: (m.data || []).map(ex => ({ ...ex, studentId: ex.student_id, examName: ex.exam_name, examDate: ex.exam_date })),
        students: (s.data || []).map(item => ({ 
          ...item, 
          targetSchool: item.target_school, 
          targetFaculty: item.target_faculty, 
          weeklyInstructorMessage: item.weekly_instructor_message, 
          instructorIds: item.instructor_ids || [] 
        })),
        instructors: i.data || []
      }));
      setSessions((sess.data || []).map(ss => ({ ...ss, studentId: ss.student_id })));
      setTimetable((tt.data || []).map(entry => ({ ...entry, dayOfWeek: entry.day_of_week, startTime: entry.start_time, endTime: entry.end_time, studentId: entry.student_id, instructorId: entry.instructor_id })));
    } catch (e) { console.error(e); }
  };

  const startDemoMode = (targetRole: UserRole) => {
    setIsDemoMode(true);
    setIsLoading(true);
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentUser: { 
          role: targetRole, 
          id: targetRole === 'admin' ? 'demo-admin' : targetRole === 'instructor' ? 'i1' : 's1', 
          name: targetRole === 'admin' ? '高橋 管理者' : targetRole === 'instructor' ? '山田 講師' : '田中 太郎' 
        },
        students: MOCK_STUDENTS,
        instructors: MOCK_INSTRUCTORS,
        reports: MOCK_REPORTS
      }));
      setTimetable(MOCK_TIMETABLE);
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 500);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');

    // Supabaseが未設定の場合は、入力内容を見てデモモードへ自動移行
    if (!isSupabaseConfigured) {
      const email = loginForm.email;
      if (email === ADMIN_EMAIL) {
        startDemoMode('admin');
      } else if (email.includes('instructor')) {
        startDemoMode('instructor');
      } else if (email.includes('student') || email.includes('parent')) {
        startDemoMode('student');
      } else {
        setAuthError(`オフライン：'${ADMIN_EMAIL}' かデモ用IDを入力してください。`);
      }
      return;
    }

    setIsLoading(true);
    const { error } = await supabase!.auth.signInWithPassword({ 
      email: loginForm.email, 
      password: loginForm.password 
    });
    
    if (error) {
      setAuthError(`認証エラー：${error.message === 'Invalid login credentials' ? 'IDまたはパスワードが違います。' : error.message}`);
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: loginForm.newPassword });
    setIsLoading(false);
    if (error) setAuthError(`更新エラー: ${error.message}`);
    else {
      alert('パスワードを更新しました。再度ログインしてください。');
      setLoginView('login');
      await supabase.auth.signOut();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthError('');
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginForm.email, {
      redirectTo: window.location.origin,
    });
    setIsLoading(false);
    if (error) setAuthError(`送信失敗: ${error.message}`);
    else setResetSent(true);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse flex-col gap-4">
    <div className="text-4xl italic">Study<span className="text-indigo-400">Base</span></div>
    <div className="text-[10px] uppercase tracking-[0.3em] opacity-50 text-indigo-300">Loading System...</div>
  </div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-white text-5xl font-black italic tracking-tighter">学士館</h1>
            {!isSupabaseConfigured && (
              <div className="mt-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-indigo-400 text-[9px] font-bold text-center uppercase tracking-widest leading-relaxed">
                  Local Mode Active<br/>
                  <span className="opacity-60 font-normal">Database not connected</span>
                </p>
              </div>
            )}
          </div>

          {loginView === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Email Address</label>
                <input type="email" placeholder={ADMIN_EMAIL} required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition-all placeholder:opacity-30" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Password</label>
                  {isSupabaseConfigured && <button type="button" onClick={() => setLoginView('reset')} className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300">Forgot?</button>}
                </div>
                <input type="password" placeholder="••••••••" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
              </div>
              {authError && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl"><p className="text-rose-400 text-[10px] text-center font-bold leading-relaxed">{authError}</p></div>}
              <button type="submit" className="w-full bg-indigo-500 py-4 rounded-xl text-white font-black shadow-lg hover:bg-indigo-400 transition-all active:scale-95">
                {isSupabaseConfigured ? 'Sign In' : 'Sign In (Local)'}
              </button>
            </form>
          ) : loginView === 'reset' ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-white font-bold">Password Reset</h2>
                <p className="text-white/40 text-[10px]">登録済みのメールにリンクを送信します。</p>
              </div>
              {resetSent ? (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-4">
                  <p className="text-emerald-400 text-xs font-bold">メールを送信しました！</p>
                  <button type="button" onClick={() => { setLoginView('login'); setResetSent(false); }} className="text-[10px] font-black text-white bg-emerald-500 px-6 py-2 rounded-lg">戻る</button>
                </div>
              ) : (
                <>
                  <input type="email" placeholder="email@koeikai.jp" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition-all" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
                  {authError && <p className="text-rose-400 text-[10px] text-center font-bold">{authError}</p>}
                  <button type="submit" className="w-full bg-indigo-500 py-4 rounded-xl text-white font-black">Send Reset Link</button>
                  <button type="button" onClick={() => setLoginView('login')} className="w-full text-white/40 text-[10px] font-bold">Back</button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <h2 className="text-white font-bold text-center">New Password</h2>
              <input type="password" placeholder="New Password" required minLength={6} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none" value={loginForm.newPassword} onChange={e => setLoginForm({...loginForm, newPassword: e.target.value})} />
              <button type="submit" className="w-full bg-emerald-500 py-4 rounded-xl text-white font-black">Update</button>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center mb-4">Quick Demo Access</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => startDemoMode('admin')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-[11px] font-bold text-white transition-all">高橋 管理者として入室</button>
              <button onClick={() => startDemoMode('instructor')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-[11px] font-bold text-white transition-all">山田 講師として入室</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPrivileged = state.currentUser.role === 'instructor' || state.currentUser.role === 'admin';
  const filteredReports = isPrivileged ? state.reports : state.reports.filter(r => r.studentId === state.currentUser.id);

  return (
    <Layout role={state.currentUser.role} userName={state.currentUser.name} onLogout={() => isDemoMode ? setIsAuthenticated(false) : supabase!.auth.signOut()} activeTab={activeTab} setActiveTab={setActiveTab} reports={state.reports}>
      {isDemoMode && <div className="bg-indigo-600 text-white text-[9px] font-black py-1 px-4 text-center fixed top-0 left-0 right-0 z-[100] md:left-64 shadow-md">LOCAL MODE: Using local simulation data</div>}
      {activeTab === 'dashboard' && <Dashboard reports={filteredReports} students={state.students} instructors={state.instructors} role={state.currentUser.role} currentUserId={state.currentUser.id} allSessions={sessions} onLogSession={async (s) => { if (isDemoMode) setSessions([...sessions, s]); else await supabase!.from('study_sessions').insert([{ id: s.id, student_id: s.studentId, date: s.date, subject: s.subject, minutes: s.minutes }]); refreshAllData(); }} timetable={timetable} onUpdateTimetable={() => {}} />}
      {/* Fixed: corrected snake_case property access in insertion to camelCase as per Report interface */}
      {activeTab === 'create' && isPrivileged && <ReportForm students={state.students} currentUser={state.currentUser} onSave={async(r) => { if (isDemoMode) setState({ ...state, reports: [r, ...state.reports] }); else await supabase!.from('reports').insert([{ id: r.id, student_id: r.studentId, date: r.date, subject: r.subject, instructor_name: r.instructorName, session_year: r.sessionYear, session_month: r.sessionMonth, session_count: r.sessionCount, attendance_status: r.attendanceStatus, raw_notes: r.rawNotes, homework_assigned: r.homeworkAssigned, homework_completion: r.homeworkCompletion, proposed_self_study_days: r.proposedSelfStudyDays, generated_content: r.generatedContent, quiz_score: r.quizScore }]); refreshAllData(); setActiveTab('dashboard'); }} />}
      {activeTab === 'reports' && <ReportList reports={filteredReports} students={state.students} currentUser={state.currentUser} onAddMessage={async(rid, text) => { const report = state.reports.find(r => r.id === rid); if (!report) return; const msg = { id: Math.random().toString(36).substr(2, 9), senderId: state.currentUser.id, senderName: state.currentUser.name, senderRole: state.currentUser.role, text, timestamp: new Date().toLocaleString() }; if (isDemoMode) setState({ ...state, reports: state.reports.map(r => r.id === rid ? { ...r, messages: [...(r.messages || []), msg] } : r) }); else await supabase!.from('reports').update({ messages: [...(report.messages || []), msg] }).eq('id', rid); refreshAllData(); }} onDeleteMessage={() => {}} onMarkResolved={() => {}} />}
      {activeTab === 'students' && isPrivileged && <StudentCenter students={state.students} reports={state.reports} allSessions={sessions} currentUser={state.currentUser} onAddMessage={()=>{}} onDeleteMessage={()=>{}} onMarkResolved={()=>{}} onUpdateStudent={async(sid, updates)=>{ if (isDemoMode) setState({ ...state, students: state.students.map(s => s.id === sid ? { ...s, ...updates } : s) }); else await supabase!.from('students').update({ target_school: updates.targetSchool, target_faculty: updates.targetFaculty, weekly_instructor_message: updates.weeklyInstructorMessage }).eq('id', sid); refreshAllData(); }} />}
      {activeTab === 'interview' && isPrivileged && <InterviewCenter students={state.students} reports={state.reports} mockExams={state.mockExams} adminConfig={state.adminConfig} />}
      {activeTab === 'word-king' && <WordKing classroomBest={state.adminConfig.wordKingClassroomRecord} classroomHolder={state.adminConfig.wordKingClassroomHolder} onNewClassroomRecord={async(s,h)=>{ if (isDemoMode) setState({ ...state, adminConfig: { ...state.adminConfig, wordKingClassroomRecord: s, wordKingClassroomHolder: h } }); else await supabase!.from('admin_config').update({word_king_classroom_record:s, word_king_classroom_holder:h}).eq('id',1); refreshAllData(); }} />}
    </Layout>
  );
};

export default App;
