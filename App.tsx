
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, Report, MockExam, Student, Instructor, TimetableEntry, StudySession, AdminConfig, ReportMessage, IQResult } from './types';
import { MOCK_STUDENTS, MOCK_INSTRUCTORS, MOCK_REPORTS, MOCK_TIMETABLE } from './constants';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { generateUniqueId, getLocalISOString, parseSafeDate } from './utils';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import { StudentCenter } from './components/StudentCenter';
import { SalaryCenter } from './components/SalaryCenter';
import { InterviewCenter } from './components/InterviewCenter';
import { MockExamCenter } from './components/MockExamCenter';
import { WordKing } from './components/WordKing';
import { IQTest } from './components/IQTest';
import { TimetableManager } from './components/TimetableManager';
import AdminSettings from './components/AdminSettings';
import MessageCenter from './components/MessageCenter';
import InstructorCenter from './components/InstructorCenter';

export { getLocalISOString, parseSafeDate };

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
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(DEFAULT_ADMIN);

  const isUpdatingRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<number | null>(null);

  const fetchAllData = useCallback(async (isSilent = false) => {
    if (isUpdatingRef.current) return;

    if (!isSupabaseConfigured || !supabase) {
      if (!isSilent) {
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
      }
      return;
    }

    try {
      if (!isSilent) setIsLoading(true);
      
      const [
        { data: adminData },
        { data: studentData },
        { data: instructorData },
        { data: reportData },
        { data: mockData },
        { data: timetableData },
        { data: sessionData }
      ] = await Promise.all([
        supabase.from('admin_config').select('*').eq('id', 1).maybeSingle(),
        supabase.from('students').select('*'),
        supabase.from('instructors').select('*'),
        supabase.from('reports').select('*').order('date', { ascending: false }),
        supabase.from('mock_exams').select('*'),
        supabase.from('timetable').select('*'),
        supabase.from('study_sessions').select('*')
      ]);

      const latestInstructors = (instructorData || []).map(i => ({ 
        id: i.id, name: i.name, specialty: i.specialty, 
        loginId: i.loginId || i.login_id, 
        password: i.password 
      }));
      setInstructors(latestInstructors);
      
      const validInstructorIds = new Set(latestInstructors.map(i => i.id));

      if (studentData) {
        setStudents(studentData.map(s => {
          const rawIds = s.instructorIds || s.instructor_ids || [];
          const cleanedIds = Array.isArray(rawIds) ? rawIds.filter((id: string) => validInstructorIds.has(id)) : [];
          
          return {
            id: s.id, name: s.name, grade: s.grade, 
            loginId: s.loginId || s.login_id, 
            password: s.password,
            targetSchool: s.targetSchool || s.target_school, 
            targetFaculty: s.targetFaculty || s.target_faculty,
            weeklyInstructorMessage: s.weeklyInstructorMessage || s.weekly_instructor_message, 
            instructorIds: cleanedIds,
            iqHistory: s.iqHistory || s.iq_history || [],
            wordKingBest: s.wordKingBest || s.word_king_best || 0,
            targets: s.targets || undefined
          };
        }));
      }

      if (adminData) {
        setAdminConfig({
          id: adminData.id, 
          name: adminData.name, 
          loginId: adminData.loginId || adminData.login_id,
          passwordHash: adminData.passwordHash || adminData.password_hash || DEFAULT_ADMIN.passwordHash,
          location: adminData.location, 
          wordKingClassroomRecord: adminData.wordKingClassroomRecord ?? adminData.word_king_record ?? 0,
          wordKingClassroomHolder: adminData.wordKingClassroomHolder || adminData.word_king_holder || '---'
        });
      }

      if (reportData) setReports(reportData.map(r => ({
        id: r.id, 
        studentId: r.studentId || r.student_id, 
        date: r.date, 
        subject: r.subject, 
        instructorName: r.instructorName || r.instructor_name,
        sessionYear: r.sessionYear || r.session_year, 
        sessionMonth: r.sessionMonth || r.session_month, 
        sessionCount: r.sessionCount || r.session_count,
        attendanceStatus: r.attendanceStatus || r.attendance_status,
        rawNotes: r.rawNotes || r.raw_notes, 
        homeworkAssigned: r.homeworkAssigned || r.homework_assigned,
        homeworkCompletion: r.homeworkCompletion || r.homework_completion, 
        proposedSelfStudyDays: r.proposedSelfStudyDays || r.proposed_self_study_days,
        generatedContent: r.generatedContent || r.generated_content, 
        quizScore: r.quizScore || r.quiz_score, 
        messages: r.messages || [], 
        needsAction: r.needsAction || r.needs_action || false
      })));

      if (mockData) setMockExams(mockData.map(m => ({ 
        id: m.id, 
        studentId: m.studentId || m.student_id, 
        examName: m.examName || m.exam_name, 
        examDate: m.examDate || m.exam_date,
        scores: m.scores || {} 
      })));

      if (timetableData) {
        setTimetable(timetableData.map(t => ({ 
          id: t.id, 
          dayOfWeek: t.dayOfWeek || t.day_of_week, 
          startTime: t.startTime || t.start_time, 
          endTime: t.endTime || t.end_time, 
          subject: t.subject, 
          studentId: t.studentId || t.student_id, 
          instructorId: t.instructorId || t.instructor_id, 
          room: t.room 
        })).filter(t => !t.instructorId || validInstructorIds.has(t.instructorId)));
      }

      if (sessionData) setAllSessions(sessionData.map(s => ({ 
        id: s.id, 
        studentId: s.studentId || s.student_id, 
        date: s.date, 
        subject: s.subject, 
        minutes: s.minutes 
      })));

    } catch (err) {
      console.error("Critical Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. 初期データ読み込み（認証に関わらず実行し、ログイン情報を取得する）
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 2. 認証後の同期処理
  useEffect(() => { 
    if (!isAuthenticated) return;
    
    let channel: any;
    if (isSupabaseConfigured && supabase) {
      channel = supabase.channel('db-integrity-final-v3.0.1')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          if (!isUpdatingRef.current) fetchAllData(true);
        })
        .subscribe();
    }

    const syncTimer = window.setInterval(() => {
      if (!isUpdatingRef.current) fetchAllData(true);
    }, 15000); 

    const handleSyncOnVisibility = () => {
      if (!isUpdatingRef.current && (document.visibilityState === 'visible' || document.hasFocus())) {
        fetchAllData(true);
      }
    };
    document.addEventListener('visibilitychange', handleSyncOnVisibility);
    window.addEventListener('focus', handleSyncOnVisibility);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleSyncOnVisibility);
      window.removeEventListener('focus', handleSyncOnVisibility);
    };
  }, [fetchAllData, isAuthenticated]);

  const startUpdate = () => {
    isUpdatingRef.current = true;
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = window.setTimeout(() => { isUpdatingRef.current = false; }, 8000);
  };

  const endUpdate = () => {
    isUpdatingRef.current = false;
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRole === 'admin') {
      if (loginId === adminConfig.loginId && password === adminConfig.passwordHash) {
        setCurrentUser({ role: 'admin', id: 'admin', name: adminConfig.name });
        setIsAuthenticated(true);
        return;
      }
      alert('管理者ログイン情報が正しくありません。');
    } else if (loginRole === 'instructor') {
      const ins = instructors.find(i => i.loginId === loginId && i.password === password);
      if (ins) {
        setCurrentUser({ role: 'instructor', id: ins.id, name: ins.name });
        setIsAuthenticated(true);
        return;
      }
      alert('講師ログイン情報が正しくありません。');
    } else {
      const std = students.find(s => s.loginId === loginId && s.password === password);
      if (std) {
        setCurrentUser({ role: loginRole, id: std.id, name: std.name });
        setIsAuthenticated(true);
        return;
      }
      alert('生徒・保護者ログイン情報が正しくありません。');
    }
  };

  const handleLogout = () => { 
    setIsAuthenticated(false); 
    setAuthStep('role-selection'); 
    setActiveTab('dashboard'); 
  };

  const handleUpdateAdminConfig = async (updates: Partial<AdminConfig>) => {
    startUpdate();
    try {
      let latestConfig: AdminConfig = { ...adminConfig, ...updates };
      setAdminConfig(latestConfig);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('admin_config').update({
          name: latestConfig.name, 
          login_id: latestConfig.loginId, 
          password_hash: latestConfig.passwordHash,
          location: latestConfig.location, 
          word_king_record: latestConfig.wordKingClassroomRecord,
          word_king_holder: latestConfig.wordKingClassroomHolder
        }).eq('id', 1);
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    startUpdate();
    try {
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
        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from('students').update(dbUpdates).eq('id', id);
          await fetchAllData(true);
        }
      }
    } finally { endUpdate(); }
  };

  const handleAddStudent = async (d: Omit<Student, 'id' | 'instructorIds'>) => {
    startUpdate();
    try {
      const id = generateUniqueId('s');
      if (isSupabaseConfigured && supabase) {
        await supabase.from('students').insert({ 
          id, 
          name: d.name, 
          grade: d.grade, 
          login_id: d.loginId, 
          password: d.password, 
          target_school: d.targetSchool, 
          target_faculty: d.targetFaculty 
        });
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleDeleteStudent = async (id: string) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await Promise.all([
          supabase.from('students').delete().eq('id', id),
          supabase.from('report_drafts').delete().eq('student_id', id),
          supabase.from('study_sessions').delete().eq('student_id', id)
        ]);
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleLogSession = async (session: StudySession) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('study_sessions').insert({
          id: session.id, 
          student_id: session.studentId, 
          date: session.date,
          subject: session.subject, 
          minutes: session.minutes
        });
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleSaveReport = async (report: Report) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('reports').insert({
          id: report.id, 
          student_id: report.studentId, 
          date: report.date, 
          subject: report.subject, 
          instructor_name: report.instructorName,
          session_year: report.sessionYear, 
          session_month: report.sessionMonth, 
          session_count: report.sessionCount,
          attendance_status: report.attendanceStatus, 
          raw_notes: report.rawNotes, 
          homework_assigned: report.homeworkAssigned,
          homework_completion: report.homeworkCompletion, 
          proposed_self_study_days: report.proposedSelfStudyDays,
          generated_content: report.generatedContent, 
          quiz_score: report.quizScore, 
          messages: report.messages || [], 
          needs_action: report.needsAction || false
        });
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleUpdateReport = async (reportId: string, updates: Partial<Report>) => {
    startUpdate();
    try {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
      if (isSupabaseConfigured && supabase) {
        const dbUpdates: any = {};
        if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.studentId !== undefined) dbUpdates.student_id = updates.studentId;
        if (updates.instructorName !== undefined) dbUpdates.instructor_name = updates.instructorName;
        if (updates.sessionYear !== undefined) dbUpdates.session_year = updates.sessionYear;
        if (updates.sessionMonth !== undefined) dbUpdates.session_month = updates.sessionMonth;
        if (updates.sessionCount !== undefined) dbUpdates.session_count = updates.sessionCount;
        if (updates.attendanceStatus !== undefined) dbUpdates.attendance_status = updates.attendanceStatus;
        if (updates.homeworkCompletion !== undefined) dbUpdates.homework_completion = updates.homeworkCompletion;
        if (updates.proposedSelfStudyDays !== undefined) dbUpdates.proposed_self_study_days = updates.proposedSelfStudyDays;
        if (updates.messages !== undefined) dbUpdates.messages = updates.messages;
        if (updates.needsAction !== undefined) dbUpdates.needs_action = updates.needsAction;
        if (updates.generatedContent !== undefined) dbUpdates.generated_content = updates.generatedContent;
        if (updates.quizScore !== undefined) dbUpdates.quiz_score = updates.quizScore;
        if (updates.rawNotes !== undefined) dbUpdates.raw_notes = updates.rawNotes;
        if (updates.homeworkAssigned !== undefined) dbUpdates.homework_assigned = updates.homeworkAssigned;
        
        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from('reports').update(dbUpdates).eq('id', reportId);
          await fetchAllData(true);
        }
      }
    } finally { endUpdate(); }
  };

  const handleAddReportMessage = async (reportId: string, text: string) => {
    startUpdate();
    try {
      let currentMessages: ReportMessage[] = [];
      let currentNeedsAction = false;
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('reports').select('messages, needs_action').eq('id', reportId).maybeSingle();
        if (data) {
          currentMessages = data.messages || [];
          currentNeedsAction = data.needs_action || false;
        }
      }
      const newMessage: ReportMessage = { 
        id: generateUniqueId('msg'), senderId: currentUser.id, senderName: currentUser.name, senderRole: currentUser.role, 
        text, timestamp: new Date().toLocaleTimeString('ja-JP') 
      };
      const updatedMessages = [...currentMessages, newMessage];
      const shouldNeedAction = currentUser.role === 'student' || currentUser.role === 'parent';
      await handleUpdateReport(reportId, { messages: updatedMessages, needsAction: shouldNeedAction ? true : currentNeedsAction });
    } finally { endUpdate(); }
  };

  const handleDeleteReportMessage = async (reportId: string, messageId: string) => {
    startUpdate();
    try {
      let currentMessages: ReportMessage[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('reports').select('messages').eq('id', reportId).maybeSingle();
        if (data) currentMessages = data.messages || [];
      }
      await handleUpdateReport(reportId, { messages: currentMessages.filter(m => m.id !== messageId) });
    } finally { endUpdate(); }
  };

  const handleUpdateTimetable = async (newTimetable: TimetableEntry[]) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('timetable').delete().neq('id', 'temp_id_flush_preventer');
        const insertData = newTimetable.map(t => ({
          id: t.id, 
          day_of_week: t.dayOfWeek, 
          start_time: t.startTime, 
          end_time: t.endTime,
          subject: t.subject, 
          student_id: t.studentId, 
          instructor_id: t.instructorId, 
          room: t.room
        }));
        if (insertData.length > 0) await supabase.from('timetable').insert(insertData);
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleAddInstructor = async (d: Omit<Instructor, 'id'>) => {
    startUpdate();
    try {
      const id = generateUniqueId('i');
      if (isSupabaseConfigured && supabase) {
        await supabase.from('instructors').insert({ 
          id, 
          name: d.name, 
          specialty: d.specialty, 
          login_id: d.loginId, 
          password: d.password 
        });
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleUpdateInstructor = async (id: string, upd: Partial<Instructor>) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        const dbUpd: any = {};
        if (upd.name) dbUpd.name = upd.name;
        if (upd.specialty) dbUpd.specialty = upd.specialty;
        if (upd.loginId) dbUpd.login_id = upd.loginId;
        if (upd.password) dbUpd.password = upd.password;
        await supabase.from('instructors').update(dbUpd).eq('id', id);
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleDeleteInstructor = async (id: string) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: latestStudents } = await supabase.from('students').select('id, instructor_ids');
        const studentUpdates = (latestStudents || [])
          .filter(s => (s.instructor_ids || []).includes(id))
          .map(s => {
            const newIds = (s.instructor_ids || []).filter((iid: string) => iid !== id);
            return supabase.from('students').update({ instructor_ids: newIds }).eq('id', s.id);
          });
        
        await Promise.all([
          supabase.from('instructors').delete().eq('id', id),
          supabase.from('timetable').delete().eq('instructor_id', id),
          supabase.from('report_drafts').delete().eq('instructor_id', id),
          ...studentUpdates
        ]);

        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleAddMockExam = async (e: MockExam) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('mock_exams').insert({ 
          id: e.id, 
          student_id: e.studentId, 
          exam_name: e.examName, 
          exam_date: e.examDate, 
          scores: e.scores 
        });
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleUpdateMockExam = async (e: MockExam) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('mock_exams').update({ 
          exam_name: e.examName, 
          exam_date: e.examDate, 
          scores: e.scores 
        }).eq('id', e.id);
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleDeleteMockExam = async (id: string) => {
    startUpdate();
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('mock_exams').delete().eq('id', id);
        await fetchAllData(true);
      }
    } finally { endUpdate(); }
  };

  const handleSaveIQ = async (score: number, breakdown: any, analysis: string) => {
    if (currentUser.role !== 'student') return;
    startUpdate();
    try {
      let latestHistory: IQResult[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('students').select('iq_history').eq('id', currentUser.id).maybeSingle();
        if (data) latestHistory = data.iq_history || [];
      }
      const newIQ: IQResult = {
        id: generateUniqueId('iq'), date: getLocalISOString(), score, estimatedIQ: Math.round(100 + (score - 50) * 0.8), breakdown, aiAnalysis: analysis
      };
      await handleUpdateStudent(currentUser.id, { iqHistory: [newIQ, ...latestHistory] });
    } finally { endUpdate(); }
  };

  const handleUpdateWordKingBest = async (newScore: number) => {
    if (currentUser.role !== 'student') return;
    startUpdate();
    try {
      let currentBest = 0;
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('students').select('word_king_best').eq('id', currentUser.id).maybeSingle();
        if (data) currentBest = data.word_king_best || 0;
      }
      if (newScore > currentBest) await handleUpdateStudent(currentUser.id, { wordKingBest: newScore });
    } finally { endUpdate(); }
  };

  const renderContent = () => {
    const activeStudent = students.find(s => s.id === currentUser.id);
    switch (activeTab) {
      case 'dashboard': return <Dashboard reports={reports} students={students} instructors={instructors} role={currentUser.role} mockExams={mockExams} currentUserStudent={activeStudent} currentUserId={currentUser.id} allSessions={allSessions} onLogSession={handleLogSession} timetable={timetable} onUpdateTimetable={handleUpdateTimetable} onUpdateStudent={handleUpdateStudent} />;
      case 'create': return <ReportForm students={students} currentUser={currentUser} onSave={handleSaveReport} />;
      case 'reports': return <ReportList reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} onUpdateReport={handleUpdateReport} />;
      case 'word-king': return <WordKing classroomBest={adminConfig.wordKingClassroomRecord} classroomHolder={adminConfig.wordKingClassroomHolder} userId={currentUser.id} personalBestFromDB={activeStudent?.wordKingBest || 0} onPersonalBestUpdate={handleUpdateWordKingBest} onNewClassroomRecord={(record, holder) => handleUpdateAdminConfig({ wordKingClassroomRecord: record, wordKingClassroomHolder: holder })} />;
      case 'iq-test': return <IQTest studentName={currentUser.name} grade={activeStudent?.grade || ""} userId={currentUser.id} iqHistory={activeStudent?.iqHistory || []} onComplete={handleSaveIQ} />;
      case 'interview': return <InterviewCenter students={students} reports={reports} mockExams={mockExams} adminConfig={adminConfig} />;
      case 'students': return <StudentCenter students={students} reports={reports} allSessions={allSessions} instructors={instructors} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} />;
      case 'instructors': return <InstructorCenter instructors={instructors} students={students} onAssignStudent={async (sid, iid) => {
          let currentIds: string[] = [];
          if (isSupabaseConfigured && supabase) {
            const { data } = await supabase.from('students').select('instructor_ids').eq('id', sid).maybeSingle();
            if (data) currentIds = data.instructor_ids || [];
          }
          await handleUpdateStudent(sid, { instructorIds: Array.from(new Set([...currentIds, iid])) });
        }} onRemoveStudent={async (sid, iid) => {
          let currentIds: string[] = [];
          if (isSupabaseConfigured && supabase) {
            const { data } = await supabase.from('students').select('instructor_ids').eq('id', sid).maybeSingle();
            if (data) currentIds = data.instructor_ids || [];
          }
          await handleUpdateStudent(sid, { instructorIds: currentIds.filter(id => id !== iid) });
        }} onUpdateInstructor={handleUpdateInstructor} onAddInstructor={handleAddInstructor} onDeleteInstructor={handleDeleteInstructor} />;
      case 'salary': return <SalaryCenter instructors={instructors} reports={reports} />;
      case 'mock': return <MockExamCenter students={students} mockExams={mockExams} role={currentUser.role} currentUserId={currentUser.id} onSave={handleAddMockExam} onUpdate={handleUpdateMockExam} onDelete={handleDeleteMockExam} />;
      case 'messages': return <MessageCenter reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} />;
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
        <p className="text-[10px] text-slate-300 font-bold mt-8 uppercase tracking-widest">ver 3.0.1</p>
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
