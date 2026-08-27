import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { 
  Search, 
  FolderPlus, 
  Layers, 
  UserCheck, 
  Users, 
  CheckSquare, 
  Bell, 
  DollarSign, 
  FileText, 
  ShieldCheck, 
  Trash2, 
  Settings, 
  Globe, 
  Moon, 
  Sun, 
  LogOut, 
  Briefcase, 
  Inbox,
  Command,
  X,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onOpenQuickCase: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenQuickCase
}) => {
  const { t, language, toggleLanguage, isRTL } = useI18n();
  const { isDark, setTheme } = useTheme();
  const { logout, isSuperAdmin } = useAuth();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent toggles
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'life_os',
      label: isRTL ? 'نظام إدارة الحياة والروتين (Life OS)' : 'Life & Habits OS',
      shortcut: 'L O',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      run: () => { onClose(); onNavigate('life_os'); }
    },
    {
      id: 'sheets',
      label: isRTL ? 'قارئ جداول Google Sheets واستجابات النماذج' : 'Google Sheets & Forms Reader',
      shortcut: 'S H',
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
      run: () => { onClose(); onNavigate('sheets'); }
    },
    {
      id: 'new_case',
      label: isRTL ? 'إنشاء قضية جديدة فوراً' : 'Create New Case',
      shortcut: 'N',
      icon: <FolderPlus className="w-4 h-4 text-cyan-400" />,
      run: () => { onClose(); onOpenQuickCase(); }
    },
    {
      id: 'cases',
      label: isRTL ? 'استعراض كل القضايا' : 'View All Cases',
      shortcut: 'G C',
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      run: () => { onClose(); onNavigate('cases'); }
    },
    {
      id: 'my_cases',
      label: isRTL ? 'قضاياي المكلف بها' : 'My Assigned Cases',
      shortcut: 'M',
      icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      run: () => { onClose(); onNavigate('my_cases'); }
    },
    ...(isSuperAdmin ? [{
      id: 'jaafar_workspace',
      label: isRTL ? 'مساحة جعفر بدران الخاصة' : 'Jaafar Private Workspace',
      shortcut: 'J',
      icon: <Briefcase className="w-4 h-4 text-amber-400" />,
      run: () => { onClose(); onNavigate('jaafar_workspace'); }
    }] : []),
    {
      id: 'tasks',
      label: isRTL ? 'المهام ومتابعة العمل' : 'Tasks & Progress',
      shortcut: 'G T',
      icon: <CheckSquare className="w-4 h-4 text-indigo-400" />,
      run: () => { onClose(); onNavigate('tasks'); }
    },
    {
      id: 'reminders',
      label: isRTL ? 'التذكيرات والمواعيد' : 'Reminders & Follow-ups',
      shortcut: 'R',
      icon: <Bell className="w-4 h-4 text-orange-400" />,
      run: () => { onClose(); onNavigate('reminders'); }
    },
    {
      id: 'clients',
      label: isRTL ? 'سجل العملاء' : 'Clients Directory',
      shortcut: 'C',
      icon: <Users className="w-4 h-4 text-sky-400" />,
      run: () => { onClose(); onNavigate('clients'); }
    },
    {
      id: 'requests',
      label: isRTL ? 'الطلبات الداخلية والمراجعات' : 'Internal Requests',
      shortcut: 'Q',
      icon: <Inbox className="w-4 h-4 text-purple-400" />,
      run: () => { onClose(); onNavigate('requests'); }
    },
    {
      id: 'payments',
      label: isRTL ? 'المدفوعات والمستحقات المالية' : 'Payments & Accounts',
      shortcut: '$',
      icon: <DollarSign className="w-4 h-4 text-green-400" />,
      run: () => { onClose(); onNavigate('payments'); }
    },
    {
      id: 'team',
      label: isRTL ? 'إدارة الفريق والموظفين' : 'Team & Permissions',
      shortcut: 'U',
      icon: <Users className="w-4 h-4 text-violet-400" />,
      run: () => { onClose(); onNavigate('team'); }
    },
    {
      id: 'reports',
      label: isRTL ? 'التقارير والإحصائيات' : 'Reports & Analytics',
      shortcut: 'P',
      icon: <FileText className="w-4 h-4 text-pink-400" />,
      run: () => { onClose(); onNavigate('reports'); }
    },
    {
      id: 'activity_log',
      label: isRTL ? 'سجل تدقيق النشاط (Audit Log)' : 'Activity Audit Trail',
      shortcut: 'A',
      icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
      run: () => { onClose(); onNavigate('activity_log'); }
    },
    {
      id: 'how_it_works',
      label: isRTL ? 'دليل وتشغيل نظام جعفر بدران الشامل' : 'How Jaafar Bdran System Works',
      shortcut: 'H W',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      run: () => { onClose(); onNavigate('how_it_works'); }
    },
    {
      id: 'backup',
      label: isRTL ? 'النسخ الاحتياطي وتصدير JSON' : 'Offline Backup (JSON Export)',
      shortcut: 'B K',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      run: () => { onClose(); onNavigate('backup'); }
    },
    {
      id: 'trash',
      label: isRTL ? 'سلة المحذوفات' : 'Trash Bin',
      shortcut: 'T',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      run: () => { onClose(); onNavigate('trash'); }
    },
    {
      id: 'settings',
      label: isRTL ? 'إعدادات المنظومة' : 'System Settings',
      shortcut: 'S',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      run: () => { onClose(); onNavigate('settings'); }
    },
    {
      id: 'toggle_lang',
      label: isRTL ? 'التحويل للغة الإنجليزية (English)' : 'Switch to Arabic (العربية)',
      shortcut: 'L',
      icon: <Globe className="w-4 h-4 text-cyan-400" />,
      run: () => { toggleLanguage(); onClose(); }
    },
    {
      id: 'toggle_theme',
      label: isDark ? (isRTL ? 'تفعيل الوضع النهاري' : 'Switch to Light Mode') : (isRTL ? 'تفعيل الوضع الليلي' : 'Switch to Dark Mode'),
      shortcut: 'D',
      icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />,
      run: () => { setTheme(isDark ? 'light' : 'dark'); onClose(); }
    },
    {
      id: 'logout',
      label: isRTL ? 'تسجيل الخروج الآمن' : 'Secure Sign Out',
      shortcut: 'Esc',
      icon: <LogOut className="w-4 h-4 text-red-400" />,
      run: () => { logout(); onClose(); }
    }
  ];

  const filtered = actions.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase()) || 
    a.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black overflow-hidden ring-1 ring-cyan-500/20 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث عن أمر أو صفحة أو إجراء...' : 'Type a command or jump to...'}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {isRTL ? 'لم يتم العثور على أوامر مطابقة' : 'No matching commands found'}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.run}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors group cursor-pointer text-start"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-800/80 group-hover:bg-slate-700">
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-cyan-400" />
            <span>JB WORK COMMANDS</span>
          </div>
          <span>Esc {isRTL ? 'للإغلاق' : 'to close'}</span>
        </div>
      </div>
    </div>
  );
};
