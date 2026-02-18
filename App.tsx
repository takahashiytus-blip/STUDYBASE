
import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, Report, MockExam, Student, Instructor, TimetableEntry, StudySession, AdminConfig, ReportMessage } from './types';
import { MOCK_STUDENTS, MOCK_INSTRUCTORS, MOCK_REPORTS, MOCK_TIMETABLE } from './constants';
import { supabase, isSupabaseConfigured } from './services/supabase';
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
import MessageCenter from './components/MessageCenter';
import InstructorCenter from './components/InstructorCenter';

type AuthStep = 'role-selection' | 'credentials';

// 万が一DB取得に失敗した際の絶対的なフォールバック
const DEFAULT_ADMIN: AdminConfig = {
  name: '高橋 統括責任者',
  loginId: 'takahashi@koeikai.jp',
  passwordHash: 'password123',
  location: '埼玉県さいたま市',
  wordKingClassroomRecord: 124,
  wordKingClassroomHolder: '初代王'
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>('role-selection');
  const [loginRole, setLoginRole] = useState<UserRole>('student');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; id: string; name: string }>({
    role: 'student', id: '', name: ''
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  const [reports, setReports] = useState<Report[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(DEFAULT_ADMIN);

  // 全データ取得
  const fetchAllData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setReports(MOCK_REPORTS);
      setStudents(MOCK_STUDENTS);
      setInstructors(MOCK_INSTRUCTORS);
      setTimetable(MOCK_TIMETABLE);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // 1. Admin Config (同期の要)
      const { data: adminData, error: adminError } = await supabase.from('admin_config').select('*').eq('id', 1).maybeSingle();
      if (adminData && !adminError) {
        setAdminConfig({
          name: adminData.name,
          loginId: adminData.login_id,
          passwordHash: adminData.password_hash,
          location: adminData.location,
          wordKingClassroomRecord: adminData.word_king_record,
          wordKingClassroomHolder: adminData.word_king_holder
        });
      }

      // 2. Students
      const { data: studentData } = await supabase.from('students').select('*');
      if (studentData) {
        setStudents(studentData.map(s => ({
          id: s.id, name: s.name, grade: s.grade,
          loginId: s.login_id, password: s.password,
          targetSchool: s.target_school, targetFaculty: s.target_faculty,
          weeklyInstructorMessage: s.weekly_instructor_message,
          instructorIds: s.instructor_ids || []
        })));
      }

      // 3. Instructors
      const { data: instructorData } = await supabase.from('instructors').select('*');
      if (instructorData) {
        setInstructors(instructorData.map(i => ({
          id: i.id, name: i.name, specialty: i.specialty,
          loginId: i.login_id, password: i.password
        })));
      }

      // 4. Reports
      const { data: reportData } = await supabase.from('reports').select('*').order('date', { ascending: false });
      if (reportData) {
        setReports(reportData.map(r => ({
          id: r.id, studentId: r.student_id, date: r.date, subject: r.subject,
          instructorName: r.instructor_name, sessionYear: r.session_year,
          sessionMonth: r.session_month, sessionCount: r.session_count,
          attendanceStatus: r.attendance_status, rawNotes: r.raw_notes,
          homeworkAssigned: r.homework_assigned, homeworkCompletion: r.homework_completion,
          proposedSelfStudyDays: r.proposed_self_study_days, generatedContent: r.generated_content,
          quizScore: r.quiz_score, messages: r.messages || [], needsAction: r.needs_action
        })));
      }

      // 5. Mock Exams
      const { data: mockData } = await supabase.from('mock_exams').select('*');
      if (mockData) setMockExams(mockData.map(m => ({ ...m, studentId: m.student_id })));

      // 6. Timetable
      const { data: timetableData } = await supabase.from('timetable').select('*');
      if (timetableData) {
        setTimetable(timetableData.map(t => ({
          id: t.id, dayOfWeek: t.day_of_week, startTime: t.start_time,
          endTime: t.end_time, subject: t.subject, studentId: t.student_id,
          instructorId: t.instructor_id, room: t.room
        })));
      }

    } catch (err) {
      console.error("Supabase sync failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const updateAdminConfig = async (updates: Partial<AdminConfig>) => {
    const newConfig = { ...adminConfig, ...updates };
    setAdminConfig(newConfig);
    
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('admin_config').upsert({
          id: 1,
          name: newConfig.name,
          login_id: newConfig.loginId,
          password_hash: newConfig.passwordHash || adminConfig.passwordHash,
          location: newConfig.location,
          word_king_record: newConfig.wordKingClassroomRecord,
          word_king_holder: newConfig.wordKingClassroomHolder,
          updated_at: new Date().toISOString()
        });
      } catch (e) { console.error("Update adminConfig failed:", e); }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginRole === 'admin') {
      // DBから取得した設定値、またはデフォルト値を比較対象にする
      const targetLoginId = adminConfig.loginId || DEFAULT_ADMIN.loginId;
      const targetPassword = adminConfig.passwordHash || DEFAULT_ADMIN.passwordHash;

      if (loginId === targetLoginId && password === targetPassword) {
        setCurrentUser({ role: 'admin', id: 'admin', name: adminConfig.name });
        setIsAuthenticated(true);
        return;
      }
    } else if (loginRole === 'instructor') {
      const ins = instructors.find(i => i.loginId === loginId && i.password === password);
      if (ins) {
        setCurrentUser({ role: 'instructor', id: ins.id, name: ins.name });
        setIsAuthenticated(true);
        return;
      }
    } else {
      const std = students.find(s => s.loginId === loginId && s.password === password);
      if (std) {
        setCurrentUser({ role: loginRole, id: std.id, name: std.name });
        setIsAuthenticated(true);
        return;
      }
    }

    setLoginError('IDまたはパスワードが正しくありません。');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthStep('role-selection');
    setLoginId('');
    setPassword('');
    setLoginError('');
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black tracking-widest text-[10px] uppercase">Connecting to Study Base...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-slate-100 animate-fadeIn relative overflow-hidden">
          <div className="mb-10">
            <span className="text-[10px] font-black tracking-[0.4em] text-indigo-500 uppercase block mb-1">受験専門塾 学士館</span>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">STUDY <span className="text-indigo-600">BASE</span></h1>
            <div className="w-10 h-1 bg-indigo-500 mx-auto rounded-full opacity-20 mt-3"></div>
          </div>
          
          {authStep === 'role-selection' ? (
            <div className="space-y-4">
              <button 
                onClick={() => { setLoginRole('student'); setAuthStep('credentials'); }}
                className="w-full flex items-center justify-center gap-4 py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
              >
                <span className="text-2xl">🎒</span>
                生徒・保護者として入室
              </button>
              <button 
                onClick={() => { setLoginRole('instructor'); setAuthStep('credentials'); }}
                className="w-full flex items-center justify-center gap-4 py-6 bg-slate-800 text-white rounded-[2rem] font-black shadow-xl shadow-slate-200 hover:bg-slate-900 hover:-translate-y-1 transition-all active:scale-95"
              >
                <span className="text-2xl">👨‍🏫</span>
                講師として入室
              </button>
              
              <div className="pt-8">
                <button 
                  onClick={() => { setLoginRole('admin'); setAuthStep('credentials'); }}
                  className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-indigo-400 transition-colors"
                >
                  Admin Access
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-center gap-2 mb-6">
                <button 
                  onClick={() => setAuthStep('role-selection')}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm hover:bg-slate-200 transition-colors"
                >
                  ←
                </button>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  {loginRole === 'admin' ? '管理者' : loginRole === 'instructor' ? '講師' : '生徒・保護者'} ログイン
                </h2>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="ログインID"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all"
                    autoFocus
                    required
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all"
                    required
                  />
                </div>

                {loginError && <p className="text-[10px] font-bold text-rose-500">{loginError}</p>}

                <button 
                  type="submit"
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
                >
                  入室する
                </button>
              </form>
            </div>
          )}
          <p className="mt-10 text-[9px] text-slate-200 font-bold uppercase tracking-widest">Connected to Cloud DB</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            reports={reports} students={students} instructors={instructors}
            role={currentUser.role} mockExams={mockExams}
            currentUserStudent={students.find(s => s.id === currentUser.id)}
            currentUserId={currentUser.id} allSessions={allSessions}
            onLogSession={(s) => setAllSessions(prev => [...prev, s])}
            timetable={timetable} onUpdateTimetable={setTimetable}
          />
        );
      case 'create':
        return <ReportForm students={students} currentUser={currentUser} onSave={(r) => { setReports(prev => [r, ...prev]); setActiveTab('dashboard'); }} />;
      case 'reports':
        return <ReportList reports={reports} students={students} currentUser={currentUser} onAddMessage={() => {}} onDeleteMessage={() => {}} onMarkResolved={() => {}} />;
      case 'students':
        return <StudentCenter students={students} reports={reports} allSessions={allSessions} currentUser={currentUser} onAddMessage={() => {}} onDeleteMessage={() => {}} onMarkResolved={() => {}} />;
      case 'timetable':
        return <TimetableManager timetable={timetable} students={students} instructors={instructors} onUpdate={setTimetable} />;
      case 'settings':
        return <AdminSettings adminConfig={adminConfig} onUpdate={updateAdminConfig} />;
      default:
        return null;
    }
  };

  return (
    <Layout 
      role={currentUser.role} userName={currentUser.name} 
      onLogout={handleLogout} activeTab={activeTab}
      setActiveTab={setActiveTab} reports={reports}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
