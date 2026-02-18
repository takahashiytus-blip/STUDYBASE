
import React, { useState, useEffect, useCallback } from 'react';
import { IQ_QUESTION_BANK, IQQuestion, IQCategory } from '../constants/iqTestData';
import { generateIQAnalysis } from '../services/geminiService';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface IQTestProps {
  studentName: string;
  grade: string;
  onComplete: (score: number, breakdown: any, analysis: string) => void;
}

const IQTest: React.FC<IQTestProps> = ({ studentName, grade, onComplete }) => {
  const [gameState, setGameState] = useState<'idle' | 'testing' | 'analyzing' | 'finished'>('idle');
  const [currentQuestions, setCurrentQuestions] = useState<IQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [scoreData, setScoreData] = useState<any>(null);

  const startTest = () => {
    // 200問のバンクからランダムに6問を抽出
    const shuffled = [...IQ_QUESTION_BANK].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    
    setCurrentQuestions(selected);
    setCurrentIndex(0);
    setAnswers({});
    setGameState('testing');
  };

  const handleAnswer = (choice: string) => {
    const q = currentQuestions[currentIndex];
    setAnswers({ ...answers, [q.id]: choice });

    if (currentIndex + 1 < currentQuestions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      processResult();
    }
  };

  const processResult = async () => {
    setGameState('analyzing');
    
    let totalWeight = 0;
    let earnedWeight = 0;
    const categoryScores: Record<IQCategory, { total: number; earned: number }> = {
      logical: { total: 0, earned: 0 },
      numerical: { total: 0, earned: 0 },
      verbal: { total: 0, earned: 0 },
      spatial: { total: 0, earned: 0 }
    };

    currentQuestions.forEach(q => {
      totalWeight += q.weight;
      categoryScores[q.category].total += q.weight;
      if (answers[q.id] === q.answer) {
        earnedWeight += q.weight;
        categoryScores[q.category].earned += q.weight;
      }
    });

    const percentageBreakdown = {
      logical: (categoryScores.logical.earned / (categoryScores.logical.total || 1)) * 100,
      numerical: (categoryScores.numerical.earned / (categoryScores.numerical.total || 1)) * 100,
      verbal: (categoryScores.verbal.earned / (categoryScores.verbal.total || 1)) * 100,
      spatial: (categoryScores.spatial.earned / (categoryScores.spatial.total || 1)) * 100
    };

    const finalScore = Math.round((earnedWeight / totalWeight) * 100);
    
    try {
      const analysis = await generateIQAnalysis(studentName, grade, finalScore, percentageBreakdown);
      setAiAnalysis(analysis || "分析が完了しました。");
      
      const radarData = [
        { subject: '論理推理', value: percentageBreakdown.logical },
        { subject: '数値処理', value: percentageBreakdown.numerical },
        { subject: '言語能力', value: percentageBreakdown.verbal },
        { subject: '空間把握', value: percentageBreakdown.spatial }
      ];
      
      setScoreData({ finalScore, radarData });
      setGameState('finished');
      onComplete(finalScore, percentageBreakdown, analysis || "");
    } catch (error) {
      setAiAnalysis("現在AI分析が利用できません。スコアのみ表示します。");
      setGameState('finished');
    }
  };

  const currentQ = currentQuestions[currentIndex];

  if (gameState === 'idle') {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-fadeIn text-center space-y-10">
        <div className="space-y-4">
          <div className="text-8xl">🧠</div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">AI 知能・認知特性診断</h2>
          <p className="text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
            論理・数値・言語・空間の4項目から、あなたの「学びの特性」を明らかにします。200問の問題バンクからランダムに選ばれた6つの難問に挑戦しましょう。
          </p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm max-w-sm mx-auto space-y-6">
          <ul className="text-left text-sm font-bold text-slate-600 space-y-3">
            <li className="flex items-center gap-3"><span className="text-indigo-500">✓</span> 精選された 6 問をランダム出題</li>
            <li className="flex items-center gap-3"><span className="text-indigo-500">✓</span> 毎回内容が変わる実力診断</li>
            <li className="flex items-center gap-3"><span className="text-indigo-500">✓</span> 終了後にAI詳細レポートを生成</li>
          </ul>
          <button onClick={startTest} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95">診断を開始する</button>
        </div>
      </div>
    );
  }

  if (gameState === 'testing' && currentQ) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-fadeIn space-y-8">
        <div className="flex justify-between items-center px-4">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Question {currentIndex + 1} / {currentQuestions.length}</span>
           <div className="h-1.5 w-48 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl border border-slate-100 space-y-12">
          <div className="space-y-6 text-center">
            <span className="inline-block px-4 py-1 bg-indigo-50 text-indigo-500 text-[10px] font-black rounded-full uppercase tracking-widest">
              {currentQ.category === 'logical' ? '論理推理' : currentQ.category === 'numerical' ? '数値処理' : currentQ.category === 'verbal' ? '言語能力' : '空間把握'}
            </span>
            <h3 className="text-2xl font-black text-slate-800 leading-relaxed whitespace-pre-wrap">{currentQ.question}</h3>
            {currentQ.svgData && (
              <div className="p-8 bg-slate-50 rounded-3xl inline-block shadow-inner" dangerouslySetInnerHTML={{ __html: currentQ.svgData }} />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ.choices.map((choice, i) => (
              <button 
                key={i} 
                onClick={() => handleAnswer(choice)}
                className="bg-slate-50 border-2 border-slate-100 p-6 rounded-2xl text-lg font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-all active:scale-[0.98] text-center"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'analyzing') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-xl font-black text-slate-800">特性を分析しています...</p>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">AI is mapping your cognitive profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 animate-slideUp space-y-10">
      <header className="text-center">
        <h2 className="text-3xl font-black text-slate-800 italic">診断が完了しました</h2>
        <p className="text-slate-400 font-bold mt-1">あなたの強みと最適な学習法をAIが特定しました</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagnostic Score</p>
             <div className="flex items-baseline justify-center gap-1">
               <span className="text-7xl font-black text-indigo-600 italic tracking-tighter">{scoreData.finalScore}</span>
               <span className="text-xl font-black text-slate-300">/ 100</span>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-[400px]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">認知特性マップ</h4>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={scoreData.radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
           <div className="bg-indigo-950 text-indigo-50 p-10 md:p-12 rounded-[3rem] shadow-2xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
             <h3 className="text-xl font-black mb-8 flex items-center gap-4">
               <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl shadow-sm">💡</span>
               AI学習アドバイス
             </h3>
             <div className="prose prose-invert prose-indigo max-w-none">
               <p className="text-[15px] leading-relaxed font-bold whitespace-pre-wrap italic">
                 {aiAnalysis}
               </p>
             </div>
           </div>

           <button onClick={() => setGameState('idle')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl active:scale-[0.98]">
             メニューに戻る
           </button>
        </div>
      </div>
    </div>
  );
};

export default IQTest;
