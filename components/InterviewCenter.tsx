
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Report, MockExam, AdminConfig } from '../types';
import { generateInterviewMaterial } from '../services/geminiService';
import { getLocalISOString, parseSafeDate } from '../App';

interface InterviewCenterProps {
  students: Student[];
  reports: Report[];
  mockExams: MockExam[];
  adminConfig: AdminConfig;
}

const InterviewCenter: React.FC<InterviewCenterProps> = ({ students, reports, mockExams, adminConfig }) => {
  const todayLocal = getLocalISOString();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [startDate, setStartDate] = useState(threeMonthsAgoStr);
  const [endDate, setEndDate] = useState(todayLocal);
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewData, setInterviewData] = useState<any | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const loadingMessages = [
    "直近の指導記録を分析中...",
    "成績推移をデータ化しています...",
    "志望校との適合性を計算中...",
    "地域特性を踏まえた戦略を構築中...",
    "合格へのロードマップを作成しています..."
  ];

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  
  const filteredReports = useMemo(() => {
    if (!selectedStudentId) return [];
    const dStart = parseSafeDate(startDate);
    const dEnd = parseSafeDate(endDate);
    return reports.filter(r => {
      const dR = parseSafeDate(r.date);
      return r.studentId === selectedStudentId && dR >= dStart && dR <= dEnd;
    });
  }, [selectedStudentId, reports, startDate, endDate]);

  const filteredExams = useMemo(() => {
    if (!selectedStudentId) return [];
    return mockExams.filter(e => e.studentId === selectedStudentId);
  }, [selectedStudentId, mockExams]);

  const handleGenerate = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);
    setInterviewData(null);
    try {
      const result = await generateInterviewMaterial(
        selectedStudent.name,
        selectedStudent.grade,
        filteredReports,
        filteredExams,
        adminConfig.location,
        selectedStudent.targetSchool,
        selectedStudent.targetFaculty
      );
      setInterviewData(result);
    } catch (error) {
      alert("資料の生成に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    return dateStr.replace(/-/g, '/');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">面談戦略資料作成</h2>
        <p className="text-slate-500 font-medium">AIが多角的なデータから合格への最短経路を算出します</p>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        <div className="md:col-span-5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">分析対象生徒</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-indigo-500 transition-all text-slate-700 bg-slate-50/30"
          >
            <option value="">生徒を選択</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
          </select>
        </div>
        
        <div className="md:col-span-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">分析期間</label>
          <div className="flex items-center bg-slate-50/30 border-2 border-slate-100 rounded-2xl overflow-hidden">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="flex-1 bg-transparent px-3 py-3.5 font-bold outline-none text-xs text-slate-600 focus:bg-white transition-colors" 
            />
            <span className="text-slate-300 font-black px-1">〜</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="flex-1 bg-transparent px-3 py-3.5 font-bold outline-none text-xs text-slate-600 focus:bg-white transition-colors" 
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedStudentId}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${isGenerating || !selectedStudentId ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'}`}
          >
            {isGenerating ? "分析中..." : "✨ 戦略資料を生成"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-black text-slate-400 px-4">
        <span>分析期間：</span>
        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{formatDateDisplay(startDate)}</span>
        <span className="mx-1">〜</span>
        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{formatDateDisplay(endDate)}</span>
      </div>

      {isGenerating && (
        <div className="py-24 flex flex-col items-center justify-center animate-fadeIn bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
          <p className="text-xl font-black text-slate-800">{loadingMessages[loadingMsgIndex]}</p>
          <p className="text-xs text-slate-400 mt-2 font-bold tracking-widest uppercase">Analyzing Instruction Data...</p>
        </div>
      )}

      {interviewData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slideUp">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/20"></div>
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">📈</span>
                学習分析レポート
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    成長ポイント
                  </h4>
                  <p className="text-slate-700 font-bold leading-relaxed bg-emerald-50/30 p-6 rounded-2xl italic border border-emerald-100 text-[14px]">「{interviewData.growthPoints}」</p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    現在の課題
                  </h4>
                  <p className="text-slate-700 font-bold leading-relaxed bg-rose-50/30 p-6 rounded-2xl italic border border-rose-100 text-[14px]">「{interviewData.challenges}」</p>
                </div>
              </div>
              <div className="mt-10 pt-10 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">今後の強化戦略</h4>
                <p className="text-slate-800 font-bold text-[16px] leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-200">{interviewData.futureStrategy}</p>
              </div>
            </section>

            <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500/20"></div>
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">🏫</span>
                地域密着型・志望校提案
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">公立校ターゲット</h4>
                    <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-tighter">Public School</span>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border-2 border-rose-50 hover:border-rose-100 transition-colors shadow-sm">
                      <p className="text-[10px] font-black text-rose-500 mb-1 uppercase tracking-widest">挑戦校 (Challenge)</p>
                      <p className="text-[16px] font-black text-slate-800 leading-tight">{interviewData.suggestedSchools.public.challenge.join('、')}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border-2 border-emerald-50 hover:border-emerald-100 transition-colors shadow-sm">
                      <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-widest">相応校 (Realistic)</p>
                      <p className="text-[16px] font-black text-slate-800 leading-tight">{interviewData.suggestedSchools.public.realistic.join('、')}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">私立校ターゲット</h4>
                    <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-tighter">Private School</span>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border-2 border-rose-50 hover:border-rose-100 transition-colors shadow-sm">
                      <p className="text-[10px] font-black text-rose-500 mb-1 uppercase tracking-widest">挑戦校 (Challenge)</p>
                      <p className="text-[16px] font-black text-slate-800 leading-tight">{interviewData.suggestedSchools.private.challenge.join('、')}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border-2 border-emerald-50 hover:border-emerald-100 transition-colors shadow-sm">
                      <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-widest">併願・安全校 (Solid)</p>
                      <p className="text-[16px] font-black text-slate-800 leading-tight">{interviewData.suggestedSchools.private.solid.join('、')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                <span>目標学習時間</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              </h4>
              <div className="text-center mb-8 py-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-indigo-500 mb-1 tracking-widest uppercase">Weekly Total</p>
                <p className="text-5xl font-black text-slate-900 tracking-tighter">{interviewData.requiredStudyHours.totalWeekly} <span className="text-xl font-bold opacity-30">h</span></p>
              </div>
              <div className="space-y-3">
                {interviewData.requiredStudyHours.subjectBreakdown.map((s: any, i: number) => (
                  <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center border border-slate-100 hover:border-indigo-400 transition-all shadow-sm group">
                    <div className="min-w-0">
                      <p className="text-[14px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{s.subject}</p>
                      <p className="text-[9px] text-slate-400 font-bold leading-tight mt-0.5">{s.priorityReason}</p>
                    </div>
                    <p className="text-xl font-black text-indigo-600 shrink-0 ml-4">{s.hours}<span className="text-[11px] font-bold opacity-40 ml-0.5">h</span></p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-amber-400/10 transition-colors"></div>
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-base">💡</span>
                保護者様へのアドバイス
              </h4>
              <p className="text-slate-800 font-bold leading-relaxed italic text-[14px] relative z-10">「{interviewData.parentAdvice}」</p>
            </section>
            
            <button 
              onClick={() => window.print()} 
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[13px] hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest"
            >
              <span>🖨️</span> Print Strategy Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewCenter;
