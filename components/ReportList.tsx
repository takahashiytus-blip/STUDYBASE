import React, { useState, useEffect, useMemo } from 'react';
import { Report, Student, UserRole, ReportMessage, AttendanceStatus } from '../types';

interface ReportListProps {
  reports: Report[];
  students: Student[];
  currentUser: { role: UserRole; id: string; name: string };
  onAddMessage: (reportId: string, text: string) => void;
  onDeleteMessage: (reportId: string, messageId: string) => void;
  onMarkResolved: (reportId: string) => void;
  onUpdateReport?: (reportId: string, updates: Partial<Report>) => void;
  title?: string;
  hideHeader?: boolean;
}

const ReportList: React.FC<ReportListProps> = ({ reports, students, currentUser, onAddMessage, onDeleteMessage, onMarkResolved, onUpdateReport, title = "指導報告書一覧", hideHeader = false }) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editBuffer, setEditBuffer] = useState<Report | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const displayReports = useMemo(() => {
    if (currentUser.role === 'admin' || currentUser.role === 'instructor') {
      return reports;
    }
    return reports.filter(r => r.studentId === currentUser.id);
  }, [reports, currentUser]);

  const selectedReport = useMemo(() => displayReports.find(r => r.id === selectedReportId), [displayReports, selectedReportId]);
  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || '不明';
  const isPrivileged = currentUser.role === 'instructor' || currentUser.role === 'admin';

  useEffect(() => {
    if (selectedReport) setEditBuffer(JSON.parse(JSON.stringify(selectedReport)));
    else { setEditBuffer(null); setIsEditingContent(false); }
  }, [selectedReport]);

  const handleUpdateBuffer = (field: string, value: any, isNested: boolean = false) => {
    if (!editBuffer) return;
    if (isNested) {
      setEditBuffer({ 
        ...editBuffer, 
        generatedContent: { ...editBuffer.generatedContent, [field]: value } 
      });
    } else {
      setEditBuffer({ ...editBuffer, [field]: value });
    }
  };

  const saveReportEdits = () => {
    if (editBuffer && onUpdateReport) { 
      onUpdateReport(editBuffer.id, editBuffer); 
      setIsEditingContent(false); 
    }
  };

  const handleSendMessage = () => {
    if (!selectedReport || !newMessage.trim()) return;
    onAddMessage(selectedReport.id, newMessage);
    setNewMessage('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedReport) return;
    if (window.confirm('このメッセージを削除しますか？')) {
      onDeleteMessage(selectedReport.id, messageId);
    }
  };

  const getAttendanceBadge = (status?: AttendanceStatus) => {
    switch (status) {
      case 'present': return <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">出席</span>;
      case 'late': return <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">遅刻</span>;
      case 'absent': return <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100">当日欠席</span>;
      default: return null;
    }
  };

  const getHomeworkBadge = (completion?: number) => {
    if (completion === undefined) return null;
    const color = completion === 100 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : completion === 50 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100';
    return <span className={`text-[9px] font-black ${color} px-2 py-0.5 rounded-full border ml-2`}>宿題 {completion}%</span>;
  };

  const weeklyTimeline = useMemo(() => {
    if (!selectedReport?.generatedContent.weeklyPlan) return null;
    
    // AI出力に含まれるエスケープされた改行コードなどをクリーンアップ
    const planText = selectedReport.generatedContent.weeklyPlan
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '');
    
    // 正規表現によるパース: "数字日目" をデリミタとして分割する
    // 例: "1日目：国語 2日目：算数" -> ["1日目：国語", "2日目：算数"]
    const dayRegex = /(\d+日目[:：\s]*)/g;
    const parts = planText.split(dayRegex).filter(p => p.trim().length > 0);
    
    // ラベルと内容を結合し直す
    const combinedLines: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i+1]) {
        combinedLines.push(parts[i] + parts[i+1]);
      } else if (parts[i]) {
        combinedLines.push(parts[i]);
      }
    }

    const steps = Array.from({ length: 7 }, (_, i) => {
      const dayNum = i + 1;
      const label = `${dayNum}日目`;
      
      // combinedLinesから該当する日の内容を探す
      const foundLine = combinedLines.find(line => 
        line.startsWith(`${dayNum}日目`) || line.startsWith(`Day ${dayNum}`)
      );

      let content = "復習を継続しましょう。";
      if (foundLine) {
        // ラベル部分を取り除く
        content = foundLine.replace(/^\d+日目[:：\s]*/, "").replace(/^Day \d+[:：\s]*/, "").trim();
      }

      return { label, content };
    });

    return (
      <div className="flex flex-col space-y-0">
        {steps.map((step, idx) => (
          <div key={idx} className="relative pl-8 pb-8 last:pb-2 group">
            <div className="absolute left-0 top-2 bottom-0 w-px bg-indigo-500/30 group-last:hidden"></div>
            <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-indigo-100 shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-4">
              <span className="text-indigo-200 font-black text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap mb-1 md:mb-0">{step.label}</span>
              <span className="text-[14px] font-bold text-indigo-50 leading-relaxed drop-shadow-sm">{step.content}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [selectedReport]);

  return (
    <div className="space-y-10 animate-fadeIn">
      {!hideHeader && (
        <header>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-slate-500 font-semibold mt-1">日割りの学習計画と自習提案を確認できます</p>
        </header>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayReports.length === 0 ? <p className="col-span-full py-20 text-center text-slate-400 font-black">報告書がありません</p> : 
          displayReports.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((report) => (
            <div key={report.id} onClick={() => setSelectedReportId(report.id)} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{report.subject}</span>
                <div className="flex items-center">
                  {getAttendanceBadge(report.attendanceStatus)}
                  {getHomeworkBadge(report.homeworkCompletion)}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-black uppercase mb-1">{report.sessionYear} / {report.sessionMonth}</p>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{getStudentName(report.studentId)} さん</h3>
              
              {report.proposedSelfStudyDays && report.proposedSelfStudyDays.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-[9px] font-black text-amber-600 mr-1 uppercase">自習提案:</span>
                  {report.proposedSelfStudyDays.map(day => (
                    <span key={day} className="text-[9px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">{day}</span>
                  ))}
                </div>
              )}

              <p className="text-[14px] text-slate-600 line-clamp-2 italic">「{report.generatedContent.messageToParents}」</p>
              {report.needsAction && <span className="mt-4 block w-fit text-[9px] font-black bg-rose-500 text-white px-3 py-1 rounded-full animate-pulse">未返信あり</span>}
            </div>
          ))}
      </div>

      {selectedReport && editBuffer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex justify-center items-center p-2 md:p-4">
          <div className="bg-white w-full h-full max-h-[96vh] md:max-h-[92vh] max-w-[840px] rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-white/5">
            <div className={`shrink-0 ${isEditingContent ? 'bg-amber-600' : 'bg-[#0f172a]'} text-white px-6 py-6 md:px-10 md:py-10 flex justify-between items-center transition-colors border-b border-white/5`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-100">{selectedReport.date}</span>
                  {getAttendanceBadge(selectedReport.attendanceStatus)}
                  {getHomeworkBadge(selectedReport.homeworkCompletion)}
                </div>
                <h3 className="text-xl md:text-3xl font-black tracking-tighter truncate mt-1 drop-shadow-md">{getStudentName(selectedReport.studentId)} 指導報告書</h3>
              </div>
              <div className="flex gap-2 md:gap-3 shrink-0 ml-4">
                {isPrivileged && !isEditingContent && <button onClick={() => setIsEditingContent(true)} className="bg-white/10 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black hover:bg-white/20 transition-all border border-white/10 shadow-sm">✎ 編集</button>}
                {isEditingContent && <button onClick={saveReportEdits} className="bg-white text-amber-700 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black shadow-lg hover:bg-amber-50 transition-all">💾 保存</button>}
                <button onClick={() => setSelectedReportId(null)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center text-lg hover:bg-rose-500 transition-all border border-white/10">✕</button>
              </div>
            </div>
            
            <div 
              className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 md:p-10 space-y-6 md:space-y-10 focus:outline-none"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <section className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/30"></div>
                <h4 className="text-[11px] font-black text-slate-400 mb-4 md:mb-6 uppercase tracking-widest">指導の概略</h4>
                {isEditingContent ? <textarea value={editBuffer.generatedContent.lessonSummary} onChange={(e) => handleUpdateBuffer('lessonSummary', e.target.value, true)} className="w-full min-h-[120px] text-sm leading-relaxed p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-slate-800" /> : 
                <p className="text-slate-800 leading-relaxed font-bold text-[15px] italic">「{selectedReport.generatedContent.lessonSummary}」</p>}
              </section>

              {selectedReport.proposedSelfStudyDays && selectedReport.proposedSelfStudyDays.length > 0 && (
                <section className="bg-amber-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-amber-200 shadow-sm flex items-center gap-6">
                   <div className="w-12 h-12 rounded-2xl bg-white text-amber-500 flex items-center justify-center text-2xl shadow-sm border border-amber-100">🏫</div>
                   <div>
                     <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">講師からの自習来塾提案</h4>
                     <div className="flex gap-2">
                       {selectedReport.proposedSelfStudyDays.map(day => (
                         <span key={day} className="bg-white text-slate-800 font-black px-4 py-1.5 rounded-xl border-2 border-amber-200 text-sm">{day}曜日</span>
                       ))}
                     </div>
                   </div>
                </section>
              )}

              <section className="bg-indigo-950 text-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-white/10 relative overflow-hidden">
                <h4 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-4 relative z-10">
                  <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-100 shadow-sm">📅</span>
                  日割り学習計画 (AI生成)
                </h4>
                <div className="bg-black/20 p-6 md:p-8 rounded-[1rem] md:rounded-[2rem] border border-white/5 backdrop-blur-md relative z-10">
                  {isEditingContent ? <textarea value={editBuffer.generatedContent.weeklyPlan} onChange={(e) => handleUpdateBuffer('weeklyPlan', e.target.value, true)} className="w-full min-h-[280px] text-sm leading-relaxed font-bold bg-black/10 border-2 border-white/5 rounded-2xl p-4 outline-none text-indigo-50 focus:border-indigo-500 transition-all" /> : 
                  weeklyTimeline}
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              </section>

              <section className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-500 mb-4 uppercase tracking-widest">今後の課題と学習アドバイス</h4>
                {isEditingContent ? <textarea value={editBuffer.generatedContent.nextSteps} onChange={(e) => handleUpdateBuffer('nextSteps', e.target.value, true)} className="w-full min-h-[100px] text-sm p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:bg-white transition-all text-slate-800" /> : 
                <p className="text-slate-700 text-sm font-bold leading-relaxed">{selectedReport.generatedContent.nextSteps}</p>}
              </section>

              <section className="bg-rose-50 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-rose-100 shadow-inner">
                <h4 className="text-[10px] font-black text-rose-500 mb-4 uppercase tracking-widest">保護者様へのメッセージ</h4>
                {isEditingContent ? <textarea value={editBuffer.generatedContent.messageToParents} onChange={(e) => handleUpdateBuffer('messageToParents', e.target.value, true)} className="w-full min-h-[100px] text-sm p-5 bg-white border-2 border-rose-100 rounded-2xl font-bold italic text-slate-800 shadow-sm" /> : 
                <p className="text-slate-800 text-sm md:text-[15px] font-bold italic leading-relaxed">「{selectedReport.generatedContent.messageToParents}」</p>}
              </section>

              <section className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">リクエスト・相談</h4>
                   {isPrivileged && selectedReport.needsAction && (
                     <button onClick={() => onMarkResolved(selectedReport.id)} className="text-[10px] font-black bg-emerald-500 text-white px-4 py-1.5 rounded-full shadow-md hover:bg-emerald-600 transition-all">✓ 対応済みにする</button>
                   )}
                </div>
                <div className="space-y-4 mb-6">
                  {selectedReport.messages?.length === 0 ? (
                    <div className="py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                      <p className="text-xs text-slate-400 italic">メッセージはありません</p>
                    </div>
                  ) : (
                    selectedReport.messages?.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                        <div className={`group relative max-w-[85%] p-4 rounded-2xl text-sm font-bold shadow-sm ${msg.senderId === currentUser.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          {msg.text}
                          {msg.senderId === currentUser.id && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                              className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity border border-rose-100 hover:bg-rose-500 hover:text-white"
                              title="メッセージを削除"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1.5 font-bold tracking-tight">{msg.senderName} • {msg.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="講師・保護者へ相談を入力..." 
                    className="flex-1 bg-white border-2 border-slate-100 rounded-xl px-5 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 font-bold shadow-sm transition-all"
                  />
                  <button onClick={handleSendMessage} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all">送信</button>
                </div>
              </section>

              <button onClick={() => setSelectedReportId(null)} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-black transition-all shadow-2xl tracking-[0.2em] uppercase active:scale-[0.98]">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportList;
