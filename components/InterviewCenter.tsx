
import React, { useState, useMemo } from 'react';
import { Student, Report, MockExam, AdminConfig } from '../types';
import { generateInterviewMaterial } from '../services/geminiService';

interface InterviewCenterProps {
  students: Student[];
  reports: Report[];
  mockExams: MockExam[];
  adminConfig: AdminConfig;
}

const InterviewCenter: React.FC<InterviewCenterProps> = ({ students, reports, mockExams, adminConfig }) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [startDate, setStartDate] = useState(threeMonthsAgo);
  const [endDate, setEndDate] = useState(today);
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewData, setInterviewData] = useState<any | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  
  const filteredReports = useMemo(() => {
    if (!selectedStudentId) return [];
    return reports.filter(r => 
      r.studentId === selectedStudentId && 
      r.date >= startDate && 
      r.date <= endDate
    );
  }, [selectedStudentId, reports, startDate, endDate]);

  const filteredExams = useMemo(() => {
    if (!selectedStudentId) return [];
    return mockExams.filter(e => e.studentId === selectedStudentId);
  }, [selectedStudentId, mockExams]);

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      alert('生徒を選択してください。');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateInterviewMaterial(
        selectedStudent?.name || '',
        selectedStudent?.grade || '',
        filteredReports,
        filteredExams,
        adminConfig.location,
        selectedStudent?.targetSchool,
        selectedStudent?.targetFaculty
      );
      setInterviewData(result);
    } catch (error) {
      alert('面談資料の生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const SchoolList = ({ title, schools = [], colorClass }: { title: string, schools?: string[], colorClass: string }) => (
    <div className="space-y-2">
      <h6 className={`text-[10px] font-black uppercase tracking-widest ${colorClass} mb-2`}>{title}</h6>
      <ul className="space-y-1">
        {schools && schools.length > 0 ? (
          schools.map((school, i) => (
            <li key={i} className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${colorClass.replace('text-', 'bg-')}`}></span>
              {school}
            </li>
          ))
        ) : (
          <li className="text-xs text-slate-300 italic">候補なし</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">面談資料作成</h2>
          <p className="text-slate-500 font-medium">瓦版・模試データ・地域情報をAIが統合解析し、戦略的な面談シートを構築します</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">分析対象瓦版</p>
            <p className="text-xl font-black text-slate-800">{filteredReports.length} <span className="text-xs font-normal text-slate-400">件</span></p>
          </div>
          <div className="text-right border-l border-slate-200 pl-6">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">参照模試数</p>
            <p className="text-xl font-black text-slate-800">{filteredExams.length} <span className="text-xs font-normal text-slate-400">件</span></p>
          </div>
        </div>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-5">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">対象生徒を選択</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setInterviewData(null);
              }}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-lg font-bold transition-all"
            >
              <option value="">生徒を選択してください</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">参照開始日</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <span className="text-slate-300 mt-6">〜</span>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">参照終了日</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedStudentId}
              className={`w-full h-[62px] rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-3 ${
                isGenerating || !selectedStudentId 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  高度解析中...
                </span>
              ) : '✨ 戦略シートを構築'}
            </button>
          </div>
        </div>
      </div>

      {!interviewData ? (
        <div className="py-32 flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 text-slate-300">
          <span className="text-8xl mb-6 grayscale opacity-20">📊</span>
          <p className="text-xl font-bold">生徒を選択して戦略分析を開始してください</p>
          <p className="text-sm mt-2 font-medium">模試データと指導記録から「合格への最短距離」を導き出します</p>
        </div>
      ) : (
        <div className="animate-slideUp max-w-[900px] mx-auto bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden min-h-[1200px] print:shadow-none print:border-none print:m-0 print:rounded-none">
          {/* Interview Sheet Header */}
          <div className="bg-slate-900 text-white p-12 relative overflow-hidden print:bg-slate-800 print:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl print:hidden"></div>
            <p className="text-[10px] font-black tracking-[0.4em] uppercase opacity-50 mb-2">FOR PARENT-TEACHER STRATEGY MEETING / {startDate.replace(/-/g, '/')} - {endDate.replace(/-/g, '/')}</p>
            <h3 className="text-4xl font-black tracking-tighter mb-4 print:text-3xl">
              学習指導面談・志望校戦略資料
            </h3>
            <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">生徒氏名</p>
                <p className="text-xl font-bold">{selectedStudent?.name} 様</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">学年 / 区分</p>
                <p className="text-xl font-bold">{selectedStudent?.grade}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">志望校・学部系統</p>
                <p className="text-lg font-bold">
                  {selectedStudent?.targetSchool || '未指定'}
                  {selectedStudent?.targetFaculty && <span className="ml-2 text-indigo-300 text-sm">/ {selectedStudent.targetFaculty}</span>}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">作成元所在地</p>
                <p className="text-lg font-bold text-indigo-200">{adminConfig.location}</p>
              </div>
            </div>
          </div>

          <div className="p-12 space-y-12 print:p-8 print:space-y-10">
            {/* Analysis Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 print:gap-8">
              <section className="space-y-4">
                <h4 className="text-xs font-black text-indigo-600 flex items-center gap-3 uppercase tracking-[0.2em] border-b border-indigo-50 pb-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-lg print:hidden">🌟</span>
                  本期間の成長と評価
                </h4>
                <p className="text-[15px] md:text-base text-slate-800 leading-relaxed font-bold italic pl-4 border-l-4 border-indigo-200">
                  「{interviewData.growthPoints}」
                </p>
              </section>

              <section className="space-y-4">
                <h4 className="text-xs font-black text-rose-600 flex items-center gap-3 uppercase tracking-[0.2em] border-b border-rose-50 pb-2">
                  <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-lg print:hidden">🎯</span>
                  現在の課題と壁
                </h4>
                <p className="text-[15px] md:text-base text-slate-800 leading-relaxed font-medium">
                  {interviewData.challenges}
                </p>
              </section>
            </div>

            {/* NEW: Required Study Hours Strategy */}
            <section className="bg-indigo-50 p-10 rounded-[3rem] border border-indigo-100 shadow-sm print:p-6 print:rounded-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-indigo-200">⏱️</div>
                <div>
                  <h4 className="text-xl font-black text-slate-800">合格への逆算：学習時間戦略</h4>
                  <p className="text-xs font-medium text-slate-400 tracking-wider">
                    {selectedStudent?.targetSchool ? `「${selectedStudent.targetSchool}」合格に必要な自習時間目安` : '志望校合格に向けた目標学習量'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 bg-white p-8 rounded-[2rem] border border-indigo-50 flex flex-col items-center justify-center text-center shadow-sm">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">週間目標 自習合計</p>
                  <p className="text-5xl font-black text-indigo-600 mb-2">
                    {interviewData.requiredStudyHours?.totalWeekly || '--'}
                    <span className="text-base font-normal text-slate-400 ml-1">h</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 leading-tight">
                    ※学校の授業を除いた<br/>家庭・塾での必要時間
                  </p>
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white/50 p-4 rounded-xl border border-white/50">
                    <span className="text-indigo-500 font-black mr-2">【分析の根拠】</span>
                    {interviewData.requiredStudyHours?.analysis}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {interviewData.requiredStudyHours?.subjectBreakdown?.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 mb-1">{item.subject}</p>
                        <p className="text-lg font-black text-slate-800 mb-1">{item.hours}<span className="text-[10px] font-normal ml-0.5">h / 週</span></p>
                        <p className="text-[9px] text-indigo-500 font-bold leading-tight">{item.priorityReason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* School Suggestions Section */}
            <section className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner print:p-6 print:rounded-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-200">🏫</div>
                <div>
                  <h4 className="text-xl font-black text-slate-800">志望校提案プラン</h4>
                  <p className="text-xs font-medium text-slate-400 tracking-wider">
                    {selectedStudent?.targetSchool ? `「${selectedStudent.targetSchool}」を軸とした最適校リスト` : '模試偏差値と所在地を考慮した最適校リスト'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Public Schools */}
                <div className="space-y-6">
                  <h5 className="text-sm font-black text-indigo-600 border-l-4 border-indigo-600 pl-3">国公立 (国立・公立)</h5>
                  <div className="space-y-6">
                    <SchoolList title="チャレンジ校" schools={interviewData.suggestedSchools?.public?.challenge || []} colorClass="text-rose-500" />
                    <SchoolList title="実力相応校" schools={interviewData.suggestedSchools?.public?.realistic || []} colorClass="text-indigo-500" />
                    <SchoolList title="堅実校" schools={interviewData.suggestedSchools?.public?.solid || []} colorClass="text-emerald-500" />
                  </div>
                </div>

                {/* Private Schools */}
                <div className="space-y-6">
                  <h5 className="text-sm font-black text-amber-600 border-l-4 border-amber-600 pl-3">私立学校</h5>
                  <div className="space-y-6">
                    <SchoolList title="チャレンジ校" schools={interviewData.suggestedSchools?.private?.challenge || []} colorClass="text-rose-500" />
                    <SchoolList title="実力相応校" schools={interviewData.suggestedSchools?.private?.realistic || []} colorClass="text-indigo-500" />
                    <SchoolList title="堅実校" schools={interviewData.suggestedSchools?.private?.solid || []} colorClass="text-emerald-500" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-indigo-950 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden print:bg-white print:text-slate-900 print:border print:border-slate-200 print:shadow-none">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl -mr-32 -mt-32 print:hidden"></div>
              <h4 className="text-xl font-black mb-6 flex items-center gap-4 print:text-lg print:mb-4">
                <span className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl print:hidden">🚀</span>
                合格への最短ルート
              </h4>
              <p className="text-[16px] md:text-lg text-indigo-50 leading-loose font-medium bg-white/5 p-8 rounded-[2rem] border border-white/10 print:bg-slate-50 print:text-slate-800 print:border-none print:p-4 print:text-base">
                {interviewData.futureStrategy}
              </p>
            </section>

            <section className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 print:p-6 print:rounded-2xl">
              <h4 className="text-xs font-black text-rose-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span>💬</span> ご家庭でのサポートアドバイス
              </h4>
              <p className="text-[15px] md:text-base text-slate-700 leading-relaxed font-bold italic">
                「{interviewData.parentAdvice}」
              </p>
            </section>

            <div className="pt-10 flex justify-between items-center text-slate-400 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">学士館瓦版 AI戦略エンジン 監修</span>
              </div>
              <div className="flex gap-4 no-print">
                <button 
                  onClick={() => window.print()}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-all shadow-xl hover:bg-slate-800 flex items-center gap-2 active:scale-95"
                >
                  <span>🖨️</span> PDF保存・印刷
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          main { overflow: visible !important; height: auto !important; padding: 0 !important; }
          aside { display: none !important; }
          .max-w-6xl { max-width: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default InterviewCenter;
