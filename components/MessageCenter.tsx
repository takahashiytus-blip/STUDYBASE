
import React from 'react';
import { Report, Student, UserRole } from '../types';
import ReportList from './ReportList';

interface MessageCenterProps {
  reports: Report[];
  students: Student[];
  currentUser: { role: UserRole; id: string; name: string };
  onAddMessage: (reportId: string, text: string) => void;
  onMarkResolved: (reportId: string) => void;
}

const MessageCenter: React.FC<MessageCenterProps> = ({ reports, students, currentUser, onAddMessage, onMarkResolved }) => {
  // Only show reports that have messages and need action
  const pendingReports = reports.filter(r => r.needsAction);
  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || '不明';

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">リクエスト・相談</h2>
          <p className="text-slate-500 font-medium">生徒や保護者との対話が必要な報告書をまとめています</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl">💬</div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">対応待ち</p>
              <p className="text-xl font-black text-slate-800">{pendingReports.length} <span className="text-xs font-normal text-slate-400">件</span></p>
            </div>
          </div>
        </div>
      </header>

      {pendingReports.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-400 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-30">✉️</div>
          <p className="text-xl font-bold text-slate-600 mb-2">未対応のリクエストはありません</p>
          <p className="text-sm">全ての生徒・保護者との対話が完了しています</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-indigo-900 p-8 rounded-[3rem] shadow-xl text-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              対応が必要な報告書
            </h3>
            <ReportList 
              reports={pendingReports} 
              students={students} 
              currentUser={currentUser} 
              onAddMessage={onAddMessage}
              onMarkResolved={onMarkResolved}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReports.map(report => {
              const lastMsg = report.messages?.[report.messages.length - 1];
              return (
                <div key={`summary-${report.id}`} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">{report.date}</span>
                    <button 
                      onClick={() => onMarkResolved(report.id)}
                      className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-100"
                    >
                      ✓ 対応済みにする
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">{getStudentName(report.studentId)} さん</h4>
                  {lastMsg && (
                    <div className="bg-slate-50 p-3 rounded-xl border-l-4 border-indigo-400">
                      <p className="text-xs text-slate-400 mb-1 flex justify-between">
                        <span>{lastMsg.senderName} ({lastMsg.senderRole === 'parent' ? '保護者' : '生徒'})</span>
                        <span>{lastMsg.timestamp}</span>
                      </p>
                      <p className="text-sm text-slate-700 line-clamp-2 italic">「{lastMsg.text}」</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex items-start gap-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-white text-amber-500 flex items-center justify-center text-3xl shrink-0 shadow-sm border border-amber-100">💡</div>
        <div>
          <h4 className="font-black text-slate-800 mb-2 text-lg">通知の管理について</h4>
          <p className="text-slate-600 leading-relaxed font-medium">
            保護者や生徒から返信があった報告書には自動的に通知がつきます。返信または内容を確認したあと「対応済みにする」をクリックすると、サイドバーのバッジが消去されます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageCenter;
