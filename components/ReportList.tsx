
import React, { useState, useEffect } from 'react';
import { Report, Student, UserRole } from '../types';

interface ReportListProps {
  reports: Report[];
  students: Student[];
  currentUser: { role: UserRole; id: string; name: string };
  onAddMessage: (reportId: string, text: string) => void;
  onMarkResolved: (reportId: string) => void;
  onUpdateReport?: (reportId: string, updates: Partial<Report>) => void;
  title?: string;
  hideHeader?: boolean;
}

const ReportList: React.FC<ReportListProps> = ({ reports, students, currentUser, onAddMessage, onMarkResolved, onUpdateReport, title = "指導報告書一覧", hideHeader = false }) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editBuffer, setEditBuffer] = useState<Report | null>(null);

  const selectedReport = reports.find(r => r.id === selectedReportId);
  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || '不明';
  const isPrivileged = currentUser.role === 'instructor' || currentUser.role === 'admin';

  useEffect(() => {
    if (selectedReport) setEditBuffer(JSON.parse(JSON.stringify(selectedReport)));
    else { setEditBuffer(null); setIsEditingContent(false); }
  }, [selectedReport]);

  const handleUpdateBuffer = (field: string, value: any, isNested: boolean = false) => {
    if (!editBuffer) return;
    if (isNested) setEditBuffer({ ...editBuffer, generatedContent: { ...editBuffer.generatedContent, [field]: value } });
    else setEditBuffer({ ...editBuffer, [field]: value });
  };

  const saveReportEdits = () => {
    if (editBuffer && onUpdateReport) { onUpdateReport(editBuffer.id, editBuffer); setIsEditingContent(false); }
  };

  const renderWeeklyPlanTimeline = (text: string) => {
    if (!text) return null;
    
    // 改行で分割し、空行を除外
    let lines = text.replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 1日目から7日目までのデータを作成
    const dailySteps = Array.from({ length: 7 }, (_, i) => {
      const dayLabel = `${i + 1}日目`;
      // AIの出力から該当する日の行を探す
      const foundLine = lines.find(l => l.includes(dayLabel));
      
      let content = "復習または予習に取り組みましょう。";
      if (foundLine) {
        content = foundLine.replace(new RegExp(`^${dayLabel}[:：\\s]*`), "").trim();
        if (!content) content = foundLine; // ラベルだけの場合はそのまま表示
      }

      return { label: dayLabel, content };
    });

    return (
      <div className="flex flex-col space-y-0">
        {dailySteps.map((step, idx) => (
          <div key={idx} className="relative pl-8 pb-8 last:pb-2 group">
            {/* Vertical Line */}
            <div className="absolute left-0 top-2 bottom-0 w-px bg-indigo-500/20 group-last:hidden"></div>
            {/* Dot */}
            <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
            
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-4">
              <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap mb-1 md:mb-0">
                {step.label}
              </span>
              <span className="text-[14px] font-bold text-indigo-50 leading-relaxed group-hover:text-white transition-colors">
                {step.content}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      {!hideHeader && (
        <header>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-slate-500 font-semibold mt-1">過去の指導記録を確認できます</p>
        </header>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.length === 0 ? <p className="col-span-full py-20 text-center text-slate-400 font-black">報告書がありません</p> : 
          reports.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((report) => (
            <div key={report.id} onClick={() => setSelectedReportId(report.id)} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer group">
              <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full uppercase mb-4 inline-block">{report.subject}</span>
              <p className="text-[11px] text-slate-400 font-black uppercase mb-1">{report.sessionYear} / {report.sessionMonth}</p>
              <h3 className="text-2xl font-black text-slate-900 mb-4">{getStudentName(report.studentId)} さん</h3>
              <p className="text-[14px] text-slate-600 line-clamp-2 italic">「{report.generatedContent.messageToParents}」</p>
            </div>
          ))}
      </div>

      {selectedReport && editBuffer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex justify-center items-center p-4 animate-fadeIn">
          <div className="bg-white w-full h-full max-h-[92vh] max-w-[840px] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-white/20">
            <div className={`shrink-0 ${isEditingContent ? 'bg-amber-600' : 'bg-[#0f172a]'} text-white px-10 py-10 flex justify-between items-center transition-colors`}>
              <div>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedReport.date}</span>
                <h3 className="text-3xl font-black tracking-tighter">{getStudentName(selectedReport.studentId)} 指導報告書</h3>
              </div>
              <div className="flex gap-3">
                {isPrivileged && !isEditingContent && <button onClick={() => setIsEditingContent(true)} className="bg-white/10 px-6 py-3 rounded-2xl text-xs font-black hover:bg-white/20">✎ 編集</button>}
                {isEditingContent && <button onClick={saveReportEdits} className="bg-white text-amber-700 px-6 py-3 rounded-2xl text-xs font-black shadow-lg">💾 保存</button>}
                <button onClick={() => setSelectedReportId(null)} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl">✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50/40 p-10 space-y-10 custom-scrollbar">
              <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                <h4 className="text-[11px] font-black text-slate-400 mb-6 uppercase tracking-widest opacity-60">指導の概略</h4>
                {isEditingContent ? <textarea value={editBuffer.generatedContent.lessonSummary} onChange={(e) => handleUpdateBuffer('lessonSummary', e.target.value, true)} className="w-full min-h-[140px] text-sm leading-relaxed p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-400 font-bold" /> : 
                <p className="text-slate-800 leading-relaxed font-bold text-[15px] italic whitespace-pre-wrap">「{selectedReport.generatedContent.lessonSummary}」</p>}
              </section>

              <section className="bg-indigo-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h4 className="text-base font-black text-white mb-8 flex items-center gap-4">
                   <span className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl">📅</span> 
                   週間学習計画 (日割り)
                </h4>
                <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 backdrop-blur-md">
                  {isEditingContent ? <textarea value={editBuffer.generatedContent.weeklyPlan} onChange={(e) => handleUpdateBuffer('weeklyPlan', e.target.value, true)} className="w-full min-h-[240px] text-sm leading-relaxed font-bold bg-transparent border-none outline-none text-indigo-50" /> : 
                  <div className="flex flex-col">{renderWeeklyPlanTimeline(selectedReport.generatedContent.weeklyPlan)}</div>}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">今回の宿題</h4>
                  <p className="text-lg font-black text-slate-800">{selectedReport.homeworkAssigned}</p>
                </section>
                <section className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase mb-2">講師からのメッセージ</h4>
                  <p className="text-[14px] font-bold text-slate-700 italic">「{selectedReport.generatedContent.messageToParents}」</p>
                </section>
              </div>

              <button onClick={() => setSelectedReportId(null)} className="w-full py-5 bg-slate-900 text-white rounded-full font-black text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-2xl tracking-[0.2em] uppercase">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportList;
