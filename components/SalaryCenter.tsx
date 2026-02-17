
import React, { useState, useMemo } from 'react';
import { Instructor, Report } from '../types';

interface SalaryCenterProps {
  instructors: Instructor[];
  reports: Report[];
}

const SalaryCenter: React.FC<SalaryCenterProps> = ({ instructors, reports }) => {
  const now = new Date();
  
  // 初期期間を過去3ヶ月〜今月末までに設定（データを見やすくするため）
  const initialStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const initialEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  const instructorStats = useMemo(() => {
    // 期間内の全報告書を取得
    const filteredReports = reports.filter(r => {
      // 報告書の日付 (YYYY-MM-DD) が指定範囲内か
      return r.date >= startDate && r.date <= endDate;
    });

    return instructors.map(instructor => {
      // 講師名でフィルタリング。
      // instructor.name または loginId が報告書の instructorName と一致するかを判定
      // (MOCKデータの表記揺れ対策として trim と include を活用)
      const instructorReports = filteredReports.filter(r => {
        const rName = r.instructorName?.trim() || "";
        const iName = instructor.name?.trim() || "";
        return rName.includes(iName) || iName.includes(rName);
      });
      
      const counts = {
        regular: 0,
        spring: 0,
        summer: 0,
        winter: 0,
        additional: 0,
        total: instructorReports.length
      };

      instructorReports.forEach(r => {
        const monthLabel = String(r.sessionMonth);
        if (monthLabel.includes('春')) counts.spring++;
        else if (monthLabel.includes('夏')) counts.summer++;
        else if (monthLabel.includes('冬')) counts.winter++;
        else if (monthLabel.includes('追加')) counts.additional++;
        else counts.regular++;
      });

      return {
        id: instructor.id,
        name: instructor.name,
        specialty: instructor.specialty,
        ...counts
      };
    });
  }, [instructors, reports, startDate, endDate]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">給与計算・授業集計</h2>
          <p className="text-slate-500 font-medium">指定期間内に作成された指導報告書数を集計します</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">集計開始日</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <span className="text-slate-300 mt-5">〜</span>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">集計終了日</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">講師名</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center">通常</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-emerald-600">春期</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-orange-500">夏期</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-indigo-500">冬期</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center">追加</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">合計件数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {instructorStats.map((stat) => (
                <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                        {stat.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{stat.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{stat.specialty}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center font-bold text-slate-700">{stat.regular}</td>
                  <td className="px-4 py-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${stat.spring > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-300'}`}>
                      {stat.spring}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${stat.summer > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-slate-300'}`}>
                      {stat.summer}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${stat.winter > 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-300'}`}>
                      {stat.winter}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center font-bold text-slate-700">{stat.additional}</td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-xl font-black text-slate-900">{stat.total}</span>
                    <span className="text-[10px] font-bold text-slate-400 ml-1">件</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {instructorStats.every(s => s.total === 0) && (
          <div className="py-20 text-center text-slate-400 italic">
            指定された期間（{startDate} 〜 {endDate}）に報告書データが存在しません。<br/>
            集計対象の講師名が報告書の講師名と一致しているか確認してください。
          </div>
        )}

        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
          <p className="text-xs text-slate-400 font-medium">
            ※ 1つの指導報告書を「1コマ」としてカウントしています。
          </p>
          <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <span>📊</span> CSVエクスポート
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">期間内 合計報告書数</p>
          <p className="text-4xl font-black text-slate-900">{instructorStats.reduce((acc, curr) => acc + curr.total, 0)} <span className="text-base font-normal opacity-30">回</span></p>
        </div>
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-2">最多作成者</p>
          {instructorStats.reduce((prev, current) => (prev.total > current.total) ? prev : current).total > 0 ? (
            <p className="text-3xl font-black truncate">{instructorStats.reduce((prev, current) => (prev.total > current.total) ? prev : current).name}</p>
          ) : <p className="text-2xl font-black opacity-50">---</p>}
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-2">平均作成数</p>
          <p className="text-4xl font-black">
            {(instructorStats.reduce((acc, curr) => acc + curr.total, 0) / (instructors.length || 1)).toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalaryCenter;
