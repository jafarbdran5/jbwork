import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { 
  LocalLifeOS, 
  DailyHabit, 
  RoutineTask, 
  LifeGoal, 
  QuickJournalNote, 
  LifeTransaction 
} from '../../lib/localLifeOS';
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  Target,
  BookOpen,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Pin,
  TrendingUp,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  Edit3,
  Check,
  Tag,
  Search,
  Activity,
  Heart
} from 'lucide-react';

export const LifeOSModule: React.FC = () => {
  const { isRTL } = useI18n();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'day' | 'habits_goals' | 'journal' | 'finances' | 'backup'>('day');

  // State loaded from LocalLifeOS
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [journal, setJournal] = useState<QuickJournalNote[]>([]);
  const [transactions, setTransactions] = useState<LifeTransaction[]>([]);
  const [dayFocus, setDayFocus] = useState<string>('');
  const [isEditingFocus, setIsEditingFocus] = useState(false);

  // New item modal states
  const [newRoutineText, setNewRoutineText] = useState('');
  const [newRoutineSlot, setNewRoutineSlot] = useState<RoutineTask['slot']>('morning');
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCat, setNewHabitCat] = useState<DailyHabit['category']>('work');
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  // New Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCat, setNewGoalCat] = useState<LifeGoal['category']>('work');
  const [newGoalTarget, setNewGoalTarget] = useState<number>(10);
  const [newGoalUnit, setNewGoalUnit] = useState('قضية');

  // New Note Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCat, setNewNoteCat] = useState<QuickJournalNote['category']>('idea');
  const [newNoteColor, setNewNoteColor] = useState('#064e3b');
  const [searchNoteQuery, setSearchNoteQuery] = useState('');

  // New Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txType, setTxType] = useState<LifeTransaction['type']>('expense');
  const [txScope, setTxScope] = useState<LifeTransaction['scope']>('personal');
  const [txCategory, setTxCategory] = useState('مصاريف شخصية');

  // Backup status
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const refreshAll = () => {
    setHabits(LocalLifeOS.getHabits());
    setRoutines(LocalLifeOS.getRoutines());
    setGoals(LocalLifeOS.getGoals());
    setJournal(LocalLifeOS.getJournalNotes());
    setTransactions(LocalLifeOS.getTransactions());
    setDayFocus(LocalLifeOS.getDayFocus());
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Handler functions
  const handleToggleHabit = (id: string) => {
    const updated = LocalLifeOS.toggleHabitToday(id);
    setHabits(updated);
  };

  const handleToggleRoutine = (id: string) => {
    const updated = LocalLifeOS.toggleRoutineToday(id);
    setRoutines(updated);
  };

  const handleSaveFocus = () => {
    LocalLifeOS.setDayFocus(dayFocus);
    setIsEditingFocus(false);
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineText.trim()) return;
    const updated = LocalLifeOS.addRoutine({
      title: newRoutineText.trim(),
      slot: newRoutineSlot
    });
    setRoutines(updated);
    setNewRoutineText('');
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    const newHabit: DailyHabit = {
      id: `h_${Date.now()}`,
      title: newHabitTitle.trim(),
      category: newHabitCat,
      targetFrequency: 'daily',
      streak: 0,
      bestStreak: 0,
      completedDates: []
    };
    const updated = LocalLifeOS.saveHabit(newHabit);
    setHabits(updated);
    setNewHabitTitle('');
    setIsHabitModalOpen(false);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    const newGoal: LifeGoal = {
      id: `g_${Date.now()}`,
      title: newGoalTitle.trim(),
      category: newGoalCat,
      timeframe: 'yearly',
      progress: 0,
      targetValue: newGoalTarget,
      currentValue: 0,
      unit: newGoalUnit,
      status: 'in_progress',
      milestones: [],
      createdAt: new Date().toISOString()
    };
    const updated = LocalLifeOS.saveGoal(newGoal);
    setGoals(updated);
    setNewGoalTitle('');
    setIsGoalModalOpen(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    const newNote: QuickJournalNote = {
      id: `j_${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCat,
      tags: [],
      color: newNoteColor,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = LocalLifeOS.saveJournalNote(newNote);
    setJournal(updated);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsNoteModalOpen(false);
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || txAmount <= 0) return;
    const updated = LocalLifeOS.addTransaction({
      title: txTitle.trim(),
      amount: Number(txAmount),
      type: txType,
      scope: txScope,
      category: txCategory,
      currency: 'USD',
      date: todayStr
    });
    setTransactions(updated);
    setTxTitle('');
    setTxAmount(0);
    setIsTxModalOpen(false);
  };

  const handleExportJSON = () => {
    const jsonStr = LocalLifeOS.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JB_Life_OS_Backup_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage(isRTL ? 'تم تصدير النسخة الاحتياطية بنجاح إلى جهازك!' : 'Backup exported successfully!');
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        const ok = LocalLifeOS.importFullBackup(content);
        if (ok) {
          refreshAll();
          setBackupMessage(isRTL ? 'تم استيراد كافة البيانات بنجاح!' : 'All data restored successfully!');
        } else {
          setBackupMessage(isRTL ? 'خطأ في تنسيق ملف النسخة الاحتياطية' : 'Invalid backup file format');
        }
        setTimeout(() => setBackupMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Metrics
  const habitsDoneToday = habits.filter(h => h.completedDates.includes(todayStr)).length;
  const habitsPercentage = habits.length > 0 ? Math.round((habitsDoneToday / habits.length) * 100) : 0;
  const routinesDoneToday = routines.filter(r => r.completedDates.includes(todayStr)).length;
  const routinesPercentage = routines.length > 0 ? Math.round((routinesDoneToday / routines.length) * 100) : 0;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, c) => acc + c.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
  const netSavings = totalIncome - totalExpense;

  return (
    <div className={`p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn transition-colors duration-200 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Top Header Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border-slate-800 shadow-xl' 
          : 'bg-gradient-to-r from-white via-indigo-50/50 to-slate-50 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                {isRTL ? 'نظام إدارة الحياة والعمل الشخصي' : 'Life & Work Command OS'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/20">
                100% Offline Fast
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {isRTL ? 'مرحباً جعفر — مساحتك اليومية لتنظيم العمل والحياة' : 'Welcome Jaafar — Personal Life & Work Hub'}
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isRTL ? 'إدارة كاملة للقضايا، العادات، الروتين اليومي، الأهداف، والمالية بسرعة فائقة وبدون أي سحابة.' : 'Fast, offline control over your legal cases, daily routines, habits, goals, and finances.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-amber-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title={isDark ? 'التحويل للوضع النهاري (Light)' : 'التحويل للوضع الليلي (Dark)'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? (isRTL ? 'نهاري' : 'Light') : (isRTL ? 'ليلي' : 'Dark')}</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isRTL ? 'تصدير نسخة احتياطية' : 'Quick Backup'}</span>
            </button>
          </div>
        </div>

        {/* Day Focus Quote Bar */}
        <div className={`mt-5 p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-white border-indigo-100 shadow-sm'
        }`}>
          <div className="flex items-center gap-2.5 flex-1">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            {isEditingFocus ? (
              <input
                type="text"
                value={dayFocus}
                onChange={(e) => setDayFocus(e.target.value)}
                onBlur={handleSaveFocus}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFocus()}
                autoFocus
                className={`w-full text-xs font-medium bg-transparent border-b outline-none pb-1 ${isDark ? 'border-indigo-500 text-white' : 'border-indigo-600 text-slate-900'}`}
              />
            ) : (
              <p className={`text-xs font-medium line-clamp-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <strong className="text-indigo-400">{isRTL ? 'تركيز اليوم: ' : 'Today Focus: '}</strong>
                {dayFocus}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsEditingFocus(!isEditingFocus)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer shrink-0 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingFocus ? (isRTL ? 'حفظ' : 'Save') : (isRTL ? 'تعديل' : 'Edit')}</span>
          </button>
        </div>
      </div>

      {backupMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center animate-bounce">
          {backupMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={`flex items-center gap-2 border-b overflow-x-auto pb-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'day', label: isRTL ? 'خطة اليوم والروتين' : 'My Day & Routine', icon: CalendarCheck, count: `${routinesDoneToday}/${routines.length}` },
          { id: 'habits_goals', label: isRTL ? 'العادات والأهداف' : 'Habits & Goals', icon: Flame, count: `${habitsDoneToday}/${habits.length}` },
          { id: 'journal', label: isRTL ? 'المفكرة والمذكرات' : 'Journal & Vault', icon: BookOpen, count: journal.length },
          { id: 'finances', label: isRTL ? 'المالية والميزانية' : 'Life Finances', icon: Wallet, count: `$${netSavings.toLocaleString()}` },
          { id: 'backup', label: isRTL ? 'النسخ والاستعادة' : 'Backup & Data', icon: RefreshCw }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  isActive ? 'bg-indigo-700 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MY DAY & ROUTINE */}
      {/* ========================================================================= */}
      {activeTab === 'day' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{isRTL ? 'إنجاز روتين اليوم' : 'Routine Progress'}</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono">{routinesPercentage}%</span>
                <span className="text-xs text-slate-400 font-mono">({routinesDoneToday}/{routines.length})</span>
              </div>
              <div className="mt-2.5 w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${routinesPercentage}%` }}></div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{isRTL ? 'عادات اليوم' : 'Habits Completed'}</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-amber-400">{habitsPercentage}%</span>
                <span className="text-xs text-slate-400 font-mono">({habitsDoneToday}/{habits.length})</span>
              </div>
              <div className="mt-2.5 w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${habitsPercentage}%` }}></div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{isRTL ? 'الأهداف النشطة' : 'Active Goals'}</span>
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-400">{goals.length}</span>
                <span className="text-xs text-slate-400">{isRTL ? 'أهداف كبرى' : 'Life Goals'}</span>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-400 truncate">{goals[0]?.title || 'قيد المتابعة'}</p>
            </div>

            <div className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{isRTL ? 'الصافي المالي' : 'Net Cashflow'}</span>
                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-cyan-400">${netSavings.toLocaleString()}</span>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-400">{isRTL ? 'إيرادات ومصاريف مسجلة' : 'Recorded Ledger'}</p>
            </div>
          </div>

          {/* Routine & Habits Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Routine Schedule */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm">{isRTL ? 'الجدول الزمني والروتين اليومي' : 'Daily Routine & Timeline'}</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">{todayStr}</span>
              </div>

              {/* Routine Item List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {routines.map(routine => {
                  const isDone = routine.completedDates.includes(todayStr);
                  return (
                    <div
                      key={routine.id}
                      onClick={() => handleToggleRoutine(routine.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isDone
                          ? isDark ? 'bg-indigo-950/20 border-indigo-800/40 text-slate-400' : 'bg-indigo-50/50 border-indigo-200 text-slate-500'
                          : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                        ) : (
                          <Circle className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-slate-400'} shrink-0`} />
                        )}
                        <span className={`text-xs font-medium ${isDone ? 'line-through' : ''}`}>
                          {routine.title}
                        </span>
                      </div>
                      {routine.timeLabel && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                          {routine.timeLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Routine Input */}
              <form onSubmit={handleAddRoutine} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder={isRTL ? 'إضافة بند روتين جديد...' : 'Add new routine task...'}
                  value={newRoutineText}
                  onChange={(e) => setNewRoutineText(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'إضافة' : 'Add'}</span>
                </button>
              </form>
            </div>

            {/* Daily Habits Checklist */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm">{isRTL ? 'العادات اليومية وعداد الالتزام (Streaks)' : 'Daily Habits & Streaks'}</h3>
                </div>
                <button
                  onClick={() => setIsHabitModalOpen(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'عادة جديدة' : 'New Habit'}</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {habits.map(habit => {
                  const isDone = habit.completedDates.includes(todayStr);
                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleToggleHabit(habit.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isDone
                          ? isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200'
                          : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${isDone ? (isDark ? 'text-amber-300' : 'text-amber-900') : ''}`}>
                            {habit.title}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>{habit.category}</span>
                            {habit.reminderTime && <span>• {habit.reminderTime}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>{habit.streak} {isRTL ? 'يوم' : 'd'}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHabits(LocalLifeOS.deleteHabit(habit.id));
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HABITS & LIFE GOALS */}
      {/* ========================================================================= */}
      {activeTab === 'habits_goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{isRTL ? 'الأهداف الكبرى والمحطات السنوية' : 'Major Life & Work Goals'}</h2>
              <p className="text-xs text-slate-400">{isRTL ? 'تتبع نسبة الإنجاز والوصول للنتائج المرجوة' : 'Track milestones, progress, and key life objectives'}</p>
            </div>
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isRTL ? 'إضافة هدف جديد' : 'New Goal'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => (
              <div
                key={goal.id}
                className={`p-5 rounded-2xl border space-y-3.5 transition-colors ${
                  isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold uppercase">
                      {goal.category}
                    </span>
                    <h4 className="font-bold text-sm mt-1">{goal.title}</h4>
                  </div>
                  <button
                    onClick={() => setGoals(LocalLifeOS.deleteGoal(goal.id))}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">{isRTL ? 'نسبة الإنجاز:' : 'Progress:'}</span>
                    <span className="font-bold text-indigo-400">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700/30 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${goal.progress}%` }}></div>
                  </div>
                </div>

                {/* Progress Adjust buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      const updatedGoal = { ...goal, progress: Math.max(0, goal.progress - 10) };
                      setGoals(LocalLifeOS.saveGoal(updatedGoal));
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono cursor-pointer"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => {
                      const updatedGoal = { ...goal, progress: Math.min(100, goal.progress + 10) };
                      setGoals(LocalLifeOS.saveGoal(updatedGoal));
                    }}
                    className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono cursor-pointer"
                  >
                    +10%
                  </button>
                  <span className="text-[11px] text-slate-400 mr-auto font-mono">
                    {goal.currentValue || 0} / {goal.targetValue || 100} {goal.unit || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: JOURNAL & NOTES */}
      {/* ========================================================================= */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isRTL ? 'بحث في الملاحظات والمذكرات...' : 'Search journal notes...'}
                value={searchNoteQuery}
                onChange={(e) => setSearchNoteQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isRTL ? 'مذكرة / فكرة جديدة' : 'New Note'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {journal
              .filter(n => !searchNoteQuery || n.title.includes(searchNoteQuery) || n.content.includes(searchNoteQuery))
              .map(note => (
                <div
                  key={note.id}
                  className={`p-5 rounded-2xl border space-y-3 relative group transition-all ${
                    isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'
                  }`}
                  style={{ borderTop: `4px solid ${note.color || '#6366f1'}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm line-clamp-1">{note.title}</h4>
                    <div className="flex items-center gap-1">
                      {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400" />}
                      <button
                        onClick={() => setJournal(LocalLifeOS.deleteJournalNote(note.id))}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed line-clamp-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {note.content}
                  </p>

                  <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{note.category}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIFE & WORK FINANCES */}
      {/* ========================================================================= */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{isRTL ? 'المالية الشخصية وسجل المعاملات' : 'Personal & Work Financial Ledger'}</h2>
              <p className="text-xs text-slate-400">{isRTL ? 'متابعة الدخل والمصروفات وصافي المدخرات محلياً' : 'Offline tracking of revenue, expenses, and savings'}</p>
            </div>
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isRTL ? 'تسجيل حركة مالية' : 'New Transaction'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-semibold">{isRTL ? 'إجمالي المقبوضات والدخل' : 'Total Revenue'}</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black font-mono text-emerald-400 mt-2">${totalIncome.toLocaleString()}</p>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50/60 border-rose-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-400 font-semibold">{isRTL ? 'إجمالي المصاريف والنفقات' : 'Total Expenses'}</span>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black font-mono text-rose-400 mt-2">${totalExpense.toLocaleString()}</p>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-cyan-950/20 border-cyan-800/40' : 'bg-cyan-50/60 border-cyan-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyan-400 font-semibold">{isRTL ? 'صافي الرصيد والمدخرات' : 'Net Savings'}</span>
                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-black font-mono text-cyan-400 mt-2">${netSavings.toLocaleString()}</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h4 className="font-bold text-sm">{isRTL ? 'سجل العمليات الأخير' : 'Recent Transactions'}</h4>
            <div className="space-y-2">
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{tx.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{tx.category} • {tx.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()} {tx.currency}
                    </span>
                    <button
                      onClick={() => setTransactions(LocalLifeOS.deleteTransaction(tx.id))}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BACKUP & RESTORE */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <h3 className="text-base font-bold">{isRTL ? 'النسخ الاحتياطي والاستعادة الأوفلاين' : 'Offline Backup & Restore'}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isRTL ? 'كافة بياناتك مخزنة محلياً على جهازك. يمكنك تصدير ملف JSON كامل بضغطة زر لنقله أو حفظه.' : 'All data resides locally. Export or restore your entire database with a single click.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-5 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <Download className="w-6 h-6 text-indigo-400" />
              <h4 className="font-bold text-sm">{isRTL ? 'تصدير نسخة احتياطية (JSON)' : 'Export Full Backup'}</h4>
              <p className="text-xs text-slate-400">
                {isRTL ? 'تنزيل ملف يحتوي على كافة القضايا والعادات والروتين والمفكرة والمالية.' : 'Download complete JSON snapshot of all your cases, habits, notes, and records.'}
              </p>
              <button
                onClick={handleExportJSON}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                {isRTL ? 'تحميل النسخة الاحتياطية' : 'Download JSON File'}
              </button>
            </div>

            <div className={`p-5 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <Upload className="w-6 h-6 text-emerald-400" />
              <h4 className="font-bold text-sm">{isRTL ? 'استعادة نسخة احتياطية' : 'Restore from JSON'}</h4>
              <p className="text-xs text-slate-400">
                {isRTL ? 'حدد ملف النسخة الاحتياطية لاستعادة كافة السجلات فوراً.' : 'Upload your backup JSON file to restore all modules in seconds.'}
              </p>
              <label className="block w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold text-center cursor-pointer transition-colors">
                <span>{isRTL ? 'اختيار ملف الاستعادة' : 'Choose JSON File'}</span>
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* New Habit Modal */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="font-bold text-base mb-4">{isRTL ? 'إضافة عادة يومية جديدة' : 'Add New Daily Habit'}</h3>
            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'اسم العادة' : 'Habit Title'}</label>
                <input
                  type="text"
                  required
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: مراجعة مستندات القضايا' : 'e.g. Morning Case Review'}
                  className={`w-full p-2.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'التصنيف' : 'Category'}</label>
                <select
                  value={newHabitCat}
                  onChange={(e) => setNewHabitCat(e.target.value as any)}
                  className={`w-full p-2.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="work">{isRTL ? 'عمل وقضايا' : 'Work & Cases'}</option>
                  <option value="deen">{isRTL ? 'دين وعبادة' : 'Spiritual'}</option>
                  <option value="health">{isRTL ? 'صحة ورياضة' : 'Health & Fitness'}</option>
                  <option value="mind">{isRTL ? 'فكر وتطوير' : 'Mind & Learning'}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHabitModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-medium cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                >
                  {isRTL ? 'حفظ العادة' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="font-bold text-base mb-4">{isRTL ? 'تدوين مذكرة أو فكرة سريعة' : 'New Journal Note'}</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'العنوان' : 'Title'}</label>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder={isRTL ? 'عنوان الفكرة أو المذكرة' : 'Note Title'}
                  className={`w-full p-2.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'المحتوى' : 'Content'}</label>
                <textarea
                  rows={4}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder={isRTL ? 'تفاصيل الملاحظة...' : 'Note details...'}
                  className={`w-full p-2.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-medium cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                >
                  {isRTL ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="font-bold text-base mb-4">{isRTL ? 'تسجيل حركة مالية' : 'New Transaction'}</h3>
            <form onSubmit={handleAddTx} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'البيان / الوصف' : 'Description'}</label>
                <input
                  type="text"
                  required
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: أتعاب قضية / صيانة' : 'e.g. Case Retainer'}
                  className={`w-full p-2.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'المبلغ ($)' : 'Amount'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txAmount || ''}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl text-xs border outline-none font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">{isRTL ? 'النوع' : 'Type'}</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl text-xs border outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="income">{isRTL ? 'إيراد / مقبوضات (+)' : 'Income'}</option>
                    <option value="expense">{isRTL ? 'مصروف / نفقات (-)' : 'Expense'}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-medium cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                >
                  {isRTL ? 'تسجيل' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
