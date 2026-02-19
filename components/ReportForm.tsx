
import React, { useState, useEffect, useRef } from 'react';
import { Student, Report, AttendanceStatus } from '../types';
import { generateProfessionalReport } from '../services/geminiService';
import { generateUniqueId, getLocalISOString } from '../App';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface ReportFormProps {
  students: Student[];
  currentUser: { name: string; id: string };
  onSave: (report: Report) => void;
}

const DAYS_OF_WEEK = ['月', '火', '水', '木', '金', '土', '日'];

const ReportForm: React.FC<ReportFormProps> = ({ students, currentUser, onSave }) => {
  const now = new Date();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [quizScore, setQuizScore] = useState<number | ''>('');
  const [sessionYear, setSessionYear] = useState(now.getFullYear());
  const [sessionMonth, setSessionMonth] = useState<number | string>(now.getMonth() + 1);
  const [sessionCount, setSessionCount] = useState(1);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('present');
  const [homeworkCompletion, setHomeworkCompletion] = useState<number>(100);
  const [proposedSelfStudyDays, setProposedSelfStudyDays] = useState<string[]>([]);
  const [rawNotes, setRawNotes] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<Report['generatedContent'] | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const draftTimerRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef<string>('');

  // 下書きの読み込み
  useEffect(() => {
    if (!selectedStudentId) return;

    const loadDraft = async () => {
      // 1. まずローカルを適用
      const localDraftStr = localStorage.getItem(`report_draft_${selectedStudentId}`);
      if (localDraftStr) {
        const data = JSON.parse(localDraftStr);
        setSubject(data.subject || '');
        setRawNotes(data.rawNotes || '');
        setHomeworkAssigned(data.homeworkAssigned || '');
        setAttendanceStatus(data.attendanceStatus || 'present');
        lastSavedDraftRef.current = localDraftStr;
      }

      // 2. クラウドから最新を取得
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('report_drafts')
          .select('data')
          .eq('student_id', selectedStudentId)
          .eq('instructor_id', currentUser.id)
          .maybeSingle();
        
        // ローカルにデータがない場合、または明示的に異なる場合にのみ上書き
        if (data?.data && !localDraftStr) {
          const d = data.data;
          setSubject(d.subject || '');
          setRawNotes(d.rawNotes || '');
          setHomeworkAssigned(d.homeworkAssigned || '');
          setAttendanceStatus(d.attendanceStatus || 'present');
          lastSavedDraftRef.current = JSON.stringify(d);
        }
      }
    };

    loadDraft();
  }, [selectedStudentId, currentUser.id]);

  // 自動保存
  useEffect(() => {
    if (!selectedStudentId) return;

    if (draftTimerRef.current) clearInterval(draftTimerRef.current);
    
    draftTimerRef.current = window.setInterval(async () => {
      const draftData = { subject, rawNotes, homeworkAssigned, attendanceStatus };
      const draftStr = JSON.stringify(draftData);
      
      // 内容に変更がある場合のみ保存
      if (draftStr === lastSavedDraftRef.current) return;

      localStorage.setItem(`report_draft_${selectedStudentId}`, draftStr);
      lastSavedDraftRef.current = draftStr;
      
      if (isSupabaseConfigured && supabase) {
        await supabase.from('report_drafts').upsert({
          student_id: selectedStudentId,
          instructor_id: currentUser.id,
          data: draftData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,instructor_id' });
      }
    }, 5000);

    return () => { if (draftTimerRef.current) clearInterval(draftTimerRef.current); };
  }, [selectedStudentId, subject, rawNotes, homeworkAssigned, attendanceStatus, currentUser.id]);

  const loadingMessages = [
    "AIが指導メモを読み解いています...",
    "プロフェッショナルな表現に変換中...",
    "宿題リストを整理しています...",
    "日割りの学習計画を構築しています...",
    "最終的な体裁を整えています..."
  ];

  const retryMessages = [
    "現在AIが大変混み合っています...",
    "順番待ちをしています、少々お待ちください...",
    "再接続を試みています..."
  ];

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % (isRetrying ? retryMessages.length : loadingMessages.length));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isRetrying]);

  const toggleSelfStudyDay = (day: string) => {
    setProposedSelfStudyDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const inputBaseStyle = "w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-bold placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all";

  const handleGenerate = async () => {
    if (!selectedStudentId || !subject || !rawNotes) {
      alert('生徒、科目、および指導メモを入力してください。');
      return;
    }

    setIsGenerating(true);
    setIsRetrying(false);
    setErrorMessage(null);
    setLoadingMsgIndex(0);
    
    try {
      const student = students.find(s => s.id === selectedStudentId);
      const timeout = setTimeout(() => setIsRetrying(true), 10000);

      const content = await generateProfessionalReport(
        student?.name || '生徒',
        subject,
        rawNotes,
        homeworkAssigned || 'なし',
        attendanceStatus,
        typeof quizScore === 'number' ? quizScore : undefined,
        homeworkCompletion
      );
      
      clearTimeout(timeout);
      setGeneratedPreview(content);
    } catch (error: any) {
      setErrorMessage(error.message || "予期せぬエラーが発生しました。時間を置いて再度お試しください。");
    } finally {
      setIsGenerating(false);
      setIsRetrying(false);
    }
  };

  const handlePreviewChange = (field: keyof Report['generatedContent'], value: any) => {
    if (!generatedPreview) return;
    setGeneratedPreview({ ...generatedPreview, [field]: value });
  };

  const handleWeeklyPlanChange = (index: number, value: string) => {
    if (!generatedPreview) return;
    const newPlan = [...generatedPreview.weeklyPlan];
    newPlan[index] = { ...newPlan[index], task: value };
    handlePreviewChange('weeklyPlan', newPlan);
  };

  const handleHomeworkListChange = (index: number, value: string) => {
    if (!generatedPreview) return;
    const newList = [...generatedPreview.homeworkList];
    newList[index] = value;
    handlePreviewChange('homeworkList', newList);
  };

  const handleSave = async () => {
    if (!generatedPreview) return;
    const newReport: Report = {
      id: generateUniqueId('rep'),
      studentId: selectedStudentId,
      date: getLocalISOString(),
      subject,
      instructorName: currentUser.name,
      sessionYear,
      sessionMonth,
      sessionCount,
      attendanceStatus,
      homeworkCompletion,
      proposedSelfStudyDays,
      rawNotes,
      homeworkAssigned,
      generatedContent: generatedPreview,
      quizScore: typeof quizScore === 'number' ? quizScore : undefined
    };
    onSave(newReport);
    
    // 下書きの削除
    localStorage.removeItem(`report_draft_${selectedStudentId}`);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('report_drafts').delete().eq('student_id', selectedStudentId).eq('instructor_id', currentUser.id);
    }

    setSelectedStudentId('');
    setSubject('');
    setQuizScore('');
    setRawNotes('');
    setHomeworkAssigned('');
    setGeneratedPreview(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">指導報告書作成</h2>
        <p className="text-slate-500 font-medium">入力内容は自動保存され、他デバイスとも同期されます</p>
      </header>

      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[2rem] animate-slideDown flex items-center gap-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="text-rose-700 font-black">AIアクセス制限またはエラー</p>
            <p className="text-rose-600 text-sm font-bold">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600 font-black">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 h-fit">
          <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md">1</span>
            授業データの入力
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">対象生徒</label>
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={inputBaseStyle}>
                <option value="">生徒を選択</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">科目</label>
              <input type="text" placeholder="例: 数学" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputBaseStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">出席状況</label>
              <div className="flex gap-2">
                {['present', 'late', 'absent'].map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAttendanceStatus(id as AttendanceStatus)}
                    className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border-2 ${
                      attendanceStatus === id 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {id === 'present' ? '出席' : id === 'late' ? '遅刻' : '欠席'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">宿題の実施状況</label>
              <div className="flex gap-2">
                {[100, 50, 0].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setHomeworkCompletion(val)}
                    className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border-2 ${
                      homeworkCompletion === val 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-3 ml-1">自習来塾提案日 (任意)</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleSelfStudyDay(day)}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all border-2 ${
                    proposedSelfStudyDays.includes(day)
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {day}曜
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">指導メモ</label>
            <textarea rows={4} placeholder="授業の様子や理解度を入力..." value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} className={inputBaseStyle + " resize-none"} />
          </div>

          <div>
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2 ml-1">次回までの宿題内容</label>
            <textarea rows={3} placeholder="問題集のページ番号などを入力。AIがここから具体リストと計画を作ります。" value={homeworkAssigned} onChange={(e) => setHomeworkAssigned(e.target.value)} className={inputBaseStyle + " resize-none border-indigo-200"} />
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className={`w-full py-5 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 ${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isGenerating ? (
              <span className="flex flex-col items-center">
                <span className="flex items-center gap-3 mb-1">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {isRetrying ? "再試行中..." : "生成中..."}
                </span>
                <span className="text-[10px] opacity-80 animate-pulse font-bold">
                  {isRetrying ? retryMessages[loadingMsgIndex % retryMessages.length] : loadingMessages[loadingMsgIndex % loadingMessages.length]}
                </span>
              </span>
            ) : '✨ 宿題リストと学習計画を自動生成'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-white flex items-center justify-center text-sm shadow-md">2</span>
            生成内容の確認
          </h3>

          {!generatedPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30">
              <span className="text-6xl mb-4 grayscale opacity-20">📝</span>
              <p className="text-lg font-bold">データを入力して開始してください</p>
            </div>
          ) : (
            <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
              <section>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">指導内容要約</h4>
                <textarea value={generatedPreview.lessonSummary} onChange={(e) => handlePreviewChange('lessonSummary', e.target.value)} className="w-full rounded-2xl border-2 border-slate-100 text-[14px] font-bold leading-relaxed text-slate-700 bg-slate-50/50 focus:bg-white focus:border-indigo-400 outline-none transition-all" rows={3} />
              </section>

              <section className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                   <span className="text-sm">📋</span> 今回の宿題リスト (To-Do)
                </h4>
                <div className="space-y-3">
                  {generatedPreview.homeworkList.map((hw, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-indigo-300 font-black pt-2">・</span>
                      <input 
                        value={hw} 
                        onChange={(e) => handleHomeworkListChange(idx, e.target.value)}
                        className="flex-1 bg-white border border-indigo-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] border border-white/10 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <h4 className="text-[10px] font-black text-indigo-200 uppercase mb-4 tracking-[0.2em] relative z-10">AI 7日間学習計画</h4>
                <div className="space-y-4 relative z-10">
                  {generatedPreview.weeklyPlan.map((plan, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-indigo-400 ml-1">{plan.day}</span>
                      <input 
                        value={plan.task} 
                        onChange={(e) => handleWeeklyPlanChange(idx, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[13px] font-bold text-indigo-50 focus:bg-white/10 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-rose-500 uppercase mb-2 tracking-widest">保護者様へのメッセージ</h4>
                <textarea value={generatedPreview.messageToParents} onChange={(e) => handlePreviewChange('messageToParents', e.target.value)} className="w-full bg-rose-50/50 p-5 rounded-xl border-2 border-rose-100 text-[14px] font-bold italic text-slate-800 focus:bg-white focus:border-rose-300 outline-none transition-all" rows={2} />
              </section>

              <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] mt-4 mb-8">
                報告書を確定・保存する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
