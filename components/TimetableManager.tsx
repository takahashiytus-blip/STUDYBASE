import React, { useState } from 'react';
import { TimetableEntry, Student, Instructor } from '../types';
import { generateUniqueId } from '../utils';

interface TimetableManagerProps {
  timetable: TimetableEntry[];
  students: Student[];
  instructors: Instructor[];
  onUpdate: (newTimetable: TimetableEntry[]) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export const TimetableManager: React.FC<TimetableManagerProps> = ({ timetable, students, instructors, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (day: number) => {
    const newEntry: TimetableEntry = {
      id: generateUniqueId('t'),
      dayOfWeek: day,
      startTime: '17:00',
      endTime: '18:30',
      subject: '数学',
      studentId: students[0]?.id,
      instructorId: instructors[0]?.id,
      room: 'A教室'
    };
    onUpdate([...timetable, newEntry]);
  };

  const handleRemove = (id: string) => {
    onUpdate(timetable.filter(t => t.id !== id));
  };

  const handleEdit = (id: string, updates: Partial<TimetableEntry>) => {
    onUpdate(timetable.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-black text-slate-800">時間割管理システム</h2>
        <p className="text-slate-500 font-medium">校舎内の全授業コマの配置と担当講師を管理します</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5, 6, 0].map(day => (
          <div key={day} className="min-w-[150px] bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <span className={`text-sm font-black ${day === 0 ? 'text-rose-500' : 'text-slate-800'}`}>{DAY_NAMES[day]}曜日</span>
              <button onClick={() => handleAdd(day)} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">+</button>
            </div>
            
            <div className="space-y-3 flex-1">
              {timetable.filter(t => t.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(item => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group relative">
                   <div className="flex justify-between items-start mb-2">
                      <input 
                        type="text" 
                        value={item.startTime} 
                        onChange={e => handleEdit(item.id, { startTime: e.target.value })} 
                        className="bg-transparent text-[10px] font-black text-indigo-500 w-12 outline-none"
                      />
                      <button onClick={() => handleRemove(item.id)} className="text-[10px] text-rose-300 opacity-0 group-hover:opacity-100">✕</button>
                   </div>
                   <select 
                      value={item.subject} 
                      onChange={e => handleEdit(item.id, { subject: e.target.value })}
                      className="w-full bg-transparent font-black text-xs text-slate-700 outline-none mb-1"
                   >
                     {['数学', '英語', '国語', '理科', '社会'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <select 
                      value={item.studentId} 
                      onChange={e => handleEdit(item.id, { studentId: e.target.value })}
                      className="w-full bg-transparent text-[10px] font-bold text-slate-400 outline-none"
                   >
                     {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
