
import React, { useState, useMemo } from 'react';
import { Student, Report, MockExam, AdminConfig, InterviewRecord, InterviewSlot } from '../types';
import { generateInterviewMaterial } from '../services/geminiService';
import { getLocalISOString, parseSafeDate } from '../utils';

interface InterviewCenterProps {
  students: Student[];
  reports: Report[];
  mockExams: MockExam[];
  adminConfig: AdminConfig;
  canGenerate: boolean;
  interviewRecords: InterviewRecord[];
  interviewSlots: InterviewSlot[];
  currentUser: { id: string; name: string };
  onSaveRecord: (record: InterviewRecord) => void;
}

export const InterviewCenter: React.FC<InterviewCenterProps> = ({ 
  students = [], 
  reports = [], 
  mockExams = [], 
  adminConfig, 
  canGenerate, 
  interviewRecords = [], 
  interviewSlots = [],
  currentUser,
  onSaveRecord
}) => {
  const [selectedSid, setSelectedSid] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [material, setMaterial] = useState<any>(null);

  const handleSaveToCloud = async () => {
    if (!material || !selectedSid) return;
    setIsSaving(true);
    try {
      const newRecord: InterviewRecord = {
        id: `irec-ai-${Date.now()}`,
        studentId: selectedSid,
        date: getLocalISOString().split('T')[0],
        interviewerName: currentUser.name,
        content: `AI生成面談資料: ${material.growthPoints.substring(0, 50)}...`,
        nextActions: material.parentAdvice,
        aiMaterial: material
      };
      await onSaveRecord(newRecord);
      alert("面談資料をクラウドに保存しました。面談予約・記録タブから過去分を確認できます。");
    } catch (e) {
      alert("保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSid) return;
    setIsGenerating(true);
    try {
      const student = students.find(s => s.id === selectedSid)!;
      const studentReports = reports.filter(r => r.studentId === selectedSid).slice(0, 5);
      const studentMocks = mockExams.filter(m => m.studentId === selectedSid);
      const studentRecords = interviewRecords.filter(r => r.studentId === selectedSid);
      
      const result = await generateInterviewMaterial(
        student.name, student.grade, studentReports, studentMocks, 
        adminConfig.location, student.targetSchool, student.targetFaculty,
        studentRecords
      );
      setMaterial(result);
    } catch (e) {
      alert("面談資料の生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const inputStyle = "w-full px-6 py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none font-bold transition-all shadow-sm appearance-none";

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">面談資料AI統合生成</h2>
        <p className="text-slate-500 font-medium">生徒の成績と指導履歴を統合解析し、プロフェッショナルな面談を支援します</p>
      </header>

      {/* 入力エリアのクリーン化 */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl flex flex-col md:flex-row items-end gap-6">
        <div className="flex-1 w-full relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3 block">対象生徒を選択</label>
          <div className="relative group">
            <select value={selectedSid} onChange={e => setSelectedSid(e.target.value)} className={inputStyle} disabled={!canGenerate}>
              <option value="">生徒名を選択</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600">▼</div>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={isGenerating || !selectedSid || !canGenerate} className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-3">
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              生成中...
            </>
          ) : (
            <>面談資料をAI生成 ✨</>
          )}
        </button>
      </div>

      {!canGenerate && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shrink-0">⚠️</div>
          <div>
            <p className="font-black text-amber-900">権限がありません</p>
            <p className="text-xs font-bold text-amber-700">「面談資料作成（高度な分析）」の使用権限が付与されていません。管理者に確認してください。</p>
          </div>
        </div>
      )}

      {material ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slideUp">
           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl space-y-10">
             <section>
                <h4 className="text-[11px] font-black text-emerald-600 mb-5 flex items-center gap-3 tracking-widest uppercase">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">📈</span>
                  成長点と強み
                </h4>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                   <p className="text-slate-800 font-bold leading-relaxed">{material.growthPoints}</p>
                </div>
             </section>
             
             <section>
                <h4 className="text-[11px] font-black text-rose-500 mb-5 flex items-center gap-3 tracking-widest uppercase">
                  <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-lg">⚠️</span>
                  現在の課題
                </h4>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                   <p className="text-slate-800 font-bold leading-relaxed">{material.challenges}</p>
                </div>
             </section>

             <section className="bg-indigo-600 p-8 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                <h4 className="text-xs font-black text-indigo-200 mb-4 flex items-center gap-2 uppercase tracking-widest">🏠 保護者様への具体的アドバイス</h4>
                <p className="text-white font-bold italic leading-relaxed text-lg drop-shadow-sm">「{material.parentAdvice}」</p>
             </section>
           </div>

           <div className="space-y-8">
             {/* 黒網掛け（bg-slate-900）を廃止し、クリアなインディゴテーマへ */}
             <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-4 border-indigo-50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
               <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-8 border-b border-indigo-50 pb-4 flex justify-between items-center">
                 受験戦略・推奨校
                 <div className="flex gap-2">
                   <button 
                     onClick={handleSaveToCloud} 
                     disabled={isSaving}
                     className="px-4 py-2 bg-emerald-600 text-white text-[10px] rounded-xl hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
                   >
                     {isSaving ? '保存中...' : '☁️ クラウド上に保存'}
                   </button>
                   <span className="text-[10px] text-slate-400 font-bold tracking-normal italic">Powered by Data Analysis</span>
                 </div>
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                 <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>公立 / 第一志望・安全
                   </p>
                   <div className="space-y-2">
                     <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                       <p className="text-[9px] font-black text-indigo-400 mb-0.5">CHALLENGE</p>
                       <p className="font-black text-indigo-900">{material.suggestedSchools.public.challenge.join(' / ')}</p>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 mb-0.5">REALISTIC</p>
                       <p className="font-black text-slate-800">{material.suggestedSchools.public.realistic.join(' / ')}</p>
                     </div>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>私立 / 併願・滑り止め
                   </p>
                   <div className="space-y-2">
                     <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                       <p className="text-[9px] font-black text-amber-500 mb-0.5">CHALLENGE</p>
                       <p className="font-black text-amber-900">{material.suggestedSchools.private.challenge.join(' / ')}</p>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 mb-0.5">STABLE</p>
                       <p className="font-black text-slate-800">{material.suggestedSchools.private.solid.join(' / ')}</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl">
                <h4 className="text-sm font-black text-slate-800 mb-8 border-b border-slate-50 pb-4">推奨学習時間 (週間合計: <span className="text-indigo-600 text-xl">{material.requiredStudyHours.totalWeekly}h</span>)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {material.requiredStudyHours.subjectBreakdown.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-300 transition-all">
                      <span className="font-black text-slate-700 text-sm">{s.subject}</span>
                      <span className="font-black text-indigo-600 text-lg group-hover:scale-110 transition-transform">{s.hours}<span className="text-xs ml-1">時間</span></span>
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-[11px] font-bold text-slate-400 leading-relaxed italic text-center">※ AI分析に基づき、現在の実力と志望校のギャップから算出しています</p>
             </div>
           </div>
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3.5rem] border border-dashed border-slate-200 text-slate-300 shadow-sm animate-fadeIn">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mb-8 grayscale opacity-20">📊</div>
          <p className="text-2xl font-black text-slate-400 mb-2">生徒を選択して解析を開始してください</p>
          <p className="text-sm font-bold text-slate-300">模試データと指導報告書から面談シナリオを自動生成します</p>
        </div>
      )}
    </div>
  );
};
