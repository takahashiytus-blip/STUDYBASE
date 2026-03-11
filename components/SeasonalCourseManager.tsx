
import React, { useState, useMemo } from 'react';
import { SeasonalCourse, SeasonalSlot, Instructor, Student, UserRole } from '../types';
import { generateUniqueId } from '../utils';

interface SeasonalCourseManagerProps {
  seasonalCourses: SeasonalCourse[];
  seasonalSlots: SeasonalSlot[];
  instructors: Instructor[];
  students: Student[];
  currentUser: { id: string; name: string; role: UserRole; isAdmin?: boolean };
  onUpdateCourses: (courses: SeasonalCourse[], deletedIds?: string[]) => void;
  onUpdateSlots: (slots: SeasonalSlot[], deletedIds?: string[]) => void;
}

export const SeasonalCourseManager: React.FC<SeasonalCourseManagerProps> = ({
  seasonalCourses,
  seasonalSlots,
  instructors,
  students,
  currentUser,
  onUpdateCourses,
  onUpdateSlots
}) => {
  const [activeTab, setActiveTab] = useState<'courses' | 'slots' | 'summary'>('courses');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(seasonalCourses[0]?.id || null);
  
  const isAdmin = currentUser.role === 'admin' || currentUser.isAdmin;
  const selectedCourse = useMemo(() => seasonalCourses.find(c => c.id === selectedCourseId), [seasonalCourses, selectedCourseId]);

  // Course Management State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState<Partial<SeasonalCourse>>({
    title: '',
    startDate: '',
    endDate: '',
    regularClassPattern: 'continue',
    visibility: 'hidden'
  });

  // Slot Management State
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.title || !courseFormData.startDate || !courseFormData.endDate) return;

    const newCourse: SeasonalCourse = {
      id: courseFormData.id || generateUniqueId('course'),
      title: courseFormData.title,
      startDate: courseFormData.startDate,
      endDate: courseFormData.endDate,
      regularClassPattern: courseFormData.regularClassPattern as 'continue' | 'suspend',
      description: courseFormData.description,
      reservationDeadline: courseFormData.reservationDeadline,
      visibility: courseFormData.visibility || 'hidden'
    };

    if (courseFormData.id) {
      onUpdateCourses(seasonalCourses.map(c => c.id === newCourse.id ? newCourse : c));
    } else {
      onUpdateCourses([...seasonalCourses, newCourse]);
    }
    setShowCourseModal(false);
    setCourseFormData({ title: '', startDate: '', endDate: '', regularClassPattern: 'continue', visibility: 'hidden' });
  };

  const handleDeleteCourse = (id: string) => {
    if (window.confirm('この講習設定を削除しますか？関連する予約枠も削除されます。')) {
      onUpdateCourses(seasonalCourses.filter(c => c.id !== id), [id]);
      // Also delete slots associated with this course
      const slotsToDelete = seasonalSlots.filter(s => s.courseId === id).map(s => s.id);
      if (slotsToDelete.length > 0) {
        onUpdateSlots(seasonalSlots.filter(s => s.courseId !== id), slotsToDelete);
      }
    }
  };

  const handleAddSlot = () => {
    if (!selectedCourseId || !slotDate || !slotStartTime || !slotEndTime) return;

    const newSlot: SeasonalSlot = {
      id: generateUniqueId('slot'),
      courseId: selectedCourseId,
      instructorId: currentUser.id,
      instructorName: currentUser.name,
      date: slotDate,
      startTime: slotStartTime,
      endTime: slotEndTime,
      status: 'available'
    };

    onUpdateSlots([...seasonalSlots, newSlot]);
  };

  const handleDeleteSlot = (id: string) => {
    onUpdateSlots(seasonalSlots.filter(s => s.id !== id), [id]);
  };

  const studentSummary = useMemo(() => {
    if (!selectedCourseId) return [];
    const courseSlots = seasonalSlots.filter(s => s.courseId === selectedCourseId && s.status === 'booked');
    
    return students.map(student => {
      const count = courseSlots.filter(s => s.studentId === student.id).length;
      return { ...student, sessionCount: count };
    }).filter(s => s.sessionCount > 0 || students.length < 50); // Show all if small list, or only those with sessions
  }, [students, seasonalSlots, selectedCourseId]);

  const instructorSlots = useMemo(() => {
    return seasonalSlots.filter(s => s.courseId === selectedCourseId && s.instructorId === currentUser.id);
  }, [seasonalSlots, selectedCourseId, currentUser.id]);

  const allCourseSlots = useMemo(() => {
    return seasonalSlots.filter(s => s.courseId === selectedCourseId);
  }, [seasonalSlots, selectedCourseId]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">季節特別講習管理</h2>
          <p className="text-slate-500 font-medium">講習期間の設定、空きコマの登録、予約状況の確認を行います</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('courses')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'courses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>講習設定</button>
          <button onClick={() => setActiveTab('slots')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'slots' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>空きコマ登録</button>
          <button onClick={() => setActiveTab('summary')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>予約集計</button>
        </div>
      </header>

      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">講習期間一覧</h3>
            {isAdmin && (
              <button 
                onClick={() => { setCourseFormData({ title: '', startDate: '', endDate: '', regularClassPattern: 'continue', visibility: 'hidden' }); setShowCourseModal(true); }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all"
              >
                ＋ 新規講習を追加
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasonalCourses.map(course => (
              <div key={course.id} className={`p-6 rounded-3xl border-2 transition-all ${selectedCourseId === course.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-indigo-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-black text-slate-800">{course.title}</h4>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => { setCourseFormData(course); setShowCourseModal(true); }} className="text-slate-400 hover:text-indigo-600 transition-colors">✎</button>
                      <button onClick={() => handleDeleteCourse(course.id)} className="text-slate-400 hover:text-rose-600 transition-colors">✕</button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">期間</p>
                  <p className="text-sm font-black text-slate-600">{course.startDate} 〜 {course.endDate}</p>
                </div>
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">通常授業</p>
                  <p className={`text-xs font-black px-3 py-1 rounded-full inline-block ${course.regularClassPattern === 'continue' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {course.regularClassPattern === 'continue' ? '通常授業も実施' : '通常授業は中断'}
                  </p>
                </div>
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">表示設定</p>
                  <p className={`text-xs font-black px-3 py-1 rounded-full inline-block ${
                    course.visibility === 'all' ? 'bg-emerald-100 text-emerald-700' : 
                    course.visibility === 'instructor' ? 'bg-indigo-100 text-indigo-700' : 
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {course.visibility === 'all' ? '生徒・講師に表示中' : 
                     course.visibility === 'instructor' ? '講師のみに表示中' : 
                     '非表示'}
                  </p>
                </div>
                {course.reservationDeadline && (
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">予約締切</p>
                    <p className="text-sm font-black text-rose-600">{course.reservationDeadline.replace('T', ' ')}</p>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full py-3 rounded-xl font-black text-sm transition-all ${selectedCourseId === course.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {selectedCourseId === course.id ? '選択中' : 'この講習を選択'}
                </button>
              </div>
            ))}
            {seasonalCourses.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400 font-bold">
                講習設定がありません
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'slots' && (
        <div className="space-y-6">
          {!selectedCourse ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold">
              先に「講習設定」タブで講習を選択してください
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-6">空きコマ登録</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">日付</label>
                      <input 
                        type="date" 
                        min={selectedCourse.startDate}
                        max={selectedCourse.endDate}
                        value={slotDate}
                        onChange={(e) => setSlotDate(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">開始</label>
                        <input 
                          type="time" 
                          value={slotStartTime}
                          onChange={(e) => setSlotStartTime(e.target.value)}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">終了</label>
                        <input 
                          type="time" 
                          value={slotEndTime}
                          onChange={(e) => setSlotEndTime(e.target.value)}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddSlot}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 mt-4"
                    >
                      空きコマを追加
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-6">あなたの登録済みコマ</h3>
                  <div className="space-y-3">
                    {instructorSlots.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 font-bold italic">登録されたコマはありません</p>
                    ) : (
                      instructorSlots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map(slot => (
                        <div key={slot.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div className="flex items-center gap-6">
                            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-center min-w-[100px]">
                              <p className="text-[10px] font-black text-slate-400 uppercase">{slot.date.split('-').slice(1).join('/')}</p>
                              <p className="text-sm font-black text-slate-700">{slot.startTime} - {slot.endTime}</p>
                            </div>
                            <div>
                              <p className={`text-xs font-black px-3 py-1 rounded-full inline-block ${slot.status === 'booked' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {slot.status === 'booked' ? `予約済み: ${slot.studentName} 様` : '予約受付中'}
                              </p>
                              {slot.subject && <p className="text-[10px] font-bold text-slate-400 mt-1">科目: {slot.subject}</p>}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="w-10 h-10 rounded-xl bg-white text-rose-500 border border-slate-200 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {!selectedCourse ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold">
              先に「講習設定」タブで講習を選択してください
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-8 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-800">生徒別予約集計</h3>
                <p className="text-slate-500 text-sm font-medium">「{selectedCourse.title}」期間内の予約コマ数一覧</p>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentSummary.map(student => (
                    <div key={student.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all">
                      <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.grade}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-indigo-600">{student.sessionCount}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">コマ</p>
                      </div>
                    </div>
                  ))}
                  {studentSummary.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">
                      予約データがありません
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white relative flex-shrink-0">
              <h3 className="text-xl font-black">{courseFormData.id ? '講習設定を編集' : '新規講習を登録'}</h3>
              <button onClick={() => setShowCourseModal(false)} className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveCourse} className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">講習名</label>
                <input 
                  required 
                  type="text" 
                  placeholder="例: 2024 夏期講習"
                  value={courseFormData.title} 
                  onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})} 
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">開始日</label>
                  <input 
                    required 
                    type="date" 
                    value={courseFormData.startDate} 
                    onChange={(e) => setCourseFormData({...courseFormData, startDate: e.target.value})} 
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">終了日</label>
                  <input 
                    required 
                    type="date" 
                    value={courseFormData.endDate} 
                    onChange={(e) => setCourseFormData({...courseFormData, endDate: e.target.value})} 
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">通常授業の扱い</label>
                <select 
                  value={courseFormData.regularClassPattern}
                  onChange={(e) => setCourseFormData({...courseFormData, regularClassPattern: e.target.value as 'continue' | 'suspend'})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all appearance-none"
                >
                  <option value="continue">通常授業も並行して実施</option>
                  <option value="suspend">通常授業は中断（講習のみ実施）</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">予約締め切り日時（任意）</label>
                <input 
                  type="datetime-local" 
                  value={courseFormData.reservationDeadline || ''} 
                  onChange={(e) => setCourseFormData({...courseFormData, reservationDeadline: e.target.value})} 
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">表示対象</label>
                <select 
                  value={courseFormData.visibility || 'hidden'}
                  onChange={(e) => setCourseFormData({...courseFormData, visibility: e.target.value as any})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all appearance-none"
                >
                  <option value="all">生徒・講師に表示</option>
                  <option value="instructor">講師のみに表示</option>
                  <option value="hidden">非表示</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">備考（任意）</label>
                <textarea 
                  rows={3}
                  value={courseFormData.description} 
                  onChange={(e) => setCourseFormData({...courseFormData, description: e.target.value})} 
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold transition-all resize-none"
                />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
                設定を保存する
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
