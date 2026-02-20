import React, { useState, useEffect } from 'react';
import { IQ_QUESTION_BANK, IQQuestion, IQCategory } from '../constants/iqTestData';
import { generateIQAnalysis } from '../services/geminiService';
import { IQResult } from '../types';
import { getLocalISOString, generateUniqueId } from '../utils';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface IQTestProps {
  studentName: string;
  grade: string;
  userId: string;
  iqHistory: IQResult[];
  onComplete: (score: number, breakdown: any, analysis: string) => void;
}

export const IQTest: React.FC<IQTestProps> = ({ studentName, grade, userId, iqHistory, onComplete }) => {
  const [step, setStep] = useState<'start' | 'testing' | 'analyzing' | 'result'>('start');
  const [currentQuestions, setCurrentQuestions] = useState<IQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentResult, setCurrentResult] = useState<IQResult | null>(null);

  const startTest = () => {
    const shuffled = [...IQ_QUESTION_BANK].sort(() => Math.random() - 0.5).slice(0, 10);
    setCurrentQuestions(shuffled);
    setAnswers({});
    setCurrentIndex(0);
    setStep('testing');
  };

  const handleAnswer = (answer: string) => {
    const q = currentQuestions[currentIndex];
    const newAnswers = { ...answers, [q.id]: answer };
    setAnswers(newAnswers);

    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishTest(newAnswers);
    }
  };

  const finishTest = async (finalAnswers: Record<string, string>) => {
    setStep('analyzing');
    
    let totalScore = 0;
    const breakdown = { logical: 0, numerical: 0, verbal: 0, spatial: 0 };
    const counts = { logical: 0, numerical: 0, verbal: 0, spatial: 0 };

    currentQuestions.forEach(q => {
      counts[q.category]++;
      if (finalAnswers[q.id] === q.answer) {
        totalScore += q.weight;
        breakdown[q.category] += 100;
      }
    });

    Object.keys(breakdown).forEach(key => {
      const cat = key as IQCategory;
      breakdown[cat] = Math.round(breakdown[cat] / (counts[cat] || 1));
    });

    const finalScore = Math.min(100, Math.round((totalScore / 150) * 100) + 40);

    try {
      const analysis = await generateIQAnalysis(studentName, grade, finalScore, breakdown);
      onComplete(finalScore, breakdown, analysis);
      
      const result: IQResult = {
        id: generateUniqueId('iq'),
        date: getLocalISOString(),
        score: finalScore,
        estimatedIQ: Math.round(100 + (finalScore - 50) * 0.8),
        breakdown,
        aiAnalysis: analysis
      };
      setCurrentResult(result);
      setStep('result');
    } catch (error) {
      console.error("IQ Analysis Error:", error);
      setStep('start');
      alert("分析中にエラーが発生しました。");
    }
  };

  if (step === 'start') {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">🧠</div>
          <h2 className="text-3xl font-black text-slate-800">AI知能・特性診断</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            論理・数値・言語・空間の4領域からあなたの得意分野を分析。AIが最適な学習スタイルを提案します。
          </p>
          <button onClick={startTest} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
            診断を開始する
          </button>
        </div>

        {iqHistory.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-4">診断履歴</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {iqHistory.map(res => (
                <div key={res.id} onClick={() => { setCurrentResult(res); setStep('result'); }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{res.date}</p>
                    <p className="text-lg font-black text-slate-800">推定IQ: {res.estimatedIQ}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 font-black">➔</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'testing') {
    const q = currentQuestions[currentIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex justify-between items-end px-4">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full">Question {currentIndex + 1} / {currentQuestions.length}</span>
          <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
          <h3 className="text-xl font-black text-slate-800 leading-relaxed text-center">{q.question}</h3>
          {q.svgData && <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100" dangerouslySetInnerHTML={{ __html: q.svgData }} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {q.choices.map((choice, idx) => (
              <button key={idx} onClick={() => handleAnswer(choice)} className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all active:scale-95 flex flex-col items-center gap-3">
                {q.choiceSvgs && <div className="w-full" dangerouslySetInnerHTML={{ __html: q.choiceSvgs[idx] }} />}
                <span>{choice}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-800">AI分析中...</h2>
          <p className="text-slate-400 font-bold mt-2">思考パターンと認知特性を特定しています</p>
        </div>
      </div>
    );
  }

  if (step === 'result' && currentResult) {
    const radarData = [
      { subject: '論理', A: currentResult.breakdown.logical, full: 100 },
      { subject: '数値', A: currentResult.breakdown.numerical, full: 100 },
      { subject: '言語', A: currentResult.breakdown.verbal, full: 100 },
      { subject: '空間', A: currentResult.breakdown.spatial, full: 100 },
    ];

    return (
      <div className="space-y-8 animate-fadeIn pb-12">
        <header className="flex justify-between items-center">
          <button onClick={() => setStep('start')} className="text-sm font-black text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2">← 戻る</button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">診断日: {currentResult.date}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-indigo-900 p-10 rounded-[3rem] shadow-2xl text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-4">Cognitive Assessment Score</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-[12px] font-black text-indigo-400 uppercase">IQ</span>
                <h3 className="text-7xl font-black drop-shadow-lg">{currentResult.estimatedIQ}</h3>
              </div>
              <p className="text-indigo-200 font-bold mt-4 italic">「あなたの認知能力は非常にユニークです」</p>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                  <Radar name="Score" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative">
              <span className="absolute top-10 right-10 text-4xl opacity-10">✨</span>
              <h4 className="text-sm font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">🧠</span>
                AIによる特性分析と学習アドバイス
              </h4>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed font-bold whitespace-pre-wrap italic">
                  {currentResult.aiAnalysis}
                </p>
              </div>
            </div>
            
            <button onClick={startTest} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all">再診断を受ける</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
