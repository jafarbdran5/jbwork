import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import { ThemeProvider, useTheme } from './lib/theme';
import { AuthProvider, useAuth } from './lib/auth';
import { CommandPalette } from './components/command/CommandPalette';
import { QuickNewCaseModal } from './components/cases/QuickNewCaseModal';
import { CaseWorkspace } from './components/cases/CaseWorkspace';
import { CaseList } from './components/cases/CaseList';
import { PersonalDashboard } from './components/dashboard/PersonalDashboard';
import { JaafarWorkspace } from './components/dashboard/JaafarWorkspace';
import { ClientsModule } from './components/clients/ClientsModule';
import { TasksModule } from './components/tasks/TasksModule';
import { RemindersModule } from './components/reminders/RemindersModule';
import { InternalRequestsModule } from './components/requests/InternalRequestsModule';
import { ExternalRequestsModule } from './components/requests/ExternalRequestsModule';
import { PaymentsModule } from './components/payments/PaymentsModule';
import { ProfitsModule } from './components/finance/ProfitsModule';
import { MyFinancesModule } from './components/finance/MyFinancesModule';
import { EmployeeEarningsModule } from './components/team/EmployeeEarningsModule';
import { SecurityModule } from './components/security/SecurityModule';
import { TeamModule } from './components/team/TeamModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { AuditLogModule } from './components/audit/AuditLogModule';
import { TrashModule } from './components/trash/TrashModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { FormCenterModule } from './components/forms/FormCenterModule';
import { ProjectsModule } from './components/projects/ProjectsModule';
import { ContentStudioModule } from './components/content/ContentStudioModule';
import { KnowledgeModule } from './components/knowledge/KnowledgeModule';
import { FilesModule } from './components/files/FilesModule';
import { PersonalAreaModule } from './components/personal/PersonalAreaModule';
import { ApprovalCenterModule } from './components/approvals/ApprovalCenterModule';
import { BackupCenterModule } from './components/backup/BackupCenterModule';
import { MyDayModule } from './components/dashboard/MyDayModule';
import { LifeOSModule } from './components/personal/LifeOSModule';
import { PublicSheetsModule } from './components/sheets/PublicSheetsModule';
import { SystemManualModule } from './components/how-it-works/SystemManualModule';
import { SupportPortalsModule } from './components/support/SupportPortalsModule';
import { AppCustomizerModule } from './components/admin/AppCustomizerModule';
import { getVisibleNavigation, hasPermission } from './lib/permissionGuard';
import { getAppLabel, getAppLabelEn } from './lib/dynamicLabelsStore';
import { JbAiAssistantModal } from './components/ai/JbAiAssistantModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { useModalLifecycle } from './hooks/useModalLifecycle';

import {
  LayoutDashboard,
  Layers,
  FolderPlus,
  Briefcase,
  CheckSquare,
  Bell,
  Inbox,
  Users,
  DollarSign,
  BarChart3,
  Activity,
  Trash2,
  Settings,
  Search,
  LogOut,
  Moon,
  Sun,
  Globe,
  Menu,
  X,
  ShieldCheck,
  Zap,
  Wifi,
  WifiOff,
  UserCheck,
  TrendingUp,
  Wallet,
  Lock,
  Sparkles,
  FileSpreadsheet,
  Share2,
  BookOpen,
  HardDrive,
  CheckCheck,
  Database,
  CalendarCheck,
  KeyRound,
  HelpCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Grid,
  Heart,
  Calendar,
  Smartphone,
  ChevronDown
} from 'lucide-react';

