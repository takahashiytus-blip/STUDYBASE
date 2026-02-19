
export type UserRole = 'instructor' | 'parent' | 'student' | 'admin';
export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface Student {
  id: string; 
  name: string;
  grade: string;
  instructorIds: string[];
  targetSchool?: string;
  targetFaculty?: string;
  weeklyInstructorMessage?: string;
  loginId?: string;
  password?: string;
  iqHistory?: IQResult[]; // IQテスト履歴
  wordKingBest?: number; // 英単語王のパーソナルベスト
  targets?: {
    label1: string;
    date1: string;
    label2: string;
    date2: string;
  }; // 追加: カウントダウン目標の同期用
}

export interface IQResult {
  id: string;
  date: string;
  score: number;
  estimatedIQ: number;
  breakdown: {
    logical: number;
    numerical: number;
    verbal: number;
    spatial: number;
  };
  aiAnalysis?: string;
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

export interface Report {
  id: string;
  studentId: string;
  date: string;
  subject: string;
  instructorName: string;
  sessionYear: number;
  sessionMonth: number | string;
  sessionCount: number;
  attendanceStatus: AttendanceStatus;
  rawNotes: string;
  homeworkAssigned: string;
  homeworkCompletion?: number;
  proposedSelfStudyDays?: string[];
  generatedContent: {
    lessonSummary: string;
    studentPerformance: string;
    homeworkStatus: string;
    homeworkList: string[]; // 追加: 宿題の箇条書きリスト
    nextSteps: string;
    weeklyPlan: { day: string; task: string }[]; // 変更: 構造化データ
    messageToParents: string;
  };
  quizScore?: number;
  messages?: ReportMessage[];
  needsAction?: boolean;
}

export interface SubjectData {
  score?: number;
  deviation?: number;
}

export interface MockExam {
  id: string;
  studentId: string;
  examName: string;
  examDate: string;
  scores: Record<string, SubjectData>;
}

export interface StudySession {
  id: string;
  studentId: string;
  date: string;
  subject: string;
  minutes: number;
}

export interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  studentId?: string;
  instructorId?: string;
  room?: string;
}

export interface AdminConfig {
  id?: number;
  name: string;
  loginId: string;
  location: string;
  wordKingClassroomRecord: number;
  wordKingClassroomHolder: string;
  passwordHash?: string;
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
