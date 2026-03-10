
import React, { useState, useMemo } from 'react';
import { InterviewSlot, InterviewRecord, Student, Instructor, UserRole } from '../types';
import { generateUniqueId, getLocalISOString } from '../utils';

interface InterviewManagementProps {
  slots: InterviewSlot[];
  records: InterviewRecord[];
  students: Student[];
  instructors: Instructor[];
  currentUser: { id: string; name: string; role: UserRole };
  onUpdateSlots: (newSlots: InterviewSlot[], deletedIds?: string[]) => void;
  onUpdateRecords: (newRecords: InterviewRecord[], deletedIds?: string[]) => void;
}

export const InterviewManagement: React.FC<InterviewManagementProps> = ({
  slots = [],
  records = [],
  students = [],
  instructors = [],
  currentUser,
  onUpdateSlots,
  onUpdateRecords
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'slots' | 'records'>('slots');
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  // Slot Form State
  const [slotDate, setSlotDate] = useState(getLocalISOString().split('T')[0]);
  const [slotStart, setSlotStart] = useState('18:00');
  const [slotEnd, setSlotEnd] = useState('18:30');

  // Record Form State
  const [recordSid, setRecordSid] = useState('');
  const [viewSid, setViewSid] = useState('');
  const [recordContent, setRecordContent] = useState('');
  const [recordNext, setRecordNext] = useState('');
  const [expandedAiRecId, setExpandedAiRecId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const isInstructor = currentUser.role === 'instructor';
  const isParent = currentUser.role === 'student' || currentUser.role === 'parent';

  const handleAddSlot = () => {
    const newSlot: InterviewSlot = {
      id: generateUniqueId('islot'),
      interviewerId: currentUser.id,
      interviewerName: currentUser.name,
      date: slotDate,
      startTime: slotStart,
      endTime: slotEnd,
      status: 'available'
    };
    onUpdateSlots([...slots, newSlot]);
    setIsAddingSlot(false);
  };

  const handleBookSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    const student = students.find(s => s.id === currentUser.id);
    const updatedSlot: InterviewSlot = {
      ...slot,
      status: 'booked',
      studentId: currentUser.id,
      studentName: currentUser.name,
      parentName: student?.parentName || currentUser.name
    };
    onUpdateSlots(slots.map(s => s.id === slotId ? updatedSlot : s));
    alert('面談を予約しました。教室からの確定をお待ちください。');
  };

  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const handleConfirmSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    onUpdateSlots(slots.map(s => s.id === slotId ? { ...slot, status: 'confirmed' } : s));
    alert('面談日程を確定しました。通知を送信しました（シミュレーション）。');
  };

  const handleDeleteSlot = (id: string) => {
    onUpdateSlots(slots.filter(s => s.id !== id), [id]);
    setDeletingSlotId(null);
  };

  const handleAddRecord = () => {
    if (!recordSid) return;
    const newRecord: InterviewRecord = {
      id: generateUniqueId('irec'),
      studentId: recordSid,
      date: getLocalISOString().split('T')[0],
      interviewerId: currentUser.id,
      interviewerName: currentUser.name,
      content: recordContent,
      nextActions: recordNext
    };
    onUpdateRecords([...records, newRecord]);
    setIsAddingRecord(false);
    setRecordContent('');
    setRecordNext('');
  };

  const filteredSlots = useMemo(() => {
    if (isAdmin) return slots;
    if (isInstructor) return slots.filter(s => s.interviewerId === currentUser.id || s.status === 'confirmed');
    // Parents see available slots or their own booked/confirmed slots
    return slots.filter(s => s.status === 'available' || s.studentId === currentUser.id);
  }, [slots, currentUser, isAdmin, isInstructor]);

  const sortedSlots = [...filteredSlots].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const filteredRecords = useMemo(() => {
    let base = records;
    if (!isAdmin && !isInstructor) {
      base = records.filter(r => r.studentId === currentUser.id);
    } else if (viewSid) {
      base = records.filter(r => r.studentId === viewSid);
    }
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [records, currentUser, isAdmin, isInstructor, viewSid]);

  const handleDeleteRecord = (id: string) => {
    onUpdateRecords(records.filter(r => r.id !== id), [id]);
    setDeletingRecordId(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {isAdmin || isInstructor ? '面談管理システム' : '面談予約・記録'}
          </h2>
          <p className="text-slate-500 font-medium">
            {isAdmin || isInstructor 
              ? '日程調整から記録保存まで、面談業務をワンストップでサポートします' 
              : '面談の日程調整や過去の面談記録を確認できます'}
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setActiveSubTab('slots')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeSubTab === 'slots' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>日程調整</button>
          <button onClick={() => setActiveSubTab('records')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeSubTab === 'records' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>面談記録</button>
        </div>
      </header>

      {activeSubTab === 'slots' ? (
        <div className="space-y-6">
          {(isAdmin || isInstructor) && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black flex items-center gap-2"><span>📅</span> 空き時間の登録</h3>
                <button onClick={() => setIsAddingSlot(!isAddingSlot)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all">
                  {isAddingSlot ? '閉じる' : '新規枠を追加'}
                </button>
              </div>
              
              {isAddingSlot && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-slideDown bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">日付</label>
                    <input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">開始</label>
                    <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">終了</label>
                    <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <button onClick={handleAddSlot} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg">登録する</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSlots.map(slot => (
              <div key={slot.id} className={`p-6 rounded-[2.5rem] border-2 transition-all shadow-sm ${
                slot.status === 'confirmed' ? 'bg-emerald-50 border-emerald-100' : 
                slot.status === 'booked' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    slot.status === 'confirmed' ? 'bg-emerald-500 text-white' : 
                    slot.status === 'booked' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {slot.status === 'confirmed' ? '確定済み' : slot.status === 'booked' ? '予約あり' : '受付中'}
                  </span>
                  <span className="text-xs font-black text-slate-400">{slot.date}</span>
                </div>
                
                <div className="mb-6 relative group/slot">
                  {(isAdmin || isInstructor) && (
                    <>
                      {deletingSlotId !== slot.id ? (
                        <button 
                          onClick={() => setDeletingSlotId(slot.id)}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-all hover:bg-rose-500 hover:text-white z-10"
                          title="枠を削除"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-rose-600 p-1 rounded-lg shadow-xl z-20 animate-scaleIn">
                          <button 
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="bg-white text-rose-600 px-2 py-1 rounded text-[10px] font-black hover:bg-rose-50 transition-colors"
                          >
                            削除
                          </button>
                          <button 
                            onClick={() => setDeletingSlotId(null)}
                            className="bg-rose-700 text-white px-2 py-1 rounded text-[10px] font-black hover:bg-rose-800 transition-colors"
                          >
                            止める
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <p className="text-2xl font-black text-slate-800">{slot.startTime} <span className="text-sm font-bold text-slate-400">〜</span> {slot.endTime}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">担当: {slot.interviewerName}</p>
                </div>

                {slot.status === 'available' && isParent && (
                  <button onClick={() => handleBookSlot(slot.id)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all">この枠で予約する</button>
                )}

                {slot.status === 'booked' && (isAdmin || isInstructor) && (
                  <div className="space-y-3">
                    <div className="p-3 bg-white/50 rounded-xl border border-amber-200">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-1">予約者</p>
                      <p className="text-sm font-black text-slate-700">{slot.studentName} 様 ({slot.parentName} 様)</p>
                    </div>
                    <button onClick={() => handleConfirmSlot(slot.id)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all">日程を確定する</button>
                  </div>
                )}

                {slot.status === 'confirmed' && (
                  <div className="p-3 bg-white/50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">参加者</p>
                    <p className="text-sm font-black text-slate-700">{slot.studentName} 様</p>
                  </div>
                )}
              </div>
            ))}
            {sortedSlots.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">表示できる面談枠がありません</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {(isAdmin || isInstructor) && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black flex items-center gap-2"><span>📝</span> 面談記録の作成</h3>
                <button onClick={() => setIsAddingRecord(!isAddingRecord)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all">
                  {isAddingRecord ? '閉じる' : '新規記録を作成'}
                </button>
              </div>

              {isAddingRecord && (
                <div className="space-y-6 animate-slideDown bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">対象生徒</label>
                      <select value={recordSid} onChange={e => setRecordSid(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-500">
                        <option value="">生徒を選択</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">面談内容・相談事項</label>
                    <textarea value={recordContent} onChange={e => setRecordContent(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-500" placeholder="面談での話し合いの内容を記入してください" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">次回までのアクション</label>
                    <textarea value={recordNext} onChange={e => setRecordNext(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-indigo-500" placeholder="宿題の増量、志望校の再検討など" />
                  </div>
                  <button onClick={handleAddRecord} disabled={!recordSid || !recordContent} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all disabled:bg-slate-300">記録を保存する</button>
                </div>
              )}
            </div>
          )}

          {(isAdmin || isInstructor) && (
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">表示フィルタ:</span>
              <select 
                value={viewSid} 
                onChange={e => setViewSid(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-indigo-500"
              >
                <option value="">全生徒の記録を表示</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
              </select>
            </div>
          )}

          <div className="space-y-6">
            {filteredRecords.map(record => {
              const student = students.find(s => s.id === record.studentId);
              return (
                <div key={record.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative group">
                  {(isAdmin || isInstructor) && (
                    <div className="absolute top-8 right-8 z-20">
                      {deletingRecordId !== record.id ? (
                        <button 
                          onClick={() => setDeletingRecordId(record.id)}
                          className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                          title="削除"
                        >
                          🗑️
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-rose-600 p-1 rounded-xl shadow-xl animate-scaleIn">
                          <button 
                            onClick={() => handleDeleteRecord(record.id)}
                            className="bg-white text-rose-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-rose-50 transition-colors"
                          >
                            削除
                          </button>
                          <button 
                            onClick={() => setDeletingRecordId(null)}
                            className="bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-rose-800 transition-colors"
                          >
                            止める
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-black">
                        {student?.name?.charAt(0) || '👤'}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800">{student?.name || '不明な生徒'}</h4>
                        <p className="text-xs font-bold text-slate-400">{record.date} • 担当: {record.interviewerName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">面談内容</p>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{record.content}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">次回までのアクション</p>
                      <div className="p-5 bg-rose-50/30 rounded-2xl border border-rose-100">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{record.nextActions}</p>
                      </div>
                    </div>
                  </div>

                  {record.aiMaterial && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <button 
                        onClick={() => setExpandedAiRecId(expandedAiRecId === record.id ? null : record.id)}
                        className="text-xs font-black text-indigo-600 flex items-center gap-2 hover:text-indigo-700 transition-colors"
                      >
                        {expandedAiRecId === record.id ? '🔼 AI分析詳細を閉じる' : '🔽 AI分析詳細を表示'}
                      </button>
                      {expandedAiRecId === record.id && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                          <div className="space-y-4">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                              <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">成長点と強み</p>
                              <p className="text-xs font-bold text-slate-700 leading-relaxed">{record.aiMaterial.growthPoints}</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                              <p className="text-[9px] font-black text-rose-600 uppercase mb-2">現在の課題</p>
                              <p className="text-xs font-bold text-slate-700 leading-relaxed">{record.aiMaterial.challenges}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                              <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">推奨校（公立/私立）</p>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-600">公立: {record.aiMaterial.suggestedSchools.public.challenge.join(', ')} / {record.aiMaterial.suggestedSchools.public.realistic.join(', ')}</p>
                                <p className="text-[10px] font-bold text-slate-600">私立: {record.aiMaterial.suggestedSchools.private.challenge.join(', ')} / {record.aiMaterial.suggestedSchools.private.solid.join(', ')}</p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-600 uppercase mb-2">推奨学習時間</p>
                              <div className="flex flex-wrap gap-2">
                                {record.aiMaterial.requiredStudyHours.subjectBreakdown.map((s, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold border border-slate-200">
                                    {s.subject}: {s.hours}h
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {records.length === 0 && (
              <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">過去の面談記録はありません</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
