
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
import MessageCenter from './components/MessageCenter';
import InstructorCenter from './components/InstructorCenter';

const App: React.FC = () => {
  // Authentication and Navigation State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; id: string; name: string }>({
    role: 'student',
    id: '',
    name: ''
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  // Core Data State
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [instructors, setInstructors] = useState<Instructor[]>(MOCK_INSTRUCTORS);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(MOCK_TIMETABLE);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({
    name: '学士館 統括室',
    loginId: 'admin',
    location: '埼玉県さいたま市',
    wordKingClassroomRecord: 124,
    wordKingClassroomHolder: '初代王'
  });

  useEffect(() => {
    // 起動時の初期化
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const loginAs = (role: UserRole) => {
    let user = { role, id: 'a1', name: '管理者' };
    if (role === 'instructor') user = { role, id: 'i1', name: '山田 講師' };
    if (role === 'student') user = { role, id: 's1', name: '田中 太郎' };
    
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  // Message Handlers
  const handleAddMessage = (reportId: string, text: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        const newMessage: ReportMessage = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          text,
          timestamp: new Date().toLocaleString('ja-JP')
        };
        return {
          ...r,
          messages: [...(r.messages || []), newMessage],
          needsAction: currentUser.role === 'student' || currentUser.role === 'parent'
        };
      }
      return r;
    }));
  };

  const handleDeleteMessage = (reportId: string, messageId: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return { ...r, messages: r.messages?.filter(m => m.id !== messageId) };
      }
      return r;
    }));
  };

  const handleMarkResolved = (reportId: string) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, needsAction: false } : r));
  };

  const handleUpdateReport = (reportId: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
  };

  // Instructor-Student Assignment Handlers
  const handleAssignStudent = (studentId: string, instructorId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, instructorIds: [...new Set([...s.instructorIds, instructorId])] };
      }
      return s;
    }));
  };

  const handleRemoveStudent = (studentId: string, instructorId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, instructorIds: s.instructorIds.filter(id => id !== instructorId) };
      }
      return s;
    }));
  };

  // Main Content Router
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            reports={reports} 
            students={students} 
            instructors={instructors}
            role={currentUser.role}
            mockExams={mockExams}
            currentUserStudent={students.find(s => s.id === currentUser.id)}
            currentUserId={currentUser.id}
            allSessions={allSessions}
            onLogSession={(s) => setAllSessions(prev => [...prev, s])}
            timetable={timetable}
            onUpdateTimetable={setTimetable}
          />
        );
      case 'create':
        return <ReportForm students={students} currentUser={currentUser} onSave={(r) => { setReports(prev => [r, ...prev]); setActiveTab('dashboard'); }} />;
      case 'reports':
        return (
          <ReportList 
            reports={reports} 
            students={students} 
            currentUser={currentUser} 
            onAddMessage={handleAddMessage}
            onDeleteMessage={handleDeleteMessage}
            onMarkResolved={handleMarkResolved}
            onUpdateReport={handleUpdateReport}
          />
        );
      case 'messages':
        return (
          <MessageCenter 
            reports={reports} 
            students={students} 
            currentUser={currentUser} 
            onAddMessage={handleAddMessage}
            onDeleteMessage={handleDeleteMessage}
            onMarkResolved={handleMarkResolved}
          />
        );
      case 'students':
        return (
          <StudentCenter 
            students={students} 
            reports={reports} 
            allSessions={allSessions}
            currentUser={currentUser}
            onAddMessage={handleAddMessage}
            onDeleteMessage={handleDeleteMessage}
            onMarkResolved={handleMarkResolved}
            onAddStudent={(s) => setStudents(prev => [...prev, { ...s, id: Math.random().toString(36).substr(2, 9), instructorIds: [] }])}
            onUpdateStudent={(id, updates) => setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))}
            onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))}
          />
        );
      case 'instructors':
        return (
          <InstructorCenter 
            instructors={instructors} 
            students={students} 
            onAssignStudent={handleAssignStudent}
            onRemoveStudent={handleRemoveStudent}
            onAddInstructor={(ins) => setInstructors(prev => [...prev, { ...ins, id: Math.random().toString(36).substr(2, 9) }])}
            onUpdateInstructor={(id, updates) => setInstructors(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))}
            onDeleteInstructor={(id) => setInstructors(prev => prev.filter(i => i.id !== id))}
          />
        );
      case 'salary':
        return <SalaryCenter instructors={instructors} reports={reports} />;
      case 'interview':
        return <InterviewCenter students={students} reports={reports} mockExams={mockExams} adminConfig={adminConfig} />;
      case 'mock':
        return (
          <MockExamCenter 
            students={students} 
            mockExams={mockExams} 
            role={currentUser.role} 
            currentUserId={currentUser.id}
            onSave={(e) => setMockExams(prev => [...prev, e])}
            onUpdate={(e) => setMockExams(prev => prev.map(item => item.id === e.id ? e : item))}
            onDelete={(id) => setMockExams(prev => prev.filter(item => item.id !== id))}
          />
        );
      case 'word-king':
        return (
          <WordKing 
            classroomBest={adminConfig.wordKingClassroomRecord} 
            classroomHolder={adminConfig.wordKingClassroomHolder}
            onNewClassroomRecord={(record, holder) => setAdminConfig(prev => ({ ...prev, wordKingClassroomRecord: record, wordKingClassroomHolder: holder }))}
          />
        );
      case 'timetable':
        return <TimetableManager timetable={timetable} students={students} instructors={instructors} onUpdate={setTimetable} />;
      case 'settings':
        return <AdminSettings adminConfig={adminConfig} onUpdate={(updates) => setAdminConfig(prev => ({ ...prev, ...updates }))} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black tracking-widest text-[10px] uppercase">Loading Study Base...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl max-w-sm w-full text-center space-y-10 border border-slate-100 animate-fadeIn">
          <div className="space-y-2">
            <span className="text-[11px] font-black tracking-[0.4em] text-indigo-500 uppercase block mb-1">受験専門塾 学士館</span>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">STUDY <span className="text-indigo-600">BASE</span></h1>
            <div className="w-12 h-1.5 bg-indigo-500 mx-auto rounded-full opacity-20 mt-4"></div>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => loginAs('student')}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
            >
              生徒・保護者として入室
            </button>
            <button 
              onClick={() => loginAs('instructor')}
              className="w-full py-5 bg-slate-800 text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-200 hover:bg-slate-900 hover:-translate-y-1 transition-all active:scale-95"
            >
              講師として入室
            </button>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <button 
              onClick={() => loginAs('admin')}
              className="text-[10px] text-slate-300 font-black uppercase tracking-widest hover:text-indigo-400 transition-colors"
            >
              Admin Access
            </button>
            <p className="text-[9px] text-slate-200 font-bold uppercase tracking-widest">Powered by Gemini AI</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      role={currentUser.role} 
      userName={currentUser.name} 
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      reports={reports}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
