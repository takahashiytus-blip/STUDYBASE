
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateWordQuiz, validateDisplayName } from '../services/geminiService';

interface Question {
  word: string;
  choices: string[];
  answer: string;
}

interface WordKingProps {
  classroomBest: number;
  classroomHolder: string;
  onNewClassroomRecord: (newScore: number, holderName: string) => void;
}

const INITIAL_QUESTIONS: Question[] = [
  { word: "comprehend", choices: ["理解する", "競争する", "圧縮する", "補償する"], answer: "理解する" },
  { word: "vulnerable", choices: ["脆弱な", "貴重な", "多様な", "強力な"], answer: "脆弱な" },
  { word: "reluctant", choices: ["気が進まない", "信頼できる", "関連がある", "寛大な"], answer: "気が進まない" },
  { word: "substantially", choices: ["かなり", "密かに", "一時的に", "正確に"], answer: "かなり" },
  { word: "take after", choices: ["似ている", "世話をする", "調査する", "追いかける"], answer: "似ている" }
];

const TIME_LIMIT = 5.0; 
const DAILY_LIMIT = 10; // 1日の挑戦上限

const WordKing: React.FC<WordKingProps> = ({ classroomBest, classroomHolder, onNewClassroomRecord }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'loading' | 'new-record'>('idle');
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(Number(localStorage.getItem('wordKingHighScore') || 0));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isWrong, setIsWrong] = useState(false);
  
  // 1日の回数制限用
  const [dailyCount, setDailyCount] = useState(0);
  
  // 新記録用
  const [newHolderName, setNewHolderName] = useState('');
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [validationError, setValidationError] = useState('');

  const timerRef = useRef<number | null>(null);

  // 初回ロード時に今日の挑戦回数を確認
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('wordKing_lastDate');
    const savedCount = Number(localStorage.getItem('wordKing_dailyCount') || 0);

    if (lastDate !== today) {
      // 日付が変わっていればリセット
      localStorage.setItem('wordKing_lastDate', today);
      localStorage.setItem('wordKing_dailyCount', '0');
      setDailyCount(0);
    } else {
      setDailyCount(savedCount);
    }
  }, []);

  const startGame = async () => {
    if (dailyCount >= DAILY_LIMIT) return;

    setGameState('loading');
    const newQuiz = await generateWordQuiz('高校');
    
    // カウントを増やす
    const nextCount = dailyCount + 1;
    setDailyCount(nextCount);
    localStorage.setItem('wordKing_dailyCount', nextCount.toString());

    if (newQuiz && Array.isArray(newQuiz)) {
      setQuestions(newQuiz);
    } else {
      setQuestions(INITIAL_QUESTIONS);
    }
    setStreak(0);
    setCurrentIndex(0);
    setTimeLeft(TIME_LIMIT);
    setIsWrong(false);
    setGameState('playing');
  };

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // 個人ベスト更新
    if (streak > highScore) {
      setHighScore(streak);
      localStorage.setItem('wordKingHighScore', streak.toString());
    }

    // 教室記録更新チェック
    if (streak > classroomBest) {
      setGameState('new-record');
    } else {
      setGameState('gameover');
    }
  }, [streak, highScore, classroomBest]);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolderName.trim()) return;

    setIsValidatingName(true);
    setValidationError('');
    
    const result = await validateDisplayName(newHolderName);
    
    if (result.isValid) {
      onNewClassroomRecord(streak, newHolderName);
      setGameState('gameover');
    } else {
      setValidationError(result.reason || "不適切な名前です。変更してください。");
    }
    setIsValidatingName(false);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.05) {
            endGame();
            return 0;
          }
          return prev - 0.05;
        });
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, endGame]);

  const handleAnswer = (choice: string) => {
    if (gameState !== 'playing') return;

    if (choice === questions[currentIndex].answer) {
      setStreak(prev => prev + 1);
      setTimeLeft(TIME_LIMIT); 
      
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
      }
    } else {
      setIsWrong(true);
      setTimeout(() => endGame(), 300);
    }
  };

  const timerColor = timeLeft > 2.5 ? 'bg-emerald-400' : timeLeft > 1.2 ? 'bg-amber-400' : 'bg-rose-500';
  const isLimitReached = dailyCount >= DAILY_LIMIT;

  if (gameState === 'loading') {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center animate-fadeIn">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black tracking-widest uppercase text-xs">Generating Quiz Stage...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fadeIn">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">英単語王 👑</h2>
          <p className="text-slate-500 font-medium italic">5秒の壁を超え、語彙の頂点へ。</p>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Classroom Record</p>
            <p className="text-2xl font-black text-amber-500">{classroomBest} <span className="text-xs">COMBO</span></p>
            <p className="text-[9px] font-bold text-slate-400 tracking-tighter">by {classroomHolder}</p>
          </div>
          <div className="text-right border-l border-slate-100 pl-8">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Personal Best</p>
            <p className="text-2xl font-black text-indigo-600">{highScore} <span className="text-xs">COMBO</span></p>
          </div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 space-y-8">
            <div className="text-8xl mb-4">👑</div>
            <h3 className="text-3xl font-black text-white uppercase">Ready to Rule?</h3>
            <div className="space-y-4">
              <p className="text-indigo-200 font-bold max-w-md mx-auto leading-relaxed">
                制限時間は1問につき <span className="text-amber-400 text-xl">5秒</span>。<br/>
                現在の王 <span className="text-white text-xl">{classroomHolder}</span> の記録 <br/>
                <span className="text-amber-400 text-3xl font-black tracking-widest">{classroomBest}</span> コンボを打ち破れ！
              </p>
              
              <div className="bg-white/5 inline-block px-6 py-2 rounded-full border border-white/10">
                <p className="text-sm font-black text-indigo-300">
                  今日の残り挑戦回数: <span className={isLimitReached ? 'text-rose-500' : 'text-white'}>{DAILY_LIMIT - dailyCount}</span> / {DAILY_LIMIT}
                </p>
              </div>
            </div>

            {isLimitReached ? (
              <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-sm mx-auto">
                <p className="text-rose-400 font-black">本日の挑戦上限に達しました。<br/><span className="text-xs font-bold opacity-70">また明日挑戦しましょう！</span></p>
              </div>
            ) : (
              <button 
                onClick={startGame}
                className="px-12 py-5 bg-white text-indigo-900 rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                挑戦を開始する
              </button>
            )}
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className={`bg-slate-900 rounded-[3rem] p-8 md:p-16 shadow-2xl transition-all ${isWrong ? 'ring-8 ring-rose-500/50 bg-rose-900/20' : ''}`}>
          <div className="flex justify-between items-center mb-12">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Current Streak</span>
              <span className="text-5xl font-black text-white animate-pulse">{streak} <span className="text-xl">COMBO</span></span>
            </div>
            <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center relative">
              <span className={`text-4xl font-mono font-black ${timeLeft < 1.5 ? 'text-rose-500' : 'text-white'}`}>
                {timeLeft.toFixed(1)}
              </span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                <circle 
                  cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" 
                  className={timeLeft < 1.5 ? 'text-rose-500' : 'text-indigo-500'}
                  strokeDasharray={276}
                  strokeDashoffset={276 - (276 * timeLeft / TIME_LIMIT)}
                  style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                />
              </svg>
            </div>
          </div>

          <div className="text-center mb-16">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">Select the Japanese meaning of:</p>
            <h4 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg">{questions[currentIndex].word}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions[currentIndex].choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(choice)}
                className="group relative bg-white/5 border-2 border-white/10 p-6 rounded-2xl text-lg font-bold text-white hover:bg-white/10 hover:border-indigo-400 transition-all text-left flex items-center gap-4 active:scale-95"
              >
                <span className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xs text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{i + 1}</span>
                {choice}
              </button>
            ))}
          </div>

          {/* Time Bar */}
          <div className="mt-12 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className={`h-full transition-all duration-50 linear ${timerColor}`}
              style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {gameState === 'new-record' && (
        <div className="bg-amber-400 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden animate-slideUp">
          <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>
          <div className="relative z-10 space-y-8 text-indigo-900">
            <div className="text-8xl mb-4 animate-bounce">🥇</div>
            <h3 className="text-5xl font-black uppercase italic tracking-tighter">New Classroom Record!</h3>
            <div className="bg-white/90 p-8 rounded-3xl shadow-lg border-2 border-amber-500 max-w-md mx-auto">
               <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">Record Score</p>
               <p className="text-6xl font-black mb-6">{streak} <span className="text-xl">COMBO</span></p>
               
               <form onSubmit={handleRecordSubmit} className="space-y-4">
                 <label className="block text-sm font-black text-indigo-900 text-left ml-2">称号を入力してください（ニックネーム可）</label>
                 <input 
                   type="text" 
                   required
                   autoFocus
                   maxLength={10}
                   value={newHolderName}
                   onChange={(e) => setNewHolderName(e.target.value)}
                   placeholder="例: 無敵の単語王"
                   className="w-full px-6 py-4 rounded-2xl bg-white border-2 border-indigo-100 outline-none text-lg font-black focus:border-indigo-600 transition-all"
                 />
                 {validationError && (
                   <p className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">{validationError}</p>
                 )}
                 <button 
                   disabled={isValidatingName}
                   className="w-full py-5 bg-indigo-900 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                 >
                   {isValidatingName ? "検閲中..." : "記録を刻む 🖋️"}
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl border-4 border-rose-500 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-6">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Time Up or Mistake</p>
            <h3 className="text-6xl font-black text-slate-900 tracking-tighter">GAME OVER</h3>
            
            <div className="flex justify-center gap-8 py-8 border-y border-slate-50">
               <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Streak</p>
                 <p className="text-5xl font-black text-slate-800">{streak}</p>
               </div>
               <div className="text-center border-l border-slate-100 pl-8">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Personal Best</p>
                 <p className="text-5xl font-black text-indigo-600">{highScore}</p>
               </div>
               <div className="text-center border-l border-slate-100 pl-8">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Classroom Best</p>
                 <p className="text-5xl font-black text-amber-500">{classroomBest}</p>
                 <p className="text-[8px] font-bold text-slate-300">by {classroomHolder}</p>
               </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 max-w-sm mx-auto mb-8">
              <p className="text-sm font-bold text-slate-600">
                {streak >= classroomBest ? "👑 歴史を塗り替えた！教室新記録です！" : 
                 streak >= highScore ? "🔥 自己ベスト更新！素晴らしい集中力です！" : 
                 "次こそは記録を塗り替えよう！"}
              </p>
            </div>

            <div className="flex flex-col gap-4 items-center">
               <button 
                 onClick={startGame}
                 disabled={isLimitReached}
                 className={`px-10 py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 ${isLimitReached ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
               >
                 {isLimitReached ? '挑戦回数上限です' : 'もう一度挑戦する ↺'}
               </button>
               <p className="text-xs font-bold text-slate-400">今日の残り挑戦回数: {DAILY_LIMIT - dailyCount}回</p>
            </div>
          </div>
        </div>
      )}

      {/* Rules Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
           <div className="text-2xl">⏳</div>
           <div>
             <h5 className="font-bold text-slate-800 text-sm">5秒制限</h5>
             <p className="text-xs text-slate-400 font-medium">1問につき5秒。直感で日本語訳を選べ。</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
           <div className="text-2xl">⚡</div>
           <div>
             <h5 className="font-bold text-slate-800 text-sm">コンボボーナス</h5>
             <p className="text-xs text-slate-400 font-medium">正解を続けるほど、集中力が研ぎ澄まされる。</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
           <div className="text-2xl">🚫</div>
           <div>
             <h5 className="font-bold text-slate-800 text-sm">1日10回制限</h5>
             <p className="text-xs text-slate-400 font-medium">1回の挑戦を大切に。集中して臨もう。</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WordKing;
