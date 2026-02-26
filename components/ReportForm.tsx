
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

const SESSION_PERIOD_TAGS = ['夏期', '冬期', '春期', '追加', '体験', '振替'];
const SESSION_INSTANCE_ID = generateUniqueId('inst');

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<Report['generatedContent'] | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');

  const draftValuesRef = useRef({
    subject, rawNotes, homeworkAssigned, attendanceStatus, homeworkCompletion,
    proposedSelfStudyDays, quizScore, sessionYear, sessionMonth, sessionCount
  });

  const saveTimeoutRef = useRef<number | null>(null);

  // 1. 各項目の反映と「クラウドへの自動保存」のトリガー
  const handleInteraction = (field: string, value: any, setter: (val: any) => void) => {
    setter(value);
    (draftValuesRef.current as any)[field] = value;
    setSyncStatus('saving');

    // ローカル保存（即時）
    if (selectedStudentId) {
      localStorage.setItem(`report_draft_${selectedStudentId}`, JSON.stringify({
        ...draftValuesRef.current,
        updatedAt: Date.now(),
        instanceId: SESSION_INSTANCE_ID
      }));
    }

    // クラウド保存（デバウンス2秒）
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(async () => {
      if (selectedStudentId && isSupabaseConfigured && supabase) {
        try {
          await supabase.from('report_drafts').upsert({
            student_id: selectedStudentId,
            instructor_id: currentUser.id,
            data: draftValuesRef.current,
            updated_at: new Date().toISOString()
          }, { onConflict: 'student_id,instructor_id' });
          setSyncStatus('synced');
        } catch (e) {
          setSyncStatus('offline');
        }
      } else {
        setSyncStatus('synced');
      }
    }, 2000);
  };

  // 2. クラウド下書きの読み込み（確実な同期）
  useEffect(() => {
    if (!selectedStudentId) return;

    const syncDraft = async () => {
      let localDraft: any = null;
      const localStr = localStorage.getItem(`report_draft_${selectedStudentId}`);
      if (localStr) localDraft = JSON.parse(localStr);

      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('report_drafts')
          .select('data, updated_at')
          .eq('student_id', selectedStudentId)
          .eq('instructor_id', currentUser.id)
          .maybeSingle();

        if (data) {
          const cloudTime = new Date(data.updated_at).getTime();
          const localTime = localDraft?.updatedAt || 0;

          // クラウドの方が新しいか、ローカルにデータがない場合のみ上書き
          if (cloudTime > localTime || !localDraft) {
            const d = data.data;
            setSubject(d.subject || '');
            setRawNotes(d.rawNotes || '');
            setHomeworkAssigned(d.homeworkAssigned || '');
            setAttendanceStatus(d.attendanceStatus || 'present');
            setHomeworkCompletion(d.homeworkCompletion ?? 100);
            setQuizScore(d.quizScore ?? '');
            setSessionYear(d.sessionYear || now.getFullYear());
            setSessionMonth(d.sessionMonth || (now.getMonth() + 1));
            setSessionCount(d.sessionCount || 1);
            draftValuesRef.current = d;
          }
        }
      }
    };
    syncDraft();
  }, [selectedStudentId, currentUser.id]);

  const resetFields = () => {
    setSubject(''); setRawNotes(''); setHomeworkAssigned(''); setAttendanceStatus('present');
    setHomeworkCompletion(100); setQuizScore(''); setGeneratedPreview(null);
    draftValuesRef.current = {
      subject: '', rawNotes: '', homeworkAssigned: '', attendanceStatus: 'present',
      homeworkCompletion: 100, proposedSelfStudyDays: [], quizScore: '',
      sessionYear: now.getFullYear(), sessionMonth: now.getMonth() + 1, sessionCount: 1
    };
  };

  const handleGenerate = async () => {
    if (!selectedStudentId || !subject || !rawNotes) {
      alert('生徒名、科目、指導メモを入力してください。');
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      const content = await generateProfessionalReport(student?.name || '生徒', subject, rawNotes, homeworkAssigned || '特になし', attendanceStatus, Number(quizScore) || undefined, homeworkCompletion);
      setGeneratedPreview(content);
    } catch (error: any) {
      setErrorMessage(error.message || "AI生成中にエラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPreview) return;
    const currentSid = selectedStudentId;
    const newReport: Report = {
      id: generateUniqueId('rep'), studentId: currentSid, date: getLocalISOString(),
      subject, instructorName: currentUser.name, sessionYear: Number(sessionYear),
      sessionMonth, sessionCount, attendanceStatus, homeworkCompletion,
      proposedSelfStudyDays, rawNotes, homeworkAssigned, generatedContent: generatedPreview,
      quizScore: Number(quizScore) || undefined
    };
    onSave(newReport);
    
    // 保存後は下書きを削除（確実なクリーンアップ）
    if (isSupabaseConfigured && supabase) {
      await supabase.from('report_drafts').delete().eq('student_id', currentSid).eq('instructor_id', currentUser.id);
    }
    localStorage.removeItem(`report_draft_${currentSid}`);
    resetFields();
    setSelectedStudentId('');
  };

  const inputBaseStyle = "w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-bold focus:border-indigo-500 outline-none transition-all";

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">指導報告書作成</h2>
          <p className="text-slate-500 font-medium italic">作業内容はクラウドに自動保存されます</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'saving' ? 'Saving...' : 'Offline'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 h-fit">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md">1</span>
            基本データの入力
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">対象生徒</label>
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={inputBaseStyle}>
                <option value="">生徒を選択</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">科目</label>
              <input type="text" placeholder="例: 数学" value={subject} onChange={(e) => handleInteraction('subject', e.target.value, setSubject)} className={inputBaseStyle} />
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">実施年度</label>
                  <input type="number" value={sessionYear} onChange={(e) => handleInteraction('sessionYear', Number(e.target.value), setSessionYear)} className={inputBaseStyle + " text-center"} />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-indigo-600 uppercase mb-2 ml-1">実施月/期</label>
                  <input type="text" value={sessionMonth} onChange={(e) => handleInteraction('sessionMonth', e.target.value, setSessionMonth)} className={inputBaseStyle + " text-center border-indigo-200"} />
               </div>
             </div>
             <div className="flex flex-wrap gap-1.5">
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(m => (
                  <button key={m} onClick={() => handleInteraction('sessionMonth', m, setSessionMonth)} className={`px-2 py-1 text-[10px] font-black rounded-lg border transition-all ${sessionMonth.toString() === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}>{m}月</button>
                ))}
                {SESSION_PERIOD_TAGS.map(tag => (
                  <button key={tag} onClick={() => handleInteraction('sessionMonth', tag, setSessionMonth)} className={`px-2 py-1 text-[10px] font-black rounded-lg border transition-all ${sessionMonth === tag ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-500 border-amber-200 hover:bg-amber-50'}`}>{tag}</button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">出席状況</label>
              <div className="flex gap-1.5">
                {['present', 'late', 'absent'].map(id => (
                  <button key={id} type="button" onClick={() => handleInteraction('attendanceStatus', id as AttendanceStatus, setAttendanceStatus)} className={`flex-1 py-2.5 rounded-xl font-black text-[11px] transition-all border-2 ${attendanceStatus === id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                    {id === 'present' ? '出席' : id === 'late' ? '遅刻' : '欠席'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">小テスト点</label>
              <input type="number" value={quizScore} onChange={(e) => handleInteraction('quizScore', e.target.value === '' ? '' : Number(e.target.value), setQuizScore)} className={inputBaseStyle + " text-center"} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">指導メモ</label>
              <textarea rows={4} placeholder="授業の様子や弱点を入力..." value={rawNotes} onChange={(e) => handleInteraction('rawNotes', e.target.value, setRawNotes)} className={inputBaseStyle + " resize-none text-sm"} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 ml-1">宿題内容</label>
              <textarea rows={2} placeholder="宿題の範囲..." value={homeworkAssigned} onChange={(e) => handleInteraction('homeworkAssigned', e.target.value, setHomeworkAssigned)} className={inputBaseStyle + " resize-none text-sm border-indigo-100"} />
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className={`w-full py-5 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 ${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isGenerating ? "AI生成中..." : "✨ AIによる学習計画生成"}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm shadow-md">2</span>
            生成内容の確認
          </h3>

          {!generatedPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-[3rem]">
              <span className="text-6xl mb-4 grayscale opacity-30">📋</span>
              <p className="font-bold">入力を完了してAI生成を開始してください</p>
            </div>
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-2 tracking-widest">指導内容要約</h4>
                <p className="text-sm font-bold leading-relaxed text-slate-700 italic">「{generatedPreview.lessonSummary}」</p>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-amber-600 uppercase mb-4 tracking-widest">AI 7日間学習ロードマップ</h4>
                <div className="space-y-2">
                  {generatedPreview.weeklyPlan.map((plan, idx) => (
                    <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black text-indigo-500 shrink-0 pt-1">{plan.day}</span>
                      <span className="text-sm font-bold text-slate-700">{plan.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                <h4 className="text-[10px] font-black text-rose-500 uppercase mb-2 tracking-widest">保護者様へ</h4>
                <p className="text-sm font-bold italic text-slate-800 leading-relaxed">「{generatedPreview.messageToParents}」</p>
              </div>

              <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] mt-4 mb-4">
                報告書を確定して送信
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
