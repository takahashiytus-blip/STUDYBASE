
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
  
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(() => {
    const saved = localStorage.getItem('study_base_admin_config');
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN;
  });

  const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(`sb_data_${key}`, JSON.stringify(data));
  };

  const fetchAllData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const localReports = localStorage.getItem('sb_data_reports');
      const localStudents = localStorage.getItem('sb_data_students');
      const localInstructors = localStorage.getItem('sb_data_instructors');
      const localTimetable = localStorage.getItem('sb_data_timetable');
      const localMockExams = localStorage.getItem('sb_data_mockExams');
      const localSessions = localStorage.getItem('sb_data_sessions');

      setReports(localReports ? JSON.parse(localReports) : MOCK_REPORTS);
      setStudents(localStudents ? JSON.parse(localStudents) : MOCK_STUDENTS);
      setInstructors(localInstructors ? JSON.parse(localInstructors) : MOCK_INSTRUCTORS);
      setTimetable(localTimetable ? JSON.parse(localTimetable) : MOCK_TIMETABLE);
      setMockExams(localMockExams ? JSON.parse(localMockExams) : []);
      setAllSessions(localSessions ? JSON.parse(localSessions) : []);
      
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data: adminData } = await supabase.from('admin_config').select('*').eq('id', 1).maybeSingle();
      if (adminData) {
        setAdminConfig({
          id: adminData.id, name: adminData.name, loginId: adminData.login_id,
          passwordHash: adminData.password_hash || DEFAULT_ADMIN.passwordHash,
          location: adminData.location, wordKingClassroomRecord: adminData.word_king_record,
          wordKingClassroomHolder: adminData.word_king_holder
        });
      }

      const { data: studentData } = await supabase.from('students').select('*');
      if (studentData) {
        setStudents(studentData.map(s => ({
          id: s.id, name: s.name, grade: s.grade, loginId: s.login_id, password: s.password,
          targetSchool: s.target_school, targetFaculty: s.target_faculty,
          weeklyInstructorMessage: s.weekly_instructor_message, instructorIds: s.instructor_ids || [],
          iqHistory: s.iq_history || []
        })));
      }

      const { data: instructorData } = await supabase.from('instructors').select('*');
      if (instructorData) setInstructors(instructorData.map(i => ({ id: i.id, name: i.name, specialty: i.specialty, loginId: i.login_id, password: i.password })));

      const { data: reportData } = await supabase.from('reports').select('*').order('date', { ascending: false });
      if (reportData) setReports(reportData.map(r => ({
        id: r.id, studentId: r.student_id, date: r.date, subject: r.subject, instructorName: r.instructor_name,
        sessionYear: r.session_year, sessionMonth: r.session_month, sessionCount: r.session_count,
        attendanceStatus: r.attendance_status, rawNotes: r.raw_notes, homeworkAssigned: r.homework_assigned,
        homeworkCompletion: r.homework_completion, proposedSelfStudyDays: r.proposed_self_study_days,
        generatedContent: r.generated_content, quizScore: r.quiz_score, messages: r.messages || [], needsAction: r.needs_action
      })));

      const { data: mockData } = await supabase.from('mock_exams').select('*');
      if (mockData) setMockExams(mockData.map(m => ({ id: m.id, studentId: m.student_id, examName: m.exam_name, examDate: m.exam_date, scores: m.scores || {} })));

      const { data: timetableData } = await supabase.from('timetable').select('*');
      if (timetableData) setTimetable(timetableData.map(t => ({ id: t.id, dayOfWeek: t.day_of_week, startTime: t.start_time, endTime: t.end_time, subject: t.subject, studentId: t.student_id, instructorId: t.instructor_id, room: t.room })));

      const { data: sessionData } = await supabase.from('study_sessions').select('*');
      if (sessionData) setAllSessions(sessionData.map(s => ({ id: s.id, studentId: s.student_id, date: s.date, subject: s.subject, minutes: s.minutes })));

    } catch (err) {
      console.error(err);
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

  const handleUpdateAdminConfig = (updates: Partial<AdminConfig>) => {
    setAdminConfig(prev => {
      const newConfig = { ...prev, ...updates } as AdminConfig;
      localStorage.setItem('study_base_admin_config', JSON.stringify(newConfig));
      return newConfig;
    });
  };

  // --- Data Management Handlers ---

  const handleAddMessage = (reportId: string, text: string) => {
    const newMessage: ReportMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text,
      timestamp: new Date().toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    };
    const newReports = reports.map(r => r.id === reportId ? { 
      ...r, 
      messages: [...(r.messages || []), newMessage],
      needsAction: currentUser.role === 'student' || currentUser.role === 'parent' 
    } : r);
    setReports(newReports);
    saveToLocal('reports', newReports);
  };

  const handleMarkResolved = (reportId: string) => {
    const newReports = reports.map(r => r.id === reportId ? { ...r, needsAction: false } : r);
    setReports(newReports);
    saveToLocal('reports', newReports);
  };

  const handleDeleteMessage = (reportId: string, messageId: string) => {
    const newReports = reports.map(r => r.id === reportId ? { 
      ...r, 
      messages: r.messages?.filter(m => m.id !== messageId) || [] 
    } : r);
    setReports(newReports);
    saveToLocal('reports', newReports);
  };

  const handleUpdateReport = (reportId: string, updates: Partial<Report>) => {
    const newReports = reports.map(r => r.id === reportId ? { ...r, ...updates } : r);
    setReports(newReports);
    saveToLocal('reports', newReports);
  };

  const handleAddStudent = (data: Omit<Student, 'id' | 'instructorIds'>) => {
    const newStudent: Student = { ...data, id: 's' + (students.length + 1), instructorIds: [] };
    const newStudents = [...students, newStudent];
    setStudents(newStudents);
    saveToLocal('students', newStudents);
  };

  const handleUpdateStudent = (id: string, updates: Partial<Student>) => {
    const newStudents = students.map(s => s.id === id ? { ...s, ...updates } : s);
    setStudents(newStudents);
    saveToLocal('students', newStudents);
  };

  const handleDeleteStudent = (id: string) => {
    const newStudents = students.filter(s => s.id !== id);
    setStudents(newStudents);
    saveToLocal('students', newStudents);
  };

  const handleAddInstructor = (data: Omit<Instructor, 'id'>) => {
    const newIns: Instructor = { ...data, id: 'i' + (instructors.length + 1) };
    const newInstructors = [...instructors, newIns];
    setInstructors(newInstructors);
    saveToLocal('instructors', newInstructors);
  };

  const handleUpdateInstructor = (id: string, updates: Partial<Instructor>) => {
    const newInstructors = instructors.map(i => i.id === id ? { ...i, ...updates } : i);
    setInstructors(newInstructors);
    saveToLocal('instructors', newInstructors);
  };

  const handleDeleteInstructor = (id: string) => {
    const newInstructors = instructors.filter(i => i.id !== id);
    setInstructors(newInstructors);
    saveToLocal('instructors', newInstructors);
  };

  const handleAssignStudent = (studentId: string, instructorId: string) => {
    const newStudents = students.map(s => s.id === studentId ? { 
      ...s, 
      instructorIds: [...new Set([...(s.instructorIds || []), instructorId])] 
    } : s);
    setStudents(newStudents);
    saveToLocal('students', newStudents);
  };

  const handleRemoveStudent = (studentId: string, instructorId: string) => {
    const newStudents = students.map(s => s.id === studentId ? { 
      ...s, 
      instructorIds: s.instructorIds.filter(id => id !== instructorId) 
    } : s);
    setStudents(newStudents);
    saveToLocal('students', newStudents);
  };

  const handleSaveIQ = async (score: number, breakdown: any, analysis: string) => {
    if (currentUser.role !== 'student') return;
    const newIQ: IQResult = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
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

  const renderContent = () => {
    const activeStudent = students.find(s => s.id === currentUser.id);
    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard 
          reports={reports} students={students} instructors={instructors} 
          role={currentUser.role} mockExams={mockExams} currentUserStudent={activeStudent} 
          currentUserId={currentUser.id} allSessions={allSessions} 
          onLogSession={(s) => { const newS = [...allSessions, s]; setAllSessions(newS); saveToLocal('sessions', newS); }} 
          timetable={timetable} onUpdateTimetable={(t) => { setTimetable(t); saveToLocal('timetable', t); }} 
        />;
      case 'create': 
        return <ReportForm students={students} currentUser={currentUser} onSave={(r) => { const newR = [r, ...reports]; setReports(newR); saveToLocal('reports', newR); }} />;
      case 'reports': 
        return <ReportList reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddMessage} onDeleteMessage={handleDeleteMessage} onMarkResolved={handleMarkResolved} onUpdateReport={handleUpdateReport} />;
      case 'word-king': 
        return <WordKing classroomBest={adminConfig.wordKingClassroomRecord} classroomHolder={adminConfig.wordKingClassroomHolder} userId={currentUser.id} onNewClassroomRecord={(record, holder) => handleUpdateAdminConfig({ wordKingClassroomRecord: record, wordKingClassroomHolder: holder })} />;
      case 'iq-test': 
        return <IQTest studentName={currentUser.name} grade={activeStudent?.grade || ""} onComplete={handleSaveIQ} />;
      case 'interview': 
        return <InterviewCenter students={students} reports={reports} mockExams={mockExams} adminConfig={adminConfig} />;
      case 'students': 
        return <StudentCenter students={students} reports={reports} allSessions={allSessions} currentUser={currentUser} onAddMessage={handleAddMessage} onDeleteMessage={handleDeleteMessage} onMarkResolved={handleMarkResolved} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} />;
      case 'instructors':
        return <InstructorCenter instructors={instructors} students={students} onAssignStudent={handleAssignStudent} onRemoveStudent={handleRemoveStudent} onUpdateInstructor={handleUpdateInstructor} onAddInstructor={handleAddInstructor} onDeleteInstructor={handleDeleteInstructor} />;
      case 'salary':
        return <SalaryCenter instructors={instructors} reports={reports} />;
      case 'mock':
        return <MockExamCenter students={students} mockExams={mockExams} role={currentUser.role} currentUserId={currentUser.id} onSave={(e) => { const newM = [e, ...mockExams]; setMockExams(newM); saveToLocal('mockExams', newM); }} onUpdate={(e) => { const newM = mockExams.map(m => m.id === e.id ? e : m); setMockExams(newM); saveToLocal('mockExams', newM); }} onDelete={(id) => { const newM = mockExams.filter(m => m.id !== id); setMockExams(newM); saveToLocal('mockExams', newM); }} />;
      case 'messages':
        return <MessageCenter reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddMessage} onDeleteMessage={handleDeleteMessage} onMarkResolved={handleMarkResolved} />;
      case 'timetable': 
        return <TimetableManager timetable={timetable} students={students} instructors={instructors} onUpdate={(t) => { setTimetable(t); saveToLocal('timetable', t); }} />;
      case 'settings': 
        return <AdminSettings adminConfig={adminConfig} onUpdate={handleUpdateAdminConfig} />;
      default: 
        return <div className="p-10 text-center text-slate-400">Content not found for: {activeTab}</div>;
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-600 animate-pulse">Initializing Study Base...</div>;
  
  if (!isAuthenticated) return (
    <div className="h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-sm w-full border border-slate-100">
        <h1 className="text-4xl font-black italic mb-8">STUDY <span className="text-indigo-600">BASE</span></h1>
        {authStep === 'role-selection' ? (
          <div className="space-y-4">
            <button onClick={() => { setLoginRole('student'); setAuthStep('credentials'); }} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all">生徒・保護者</button>
            <button onClick={() => { setLoginRole('instructor'); setAuthStep('credentials'); }} className="w-full py-6 bg-slate-800 text-white rounded-[2rem] font-black shadow-xl hover:bg-slate-900 transition-all">講師</button>
            <button onClick={() => { setLoginRole('admin'); setAuthStep('credentials'); }} className="text-xs text-slate-300 font-bold uppercase mt-8 block mx-auto hover:text-indigo-400 transition-colors">Admin Access</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
            <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="ログインID" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all">ログイン</button>
            <button type="button" onClick={() => setAuthStep('role-selection')} className="text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors">役割選択に戻る</button>
          </form>
        )}
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
