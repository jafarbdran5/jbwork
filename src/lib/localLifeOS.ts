// ============================================================================
// Local Life & Work OS Storage Engine
// 100% Offline, Zero-Latency, Instant LocalStorage Persistence
// Dedicated to Jaafar Bdran (تنظيم العمل والقضايا وإدارة الحياة الشخصية)
// ============================================================================

export interface DailyHabit {
  id: string;
  title: string;
  category: 'health' | 'deen' | 'work' | 'mind' | 'fitness';
  targetFrequency: 'daily' | 'weekdays' | 'weekends';
  streak: number;
  bestStreak: number;
  completedDates: string[]; // ['YYYY-MM-DD']
  iconName?: string;
  reminderTime?: string;
}

export interface RoutineTask {
  id: string;
  title: string;
  slot: 'morning' | 'afternoon' | 'evening' | 'night';
  completedDates: string[]; // ['YYYY-MM-DD']
  timeLabel?: string;
}

export interface LifeTransaction {
  id: string;
  type: 'income' | 'expense' | 'savings';
  scope: 'personal' | 'case' | 'office';
  category: string;
  title: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  caseId?: string;
  caseNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface QuickJournalNote {
  id: string;
  title: string;
  content: string;
  category: 'idea' | 'reflection' | 'strategy' | 'case_note' | 'personal';
  tags: string[];
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LifeGoal {
  id: string;
  title: string;
  category: 'work' | 'financial' | 'personal' | 'health' | 'learning';
  timeframe: 'quarterly' | 'yearly' | 'lifetime';
  progress: number; // 0 to 100
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
  milestones: { id: string; title: string; done: boolean }[];
  status: 'in_progress' | 'completed' | 'paused';
  createdAt: string;
}

const STORAGE_KEYS = {
  HABITS: 'jb_life_habits',
  ROUTINES: 'jb_life_routines',
  TRANSACTIONS: 'jb_life_transactions',
  JOURNAL: 'jb_life_journal_notes',
  GOALS: 'jb_life_goals',
  DAY_FOCUS: 'jb_life_day_focus',
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// Default initial data for instant rich experience
const DEFAULT_HABITS: DailyHabit[] = [
  {
    id: 'h_1',
    title: 'مراجعة قضايا اليوم ومواعيد الجلسات',
    category: 'work',
    targetFrequency: 'weekdays',
    streak: 5,
    bestStreak: 14,
    completedDates: [getTodayStr()],
    iconName: 'Briefcase',
    reminderTime: '08:30'
  },
  {
    id: 'h_2',
    title: 'قراءة ورد وتأمل صباحي',
    category: 'deen',
    targetFrequency: 'daily',
    streak: 12,
    bestStreak: 20,
    completedDates: [getTodayStr()],
    iconName: 'BookOpen',
    reminderTime: '06:00'
  },
  {
    id: 'h_3',
    title: 'رياضة ومشي 30 دقيقة',
    category: 'fitness',
    targetFrequency: 'daily',
    streak: 4,
    bestStreak: 10,
    completedDates: [],
    iconName: 'Activity',
    reminderTime: '17:00'
  },
  {
    id: 'h_4',
    title: 'تدوين ملاحظات الإنجاز وإغلاق اليوم',
    category: 'mind',
    targetFrequency: 'daily',
    streak: 8,
    bestStreak: 18,
    completedDates: [],
    iconName: 'Sparkles',
    reminderTime: '22:00'
  }
];

const DEFAULT_ROUTINES: RoutineTask[] = [
  { id: 'r_1', title: 'قهوة الصباح وتحديد أولويات اليوم (Top 3)', slot: 'morning', timeLabel: '08:00', completedDates: [getTodayStr()] },
  { id: 'r_2', title: 'متابعة اتصالات الموكلين والرد على الرسائل', slot: 'morning', timeLabel: '10:00', completedDates: [getTodayStr()] },
  { id: 'r_3', title: 'جلسة تركيز عميق: صياغة مذكرات ودراسة القضايا', slot: 'afternoon', timeLabel: '13:00', completedDates: [] },
  { id: 'r_4', title: 'مراجعة الدفعات والقيود المالية', slot: 'evening', timeLabel: '18:00', completedDates: [] },
  { id: 'r_5', title: 'تخطيط جدول الغد وإراحة البال', slot: 'night', timeLabel: '22:30', completedDates: [] }
];

const DEFAULT_GOALS: LifeGoal[] = [
  {
    id: 'g_1',
    title: 'إنهاء وفصل 20 قضية رئيسية بنجاح',
    category: 'work',
    timeframe: 'yearly',
    progress: 65,
    targetValue: 20,
    currentValue: 13,
    unit: 'قضية',
    targetDate: '2026-12-31',
    status: 'in_progress',
    milestones: [
      { id: 'm_1', title: 'إغلاق قضايا الربع الأول', done: true },
      { id: 'm_2', title: 'أرشفة القضايا القديمة', done: true },
      { id: 'm_3', title: 'إعداد تقرير النتائج النهائي', done: false }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'g_2',
    title: 'بناء محفظة ادخار وتوسع استثماري',
    category: 'financial',
    timeframe: 'yearly',
    progress: 50,
    targetValue: 50000,
    currentValue: 25000,
    unit: '$',
    targetDate: '2026-12-31',
    status: 'in_progress',
    milestones: [
      { id: 'm_4', title: 'ادخار شهري ثابت بنسبة 30%', done: true },
      { id: 'm_5', title: 'تنويع الأصول', done: false }
    ],
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_NOTES: QuickJournalNote[] = [
  {
    id: 'j_1',
    title: 'قاعدة الهدوء الذهني في إدارة القضايا المعقدة',
    content: 'تقسيم القضية الضخمة إلى 3 محاور أساسية: الوقائع الثابتة، المستندات القاطعة، والطلبات الدقيقة. لا تدع كثرة التفاصيل تشتت الهدف الرئيسي.',
    category: 'strategy',
    tags: ['استراتيجية', 'قضايا', 'تركيز'],
    color: '#064e3b',
    isPinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'j_2',
    title: 'فكرة: نظام التنبيه الذكي لمواعيد الطعون',
    content: 'إعداد جدول زمني ثابت بمواعيد الطعن والاستئناف لكل قضية فور صدور الحكم بمهلة 15 يوماً للتذكير الدوري.',
    category: 'idea',
    tags: ['أفكار', 'تطوير'],
    color: '#1e1b4b',
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_TRANSACTIONS: LifeTransaction[] = [
  {
    id: 't_1',
    type: 'income',
    scope: 'case',
    category: 'أتعاب قضايا',
    title: 'دفعة أتعاب قضية تحكيم تجاري (JB-2026-000001)',
    amount: 3500,
    currency: 'USD',
    date: getTodayStr(),
    caseNumber: 'JB-2026-000001',
    notes: 'تحويل مباشر',
    createdAt: new Date().toISOString()
  },
  {
    id: 't_2',
    type: 'expense',
    scope: 'office',
    category: 'مصاريف تشغيل ومكتب',
    title: 'رسوم تراخيص واشتراكات مراجع قانونية',
    amount: 250,
    currency: 'USD',
    date: getTodayStr(),
    notes: 'اشتراك دوري',
    createdAt: new Date().toISOString()
  },
  {
    id: 't_3',
    type: 'expense',
    scope: 'personal',
    category: 'مصاريف شخصية وعائلية',
    title: 'مستلزمات شخصية ودورية',
    amount: 400,
    currency: 'USD',
    date: getTodayStr(),
    notes: 'شخصي',
    createdAt: new Date().toISOString()
  }
];

// Helper to safely load from LocalStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

// Helper to safely save to LocalStorage
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to storage key ${key}:`, e);
  }
}

// ==========================================
// EXPORTED SERVICE METHODS
// ==========================================

export const LocalLifeOS = {
  // --- HABITS ---
  getHabits(): DailyHabit[] {
    return loadFromStorage<DailyHabit[]>(STORAGE_KEYS.HABITS, DEFAULT_HABITS);
  },
  saveHabit(habit: DailyHabit): DailyHabit[] {
    const list = this.getHabits();
    const idx = list.findIndex(h => h.id === habit.id);
    let updated: DailyHabit[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = habit;
    } else {
      updated = [habit, ...list];
    }
    saveToStorage(STORAGE_KEYS.HABITS, updated);
    return updated;
  },
  toggleHabitToday(habitId: string): DailyHabit[] {
    const today = getTodayStr();
    const list = this.getHabits();
    const updated = list.map(h => {
      if (h.id !== habitId) return h;
      const isDone = h.completedDates.includes(today);
      let newDates: string[];
      let newStreak = h.streak;
      if (isDone) {
        newDates = h.completedDates.filter(d => d !== today);
        newStreak = Math.max(0, newStreak - 1);
      } else {
        newDates = [...h.completedDates, today];
        newStreak = newStreak + 1;
      }
      return {
        ...h,
        completedDates: newDates,
        streak: newStreak,
        bestStreak: Math.max(h.bestStreak, newStreak)
      };
    });
    saveToStorage(STORAGE_KEYS.HABITS, updated);
    return updated;
  },
  deleteHabit(habitId: string): DailyHabit[] {
    const list = this.getHabits().filter(h => h.id !== habitId);
    saveToStorage(STORAGE_KEYS.HABITS, list);
    return list;
  },

  // --- ROUTINES ---
  getRoutines(): RoutineTask[] {
    return loadFromStorage<RoutineTask[]>(STORAGE_KEYS.ROUTINES, DEFAULT_ROUTINES);
  },
  toggleRoutineToday(routineId: string): RoutineTask[] {
    const today = getTodayStr();
    const list = this.getRoutines();
    const updated = list.map(r => {
      if (r.id !== routineId) return r;
      const isDone = r.completedDates.includes(today);
      const newDates = isDone ? r.completedDates.filter(d => d !== today) : [...r.completedDates, today];
      return { ...r, completedDates: newDates };
    });
    saveToStorage(STORAGE_KEYS.ROUTINES, updated);
    return updated;
  },
  addRoutine(routine: Omit<RoutineTask, 'id' | 'completedDates'>): RoutineTask[] {
    const list = this.getRoutines();
    const newItem: RoutineTask = {
      ...routine,
      id: `r_${Date.now()}`,
      completedDates: []
    };
    const updated = [...list, newItem];
    saveToStorage(STORAGE_KEYS.ROUTINES, updated);
    return updated;
  },
  deleteRoutine(routineId: string): RoutineTask[] {
    const list = this.getRoutines().filter(r => r.id !== routineId);
    saveToStorage(STORAGE_KEYS.ROUTINES, list);
    return list;
  },

  // --- GOALS ---
  getGoals(): LifeGoal[] {
    return loadFromStorage<LifeGoal[]>(STORAGE_KEYS.GOALS, DEFAULT_GOALS);
  },
  saveGoal(goal: LifeGoal): LifeGoal[] {
    const list = this.getGoals();
    const idx = list.findIndex(g => g.id === goal.id);
    let updated: LifeGoal[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = goal;
    } else {
      updated = [goal, ...list];
    }
    saveToStorage(STORAGE_KEYS.GOALS, updated);
    return updated;
  },
  deleteGoal(goalId: string): LifeGoal[] {
    const list = this.getGoals().filter(g => g.id !== goalId);
    saveToStorage(STORAGE_KEYS.GOALS, list);
    return list;
  },

  // --- JOURNAL & QUICK NOTES ---
  getJournalNotes(): QuickJournalNote[] {
    return loadFromStorage<QuickJournalNote[]>(STORAGE_KEYS.JOURNAL, DEFAULT_NOTES);
  },
  saveJournalNote(note: QuickJournalNote): QuickJournalNote[] {
    const list = this.getJournalNotes();
    const idx = list.findIndex(n => n.id === note.id);
    let updated: QuickJournalNote[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...note, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...note, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...list];
    }
    saveToStorage(STORAGE_KEYS.JOURNAL, updated);
    return updated;
  },
  deleteJournalNote(noteId: string): QuickJournalNote[] {
    const list = this.getJournalNotes().filter(n => n.id !== noteId);
    saveToStorage(STORAGE_KEYS.JOURNAL, list);
    return list;
  },

  // --- TRANSACTIONS & FINANCES ---
  getTransactions(): LifeTransaction[] {
    return loadFromStorage<LifeTransaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
  },
  addTransaction(tx: Omit<LifeTransaction, 'id' | 'createdAt'>): LifeTransaction[] {
    const list = this.getTransactions();
    const newItem: LifeTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newItem, ...list];
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    return updated;
  },
  deleteTransaction(txId: string): LifeTransaction[] {
    const list = this.getTransactions().filter(t => t.id !== txId);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, list);
    return list;
  },

  // --- DAY FOCUS NOTE ---
  getDayFocus(): string {
    return localStorage.getItem(STORAGE_KEYS.DAY_FOCUS) || 'التركيز على القضايا الحرجة، إنجاز مذكرات الرد، والحفاظ على التوازن اليومي';
  },
  setDayFocus(focusText: string): void {
    localStorage.setItem(STORAGE_KEYS.DAY_FOCUS, focusText);
  },

  // --- FULL JSON BACKUP & RESTORE ---
  exportFullBackup(): string {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      owner: 'Jaafar Bdran (جعفر بدران)',
      habits: this.getHabits(),
      routines: this.getRoutines(),
      goals: this.getGoals(),
      journal: this.getJournalNotes(),
      transactions: this.getTransactions(),
      dayFocus: this.getDayFocus(),
      theme: localStorage.getItem('jb_theme') || 'dark',
      cases: localStorage.getItem('jb_cached_cases') ? JSON.parse(localStorage.getItem('jb_cached_cases')!) : [],
      clients: localStorage.getItem('jb_cached_clients') ? JSON.parse(localStorage.getItem('jb_cached_clients')!) : []
    };
    return JSON.stringify(payload, null, 2);
  },

  importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.habits) saveToStorage(STORAGE_KEYS.HABITS, data.habits);
      if (data.routines) saveToStorage(STORAGE_KEYS.ROUTINES, data.routines);
      if (data.goals) saveToStorage(STORAGE_KEYS.GOALS, data.goals);
      if (data.journal) saveToStorage(STORAGE_KEYS.JOURNAL, data.journal);
      if (data.transactions) saveToStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.dayFocus) localStorage.setItem(STORAGE_KEYS.DAY_FOCUS, data.dayFocus);
      if (data.cases) localStorage.setItem('jb_cached_cases', JSON.stringify(data.cases));
      if (data.clients) localStorage.setItem('jb_cached_clients', JSON.stringify(data.clients));
      return true;
    } catch (e) {
      console.error('Failed to import backup JSON:', e);
      return false;
    }
  }
};
