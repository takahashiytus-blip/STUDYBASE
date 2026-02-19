
import React, { useState, useEffect, useMemo } from 'react';
import { Report, Student, UserRole, ReportMessage, AttendanceStatus } from '../types';
import { parseSafeDate } from '../App';

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
  showFilters?: boolean; // フィルタ機能を表示するかどうか
}

const ReportList: React.FC<ReportListProps> = ({ 
  reports, 
  students, 
  currentUser, 
  onAddMessage, 
  onDeleteMessage, 
  onMarkResolved, 
  onUpdateReport, 
  title = "指導報告書一覧", 
  hideHeader = false,
  showFilters = true 
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editBuffer, setEditBuffer] = useState<Report | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // フィルタリング用のステート
  const [filterMonth, setFilterMonth] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || '不明';
  const isPrivileged = currentUser.role === 'instructor' || currentUser.role === 'admin';

  // 存在する「年月」の選択肢をデータから自動抽出
  const availableMonths = useMemo(() => {
    const relevantReports = (currentUser.role === 'admin' || currentUser.role === 'instructor')
      ? reports
      : reports.filter(r => r.studentId === currentUser.id);

    const months = relevantReports.map(r => r.date.substring(0, 7)); // "YYYY-MM"
    return Array.from(new Set(months)).sort((a, b) => b.localeCompare(a));
  }, [reports, currentUser]);

  // 存在する「科目」の選択肢をデータから自動抽出
  const availableSubjects = useMemo(() => {
    const relevantReports = (currentUser.role === 'admin' || currentUser.role === 'instructor')
      ? reports
      : reports.filter(r => r.studentId === currentUser.id);

    const subjects = relevantReports.map(r => r.subject);
    return Array.from(new Set(subjects)).sort();
  }, [reports, currentUser]);

  const isFilterApplied = filterMonth !== '' || filterSubject !== '';

  const displayReports = useMemo(() => {
    // フィルタ機能が無効な場合は全件表示、有効な場合はフィルタ条件に従う
    if (showFilters && !isFilterApplied) return [];

    let filtered = (currentUser.role === 'admin' || currentUser.role === 'instructor')
      ? reports
      : reports.filter(r => r.studentId === currentUser.id);
    
    if (showFilters) {
      if (filterMonth) filtered = filtered.filter(r => r.date.startsWith(filterMonth));
      if (filterSubject) filtered = filtered.filter(r => r.subject === filterSubject);
    }
    
    return [...filtered].sort((a, b) => {
      const timeA = parseSafeDate(a.date).getTime();
      const timeB = parseSafeDate(b.date).getTime();
      return timeB - timeA;
    });
  }, [reports, currentUser, filterMonth, filterSubject, isFilterApplied, showFilters]);

  const selectedReport = useMemo(() => reports.find(r => r.id === selectedReportId), [reports, selectedReportId]);

  useEffect(() => {
    if (selectedReport) {
      setEditBuffer(JSON.parse(JSON.stringify(selectedReport)));
      document.body.style.overflow = 'hidden';
    } else {
      setEditBuffer(null);
      setIsEditingContent(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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

  const formatYearMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${y}年${parseInt(m)}月`;
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn">
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
            {showFilters && <p className="text-slate-500 font-semibold mt-1">年月または科目を選択して表示してください</p>}
          </div>
        </header>
      )}

      {/* 検索・フィルターパネル - showFilters が true の場合のみ表示 */}
      {showFilters && (
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">作成年月</label>
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold text-sm transition-all"
              >
                <option value="">月を選択</option>
                {availableMonths.map(ym => <option key={ym} value={ym}>{formatYearMonth(ym)}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">科目</label>
              <select 
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold text-sm transition-all"
              >
                <option value="">全ての科目</option>
                {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          </div>
          {isFilterApplied && (
            <div className="flex justify-between items-center px-2">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                表示中: {displayReports.length} 件
              </p>
              <button 
                onClick={() => { setFilterMonth(''); setFilterSubject(''); }}
                className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
              >
                条件リセット ✕
              </button>
            </div>
          )}
        </div>
      )}

      {showFilters && !isFilterApplied ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-400 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-30">📅</div>
          <p className="text-xl font-bold text-slate-600 mb-2">条件を選択してください</p>
          <p className="text-sm">年月または科目を選択すると、報告書が表示されます。</p>
        </div>
      ) : displayReports.length === 0 ? (
        <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-400">
          <span className="text-5xl block mb-4 grayscale opacity-20">📂</span>
          <p className="text-lg font-black">条件に合う報告書がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayReports.map((report) => (
            <div key={report.id} onClick={() => setSelectedReportId(report.id)} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col min-h-[220px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{report.subject}</span>
                <div className="flex items-center">
                  {getAttendanceBadge(report.attendanceStatus)}
                  {getHomeworkBadge(report.homeworkCompletion)}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-black uppercase mb-1">{report.date.replace(/-/g, ' / ')}</p>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{getStudentName(report.studentId)} さん</h3>
              <p className="text-[14px] text-slate-600 line-clamp-2 italic font-medium">「{report.generatedContent.messageToParents}」</p>
              
              <div className="mt-auto pt-4 flex justify-between items-end">
                {report.needsAction ? (
                  <span className="text-[9px] font-black bg-rose-500 text-white px-3 py-1 rounded-full animate-pulse">未返信あり</span>
                ) : <div />}
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <span className="text-sm">👨‍🏫</span>
                  <span className="text-[10px] font-black text-slate-500 truncate max-w-[80px]">{report.instructorName} 講師</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && editBuffer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex justify-center items-center p-2 md:p-4 overscroll-none">
          <div className="bg-white w-full h-full max-h-[96vh] md:max-h-[92vh] max-w-[840px] rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-white/5 overscroll-contain">
            <div className={`shrink-0 ${isEditingContent ? 'bg-amber-600' : 'bg-[#0f172a]'} text-white px-6 py-6 md:px-10 md:py-10 flex justify-between items-center transition-colors border-b border-white/5`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-100">{selectedReport.date}</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-lg border border-white/10">
                    <span className="text-xs">👨‍🏫</span>
                    <span className="text-[10px] font-black text-indigo-50">{selectedReport.instructorName} 講師</span>
                  </div>
                  {getAttendanceBadge(selectedReport.attendanceStatus)}
                  {getHomeworkBadge(selectedReport.homeworkCompletion)}
                </div>
                <h3 className="text-xl md:text-3xl font-black tracking-tighter truncate mt-2 drop-shadow-md">{getStudentName(selectedReport.studentId)} 指導報告書</h3>
              </div>
              <div className="flex gap-2 md:gap-3 shrink-0 ml-4">
                {isPrivileged && !isEditingContent && <button onClick={() => setIsEditingContent(true)} className="bg-white/10 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black hover:bg-white/20 transition-all border border-white/10 shadow-sm">✎ 編集</button>}
                {isEditingContent && <button onClick={saveReportEdits} className="bg-white text-amber-700 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black shadow-lg hover:bg-amber-50 transition-all">💾 保存</button>}
                <button onClick={() => setSelectedReportId(null)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center text-lg hover:bg-rose-500 transition-all border border-white/10">✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 md:p-10 space-y-6 md:space-y-10 focus:outline-none" style={{ WebkitOverflowScrolling: 'touch' }}>
              <section className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/30"></div>
                <h4 className="text-[11px] font-black text-slate-400 mb-4 md:mb-6 uppercase tracking-widest">指導内容・評価</h4>
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 block mb-1">授業要約</span>
                    {isEditingContent ? <textarea value={editBuffer.generatedContent.lessonSummary} onChange={(e) => handleUpdateBuffer('lessonSummary', e.target.value, true)} className="w-full text-sm p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:bg-white outline-none" /> : 
                    <p className="text-slate-800 leading-relaxed font-bold text-[14px] italic">「{selectedReport.generatedContent.lessonSummary}」</p>}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 block mb-1">生徒の様子</span>
                    <p className="text-slate-700 leading-relaxed font-bold text-[14px]">{selectedReport.generatedContent.studentPerformance}</p>
                  </div>
                </div>
              </section>

              {/* 宿題リストセクション */}
              <section className="bg-indigo-50 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-indigo-100 shadow-sm">
                 <h4 className="text-sm font-black text-indigo-600 mb-6 flex items-center gap-3">
                   <span className="w-8 h-8 rounded-lg bg-white text-indigo-500 flex items-center justify-center text-base shadow-sm">📋</span>
                   今回の宿題タスク (To-Do)
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {selectedReport.generatedContent.homeworkList?.map((task, i) => (
                     <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-indigo-50 group hover:border-indigo-300 transition-all">
                        <div className="w-5 h-5 rounded-md border-2 border-indigo-200 flex-shrink-0"></div>
                        <span className="text-sm font-bold text-slate-700">{task}</span>
                     </div>
                   ))}
                 </div>
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

              {/* 日割りタイムラインセクション */}
              <section className="bg-slate-900 text-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-white/10 relative overflow-hidden">
                <h4 className="text-sm md:text-base font-black mb-8 flex items-center gap-4 relative z-10">
                  <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-100 shadow-sm">📅</span>
                  7日間学習計画 (AI提案)
                </h4>
                <div className="relative z-10 space-y-0">
                  {selectedReport.generatedContent.weeklyPlan?.map((plan, idx) => (
                    <div key={idx} className="relative pl-10 pb-8 last:pb-2 group">
                      <div className="absolute left-[3px] top-2 bottom-0 w-[2px] bg-white/10 group-last:hidden"></div>
                      <div className="absolute left-[-4px] top-2 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-slate-900 shadow-lg"></div>
                      <div className="flex flex-col md:flex-row md:items-baseline md:gap-4">
                        <span className="text-indigo-400 font-black text-[11px] uppercase tracking-widest shrink-0 whitespace-nowrap mb-1 md:mb-0">{plan.day}</span>
                        <div className="bg-white/5 border border-white/5 rounded-xl px-5 py-3 flex-1">
                          <span className="text-[14px] font-bold text-indigo-50 leading-relaxed">{plan.task}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              </section>

              <section className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-500 mb-4 uppercase tracking-widest">今後の課題と学習アドバイス</h4>
                <p className="text-slate-700 text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedReport.generatedContent.nextSteps}</p>
              </section>

              <section className="bg-rose-50 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-rose-100 shadow-inner">
                <h4 className="text-[10px] font-black text-rose-500 mb-4 uppercase tracking-widest">保護者様へのメッセージ</h4>
                <p className="text-slate-800 text-sm md:text-[15px] font-bold italic leading-relaxed">「{selectedReport.generatedContent.messageToParents}」</p>
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
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity border border-rose-100 hover:bg-rose-500 hover:text-white">✕</button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1.5 font-bold tracking-tight">{msg.senderName} • {msg.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="講師・保護者へ相談を入力..." className="flex-1 bg-white border-2 border-slate-100 rounded-xl px-5 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 font-bold shadow-sm transition-all" />
                  <button onClick={handleSendMessage} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700 transition-all active:scale-95">送信</button>
                </div>
              </section>

              <button onClick={() => setSelectedReportId(null)} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-black transition-all shadow-2xl tracking-[0.2em] uppercase active:scale-[0.98] mb-4">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportList;
