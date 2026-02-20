
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [gameState, setGameState] = useState<'start' | 'playing' | 'result' | 'limit'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5); 
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [attemptsToday, setAttemptsToday] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const today = getLocalISOString();
    const storageKey = `word_king_attempts_${userId}_${today}`;
    const count = parseInt(localStorage.getItem(storageKey) || '0');
    setAttemptsToday(count);
    if (count >= 10 && gameState === 'start') {
      setGameState('limit');
    }
  }, [userId, gameState]);

  const generateQuestion = useCallback(() => {
    const q = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    setCurrentQ(q);
    setShuffledChoices([...q.choices].sort(() => Math.random() - 0.5));
    setTimeLeft(5);
  }, []);

  const startGame = () => {
    if (attemptsToday >= 10) return;

    const today = getLocalISOString();
    const storageKey = `word_king_attempts_${userId}_${today}`;
    const nextCount = attemptsToday + 1;
    localStorage.setItem(storageKey, nextCount.toString());
    setAttemptsToday(nextCount);

    setScore(0);
    setGameState('playing');
    generateQuestion();
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          endGame();
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10;
      });
    }, 100);
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
  }, [gameState, score, personalBestFromDB, classroomBest, onPersonalBestUpdate, onNewClassroomRecord]);

  const handleAnswer = (choice: string) => {
    if (choice === currentQ?.answer) {
      setScore(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        generateQuestion();
      }, 100);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        endGame();
      }, 300);
    }
  };

  if (gameState === 'limit') {
    return (
      <div className="bg-white rounded-[3rem] p-12 text-center shadow-2xl border-4 border-indigo-100 flex flex-col items-center justify-center min-h-[450px] animate-fadeIn">
        <div className="text-7xl mb-6">🚫</div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">本日の挑戦終了</h2>
        <p className="text-slate-500 font-bold mb-8">
          英単語王への挑戦は1日10回までです。<br/>
          また明日お越しください。
        </p>
        <button onClick={() => setGameState('start')} className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">メニューに戻る</button>
      </div>
    );
  }

  if (gameState === 'start') {
    return (
      <div className="bg-white rounded-[3rem] p-6 md:p-12 text-center shadow-2xl border-2 border-slate-100 flex flex-col items-center relative animate-fadeIn py-20 overflow-visible">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600 rounded-t-[3rem]"></div>
        
        <div className="z-10 w-full max-w-lg space-y-8">
          <div className="relative pt-12">
             <span className="text-9xl drop-shadow-2xl inline-block animate-bounce relative z-20">👑</span>
             <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 mt-8 leading-tight">WORD <span className="text-indigo-600">KING</span></h2>
             <p className="text-slate-400 font-black tracking-[0.4em] text-[10px] uppercase mt-2">The Ultimate Speed Challenge</p>
          </div>

          <div className="bg-indigo-50/50 rounded-[2.5rem] p-8 border-2 border-indigo-100 shadow-inner relative mt-6">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Current King</span>
            <p className="text-6xl font-black text-indigo-700 leading-none mb-2 tracking-tighter">{classroomBest} <span className="text-base font-bold opacity-40">pts</span></p>
            <p className="text-xs font-bold text-indigo-500 italic">Holder: {classroomHolder}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-2 border-slate-100 px-4 py-4 rounded-3xl shadow-sm">
              <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest text-center">Your Best</p>
              <p className="text-2xl font-black text-slate-800 text-center">{personalBestFromDB}</p>
            </div>
            <div className="bg-white border-2 border-slate-100 px-4 py-4 rounded-3xl shadow-sm">
              <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest text-center">Attempts</p>
              <p className="text-2xl font-black text-slate-800 text-center">{attemptsToday} <span className="text-xs text-slate-300">/ 10</span></p>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={startGame} 
              className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group"
            >
              挑戦を開始する
              <span className="group-hover:translate-x-2 transition-transform">➔</span>
            </button>
            <p className="text-[11px] font-black text-rose-500 mt-8 tracking-widest animate-pulse uppercase">※ 1問5秒。極限のスピード勝負。 ※</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentQ) {
    return (
      <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-2xl flex flex-col border-8 border-slate-900 relative animate-fadeIn overflow-hidden min-h-[580px]">
        <div 
          className="absolute top-0 left-0 h-4 bg-indigo-500 transition-all duration-100 linear" 
          style={{ width: `${(timeLeft / 5) * 100}%` }}
        ></div>

        <div className="flex justify-between items-center z-10 mt-6 px-4">
           <div className="bg-slate-900 px-6 py-2 rounded-full text-white font-black text-sm tracking-widest"><span className="text-[10px] text-slate-400 mr-2 uppercase">Score</span>{score}</div>
           <div className={`text-5xl font-black font-mono tracking-tighter ${timeLeft <= 1.5 ? 'text-rose-500 animate-ping' : 'text-slate-900'}`}>
             {timeLeft.toFixed(1)}s
           </div>
           <div className="bg-indigo-50 px-6 py-2 rounded-full border border-indigo-100 font-black text-indigo-600 text-xs uppercase tracking-widest">Level {Math.floor(score/10) + 1}</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center z-10 py-12">
          <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.5em] mb-6">Translation Challenge</p>
          <h3 className="text-6xl md:text-8xl font-black mb-16 tracking-tighter text-slate-900 drop-shadow-sm uppercase">{currentQ.word}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl px-4">
            {shuffledChoices.map((c, i) => (
              <button 
                key={`${currentQ.word}-${i}`} 
                onClick={() => handleAnswer(c)} 
                className="py-8 rounded-[2.5rem] bg-white border-2 border-slate-200 text-2xl font-black text-slate-800 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white hover:shadow-2xl transition-all active:scale-95 shadow-md"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md transition-all ${feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-rose-500/40'}`}>
            <span className="text-[15rem] drop-shadow-2xl animate-scaleIn">
              {feedback === 'correct' ? '⭕' : '❌'}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'result') {
    const isNewRecord = score > personalBestFromDB;
    const isNewClassRecord = score > classroomBest;

    return (
      <div className="bg-white rounded-[3rem] p-10 text-center shadow-2xl border-4 border-indigo-600 flex flex-col items-center justify-center py-20 animate-slideUp">
        <div className="text-8xl mb-8 animate-bounce">🏁</div>
        <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase text-slate-900">Challenge Over</h2>
        
        <div className="py-12 space-y-4">
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Final Score Result</p>
          <p className="text-[12rem] leading-none font-black text-indigo-600 tracking-tighter drop-shadow-sm">{score}</p>
          
          <div className="pt-8">
            {isNewClassRecord ? (
              <div className="py-4 px-10 bg-amber-50 rounded-[2rem] border-2 border-amber-200 shadow-lg">
                <p className="text-amber-600 font-black text-3xl animate-pulse uppercase tracking-widest">👑 New School Record! 👑</p>
              </div>
            ) : isNewRecord ? (
              <p className="text-emerald-500 font-black text-2xl tracking-widest">✨ Personal Best Updated! ✨</p>
            ) : (
              <p className="text-slate-400 font-black text-sm uppercase tracking-widest italic">Keep Training for the Crown.</p>
            )}
          </div>
        </div>

        <div className="flex gap-4 w-full max-w-sm mt-8">
          <button onClick={() => setGameState('start')} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black hover:bg-slate-200 transition-all uppercase tracking-widest text-[11px]">Menu</button>
          <button 
            disabled={attemptsToday >= 10}
            onClick={startGame} 
            className={`flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl shadow-indigo-200 transition-all uppercase tracking-widest text-[11px] ${attemptsToday >= 10 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 hover:-translate-y-1'}`}
          >
            {attemptsToday >= 10 ? 'No Attempts Left' : 'Try Again ➔'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
