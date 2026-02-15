
import React, { useState } from 'react';
import { Student, Report } from '../types';
import { generateProfessionalReport } from '../services/geminiService';

interface ReportFormProps {
  students: Student[];
  onSave: (report: Report) => void;
}

const ReportForm: React.FC<ReportFormProps> = ({ students, onSave }) => {
  const now = new Date();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [quizScore, setQuizScore] = useState<number | ''>('');
  const [sessionYear, setSessionYear] = useState(2025);
  const [sessionMonth, setSessionMonth] = useState<number | string>(now.getMonth() + 1);
  const [sessionCount, setSessionCount] = useState(1);
  const [rawNotes, setRawNotes] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<Report['generatedContent'] | null>(null);

  const years = Array.from({ length: 2125 - 2025 + 1 }, (_, i) => 2025 + i);
  const seasonalOptions = ['春期講習', '夏期講習', '冬期講習', '追加'];

  const inputBaseStyle = "w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-bold placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all";

  const handleGenerate = async () => {
    if (!selectedStudentId || !subject || !rawNotes || !homeworkAssigned) {
      alert('生徒、科目、指導メモ、および宿題内容を入力してください。');
      return;
    }

    setIsGenerating(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      const content = await generateProfessionalReport(
        student?.name || '生徒',
        subject,
        rawNotes,
        homeworkAssigned,
        typeof quizScore === 'number' ? quizScore : undefined
      );
      
      // 改行コードの正規化
      if (content.weeklyPlan) {
        content.weeklyPlan = content.weeklyPlan.replace(/\\n/g, '\n');
      }
      
      setGeneratedPreview(content);
    } catch (error) {
      alert('AIレポートの生成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewChange = (field: keyof Report['generatedContent'], value: string) => {
    if (!generatedPreview) return;
    setGeneratedPreview({
      ...generatedPreview,
      [field]: value
    });
  };

  const handleSave = () => {
    if (!generatedPreview) return;

    const newReport: Report = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: selectedStudentId,
      date: new Date().toISOString().split('T')[0],
      subject,
      instructorName: '山田 講師',
      sessionYear,
      sessionMonth,
      sessionCount,
      rawNotes,
      homeworkAssigned,
      generatedContent: generatedPreview,
      quizScore: typeof quizScore === 'number' ? quizScore : undefined
    };

    onSave(newReport);
    setSelectedStudentId('');
    setSubject('');
    setQuizScore('');
    setRawNotes('');
    setHomeworkAssigned('');
    setGeneratedPreview(null);
  };

  const formatSessionLabel = (month: number | string) => {
    return typeof month === 'number' ? `${month}月` : month;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">指導報告書作成</h2>
        <p className="text-slate-500 font-medium">授業内容と宿題を入力して、学習ロードマップを生成しましょう</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md">1</span>
            授業データの入力
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">対象生徒</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className={inputBaseStyle}
              >
                <option value="">生徒を選択</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">科目</label>
              <input
                type="text"
                placeholder="例: 数学"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputBaseStyle}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-200 shadow-inner">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              授業回数情報
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1.5 ml-1">実施年</label>
                <select
                  value={sessionYear}
                  onChange={(e) => setSessionYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-bold focus:border-indigo-500 outline-none text-sm transition-all"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1.5 ml-1">実施区分</label>
                <select
                  value={sessionMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSessionMonth(isNaN(Number(val)) ? val : Number(val));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-bold focus:border-indigo-500 outline-none text-sm transition-all"
                >
                  <optgroup label="通常授業">
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}月</option>
                    ))}
                  </optgroup>
                  <optgroup label="講習・その他">
                    {seasonalOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1.5 ml-1">第何回</label>
                <input
                  type="number"
                  min="1"
                  value={sessionCount}
                  onChange={(e) => setSessionCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-bold focus:border-indigo-500 outline-none text-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">指導メモ (授業の内容・様子)</label>
            <textarea
              rows={4}
              placeholder="・二次方程式の解の公式を練習&#10;・理解度は高いが計算ミスに注意が必要"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              className={inputBaseStyle + " resize-none"}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2 ml-1">今回の宿題 (AIが計画を作成します)</label>
            <textarea
              rows={3}
              placeholder="・問題集p45-48（基本問題すべて）&#10;・漢字テスト100問の予習"
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
              className={inputBaseStyle + " resize-none border-indigo-200"}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">テスト得点 (任意)</label>
            <input
              type="number"
              placeholder="0-100"
              value={quizScore}
              onChange={(e) => setQuizScore(e.target.value === '' ? '' : Number(e.target.value))}
              className={inputBaseStyle}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-5 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 ${
              isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AIが最高級の計画を構築中...
              </span>
            ) : '✨ 指導報告書と学習計画を自動生成'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm shadow-md">2</span>
            生成内容の確認・加筆
          </h3>

          {!generatedPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30">
              <span className="text-6xl mb-4 grayscale opacity-20">📝</span>
              <p className="text-lg font-bold">データを入力して生成を開始してください</p>
              <p className="text-sm mt-1">AIが最適な文章を構成します</p>
            </div>
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-center justify-between shadow-sm">
                <span className="text-sm font-black text-indigo-700">{sessionYear}年 {formatSessionLabel(sessionMonth)} 第{sessionCount}回 確定前ドラフト</span>
                <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] text-indigo-500 font-black border border-indigo-200">AI DRAFTED</span>
              </div>

              <section>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center">📖</span> 指導内容
                </h4>
                <textarea
                  value={generatedPreview.lessonSummary}
                  onChange={(e) => handlePreviewChange('lessonSummary', e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 text-base font-medium leading-relaxed outline-none focus:border-indigo-500 transition-all shadow-sm"
                  rows={3}
                />
              </section>

              <section className="bg-indigo-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-3">
                  <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-sm">📅</span> 
                  週間学習計画
                </h4>
                <textarea
                  value={generatedPreview.weeklyPlan}
                  onChange={(e) => handlePreviewChange('weeklyPlan', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap font-bold text-indigo-50 outline-none focus:bg-black/40 transition-all"
                  rows={8}
                />
              </section>

              <section>
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center text-[10px]">✨</span>
                  家庭学習・次回の課題
                </h4>
                <textarea
                  value={generatedPreview.homeworkStatus}
                  onChange={(e) => handlePreviewChange('homeworkStatus', e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 text-base font-medium leading-relaxed outline-none focus:border-emerald-500 transition-all shadow-sm"
                  rows={2}
                />
              </section>

              <section className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100 shadow-sm">
                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span>💬</span> 保護者様へのメッセージ
                </h4>
                <textarea
                  value={generatedPreview.messageToParents}
                  onChange={(e) => handlePreviewChange('messageToParents', e.target.value)}
                  className="w-full bg-white/80 p-4 rounded-xl border-2 border-rose-100 text-slate-900 text-sm font-bold italic leading-relaxed outline-none focus:bg-white focus:border-rose-300 transition-all"
                  rows={2}
                />
              </section>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 mb-6 text-center font-bold tracking-tight">
                   内容に誤りがないか最終確認し、OKであれば公開してください
                </p>
                <button
                  onClick={handleSave}
                  className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 text-lg"
                >
                  加筆を保存して報告書を公開する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
