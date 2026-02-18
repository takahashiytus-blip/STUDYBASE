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
      
      // 1. Admin Config
      const { data: adminData } = await supabase.from('admin_config').select('*').eq('id', 1).maybeSingle();
      if (adminData) {
        setAdminConfig({
          name: adminData.name,
          loginId: adminData.login_id,
          passwordHash: adminData.password_hash || DEFAULT_ADMIN.passwordHash,
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
      } else {
        setStudents(MOCK_STUDENTS);
      }

      // 3. Instructors
      const { data: instructorData } = await supabase.from('instructors').select('*');
      if (instructorData) {
        setInstructors(instructorData.map(i => ({
          id: i.id, name: i.name, specialty: i.specialty,
          loginId: i.login_id, password: i.password
        })));
      } else {
        setInstructors(MOCK_INSTRUCTORS);
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
      } else {
        setReports(MOCK_REPORTS);
      }

      // 5. Mock Exams
      const { data: mockData } = await supabase.from('mock_exams').select('*');
      if (mockData) {
        setMockExams(mockData.map(m => ({
          id: m.id,
          studentId: m.student_id,
          examName: m.exam_name,
          examDate: m.exam_date,
          scores: m.scores || {}
        })));
      }

      // 6. Timetable
      const { data: timetableData } = await supabase.from('timetable').select('*');
      if (timetableData) {
        setTimetable(timetableData.map(t => ({
          id: t.id, dayOfWeek: t.day_of_week, startTime: t.start_time,
          endTime: t.end_time, subject: t.subject, studentId: t.student_id,
          instructorId: t.instructor_id, room: t.room
        })));
      } else {
        setTimetable(MOCK_TIMETABLE);
      }

      // 7. Study Sessions
      const { data: sessionData } = await supabase.from('study_sessions').select('*');
      if (sessionData) {
        setAllSessions(sessionData.map(s => ({
          id: s.id,
          studentId: s.student_id,
          date: s.date,
          subject: s.subject,
          minutes: s.minutes
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

  // --- Actions ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginRole === 'admin') {
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

  // Fix: Added handleLogout to clear authentication state and reset view state
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser({ role: 'student', id: '', name: '' });
    setLoginId('');
    setPassword('');
    setActiveTab('dashboard');
    setAuthStep('role-selection');
  };

  const updateAdminConfig = async (updates: Partial<AdminConfig>) => {
    const newConfig = { ...adminConfig, ...updates };
    setAdminConfig(newConfig);
    if (supabase) {
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
    }
  };

  const saveReport = async (report: Report) => {
    setReports(prev => [report, ...prev]);
    if (supabase) {
      await supabase.from('reports').upsert({
        id: report.id,
        student_id: report.studentId,
        date: report.date,
        subject: report.subject,
        instructor_name: report.instructorName,
        session_year: report.sessionYear,
        session_month: report.sessionMonth,
        session_count: report.sessionCount,
        attendance_status: report.attendanceStatus,
        raw_notes: report.raw_notes,
        homework_assigned: report.homeworkAssigned,
        homework_completion: report.homeworkCompletion,
        proposed_self_study_days: report.proposedSelfStudyDays,
        generated_content: report.generatedContent,
        quiz_score: report.quizScore,
        messages: report.messages,
        needs_action: report.needsAction
      });
    }
    setActiveTab('dashboard');
  };

  const updateReport = async (reportId: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
    if (supabase) {
      const r = reports.find(item => item.id === reportId);
      if (r) {
        const merged = { ...r, ...updates };
        await supabase.from('reports').update({
          messages: merged.messages,
          needs_action: merged.needs_action,
          generated_content: merged.generated_content,
          subject: merged.subject,
          attendance_status: merged.attendance_status
        }).eq('id', reportId);
      }
    }
  };

  const addMessage = async (reportId: string, text: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const newMessage: ReportMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text,
      timestamp: new Date().toLocaleString('ja-JP')
    };

    const updatedMessages = [...(report.messages || []), newMessage];
    const needsAction = currentUser.role === 'student' || currentUser.role === 'parent';
    
    await updateReport(reportId, { messages: updatedMessages, needsAction });
  };

  const deleteMessage = async (reportId: string, messageId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const updatedMessages = (report.messages || []).filter(m => m.id !== messageId);
    await updateReport(reportId, { messages: updatedMessages });
  };

  const markResolved = async (reportId: string) => {
    await updateReport(reportId, { needsAction: false });
  };

  const addStudent = async (studentData: Omit<Student, 'id' | 'instructorIds'>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newStudent = { ...studentData, id: newId, instructorIds: [] };
    setStudents(prev => [...prev, newStudent]);
    if (supabase) {
      await supabase.from('students').insert({
        id: newId,
        name: studentData.name,
        grade: studentData.grade,
        login_id: studentData.loginId,
        password: studentData.password,
        target_school: studentData.targetSchool,
        target_faculty: studentData.targetFaculty
      });
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (supabase) {
      await supabase.from('students').update({
        name: updates.name,
        grade: updates.grade,
        login_id: updates.loginId,
        password: updates.password,
        target_school: updates.targetSchool,
        target_faculty: updates.targetFaculty,
        weekly_instructor_message: updates.weeklyInstructorMessage,
        instructor_ids: updates.instructorIds
      }).eq('id', id);
    }
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (supabase) await supabase.from('students').delete().eq('id', id);
  };

  const addInstructor = async (insData: Omit<Instructor, 'id'>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newIns = { ...insData, id: newId };
    setInstructors(prev => [...prev, newIns]);
    if (supabase) {
      await supabase.from('instructors').insert({
        id: newId,
        name: insData.name,
        specialty: insData.specialty,
        login_id: insData.loginId,
        password: insData.password
      });
    }
  };

  const updateInstructor = async (id: string, updates: Partial<Instructor>) => {
    setInstructors(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    if (supabase) {
      await supabase.from('instructors').update({
        name: updates.name,
        specialty: updates.specialty,
        login_id: updates.loginId,
        password: updates.password
      }).eq('id', id);
    }
  };

  const deleteInstructor = async (id: string) => {
    setInstructors(prev => prev.filter(i => i.id !== id));
    if (supabase) await supabase.from('instructors').delete().eq('id', id);
  };

  const handleLogSession = async (session: StudySession) => {
    setAllSessions(prev => [...prev, session]);
    if (supabase) {
      await supabase.from('study_sessions').insert({
        id: session.id,
        student_id: session.studentId,
        date: session.date,
        subject: session.subject,
        minutes: session.minutes
      });
    }
  };

  const updateTimetable = async (newTimetable: TimetableEntry[]) => {
    setTimetable(newTimetable);
    if (supabase) {
      // 既存を一旦消去して入れ直す（または個別にupsert）
      for (const entry of newTimetable) {
        await supabase.from('timetable').upsert({
          id: entry.id,
          day_of_week: entry.dayOfWeek,
          start_time: entry.startTime,
          end_time: entry.endTime,
          subject: entry.subject,
          student_id: entry.studentId,
          instructor_id: entry.instructorId,
          room: entry.room
        });
      }
    }
  };

  const saveMockExam = async (exam: MockExam) => {
    setMockExams(prev => [...prev, exam]);
    if (supabase) {
      await supabase.from('mock_exams').insert({
        id: exam.id,
        student_id: exam.studentId,
        exam_name: exam.examName,
        exam_date: exam.examDate,
        scores: exam.scores
      });
    }
  };

  const updateMockExam = async (exam: MockExam) => {
    setMockExams(prev => prev.map(m => m.id === exam.id ? exam : m));
    if (supabase) {
      await supabase.from('mock_exams').update({
        exam_name: exam.examName,
        exam_date: exam.examDate,
        scores: exam.scores
      }).eq('id', exam.id);
    }
  };

  const deleteMockExam = async (id: string) => {
    setMockExams(prev => prev.filter(m => m.id !== id));
    if (supabase) await supabase.from('mock_exams').delete().eq('id', id);
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
            onLogSession={handleLogSession}
            timetable={timetable} onUpdateTimetable={updateTimetable}
          />
        );
      case 'create':
        return <ReportForm students={students} currentUser={currentUser} onSave={saveReport} />;
      case 'reports':
        return (
          <ReportList 
            reports={reports} students={students} currentUser={currentUser} 
            onAddMessage={addMessage} onDeleteMessage={deleteMessage} onMarkResolved={markResolved}
            onUpdateReport={updateReport}
          />
        );
      case 'messages':
        return (
          <MessageCenter 
            reports={reports} students={students} currentUser={currentUser} 
            onAddMessage={addMessage} onDeleteMessage={deleteMessage} onMarkResolved={markResolved}
          />
        );
      case 'students':
        return (
          <StudentCenter 
            students={students} reports={reports} allSessions={allSessions} currentUser={currentUser} 
            onAddMessage={addMessage} onDeleteMessage={deleteMessage} onMarkResolved={markResolved}
            onAddStudent={addStudent} onUpdateStudent={updateStudent} onDeleteStudent={deleteStudent}
          />
        );
      case 'instructors':
        return (
          <InstructorCenter 
            instructors={instructors} students={students} 
            onAssignStudent={(sid, iid) => {
              const s = students.find(item => item.id === sid);
              if (s) updateStudent(sid, { instructorIds: [...new Set([...s.instructorIds, iid])] });
            }} 
            onRemoveStudent={(sid, iid) => {
              const s = students.find(item => item.id === sid);
              if (s) updateStudent(sid, { instructorIds: s.instructorIds.filter(id => id !== iid) });
            }}
            onUpdateInstructor={updateInstructor}
            onAddInstructor={addInstructor}
            onDeleteInstructor={deleteInstructor}
          />
        );
      case 'salary':
        return <SalaryCenter instructors={instructors} reports={reports} />;
      case 'interview':
        return <InterviewCenter students={students} reports={reports} mockExams={mockExams} adminConfig={adminConfig} />;
      case 'mock':
        return (
          <MockExamCenter 
            students={students} mockExams={mockExams} 
            role={currentUser.role} currentUserId={currentUser.id}
            onSave={saveMockExam} onUpdate={updateMockExam} onDelete={deleteMockExam}
          />
        );
      case 'word-king':
        return (
          <WordKing 
            classroomBest={adminConfig.wordKingClassroomRecord} 
            classroomHolder={adminConfig.wordKingClassroomHolder}
            onNewClassroomRecord={(record, holder) => updateAdminConfig({ wordKingClassroomRecord: record, wordKingClassroomHolder: holder })}
          />
        );
      case 'timetable':
        return <TimetableManager timetable={timetable} students={students} instructors={instructors} onUpdate={updateTimetable} />;
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