
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserRole, Report, MockExam, Student, Instructor, TimetableEntry, StudySession, AdminConfig, ReportMessage, IQResult, InterviewSlot, InterviewRecord, GroupLessonLog } from './types';
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
import { GroupLessonCenter } from './components/GroupLessonCenter';
import { WordKing } from './components/WordKing';
import { IQTest } from './components/IQTest';
import { TimetableManager } from './components/TimetableManager';
import AdminSettings from './components/AdminSettings';
import MessageCenter from './components/MessageCenter';
import InstructorCenter from './components/InstructorCenter';
import AccountSettings from './components/AccountSettings';
import { InterviewManagement } from './components/InterviewManagement';

export { getLocalISOString, parseSafeDate };

type AuthStep = 'role-selection' | 'credentials';

const DEFAULT_ADMIN: AdminConfig = {
  name: '高橋 統括責任者',
  loginId: 'takahashi@koeikai.jp',
  passwordHash: 'password123',
  location: '埼玉県さいたま市',
  wordKingClassroomRecord: 124,
  wordKingClassroomHolder: '初代王',
  isMaintenanceMode: false,
  announcement: '',
  announcementTargetIds: [],
  isAnnouncementActive: false
};

const safeParse = (val: any) => {
  if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
    try { return JSON.parse(val); } catch (e) { return val; }
  }
  return val;
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
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>([]);
  const [interviewRecords, setInterviewRecords] = useState<InterviewRecord[]>([]);
  const [groupLessonLogs, setGroupLessonLogs] = useState<GroupLessonLog[]>([]);

  // 管理者を含めた全講師リスト（選択用）
  const allInstructors = useMemo(() => {
    const adminAsInstructor: Instructor = {
      id: 'admin',
      name: adminConfig.name,
      specialty: '統括・管理',
      canGenerateInterviewMaterial: true
    };
    // データベースから取得した講師リストに 'admin' が含まれている場合は除外して、
    // 常に最新の adminConfig に基づく adminAsInstructor を先頭に置く
    const filteredInstructors = instructors.filter(ins => ins.id !== 'admin');
    return [adminAsInstructor, ...filteredInstructors];
  }, [instructors, adminConfig.name]);

  // 状態変更の監視
  useEffect(() => {
    console.log("[State Update] Students count:", students.length);
    if (students.length > 0) {
      console.log("[State Update] First student name:", students[0].name);
    }
  }, [students]);

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

    // 接続状態の通知
    if (isSupabaseConfigured) {
      const url = (import.meta as any).env.VITE_SUPABASE_URL || '';
      const maskedUrl = url.replace(/(https?:\/\/[^.]+)\..*/, "$1...");
      showToast(`クラウドに接続: ${maskedUrl}`, 'success');
    } else {
      showToast('ローカルモードで動作中（DB未設定）', 'error');
    }
  }, []);

  // 管理者レコードを講師テーブルに確保（外部キー制約対策）
  useEffect(() => {
    const ensureAdminInstructor = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('instructors').select('id, name').eq('id', 'admin').maybeSingle();
          if (!data && !error) {
            await supabase.from('instructors').insert({
              id: 'admin',
              name: adminConfig.name,
              specialty: '統括責任者',
              login_id: 'admin',
              password: 'password',
              can_generate_interview_material: true
            });
            console.log("[Auth] Admin instructor record created in Supabase");
          } else if (data && data.name !== adminConfig.name) {
            await supabase.from('instructors').update({ name: adminConfig.name }).eq('id', 'admin');
            console.log("[Auth] Admin instructor name updated in Supabase");
          }
        } catch (e) {
          console.error("[Auth] Failed to ensure admin instructor:", e);
        }
      }
    };
    ensureAdminInstructor();
  }, [isSupabaseConfigured, adminConfig.name]);

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
      localStorage.setItem('sb_data_interview_slots', JSON.stringify(interviewSlots));
      localStorage.setItem('sb_data_interview_records', JSON.stringify(interviewRecords));
      localStorage.setItem('sb_data_group_lesson_logs', JSON.stringify(groupLessonLogs));
    }
  }, [students, instructors, reports, mockExams, allSessions, timetable, adminConfig, interviewSlots, interviewRecords, groupLessonLogs]);

  const isUpdatingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<number | null>(null);
  const syncPendingRef = useRef<boolean>(false);
  const lastUpdateRef = useRef<number>(0);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAllData = useCallback(async (isSilent = false) => {
    const fetchStartTime = Date.now();
    if (isFetchingRef.current || isUpdatingRef.current) {
      syncPendingRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    if (!isSupabaseConfigured || !supabase) {
      if (!isSilent) {
        const localReports = localStorage.getItem('sb_data_reports');
        const localStudents = localStorage.getItem('sb_data_students');
        const localInstructors = localStorage.getItem('sb_data_instructors');
        const localSlots = localStorage.getItem('sb_data_interview_slots');
        const localRecords = localStorage.getItem('sb_data_interview_records');
        const localGroupLogs = localStorage.getItem('sb_data_group_lesson_logs');
        const localTimetable = localStorage.getItem('sb_data_timetable');
        const savedAdmin = localStorage.getItem('study_base_admin_config');

        setReports(localReports ? JSON.parse(localReports) : MOCK_REPORTS);
        setStudents(localStudents ? JSON.parse(localStudents) : MOCK_STUDENTS);
        setInstructors(localInstructors ? JSON.parse(localInstructors) : MOCK_INSTRUCTORS);
        setInterviewSlots(localSlots ? JSON.parse(localSlots) : []);
        setInterviewRecords(localRecords ? JSON.parse(localRecords) : []);
        setGroupLessonLogs(localGroupLogs ? JSON.parse(localGroupLogs) : []);
        setTimetable(localTimetable ? JSON.parse(localTimetable) : MOCK_TIMETABLE);
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
        { data: sessionData, error: sessionError },
        { data: slotsData, error: slotsError },
        { data: recordsData, error: recordsError },
        { data: groupLogData, error: groupLogError }
      ] = await Promise.all([
        supabase.from('admin_config').select('*').eq('id', 1).maybeSingle(),
        supabase.from('students').select('*'),
        supabase.from('instructors').select('*'),
        supabase.from('reports').select('*').order('date', { ascending: false }),
        supabase.from('mock_exams').select('*').order('exam_date', { ascending: false }),
        supabase.from('timetable').select('*'),
        supabase.from('study_sessions').select('*').order('date', { ascending: false }),
        supabase.from('interview_slots').select('*'),
        supabase.from('interview_records').select('*'),
        supabase.from('group_lesson_logs').select('*')
      ]);

      // PGRST204 (Column not found) や PGRST205 (Table not found) は無視して空配列として扱う
      const isNotFoundError = (err: any) => err?.code === 'PGRST204' || err?.code === 'PGRST205' || err?.status === 404;
      
      const filteredTimetableError = isNotFoundError(timetableError) ? null : timetableError;
      const filteredSlotsError = isNotFoundError(slotsError) ? null : slotsError;
      const filteredRecordsError = isNotFoundError(recordsError) ? null : recordsError;
      const filteredGroupLogError = isNotFoundError(groupLogError) ? null : groupLogError;

      if (adminError || studentError || instructorError || reportError || mockError || filteredTimetableError || sessionError || filteredSlotsError || filteredRecordsError || filteredGroupLogError) {
        const firstError = adminError || studentError || instructorError || reportError || filteredTimetableError;
        console.error("[Sync] CRITICAL ERROR:", { 
          adminError, studentError, instructorError, reportError, mockError, timetableError, sessionError, 
          slotsError: filteredSlotsError, recordsError: filteredRecordsError, groupLogError: filteredGroupLogError
        });
        if (!isSilent) showToast(`データ取得エラー: ${firstError?.message || '権限エラーまたはテーブル未定義'}`, 'error');
      } else {
        // デバッグ用：取得した生のデータをコンソールに出力
        console.log("[Sync] Raw Data Check:", {
          instructors: instructorData,
          students: studentData,
          reports: reportData,
          timetable: timetableData
        });
        
        if (studentData) {
          console.log("[Sync] Student Names from DB:", studentData.map((s: any) => s.name || s.student_name || s.display_name || 'NULL'));
        }
        
        console.log(`[Sync] Fetch results: Instructors=${instructorData?.length}, Students=${studentData?.length}, Reports=${reportData?.length}, Timetable=${timetableData?.length}`);
        
        if (!isSilent && (!studentData || studentData.length === 0)) {
          showToast('生徒データが0件です。プロジェクトURLとテーブルの中身を再確認してください。', 'error');
        }
      }

      const validInstructorIds = new Set((instructorData || []).map((i: any) => String(i.id)));
      validInstructorIds.add('admin');
      const validStudentIds = new Set((studentData || []).map((s: any) => String(s.id)));

      /* 
      // 最終チェック: フェッチ中に更新が発生していた場合は、取得データを破棄して整合性を守る
      if (lastUpdateRef.current >= fetchStartTime || isUpdatingRef.current) {
        console.log("[Sync] Stale fetch detected:", {
          lastUpdate: lastUpdateRef.current,
          fetchStart: fetchStartTime,
          isUpdating: isUpdatingRef.current
        });
        return;
      }
      */

      if (instructorData) {
        setInstructors(instructorData.map((i: any) => ({ 
          id: String(i.id), name: i.name, specialty: i.specialty, 
          loginId: i.login_id ?? i.loginId, 
          password: i.password,
          canGenerateInterviewMaterial: i.can_generate_interview_material ?? i.canGenerateInterviewMaterial ?? false
        })));
      }
      
      if (studentData) {
        const mappedStudents = studentData.map((s: any) => {
          const rawIds = safeParse(s.instructor_ids ?? s.instructorIds) || [];
          const cleanInstructorIds = (Array.isArray(rawIds) ? rawIds : []).map(String).filter((id: string) => validInstructorIds.has(id));
          return {
            id: String(s.id), 
            name: s.name || s.student_name || s.display_name || '名称未設定',
            grade: s.grade || s.student_grade || '---', 
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
            parentName: s.parent_name ?? s.parentName,
            targets: s.targets ?? undefined
          };
        });
        console.log("[Sync] Setting students state with count:", mappedStudents.length);
        setStudents(mappedStudents);
      }

      if (adminData) {
        setAdminConfig({
          id: adminData.id, name: adminData.name, 
          loginId: adminData.login_id ?? adminData.loginId,
          passwordHash: adminData.password_hash ?? adminData.passwordHash ?? DEFAULT_ADMIN.passwordHash,
          location: adminData.location, 
          wordKingClassroomRecord: adminData.word_king_record ?? adminData.wordKingClassroomRecord ?? 0,
          wordKingClassroomHolder: adminData.word_king_holder ?? adminData.wordKingClassroomHolder ?? '---',
          isMaintenanceMode: adminData.is_maintenance_mode ?? adminData.isMaintenanceMode ?? false,
          announcement: adminData.announcement ?? '',
          announcementTargetIds: safeParse(adminData.announcement_target_ids ?? adminData.announcementTargetIds) || [],
          isAnnouncementActive: adminData.is_announcement_active ?? adminData.isAnnouncementActive ?? false
        });
      }

      if (reportData) {
        setReports(reportData
          .filter((r: any) => validStudentIds.has(String(r.student_id ?? r.studentId)))
          .map((r: any) => ({
            id: String(r.id), studentId: String(r.student_id ?? r.studentId), 
            date: String(r.date).split('T')[0].split(' ')[0], 
            subject: r.subject, 
            instructorName: r.instructor_name ?? r.instructorName,
            sessionYear: r.session_year ?? r.sessionYear, sessionMonth: r.session_month ?? r.sessionMonth, sessionCount: r.session_count ?? r.sessionCount,
            attendanceStatus: r.attendance_status ?? r.attendanceStatus,
            rawNotes: r.raw_notes ?? r.rawNotes, homeworkAssigned: r.homework_assigned ?? r.homeworkAssigned,
            homeworkCompletion: r.homework_completion ?? r.homeworkCompletion, 
            proposedSelfStudyDays: safeParse(r.proposed_self_study_days ?? r.proposedSelfStudyDays) || [],
            generatedContent: safeParse(r.generated_content ?? r.generatedContent), 
            quizScore: r.quiz_score ?? r.quizScore, 
            messages: safeParse(r.messages ?? r.messages) || [], 
            needsAction: r.needs_action ?? r.needsAction ?? false
          }))
        );
      }

      if (mockData) {
        setMockExams(mockData
          .filter((m: any) => validStudentIds.has(String(m.student_id ?? m.studentId)))
          .map((m: any) => ({ 
            id: String(m.id), studentId: String(m.student_id ?? m.studentId), examName: m.exam_name ?? m.examName, 
            examDate: String(m.exam_date ?? m.examDate).split('T')[0].split(' ')[0], 
            scores: m.scores ?? {} 
          }))
        );
      }

      if (timetableData) {
        const mappedTimetable = timetableData
          .map((t: any) => ({ 
            id: String(t.id), 
            dayOfWeek: Number(t.day_of_week ?? t.dayOfWeek), 
            startTime: t.start_time ?? t.startTime, 
            endTime: t.end_time ?? t.endTime, 
            subject: t.subject, 
            studentId: (t.student_id ?? t.studentId) ? String(t.student_id ?? t.studentId) : '', 
            studentIds: safeParse(t.student_ids ?? t.studentIds) || [],
            instructorId: t.instructor_id ?? t.instructorId ? String(t.instructor_id ?? t.instructorId) : undefined, 
            room: t.room,
            lessonType: t.lesson_type ?? t.lessonType ?? 'individual',
            groupName: t.group_name ?? t.groupName ?? ''
          }));
        setTimetable(mappedTimetable);
      }

      if (sessionData) {
        setAllSessions(sessionData
          .filter((s: any) => validStudentIds.has(String(s.student_id ?? s.studentId)))
          .map((s: any) => ({ 
            id: String(s.id), studentId: String(s.student_id ?? s.studentId), 
            date: String(s.date).split('T')[0].split(' ')[0], 
            subject: s.subject, minutes: s.minutes 
          }))
        );
      }

      if (slotsData) {
        setInterviewSlots(slotsData.map((s: any) => ({
          id: String(s.id), 
          interviewerId: String(s.interviewer_id ?? s.interviewerId), 
          interviewerName: s.interviewer_name ?? s.interviewerName,
          date: String(s.date).split('T')[0].split(' ')[0], 
          startTime: s.start_time ?? s.startTime, 
          endTime: s.end_time ?? s.endTime,
          status: s.status, 
          studentId: (s.student_id ?? s.studentId) ? String(s.student_id ?? s.studentId) : undefined, 
          studentName: s.student_name ?? s.studentName,
          parentName: s.parent_name ?? s.parentName, 
          note: s.note
        })));
      }

      if (recordsData) {
        setInterviewRecords(recordsData.map((r: any) => ({
          id: String(r.id), 
          studentId: String(r.student_id ?? r.studentId), 
          date: String(r.date).split('T')[0].split(' ')[0],
          interviewerName: r.interviewer_name ?? r.interviewerName, 
          content: r.content, 
          nextActions: r.next_actions ?? r.nextActions,
          aiMaterial: r.ai_material ?? r.aiMaterial
        })));
      }

      if (groupLogData) {
        setGroupLessonLogs(groupLogData.map((g: any) => ({
          id: String(g.id), 
          timetableId: String(g.timetable_id ?? g.timetableId), 
          date: String(g.date).split('T')[0].split(' ')[0],
          content: g.content, 
          instructorComments: g.instructor_comments ?? g.test_results ?? g.testResults, 
          homework: g.homework, 
          pdfUrl: g.pdf_url ?? g.pdfUrl, 
          pdfName: g.pdf_name ?? g.pdfName
        })));
      }

    } catch (err) {
      console.warn("Sync overlap prevented or error occurred:", err);
    } finally {
      isFetchingRef.current = false;
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
    lastUpdateRef.current = Date.now();
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = window.setTimeout(() => { isUpdatingRef.current = false; }, 8000);
  };

  const endUpdate = () => {
    lastUpdateRef.current = Date.now();
    isUpdatingRef.current = false;
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    // If a sync was requested during update, trigger it now
    if (syncPendingRef.current) {
      syncPendingRef.current = false;
      setTimeout(() => fetchAllData(true), 1000);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const isMaintenance = adminConfig.isMaintenanceMode;

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
      if (isMaintenance) {
        alert('現在メンテナンス中のため、管理者以外はログインできません。');
        return;
      }
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
      if (isMaintenance) {
        alert('現在メンテナンス中のため、管理者以外はログインできません。');
        return;
      }
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
    const prevAdmin = { ...adminConfig };
    try {
      let latestConfig: AdminConfig = { ...adminConfig, ...updates };
      setAdminConfig(latestConfig);
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('admin_config').upsert({
          id: 1,
          name: latestConfig.name, 
          login_id: latestConfig.loginId, 
          password_hash: latestConfig.passwordHash,
          location: latestConfig.location, 
          word_king_record: latestConfig.wordKingClassroomRecord,
          word_king_holder: latestConfig.wordKingClassroomHolder,
          is_maintenance_mode: latestConfig.isMaintenanceMode,
          announcement: latestConfig.announcement,
          announcement_target_ids: latestConfig.announcementTargetIds,
          is_announcement_active: latestConfig.isAnnouncementActive
        }, { onConflict: 'id' });
        if (error) throw error;
      }
      showToast('システム設定を更新しました');
    } catch (err) {
      console.error('[Admin] Update error:', err);
      setAdminConfig(prevAdmin);
      showToast('設定の更新に失敗しました', 'error');
    } finally { endUpdate(); }
  };

  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    startUpdate();
    const prevStudents = [...students];
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
          const { error } = await supabase.from('students').update(dbUpdates).eq('id', id);
          if (error) throw error;
        }
      }
    } catch (err) {
      console.error('[Student] Update error:', err);
      setStudents(prevStudents);
      showToast('生徒情報の更新に失敗しました', 'error');
    } finally { endUpdate(); }
  };

  const handleAddStudent = async (d: Omit<Student, 'id' | 'instructorIds'>) => {
    startUpdate();
    const id = generateUniqueId('s');
    const newStd: Student = { ...d, id, instructorIds: [] };
    const prevStudents = [...students];
    try {
      setStudents(prev => [...prev, newStd]);
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('students').insert({ 
          id, name: d.name, grade: d.grade, login_id: d.loginId, password: d.password, 
          target_school: d.targetSchool, target_faculty: d.targetFaculty 
        });
        if (error) {
          console.error("[Student] Supabase Insert Error Details:", error);
          showToast(`登録エラー: ${error.message} (${error.code})`, 'error');
          throw error;
        }
      }
      showToast('生徒を登録しました');
    } catch (err: any) {
      console.error('[Student] Add error:', err);
      setStudents(prevStudents);
      if (!err?.message) {
        showToast('生徒の登録に失敗しました', 'error');
      }
    } finally { endUpdate(); }
  };

  const handleDeleteStudent = async (id: string) => {
    startUpdate();
    try {
      setStudents(prev => prev.filter(s => s.id !== id));
      setReports(prev => prev.filter(r => r.studentId !== id));
      setAllSessions(prev => prev.filter(s => s.studentId !== id));
      
      // 時間割の更新: 単一ID一致、または集団授業の配列に含まれる場合を除外/更新
      setTimetable(prev => prev
        .filter(t => t.studentId !== id)
        .map(t => ({
          ...t,
          studentIds: (t.studentIds || []).filter(sid => sid !== id)
        }))
      );
      
      setMockExams(prev => prev.filter(m => m.studentId !== id));

      if (isSupabaseConfigured && supabase) {
        // 集団授業の受講生リストから削除
        const { data: groupLessons } = await supabase.from('timetable').select('id, student_ids').eq('lesson_type', 'group');
        let timetableUpdates: any[] = [];
        if (groupLessons) {
          timetableUpdates = groupLessons
            .filter(t => (t.student_ids || []).includes(id))
            .map(t => {
              const newIds = t.student_ids.filter((sid: string) => sid !== id);
              return supabase!.from('timetable').update({ student_ids: newIds }).eq('id', t.id);
            });
        }

        // 子レコードを先に削除（外部キー制約対策）
        await Promise.all([
          supabase.from('report_drafts').delete().eq('student_id', id),
          supabase.from('study_sessions').delete().eq('student_id', id),
          supabase.from('reports').delete().eq('student_id', id),
          supabase.from('timetable').delete().eq('student_id', id),
          supabase.from('mock_exams').delete().eq('student_id', id),
          ...timetableUpdates
        ]);
        
        // 最後に親レコード（生徒）を削除
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
      }
      showToast('生徒データを削除しました');
    } catch (err: any) {
      console.error('[Student] Delete error:', err);
      showToast(`削除に失敗しました: ${err.message || '通信エラー'}`, 'error');
      fetchAllData(true);
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
    const prevReports = [...reports];
    try {
      setReports(prev => [report, ...prev]);
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('reports').insert({
          id: report.id, student_id: report.studentId, date: report.date, subject: report.subject, instructor_name: report.instructorName,
          session_year: report.sessionYear, session_month: report.sessionMonth, session_count: report.sessionCount,
          attendance_status: report.attendanceStatus, raw_notes: report.rawNotes, homework_assigned: report.homeworkAssigned,
          homework_completion: report.homeworkCompletion, proposed_self_study_days: report.proposedSelfStudyDays,
          generated_content: report.generatedContent, quiz_score: report.quizScore, messages: report.messages || [], 
          needs_action: report.needsAction || false
        });
        if (error) throw error;
      }
      showToast('指導報告書を送信しました');
    } catch (err) {
      console.error('[Report] Save error:', err);
      setReports(prevReports);
      showToast('報告書の保存に失敗しました', 'error');
    } finally { endUpdate(); }
  };

  const handleUpdateReport = async (reportId: string, updates: Partial<Report>) => {
    startUpdate();
    const prevReports = [...reports];
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
          const { error } = await supabase.from('reports').update(dbUpdates).eq('id', reportId);
          if (error) throw error;
        }
      }
    } catch (err) {
      console.error('[Report] Update error:', err);
      setReports(prevReports);
      showToast('報告書の更新に失敗しました', 'error');
    } finally { endUpdate(); }
  };

  const handleDeleteReport = async (reportId: string) => {
    // 削除処理の開始をログ出力
    console.log('[Report] handleDeleteReport called for:', reportId);
    
    startUpdate();
    try {
      console.log('[Report] Optimistic delete started for:', reportId);
      // 即座にUIから消去（楽観的更新）
      setReports(prev => {
        const filtered = prev.filter(r => r.id !== reportId);
        console.log(`[Report] UI filtered: ${prev.length} -> ${filtered.length}`);
        return filtered;
      });
      
      // トーストで即座にフィードバック
      showToast('削除処理を開始しました...');
      
      if (isSupabaseConfigured && supabase) {
        console.log('[Report] DB Delete started for:', reportId);
        const { error } = await supabase.from('reports').delete().eq('id', reportId);
        if (error) {
          console.error('[Report] DB Delete error:', error);
          showToast('データベースからの削除に失敗しました', 'error');
          fetchAllData(true); // 失敗した場合は再取得して復元
          return;
        }
        console.log('[Report] DB Delete success');
      }
      showToast('報告書を完全に削除しました');
    } catch (err) {
      console.error('[Report] Delete catch error:', err);
      showToast('削除処理中にエラーが発生しました', 'error');
      fetchAllData(true);
    } finally { 
      endUpdate(); 
    }
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
    console.log('[Timetable] handleUpdateTimetable called', { 
      newCount: newTimetable.length, 
      deletedCount: deletedIds?.length || 0,
      deletedIds 
    });
    startUpdate();
    const prevTimetable = [...timetable];
    try {
      setTimetable(newTimetable);
      if (isSupabaseConfigured && supabase) {
        if (deletedIds && deletedIds.length > 0) {
          console.log('[Timetable] Executing delete for IDs:', deletedIds);
          const { error: delError } = await supabase.from('timetable').delete().in('id', deletedIds);
          if (delError) {
            console.error('[Timetable] Delete error:', delError);
            throw delError;
          }
          console.log('[Timetable] Delete successful');
        }
        
        const upsertData = newTimetable.map(t => {
          // データベースに存在する講師IDかチェック（管理者 'admin' は常に許可）
          const instructorExists = t.instructorId === 'admin' || instructors.some(ins => ins.id === t.instructorId);
          const finalInstructorId = (instructorExists && t.instructorId && t.instructorId.trim() !== '') 
            ? t.instructorId 
            : null;

          return {
            id: t.id, 
            day_of_week: Number(t.dayOfWeek), 
            start_time: t.startTime, 
            end_time: t.endTime,
            subject: t.subject, 
            student_id: (t.studentId && t.studentId.trim() !== '') ? t.studentId : null, 
            student_ids: Array.isArray(t.studentIds) ? t.studentIds : [],
            instructor_id: finalInstructorId, 
            room: t.room || '',
            lesson_type: t.lessonType || 'individual', 
            group_name: t.groupName || ''
          };
        });
        
        console.log("[Timetable] Upserting data:", upsertData);
        
        if (upsertData.length > 0) {
          let { error: upsertError } = await supabase.from('timetable').upsert(upsertData, { onConflict: 'id' });
          
          // group_name カラムが存在しない場合のエラー (PGRST204) への対策
          if (upsertError && upsertError.code === 'PGRST204' && upsertError.message.includes('group_name')) {
            console.warn("[Timetable] group_name column missing, retrying without it...");
            const fallbackData = upsertData.map(({ group_name, ...rest }: any) => rest);
            const { error: retryError } = await supabase.from('timetable').upsert(fallbackData, { onConflict: 'id' });
            upsertError = retryError;
          }

          if (upsertError) {
            console.error("[Timetable] Supabase Upsert Error Details:", upsertError);
            showToast(`保存エラー: ${upsertError.message} (${upsertError.code})`, 'error');
            throw upsertError;
          }
        }
      }
      showToast('時間割を保存しました');
    } catch (e: any) {
      console.error('[Timetable] Update error:', e);
      setTimetable(prevTimetable);
      if (e?.message) {
        // すでにトーストを出している場合は二重に出さない
      } else {
        showToast('保存中にエラーが発生しました。通信環境を確認してください。', 'error');
      }
    } finally { endUpdate(); }
  };

  const handleUpdateGroupLessonLogs = async (newLogs: GroupLessonLog[], deletedIds?: string[]) => {
    startUpdate();
    const prevLogs = [...groupLessonLogs];
    try {
      setGroupLessonLogs(newLogs);
      if (isSupabaseConfigured && supabase) {
        if (deletedIds && deletedIds.length > 0) {
          const { error: delError } = await supabase.from('group_lesson_logs').delete().in('id', deletedIds);
          if (delError) throw delError;
        }
        const upsertData = newLogs.map(l => ({
          id: l.id, timetable_id: l.timetableId, date: l.date,
          content: l.content, instructor_comments: l.instructorComments, homework: l.homework,
          pdf_url: l.pdfUrl, pdf_name: l.pdfName
        }));
        if (upsertData.length > 0) {
          const { error: upsertError } = await supabase.from('group_lesson_logs').upsert(upsertData, { onConflict: 'id' });
          if (upsertError) throw upsertError;
        }
      }
      showToast('授業ログを保存しました');
    } catch (err) {
      console.error('[GroupLesson] Update error:', err);
      setGroupLessonLogs(prevLogs);
      showToast('授業ログの保存に失敗しました', 'error');
      throw err; // Re-throw to allow caller to handle UI state
    } finally { endUpdate(); }
  };

  const handleAddInstructor = async (d: Omit<Instructor, 'id'>) => {
    startUpdate();
    const id = generateUniqueId('i');
    const newIns: Instructor = { ...d, id };
    const prevInstructors = [...instructors];
    
    try {
      setInstructors(prev => [...prev, newIns]);
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('instructors').insert({ 
          id, name: d.name, specialty: d.specialty, login_id: d.loginId, password: d.password,
          can_generate_interview_material: d.canGenerateInterviewMaterial || false
        });
        if (error) {
          console.error("[Instructor] Supabase Insert Error Details:", error);
          showToast(`登録エラー: ${error.message} (${error.code})`, 'error');
          throw error;
        }
      }
      showToast('講師を登録しました');
    } catch (err: any) {
      console.error('[Instructor] Add error:', err);
      setInstructors(prevInstructors);
      if (!err?.message) {
        showToast('講師の登録に失敗しました。通信環境を確認してください。', 'error');
      }
    } finally { endUpdate(); }
  };

  const handleUpdateInstructor = async (id: string, upd: Partial<Instructor>) => {
    startUpdate();
    const prevInstructors = [...instructors];
    try {
      setInstructors(prev => prev.map(i => i.id === id ? { ...i, ...upd } : i));
      if (isSupabaseConfigured && supabase) {
        const dbUpd: any = {};
        if (upd.name !== undefined) dbUpd.name = upd.name;
        if (upd.specialty !== undefined) dbUpd.specialty = upd.specialty;
        if (upd.loginId !== undefined) dbUpd.login_id = upd.loginId;
        if (upd.password !== undefined) dbUpd.password = upd.password;
        if (upd.canGenerateInterviewMaterial !== undefined) dbUpd.can_generate_interview_material = upd.canGenerateInterviewMaterial;
        
        if (Object.keys(dbUpd).length > 0) {
          const { error } = await supabase.from('instructors').update(dbUpd).eq('id', id);
          if (error) throw error;
        }
      }
      showToast('講師情報を更新しました');
    } catch (err) {
      console.error('[Instructor] Update error:', err);
      setInstructors(prevInstructors);
      showToast('更新に失敗しました。', 'error');
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
        // 子レコードを先に削除/更新
        await Promise.all([
          supabase.from('timetable').delete().eq('instructor_id', id),
          supabase.from('report_drafts').delete().eq('instructor_id', id),
          ...studentUpdates
        ]);
        
        // 最後に親レコード（講師）を削除
        const { error } = await supabase.from('instructors').delete().eq('id', id);
        if (error) throw error;
      }
      showToast('講師データを削除しました');
    } catch (err: any) {
      console.error('[Instructor] Delete error:', err);
      showToast(`削除に失敗しました: ${err.message || '通信エラー'}`, 'error');
      fetchAllData(true);
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

  const handleUpdateInterviewSlots = async (newSlots: InterviewSlot[], deletedIds?: string[]) => {
    startUpdate();
    const prevSlots = [...interviewSlots];
    try {
      setInterviewSlots(newSlots);
      if (isSupabaseConfigured && supabase) {
        if (deletedIds && deletedIds.length > 0) {
          const { error: delError } = await supabase.from('interview_slots').delete().in('id', deletedIds);
          if (delError) throw delError;
        }
        const upsertData = newSlots.map(s => ({
          id: s.id, interviewer_id: s.interviewerId, interviewer_name: s.interviewerName,
          date: s.date, start_time: s.startTime, end_time: s.endTime,
          status: s.status, student_id: s.studentId || null, student_name: s.studentName || null,
          parent_name: s.parentName || null, note: s.note || null
        }));
        if (upsertData.length > 0) {
          const { error: upsertError } = await supabase.from('interview_slots').upsert(upsertData, { onConflict: 'id' });
          if (upsertError) throw upsertError;
        }
      }
      showToast('面談枠を更新しました');
    } catch (err: any) {
      console.error('[Interview] Slot update error:', err);
      setInterviewSlots(prevSlots);
      showToast(`更新に失敗しました: ${err.message || '通信エラー'}`, 'error');
      fetchAllData(true);
    } finally { endUpdate(); }
  };

  const handleUpdateInterviewRecords = async (newRecords: InterviewRecord[], deletedIds?: string[]) => {
    startUpdate();
    const prevRecords = [...interviewRecords];
    try {
      setInterviewRecords(newRecords);
      if (isSupabaseConfigured && supabase) {
        if (deletedIds && deletedIds.length > 0) {
          const { error: delError } = await supabase.from('interview_records').delete().in('id', deletedIds);
          if (delError) throw delError;
        }
        const upsertData = newRecords.map(r => ({
          id: r.id, student_id: r.studentId, date: r.date,
          interviewer_name: r.interviewerName, content: r.content, next_actions: r.nextActions,
          ai_material: r.aiMaterial
        }));
        if (upsertData.length > 0) {
          const { error: upsertError } = await supabase.from('interview_records').upsert(upsertData, { onConflict: 'id' });
          if (upsertError) throw upsertError;
        }
      }
      showToast('面談記録を保存しました');
    } catch (err: any) {
      console.error('[Interview] Record update error:', err);
      setInterviewRecords(prevRecords);
      showToast(`保存に失敗しました: ${err.message || '通信エラー'}`, 'error');
      fetchAllData(true);
    } finally { endUpdate(); }
  };

  const renderContent = () => {
    const activeStudent = students.find(s => s.id === currentUser.id);
    switch (activeTab) {
      case 'dashboard': return <Dashboard 
          reports={reports} 
          students={students} 
          instructors={allInstructors} 
          role={currentUser.role} 
          mockExams={mockExams} 
          currentUserStudent={activeStudent} 
          currentUserId={currentUser.id} 
          allSessions={allSessions} 
          onLogSession={handleLogSession} 
          timetable={timetable} 
          onUpdateTimetable={handleUpdateTimetable} 
          onUpdateStudent={handleUpdateStudent}
          interviewSlots={interviewSlots}
          interviewRecords={interviewRecords}
          adminConfig={adminConfig}
          groupLessonLogs={groupLessonLogs}
        />;
      case 'create': return <ReportForm students={students} currentUser={currentUser} onSave={handleSaveReport} />;
      case 'reports': return <ReportList reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} onUpdateReport={handleUpdateReport} onDeleteReport={handleDeleteReport} />;
      case 'word-king': return <WordKing classroomBest={adminConfig.wordKingClassroomRecord} classroomHolder={adminConfig.wordKingClassroomHolder} userId={currentUser.id} personalBestFromDB={activeStudent?.wordKingBest || 0} onPersonalBestUpdate={handleUpdateWordKingBest} onNewClassroomRecord={(record, holder) => { handleUpdateAdminConfig({ wordKingClassroomRecord: record, wordKingClassroomHolder: holder }); showToast('校舎新記録を樹立しました！👑'); }} />;
      case 'iq-test': return <IQTest studentName={currentUser.name} grade={activeStudent?.grade || ""} userId={currentUser.id} iqHistory={activeStudent?.iqHistory || []} onComplete={handleSaveIQ} />;
      case 'interview': 
        const canGenerate = currentUser.role === 'admin' || 
          (currentUser.role === 'instructor' && instructors.find(i => i.id === currentUser.id)?.canGenerateInterviewMaterial === true);
        return <InterviewCenter 
          students={students} 
          reports={reports} 
          mockExams={mockExams} 
          adminConfig={adminConfig} 
          canGenerate={canGenerate} 
          interviewRecords={interviewRecords}
          interviewSlots={interviewSlots}
          currentUser={currentUser}
          onSaveRecord={(rec) => handleUpdateInterviewRecords([...interviewRecords, rec])}
        />;
      case 'interview-management':
        return <InterviewManagement 
          slots={interviewSlots} 
          records={interviewRecords} 
          students={students} 
          instructors={allInstructors} 
          currentUser={currentUser} 
          onUpdateSlots={handleUpdateInterviewSlots} 
          onUpdateRecords={handleUpdateInterviewRecords} 
        />;
      case 'students': return <StudentCenter 
        students={students} 
        reports={reports} 
        allSessions={allSessions} 
        instructors={allInstructors} 
        currentUser={currentUser} 
        interviewRecords={interviewRecords}
        onAddMessage={handleAddReportMessage} 
        onDeleteMessage={handleDeleteReportMessage} 
        onMarkResolved={(rid) => handleUpdateReport(rid, { needsAction: false })} 
        onUpdateReport={handleUpdateReport} 
        onDeleteReport={handleDeleteReport} 
        onAddStudent={handleAddStudent} 
        onUpdateStudent={handleUpdateStudent} 
        onDeleteStudent={handleDeleteStudent} 
      />;
      case 'instructors': return <InstructorCenter instructors={allInstructors} students={students} onAssignStudent={async (sid, iid) => {
          const s = students.find(std => std.id === sid);
          await handleUpdateStudent(sid, { instructorIds: Array.from(new Set([...(s?.instructorIds || []), iid])) });
          showToast('担当生徒を追加しました');
        }} onRemoveStudent={async (sid, iid) => {
          const s = students.find(std => std.id === sid);
          await handleUpdateStudent(sid, { instructorIds: (s?.instructorIds || []).filter(id => id !== iid) });
          showToast('担当生徒を解除しました');
        }} onUpdateInstructor={handleUpdateInstructor} onAddInstructor={handleAddInstructor} onDeleteInstructor={handleDeleteInstructor} />;
      case 'salary': return <SalaryCenter instructors={allInstructors} reports={reports} />;
      case 'mock': return <MockExamCenter students={students} mockExams={mockExams} role={currentUser.role} currentUserId={currentUser.id} onSave={handleAddMockExam} onUpdate={handleUpdateMockExam} onDelete={handleDeleteMockExam} />;
      case 'group-lessons': return <GroupLessonCenter 
          currentUser={currentUser} 
          timetable={timetable} 
          logs={groupLessonLogs} 
          students={students}
          onUpdateLogs={handleUpdateGroupLessonLogs} 
        />;
      case 'messages': return <MessageCenter reports={reports} students={students} currentUser={currentUser} onAddMessage={handleAddReportMessage} onDeleteMessage={handleDeleteReportMessage} onMarkResolved={(rid) => { handleUpdateReport(rid, { needsAction: false }); showToast('相談を解決済みにしました'); }} onUpdateReport={handleUpdateReport} onDeleteReport={handleDeleteReport} />;
      case 'timetable': return <TimetableManager timetable={timetable} students={students} instructors={allInstructors} onUpdate={handleUpdateTimetable} />;
      case 'settings': return <AdminSettings adminConfig={adminConfig} onUpdate={handleUpdateAdminConfig} onSync={() => fetchAllData(false)} showToast={showToast} students={students} instructors={instructors} />;
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
