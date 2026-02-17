
import React, { useState, useEffect } from 'react';
import { UserRole, AppState, Report, ReportMessage, Instructor, Student, AdminConfig, MockExam, StudySession, TimetableEntry } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import MessageCenter from './components/MessageCenter';
import StudentCenter from './components/StudentCenter';
import InstructorCenter from './components/InstructorCenter';
import SalaryCenter from './components/SalaryCenter';
import InterviewCenter from './components/InterviewCenter';
import AdminSettings from './components/AdminSettings';
import MockExamCenter from './components/MockExamCenter';
import WordKing from './components/WordKing';
import TimetableManager from './components/TimetableManager';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<UserRole | null>(null);
  const [loginAuth, setLoginAuth] = useState({ id: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  const [state, setState] = useState<AppState>({
    currentUser: { role: 'student', id: '', name: '' },
    students: [],
    instructors: [],
    reports: [],
    mockExams: [],
    adminConfig: {
      name: 'Study Base 統括室',
      loginId: 'gakushi2025',
      passwordHash: '6064305',
      location: '埼玉県さいたま市',
      wordKingClassroomRecord: 0,
      wordKingClassroomHolder: '未設定'
    }
  });

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: rData },
        { data: eData },
        { data: sData },
        { data: iData },
        { data: sessData },
        { data: ttData },
        { data: configData }
      ] = await Promise.all([
        supabase.from('reports').select('*').order('date', { ascending: false }),
        supabase.from('mock_exams').select('*'),
        supabase.from('students').select('*'),
        supabase.from('instructors').select('*'),
        supabase.from('study_sessions').select('*'),
        supabase.from('timetable').select('*'),
        supabase.from('admin_config').select('*').eq('id', 1).maybeSingle()
      ]);

      setState(prev => ({
        ...prev,
        reports: rData || [],
        mockExams: eData || [],
        students: sData || [],
        instructors: iData || [],
        adminConfig: configData || prev.adminConfig
      }));
      setSessions(sessData || []);
      setTimetable(ttData || []);
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLoginSuccess = (role: UserRole, id: string, name: string) => {
    setState(prev => ({ ...prev, currentUser: { role, id, name } }));
    setIsAuthenticated(true);
    setSelectedRoleForLogin(null);
    setLoginAuth({ id: '', password: '' });
    setAuthError('');
    setActiveTab('dashboard');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { id, password } = loginAuth;

    if (selectedRoleForLogin === 'admin') {
      if (id === state.adminConfig.loginId && password === state.adminConfig.passwordHash) {
        handleLoginSuccess('admin', 'admin-system', state.adminConfig.name);
      } else {
        setAuthError('管理者IDまたはパスワードが正しくありません。');
      }
      return;
    }

    if (selectedRoleForLogin === 'instructor') {
      const instructor = state.instructors.find(i => i.loginId === id && i.password === password);
      if (instructor) handleLoginSuccess('instructor', instructor.id, instructor.name);
      else setAuthError('講師IDまたはパスワードが正しくありません。');
      return;
    }

    if (selectedRoleForLogin === 'student' || selectedRoleForLogin === 'parent') {
      const student = state.students.find(s => s.loginId === id && s.password === password);
      if (student) {
        const name = selectedRoleForLogin === 'parent' ? `${student.name} (保護者)` : student.name;
        handleLoginSuccess(selectedRoleForLogin, student.id, name);
      } else setAuthError('IDまたはパスワードが正しくありません。');
      return;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedRoleForLogin(null);
    setActiveTab('dashboard');
  };

  const handleSaveReport = async (report: Report) => {
    const reportToSave = { ...report, instructorName: state.currentUser.name, messages: [], needsAction: false };
    const { error } = await supabase.from('reports').insert([reportToSave]);
    if (!error) {
      setState(prev => ({ ...prev, reports: [reportToSave, ...prev.reports] }));
      setActiveTab('dashboard');
    } else alert("保存に失敗しました: " + error.message);
  };

  const handleUpdateReport = async (reportId: string, updates: Partial<Report>) => {
    const { error } = await supabase.from('reports').update(updates).eq('id', reportId);
    if (!error) setState(prev => ({ ...prev, reports: prev.reports.map(r => r.id === reportId ? { ...r, ...updates } : r) }));
  };

  const handleUpdateTimetable = async (newTimetable: TimetableEntry[]) => {
    const { error } = await supabase.from('timetable').upsert(newTimetable);
    if (!error) setTimetable(newTimetable);
  };

  const handleAddMessage = async (reportId: string, text: string) => {
    const r = state.reports.find(repo => repo.id === reportId);
    if (!r) return;
    const newMessage: ReportMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: state.currentUser.id,
      senderName: state.currentUser.name,
      senderRole: state.currentUser.role,
      text,
      timestamp: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    const needsAction = state.currentUser.role === 'student' || state.currentUser.role === 'parent';
    const updatedMessages = [...(r.messages || []), newMessage];
    const { error } = await supabase.from('reports').update({ messages: updatedMessages, needsAction: needsAction ? true : r.needsAction }).eq('id', reportId);
    if (!error) setState(prev => ({ ...prev, reports: prev.reports.map(repo => repo.id === reportId ? { ...repo, messages: updatedMessages, needsAction: needsAction ? true : repo.needsAction } : repo) }));
  };

  const handleDeleteMessage = async (reportId: string, messageId: string) => {
    const r = state.reports.find(repo => repo.id === reportId);
    if (!r) return;
    const updatedMessages = (r.messages || []).filter(m => m.id !== messageId);
    const { error } = await supabase.from('reports').update({ messages: updatedMessages }).eq('id', reportId);
    if (!error) setState(prev => ({ ...prev, reports: prev.reports.map(repo => repo.id === reportId ? { ...repo, messages: updatedMessages } : repo) }));
  };

  const handleMarkResolved = async (reportId: string) => {
    const { error } = await supabase.from('reports').update({ needsAction: false }).eq('id', reportId);
    if (!error) setState(prev => ({ ...prev, reports: prev.reports.map(r => r.id === reportId ? { ...r, needsAction: false } : r) }));
  };

  const handleSaveMockExam = async (exam: MockExam) => {
    const { error } = await supabase.from('mock_exams').insert([exam]);
    if (!error) setState(prev => ({ ...prev, mockExams: [exam, ...prev.mockExams] }));
  };

  const handleUpdateMockExam = async (exam: MockExam) => {
    const { error } = await supabase.from('mock_exams').update(exam).eq('id', exam.id);
    if (!error) setState(prev => ({ ...prev, mockExams: prev.mockExams.map(e => e.id === exam.id ? exam : e) }));
  };

  const handleDeleteMockExam = async (id: string) => {
    const { error } = await supabase.from('mock_exams').delete().eq('id', id);
    if (!error) setState(prev => ({ ...prev, mockExams: prev.mockExams.filter(e => e.id !== id) }));
  };

  const handleAddStudent = async (student: Omit<Student, 'id' | 'instructorIds'>) => {
    const newStudent: Student = { ...student, id: 's' + Math.random().toString(36).substr(2, 5), instructorIds: [] };
    const { error } = await supabase.from('students').insert([newStudent]);
    if (!error) setState(prev => ({ ...prev, students: [newStudent, ...prev.students] }));
  };

  const handleUpdateStudent = async (studentId: string, updates: Partial<Student>) => {
    const { error } = await supabase.from('students').update(updates).eq('id', studentId);
    if (!error) setState(prev => ({ ...prev, students: prev.students.map(s => s.id === studentId ? { ...s, ...updates } : s) }));
  };

  const handleDeleteStudent = async (studentId: string) => {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (!error) setState(prev => ({ ...prev, students: prev.students.filter(s => s.id !== studentId), reports: prev.reports.filter(r => r.studentId !== studentId), mockExams: prev.mockExams.filter(e => e.studentId !== studentId) }));
  };

  const handleUpdateInstructor = async (instructorId: string, updates: Partial<Instructor>) => {
    const { error } = await supabase.from('instructors').update(updates).eq('id', instructorId);
    if (!error) setState(prev => ({ ...prev, instructors: prev.instructors.map(i => i.id === instructorId ? { ...i, ...updates } : i) }));
  };

  const handleLogSession = async (session: StudySession) => {
    const { error } = await supabase.from('study_sessions').insert([session]);
    if (!error) setSessions(prev => [session, ...prev]);
  };

  const handleUpdateAdminConfig = async (updates: Partial<AdminConfig>) => {
    const { error } = await supabase.from('admin_config').update(updates).eq('id', 1);
    if (!error) {
      setState(prev => {
        const newConfig = { ...prev.adminConfig, ...updates };
        return { ...prev, adminConfig: newConfig, currentUser: prev.currentUser.role === 'admin' ? { ...prev.currentUser, name: newConfig.name } : prev.currentUser };
      });
    }
  };

  const handleNewWordKingRecord = (newScore: number, holderName: string) => {
    handleUpdateAdminConfig({ wordKingClassroomRecord: newScore, wordKingClassroomHolder: holderName });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-indigo-300 font-black tracking-widest text-xs uppercase animate-pulse">Connecting to Database...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-4xl w-full relative z-10">
          <div className="text-center mb-16 animate-fadeIn">
            <h1 className="text-white text-7xl font-light tracking-tighter mb-2 flex items-center justify-center">
              Study<span className="font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-300 via-white to-indigo-500 ml-1">Base</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium mt-6 tracking-wide opacity-80">次世代学習管理プラットフォーム</p>
          </div>

          {!selectedRoleForLogin ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slideUp">
              {[
                { role: 'student' as UserRole, icon: '🎒', title: 'Student', desc: '学習記録・報告書の確認', color: 'bg-indigo-500' },
                { role: 'parent' as UserRole, icon: '🏠', title: 'Parent', desc: '進捗確認・講師への相談', color: 'bg-indigo-600' },
                { role: 'instructor' as UserRole, icon: '👨‍🏫', title: 'Instructor', desc: '報告書作成・分析', color: 'bg-indigo-700' }
              ].map((btn) => (
                <button key={btn.role} onClick={() => setSelectedRoleForLogin(btn.role)} className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] transition-all group text-left flex flex-col items-start gap-5 active:scale-95 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]">
                  <div className={`w-14 h-14 ${btn.color} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-xl`}>{btn.icon}</div>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1 tracking-tight">{btn.title}</h3>
                    <p className="text-slate-500 text-[11px] font-semibold leading-relaxed uppercase tracking-wider">{btn.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] animate-slideUp shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-white text-xl font-black flex items-center gap-3">Sign in</h2>
                <button onClick={() => { setSelectedRoleForLogin(null); setAuthError(''); setLoginAuth({id: '', password: ''}); }} className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Cancel</button>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Account ID</label>
                  <input type="text" required autoFocus value={loginAuth.id} onChange={(e) => setLoginAuth({ ...loginAuth, id: e.target.value })} className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 outline-none text-white font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <input type="password" required value={loginAuth.password} onChange={(e) => setLoginAuth({ ...loginAuth, password: e.target.value })} className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 outline-none text-white font-bold" />
                </div>
                {authError && <p className="text-rose-400 text-xs font-bold text-center">{authError}</p>}
                <button type="submit" className="w-full py-5 rounded-xl font-black text-white bg-indigo-500 hover:bg-indigo-400">Authenticate</button>
              </form>
            </div>
          )}
          <div className="mt-20 text-center animate-fadeIn">
            <button onClick={() => setSelectedRoleForLogin('admin')} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all px-6 py-2 rounded-full border border-white/5 hover:border-white/20 active:scale-95">🏢 Admin System</button>
          </div>
        </div>
      </div>
    );
  }

  const isPrivileged = state.currentUser.role === 'instructor' || state.currentUser.role === 'admin';
  const isAdmin = state.currentUser.role === 'admin';
  const filteredReports = isPrivileged ? state.reports : state.reports.filter(r => r.studentId === state.currentUser.id);
  const filteredExams = isPrivileged ? state.mockExams : state.mockExams.filter(e => e.studentId === state.currentUser.id);
  const currentUserStudent = state.students.find(s => s.id === state.currentUser.id);

  return (
    <Layout role={state.currentUser.role} userName={state.currentUser.name} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} reports={state.reports}>
      {activeTab === 'dashboard' && <Dashboard reports={filteredReports} students={state.students} instructors={state.instructors} role={state.currentUser.role} mockExams={filteredExams} currentUserStudent={currentUserStudent} currentUserId={state.currentUser.id} allSessions={sessions} onLogSession={handleLogSession} timetable={timetable} onUpdateTimetable={handleUpdateTimetable} />}
      {activeTab === 'word-king' && <WordKing classroomBest={state.adminConfig.wordKingClassroomRecord} classroomHolder={state.adminConfig.wordKingClassroomHolder} onNewClassroomRecord={handleNewWordKingRecord} />}
      {activeTab === 'timetable' && isPrivileged && <TimetableManager timetable={timetable} students={state.students} instructors={state.instructors} onUpdate={handleUpdateTimetable} />}
      {activeTab === 'instructors' && isAdmin && <InstructorCenter instructors={state.instructors} students={state.students} onAssignStudent={async (sid, iid) => { const student = state.students.find(s => s.id === sid); if (student && !student.instructorIds.includes(iid)) { const newIds = [...student.instructorIds, iid]; await handleUpdateStudent(sid, { instructorIds: newIds }); } }} onRemoveStudent={async (sid, iid) => { const student = state.students.find(s => s.id === sid); if (student) { const newIds = student.instructorIds.filter(id => id !== iid); await handleUpdateStudent(sid, { instructorIds: newIds }); } }} onUpdateInstructor={handleUpdateInstructor} onDeleteInstructor={async (iid) => { const { error } = await supabase.from('instructors').delete().eq('id', iid); if (!error) setState(prev => ({ ...prev, instructors: prev.instructors.filter(i => i.id !== iid) })); }} />}
      {activeTab === 'salary' && isAdmin && <SalaryCenter instructors={state.instructors} reports={state.reports} />}
      {activeTab === 'create' && isPrivileged && <ReportForm students={state.students} currentUser={state.currentUser} onSave={handleSaveReport} />}
      {activeTab === 'interview' && isPrivileged && <InterviewCenter students={state.students} reports={state.reports} mockExams={state.mockExams} adminConfig={state.adminConfig} />}
      {activeTab === 'mock' && <MockExamCenter students={state.students} mockExams={filteredExams} role={state.currentUser.role} currentUserId={state.currentUser.id} onSave={handleSaveMockExam} onUpdate={handleUpdateMockExam} onDelete={handleDeleteMockExam} />}
      {activeTab === 'messages' && isPrivileged && <MessageCenter reports={state.reports} students={state.students} currentUser={state.currentUser} onAddMessage={handleAddMessage} onDeleteMessage={handleDeleteMessage} onMarkResolved={handleMarkResolved} />}
      {activeTab === 'students' && isPrivileged && <StudentCenter students={state.students} reports={state.reports} allSessions={sessions} currentUser={state.currentUser} onAddMessage={handleAddMessage} onDeleteMessage={handleDeleteMessage} onMarkResolved={handleMarkResolved} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} />}
      {activeTab === 'settings' && isAdmin && <AdminSettings adminConfig={state.adminConfig} onUpdate={handleUpdateAdminConfig} />}
      {activeTab === 'reports' && <ReportList reports={filteredReports} students={state.students} currentUser={state.currentUser} onAddMessage={handleAddMessage} onDeleteMessage={handleDeleteMessage} onMarkResolved={handleMarkResolved} onUpdateReport={handleUpdateReport} />}
    </Layout>
  );
};

export default App;
