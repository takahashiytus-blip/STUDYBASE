import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, Report, MockExam, Student, Instructor, TimetableEntry, StudySession, AdminConfig, ReportMessage, IQResult } from './types';
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
import IQTest from './components/IQTest';
import TimetableManager from './components/TimetableManager';
import AdminSettings from './components/AdminSettings';
import MessageCenter from './components/MessageCenter';
import InstructorCenter from './components/InstructorCenter';

type AuthStep = 'role-selection' | 'credentials';

const DEFAULT_ADMIN: AdminConfig = {
  name: '高橋 統括責任者',
  loginId: 'takahashi@koeikai.jp',
  passwordHash: 'password123',
  location: '埼玉県さいたま市',
  wordKingClassroomRecord: 124,
  wordKingClassroomHolder: '初代王'
};

/**
 * タイムゾーンセーフな日付取得 (YYYY-MM-DD)
 * ブラウザの基本設定がUTCであっても、常に日本時間ベースで正確な日付を返す
 */
export const getLocalISOString = () => {
  const now = new Date();
  // 日本時間にオフセット調整
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 安全な日付オブジェクトの生成
 * new Date('YYYY-MM-DD') はSafari等でUTCの午前0時と解釈され、表示が1日前になるバグを防ぐ
 */
export const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return new Date();
  // 第4引数以降を指定しないことでローカル時刻の00:00:00として生成
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// ユニークID生成 (タイムスタンプとランダム文字列の組み合わせ)
export const generateUniqueId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>('role-selection');
  const [loginRole, setLoginRole] = useState<UserRole>('student');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  
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

  // データ保存の信頼性向上
  useEffect(() => { if (!isLoading && isAuthenticated) localStorage.setItem('sb_data_reports', JSON.stringify(reports)); }, [reports, isLoading, isAuthenticated]);
  useEffect(() => { if (!isLoading && isAuthenticated) localStorage.setItem('sb_data_students', JSON.stringify(students)); }, [students, isLoading, isAuthenticated]);
  useEffect(() => { if (!isLoading && isAuthenticated) localStorage.setItem('sb_data_instructors', JSON.stringify(instructors)); }, [instructors, isLoading, isAuthenticated]);
  useEffect(() => { if (!isLoading && isAuthenticated) localStorage.setItem('sb_data_sessions', JSON.stringify(allSessions)); }, [allSessions, isLoading, isAuthenticated]);
  useEffect(() => { if (!isLoading && isAuthenticated) localStorage.setItem('sb_data_timetable', JSON.stringify(timetable)); }, [timetable, isLoading, isAuthenticated]);
  useEffect(() => { if (!isLoading && isAuthenticated) localStorage.setItem('sb_data_mockExams', JSON.stringify(mockExams)); }, [mockExams, isLoading, isAuthenticated]);

  const fetchAllData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const localReports = localStorage.getItem('sb_data_reports');
      const localStudents = localStorage.getItem('sb_data_students');
      const localInstructors = localStorage.getItem('sb_data_instructors');
      const localTimetable = localStorage.getItem('sb_data_timetable');
      const localMockExams = localStorage.getItem('sb_data_mockExams');
      const localSessions = localStorage.getItem('sb_data_sessions');
      const savedAdmin = localStorage.getItem('study_base_admin_config');

      setReports(localReports ? JSON.parse(localReports) : MOCK_REPORTS);
      setStudents(localStudents ? JSON.parse(localStudents) : MOCK_STUDENTS);
      setInstructors(localInstructors ? JSON.parse(localInstructors) : MOCK_INSTRUCTORS);
      setTimetable(localTimetable ? JSON.parse(localTimetable) : MOCK_TIMETABLE);
      setMockExams(localMockExams ? JSON.parse(localMockExams) : []);
      setAllSessions(localSessions ? JSON.parse(localSessions) : []);
      if (savedAdmin) setAdminConfig(JSON.parse(savedAdmin));
      
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data: adminData } = await supabase.from('admin_config').select('*').eq('id', 1).maybeSingle();
      if (adminData) {
        setAdminConfig({
          id: adminData.id, 
          name: adminData.name, 
          loginId: adminData.login_id || adminData.loginId,
          passwordHash: adminData.password_hash || adminData.passwordHash || DEFAULT_ADMIN.passwordHash,
          location: adminData.location, 
          wordKingClassroomRecord: adminData.word_king_record ?? adminData.wordKingClassroomRecord ?? 0,
          wordKingClassroomHolder: adminData.word_king_holder || adminData.wordKingClassroomHolder || '---'
        });
      }

      const { data: studentData } = await supabase.from('students').select('*');
      if (studentData) {
        setStudents(studentData.map(s => ({
          id: s.id, name: s.name, grade: s.grade, 
          loginId: s.login_id || s.loginId, 
          password: s.password,
          targetSchool: s.target_school || s.targetSchool, 
          targetFaculty: s.target_faculty || s.targetFaculty,
          weeklyInstructorMessage: s.weekly_instructor_message || s.weeklyInstructorMessage, 
          instructorIds: s.instructor_ids || s.instructorIds || [],
          iqHistory: s.iq_history || s.iqHistory || [],
          wordKingBest: s.word_king_best || s.wordKingBest || 0,
          targets: s.targets || undefined
        })));
      }

      const { data: instructorData } = await supabase.from('instructors').select('*');
      if (instructorData) setInstructors(instructorData.map(i => ({ 
        id: i.id, name: i.name, specialty: i.specialty, 
        loginId: i.login_id || i.loginId, 
        password: i.password 
      })));

      const { data: reportData } = await supabase.from('reports').select('*').order('date', { ascending: false });
      if (reportData) setReports(reportData.map(r => ({
        id: r.id, 
        studentId: r.student_id || r.studentId, 
        date: r.date, 
        subject: r.subject, 
        instructorName: r.instructor_name || r.instructorName,
        sessionYear: r.session_year || r.sessionYear, 
        sessionMonth: r.session_month || r.sessionMonth, 
        sessionCount: r.session_count || r.sessionCount,
        attendanceStatus: r.attendance_status || r.attendanceStatus, 
        rawNotes: r.raw_notes || r.rawNotes, 
        homeworkAssigned: r.homework_assigned || r.homeworkAssigned,
        homeworkCompletion: r.homework_completion || r.homeworkCompletion, 
        proposedSelfStudyDays: r.proposed_self_study_days || r.proposedSelfStudyDays,
        generatedContent: r.generated_content || r.generatedContent, 
        quizScore: r.quiz_score || r.quizScore, 
        messages: r.messages || [], 
        needsAction: r.needs_action || r.needsAction
      })));

      const { data: mockData } = await supabase.from('mock_exams').select('*');
      if (mockData) setMockExams(mockData.map(m => ({ 
        id: m.id, 
        studentId: m.student_id || m.studentId, 
        examName: m.exam_name || m.examName, 
        examDate: m.exam_date || m.examDate, 
        scores: m.scores || {} 
      })));

      const { data: timetableData } = await supabase.from('timetable').select('*');
      if (timetableData) setTimetable(timetableData.map(t => ({ 
        id: t.id, 
        dayOfWeek: t.day_of_week || t.dayOfWeek, 
        startTime: t.start_time || t.startTime, 
        endTime: t.end_time || t.endTime, 
        subject: t.subject, 
        studentId: t.student_id || t.studentId, 
        instructorId: t.instructor_id || t.instructorId, 
        room: t.room 
      })));

      const { data: sessionData } = await supabase.from('study_sessions').select('*');
      if (sessionData) setAllSessions(sessionData.map(s => ({ 
        id: s.id, 
        studentId: s.student_id || s.studentId, 
        date: s.date, 
        subject: s.subject, 
        minutes: s.minutes 
      })));

    } catch (err) {
      console.error("Critical Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRole === 'admin' && loginId === adminConfig.loginId && password === adminConfig.passwordHash) {
      setCurrentUser({ role: 'admin', id: 'admin', name: adminConfig.name });
      setIsAuthenticated(true);
    } else if (loginRole === 'instructor') {
      const ins = instructors.find(i => i.loginId === loginId && i.password === password);
      if (ins) { setCurrentUser({ role: 'instructor', id: ins.id, name: ins.name }); setIsAuthenticated(true); }
    } else {
      const std = students.find(s => s.loginId === loginId && s.password === password);
      if (std) { setCurrentUser({ role: loginRole, id: std.id, name: std.name }); setIsAuthenticated(true); }
    }
  };

  const handleLogout = () => { setIsAuthenticated(false); setAuthStep('role-selection'); setActiveTab('dashboard'); };

  const handleUpdateAdminConfig = async (updates: Partial<AdminConfig>) => {
    setAdminConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('study_base_admin_config', JSON.stringify(next));
      if (isSupabaseConfigured && supabase) {
        // Fix: Changed next.word_king_record and next.word_king_holder to next.wordKingClassroomRecord and next.wordKingClassroomHolder to match AdminConfig interface
        supabase.from('admin_config').update({
          name: next.name, 
          login_id: next.loginId, 
          password_hash: next.passwordHash,
          location: next.location, 
          word_king_record: next.wordKingClassroomRecord,
          word_king_holder: next.wordKingClassroomHolder
        }).eq('id', 1).then();
      }
      return next;
    });
  };

  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (isSupabaseConfigured && supabase) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.grade !== undefined) dbUpdates.grade = updates.grade;
      if (updates.targetSchool !== undefined) dbUpdates.target_school = updates.targetSchool;
      if (updates.targetFaculty !== undefined) dbUpdates.target_faculty = updates.targetFaculty;
      if (updates.weeklyInstructorMessage !== undefined) dbUpdates.weekly_instructor_message = updates.weeklyInstructorMessage;
      if (updates.loginId !== undefined) dbUpdates.login_id = updates.loginId;
      if (updates.password !== undefined) dbUpdates.password = updates.password;
      if (updates.iqHistory !== undefined) dbUpdates.iq_history = updates.iqHistory;
      if (updates.wordKingBest !== undefined) dbUpdates.word_king_best = updates.wordKingBest;
      if (updates.targets !== undefined) dbUpdates.targets = updates.targets;
      if (updates.instructorIds !== undefined) dbUpdates.instructor_ids = updates.instructorIds;
      if (Object.keys(dbUpdates).length > 0) await supabase.from('students').update(dbUpdates).eq('id', id);
    }
  };

  const handleLogSession = async (session: StudySession) => {
    setAllSessions(prev => [...prev, session]);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('study_sessions').insert({
        id: session.id, student_id: session.studentId, date: session.date,
        subject: session.subject, minutes: session.minutes
      });
    }
  };

  const handleSaveReport = async (report: Report) => {
    setReports(prev => [report, ...prev]);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('reports').insert({
        id: report.id, student_id: report.studentId, date: report.date, subject: report.subject, instructor_name: report.instructorName,
        session_year: report.sessionYear, session_month: report.sessionMonth, session_count: report.sessionCount,
        attendance_status: report.attendanceStatus, raw_notes: report.rawNotes, homework_assigned: report.homeworkAssigned,
        homework_completion: report.homeworkCompletion, proposed_self_study_days: report.proposedSelfStudyDays,
        // Fix: Use camelCase needsAction property correctly from the Report object
        generated_content: report.generatedContent, quiz_score: report.quizScore, messages: report.messages || [], needs_action: report.needsAction || false
      });
    }
  };

  const handleUpdateReport = async (reportId: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
    if (isSupabaseConfigured && supabase) {
      const dbUpdates: any = {};
      if (updates.messages !== undefined) dbUpdates.messages = updates.messages;
      if (updates.needsAction !== undefined) dbUpdates.needs_action = updates.needsAction;
      if (updates.generatedContent !== undefined) dbUpdates.generated_content = updates.generatedContent;
      if (Object.keys(dbUpdates).length > 0) await supabase.from('reports').update(dbUpdates).eq('id', reportId);
    }
  };

  const handleUpdateTimetable = async (newTimetable: TimetableEntry[]) => {
    setTimetable(newTimetable);
    if (isSupabaseConfigured && supabase) {
       await supabase.from('timetable').delete().neq('id', 'dummy_placeholder');
       const insertData = newTimetable.map(t => ({
         id: t.id, day_of_week: t.dayOfWeek, start_time: t.startTime, end_time: t.endTime,
         subject: t.subject, student_id: t.studentId, instructor_id: t.instructorId, room: t.room
       }));
       if (insertData.length > 0) await supabase.from('timetable').insert(insertData);
    }
  };

  const handleSaveIQ = async (score: number, breakdown: any, analysis: string) => {
    if (currentUser.role !== 'student') return;
    const newIQ: IQResult = {
      id: generateUniqueId('iq'),
      date: getLocalISOString(),
      score,
      estimatedIQ: Math.round(100 + (score - 50) * 0.8),
      breakdown,
      aiAnalysis: analysis
    };
    const student = students.find(s => s.id === currentUser.id);
    if (student) {
      const updatedHistory = [newIQ, ...(student.iqHistory || [])];
      handleUpdateStudent(student.id, { iqHistory: updatedHistory });
    }
  };

  const handleUpdateWordKingBest = (newScore: number) => {
    if (currentUser.role !== 'student') return;
    const student = students.find(s => s.id === currentUser.id);
    if (student && newScore > (student.wordKingBest || 0)) {
      handleUpdateStudent(student.id, { wordKingBest: newScore });
    }
  };

  const renderContent = () => {
    const activeStudent = students.find(s => s.id === currentUser.id);
    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard reports={reports} students={students} instructors={instructors} role={currentUser.role} mockExams={mockExams} currentUserStudent={activeStudent} currentUserId={currentUser.id} allSessions={allSessions} onLogSession={handleLogSession} timetable={timetable} onUpdateTimetable={handleUpdateTimetable} onUpdateStudent={handleUpdateStudent} />;
      case 'create': 
        return <ReportForm students={students} currentUser={currentUser} onSave={handleSaveReport} />;
      case 'reports': 
        return <ReportList reports={reports} students={students} currentUser={currentUser} onAddMessage={(rid, txt) => {
          const nm: ReportMessage = { id: generateUniqueId('msg'), senderId: currentUser.id, senderName: currentUser.name, senderRole: currentUser.role, text: txt, timestamp: new Date().toLocaleTimeString('ja-JP') };
          const r = reports.find(rep => rep.id === rid);
          if (r) {
            const updatedMessages = [...(r.messages || []), nm];
            handleUpdateReport(rid, { messages: updatedMessages, needsAction: currentUser.role === 'student' || currentUser.role === 'parent' });
          }
        }} onDeleteMessage={(rid, mid) => {
          const r = reports.find(rep => rep.id === rid);
          if (r) {
            const updatedMessages = (r.messages || []).filter(m => m.id !== mid);
            handleUpdateReport(rid, { messages: updatedMessages });
          }
        }} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} onUpdateReport={handleUpdateReport} />;
      case 'word-king': 
        return <WordKing classroomBest={adminConfig.wordKingClassroomRecord} classroomHolder={adminConfig.wordKingClassroomHolder} userId={currentUser.id} personalBestFromDB={activeStudent?.wordKingBest || 0} onPersonalBestUpdate={handleUpdateWordKingBest} onNewClassroomRecord={(record, holder) => handleUpdateAdminConfig({ wordKingClassroomRecord: record, wordKingClassroomHolder: holder })} />;
      case 'iq-test': 
        return <IQTest studentName={currentUser.name} grade={activeStudent?.grade || ""} userId={currentUser.id} iqHistory={activeStudent?.iqHistory || []} onComplete={handleSaveIQ} />;
      case 'interview': 
        return <InterviewCenter students={students} reports={reports} mockExams={mockExams} adminConfig={adminConfig} />;
      case 'students': 
        return <StudentCenter students={students} reports={reports} allSessions={allSessions} currentUser={currentUser} onAddMessage={()=>{}} onDeleteMessage={()=>{}} onMarkResolved={()=>{}} onAddStudent={async (d) => {
          const id = generateUniqueId('s');
          const ns: Student = { ...d, id, instructorIds: [] };
          setStudents(prev => [...prev, ns]);
          if (isSupabaseConfigured && supabase) await supabase.from('students').insert({ id, name: ns.name, grade: ns.grade, login_id: ns.loginId, password: ns.password, target_school: ns.targetSchool, target_faculty: ns.targetFaculty });
        }} onUpdateStudent={handleUpdateStudent} onDeleteStudent={async (id) => {
          setStudents(prev => prev.filter(s => s.id !== id));
          if (isSupabaseConfigured && supabase) await supabase.from('students').delete().eq('id', id);
        }} />;
      case 'instructors':
        return <InstructorCenter instructors={instructors} students={students} onAssignStudent={(sid, iid) => {
          const s = students.find(std => std.id === sid);
          if (s) handleUpdateStudent(sid, { instructorIds: [...new Set([...(s.instructorIds || []), iid])] });
        }} onRemoveStudent={(sid, iid) => {
          const s = students.find(std => std.id === sid);
          if (s) handleUpdateStudent(sid, { instructorIds: s.instructorIds.filter(id => id !== iid) });
        }} onUpdateInstructor={async (id, upd) => {
          setInstructors(prev => prev.map(i => i.id === id ? { ...i, ...upd } : i));
          if (isSupabaseConfigured && supabase) {
            const dbUpd: any = {};
            if (upd.name) dbUpd.name = upd.name;
            if (upd.specialty) dbUpd.specialty = upd.specialty;
            if (upd.loginId) dbUpd.login_id = upd.loginId;
            if (upd.password) dbUpd.password = upd.password;
            await supabase.from('instructors').update(dbUpd).eq('id', id);
          }
        }} onAddInstructor={async (d) => {
          const id = generateUniqueId('i');
          setInstructors(prev => [...prev, { ...d, id }]);
          if (isSupabaseConfigured && supabase) await supabase.from('instructors').insert({ id, name: d.name, specialty: d.specialty, login_id: d.loginId, password: d.password });
        }} onDeleteInstructor={async (id) => {
          setInstructors(prev => prev.filter(i => i.id !== id));
          if (isSupabaseConfigured && supabase) await supabase.from('instructors').delete().eq('id', id);
        }} />;
      case 'salary': return <SalaryCenter instructors={instructors} reports={reports} />;
      case 'mock':
        return <MockExamCenter students={students} mockExams={mockExams} role={currentUser.role} currentUserId={currentUser.id} onSave={async (e) => {
          setMockExams(prev => [e, ...prev]);
          if (isSupabaseConfigured && supabase) await supabase.from('mock_exams').insert({ id: e.id, student_id: e.studentId, exam_name: e.examName, exam_date: e.examDate, scores: e.scores });
        }} onUpdate={async (e) => {
          setMockExams(prev => prev.map(m => m.id === e.id ? e : m));
          if (isSupabaseConfigured && supabase) await supabase.from('mock_exams').update({ exam_name: e.examName, exam_date: e.examDate, scores: e.scores }).eq('id', e.id);
        }} onDelete={async (id) => {
          setMockExams(prev => prev.filter(m => m.id !== id));
          if (isSupabaseConfigured && supabase) await supabase.from('mock_exams').delete().eq('id', id);
        }} />;
      case 'messages': return <MessageCenter reports={reports} students={students} currentUser={currentUser} onAddMessage={()=>{}} onDeleteMessage={()=>{}} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} />;
      case 'timetable': return <TimetableManager timetable={timetable} students={students} instructors={instructors} onUpdate={handleUpdateTimetable} />;
      case 'settings': return <AdminSettings adminConfig={adminConfig} onUpdate={handleUpdateAdminConfig} />;
      default: return <div className="p-10 text-center text-slate-400 font-bold italic">Module not found.</div>;
    }
  };

  if (isLoading) return <div className="h-[100dvh] flex items-center justify-center font-black text-indigo-600 animate-pulse text-xl">Initializing Study Base...</div>;
  if (!isAuthenticated) return (
    <div className="h-[100dvh] flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-sm w-full border border-slate-100 flex flex-col items-center">
        <h1 className="text-4xl font-black italic mb-8 tracking-tighter">STUDY <span className="text-indigo-600">BASE</span></h1>
        {authStep === 'role-selection' ? (
          <div className="space-y-4 w-full">
            <button onClick={() => { setLoginRole('student'); setAuthStep('credentials'); }} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95">生徒・保護者</button>
            <button onClick={() => { setLoginRole('instructor'); setAuthStep('credentials'); }} className="w-full py-6 bg-slate-800 text-white rounded-[2rem] font-black shadow-xl hover:bg-slate-900 transition-all active:scale-95">講師</button>
            <button onClick={() => { setLoginRole('admin'); setAuthStep('credentials'); }} className="text-[10px] text-slate-300 font-bold uppercase mt-8 block mx-auto hover:text-indigo-400 transition-colors tracking-widest">Admin Access</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn w-full">
            <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="ログインID" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all">ログイン</button>
            <button type="button" onClick={() => { setAuthStep('role-selection'); setLoginId(''); setPassword(''); }} className="text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors">戻る</button>
          </form>
        )}
        <p className="text-[10px] text-slate-300 font-bold mt-8 uppercase tracking-widest">ver 2.5.0</p>
      </div>
    </div>
  );

  return (
    <Layout role={currentUser.role} userName={currentUser.name} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} reports={reports}>
      {renderContent()}
    </Layout>
  );
};

export default App;