
import React, { useState, useMemo } from 'react';
import { Instructor, Report } from '../types';
import { parseSafeDate } from '../utils';

interface SalaryCenterProps {
  instructors: Instructor[];
  reports: Report[];
}

type SessionCategory = 'Regular' | 'Special' | 'Additional' | 'Trial';

export const SalaryCenter: React.FC<SalaryCenterProps> = ({ instructors, reports }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const categorizeSession = (period: string | number): SessionCategory => {
    const p = period.toString();
    if (p.includes('夏') || p.includes('冬') || p.includes('春') || p.includes('講習')) return 'Special';
    if (p.includes('追加') || p.includes('延長') || p.includes('補習')) return 'Additional';
    if (p.includes('体験') || p.includes('カウンセリング')) return 'Trial';
    return 'Regular';
  };

  const instructorStats = useMemo(() => {
    return instructors.map(ins => {
      // 指定された年月に関連する報告書を抽出
      // 標準月(1-12)入力の場合はその月に、講習区分入力の場合は実施日ベースでフィルタ
      const monthlyReports = reports.filter(r => {
        // 講師名の照合（空白を除去して比較）
        const cleanReportName = (r.instructorName || '').replace(/\s+/g, '');
        const cleanInstructorName = (ins.name || '').replace(/\s+/g, '');
        const isTargetInstructor = cleanReportName === cleanInstructorName;
        
        const reportDate = parseSafeDate(r.date);
        const matchesDate = reportDate.getMonth() + 1 === selectedMonth && reportDate.getFullYear() === selectedYear;
        
        // 実施年と実施月の両方が一致するかチェック
        const rYear = r.sessionYear?.toString();
        const rMonth = r.sessionMonth?.toString();
        const matchesPeriod = rYear === selectedYear.toString() && rMonth === selectedMonth.toString();
        
        return isTargetInstructor && (matchesDate || matchesPeriod);
      });
      
      const breakdown = {
        regular: monthlyReports.filter(r => categorizeSession(r.sessionMonth) === 'Regular').length,
        special: monthlyReports.filter(r => categorizeSession(r.sessionMonth) === 'Special').length,
        additional: monthlyReports.filter(r => categorizeSession(r.sessionMonth) === 'Additional').length,
        trial: monthlyReports.filter(r => categorizeSession(r.sessionMonth) === 'Trial').length,
      };

      const totalCount = monthlyReports.length;

      return {
        ...ins,
        breakdown,
        totalCount,
        hours: (totalCount * 1.5).toFixed(1)
      };
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [instructors, reports, selectedMonth, selectedYear]);

  const totalSessionsOverall = instructorStats.reduce((a, b) => a + b.totalCount, 0);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">講師稼働・給与集計</h2>
          <p className="text-slate-500 font-medium">指導報告書の区分に基づき、各種授業を自動仕分けして集計します</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
           <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent px-4 py-2 font-black outline-none text-sm text-slate-600">
             {Array.from({length: new Date().getFullYear() - 2024 + 2}, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}年</option>)}
           </select>
           <div className="w-[1px] bg-slate-100 my-2"></div>
           <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent px-4 py-2 font-black outline-none text-sm text-indigo-600">
             {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月度</option>)}
           </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg col-span-1 md:col-span-1">
          <p className="text-[10px] font-black text-indigo-200 uppercase mb-1 tracking-widest">総指導コマ数</p>
          <p className="text-4xl font-black">{totalSessionsOverall} <span className="text-sm font-normal opacity-60">コマ</span></p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">通常月謝分</p>
          <p className="text-2xl font-black text-slate-800">{instructorStats.reduce((a, b) => a + b.breakdown.regular, 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest">講習分 (春夏冬)</p>
          <p className="text-2xl font-black text-amber-600">{instructorStats.reduce((a, b) => a + b.breakdown.special, 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase mb-1 tracking-widest">追加・体験分</p>
          <p className="text-2xl font-black text-emerald-600">{instructorStats.reduce((a, b) => a + b.breakdown.additional + b.breakdown.trial, 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">講師名</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">通常</th>
                <th className="px-6 py-5 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center bg-amber-50/30">講習</th>
                <th className="px-6 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center bg-emerald-50/30">追加/体験</th>
                <th className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-right">合計コマ</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">時間(参考)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {instructorStats.map(ins => (
                <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 font-black text-slate-800">{ins.name}</td>
                  <td className="px-6 py-5 font-bold text-slate-500 text-center text-sm">{ins.breakdown.regular}</td>
                  <td className="px-6 py-5 font-black text-amber-600 text-center text-sm bg-amber-50/30">{ins.breakdown.special}</td>
                  <td className="px-6 py-5 font-bold text-emerald-600 text-center text-sm bg-emerald-50/30">{ins.breakdown.additional + ins.breakdown.trial}</td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-xl font-black text-indigo-600">{ins.totalCount}</span>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-400 text-xs">{ins.hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {instructorStats.length === 0 && (
          <div className="p-24 text-center text-slate-300 italic flex flex-col items-center gap-4">
            <span className="text-5xl">🌑</span>
            <p>この期間の報告データがまだありません</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-start gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">ℹ️</div>
        <div className="relative z-10">
          <h4 className="font-black mb-1 text-indigo-300 tracking-tight">自動判別ロジックについて</h4>
          <p className="text-slate-400 text-xs leading-relaxed font-medium">
            報告書作成時に「実施月/期」欄で<span className="text-amber-400 font-bold">「夏期」「冬期」「春期」</span>のタグを選択すると、自動的に「講習分」として集計されます。
            同様に<span className="text-emerald-400 font-bold">「追加」「体験」</span>を選択すると、追加分として仕分けられます。数字のみ（例：5）の場合は通常授業としてカウントされます。
          </p>
        </div>
      </div>
    </div>
  );
};