function MainAppShell() {
  const { t, isRTL, language, setLanguage } = useI18n();
  const { theme, toggleTheme, isDark } = useTheme();
  const { userProfile, signOut, logout, isLoading } = useAuth();

  const [activeView, setActiveView] = useState<string>('life_os');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Modals & Sheets
  const [isQuickCaseOpen, setIsQuickCaseOpen] = useState<boolean>(false);
  const [quickCaseInitialType, setQuickCaseInitialType] = useState<string | undefined>(undefined);
  const [quickCaseInitialData, setQuickCaseInitialData] = useState<{ title?: string; clientName?: string; clientPhone?: string; notes?: string; links?: string[] } | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isFabSheetOpen, setIsFabSheetOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState<string>('');

  const { handleSafeClose: handleCloseFabSheet, handleBackdropClick: handleFabBackdropClick } = useModalLifecycle({
    isOpen: isFabSheetOpen,
    onClose: () => setIsFabSheetOpen(false),
    id: 'app-fab-sheet',
  });

  const { handleSafeClose: handleCloseDrawer, handleBackdropClick: handleDrawerBackdropClick } = useModalLifecycle({
    isOpen: isDrawerOpen,
    onClose: () => setIsDrawerOpen(false),
    id: 'app-drawer-sheet',
  });

  // Online / Offline monitor
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global keyboard shortcut for Command Palette (Cmd+K or Ctrl+K) & New Case (Cmd+N or Ctrl+N)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setQuickCaseInitialType(undefined);
        setQuickCaseInitialData(undefined);
        setIsQuickCaseOpen(true);
      }
    };

    const handleOpenCaseEvent = (e: any) => {
      const detail = e.detail || {};
      setQuickCaseInitialType(detail.type || detail.caseType || undefined);
      if (detail.prefill || detail.data || detail.initialData) {
        setQuickCaseInitialData(detail.prefill || detail.data || detail.initialData);
      } else {
        setQuickCaseInitialData(undefined);
      }
      setIsQuickCaseOpen(true);
      setIsFabSheetOpen(false);
      setIsDrawerOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('jb_open_new_case', handleOpenCaseEvent);
    window.addEventListener('jb_open_quick_case', handleOpenCaseEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('jb_open_new_case', handleOpenCaseEvent);
      window.removeEventListener('jb_open_quick_case', handleOpenCaseEvent);
    };
  }, []);

  if (isLoading && !userProfile) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center ${isDark ? 'bg-[#09090B] text-white' : 'bg-[#F4F6F9] text-slate-900'}`}>
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg animate-pulse mb-3">
          JB
        </div>
        <p className="text-xs font-medium text-slate-400">جاري تحميل المنظومة والتحقق من الجلسة...</p>
      </div>
    );
  }

  if (!userProfile) {
    return <AuthScreen />;
  }

  const handleOpenQuickCase = (typeKey?: string) => {
    setQuickCaseInitialType(typeKey);
    setIsQuickCaseOpen(true);
    setIsFabSheetOpen(false);
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsDrawerOpen(false);
  };

  const handleNavigate = (view: string) => {
    setSelectedCaseId(null);
    setActiveView(view);
    setIsDrawerOpen(false);
  };

  // Dynamic Navigation from Customization Store & Permission Guard & Dynamic Labels
  const [navData, setNavData] = useState(() => getVisibleNavigation(userProfile));

  useEffect(() => {
    const updateNav = () => {
      setNavData(getVisibleNavigation(userProfile));
    };
    updateNav();
    window.addEventListener('jb_customization_changed', updateNav);
    window.addEventListener('jb_labels_changed', updateNav);
    window.addEventListener('jb_data_changed', updateNav);
    return () => {
      window.removeEventListener('jb_customization_changed', updateNav);
      window.removeEventListener('jb_labels_changed', updateNav);
      window.removeEventListener('jb_data_changed', updateNav);
    };
  }, [userProfile]);

  const resolveNavIcon = (iconName?: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return LayoutDashboard;
      case 'Layers': return Layers;
      case 'UserCheck': return UserCheck;
      case 'Inbox': return Inbox;
      case 'Users': return Users;
      case 'CheckSquare': return CheckSquare;
      case 'Bell': return Bell;
      case 'DollarSign': return DollarSign;
      case 'TrendingUp': return TrendingUp;
      case 'FileSpreadsheet': return FileSpreadsheet;
      case 'Briefcase': return Briefcase;
      case 'HardDrive': return HardDrive;
      case 'BookOpen': return BookOpen;
      case 'Share2': return Share2;
      case 'ShieldCheck': return ShieldCheck;
      case 'HelpCircle': return HelpCircle;
      case 'Database': return Database;
      case 'BarChart3': return BarChart3;
      case 'Trash2': return Trash2;
      case 'Settings': return Settings;
      case 'Sparkles': return Sparkles;
      case 'CalendarCheck': return CalendarCheck;
      case 'Lock': return Lock;
      case 'Wallet': return Wallet;
      case 'Globe': return Globe;
      default: return Layers;
    }
  };

  const navSections = navData.sections.map(sec => ({
    id: sec.id,
    title: isRTL ? getAppLabel(sec.id, sec.titleAr) : (getAppLabelEn(sec.id, sec.titleEn || sec.titleAr)),
    items: sec.tabs.map(tab => ({
      id: tab.targetView,
      tabId: tab.id,
      label: isRTL ? getAppLabel(tab.id, tab.labelAr) : (getAppLabelEn(tab.id, tab.labelEn || tab.labelAr)),
      icon: resolveNavIcon(tab.iconName),
      badge: tab.badge
    }))
  }));

  const allNavItems = navSections.flatMap(sec => sec.items);
  const currentViewItem = allNavItems.find(item => item.id === activeView);

  // Filtered items for Android Drawer Search
  const filteredNavSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      !drawerSearchQuery.trim() || 
      item.label.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(drawerSearchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  // Bottom Navigation Primary Tabs (Android Material 3)
  const bottomTabs = [
    { id: 'life_os', label: isRTL ? 'الحياة' : 'Life', icon: Sparkles },
    { id: 'my_day', label: isRTL ? 'اليوم' : 'Today', icon: CalendarCheck },
    { id: 'cases', label: isRTL ? 'القضايا' : 'Cases', icon: Layers },
    { id: 'tasks', label: isRTL ? 'المهام' : 'Tasks', icon: CheckSquare },
    { id: 'menu_drawer', label: isRTL ? 'التطبيقات' : 'Apps', icon: Grid, isMenuTrigger: true },
  ];

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans select-none overflow-x-hidden ${
      isDark ? 'bg-[#09090B] text-[#FAFAFA]' : 'bg-[#F4F6F9] text-[#0F172A]'
    } ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* 📱 ANDROID TOP APP BAR (Material 3 Style) */}
      <header className={`sticky top-0 z-30 w-full px-3 sm:px-4 py-2.5 flex items-center justify-between border-b transition-colors shadow-xs ${
        isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-white border-slate-200'
      }`}>
        
        {/* Start Side: Navigation Action / App Icon */}
        <div className="flex items-center gap-2 sm:gap-3">
          {selectedCaseId ? (
            <button
              onClick={() => setSelectedCaseId(null)}
              className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
                isDark ? 'hover:bg-[#18181B] text-white' : 'hover:bg-slate-100 text-slate-800'
              }`}
              title={isRTL ? 'الرجوع للقائمة' : 'Back to cases'}
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
          ) : (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
                isDark ? 'hover:bg-[#18181B] text-white' : 'hover:bg-slate-100 text-slate-800'
              }`}
              title={isRTL ? 'فتح القائمة والتطبيقات' : 'Open Apps Drawer'}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => handleNavigate('life_os')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-mono font-black text-white text-xs shadow-xs">
              JB
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-sm leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {selectedCaseId 
                  ? (isRTL ? 'تفاصيل القضية' : 'Case Workspace')
                  : (currentViewItem?.label || (isRTL ? 'منظومة جعفر بدران' : 'JB OS'))}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-mono text-slate-400">
                  {isOnline ? (isRTL ? 'أوفلاين فاست' : 'Offline Fast') : (isRTL ? 'وضع غير متصل' : 'Offline Mode')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* End Side: Action Icons (Search, AI, Theme, Language) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          
          {/* Quick Search */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
              isDark ? 'text-slate-300 hover:bg-[#18181B]' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={isRTL ? 'بحث سريع (Ctrl+K)' : 'Quick Search'}
          >
            <Search className="w-5 h-5 text-indigo-500" />
          </button>

          {/* AI Executive Assistant */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
              isDark ? 'text-indigo-400 hover:bg-indigo-950/40' : 'text-indigo-600 hover:bg-indigo-50'
            }`}
            title={isRTL ? 'المساعد الذكي' : 'AI Assistant'}
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Day / Night Mode Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
              isDark ? 'text-amber-400 hover:bg-slate-900' : 'text-indigo-600 hover:bg-slate-100'
            }`}
            title={isDark ? (isRTL ? 'الوضع النهاري' : 'Light Mode') : (isRTL ? 'الوضع الليلي' : 'Dark Mode')}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer active:scale-95 ${
              isDark ? 'bg-[#18181B] text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Language"
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
      </header>

      {/* 📱 ANDROID CENTRAL VIEWPORT (Mobile-First Layout) */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-5 pt-3 pb-24 overflow-y-auto">
        
        {/* If a Case Workspace is open, render Case Workspace */}
        {selectedCaseId ? (
          <CaseWorkspace
            caseId={selectedCaseId}
            onBack={() => setSelectedCaseId(null)}
          />
        ) : (
          <>
            {/* 🌟 LIFE OS MODULE */}
            {activeView === 'life_os' && (
              <LifeOSModule />
            )}

            {activeView === 'my_day' && (
              <MyDayModule 
                onSelectCase={handleSelectCase}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'dashboard' && (
              <PersonalDashboard
                onSelectCase={handleSelectCase}
                onOpenQuickCase={handleOpenQuickCase}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'cases' && (
              <CaseList
                onSelectCase={handleSelectCase}
                onOpenQuickCase={handleOpenQuickCase}
                myCasesOnly={false}
              />
            )}

            {activeView === 'my_cases' && (
              <CaseList
                onSelectCase={handleSelectCase}
                onOpenQuickCase={handleOpenQuickCase}
                myCasesOnly={true}
              />
            )}

            {activeView === 'personal_area' && (
              <PersonalAreaModule />
            )}

            {activeView === 'my_finances' && (
              <MyFinancesModule />
            )}

            {activeView === 'projects' && (
              <ProjectsModule onSelectCase={handleSelectCase} />
            )}

            {activeView === 'content_studio' && (
              <ContentStudioModule />
            )}

            {activeView === 'knowledge' && (
              <KnowledgeModule />
            )}

            {activeView === 'external_requests' && (
              <ExternalRequestsModule 
                onSelectCase={handleSelectCase}
                onNavigate={handleNavigate}
                onOpenQuickCaseWithData={(prefill) => {
                  setQuickCaseInitialData(prefill);
                  setIsQuickCaseOpen(true);
                }}
              />
            )}

            {activeView === 'sheets' && (
              <PublicSheetsModule 
                onOpenQuickCaseWithData={(prefill) => {
                  setQuickCaseInitialData(prefill);
                  setIsQuickCaseOpen(true);
                }}
                onSelectCase={handleSelectCase}
                onNavigate={(v) => setActiveView(v as any)}
              />
            )}

            {activeView === 'forms' && (
              <FormCenterModule />
            )}

            {activeView === 'files' && (
              <FilesModule onSelectCase={handleSelectCase} />
            )}

            {activeView === 'tasks' && (
              <TasksModule onSelectCase={handleSelectCase} />
            )}

            {activeView === 'reminders' && (
              <RemindersModule onSelectCase={handleSelectCase} />
            )}

            {activeView === 'clients' && (
              <ClientsModule onSelectClient={() => {}} />
            )}

            {activeView === 'payments' && (
              <PaymentsModule onSelectCase={handleSelectCase} />
            )}

            {activeView === 'profits' && (
              <ProfitsModule onSelectCase={handleSelectCase} />
            )}

            {activeView === 'how_it_works' && (
              <SystemManualModule onNavigateToView={handleNavigate} />
            )}

            {activeView === 'support_portals' && (
              <SupportPortalsModule 
                onSelectCase={handleSelectCase} 
                onOpenQuickCaseWithData={(prefill) => {
                  setQuickCaseInitialData(prefill);
                  setIsQuickCaseOpen(true);
                }}
              />
            )}

            {activeView === 'app_customizer' && (
              <AppCustomizerModule />
            )}

            {activeView === 'backup' && (
              <BackupCenterModule />
            )}

            {activeView === 'team' && (
              <TeamModule />
            )}

            {activeView === 'security' && (
              <SecurityModule />
            )}

            {activeView === 'reports' && (
              <ReportsModule />
            )}

            {activeView === 'trash' && (
              <TrashModule />
            )}

            {activeView === 'settings' && (
              <SettingsModule />
            )}
          </>
        )}
      </main>

      {/* 📱 ANDROID FLOATING ACTION BUTTON (FAB) */}
      {!selectedCaseId && (
        <div className={`fixed z-40 ${isRTL ? 'left-4 sm:left-6' : 'right-4 sm:right-6'} bottom-20`}>
          <button
            onClick={() => setIsFabSheetOpen(true)}
            className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center cursor-pointer transition-transform active:scale-90"
            title={isRTL ? 'إجراء سريع جديد' : 'New Quick Action'}
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* 📱 ANDROID BOTTOM NAVIGATION BAR (Fixed & Stable) */}
      <nav className={`fixed bottom-0 left-0 right-0 z-30 h-16 border-t px-2 flex items-center justify-around transition-colors shadow-lg ${
        isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-white border-slate-200'
      }`}>
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = !selectedCaseId && !tab.isMenuTrigger && activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isMenuTrigger) {
                  setIsDrawerOpen(true);
                } else {
                  handleNavigate(tab.id);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] rounded-xl cursor-pointer transition-all active:scale-95 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className={`px-4 py-1 rounded-full transition-colors ${
                isActive 
                  ? isDark ? 'bg-indigo-950/80 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  : 'bg-transparent'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[11px] font-medium leading-none mt-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 📱 ANDROID FAB QUICK ACTION SHEET (Bottom Modal) */}
      {isFabSheetOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
          onClick={handleFabBackdropClick}
        >
          <div className="flex-1" onClick={handleCloseFabSheet} />
          
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg mx-auto rounded-t-3xl border-t p-5 space-y-4 shadow-2xl transition-colors animate-in slide-in-from-bottom duration-200 ${
            isDark ? 'bg-[#121214] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-400/40 mx-auto" />
            
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-base">
                {isRTL ? 'إجراء سريع جديد' : 'Quick Actions'}
              </span>
              <button 
                type="button"
                onClick={handleCloseFabSheet} 
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer rounded-lg hover:bg-slate-800/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  handleCloseFabSheet();
                  setTimeout(() => {
                    handleOpenQuickCase();
                  }, 20);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-start">
                  <p className="leading-tight">{isRTL ? 'إضافة قضية جديدة' : 'New Legal Case'}</p>
                  <p className="text-[11px] font-normal text-indigo-100 opacity-90">{isRTL ? 'تسجيل قضية مع منع التكرار الذكي' : 'Register case with duplicate detection'}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  handleCloseFabSheet();
                  handleNavigate('tasks');
                }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border font-bold text-sm cursor-pointer active:scale-98 transition-all ${
                  isDark ? 'bg-[#18181B] border-[#27272A] text-white hover:bg-[#27272A]' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <p className="leading-tight">{isRTL ? 'مهمة جديدة' : 'New Task'}</p>
                  <p className="text-[11px] font-normal text-slate-400">{isRTL ? 'إضافة مهمة سريعة إلى قائمة المتابعة' : 'Add task to tracker'}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  handleCloseFabSheet();
                  handleNavigate('reminders');
                }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border font-bold text-sm cursor-pointer active:scale-98 transition-all ${
                  isDark ? 'bg-[#18181B] border-[#27272A] text-white hover:bg-[#27272A]' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <p className="leading-tight">{isRTL ? 'جلسة أو تذكير جديد' : 'New Reminder / Hearing'}</p>
                  <p className="text-[11px] font-normal text-slate-400">{isRTL ? 'تحديد موعد جلسة أو تنبيه مهم' : 'Schedule court session or reminder'}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  handleCloseFabSheet();
                  handleNavigate('life_os');
                }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border font-bold text-sm cursor-pointer active:scale-98 transition-all ${
                  isDark ? 'bg-[#18181B] border-[#27272A] text-white hover:bg-[#27272A]' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <p className="leading-tight">{isRTL ? 'تدوينة سريعة أو عادة' : 'Life OS & Habits'}</p>
                  <p className="text-[11px] font-normal text-slate-400">{isRTL ? 'تسجيل فكرة أو تحديث عادة يومية' : 'Log quick note or track routine'}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 ANDROID APPS DRAWER / ALL MODULES SHEET */}
      {isDrawerOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex animate-in fade-in duration-150"
          onClick={handleDrawerBackdropClick}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm sm:max-w-md h-full flex flex-col justify-between overflow-y-auto border-e transition-colors animate-in slide-in-from-start duration-200 ${
            isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            
            {/* Drawer Header */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-mono font-bold text-white text-sm">
                    JB
                  </div>
                  <div>
                    <span className="font-bold text-sm leading-tight block">منظومة جعفر بدران</span>
                    <span className="text-[11px] text-slate-400">تطبيق العمل والحياة المستقل</span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={handleCloseDrawer} 
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instant Drawer Search Input */}
              <div className="relative">
                <Search className={`w-4 h-4 absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-slate-400`} />
                <input
                  type="text"
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                  placeholder={isRTL ? 'ابحث عن أي قسم أو أداة...' : 'Search apps & modules...'}
                  className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Categorized Apps List */}
            <div className="flex-1 px-4 py-2 space-y-5 overflow-y-auto">
              {filteredNavSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1.5">
                  <div className="text-[11px] uppercase font-bold text-slate-400 px-2 tracking-wider">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = !selectedCaseId && activeView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold cursor-pointer min-h-[48px] active:scale-98 transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20'
                              : isDark 
                                ? 'text-slate-300 hover:bg-[#18181B] hover:text-white' 
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                              isActive 
                                ? 'bg-indigo-700 text-white' 
                                : isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* User Profile & Quick Actions at bottom */}
            <div className={`p-4 border-t space-y-2.5 ${isDark ? 'border-[#27272A]' : 'border-slate-200'}`}>
              <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
                isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {userProfile?.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : 'JB'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userProfile?.displayName || (isRTL ? 'جعفر بدران' : 'Jaafar Bdran')}
                  </span>
                  <span className="text-[11px] text-indigo-500 font-mono truncate">
                    {userProfile?.email || (isRTL ? 'المالك والمسؤول الأوحد' : 'Master Owner')}
                  </span>
                </div>
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer transition-colors"
                  title={isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </div>

              {/* Explicit Sign Out / Logout Button */}
              <button
                onClick={() => {
                  handleCloseDrawer();
                  signOut();
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/40 cursor-pointer transition-all active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>{isRTL ? 'تسجيل الخروج من المنظومة' : 'Sign Out of System'}</span>
              </button>
            </div>

          </div>

          <div className="flex-1" onClick={handleCloseDrawer} />
        </div>
      )}

      {/* Quick New Case Modal */}
      {isQuickCaseOpen && (
        <QuickNewCaseModal
          isOpen={isQuickCaseOpen}
          initialType={quickCaseInitialType}
          initialData={quickCaseInitialData}
          onClose={() => {
            setIsQuickCaseOpen(false);
            setQuickCaseInitialType(undefined);
            setQuickCaseInitialData(undefined);
          }}
          onCaseCreated={(caseId) => {
            setSelectedCaseId(caseId);
          }}
        />
      )}

      {/* JB AI Executive Assistant Modal */}
      {isAiModalOpen && (
        <JbAiAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {/* Global Command Palette */}
      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectCase={(caseId) => {
            setSelectedCaseId(caseId);
            setIsCommandPaletteOpen(false);
          }}
          onNavigate={(view) => {
            handleNavigate(view);
            setIsCommandPaletteOpen(false);
          }}
          onOpenQuickCase={(typeKey) => {
            setIsCommandPaletteOpen(false);
            handleOpenQuickCase(typeKey);
          }}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <MainAppShell />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
