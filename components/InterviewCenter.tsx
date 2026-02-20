import React, { useState, useMemo } from 'react';
import { Student, Report, MockExam, AdminConfig } from '../types';
import { generateInterviewMaterial } from '../services/geminiService';
import { getLocalISOString, parseSafeDate } from '../utils';

interface InterviewCenterProps {
  students: Student[];
  reports: Report[];
  mockExams: MockExam[];
  adminConfig: AdminConfig;
}

export const InterviewCenter: React.FC<InterviewCenterProps> = ({ students, reports, mockExams, adminConfig }) => {
  const [selectedSid, setSelectedSid] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [material, setMaterial] = useState<any>(null);

  const handleGenerate = async () => {
    if (!selectedSid) return;
    setIsGenerating(true);
    try {
      const student = students.find(s => s.id === selectedSid)!;
      const studentReports = reports.filter(r => r.studentId === selectedSid).slice(0, 5);
      const studentMocks = mockExams.filter(m => m.studentId === selectedSid);
      
      const result = await generateInterviewMaterial(
        student.name, student.grade, studentReports, studentMocks, 
        adminConfig.location, student.targetSchool, student.targetFaculty
      );
      setMaterial(result);
    } catch (e) {
      alert("面談資料の生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-black text-slate-800">面談資料AI生成</h2>
        <p className="text-slate-500 font-medium">生徒の成績と指導履歴を統合解析し、三者面談用のプロフェッショナルな資料を作成します</p>
      </header>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">対象生徒を選択</label>
          <select value={selectedSid} onChange={e => setSelectedSid(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold">
            <option value="">生徒を選択</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={isGenerating || !selectedSid} className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-200">
          {isGenerating ? "生成中..." : "面談資料をAI生成 ✨"}
        </button>
      </div>

      {material && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slideUp">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 space-y-8">
             <section>
                <h4 className="text-sm font-black text-emerald-500 mb-4 flex items-center gap-2"><span>📈</span> 成長点と強み</h4>
                <p className="text-slate-700 font-bold leading-relaxed">{material.growthPoints}</p>
             </section>
             <section>
                <h4 className="text-sm font-black text-rose-500 mb-4 flex items-center gap-2"><span>⚠️</span> 現在の課題</h4>
                <p className="text-slate-700 font-bold leading-relaxed">{material.challenges}</p>
             </section>
             <section className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                <h4 className="text-sm font-black text-indigo-600 mb-4">🏠 保護者様への具体的アドバイス</h4>
                <p className="text-slate-800 font-bold italic leading-relaxed">「{material.parentAdvice}」</p>
             </section>
           </div>

           <div className="space-y-8">
             <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
               <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-6">受験戦略・推奨校</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                 <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">公立 / 挑戦・安全</p>
                   <p className="font-bold text-indigo-100">挑戦: {material.suggestedSchools.public.challenge.join(', ')}</p>
                   <p className="font-bold text-indigo-300">適正: {material.suggestedSchools.public.realistic.join(', ')}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">私立 / 併願</p>
                   <p className="font-bold text-indigo-100">挑戦: {material.suggestedSchools.private.challenge.join(', ')}</p>
                   <p className="font-bold text-indigo-300">滑止: {material.suggestedSchools.private.solid.join(', ')}</p>
                 </div>
               </div>
             </div>

             <div className="bg-white p-8 rounded-[3rem] border border-slate-100">
                <h4 className="text-sm font-black text-slate-800 mb-4">推奨学習時間 (週間合計: {material.requiredStudyHours.totalWeekly}h)</h4>
                <div className="space-y-3">
                  {material.requiredStudyHours.subjectBreakdown.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                      <span className="font-black text-slate-700">{s.subject}</span>
                      <span className="font-black text-indigo-600">{s.hours}時間</span>
                    </div>
                  ))}
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
