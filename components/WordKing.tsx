import React, { useState, useEffect, useCallback, useRef } from 'react';
import { validateDisplayName } from '../services/geminiService';
import { WORD_BANK, Question } from '../constants/wordData';
import { getLocalISOString } from '../utils';

interface WordKingProps {
  classroomBest: number;
  classroomHolder: string;
  userId: string;
  personalBestFromDB: number; 
  onPersonalBestUpdate: (newScore: number) => void; 
  onNewClassroomRecord: (newScore: number, holderName: string) => void;
}

export const WordKing: React.FC<WordKingProps> = ({ 
  classroomBest, classroomHolder, userId, personalBestFromDB, 
  onPersonalBestUpdate, onNewClassroomRecord 
}) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'result'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<number | null>(null);

  const generateQuestion = useCallback(() => {
    const q = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    setCurrentQ(q);
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setMultiplier(1);
    setGameState('playing');
    generateQuestion();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('result');
  };

  useEffect(() => {
    if (gameState === 'result') {
      if (score > personalBestFromDB) onPersonalBestUpdate(score);
      if (score > classroomBest) onNewClassroomRecord(score, "You");
    }
  }, [gameState, score, personalBestFromDB, classroomBest]);

  const handleAnswer = (choice: string) => {
    if (choice === currentQ?.answer) {
      const addedScore = 10 * multiplier;
      setScore(prev => prev + addedScore);
      setCombo(prev => prev + 1);
      setMultiplier(prev => Math.min(5, 1 + Math.floor((combo + 1) / 5)));
      setFeedback('correct');
      setTimeout(() => { setFeedback(null); generateQuestion(); }, 200);
    } else {
      setCombo(0);
      setMultiplier(1);
      setFeedback('wrong');
      setTimeout(() => { setFeedback(null); generateQuestion(); }, 400);
    }
  };

  if (gameState === 'start') {
    return (
      <div className="bg-slate-900 rounded-[3rem] p-12 text-center text-white shadow-2xl relative overflow-hidden h-[70vh] flex flex-col items-center justify-center border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="z-10 space-y-8">
          <div className="text-8xl mb-4">👑</div>
          <h2 className="text-5xl font-black tracking-tighter italic">WORD <span className="text-indigo-400">KING</span></h2>
          <div className="flex gap-4 justify-center">
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl"><p className="text-[10px] text-slate-500 font-black mb-1">PERSONAL BEST</p><p className="text-2xl font-black">{personalBestFromDB}</p></div>
            <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-4 rounded-2xl"><p className="text-[10px] text-amber-500 font-black mb-1">CLASSROOM RECORD</p><p className="text-2xl font-black text-amber-400">{classroomBest} ({classroomHolder})</p></div>
          </div>
          <button onClick={startGame} className="px-16 py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xl hover:bg-indigo-400 hover:text-white transition-all active:scale-95 shadow-xl">START GAME</button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentQ) {
    return (
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white min-h-[70vh] flex flex-col border border-white/5 relative overflow-hidden">
        <div className="flex justify-between items-center z-10">
           <div className="bg-white/10 px-6 py-2 rounded-full border border-white/5"><span className="text-xs font-black text-indigo-300">SCORE:</span> <span className="text-xl font-black ml-2">{score}</span></div>
           <div className={`text-3xl font-black font-mono ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>{timeLeft}s</div>
           <div className="bg-white/10 px-6 py-2 rounded-full border border-white/5"><span className="text-xs font-black text-amber-400">×{multiplier}</span></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center z-10 py-10">
          <h3 className="text-6xl font-black mb-4 tracking-tight">{currentQ.word}</h3>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.4em] mb-12">Select the meaning</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
            {currentQ.choices.map((c, i) => (
              <button key={i} onClick={() => handleAnswer(c)} className="py-6 rounded-[1.5rem] bg-white/5 border-2 border-white/10 text-lg font-black hover:bg-white/10 hover:border-indigo-500 transition-all active:scale-95">{c}</button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm transition-opacity ${feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
            <span className="text-9xl font-black drop-shadow-2xl">{feedback === 'correct' ? '⭕' : '❌'}</span>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl border border-slate-100 animate-fadeIn">
        <div className="text-6xl mb-6">🏁</div>
        <h2 className="text-4xl font-black text-slate-800 mb-2">TIME UP!</h2>
        <div className="py-10 space-y-4">
          <p className="text-slate-400 font-black uppercase tracking-[0.2em]">Final Score</p>
          <p className="text-8xl font-black text-indigo-600">{score}</p>
          {score > personalBestFromDB && <p className="text-emerald-500 font-black animate-bounce text-xl">NEW PERSONAL BEST! 👑</p>}
        </div>
        <div className="flex gap-4 max-w-md mx-auto">
          <button onClick={() => setGameState('start')} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all">EXIT</button>
          <button onClick={startGame} className="flex-2 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">TRY AGAIN</button>
        </div>
      </div>
    );
  }

  return null;
};
