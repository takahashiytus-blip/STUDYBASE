
export type UserRole = 'instructor' | 'parent' | 'student' | 'admin';

export interface Student {
  id: string;
  name: string;
  grade: string;
  instructorIds: string[];
  loginId?: string;
  password?: string;
  targetSchool?: string;  // 全生徒向けの志望校
  targetFaculty?: string; // 高校生向けの志望学部
  weeklyInstructorMessage?: string; // 講師からの最新メッセージ
}

export interface Instructor {
  id: string;
  name: string;
  specialty: string;
  loginId?: string;
  password?: string;
}

export interface ReportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export interface StudySession {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  subject: string;
  minutes: number;
}

export interface Report {
  id: string;
  studentId: string;
  date: string;
  subject: string;
  instructorName: string;
  sessionYear: number;
  sessionMonth: number | string;
  sessionCount: number;
  rawNotes: string;
  homeworkAssigned: string;
  generatedContent: {
    lessonSummary: string;
    studentPerformance: string;
    homeworkStatus: string;
    nextSteps: string;
    weeklyPlan: string;
    messageToParents: string;
  };
  quizScore?: number;
  messages?: ReportMessage[];
  needsAction?: boolean;
}

export interface SubjectData {
  score?: number | string;
  deviation?: number | string;
}

export interface MockExam {
  id: string;
  studentId: string;
  examName: string;
  examDate: string;
  scores: Record<string, SubjectData>;
}

export interface AdminConfig {
  name: string;
  loginId: string;
  passwordHash: string;
  location: string;
  wordKingClassroomRecord: number; // 英単語王の教室最高スコア
  wordKingClassroomHolder: string; // 英単語王の教室記録保持者
}

export interface AppState {
  currentUser: {
    role: UserRole;
    id: string;
    name: string;
  };
  students: Student[];
  instructors: Instructor[];
  reports: Report[];
  mockExams: MockExam[];
  adminConfig: AdminConfig;
}
