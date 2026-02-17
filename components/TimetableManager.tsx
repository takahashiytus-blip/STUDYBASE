
import React, { useState } from 'react';
import { TimetableEntry, Student, Instructor } from '../types';

interface TimetableManagerProps {
  timetable: TimetableEntry[];
  students: Student[];
  instructors: Instructor[];
  onUpdate: (newTimetable: TimetableEntry[]) => void;
}

const DAY_NAMES_JP = ['日', '月', '火', '水', '木', '金', '土'];

const TimetableManager: React.FC<TimetableManagerProps> = ({ timetable, students, instructors, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<TimetableEntry>>({
    dayOfWeek: 1,
    startTime: '17:00',
    endTime: '18:30',
    subject: '数学',
    studentId: '',
    instructorId: '',
    room: 'A教室'
  });

  const handleDelete = (id: string) => {
    if (window.confirm('このコマを削除しますか？')) {
      onUpdate(timetable.filter(t => t.id !== id));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: TimetableEntry = {
      id: Math.random().toString(36).substr(2, 9),
      dayOfWeek: Number(formData.dayOfWeek) || 0,
      startTime: formData.startTime || '17:00',
      endTime: formData.endTime || '18:30',
      subject: formData.subject || '数学',
      studentId: formData.studentId,
      instructorId: formData.instructorId,
      room: formData.room
    };
    onUpdate([...timetable, newEntry]);
    setIsAdding(false);
  };

  const sortedTimetable = [...timetable].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">時間割マスター管理</h2>
          <p className="text-slate-500 font-medium">全校の授業スケジュールを一元管理します</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all"
          >
            ＋ 新規コマ作成
          </button>
        )}
      </header>

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-2 border-indigo-50 animate-slideUp">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
            <span className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">📅</span>
            新しい授業枠の追加
          </h3>
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">曜日</label>
                <select 
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({...formData, dayOfWeek: Number(e.target.value)})}
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                >
                  {[1,2,3,4,5,6,0].map(d => <option key={d} value={d}>{DAY_NAMES_JP[d]}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">開始時間</label>
                <input 
                  type="time" 
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">終了時間</label>
                <input 
                  type="time" 
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">科目</label>
                <input 
                  type="text" 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="例: 数学"
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">生徒</label>
                <select 
                  value={formData.studentId}
                  onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                >
                  <option value="">生徒を選択</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">講師</label>
                <select 
                  value={formData.instructorId}
                  onChange={(e) => setFormData({...formData, instructorId: e.target.value})}
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                >
                  <option value="">講師を選択</option>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">教室名</label>
                <input 
                  type="text" 
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  placeholder="例: A教室"
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700"
              >
                コマを登録する
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">曜日 / 時間</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest">生徒</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest">講師</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center">科目</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center">教室</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedTimetable.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase mb-1 ${entry.dayOfWeek === 0 ? 'text-rose-500' : 'text-indigo-600'}`}>
                        {DAY_NAMES_JP[entry.dayOfWeek]}曜日
                      </span>
                      <span className="font-mono font-black text-slate-800">{entry.startTime} 〜 {entry.endTime}</span>
                    </div>
                  </td>
                  <td className="px-4 py-6 font-bold text-slate-800">
                    {students.find(s => s.id === entry.studentId)?.name || '未設定'}
                  </td>
                  <td className="px-4 py-6 font-bold text-slate-600">
                    {instructors.find(i => i.id === entry.instructorId)?.name || '未設定'}
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black">{entry.subject}</span>
                  </td>
                  <td className="px-4 py-6 text-center text-xs font-bold text-slate-400">
                    {entry.room || '---'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                      title="削除"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {timetable.length === 0 && (
          <div className="py-20 text-center text-slate-400 italic">
            登録されている時間割はありません
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableManager;
