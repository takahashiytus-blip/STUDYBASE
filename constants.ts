
import { Student, Report, UserRole, Instructor, TimetableEntry } from './types';

export const MOCK_INSTRUCTORS: Instructor[] = [
  { id: 'i1', name: '山田 講師', specialty: '数学・理科', loginId: 'yamada01', password: 'password123' },
  { id: 'i2', name: '佐藤 講師', specialty: '英語・国語', loginId: 'sato02', password: 'password123' },
  { id: 'i3', name: '鈴木 講師', specialty: '算数・社会', loginId: 'suzuki03', password: 'password123' },
];

export const MOCK_STUDENTS: Student[] = [
  { 
    id: 's1', 
    name: '田中 太郎', 
    grade: '中学2年生', 
    instructorIds: ['i1'], 
    loginId: 'tanaka_t', 
    password: 'pass888',
    weeklyInstructorMessage: '連立方程式の計算、かなり速くなってきましたね！今週は文章題に挑戦してみましょう。' 
  },
  { 
    id: 's2', 
    name: '佐藤 結衣', 
    grade: '小学6年生', 
    instructorIds: ['i2'], 
    loginId: 'sato_y', 
    password: 'pass777',
    weeklyInstructorMessage: '国語の記述が具体的でよくなってきました。この調子で頑張りましょう！'
  },
  { 
    id: 's3', 
    name: '鈴木 海斗', 
    grade: '高校1年生', 
    instructorIds: ['i1', 'i3'], 
    loginId: 'suzuki_k', 
    password: 'pass999', 
    targetFaculty: '工学・情報系',
    weeklyInstructorMessage: '高校数学は基礎が肝心です。今週のチャートの問題は完璧にしておきましょう。'
  },
];

export const MOCK_TIMETABLE: TimetableEntry[] = [
  { id: 't1', dayOfWeek: 1, startTime: '17:00', endTime: '18:30', subject: '数学', studentId: 's1', instructorId: 'i1', room: 'A教室' },
  { id: 't2', dayOfWeek: 3, startTime: '19:00', endTime: '20:30', subject: '英語', studentId: 's1', instructorId: 'i2', room: 'B教室' },
  { id: 't3', dayOfWeek: 2, startTime: '16:30', endTime: '18:00', subject: '国語', studentId: 's2', instructorId: 'i2', room: 'A教室' },
  { id: 't4', dayOfWeek: 4, startTime: '18:00', endTime: '19:30', subject: '英語', studentId: 's3', instructorId: 'i2', room: 'C教室' },
  { id: 't5', dayOfWeek: 5, startTime: '19:00', endTime: '21:00', subject: '数学', studentId: 's3', instructorId: 'i1', room: 'A教室' },
  { id: 't6', dayOfWeek: 1, startTime: '19:00', endTime: '20:30', subject: '理科', studentId: 's1', instructorId: 'i1', room: 'B教室' },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: 'r1',
    studentId: 's1',
    date: '2024-05-15',
    subject: '数学',
    instructorName: '山田 講師',
    sessionYear: 2024,
    sessionMonth: 5,
    sessionCount: 2,
    attendanceStatus: 'present',
    rawNotes: '連立方程式の応用問題を解いた。最初は苦戦していたが、代入法のコツを掴んでからはスムーズだった。宿題は全部やってきた。',
    homeworkAssigned: '問題集 p.40-42',
    quizScore: 85,
    generatedContent: {
      lessonSummary: '本日は連立方程式の応用（文章題）を中心に取り組みました。',
      studentPerformance: '序盤は変数の置き方に迷いが見られましたが、代入法の活用方法を解説したところ、中盤以降は自力で正答を導き出せるようになりました。非常に高い集中力でした。',
      homeworkStatus: '前回提示した宿題は完璧にこなされており、基礎固めがしっかりできていることが確認できました。',
      nextSteps: '次回は一次関数の導入に入ります。今回の連立方程式の知識が必要になるため、復習を継続してください。',
      weeklyPlan: '1日目：p.40 解き直し\n2日目：p.41 練習問題\n3日目：p.42 応用問題\n4日目：間違えた箇所の復習\n5日目：確認問題 A\n6日目：確認問題 B\n7日目：次回の予習',
      messageToParents: '着実にステップアップされています。ご家庭でも、代入法ができるようになったことをぜひ褒めてあげてください。'
    },
    messages: []
  }
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理者',
  instructor: '講師',
  parent: '保護者',
  student: '生徒'
};

export const FACULTY_OPTIONS = [
  '人文・文学・歴史系',
  '法・政治系',
  '経済・商・経営系',
  '社会・メディア系',
  '国際・外国語系',
  '教育系',
  '理学系',
  '工学・情報系',
  '農・獣医・畜産系',
  '医・歯・薬系',
  '看護・保健・福祉系',
  '芸術・スポーツ系',
  '家政・生活科学系',
  '総合・環境・情報系'
];
