
import React, { useState } from 'react';
import { UserRole, AppState, Report, ReportMessage, Instructor, Student, AdminConfig, MockExam, StudySession } from './types';
import { MOCK_STUDENTS, MOCK_REPORTS, MOCK_INSTRUCTORS } from './constants';
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<UserRole | null>(null);
  const [loginAuth, setLoginAuth] = useState({ id: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [sessions, setSessions] = useState<StudySession[]>([
    { id: '1', studentId: 's1', date: new Date().toISOString().split('T')[0], subject: '数学', minutes: 90 },
    { id: '2', studentId: 's1', date: new Date().toISOString().split('T')[0], subject: '英語', minutes: 45 },
  ]);

  const [state, setState] = useState<AppState>({
    currentUser: { role: 'student', id: '', name: '' },
    students: MOCK_STUDENTS,
    instructors: MOCK_INSTRUCTORS,
    reports: MOCK_REPORTS.map(r => ({ ...r, messages: [], needsAction: false })),
    mockExams: [],
    adminConfig: {
      name: 'Study Base 統括室',
      loginId: 'gakushi2025',
      passwordHash: '6064305',
      location: '埼玉県さいたま市',
      wordKingClassroomRecord: 124,
      wordKingClassroomHolder: '初代王'
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLoginSuccess = (role: UserRole, id: string, name: string) => {
    setState(prev => ({
      ...prev,
      currentUser: { role, id, name }
    }));
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
      if (instructor) {
        handleLoginSuccess('instructor', instructor.id, instructor.name);
      } else {
        setAuthError('講師IDまたはパスワードが正しくありません。');
      }
      return;
    }

    if (selectedRoleForLogin === 'student' || selectedRoleForLogin === 'parent') {
      const student = state.students.find(s => s.loginId === id && s.password === password);
      if (student) {
        const name = selectedRoleForLogin === 'parent' ? `${student.name} (保護者)` : student.name;
        handleLoginSuccess(selectedRoleForLogin, student.id, name);
      } else {
        setAuthError('IDまたはパスワードが正しくありません。');
      }
      return;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedRoleForLogin(null);
    setActiveTab('dashboard');
  };

  const handleSaveReport = (report: Report) => {
    setState(prev => ({
      ...prev,
      reports: [...prev.reports, { ...report, messages: [], needsAction: false }]
    }));
    setActiveTab('dashboard');
  };

  const handleUpdateReport = (reportId: string, updates: Partial<Report>) => {
    setState(prev => ({
      ...prev,
      reports: prev.reports.map(r => r.id === reportId ? { ...r, ...updates } : r)
    }));
  };

  const handleAddMessage = (reportId: string, text: string) => {
    setState(prev => ({
      ...prev,
      reports: prev.reports.map(r => {
        if (r.id === reportId) {
          const newMessage: ReportMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: state.currentUser.id,
            senderName: state.currentUser.name,
            senderRole: state.currentUser.role,
            text,
            timestamp: new Date().toLocaleString('ja-JP', { 
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            })
          };
          const needsAction = state.currentUser.role === 'student' || state.currentUser.role === 'parent';
          return {
            ...r,
            messages: [...(r.messages || []), newMessage],
            needsAction: needsAction ? true : r.needsAction
          };
        }
        return r;
      })
    }));
  };

  const handleMarkResolved = (reportId: string) => {
    setState(prev => ({
      ...prev,
      reports: prev.reports.map(r => r.id === reportId ? { ...r, needsAction: false } : r)
    }));
  };

  const handleSaveMockExam = (exam: MockExam) => {
    setState(prev => ({
      ...prev,
      mockExams: [...prev.mockExams, exam]
    }));
  };

  const handleUpdateMockExam = (exam: MockExam) => {
    setState(prev => ({
      ...prev,
      mockExams: prev.mockExams.map(e => e.id === exam.id ? exam : e)
    }));
  };

  const handleDeleteMockExam = (id: string) => {
    setState(prev => ({
      ...prev,
      mockExams: prev.mockExams.filter(e => e.id !== id)
    }));
  };

  const handleAssignInstructorToStudent = (studentId: string, instructorId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id === studentId && !s.instructorIds.includes(instructorId)) {
          return { ...s, instructorIds: [...s.instructorIds, instructorId] };
        }
        return s;
      })
    }));
  };

  const handleRemoveInstructorFromStudent = (studentId: string, instructorId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id === studentId) {
          return { ...s, instructorIds: s.instructorIds.filter(id => id !== instructorId) };
        }
        return s;
      })
    }));
  };

  const handleAddStudent = (student: Omit<Student, 'id' | 'instructorIds'>) => {
    const newStudent: Student = {
      ...student,
      id: 's' + Math.random().toString(36).substr(2, 5),
      instructorIds: []
    };
    setState(prev => ({ ...prev, students: [...prev.students, newStudent] }));
  };

  const handleUpdateStudent = (studentId: string, updates: Partial<Student>) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === studentId ? { ...s, ...updates } : s)
    }));
  };

  const handleDeleteStudent = (studentId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== studentId),
      reports: prev.reports.filter(r => r.studentId !== studentId),
      mockExams: prev.mockExams.filter(e => e.studentId !== studentId)
    }));
  };

  const handleUpdateInstructor = (instructorId: string, updates: Partial<Instructor>) => {
    setState(prev => ({
      ...prev,
      instructors: prev.instructors.map(i => i.id === instructorId ? { ...i, ...updates } : i)
    }));
  };

  const handleDeleteInstructor = (instructorId: string) => {
    setState(prev => ({
      ...prev,
      instructors: prev.instructors.filter(i => i.id !== instructorId),
      students: prev.students.map(s => ({
        ...s,
        instructorIds: s.instructorIds.filter(id => id !== instructorId)
      }))
    }));
  };

  const handleUpdateAdminConfig = (updates: Partial<AdminConfig>) => {
    setState(prev => {
      const newConfig = { ...prev.adminConfig, ...updates };
      return {
        ...prev,
        adminConfig: newConfig,
        currentUser: prev.currentUser.role === 'admin' 
          ? { ...prev.currentUser, name: newConfig.name }
          : prev.currentUser
      };
    });
  };

  const handleLogSession = (session: StudySession) => {
    setSessions(prev => [...prev, session]);
  };

  const handleNewWordKingRecord = (newScore: number, holderName: string) => {
    setState(prev => ({
      ...prev,
      adminConfig: {
        ...prev.adminConfig,
        wordKingClassroomRecord: newScore,
        wordKingClassroomHolder: holderName
      }
    }));
  };

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
              Study
              <span className="font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-300 via-white to-indigo-500 ml-1">
                Base
              </span>
            </h1>
            <p className="text-slate-400 text-lg font-medium mt-6 tracking-wide opacity-80">最高効率の次世代学習管理プラットフォーム</p>
          </div>

          {!selectedRoleForLogin ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slideUp">
              {[
                { role: 'student' as UserRole, icon: '🎒', title: 'Student', desc: '学習記録・報告書の確認', color: 'bg-indigo-500' },
                { role: 'parent' as UserRole, icon: '🏠', title: 'Parent', desc: '進捗確認・講師への相談', color: 'bg-indigo-600' },
                { role: 'instructor' as UserRole, icon: '👨‍🏫', title: 'Instructor', desc: '報告書作成・分析', color: 'bg-indigo-700' }
              ].map((btn) => (
                <button 
                  key={btn.role}
                  type="button"
                  onClick={() => setSelectedRoleForLogin(btn.role)}
                  className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] transition-all group text-left flex flex-col items-start gap-5 active:scale-95 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]"
                >
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
                <button 
                  onClick={() => { setSelectedRoleForLogin(null); setAuthError(''); setLoginAuth({id: '', password: ''}); }}
                  className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Account ID</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={loginAuth.id}
                    onChange={(e) => setLoginAuth({ ...loginAuth, id: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 outline-none text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={loginAuth.password}
                    onChange={(e) => setLoginAuth({ ...loginAuth, password: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 outline-none text-white font-bold"
                  />
                </div>
                {authError && <p className="text-rose-400 text-xs font-bold text-center">{authError}</p>}
                <button type="submit" className="w-full py-5 rounded-xl font-black text-white bg-indigo-500 hover:bg-indigo-400">Authenticate</button>
              </form>
            </div>
          )}

          <div className="mt-20 text-center animate-fadeIn">
            <button 
              type="button"
              onClick={() => setSelectedRoleForLogin('admin')}
              className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all px-6 py-2 rounded-full border border-white/5 hover:border-white/20 active:scale-95"
            >
              🏢 Admin System
            </button>
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
    <Layout 
      role={state.currentUser.role} 
      userName={state.currentUser.name} 
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      reports={state.reports}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          reports={filteredReports} 
          students={state.students} 
          role={state.currentUser.role}
          mockExams={filteredExams}
          currentUserStudent={currentUserStudent}
          allSessions={sessions}
          onLogSession={handleLogSession}
        />
      )}
      {activeTab === 'word-king' && (
        <WordKing 
          classroomBest={state.adminConfig.wordKingClassroomRecord}
          classroomHolder={state.adminConfig.wordKingClassroomHolder}
          onNewClassroomRecord={handleNewWordKingRecord}
        />
      )}
      {activeTab === 'instructors' && isAdmin && (
        <InstructorCenter 
          instructors={state.instructors}
          students={state.students}
          onAssignStudent={handleAssignInstructorToStudent}
          onRemoveStudent={handleRemoveInstructorFromStudent}
          onUpdateInstructor={handleUpdateInstructor}
          onDeleteInstructor={handleDeleteInstructor}
        />
      )}
      {activeTab === 'salary' && isAdmin && <SalaryCenter instructors={state.instructors} reports={state.reports} />}
      {activeTab === 'create' && isPrivileged && <ReportForm students={state.students} onSave={handleSaveReport} />}
      {activeTab === 'interview' && isPrivileged && <InterviewCenter students={state.students} reports={state.reports} mockExams={state.mockExams} adminConfig={state.adminConfig} />}
      {activeTab === 'mock' && <MockExamCenter students={state.students} mockExams={filteredExams} role={state.currentUser.role} currentUserId={state.currentUser.id} onSave={handleSaveMockExam} onUpdate={handleUpdateMockExam} onDelete={handleDeleteMockExam} />}
      {activeTab === 'messages' && isPrivileged && <MessageCenter reports={state.reports} students={state.students} currentUser={state.currentUser} onAddMessage={handleAddMessage} onMarkResolved={handleMarkResolved} />}
      {activeTab === 'students' && isPrivileged && <StudentCenter students={state.students} reports={state.reports} allSessions={sessions} currentUser={state.currentUser} onAddMessage={handleAddMessage} onMarkResolved={handleMarkResolved} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} />}
      {activeTab === 'settings' && isAdmin && <AdminSettings adminConfig={state.adminConfig} onUpdate={handleUpdateAdminConfig} />}
      {activeTab === 'reports' && <ReportList reports={filteredReports} students={state.students} currentUser={state.currentUser} onAddMessage={handleAddMessage} onMarkResolved={handleMarkResolved} onUpdateReport={handleUpdateReport} />}
    </Layout>
  );
};

export default App;
