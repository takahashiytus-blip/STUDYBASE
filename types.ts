
export type UserRole = 'instructor' | 'parent' | 'student' | 'admin';
export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface Student {
  id: string; // UUID from Auth
  name: string;
  grade: string;
  instructorIds: string[];
  targetSchool?: string;
  targetFaculty?: string;
  weeklyInstructorMessage?: string;
  // Added loginId and password to fix type errors in constants and components
  loginId?: string;
  password?: string;
}

export interface Instructor {
  id: string; // UUID from Auth
  name: string;
  specialty: string;
  // Added loginId and password to fix type errors in constants and components
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
    nextSteps: string;
    weeklyPlan: string;
    messageToParents: string;
  };
  quizScore?: number;
  messages?: ReportMessage[];
  needsAction?: boolean;
}

// Exported SubjectData for use in MockExam and other components
export interface SubjectData {
  score?: number;
  deviation?: number;
}

export interface MockExam {
  id: string;
  studentId: string;
  examName: string;
  examDate: string;
  // Updated to use SubjectData interface
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
  // Added passwordHash to fix type error in AdminSettings
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
