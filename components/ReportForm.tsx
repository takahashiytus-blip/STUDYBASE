
import React, { useState, useEffect, useRef } from 'react';
import { Student, Report, AttendanceStatus } from '../types';
import { generateProfessionalReport } from '../services/geminiService';
import { generateUniqueId, getLocalISOString } from '../utils';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface ReportFormProps {
  students: Student[];
  currentUser: { name: string; id: string };
  onSave: (report: Report) => void;
}

const DAYS_OF_WEEK = ['月', '火', '水', '木', '金', '土', '日'];
const SESSION_INSTANCE_ID = generateUniqueId('inst');

const ReportForm: React.FC<ReportFormProps> = ({ students, currentUser, onSave }) => {
  const now = new Date();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // 表示用ステート
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<Report['generatedContent'] | null>(null);

  // 同期制御用 Ref (ステートの遅延を回避し、常に最新の値を即時参照可能にする)
  const draftValuesRef = useRef({
    subject: '',
    rawNotes: '',
    homeworkAssigned: '',
    attendanceStatus: 'present' as AttendanceStatus,
    homeworkCompletion: 100,
    proposedSelfStudyDays: [] as string[],
    quizScore: '' as number | '',
    sessionYear: now.getFullYear(),
    sessionMonth: (now.getMonth() + 1) as number | string,
    sessionCount: 1,
    interactionCount: 0
  });

  const draftTimerRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false); 
  const isDirtyRef = useRef<boolean>(false); 
  const interactionTimerRef = useRef<number | null>(null);

  // 値をステートとRefの両方に即時反映させる中心的なハンドラ
  const handleInteraction = (field: keyof typeof draftValuesRef.current, value: any, setter?: (val: any) => void) => {
    isUserInteractingRef.current = true;
    isDirtyRef.current = true;
    draftValuesRef.current.interactionCount++;
    
    // Refを即時更新
    (draftValuesRef.current as any)[field] = value;
    
    // 表示用ステートを更新
    if (setter) setter(value);
    
    if (selectedStudentId) {
      const draftToStore = { 
        ...draftValuesRef.current,
        updatedAt: Date.now(),
        instanceId: SESSION_INSTANCE_ID
      };
      localStorage.setItem(`report_draft_${selectedStudentId}`, JSON.stringify(draftToStore));
    }
    
    if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = window.setTimeout(() => { 
      isUserInteractingRef.current = false; 
    }, 1500); 
  };

  const resetFields = () => {
    const defaultVals = {
      subject: '', rawNotes: '', homeworkAssigned: '', attendanceStatus: 'present' as AttendanceStatus,
      homeworkCompletion: 100,
      proposedSelfStudyDays: [], quizScore: '' as number | '', sessionYear: now.getFullYear(),
      sessionMonth: now.getMonth() + 1, sessionCount: 1, interactionCount: 0
    };
    draftValuesRef.current = defaultVals;
    setSubject(defaultVals.subject);
    setRawNotes(defaultVals.rawNotes);
    setHomeworkAssigned(defaultVals.homeworkAssigned);
    setAttendanceStatus(defaultVals.attendanceStatus);
    setHomeworkCompletion(defaultVals.homeworkCompletion);
    setProposedSelfStudyDays(defaultVals.proposedSelfStudyDays);
    setQuizScore(defaultVals.quizScore);
    setSessionYear(defaultVals.sessionYear);
    setSessionMonth(defaultVals.sessionMonth);
    setSessionCount(defaultVals.sessionCount);
    setGeneratedPreview(null);
    isDirtyRef.current = false;
    isUserInteractingRef.current = false;
    isSavingRef.current = false;
    lastSyncTimeRef.current = 0; 
  };

  useEffect(() => {
    let isIgnore = false;
    if (!selectedStudentId) {
      isDirtyRef.current = false;
      return;
    }

    const loadLatestDraft = async () => {
      let localDraft: any = null;
      let cloudDraft: any = null;

      const localDraftStr = localStorage.getItem(`report_draft_${selectedStudentId}`);
      if (localDraftStr) localDraft = JSON.parse(localDraftStr);

      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('report_drafts')
          .select('data, updated_at')
          .eq('student_id', selectedStudentId)
          .eq('instructor_id', currentUser.id)
          .maybeSingle();
        if (data?.data) {
          cloudDraft = { ...data.data, updatedAt: new Date(data.updated_at).getTime() };
        }
      }

      if (isIgnore) return;

      const finalDraft = (!localDraft && !cloudDraft) ? null :
        (!localDraft) ? cloudDraft :
        (!cloudDraft) ? localDraft :
        ((cloudDraft.updatedAt || 0) > (localDraft.updatedAt || 0)) ? cloudDraft : localDraft;

      if (finalDraft) {
        draftValuesRef.current = {
          subject: finalDraft.subject || '',
          rawNotes: finalDraft.rawNotes || '',
          homeworkAssigned: finalDraft.homeworkAssigned || '',
          attendanceStatus: finalDraft.attendanceStatus || 'present',
          homeworkCompletion: finalDraft.homeworkCompletion ?? 100,
          proposedSelfStudyDays: finalDraft.proposedSelfStudyDays || [],
          quizScore: finalDraft.quizScore ?? '',
          sessionYear: finalDraft.sessionYear || now.getFullYear(),
          sessionMonth: finalDraft.sessionMonth || (now.getMonth() + 1),
          sessionCount: finalDraft.sessionCount || 1,
          interactionCount: finalDraft.interactionCount || 0
        };
        setSubject(draftValuesRef.current.subject);
        setRawNotes(draftValuesRef.current.rawNotes);
        setHomeworkAssigned(draftValuesRef.current.homeworkAssigned);
        setAttendanceStatus(draftValuesRef.current.attendanceStatus);
        setHomeworkCompletion(draftValuesRef.current.homeworkCompletion);
        setProposedSelfStudyDays(draftValuesRef.current.proposedSelfStudyDays);
        setQuizScore(draftValuesRef.current.quizScore);
        setSessionYear(draftValuesRef.current.sessionYear);
        setSessionMonth(draftValuesRef.current.sessionMonth);
        setSessionCount(draftValuesRef.current.sessionCount);
        lastSyncTimeRef.current = finalDraft.updatedAt || Date.now();
        isDirtyRef.current = false; 
      } else {
        resetFields();
        lastSyncTimeRef.current = Date.now();
      }
    };

    loadLatestDraft();

    let channel: any;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`draft_final_v5_${selectedStudentId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'report_drafts',
          filter: `student_id=eq.${selectedStudentId}`
        }, (payload) => {
          if (isIgnore) return;
          if (payload.eventType === 'DELETE') {
             resetFields();
             lastSyncTimeRef.current = Date.now();
             return;
          }

          if (payload.new && payload.new.instructor_id === currentUser.id) {
            const incomingData = payload.new.data;
            const incomingUpdateAt = new Date(payload.new.updated_at).getTime();
            
            if (incomingData.instanceId === SESSION_INSTANCE_ID) return;

            // ユーザー操作中、または未同期のローカル変更がある場合はリモート更新をブロック
            if (!isUserInteractingRef.current && !isDirtyRef.current && incomingUpdateAt > lastSyncTimeRef.current + 100) {
              draftValuesRef.current = {
                subject: incomingData.subject || '',
                rawNotes: incomingData.rawNotes || '',
                homeworkAssigned: incomingData.homeworkAssigned || '',
                attendanceStatus: incomingData.attendanceStatus || 'present',
                homeworkCompletion: incomingData.homeworkCompletion ?? 100,
                proposedSelfStudyDays: incomingData.proposedSelfStudyDays || [],
                quizScore: incomingData.quizScore ?? '',
                sessionYear: incomingData.sessionYear || now.getFullYear(),
                sessionMonth: incomingData.sessionMonth || (now.getMonth() + 1),
                sessionCount: incomingData.sessionCount || 1,
                interactionCount: incomingData.interactionCount || 0
              };
              setSubject(draftValuesRef.current.subject);
              setRawNotes(draftValuesRef.current.rawNotes);
              setHomeworkAssigned(draftValuesRef.current.homeworkAssigned);
              setAttendanceStatus(draftValuesRef.current.attendanceStatus);
              setHomeworkCompletion(draftValuesRef.current.homeworkCompletion);
              setProposedSelfStudyDays(draftValuesRef.current.proposedSelfStudyDays);
              setQuizScore(draftValuesRef.current.quizScore);
              setSessionYear(draftValuesRef.current.sessionYear);
              setSessionMonth(draftValuesRef.current.sessionMonth);
              setSessionCount(draftValuesRef.current.sessionCount);
              lastSyncTimeRef.current = incomingUpdateAt;
              isDirtyRef.current = false; 
            }
          }
        })
        .subscribe();
    }

    return () => { 
      isIgnore = true;
      if (channel) supabase.removeChannel(channel); 
    };
  }, [selectedStudentId, currentUser.id]);

  useEffect(() => {
    if (!selectedStudentId) return;
    if (draftTimerRef.current) clearInterval(draftTimerRef.current);
    
    draftTimerRef.current = window.setInterval(async () => {
      // 変更がある かつ 保存中でない 場合に実行
      if (!isDirtyRef.current || isSavingRef.current) return;

      const nowTime = Date.now();
      const currentSnapshotCount = draftValuesRef.current.interactionCount;
      const draftData = { 
        ...draftValuesRef.current,
        updatedAt: nowTime,
        instanceId: SESSION_INSTANCE_ID 
      };
      
      if (isSupabaseConfigured && supabase) {
        try {
          isSavingRef.current = true;
          const { data, error } = await supabase.from('report_drafts').upsert({
            student_id: selectedStudentId,
            instructor_id: currentUser.id,
            data: draftData,
            updated_at: new Date(nowTime).toISOString()
          }, { onConflict: 'student_id,instructor_id' }).select('updated_at').maybeSingle();
          
          if (!error && data) {
            // 保存完了までに新たな操作が行われていなければ、Dirtyを解除
            if (draftValuesRef.current.interactionCount === currentSnapshotCount) {
              isDirtyRef.current = false; 
            }
            lastSyncTimeRef.current = new Date(data.updated_at).getTime();
          }
        } catch (e) {
          console.warn("Sync heart-beat jitter.");
        } finally {
          isSavingRef.current = false;
        }
      }
    }, 2800); 

    return () => { if (draftTimerRef.current) clearInterval(draftTimerRef.current); };
  }, [selectedStudentId, currentUser.id]);

  const toggleSelfStudyDay = (day: string) => {
    const nextDays = proposedSelfStudyDays.includes(day)
      ? proposedSelfStudyDays.filter(d => d !== day)
      : [...proposedSelfStudyDays, day];
    handleInteraction('proposedSelfStudyDays', nextDays, setProposedSelfStudyDays);
  };

  const inputBaseStyle = "w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-bold placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all";

  const handleGenerate = async () => {
    if (!selectedStudentId || !subject || !rawNotes) {
      alert('生徒名、科目、指導メモを入力してください。');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    
    try {
      const student = students.find(s => s.id === selectedStudentId);
      const content = await generateProfessionalReport(
        student?.name || '生徒',
        subject,
        rawNotes,
        homeworkAssigned || '特になし',
        attendanceStatus,
        Number(quizScore) || undefined,
        homeworkCompletion
      );
      setGeneratedPreview(content);
    } catch (error: any) {
      setErrorMessage(error.message || "AI生成中にエラーが発生しました。");
    } finally {
      setIsGenerating(false);
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
    const currentSid = selectedStudentId;
    isSavingRef.current = true;
    
    const newReport: Report = {
      id: generateUniqueId('rep'),
      studentId: currentSid,
      date: getLocalISOString(),
      subject,
      instructorName: currentUser.name,
      sessionYear: Number(sessionYear),
      sessionMonth,
      sessionCount,
      attendanceStatus,
      homeworkCompletion,
      proposedSelfStudyDays,
      rawNotes,
      homeworkAssigned,
      generatedContent: generatedPreview,
      quizScore: Number(quizScore) || undefined
    };
    
    onSave(newReport);
    
    if (isSupabaseConfigured && supabase) {
      await supabase.from('report_drafts').delete().eq('student_id', currentSid).eq('instructor_id', currentUser.id);
    }
    localStorage.removeItem(`report_draft_${currentSid}`);

    resetFields();
    setSelectedStudentId('');
    isSavingRef.current = false;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">指導報告書作成</h2>
        <p className="text-slate-500 font-medium">AIの力で教育を効率化。入力内容はクラウドと常に同期されます。</p>
      </header>

      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[2rem] animate-slideDown flex items-center gap-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="text-rose-700 font-black">AIアクセスエラー</p>
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
              <input type="text" placeholder="例: 英語" value={subject} onChange={(e) => handleInteraction('subject', e.target.value, setSubject)} className={inputBaseStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">実施年度</label>
                <input type="number" value={sessionYear} onChange={(e) => handleInteraction('sessionYear', Number(e.target.value), setSessionYear)} className={inputBaseStyle + " text-center"} />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">実施月/期</label>
                <input type="text" value={sessionMonth} onChange={(e) => handleInteraction('sessionMonth', e.target.value, setSessionMonth)} className={inputBaseStyle + " text-center"} placeholder="5" />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">受講回数</label>
                <input type="number" value={sessionCount} onChange={(e) => handleInteraction('sessionCount', Number(e.target.value), setSessionCount)} className={inputBaseStyle + " text-center"} />
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
                    onClick={() => handleInteraction('attendanceStatus', id as AttendanceStatus, setAttendanceStatus)}
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">小テスト (任意)</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="点数" 
                  value={quizScore} 
                  onChange={(e) => handleInteraction('quizScore', e.target.value === '' ? '' : Number(e.target.value), setQuizScore)}
                  className={inputBaseStyle + " text-center pr-12"} 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">点</span>
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
            <textarea rows={4} placeholder="授業の様子、理解度、弱点などを入力してください。" value={rawNotes} onChange={(e) => handleInteraction('rawNotes', e.target.value, setRawNotes)} className={inputBaseStyle + " resize-none"} />
          </div>

          <div>
            <label className="block text-xs font-black text-indigo-50 uppercase tracking-widest mb-2 ml-1">宿題内容</label>
            <textarea rows={3} placeholder="問題集名やページ数..." value={homeworkAssigned} onChange={(e) => handleInteraction('homeworkAssigned', e.target.value, setHomeworkAssigned)} className={inputBaseStyle + " resize-none border-indigo-200"} />
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className={`w-full py-5 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 ${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isGenerating ? "生成中..." : "✨ AIによる宿題リストと学習計画の生成"}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-white flex items-center justify-center text-sm shadow-md">2</span>
            生成内容の最終確認
          </h3>

          {!generatedPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30">
              <span className="text-6xl mb-4 grayscale opacity-20">📝</span>
              <p className="text-lg font-bold">データを入力してAI生成を開始</p>
            </div>
          ) : (
            <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
              <section>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">指導内容要約</h4>
                <textarea value={generatedPreview.lessonSummary} onChange={(e) => handlePreviewChange('lessonSummary', e.target.value)} className="w-full rounded-2xl border-2 border-slate-100 text-[14px] font-bold leading-relaxed text-slate-700 bg-slate-50/50 focus:bg-white focus:border-indigo-400 outline-none transition-all" rows={3} />
              </section>

              <section className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                   <span className="text-sm">📋</span> 宿題タスクリスト (To-Do)
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
                <h4 className="text-[10px] font-black text-indigo-200 uppercase mb-4 tracking-[0.2em] relative z-10">AI 7日間学習ロードマップ</h4>
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
                <h4 className="text-[10px] font-black text-rose-500 uppercase mb-2 tracking-widest">保護者様へのアドバイス</h4>
                <textarea value={generatedPreview.messageToParents} onChange={(e) => handlePreviewChange('messageToParents', e.target.value)} className="w-full bg-rose-50/50 p-5 rounded-xl border-2 border-rose-100 text-[14px] font-bold italic text-slate-800 focus:bg-white focus:border-rose-300 outline-none transition-all" rows={2} />
              </section>

              <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] mt-4 mb-8">
                指導報告書を確定保存
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
