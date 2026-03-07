
import React, { useState } from 'react';
import { TimetableEntry, Student, Instructor } from '../types';
import { generateUniqueId } from '../utils';

interface TimetableManagerProps {
  timetable: TimetableEntry[];
  students: Student[];
  instructors: Instructor[];
  onUpdate: (newTimetable: TimetableEntry[], deletedIds?: string[]) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_COLORS: Record<number, string> = {
  1: 'bg-indigo-500', 2: 'bg-rose-500', 3: 'bg-amber-500', 
  4: 'bg-emerald-500', 5: 'bg-sky-500', 6: 'bg-violet-500', 0: 'bg-slate-400'
};

const SUBJECTS = ['数学', '英語', '国語', '理科', '社会', 'その他'];
const ROOMS = ['Aブース', 'Bブース', 'Cブース', '面談室', '集団教場'];

export const TimetableManager: React.FC<TimetableManagerProps> = ({ timetable: initialTimetable, students, instructors, onUpdate }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [localTimetable, setLocalTimetable] = useState<TimetableEntry[]>(initialTimetable);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // プロップスが更新されたらローカルステートも更新（保存中または編集中以外）
  React.useEffect(() => {
    if (!isSaving && !isDirty) {
      setLocalTimetable(initialTimetable);
    }
  }, [initialTimetable, isSaving, isDirty]);

  const handleAdd = (day: number) => {
    setIsDirty(true);
    const newEntry: TimetableEntry = {
      id: generateUniqueId('t'),
      dayOfWeek: day,
      startTime: '', 
      endTime: '',   
      subject: '',   
      studentId: '', 
      instructorId: '',
      room: '',
      lessonType: 'individual',
      groupName: '',
      studentIds: []
    };
    setLocalTimetable([...localTimetable, newEntry]);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // window.confirmはiframe内で動作が不安定なため、ステートベースの確認に切り替え
    setConfirmDeleteId(id);
  };

  const executeRemove = async (id: string) => {
    setIsSaving(true);
    try {
      const nextTimetable = localTimetable.filter(t => t.id !== id);
      // 削除は即座にデータベースに反映させる（ユーザーの期待に合わせる）
      await onUpdate(nextTimetable, [id]);
      setLocalTimetable(nextTimetable);
      setConfirmDeleteId(null);
      setIsDirty(false);
    } catch (e) {
      console.error("[TimetableManager] Remove Error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (id: string, updates: Partial<TimetableEntry>) => {
    setIsDirty(true);
    setLocalTimetable(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  /**
   * 厳密なバリデーション付き保存
   */
  const handleSaveAll = async () => {
    // 1. バリデーションチェック
    const incompleteEntries = localTimetable.filter(t => {
      const isIndividual = !t.lessonType || t.lessonType === 'individual';
      if (isIndividual) {
        return !t.studentId || !t.instructorId || !t.startTime || !t.endTime || !t.subject;
      } else {
        // 集団授業の場合は生徒IDは不要だが、授業名が必要
        return !t.groupName || !t.instructorId || !t.startTime || !t.endTime || !t.subject;
      }
    });

    if (incompleteEntries.length > 0) {
      alert('未入力の項目がある授業枠があります。全ての項目を埋めるか、不要な枠を削除してから保存してください。');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(localTimetable, deletedIds);
      setDeletedIds([]);
      setIsDirty(false);
    } catch (e) {
      console.error("Save Error", e);
    } finally {
      setIsSaving(false);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = async () => {
    const allIds = localTimetable.map(t => t.id);
    if (allIds.length === 0) {
      setShowClearConfirm(false);
      return;
    }

    setIsSaving(true);
    try {
      // 全削除は即座にデータベースに反映させる
      await onUpdate([], allIds);
      setLocalTimetable([]);
      setDeletedIds([]);
      setIsDirty(false);
      setShowClearConfirm(false);
    } catch (e) {
      console.error("[TimetableManager] Clear All Error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const selectBaseStyle = "w-full bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-[14px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm appearance-none cursor-pointer relative z-10";
  const timeInputStyle = "w-full min-w-[120px] bg-white text-[15px] font-black text-indigo-600 px-3 py-2.5 rounded-xl outline-none border-2 border-indigo-100 focus:border-indigo-500 transition-all relative z-10";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">時間割管理</h2>
          <p className="text-slate-500 font-medium">編集内容は右下の「変更を確定して保存」で反映されます。</p>
        </div>
        <div className="flex gap-3">
          {localTimetable.length > 0 && (
            <div className="relative">
              {!showClearConfirm ? (
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                >
                  🗑️ 全て削除
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-600 p-1 rounded-2xl shadow-lg animate-scaleIn">
                  <span className="text-[10px] font-black text-white px-3">本当に削除？</span>
                  <button 
                    onClick={handleClearAll}
                    className="bg-white text-rose-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-50 transition-colors"
                  >
                    はい
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-800 transition-colors"
                  >
                    いいえ
                  </button>
                </div>
              )}
            </div>
          )}
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`fixed bottom-8 right-8 z-[200] px-10 py-5 rounded-[2rem] font-black text-white shadow-2xl transition-all active:scale-95 flex items-center gap-3 ${isSaving ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : '💾'}
            変更を確定して保存
          </button>
        </div>
      </header>

      <div className="flex overflow-x-auto pb-8 gap-5 snap-x custom-scrollbar -mx-4 px-4">
        {[1, 2, 3, 4, 5, 6, 0].map(day => (
          <div key={day} className="min-w-[340px] flex-1 snap-start flex flex-col gap-5">
            <div className={`p-5 rounded-[2rem] ${DAY_COLORS[day]} text-white shadow-xl flex justify-between items-center ring-4 ring-white/50 shrink-0`}>
              <span className="text-base font-black tracking-widest">{DAY_NAMES[day]}曜日</span>
              <button 
                type="button"
                onClick={() => handleAdd(day)} 
                className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/40 flex items-center justify-center font-black transition-all active:scale-90 shadow-inner"
              >
                <span className="text-3xl">＋</span>
              </button>
            </div>
            
            <div className="space-y-6 min-h-[650px] bg-slate-100/50 p-4 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              {localTimetable.filter(t => t.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(item => (
                <div key={item.id} className={`bg-white p-6 rounded-[2.2rem] border shadow-md relative group transition-all border-l-8 ${
                  item.lessonType === 'group' ? 'border-l-emerald-500 border-emerald-100' : 'border-l-indigo-500 border-slate-200'
                }`}>
                   
                   <button 
                     type="button"
                     onClick={(e) => handleRemove(item.id, e)} 
                     className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl z-[100] hover:bg-rose-600 active:scale-75 border-4 border-white transition-all cursor-pointer pointer-events-auto"
                     aria-label="削除"
                   >
                     <span className="text-xl font-black">✕</span>
                   </button>

                   {confirmDeleteId === item.id && (
                     <div className="absolute inset-0 z-[150] bg-rose-600/95 backdrop-blur-sm rounded-[2.2rem] flex flex-col items-center justify-center p-6 text-white animate-fadeIn">
                       <p className="font-black text-lg mb-4">この授業枠を削除しますか？</p>
                       <div className="flex gap-3 w-full">
                         <button 
                           onClick={() => setConfirmDeleteId(null)}
                           className="flex-1 py-3 bg-white/20 rounded-xl font-bold hover:bg-white/30 transition-all"
                         >
                           キャンセル
                         </button>
                         <button 
                           onClick={() => executeRemove(item.id)}
                           className="flex-1 py-3 bg-white text-rose-600 rounded-xl font-black hover:bg-rose-50 transition-all shadow-lg"
                         >
                           削除する
                         </button>
                       </div>
                     </div>
                   )}

                   {/* 授業タイプ切り替え */}
                   <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
                     <button 
                       onClick={() => handleEdit(item.id, { lessonType: 'individual' })}
                       className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${(!item.lessonType || item.lessonType === 'individual') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                     >
                       個別指導
                     </button>
                     <button 
                       onClick={() => handleEdit(item.id, { lessonType: 'group' })}
                       className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${item.lessonType === 'group' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                     >
                       集団授業
                     </button>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">開始</label>
                        <input 
                          type="time" 
                          value={item.startTime} 
                          onChange={e => handleEdit(item.id, { startTime: e.target.value })} 
                          className={timeInputStyle + (!item.startTime ? " border-rose-300 bg-rose-50/30" : "")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">終了</label>
                        <input 
                          type="time" 
                          value={item.endTime} 
                          onChange={e => handleEdit(item.id, { endTime: e.target.value })} 
                          className={timeInputStyle + (!item.endTime ? " border-rose-300 bg-rose-50/30" : "")}
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">科目</label>
                       <select 
                          value={item.subject} 
                          onChange={e => handleEdit(item.id, { subject: e.target.value })}
                          className={selectBaseStyle + (!item.subject ? " border-rose-200" : " border-indigo-100 bg-indigo-50/30")}
                       >
                         <option value="">-- 未設定 --</option>
                         {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">教室</label>
                       <select 
                          value={item.room} 
                          onChange={e => handleEdit(item.id, { room: e.target.value })}
                          className={selectBaseStyle + (!item.room ? " border-rose-200" : "")}
                       >
                         <option value="">-- 未設定 --</option>
                         {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                     </div>
                   </div>

                   <div className="space-y-4">
                     {(!item.lessonType || item.lessonType === 'individual') ? (
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">生徒名</label>
                          <select 
                              value={item.studentId || ''} 
                              onChange={e => handleEdit(item.id, { studentId: e.target.value })}
                              className={selectBaseStyle + (!item.studentId ? " border-rose-200 bg-rose-50 text-rose-500" : "")}
                          >
                            <option value="">-- 未選択 --</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                          </select>
                       </div>
                     ) : (
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">授業名・クラス名</label>
                             <input 
                               type="text"
                               placeholder="例: 中3数学集団"
                               value={item.groupName || ''}
                               onChange={e => handleEdit(item.id, { groupName: e.target.value })}
                               className={selectBaseStyle + (!item.groupName ? " border-rose-200 bg-rose-50" : " border-emerald-100 bg-emerald-50/30")}
                             />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">受講生を選択</label>
                             <div className="max-h-32 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                               {students.map(s => (
                                 <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                                   <input 
                                     type="checkbox"
                                     checked={(item.studentIds || []).includes(s.id)}
                                     onChange={e => {
                                       const currentIds = item.studentIds || [];
                                       const nextIds = e.target.checked 
                                         ? [...currentIds, s.id]
                                         : currentIds.filter(id => id !== s.id);
                                       handleEdit(item.id, { studentIds: nextIds });
                                     }}
                                     className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                   />
                                   <span className="text-[11px] font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">{s.name} ({s.grade})</span>
                                 </label>
                               ))}
                             </div>
                          </div>
                       </div>
                     )}

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">担当講師</label>
                        <select 
                            value={item.instructorId || ''} 
                            onChange={e => handleEdit(item.id, { instructorId: e.target.value })}
                            className={selectBaseStyle + (!item.instructorId ? " border-rose-200 bg-rose-50 text-rose-500" : " border-indigo-100 text-indigo-600")}
                        >
                          <option value="">-- 未選択 --</option>
                          {instructors.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
                        </select>
                     </div>
                   </div>
                </div>
              ))}
              {localTimetable.filter(t => t.dayOfWeek === day).length === 0 && (
                <div className="py-24 text-center opacity-10">
                   <span className="text-6xl">📅</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
