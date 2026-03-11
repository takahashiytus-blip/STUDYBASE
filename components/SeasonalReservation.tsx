
import React, { useState, useMemo } from 'react';
import { SeasonalCourse, SeasonalSlot, Student, Instructor } from '../types';

interface SeasonalReservationProps {
  seasonalCourses: SeasonalCourse[];
  seasonalSlots: SeasonalSlot[];
  student: Student;
  instructors: Instructor[];
  onUpdateSlots: (slots: SeasonalSlot[]) => void;
}

export const SeasonalReservation: React.FC<SeasonalReservationProps> = ({
  seasonalCourses,
  seasonalSlots,
  student,
  instructors,
  onUpdateSlots
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(seasonalCourses[0]?.id || null);
  const [filterInstructorId, setFilterInstructorId] = useState<string>('all');
  const [bookingSubject, setBookingSubject] = useState('');

  const selectedCourse = useMemo(() => seasonalCourses.find(c => c.id === selectedCourseId), [seasonalCourses, selectedCourseId]);

  const availableSlots = useMemo(() => {
    if (!selectedCourseId) return [];
    return seasonalSlots.filter(s => 
      s.courseId === selectedCourseId && 
      s.status === 'available' &&
      (filterInstructorId === 'all' || s.instructorId === filterInstructorId)
    ).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [seasonalSlots, selectedCourseId, filterInstructorId]);

  const myBookedSlots = useMemo(() => {
    if (!selectedCourseId) return [];
    return seasonalSlots.filter(s => 
      s.courseId === selectedCourseId && 
      s.studentId === student.id
    ).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [seasonalSlots, selectedCourseId, student.id]);

  const isPastDeadline = useMemo(() => {
    if (!selectedCourse?.reservationDeadline) return false;
    const deadline = new Date(selectedCourse.reservationDeadline);
    return new Date() > deadline;
  }, [selectedCourse]);

  const handleBookSlot = (slotId: string) => {
    if (isPastDeadline) {
      alert('予約受付期間が終了しています');
      return;
    }
    if (!bookingSubject) {
      alert('受講科目を選択または入力してください');
      return;
    }

    const updatedSlots = seasonalSlots.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          status: 'booked' as const,
          studentId: student.id,
          studentName: student.name,
          subject: bookingSubject
        };
      }
      return s;
    });
    onUpdateSlots(updatedSlots);
    setBookingSubject('');
  };

  const handleCancelSlot = (slotId: string) => {
    if (window.confirm('この予約をキャンセルしますか？')) {
      const updatedSlots = seasonalSlots.map(s => {
        if (s.id === slotId) {
          return {
            ...s,
            status: 'available' as const,
            studentId: undefined,
            studentName: undefined,
            subject: undefined
          };
        }
        return s;
      });
      onUpdateSlots(updatedSlots);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-black text-slate-800">季節講習予約</h2>
        <p className="text-slate-500 font-medium">講習期間の授業予約・確認を行います</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <h3 className="text-xl font-black text-slate-800 mb-6">講習を選択</h3>
            <div className="space-y-3">
              {seasonalCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedCourseId === course.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-indigo-200'}`}
                >
                  <p className="font-black text-slate-800">{course.title}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">{course.startDate} 〜 {course.endDate}</p>
                </button>
              ))}
              {seasonalCourses.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold italic">現在募集中の講習はありません</p>
              )}
            </div>
          </div>

          {selectedCourse && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
              <h3 className="text-xl font-black text-slate-800 mb-6">あなたの予約状況</h3>
              <div className="space-y-3">
                {myBookedSlots.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 font-bold italic">予約済みのコマはありません</p>
                ) : (
                  myBookedSlots.map(slot => (
                    <div key={slot.id} className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{slot.date.split('-').slice(1).join('/')}</p>
                          <p className="text-sm font-black text-slate-800">{slot.startTime} - {slot.endTime}</p>
                        </div>
                        <button 
                          onClick={() => handleCancelSlot(slot.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                        >✕</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold text-slate-500 border border-slate-200">講師: {slot.instructorName}</span>
                        <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full font-bold text-white">{slot.subject}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                <p className="text-sm font-bold text-slate-500">合計予約数</p>
                <p className="text-2xl font-black text-indigo-600">{myBookedSlots.length} <span className="text-xs text-slate-400 uppercase">コマ</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedCourse ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold">
              左側のメニューから講習を選択してください
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-xl font-black text-slate-800">予約可能なコマ</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 uppercase">講師フィルタ:</span>
                  <select 
                    value={filterInstructorId}
                    onChange={(e) => setFilterInstructorId(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="all">すべての講師</option>
                    {instructors.map(ins => (
                      <option key={ins.id} value={ins.id}>{ins.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-8 p-6 bg-amber-50 rounded-3xl border border-amber-100">
                {isPastDeadline ? (
                  <div className="text-center py-4">
                    <p className="text-rose-600 font-black">この講習の予約受付は終了しました</p>
                    <p className="text-slate-500 text-xs font-bold mt-1">締切日時: {selectedCourse.reservationDeadline?.replace('T', ' ')}</p>
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-2 ml-1">予約する科目を選択・入力</label>
                    <div className="flex gap-3">
                      <select 
                        value={bookingSubject}
                        onChange={(e) => setBookingSubject(e.target.value)}
                        className="flex-1 px-5 py-3 rounded-2xl bg-white border-2 border-amber-100 font-bold outline-none focus:border-amber-400 transition-all"
                      >
                        <option value="">科目を選択...</option>
                        <option value="英語">英語</option>
                        <option value="数学">数学</option>
                        <option value="国語">国語</option>
                        <option value="理科">理科</option>
                        <option value="社会">社会</option>
                        <option value="その他">その他</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="または直接入力"
                        value={bookingSubject}
                        onChange={(e) => setBookingSubject(e.target.value)}
                        className="flex-1 px-5 py-3 rounded-2xl bg-white border-2 border-amber-100 font-bold outline-none focus:border-amber-400 transition-all"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-amber-600 mt-2 ml-1">※予約ボタンを押す前に科目を選択してください</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSlots.map(slot => (
                  <div key={slot.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-center min-w-[80px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase">{slot.date.split('-').slice(1).join('/')}</p>
                        <p className="text-xs font-black text-slate-700">{slot.startTime}</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{slot.instructorName} 講師</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{slot.endTime}まで</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleBookSlot(slot.id)}
                      disabled={isPastDeadline}
                      className={`px-5 py-2 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 ${isPastDeadline ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      予約する
                    </button>
                  </div>
                ))}
                {availableSlots.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">
                    予約可能なコマがありません
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
