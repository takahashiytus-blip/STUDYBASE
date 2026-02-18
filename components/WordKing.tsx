
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { validateDisplayName } from '../services/geminiService';
import { WORD_BANK, Question } from '../constants/wordData';

interface WordKingProps {
  classroomBest: number;
  classroomHolder: string;
  userId: string;
  onNewClassroomRecord: (newScore: number, holderName: string) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const TIME_LIMIT = 5.0; 
const DAILY_LIMIT = 10; // 1日10回に設定

const WordKing: React.FC<WordKingProps> = ({ classroomBest, classroomHolder, userId, onNewClassroomRecord }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'new-record'>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayChoices, setDisplayChoices] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(Number(localStorage.getItem(`wordKingHighScore_${userId}`) || 0));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isWrong, setIsWrong] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [lastQuestion, setLastQuestion] = useState<Question | null>(null);
  
  const [newHolderName, setNewHolderName] = useState('');
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [validationError, setValidationError] = useState('');

  const timerRef = useRef<number | null>(null);

  // ユーザーIDに紐づくキーを使用して、個別のカウントを管理
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDateKey = `wordKing_lastDate_${userId}`;
    const countKey = `wordKing_dailyCount_${userId}`;
    
    const lastDate = localStorage.getItem(lastDateKey);
    const savedCount = Number(localStorage.getItem(countKey) || 0);

    if (lastDate !== today) {
      localStorage.setItem(lastDateKey, today);
      localStorage.setItem(countKey, '0');
      setDailyCount(0);
    } else {
      setDailyCount(savedCount);
    }
    
    // 自身のハイスコアもリロード
    setHighScore(Number(localStorage.getItem(`wordKingHighScore_${userId}`) || 0));
  }, [userId]);

  useEffect(() => {
    if (gameState === 'playing' && questions[currentIndex]) {
      setDisplayChoices(shuffleArray(questions[currentIndex].choices));
    }
  }, [currentIndex, questions, gameState]);

  const startGame = () => {
    if (dailyCount >= DAILY_LIMIT) return;

    const shuffledQuestions = shuffleArray(WORD_BANK);
    setQuestions(shuffledQuestions);
    
    const nextCount = dailyCount + 1;
    setDailyCount(nextCount);
    localStorage.setItem(`wordKing_dailyCount_${userId}`, nextCount.toString());

    setStreak(0);
    setCurrentIndex(0);
    setTimeLeft(TIME_LIMIT);
    setIsWrong(false);
    setLastQuestion(null);
    setGameState('playing');
  };

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (streak > highScore) {
      setHighScore(streak);
      localStorage.setItem(`wordKingHighScore_${userId}`, streak.toString());
    }

    if (streak > classroomBest) {
      setGameState('new-record');
    } else {
      setGameState('gameover');
    }
  }, [streak, highScore, classroomBest, userId]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.05) {
            setLastQuestion(questions[currentIndex]);
            endGame();
            return 0;
          }
          return prev - 0.05;
        });
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, endGame, currentIndex, questions]);

  const handleAnswer = (choice: string) => {
    if (gameState !== 'playing' || !questions[currentIndex]) return;

    if (choice === questions[currentIndex].answer) {
      setStreak(prev => prev + 1);
      setTimeLeft(TIME_LIMIT); 
      
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setQuestions(shuffleArray(WORD_BANK));
        setCurrentIndex(0);
      }
    } else {
      setIsWrong(true);
      setLastQuestion(questions[currentIndex]);
      setTimeout(() => endGame(), 300);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolderName.trim()) return;
    setIsValidatingName(true);
    const result = await validateDisplayName(newHolderName);
    if (result.isValid) {
      onNewClassroomRecord(streak, newHolderName);
      setGameState('gameover');
    } else {
      setValidationError(result.reason || "不適切な名前です。");
    }
    setIsValidatingName(false);
  };

  const timerColor = timeLeft > 2.5 ? 'bg-emerald-400' : timeLeft > 1.2 ? 'bg-amber-400' : 'bg-rose-500';
  const isLimitReached = dailyCount >= DAILY_LIMIT;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fadeIn">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">英単語王 👑</h2>
          <p className="text-slate-500 font-medium italic">5秒以内に正解を選び続けろ。</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Classroom Best</p>
            <p className="text-2xl font-black text-amber-500">{classroomBest}</p>
            <p className="text-[9px] font-bold text-slate-400">by {classroomHolder}</p>
          </div>
          <div className="text-right border-l border-slate-100 pl-6">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Your Best</p>
            <p className="text-2xl font-black text-indigo-600">{highScore}</p>
          </div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="bg-white rounded-[3rem] p-12 text-center shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="relative z-10 space-y-8">
            <div className="text-8xl mb-4 drop-shadow-sm">👑</div>
            <h3 className="text-3xl font-black text-slate-800">挑戦を始めますか？</h3>
            <div className="space-y-2">
              <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
                制限時間は1問につき <span className="text-indigo-600 font-black">5秒</span>。<br/>
                本日の残り挑戦権: <span className={isLimitReached ? 'text-rose-500' : 'text-slate-800'}>{DAILY_LIMIT - dailyCount}</span> / {DAILY_LIMIT}
              </p>
              {isLimitReached && (
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  明日また挑戦しましょう！
                </p>
              )}
            </div>
            {isLimitReached ? (
              <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2rem] max-w-sm mx-auto">
                <p className="text-rose-500 font-black">本日の挑戦は終了しました。</p>
              </div>
            ) : (
              <button onClick={startGame} className="px-16 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95">挑戦を開始する</button>
            )}
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className={`bg-white rounded-[3rem] p-10 md:p-16 shadow-xl border-4 transition-all ${isWrong ? 'border-rose-500' : 'border-slate-50'}`}>
          <div className="flex justify-between items-center mb-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Streak</span>
              <span className="text-6xl font-black text-slate-800">{streak}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Left</span>
              <p className={`text-4xl font-mono font-black ${timeLeft < 1.5 ? 'text-rose-500' : 'text-slate-800'}`}>{timeLeft.toFixed(1)}s</p>
            </div>
          </div>
          <div className="text-center mb-16">
            <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Select the Japanese meaning:</p>
            <h4 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter">{questions[currentIndex]?.word}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayChoices.map((choice, i) => (
              <button key={i} onClick={() => handleAnswer(choice)} className="group bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] text-xl font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-all active:scale-[0.98] text-center">{choice}</button>
            ))}
          </div>
          <div className="mt-12 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-50 linear ${timerColor}`} style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}></div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="bg-white rounded-[3rem] p-12 text-center shadow-sm border border-slate-100 animate-slideUp">
          <div className="space-y-8">
            <h3 className="text-6xl font-black text-slate-900 tracking-tighter">GAME OVER</h3>
            {lastQuestion && (
              <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100 max-w-md mx-auto space-y-4">
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Missed Word</p>
                  <p className="text-4xl font-black text-slate-800">{lastQuestion.word}</p>
                </div>
                <div className="pt-4 border-t border-rose-200">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Correct Meaning</p>
                  <p className="text-2xl font-black text-emerald-600">{lastQuestion.answer}</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-10 py-10 border-y border-slate-50">
               <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Score</p>
                 <p className="text-5xl font-black text-slate-800">{streak}</p>
               </div>
               <div className="text-center border-l border-slate-50 pl-10">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Personal Best</p>
                 <p className="text-5xl font-black text-indigo-600">{highScore}</p>
               </div>
            </div>
            <p className="text-sm font-bold text-slate-400 italic">本日の挑戦はこれで終了です。また明日！</p>
            <button onClick={() => setGameState('idle')} className="px-12 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black">メニューに戻る</button>
          </div>
        </div>
      )}

      {gameState === 'new-record' && (
        <div className="bg-amber-400 rounded-[3rem] p-12 text-center shadow-xl border-4 border-white animate-slideUp">
          <div className="space-y-8 text-indigo-950">
            <div className="text-9xl animate-bounce">🥇</div>
            <h3 className="text-5xl font-black italic tracking-tighter">NEW RECORD!</h3>
            <div className="bg-white p-10 rounded-[2.5rem] shadow-lg max-w-md mx-auto">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-2">SCORE</p>
               <p className="text-7xl font-black mb-8 text-slate-900">{streak}</p>
               <form onSubmit={handleRecordSubmit} className="space-y-4">
                 <input type="text" required autoFocus maxLength={12} value={newHolderName} onChange={(e) => setNewHolderName(e.target.value)} className="w-full px-6 py-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-xl font-black text-center" placeholder="名前を入力" />
                 <button disabled={isValidatingName} className="w-full py-4 bg-indigo-900 text-white rounded-xl font-black text-lg">記録を保存</button>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordKing;
