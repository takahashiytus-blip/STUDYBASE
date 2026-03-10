import React, { useState, useMemo } from 'react';
import { UserRole, TimetableEntry, GroupLessonLog, Student } from '../types';
import { generateUniqueId, getLocalISOString } from '../utils';

interface GroupLessonCenterProps {
  currentUser: { role: UserRole; id: string; name: string };
  timetable: TimetableEntry[];
  logs: GroupLessonLog[];
  students: Student[];
  onUpdateLogs: (newLogs: GroupLessonLog[], deletedIds?: string[]) => Promise<void>;
}

export const GroupLessonCenter: React.FC<GroupLessonCenterProps> = ({
  currentUser,
  timetable,
  logs,
  students,
  onUpdateLogs,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'archive'>('daily');
  const [selectedDate, setSelectedDate] = useState(getLocalISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(getLocalISOString().substring(0, 7));
  const [editingLog, setEditingLog] = useState<Partial<GroupLessonLog> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'instructor';

  // Filter group lessons from timetable
  const groupLessons = useMemo(() => {
    return timetable.filter(t => t.lessonType === 'group');
  }, [timetable]);

  // Filter logs for the selected date
  const logsForDate = useMemo(() => {
    return logs.filter(l => l.date === selectedDate);
  }, [logs, selectedDate]);

  // For students, filter lessons they are part of
  const studentLessons = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    const filteredByDay = groupLessons.filter(t => t.dayOfWeek === dayOfWeek);
    
    if (isPrivileged) return filteredByDay;
    return filteredByDay.filter(t => (t.studentIds || []).includes(currentUser.id));
  }, [groupLessons, isPrivileged, currentUser.id, selectedDate]);

  const filteredArchive = useMemo(() => {
    return logs
      .filter(log => {
        const lesson = timetable.find(t => t.id === log.timetableId);
        const matchesSearch = 
          log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lesson?.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lesson?.subject?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesMonth = log.date.startsWith(selectedMonth);
        
        if (!isPrivileged) {
          const isMyLesson = lesson && (lesson.studentIds || []).includes(currentUser.id);
          return isMyLesson && matchesSearch && matchesMonth;
        }
        return matchesSearch && matchesMonth;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, timetable, searchQuery, isPrivileged, currentUser.id, selectedMonth]);

  const handleSaveLog = async () => {
    if (!editingLog || !editingLog.timetableId) return;

    const newLog: GroupLessonLog = {
      id: editingLog.id || generateUniqueId('gl'),
      timetableId: editingLog.timetableId,
      date: selectedDate,
      content: editingLog.content || '',
      instructorComments: editingLog.instructorComments || '',
      homework: editingLog.homework || '',
      pdfUrl: editingLog.pdfUrl,
      pdfName: editingLog.pdfName,
    };

    const exists = logs.some(l => l.id === newLog.id);
    const updatedLogs = exists 
      ? logs.map(l => l.id === newLog.id ? newLog : l)
      : [...logs, newLog];

    try {
      await onUpdateLogs(updatedLogs);
      setEditingLog(null);
    } catch (error) {
      console.error('Failed to save group lesson log:', error);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const updatedLogs = logs.filter(l => l.id !== logId);
    try {
      await onUpdateLogs(updatedLogs, [logId]);
      if (editingLog?.id === logId) {
        setEditingLog(null);
      }
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Failed to delete group lesson log:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingLog) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingLog({
          ...editingLog,
          pdfUrl: reader.result as string,
          pdfName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 italic uppercase">
            Group <span className="text-indigo-600">Lessons</span>
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('daily')}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${viewMode === 'daily' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
            >
              デイリー管理
            </button>
            <button 
              onClick={() => setViewMode('archive')}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${viewMode === 'archive' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
            >
              アーカイブ
            </button>
          </div>
        </div>
        
        {viewMode === 'daily' ? (
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-xs font-black text-slate-400 ml-2 uppercase">Date</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-xs font-black text-slate-400 ml-2 uppercase">Month</span>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full md:w-64">
              <span className="text-xs ml-2">🔍</span>
              <input 
                type="text" 
                placeholder="授業名や内容で検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none w-full px-2 py-1 font-bold text-slate-700 outline-none text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {viewMode === 'daily' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lesson List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">授業一覧</h3>
          {studentLessons.length === 0 ? (
            <div className="bg-white p-8 rounded-[2rem] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-bold text-sm italic">対象の授業はありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentLessons.map(lesson => {
                const log = logsForDate.find(l => l.timetableId === lesson.id);
                const isSelected = editingLog?.timetableId === lesson.id;
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      if (log) {
                        setEditingLog(log);
                      } else if (isPrivileged) {
                        setEditingLog({
                          id: generateUniqueId('log'),
                          timetableId: lesson.id,
                          date: selectedDate,
                          content: '',
                          instructorComments: '',
                          homework: ''
                        });
                      }
                    }}
                    className={`w-full text-left p-5 rounded-[1.5rem] transition-all border-2 ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-200 -translate-y-1' 
                        : log 
                          ? 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm' 
                          : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lesson.startTime} - {lesson.endTime}
                      </span>
                      {log && !isSelected && <span className="text-indigo-500 text-xs">●</span>}
                    </div>
                    <h4 className={`font-black text-lg tracking-tight mb-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {lesson.groupName || lesson.subject}
                    </h4>
                    <p className={`text-[11px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      教室: {lesson.room}
                    </p>
                    {log && (
                      <div className={`mt-4 pt-4 border-t ${isSelected ? 'border-white/20' : 'border-slate-100'} space-y-3`}>
                        <div>
                          <p className={`text-[9px] font-black uppercase mb-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>授業内容</p>
                          <p className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-600'}`}>{log.content}</p>
                        </div>
                        {log.pdfUrl && (
                          <div className={`inline-flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                            📎 資料あり
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Editor (Privileged Only) */}
        {isPrivileged && (
          <div className="lg:col-span-2">
            {editingLog ? (
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6 animate-slideUp">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black tracking-tight text-slate-800">
                    {isPrivileged ? '授業ログの編集' : '授業ログの確認'}
                  </h3>
                  <button 
                    onClick={() => setEditingLog(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    閉じる
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">授業内容</label>
                    {isPrivileged ? (
                      <textarea 
                        value={editingLog.content || ''}
                        onChange={e => setEditingLog({ ...editingLog, content: e.target.value })}
                        placeholder="本日の授業内容を入力..."
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                      />
                    ) : (
                      <div className="w-full min-h-[8rem] bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-700">
                        {editingLog.content || '未入力'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">講師コメント</label>
                      {isPrivileged ? (
                        <textarea 
                          value={editingLog.instructorComments || ''}
                          onChange={e => setEditingLog({ ...editingLog, instructorComments: e.target.value })}
                          placeholder="授業の様子や特記事項..."
                          className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                        />
                      ) : (
                        <div className="w-full min-h-[6rem] bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-700">
                          {editingLog.instructorComments || 'なし'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">宿題</label>
                      {isPrivileged ? (
                        <textarea 
                          value={editingLog.homework || ''}
                          onChange={e => setEditingLog({ ...editingLog, homework: e.target.value })}
                          placeholder="次回の宿題..."
                          className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                        />
                      ) : (
                        <div className="w-full min-h-[6rem] bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-700">
                          {editingLog.homework || 'なし'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">資料 (PDF)</label>
                    <div className="flex items-center gap-4">
                      {isPrivileged ? (
                        <label className="flex-1 flex items-center justify-center gap-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 cursor-pointer hover:bg-slate-100 transition-all group">
                          <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
                          <span className="text-xs font-bold text-slate-500">
                            {editingLog.pdfName || 'PDFをアップロード'}
                          </span>
                          <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                      ) : (
                        <div className="flex-1 flex items-center gap-3 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4">
                          <span className="text-xl">📄</span>
                          <span className="text-xs font-bold text-slate-500">
                            {editingLog.pdfName || '資料なし'}
                          </span>
                        </div>
                      )}
                      {editingLog.pdfUrl && (
                        <div className="flex gap-2">
                          <a 
                            href={editingLog.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
                            title="表示"
                          >
                            👁️
                          </a>
                          {isPrivileged && (
                            <button 
                              onClick={() => setEditingLog({ ...editingLog, pdfUrl: undefined, pdfName: undefined })}
                              className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isPrivileged && (
                  <button 
                    onClick={handleSaveLog}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    保存する
                  </button>
                )}

                <div className="mt-12 pt-12 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span>📚</span> 授業履歴 (アーカイブ)
                    </h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      全 {logs.filter(l => l.timetableId === editingLog.timetableId).length} 件
                    </span>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {logs
                      .filter(l => l.timetableId === editingLog.timetableId)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(pastLog => (
                        <div key={pastLog.id} className={`group p-5 rounded-2xl border transition-all ${pastLog.date === selectedDate ? 'bg-indigo-50 border-indigo-100 ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-indigo-500 mb-1">
                                {pastLog.date} {pastLog.date === selectedDate && '(選択中)'}
                              </span>
                              <h5 className="text-xs font-black text-slate-800">
                                {timetable.find(t => t.id === pastLog.timetableId)?.groupName || '不明な授業'}
                              </h5>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(pastLog.date);
                                  setEditingLog(pastLog);
                                }}
                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                title="編集"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(pastLog.id);
                                }}
                                className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                                title="削除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">授業内容</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{pastLog.content}</p>
                            </div>
                            {pastLog.homework && (
                              <div className="pt-2 border-t border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">宿題</p>
                                <p className="text-[10px] text-slate-500">{pastLog.homework}</p>
                              </div>
                            )}
                            {pastLog.pdfUrl && (
                              <div className="inline-flex items-center gap-2 text-[9px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500">
                                📎 {pastLog.pdfName || '資料あり'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {logs.filter(l => l.timetableId === editingLog.timetableId).length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                        <p className="text-xs text-slate-400 font-bold italic">履歴はありません</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-12 border-2 border-dashed border-slate-200 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">🏫</div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">授業を選択してください</h3>
                  <p className="text-slate-400 text-sm font-bold">左側のリストから確認・編集する授業を選択してください</p>
                </div>

                {logs.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">最近の授業ログ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {logs
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 4)
                        .map(log => {
                          const lesson = timetable.find(t => t.id === log.timetableId);
                          return (
                            <div 
                              key={log.id} 
                              onClick={() => {
                                setSelectedDate(log.date);
                                setEditingLog(log);
                              }}
                              className="p-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black text-indigo-500">{log.date}</span>
                                <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-400 transition-colors">詳細を見る →</span>
                              </div>
                              <h5 className="text-xs font-black text-slate-800 mb-2 truncate">{lesson?.groupName || '集団授業'}</h5>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{log.content}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ) : (
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>📚</span> 全授業ログアーカイブ
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            全 {filteredArchive.length} 件
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArchive.map(log => {
                const lesson = timetable.find(t => t.id === log.timetableId);
                return (
                  <div key={log.id} className="group p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all hover:shadow-xl hover:shadow-indigo-100/50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">{log.date}</span>
                        <h4 className="font-black text-lg text-slate-800 tracking-tight">{lesson?.groupName || lesson?.subject}</h4>
                      </div>
                      {isPrivileged && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewMode('daily');
                              setSelectedDate(log.date);
                              // Set editing log directly
                              setEditingLog(log);
                              // Scroll to top of daily view if needed
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 transition-colors"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(log.id);
                            }}
                            className="p-2 bg-white text-rose-600 rounded-xl shadow-sm hover:bg-rose-50 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">授業内容</p>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{log.content}</p>
                      </div>
                      {log.homework && (
                        <div className="pt-3 border-t border-slate-200/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">宿題</p>
                          <p className="text-[10px] text-slate-500 line-clamp-2">{log.homework}</p>
                        </div>
                      )}
                      {log.pdfUrl && (
                        <div className="inline-flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                          📎 {log.pdfName || '資料あり'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredArchive.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="text-4xl mb-4">📂</div>
                  <p className="text-slate-400 font-bold italic">該当するログは見つかりませんでした</p>
                </div>
              )}
            </div>
          </div>
        )}
      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-scaleIn">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">⚠️</div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">削除の確認</h3>
            <p className="text-slate-500 text-sm font-bold text-center mb-8">この授業ログを削除してもよろしいですか？この操作は取り消せません。</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="py-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={() => handleDeleteLog(confirmDeleteId)}
                className="py-4 bg-rose-600 text-white rounded-xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
