import React, { useState, useMemo } from 'react';
import { Instructor, Report } from '../types';
import { getLocalISOString, parseSafeDate } from '../utils';

interface SalaryCenterProps {
  instructors: Instructor[];
  reports: Report[];
}

export const SalaryCenter: React.FC<SalaryCenterProps> = ({ instructors, reports }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const hourlyRate = 1800; // 基本時給（塾の規定により変更可能）

  const instructorStats = useMemo(() => {
    return instructors.map(ins => {
      const monthlyReports = reports.filter(r => 
        r.instructorName === ins.name && 
        parseSafeDate(r.date).getMonth() + 1 === selectedMonth &&
        parseSafeDate(r.date).getFullYear() === selectedYear
      );
      
      const sessionMinutes = monthlyReports.length * 90; // 1授業90分換算
      const salary = (sessionMinutes / 60) * hourlyRate;

      return {
        ...ins,
        count: monthlyReports.length,
        hours: (sessionMinutes / 60).toFixed(1),
        salary: Math.floor(salary)
      };
    }).sort((a, b) => b.salary - a.salary);
  }, [instructors, reports, selectedMonth, selectedYear]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">給与管理</h2>
          <p className="text-slate-500 font-medium">提出された指導報告書に基づき自動集計を行います</p>
        </div>
        <div className="flex gap-2">
           <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-white px-4 py-2 rounded-xl border border-slate-200 font-bold outline-none">
             {[2024, 2025].map(y => <option key={y} value={y}>{y}年</option>)}
           </select>
           <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-white px-4 py-2 rounded-xl border border-slate-200 font-bold outline-none">
             {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
           </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">総支給額</p><p className="text-4xl font-black">¥{instructorStats.reduce((a, b) => a + b.salary, 0).toLocaleString()}</p></div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">総授業数</p><p className="text-4xl font-black">{instructorStats.reduce((a, b) => a + b.count, 0)} <span className="text-lg text-slate-300">コマ</span></p></div>
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl"><p className="text-[10px] font-black text-indigo-200 uppercase mb-2">基本時給設定</p><p className="text-4xl font-black">¥{hourlyRate.toLocaleString()}</p></div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">講師名</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">授業数</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">実働時間</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">概算支給額</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">状況</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {instructorStats.map(ins => (
              <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 font-black text-slate-800">{ins.name}</td>
                <td className="px-8 py-6 font-bold text-slate-600">{ins.count}</td>
                <td className="px-8 py-6 font-bold text-slate-600">{ins.hours}h</td>
                <td className="px-8 py-6 font-black text-indigo-600">¥{ins.salary.toLocaleString()}</td>
                <td className="px-8 py-6"><span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-full border border-emerald-100 uppercase">承認済</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
