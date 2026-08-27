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
import { HowJaafarBdranSystemWorks } from './components/how-it-works/HowJaafarBdranSystemWorks';
import { JbAiAssistantModal } from './components/ai/JbAiAssistantModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';

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
  HelpCircle
} from 'lucide-react';

function MainAppShell() {
  const { t, isRTL, language, setLanguage } = useI18n();
  const { theme, toggleTheme, isDark } = useTheme();
  const { userProfile } = useAuth();

  const [activeView, setActiveView] = useState<string>('life_os');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Modals
  const [isQuickCaseOpen, setIsQuickCaseOpen] = useState<boolean>(false);
  const [quickCaseInitialType, setQuickCaseInitialType] = useState<string | undefined>(undefined);
  const [quickCaseInitialData, setQuickCaseInitialData] = useState<{ title?: string; clientName?: string; clientPhone?: string; notes?: string; links?: string[] } | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Online / Offline monitor
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global keyboard shortcut for Command Palette (Cmd+K or Ctrl+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setQuickCaseInitialType(undefined);
        setIsQuickCaseOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenQuickCase = (typeKey?: string) => {
    setQuickCaseInitialType(typeKey);
    setIsQuickCaseOpen(true);
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (view: string) => {
    setSelectedCaseId(null);
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  // Nav Groups tailored for Jaafar's Personal Work & Life OS
  const navSections = [
    {
      title: isRTL ? 'إدارة الحياة واليوم (Life OS)' : 'LIFE & PERSONAL OS',
      items: [
        { id: 'life_os', label: isRTL ? 'نظام الحياة والروتين (Life OS)' : 'Life & Habits OS', icon: Sparkles, badge: 'OFFLINE' },
        { id: 'my_day', label: isRTL ? 'خطة اليوم والتركيز' : 'My Day & Focus', icon: CalendarCheck, badge: 'DAY' },
        { id: 'personal_area', label: isRTL ? 'المفكرة والأفكار الخاصة' : 'Personal Vault & Ideas', icon: Lock, badge: 'VIP' },
        { id: 'my_finances', label: isRTL ? 'ماليتي والميزانية' : 'My Finances & Cashflow', icon: Wallet, badge: 'VIP' },
      ]
    },
    {
      title: isRTL ? 'إدارة القضايا والعمل (Legal Cases)' : 'LEGAL CASES & WORK',
      items: [
        { id: 'dashboard', label: isRTL ? 'لوحة المتابعة الشاملة' : 'Work Dashboard', icon: LayoutDashboard },
        { id: 'cases', label: isRTL ? 'جميع القضايا' : 'All Cases', icon: Layers },
        { id: 'external_requests', label: isRTL ? 'الطلبات الخارجية واستجابات الشيت' : 'External Requests & Sheets', icon: Inbox, badge: 'SHEETS' },
        { id: 'my_cases', label: isRTL ? 'قضاياي المباشرة' : 'My Active Cases', icon: UserCheck },
        { id: 'clients', label: isRTL ? 'دليل الموكلين' : 'Clients Directory', icon: Users },
        { id: 'tasks', label: isRTL ? 'المهام والمتابعات' : 'Tasks & Todos', icon: CheckSquare },
        { id: 'reminders', label: isRTL ? 'التذكيرات والجلسات' : 'Reminders & Hearings', icon: Bell },
        { id: 'payments', label: isRTL ? 'أتعاب ومدفوعات القضايا' : 'Case Payments & Fees', icon: DollarSign },
        { id: 'profits', label: isRTL ? 'أرباح الأعمال والمنظومة' : 'Profits & Revenue', icon: TrendingUp },
      ]
    },
    {
      title: isRTL ? 'المعرفة والمستندات (Vault & Tools)' : 'VAULT & TOOLS',
      items: [
        { id: 'sheets', label: isRTL ? 'قارئ Google Sheets والفورمز' : 'Google Sheets & Forms Hub', icon: FileSpreadsheet, badge: 'ZERO-AUTH' },
        { id: 'projects', label: isRTL ? 'المشاريع والمبادرات' : 'Projects & Milestones', icon: Briefcase },
        { id: 'files', label: isRTL ? 'المستندات والملفات' : 'Files & Documents', icon: HardDrive },
        { id: 'knowledge', label: isRTL ? 'الموسوعة القانونية' : 'Legal Knowledge Base', icon: BookOpen },
        { id: 'content_studio', label: isRTL ? 'استوديو صناعة المحتوى' : 'Content Studio', icon: Share2 },
        { id: 'forms', label: isRTL ? 'نماذج الاستقبال' : 'Form Center', icon: FileSpreadsheet },
      ]
    },
    {
      title: isRTL ? 'النظام والأمان (System & Backup)' : 'SYSTEM & BACKUP',
      items: [
        { id: 'team', label: isRTL ? 'إدارة الفريق والمشرفين' : 'Team & Staff', icon: Users, badge: '50' },
        { id: 'security', label: isRTL ? 'مركز الأمان والنشاط' : 'Security & Audit', icon: ShieldCheck },
        { id: 'how_it_works', label: isRTL ? 'دليل وتشغيل المنظومة' : 'How System Works', icon: HelpCircle, badge: 'GUIDE' },
        { id: 'backup', label: isRTL ? 'النسخ الاحتياطي والاستعادة' : 'Offline Backup (JSON)', icon: Database, badge: 'JSON' },
        { id: 'reports', label: isRTL ? 'التقارير والإحصائيات' : 'Reports & Analytics', icon: BarChart3 },
        { id: 'trash', label: isRTL ? 'سلة المهملات' : 'Trash', icon: Trash2 },
        { id: 'settings', label: isRTL ? 'إعدادات المظهر والنظام' : 'Settings & Themes', icon: Settings },
      ]
    }
  ];

  const allNavItems = navSections.flatMap(sec => sec.items);

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white ${
      isDark ? 'bg-[#09090B] text-[#FAFAFA]' : 'bg-[#F8FAFC] text-[#0F172A]'
    } ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between border-b transition-colors ${
        isDark ? 'bg-[#09090B]/95 border-[#27272A]' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        
        {/* Left Side: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg cursor-pointer ${
              isDark ? 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div 
            onClick={() => handleNavigate('life_os')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-mono font-black text-white text-sm shadow-md shadow-indigo-600/20 group-hover:bg-indigo-500 transition-colors">
              JB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-black text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isRTL ? 'منظومة جعفر بدران (JB OS)' : 'Jaafar Bdran Life & Work OS'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                  100% Offline
                </span>
              </div>
              <p className={`text-[11px] font-medium leading-tight hidden md:block ${isDark ? 'text-[#A1A1AA]' : 'text-slate-500'}`}>
                {isRTL ? 'إدارة القضايا والعمل وتنظيم الحياة الشخصية' : 'Personal Legal & Life Management System'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`hidden md:flex items-center gap-3 border rounded-xl px-3.5 py-2 text-xs transition-all cursor-pointer w-72 lg:w-96 justify-between ${
            isDark 
              ? 'bg-[#18181B] hover:bg-[#27272A] border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]' 
              : 'bg-slate-100 hover:bg-slate-200/70 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium">{t('commandSearch')}</span>
          </div>
          <kbd className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
            isDark ? 'bg-[#09090B] border-[#27272A] text-[#71717A]' : 'bg-white border-slate-300 text-slate-500'
          }`}>
            ⌘K
          </kbd>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Light / Dark Mode Toggle Button (Eye Comfort) */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-300' 
                : 'bg-white border-slate-200 hover:bg-slate-100 text-indigo-700 shadow-xs'
            }`}
            title={isDark ? (isRTL ? 'التحويل للوضع النهاري (Light Mode)' : 'Switch to Light Mode') : (isRTL ? 'التحويل للوضع الليلي (Dark Mode)' : 'Switch to Night Mode')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span className="hidden sm:inline font-medium">
              {isDark ? (isRTL ? 'نهاري' : 'Light') : (isRTL ? 'ليلي' : 'Dark')}
            </span>
          </button>

          {/* AI Executive Assistant */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="JB AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Quick New Case Button */}
          <button
            onClick={() => handleOpenQuickCase()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+{t('newCase')}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isDark ? 'bg-[#18181B] hover:bg-[#27272A] border-[#27272A] text-[#FAFAFA]' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
            }`}
            title="Language"
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>

      </header>

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar Navigation */}
        <aside className={`hidden lg:flex flex-col w-64 border-e p-4 space-y-4 shrink-0 overflow-y-auto transition-colors ${
          isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-white border-slate-200'
        }`}>
          
          <nav className="flex-1 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className={`px-3 text-[10px] uppercase font-black tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = !selectedCaseId && activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? isDark 
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' 
                            : 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                          : isDark
                            ? 'text-slate-400 hover:bg-slate-900 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
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
            ))}
          </nav>

          {/* User Profile Card */}
          <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-[#27272A]' : 'border-slate-200'}`}>
            <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-xl ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                JB
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>جعفر بدران</span>
                <span className="text-[10px] text-indigo-400 font-mono font-medium">المالك والمسؤول الأوحد</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
            <div className={`w-72 border-e p-4 space-y-4 flex flex-col justify-between overflow-y-auto ${
              isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-4">
                <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-[#27272A]' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-mono font-bold text-white text-xs">
                      JB
                    </div>
                    <span className="font-bold text-sm">منظومة جعفر بدران</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 px-2">
                      {section.title}
                    </div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = !selectedCaseId && activeView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : isDark ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Central Content Area */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors ${
          isDark ? 'bg-[#09090B]' : 'bg-[#F8FAFC]'
        }`}>
          <div className="max-w-7xl mx-auto space-y-6">
            
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
                  <HowJaafarBdranSystemWorks onNavigate={handleNavigate} />
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

          </div>
        </main>

      </div>

      {/* Polish Footer */}
      <footer className={`h-10 border-t px-6 sm:px-8 flex items-center justify-between text-[11px] font-medium transition-colors ${
        isDark ? 'bg-[#09090B] border-[#27272A] text-slate-500' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div>{isRTL ? 'نظام عمل وحياة جعفر بدران (JB OS)' : 'Jaafar Bdran Life & Work OS'} — 100% Offline Fast</div>
        <div>{isRTL ? 'الإصدار 1.0.0 — مساحة خاصة ومستقلة © 2026' : 'Version 1.0.0 — Private Independent Workspace © 2026'}</div>
      </footer>

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
