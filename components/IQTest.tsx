
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
  const [step, setStep] = useState<'start' | 'testing' | 'analyzing' | 'result' | 'limit'>('start');
  const [currentQuestions, setCurrentQuestions] = useState<IQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledChoices, setShuffledChoices] = useState<{label: string, svg?: string}[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentResult, setCurrentResult] = useState<IQResult | null>(null);

  useEffect(() => {
    const today = getLocalISOString();
    const hasAttemptedToday = iqHistory.some(res => res.date === today);
    if (hasAttemptedToday && step === 'start') {
      setStep('limit');
    }
  }, [iqHistory, step]);

  const startTest = () => {
    const shuffled = [...IQ_QUESTION_BANK].sort(() => Math.random() - 0.5).slice(0, 10);
    setCurrentQuestions(shuffled);
    setAnswers({});
    setCurrentIndex(0);
    prepareQuestion(shuffled[0]);
    setStep('testing');
  };

  const prepareQuestion = (q: IQQuestion) => {
    const combined = q.choices.map((c, i) => ({
      label: c,
      svg: q.choiceSvgs ? q.choiceSvgs[i] : undefined
    }));
    setShuffledChoices([...combined].sort(() => Math.random() - 0.5));
  };

  const handleAnswer = (answer: string) => {
    const q = currentQuestions[currentIndex];
    const newAnswers = { ...answers, [q.id]: answer };
    setAnswers(newAnswers);

    if (currentIndex < currentQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      prepareQuestion(currentQuestions[nextIdx]);
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
      const result: IQResult = {
        id: generateUniqueId('iq'),
        date: getLocalISOString(),
        score: finalScore,
        estimatedIQ: Math.round(100 + (finalScore - 50) * 0.8),
        breakdown,
        aiAnalysis: analysis
      };
      onComplete(finalScore, breakdown, analysis);
      setCurrentResult(result);
      setStep('result');
    } catch (error) {
      console.error("IQ Analysis Error:", error);
      setStep('start');
      alert("分析中にエラーが発生しました。");
    }
  };

  if (step === 'limit') {
    return (
      <div className="bg-white rounded-[3rem] p-12 text-center shadow-2xl border-4 border-indigo-100 flex flex-col items-center justify-center min-h-[400px] animate-fadeIn">
        <div className="text-7xl mb-6">⏳</div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">本日の診断は完了しています</h2>
        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
          全デバイス共通で「1日1回」限定です。また明日挑戦してください。
        </p>
        <button onClick={() => setStep('start')} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all">履歴一覧へ戻る</button>
      </div>
    );
  }

  if (step === 'start') {
    return (
      <div className="space-y-8 animate-fadeIn pb-12">
        <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl border border-slate-200 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto border border-indigo-100">🧠</div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">AI Intelligence Test</h2>
            <p className="text-slate-400 font-black tracking-widest text-[10px] uppercase">Scientific Assessment powered by Gemini 3</p>
          </div>
          <p className="text-slate-600 font-bold max-w-lg mx-auto leading-relaxed text-sm">
            全デバイス共通で「1日1回」限定の真剣勝負です。<br/>
            あなたの認知的特性と強みを最新のAIが抽出します。
          </p>
          <button onClick={startTest} className="px-16 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-4 mx-auto">
            診断を開始する
            <span className="text-sm opacity-50">➔</span>
          </button>
        </div>

        {iqHistory.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Diagnostic History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
              {iqHistory.map(res => (
                <div key={res.id} onClick={() => { setCurrentResult(res); setStep('result'); }} className="bg-white p-6 rounded-[2.2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all cursor-pointer flex items-center justify-between group">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{res.date}</p>
                    <p className="text-xl font-black text-slate-800">推定IQ: <span className="text-indigo-600">{res.estimatedIQ}</span></p>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">➔</div>
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
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pt-4 pb-20">
        <div className="flex justify-between items-center px-4">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Question {currentIndex + 1} / {currentQuestions.length}</span>
          <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}></div>
          </div>
        </div>
        
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-slate-100 space-y-10">
          <div className="space-y-8">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight text-center">{q.question}</h3>
            {q.svgData && (
              <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner flex items-center justify-center">
                <div className="w-full max-w-[220px]" dangerouslySetInnerHTML={{ __html: q.svgData }} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {shuffledChoices.map((choice, idx) => (
              <button 
                key={idx} 
                onClick={() => handleAnswer(choice.label)} 
                className="group p-6 bg-white border-2 border-slate-200 rounded-[2.2rem] font-black text-slate-700 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all active:scale-95 flex flex-col items-center justify-center gap-4 text-xl"
              >
                {choice.svg && (
                  <div className="w-full transition-transform group-hover:scale-105" dangerouslySetInnerHTML={{ __html: choice.svg }} />
                )}
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
        <div className="w-16 h-16 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">分析中</h2>
          <p className="text-slate-400 font-bold animate-pulse">特性をデータから抽出しています...</p>
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
      <div className="space-y-8 animate-fadeIn pb-20">
        <header className="flex justify-between items-center">
          <button onClick={() => setStep('start')} className="px-6 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm">← 一覧に戻る</button>
          <div className="bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-200">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Assessed on {currentResult.date}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 黒網掛けを廃止し、清潔な白とindigoのコンビネーションへ */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border-4 border-indigo-100 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">Estimated IQ Index</p>
              <div className="flex items-baseline justify-center gap-3">
                 <h3 className="text-[10rem] leading-none font-black text-slate-900 tracking-tighter drop-shadow-sm">{currentResult.estimatedIQ}</h3>
              </div>
              <p className="text-indigo-600 font-black mt-8 text-sm italic tracking-widest border-t border-indigo-50 pt-6">CORE COGNITIVE CAPACITY</p>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-lg border border-slate-100 h-[340px]">
              <h4 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">認知特性プロファイル</h4>
              <ResponsiveContainer width="100%" height="90%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 900 }} />
                  <Radar name="Score" dataKey="A" stroke="#6366f1" strokeWidth={4} fill="#6366f1" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-xl border border-slate-200 min-h-[500px] relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-20"></div>
              <h4 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-4">
                <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-inner border border-indigo-100">📄</span>
                AI分析結果と学習ロードマップ
              </h4>
              <div className="bg-indigo-50/30 p-8 md:p-10 rounded-[2.5rem] border border-indigo-100 shadow-inner">
                <p className="text-slate-800 leading-relaxed font-bold whitespace-pre-wrap italic text-[15px]">
                  {currentResult.aiAnalysis}
                </p>
              </div>
              <div className="mt-10 flex items-center gap-6 p-6 bg-amber-50 rounded-[2rem] border border-amber-200">
                <span className="text-3xl">💡</span>
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">この数値は相対的なポテンシャルを示すものです。学習環境や努力によって、発揮される「実力」は無限に変化します。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
