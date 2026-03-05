import React, { useState, useMemo } from 'react';
import { UserRole, TimetableEntry, GroupLessonLog, Student } from '../types';
import { generateUniqueId, getLocalISOString } from '../utils';

interface GroupLessonCenterProps {
  currentUser: { role: UserRole; id: string; name: string };
  timetable: TimetableEntry[];
  logs: GroupLessonLog[];
  students: Student[];
  onUpdateLogs: (newLogs: GroupLessonLog[], deletedIds?: string[]) => void;
}

export const GroupLessonCenter: React.FC<GroupLessonCenterProps> = ({
  currentUser,
  timetable,
  logs,
  students,
  onUpdateLogs,
}) => {
  const [selectedDate, setSelectedDate] = useState(getLocalISOString().split('T')[0]);
  const [editingLog, setEditingLog] = useState<Partial<GroupLessonLog> | null>(null);

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
    if (isPrivileged) return groupLessons;
    return groupLessons.filter(t => (t.studentIds || []).includes(currentUser.id));
  }, [groupLessons, isPrivileged, currentUser.id]);

  const handleSaveLog = () => {
    if (!editingLog || !editingLog.timetableId) return;

    const newLog: GroupLessonLog = {
      id: editingLog.id || generateUniqueId('gl'),
      timetableId: editingLog.timetableId,
      date: selectedDate,
      content: editingLog.content || '',
      testResults: editingLog.testResults || '',
      homework: editingLog.homework || '',
      pdfUrl: editingLog.pdfUrl,
      pdfName: editingLog.pdfName,
    };

    const updatedLogs = editingLog.id 
      ? logs.map(l => l.id === editingLog.id ? newLog : l)
      : [...logs, newLog];

    onUpdateLogs(updatedLogs);
    setEditingLog(null);
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
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 italic">
            GROUP <span className="text-indigo-600">LESSONS</span>
          </h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">
            {isPrivileged ? '集団授業管理' : '集団授業ログ'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs font-black text-slate-400 ml-2 uppercase">Date</span>
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
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
                    onClick={() => isPrivileged && setEditingLog(log || { timetableId: lesson.id })}
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
                    {!isPrivileged && log && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">授業内容</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{log.content}</p>
                        </div>
                        {log.testResults && (
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">テスト結果</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{log.testResults}</p>
                          </div>
                        )}
                        {log.homework && (
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">宿題</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{log.homework}</p>
                          </div>
                        )}
                        {log.pdfUrl && (
                          <a 
                            href={log.pdfUrl} 
                            download={log.pdfName}
                            className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            📎 {log.pdfName}
                          </a>
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
                    授業ログの編集
                  </h3>
                  <button 
                    onClick={() => setEditingLog(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    キャンセル
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">授業内容</label>
                    <textarea 
                      value={editingLog.content || ''}
                      onChange={e => setEditingLog({ ...editingLog, content: e.target.value })}
                      placeholder="本日の授業内容を入力..."
                      className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">テスト結果</label>
                      <textarea 
                        value={editingLog.testResults || ''}
                        onChange={e => setEditingLog({ ...editingLog, testResults: e.target.value })}
                        placeholder="小テストの結果など..."
                        className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">宿題</label>
                      <textarea 
                        value={editingLog.homework || ''}
                        onChange={e => setEditingLog({ ...editingLog, homework: e.target.value })}
                        placeholder="次回の宿題..."
                        className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">資料 (PDF)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex items-center justify-center gap-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 cursor-pointer hover:bg-slate-100 transition-all group">
                        <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
                        <span className="text-xs font-bold text-slate-500">
                          {editingLog.pdfName || 'PDFをアップロード'}
                        </span>
                        <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                      </label>
                      {editingLog.pdfUrl && (
                        <button 
                          onClick={() => setEditingLog({ ...editingLog, pdfUrl: undefined, pdfName: undefined })}
                          className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveLog}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  保存する
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-3xl mb-6">🏫</div>
                <h3 className="text-xl font-black text-slate-800 mb-2">授業を選択してください</h3>
                <p className="text-slate-400 text-sm font-bold">左側のリストから編集する授業を選択してください</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
