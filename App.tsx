
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
  
  // トースト通知用
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(DEFAULT_ADMIN);

  // セッション復元
  useEffect(() => {
    const savedUser = localStorage.getItem('study_base_session');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('study_base_session');
      }
    }
  }, []);

  // ローカルモード時のデータ永続化
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('sb_data_students', JSON.stringify(students));
      localStorage.setItem('sb_data_instructors', JSON.stringify(instructors));
      localStorage.setItem('sb_data_reports', JSON.stringify(reports));
      localStorage.setItem('sb_data_mock_exams', JSON.stringify(mockExams));
      localStorage.setItem('sb_data_sessions', JSON.stringify(allSessions));
      localStorage.setItem('sb_data_timetable', JSON.stringify(timetable));
      localStorage.setItem('study_base_admin_config', JSON.stringify(adminConfig));
    }
  }, [students, instructors, reports, mockExams, allSessions, timetable, adminConfig]);

  const isUpdatingRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<number | null>(null);
  const syncPendingRef = useRef<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAllData = useCallback(async (isSilent = false) => {
    if (isUpdatingRef.current) {
      syncPendingRef.current = true;
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      if (!isSilent) {
        const localReports = localStorage.getItem('sb_data_reports');
        const localStudents = localStorage.getItem('sb_data_students');
        const localInstructors = localStorage.getItem('sb_data_instructors');
        const savedAdmin = localStorage.getItem('study_base_admin_config');

        setReports(localReports ? JSON.parse(localReports) : MOCK_REPORTS);
        setStudents(localStudents ? JSON.parse(localStudents) : MOCK_STUDENTS);
        setInstructors(localInstructors ? JSON.parse(localInstructors) : MOCK_INSTRUCTORS);
        setTimetable(MOCK_TIMETABLE);
        if (savedAdmin) setAdminConfig(JSON.parse(savedAdmin));
        setIsLoading(false);
      }
      return;
    }

    try {
      console.log(`[Sync] Fetching latest data from Supabase... (Silent: ${isSilent})`);
      const [
        { data: adminData, error: adminError },
        { data: studentData, error: studentError },
        { data: instructorData, error: instructorError },
        { data: reportData, error: reportError },
        { data: mockData, error: mockError },
        { data: timetableData, error: timetableError },
        { data: sessionData, error: sessionError }
      ] = await Promise.all([
        supabase.from('admin_config').select('*').eq('id', 1).maybeSingle(),
        supabase.from('students').select('*'),
        supabase.from('instructors').select('*'),
        supabase.from('reports').select('*').order('date', { ascending: false }),
        supabase.from('mock_exams').select('*').order('exam_date', { ascending: false }),
        supabase.from('timetable').select('*'),
        supabase.from('study_sessions').select('*').order('date', { ascending: false })
      ]);

      if (adminError || studentError || instructorError || reportError || mockError || timetableError || sessionError) {
        console.error("[Sync] Error fetching data:", { adminError, studentError, instructorError, reportError, mockError, timetableError, sessionError });
      } else {
        console.log(`[Sync] Successfully fetched: ${instructorData?.length} instructors, ${studentData?.length} students`);
      }

      const validInstructorIds = new Set((instructorData || []).map(i => i.id));
      const validStudentIds = new Set((studentData || []).map(s => s.id));

      if (instructorData) {
        setInstructors(instructorData.map(i => ({ 
          id: i.id, name: i.name, specialty: i.specialty, 
          loginId: i.login_id ?? i.loginId, 
          password: i.password 
        })));
      }
      
      if (studentData) {
        setStudents(studentData.map(s => {
          const rawIds = s.instructor_ids ?? s.instructorIds ?? [];
          const cleanInstructorIds = rawIds.filter((id: string) => validInstructorIds.has(id));
          return {
            id: s.id, name: s.name, grade: s.grade, 
            loginId: s.login_id ?? s.loginId, 
            password: s.password,
            targetSchool: s.target_school ?? s.targetSchool, 
            targetFaculty: s.target_faculty ?? s.targetFaculty,
            weeklyInstructorMessage: s.weekly_instructor_message ?? s.weeklyInstructorMessage, 
            instructorIds: cleanInstructorIds,
            iqHistory: s.iq_history ?? s.iqHistory ?? [],
            wordKingBest: s.word_king_best ?? s.wordKingBest ?? 0,
            studyPlusId: s.study_plus_id ?? s.studyPlusId,
            studyPlusMinutes: s.study_plus_minutes ?? s.studyPlusMinutes ?? {},
            studyPlusLastSynced: s.study_plus_last_synced ?? s.studyPlusLastSynced,
            targets: s.targets ?? undefined
          };
        }));
      }

      if (adminData) {
        setAdminConfig({
          id: adminData.id, name: adminData.name, 
          loginId: adminData.login_id ?? adminData.loginId,
          passwordHash: adminData.password_hash ?? adminData.passwordHash ?? DEFAULT_ADMIN.passwordHash,
          location: adminData.location, 
          wordKingClassroomRecord: adminData.word_king_record ?? adminData.wordKingClassroomRecord ?? 0,
          wordKingClassroomHolder: adminData.word_king_holder ?? adminData.wordKingClassroomHolder ?? '---'
        });
      }

      if (reportData) {
        setReports(reportData
          .filter(r => validStudentIds.has(r.student_id ?? r.studentId))
          .map(r => ({
            id: r.id, studentId: r.student_id ?? r.studentId, date: r.date, subject: r.subject, 
            instructorName: r.instructor_name ?? r.instructorName,
            sessionYear: r.session_year ?? r.sessionYear, sessionMonth: r.session_month ?? r.sessionMonth, sessionCount: r.session_count ?? r.sessionCount,
            attendanceStatus: r.attendance_status ?? r.attendanceStatus,
            rawNotes: r.raw_notes ?? r.rawNotes, homeworkAssigned: r.homework_assigned ?? r.homeworkAssigned,
            homeworkCompletion: r.homework_completion ?? r.homeworkCompletion, 
            proposedSelfStudyDays: r.proposed_self_study_days ?? r.proposedSelfStudyDays,
            generatedContent: r.generated_content ?? r.generatedContent, 
            quizScore: r.quiz_score ?? r.quizScore, messages: r.messages || [], 
            needsAction: r.needs_action ?? r.needsAction ?? false
          }))
        );
      }

      if (mockData) {
        setMockExams(mockData
          .filter(m => validStudentIds.has(m.student_id ?? m.studentId))
          .map(m => ({ 
            id: m.id, studentId: m.student_id ?? m.studentId, examName: m.exam_name ?? m.examName, 
            examDate: m.exam_date ?? m.examDate, scores: m.scores ?? {} 
          }))
        );
      }

      if (timetableData) {
        setTimetable(timetableData
          .filter(t => {
            const sid = t.student_id ?? t.studentId;
            const iid = t.instructor_id ?? t.instructorId;
            return validStudentIds.has(sid) && (iid ? validInstructorIds.has(iid) : true);
          })
          .map(t => ({ 
            id: t.id, dayOfWeek: t.day_of_week ?? t.dayOfWeek, startTime: t.start_time ?? t.startTime, 
            endTime: t.end_time ?? t.endTime, subject: t.subject, studentId: t.student_id ?? t.studentId, 
            instructorId: t.instructor_id ?? t.instructorId, room: t.room 
          }))
        );
      }

      if (sessionData) {
        setAllSessions(sessionData
          .filter(s => validStudentIds.has(s.student_id ?? s.studentId))
          .map(s => ({ 
            id: s.id, studentId: s.student_id ?? s.studentId, date: s.date, subject: s.subject, minutes: s.minutes 
          }))
        );
      }

    } catch (err) {
      console.warn("Sync overlap prevented.");
    } finally {
      setIsLoading(false);
      if (syncPendingRef.current) {
        syncPendingRef.current = false;
        setTimeout(() => fetchAllData(true), 1000);
      }
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const safetyNet = setTimeout(() => { setIsLoading(false); }, 3000); 
    return () => clearTimeout(safetyNet);
  }, [fetchAllData]);

  useEffect(() => { 
    if (!isAuthenticated) return;
    let channel: any;
    if (isSupabaseConfigured && supabase) {
      channel = supabase.channel('db-sync-v4.3.0')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          fetchAllData(true);
        })
        .subscribe();
    }
    const syncTimer = window.setInterval(() => {
      fetchAllData(true);
    }, 15000); 
    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      clearInterval(syncTimer);
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
    // If a sync was requested during update, trigger it now
    if (syncPendingRef.current) {
      syncPendingRef.current = false;
      fetchAllData(true);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRole === 'admin') {
      if (loginId === adminConfig.loginId && password === adminConfig.passwordHash) {
        const user = { role: 'admin' as UserRole, id: 'admin', name: adminConfig.name };
        setCurrentUser(user);
        localStorage.setItem('study_base_session', JSON.stringify(user));
        setIsAuthenticated(true);
        showToast('管理者としてログインしました');
        return;
      }
      alert('管理者ログイン情報が正しくありません。');
    } else if (loginRole === 'instructor') {
      const ins = instructors.find(i => i.loginId === loginId && i.password === password);
      if (ins) {
        const user = { role: 'instructor' as UserRole, id: ins.id, name: ins.name };
        setCurrentUser(user);
        localStorage.setItem('study_base_session', JSON.stringify(user));
        setIsAuthenticated(true);
        showToast(`${ins.name} 講師としてログインしました`);
        return;
      }
      alert('講師ログイン情報が正しくありません。');
    } else {
      const std = students.find(s => s.loginId === loginId && s.password === password);
      if (std) {
        const user = { role: loginRole as UserRole, id: std.id, name: std.name };
        setCurrentUser(user);
        localStorage.setItem('study_base_session', JSON.stringify(user));
        setIsAuthenticated(true);
        showToast(`${std.name} さんとしてログインしました`);
        return;
      }
      alert('生徒・保護者ログイン情報が正しくありません。');
    }
  };

  const handleLogout = () => { 
    localStorage.removeItem('study_base_session');
    setIsAuthenticated(false); 
    setAuthStep('role-selection'); 
    setActiveTab('dashboard'); 
    setCurrentUser({ role: 'student', id: '', name: '' });
    showToast('ログアウトしました');
  };

  const handleUpdateAdminConfig = async (updates: Partial<AdminConfig>) => {
    startUpdate();
    try {
      let latestConfig: AdminConfig = { ...adminConfig, ...updates };
      setAdminConfig(latestConfig);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('admin_config').update({
          name: latestConfig.name, login_id: latestConfig.loginId, password_hash: latestConfig.passwordHash,
          location: latestConfig.location, word_king_record: latestConfig.wordKingClassroomRecord,
          word_king_holder: latestConfig.wordKingClassroomHolder
        }).eq('id', 1);
      }
      showToast('システム設定を更新しました');
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
        if (updates.studyPlusId !== undefined) dbUpdates.study_plus_id = updates.studyPlusId;
        if (updates.studyPlusMinutes !== undefined) dbUpdates.study_plus_minutes = updates.studyPlusMinutes;
        if (updates.studyPlusLastSynced !== undefined) dbUpdates.study_plus_last_synced = updates.studyPlusLastSynced;
        if (updates.iqHistory !== undefined) dbUpdates.iq_history = updates.iqHistory;
        if (updates.wordKingBest !== undefined) dbUpdates.word_king_best = updates.wordKingBest;
        if (updates.targets !== undefined) dbUpdates.targets = updates.targets;
        if (updates.instructorIds !== undefined) dbUpdates.instructor_ids = updates.instructorIds;
        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from('students').update(dbUpdates).eq('id', id);
        }
      }
    } finally { endUpdate(); }
  };

  const handleAddStudent = async (d: Omit<Student, 'id' | 'instructorIds'>) => {
    startUpdate();
    try {
      const id = generateUniqueId('s');
      const newStd: Student = { ...d, id, instructorIds: [] };
      setStudents(prev => [...prev, newStd]);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('students').insert({ 
          id, name: d.name, grade: d.grade, login_id: d.loginId, password: d.password, 
          target_school: d.targetSchool, target_faculty: d.targetFaculty 
        });
      }
      showToast('生徒を登録しました');
    } finally { endUpdate(); }
  };

  const handleDeleteStudent = async (id: string) => {
    startUpdate();
    try {
      setStudents(prev => prev.filter(s => s.id !== id));
      setReports(prev => prev.filter(r => r.studentId !== id));
      setAllSessions(prev => prev.filter(s => s.studentId !== id));
      setTimetable(prev => prev.filter(t => t.studentId !== id));
      setMockExams(prev => prev.filter(m => m.studentId !== id));

      if (isSupabaseConfigured && supabase) {
        await Promise.all([
          supabase.from('students').delete().eq('id', id),
          supabase.from('report_drafts').delete().eq('student_id', id),
          supabase.from('study_sessions').delete().eq('student_id', id),
          supabase.from('reports').delete().eq('student_id', id),
          supabase.from('timetable').delete().eq('student_id', id),
          supabase.from('mock_exams').delete().eq('student_id', id)
        ]);
      }
      showToast('生徒データを削除しました');
    } finally { endUpdate(); }
  };

  const handleLogSession = async (session: StudySession) => {
    startUpdate();
    try {
      setAllSessions(prev => [session, ...prev]);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('study_sessions').insert({
          id: session.id, student_id: session.studentId, date: session.date, subject: session.subject, minutes: session.minutes
        });
      }
      showToast('学習記録を保存しました');
    } finally { endUpdate(); }
  };

  const handleSaveReport = async (report: Report) => {
    startUpdate();
    try {
      setReports(prev => [report, ...prev]);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('reports').insert({
          id: report.id, student_id: report.studentId, date: report.date, subject: report.subject, instructor_name: report.instructorName,
          session_year: report.sessionYear, session_month: report.sessionMonth, session_count: report.sessionCount,
          attendance_status: report.attendanceStatus, raw_notes: report.rawNotes, homework_assigned: report.homeworkAssigned,
          homework_completion: report.homeworkCompletion, proposed_self_study_days: report.proposedSelfStudyDays,
          generated_content: report.generatedContent, quiz_score: report.quizScore, messages: report.messages || [], 
          needs_action: report.needsAction || false
        });
      }
      showToast('指導報告書を送信しました');
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
        }
      }
    } finally { endUpdate(); }
  };

  const handleAddReportMessage = async (reportId: string, text: string) => {
    startUpdate();
    try {
      const report = reports.find(r => r.id === reportId);
      const currentMessages = report?.messages || [];
      const newMessage: ReportMessage = { 
        id: generateUniqueId('msg'), senderId: currentUser.id, senderName: currentUser.name, senderRole: currentUser.role, 
        text, timestamp: new Date().toLocaleTimeString('ja-JP') 
      };
      const updatedMessages = [...currentMessages, newMessage];
      const shouldNeedAction = currentUser.role === 'student' || currentUser.role === 'parent';
      await handleUpdateReport(reportId, { messages: updatedMessages, needsAction: shouldNeedAction ? true : report?.needsAction });
      showToast('メッセージを送信しました');
    } finally { endUpdate(); }
  };

  const handleDeleteReportMessage = async (reportId: string, messageId: string) => {
    startUpdate();
    try {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const updatedMessages = (report.messages || []).filter(m => m.id !== messageId);
        await handleUpdateReport(reportId, { messages: updatedMessages });
      }
      showToast('メッセージを削除しました');
    } finally { endUpdate(); }
  };

  const handleUpdateTimetable = async (newTimetable: TimetableEntry[], deletedIds: string[] = []) => {
    startUpdate();
    try {
      setTimetable(newTimetable);
      if (isSupabaseConfigured && supabase) {
        if (deletedIds.length > 0) {
          await supabase.from('timetable').delete().in('id', deletedIds);
        }
        const upsertData = newTimetable.map(t => ({
          id: t.id, day_of_week: t.dayOfWeek, start_time: t.startTime, end_time: t.endTime,
          subject: t.subject, student_id: t.studentId, instructor_id: t.instructorId, room: t.room
        }));
        if (upsertData.length > 0) {
          await supabase.from('timetable').upsert(upsertData, { onConflict: 'id' });
        }
      }
      showToast('時間割を保存しました');
    } catch (e) {
      showToast('保存中にエラーが発生しました', 'error');
    } finally { endUpdate(); }
  };

  const handleAddInstructor = async (d: Omit<Instructor, 'id'>) => {
    startUpdate();
    try {
      const id = generateUniqueId('i');
      const newIns: Instructor = { ...d, id };
      setInstructors(prev => [...prev, newIns]);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('instructors').insert({ 
          id, name: d.name, specialty: d.specialty, login_id: d.loginId, password: d.password 
        });
      }
      showToast('講師を登録しました');
    } finally { endUpdate(); }
  };

  const handleUpdateInstructor = async (id: string, upd: Partial<Instructor>) => {
    startUpdate();
    try {
      setInstructors(prev => prev.map(i => i.id === id ? { ...i, ...upd } : i));
      if (isSupabaseConfigured && supabase) {
        const dbUpd: any = {};
        if (upd.name) dbUpd.name = upd.name;
        if (upd.specialty) dbUpd.specialty = upd.specialty;
        if (upd.loginId) dbUpd.login_id = upd.loginId;
        if (upd.password) dbUpd.password = upd.password;
        await supabase.from('instructors').update(dbUpd).eq('id', id);
      }
      showToast('講師情報を更新しました');
    } finally { endUpdate(); }
  };

  const handleDeleteInstructor = async (id: string) => {
    startUpdate();
    try {
      setInstructors(prev => prev.filter(i => i.id !== id));
      setTimetable(prev => prev.filter(t => t.instructorId !== id));
      setStudents(prev => prev.map(s => ({
        ...s,
        instructorIds: (s.instructorIds || []).filter(iid => iid !== id)
      })));

      if (isSupabaseConfigured && supabase) {
        const { data: allStudents } = await supabase.from('students').select('id, instructor_ids');
        let studentUpdates: any[] = [];
        if (allStudents) {
          studentUpdates = allStudents
            .filter(s => (s.instructor_ids || []).includes(id))
            .map(s => {
              const newIds = s.instructor_ids.filter((iid: string) => iid !== id);
              return supabase!.from('students').update({ instructor_ids: newIds }).eq('id', s.id);
            });
        }
        await Promise.all([
          supabase.from('instructors').delete().eq('id', id),
          supabase.from('timetable').delete().eq('instructor_id', id),
          supabase.from('report_drafts').delete().eq('instructor_id', id),
          ...studentUpdates
        ]);
      }
      showToast('講師データを削除しました');
    } finally { endUpdate(); }
  };

  const handleAddMockExam = async (e: MockExam) => {
    startUpdate();
    try {
      setMockExams(prev => [e, ...prev]);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('mock_exams').insert({ 
          id: e.id, student_id: e.studentId, exam_name: e.examName, exam_date: e.examDate, scores: e.scores 
        });
      }
      showToast('模試成績を登録しました');
    } finally { endUpdate(); }
  };

  const handleUpdateMockExam = async (e: MockExam) => {
    startUpdate();
    try {
      setMockExams(prev => prev.map(m => m.id === e.id ? e : m));
      if (isSupabaseConfigured && supabase) {
        await supabase.from('mock_exams').update({ 
          exam_name: e.examName, exam_date: e.examDate, scores: e.scores 
        }).eq('id', e.id);
      }
      showToast('模試成績を更新しました');
    } finally { endUpdate(); }
  };

  const handleDeleteMockExam = async (id: string) => {
    startUpdate();
    try {
      setMockExams(prev => prev.filter(m => m.id !== id));
      if (isSupabaseConfigured && supabase) {
        await supabase.from('mock_exams').delete().eq('id', id);
      }
      showToast('模試成績を削除しました');
    } finally { endUpdate(); }
  };

  const handleSaveIQ = async (score: number, breakdown: any, analysis: string) => {
    if (currentUser.role !== 'student') return;
    startUpdate();
    try {
      const activeStudent = students.find(s => s.id === currentUser.id);
      const newIQ: IQResult = {
        id: generateUniqueId('iq'), date: getLocalISOString(), score, estimatedIQ: Math.round(100 + (score - 50) * 0.8), breakdown, aiAnalysis: analysis
      };
      await handleUpdateStudent(currentUser.id, { iqHistory: [newIQ, ...(activeStudent?.iqHistory || [])] });
      showToast('知能診断結果を保存しました');
    } finally { endUpdate(); }
  };

  const handleUpdateWordKingBest = async (newScore: number) => {
    if (currentUser.role !== 'student') return;
    startUpdate();
    try {
      const activeStudent = students.find(s => s.id === currentUser.id);
      if (newScore > (activeStudent?.wordKingBest || 0)) {
        await handleUpdateStudent(currentUser.id, { wordKingBest: newScore });
        showToast('自己ベストを更新しました！');
      }
    } finally { endUpdate(); }
  };

  const renderContent = () => {
    const activeStudent = students.find(s => s.id === currentUser.id);
    switch (activeTab) {
      case 'dashboard': return <Dashboard reports={reports} students={students} instructors={instructors} role={currentUser.role} mockExams={mockExams} currentUserStudent={activeStudent} currentUserId={currentUser.id} allSessions={allSessions} onLogSession={handleLogSession} timetable={timetable} onUpdateTimetable={handleUpdateTimetable} onUpdateStudent={handleUpdateStudent} />;
      case 'create': return <ReportForm students={students} currentUser={currentUser} onSave={handleSaveReport} />;
      case 'reports': return <ReportList reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} onUpdateReport={handleUpdateReport} />;
      case 'word-king': return <WordKing classroomBest={adminConfig.wordKingClassroomRecord} classroomHolder={adminConfig.wordKingClassroomHolder} userId={currentUser.id} personalBestFromDB={activeStudent?.wordKingBest || 0} onPersonalBestUpdate={handleUpdateWordKingBest} onNewClassroomRecord={(record, holder) => { handleUpdateAdminConfig({ wordKingClassroomRecord: record, wordKingClassroomHolder: holder }); showToast('校舎新記録を樹立しました！👑'); }} />;
      case 'iq-test': return <IQTest studentName={currentUser.name} grade={activeStudent?.grade || ""} userId={currentUser.id} iqHistory={activeStudent?.iqHistory || []} onComplete={handleSaveIQ} />;
      case 'interview': return <InterviewCenter students={students} reports={reports} mockExams={mockExams} adminConfig={adminConfig} />;
      case 'students': return <StudentCenter students={students} reports={reports} allSessions={allSessions} instructors={instructors} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} />;
      case 'instructors': return <InstructorCenter instructors={instructors} students={students} onAssignStudent={async (sid, iid) => {
          const s = students.find(std => std.id === sid);
          await handleUpdateStudent(sid, { instructorIds: Array.from(new Set([...(s?.instructorIds || []), iid])) });
          showToast('担当生徒を追加しました');
        }} onRemoveStudent={async (sid, iid) => {
          const s = students.find(std => std.id === sid);
          await handleUpdateStudent(sid, { instructorIds: (s?.instructorIds || []).filter(id => id !== iid) });
          showToast('担当生徒を解除しました');
        }} onUpdateInstructor={handleUpdateInstructor} onAddInstructor={handleAddInstructor} onDeleteInstructor={handleDeleteInstructor} />;
      case 'salary': return <SalaryCenter instructors={instructors} reports={reports} />;
      case 'mock': return <MockExamCenter students={students} mockExams={mockExams} role={currentUser.role} currentUserId={currentUser.id} onSave={handleAddMockExam} onUpdate={handleUpdateMockExam} onDelete={handleDeleteMockExam} />;
      case 'messages': return <MessageCenter reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => { handleUpdateReport(rid, { needsAction: false }); showToast('相談を解決済みにしました'); }} />;
      case 'timetable': return <TimetableManager timetable={timetable} students={students} instructors={instructors} onUpdate={handleUpdateTimetable} />;
      case 'settings': return <AdminSettings adminConfig={adminConfig} onUpdate={handleUpdateAdminConfig} />;
      default: return <div className="p-10 text-center text-slate-400 font-bold italic">Module not found.</div>;
    }
  };

  if (isLoading) return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
      <img src="/studybase-logo.svg" alt="StudyBase Logo" className="w-24 h-24 mb-6 animate-bounce" />
      <div className="font-black text-indigo-600 text-xl tracking-tighter">Initializing Study Base...</div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="h-[100dvh] flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-sm w-full border border-slate-100 flex flex-col items-center">
        <img src="/studybase-logo.svg" alt="StudyBase Logo" className="w-20 h-20 mb-6" />
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
        <p className="text-[10px] text-slate-300 font-bold mt-8 uppercase tracking-widest">ver 4.3.0</p>
      </div>
    </div>
  );

  return (
    <Layout 
      role={currentUser.role} 
      userName={currentUser.name} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      reports={reports}
      isCloudConnected={isSupabaseConfigured}
    >
      {renderContent()}
      
      {/* トースト表示 */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full shadow-2xl z-[500] animate-slideUp flex items-center gap-3 border ${toast.type === 'success' ? 'bg-indigo-900 text-white border-indigo-500' : 'bg-rose-900 text-white border-rose-500'}`}>
          <span className="text-xl">{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="font-black text-sm tracking-tighter">{toast.message}</span>
        </div>
      )}
    </Layout>
  );
};

export default App;
