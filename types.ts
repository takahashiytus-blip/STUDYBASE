
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
  parentPassword?: string;
  iqHistory?: IQResult[]; // IQテスト履歴
  wordKingBest?: number; // 英単語王のパーソナルベスト
  studyPlusId?: string; // StudyPlus連携用ID
  studyPlusMinutes?: Record<string, Record<string, number>>; // 日付ごとのStudyPlus学習時間 (YYYY-MM-DD -> { subject -> minutes })
  studyPlusLastSynced?: string; // 最終同期日時
  parentName?: string; // 保護者名
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
  canGenerateInterviewMaterial?: boolean; // 面談資料作成権限
  isAdmin?: boolean; // 管理者権限（システム設定以外）
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
  studentIds?: string[]; // 集団授業用: 複数の生徒ID
  instructorId?: string;
  room?: string;
  lessonType?: 'individual' | 'group'; // 個別 or 集団
  groupName?: string; // 集団授業名
}

export interface GroupLessonLog {
  id: string;
  timetableId: string; // どの授業枠か
  date: string; // 実施日 (YYYY-MM-DD)
  content: string; // 授業内容
  instructorComments: string; // 講師コメント
  homework: string; // 宿題
  pdfUrl?: string; // PDFファイルのURL (またはbase64)
  pdfName?: string; // PDFファイル名
}

export interface AdminConfig {
  id?: number;
  name: string;
  loginId: string;
  location: string;
  wordKingClassroomRecord: number;
  wordKingClassroomHolder: string;
  passwordHash?: string;
  isMaintenanceMode?: boolean; // メンテナンスモード
  announcement?: string; // お知らせメッセージ
  announcementTargetIds?: string[]; // お知らせを表示する生徒・講師のID
  isAnnouncementActive?: boolean; // お知らせの有効化フラグ
}

export interface InterviewSlot {
  id: string;
  interviewerId: string; // admin or instructor id
  interviewerName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'available' | 'booked' | 'confirmed';
  studentId?: string;
  studentName?: string;
  parentName?: string;
  note?: string;
}

export interface InterviewRecord {
  id: string;
  studentId: string;
  date: string;
  interviewerId?: string; // 追加: 講師ID
  interviewerName: string;
  content: string; // 面談内容のメモ
  nextActions: string; // 次回までのアクション
  aiMaterial?: {
    growthPoints: string;
    challenges: string;
    parentAdvice: string;
    suggestedSchools: {
      public: { challenge: string[]; realistic: string[] };
      private: { challenge: string[]; solid: string[] };
    };
    requiredStudyHours: {
      totalWeekly: number;
      subjectBreakdown: { subject: string; hours: number }[];
    };
  };
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
  interviewSlots: InterviewSlot[];
  interviewRecords: InterviewRecord[];
  seasonalCourses: SeasonalCourse[];
  seasonalSlots: SeasonalSlot[];
}

export type SeasonalVisibility = 'all' | 'instructor' | 'hidden';

export interface SeasonalCourse {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  regularClassPattern: 'continue' | 'suspend';
  description?: string;
  reservationDeadline?: string; // 予約締め切り日時 (ISO string or YYYY-MM-DD HH:mm)
  visibility?: SeasonalVisibility; // 表示対象: 'all' (生徒・講師), 'instructor' (講師のみ), 'hidden' (非表示)
}

export interface SeasonalSlot {
  id: string;
  courseId: string;
  instructorId: string;
  instructorName: string;
  date: string;
  startTime: string;
  endTime: string;
  studentId?: string;
  studentName?: string;
  subject?: string;
  status: 'available' | 'booked';
}
