import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import { ThemeProvider, useTheme } from './lib/theme';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/auth/AuthScreen';
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
import { JbAiAssistantModal } from './components/ai/JbAiAssistantModal';

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
  CalendarCheck
} from 'lucide-react';

function MainAppShell() {
  const { t, isRTL, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { userProfile, signOut, isSuperAdmin, canManageFinance } = useAuth();

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Modals
  const [isQuickCaseOpen, setIsQuickCaseOpen] = useState<boolean>(false);
  const [quickCaseInitialType, setQuickCaseInitialType] = useState<string | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

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

  const navItems = [
    { id: 'my_day', label: isRTL ? 'خطة اليوم (My Day)' : 'My Day', icon: CalendarCheck, badge: 'AI' },
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'cases', label: t('navCases'), icon: Layers },
    { id: 'my_cases', label: t('navMyCases'), icon: UserCheck },
    ...(isSuperAdmin ? [
      { id: 'jaafar_workspace', label: t('navJaafarWorkspace'), icon: Briefcase, badge: 'JA' },
      { id: 'personal_area', label: isRTL ? 'مساحتي الخاصة والأفكار' : 'Personal OS', icon: Lock, badge: 'VIP' },
      { id: 'profits', label: isRTL ? 'أرباح الأعمال والمنظومة' : 'Profits & Finance', icon: TrendingUp, badge: 'PRO' },
      { id: 'my_finances', label: isRTL ? 'ماليتي الخاصة والأصول' : 'My Finances & Assets', icon: Wallet, badge: 'VIP' },
      { id: 'approvals', label: isRTL ? 'مركز الموافقات والقرارات' : 'Approvals Gate', icon: CheckCheck, badge: 'GATE' }
    ] : []),
    { id: 'projects', label: isRTL ? 'المشاريع والمبادرات' : 'Projects & Milestones', icon: Briefcase },
    { id: 'content_studio', label: isRTL ? 'استوديو صناعة المحتوى' : 'Content Studio', icon: Share2 },
    { id: 'knowledge', label: isRTL ? 'قاعدة المعرفة والأدلة' : 'JB Knowledge Base', icon: BookOpen },
    { id: 'forms', label: isRTL ? 'نماذج الاستقبال والأتمتة' : 'Form Center', icon: FileSpreadsheet, badge: 'AUTO' },
    { id: 'files', label: isRTL ? 'الملفات و Google Drive' : 'Drive & Files', icon: HardDrive },
    { id: 'earnings', label: isRTL ? 'مستحقاتي وأرباحي' : 'My Earnings', icon: DollarSign },
    { id: 'tasks', label: t('navTasks'), icon: CheckSquare },
    { id: 'reminders', label: t('navReminders'), icon: Bell },
    { id: 'external_requests', label: t('navExternalRequests'), icon: Inbox, badge: 'Google' },
    { id: 'requests', label: t('navRequests'), icon: Inbox },
    { id: 'clients', label: t('navClients'), icon: Users },
    ...(canManageFinance ? [{ id: 'payments', label: t('navPayments'), icon: DollarSign }] : []),
    { id: 'reports', label: t('navReports'), icon: BarChart3 },
    ...(isSuperAdmin ? [
      { id: 'team', label: t('navTeam'), icon: Users },
      { id: 'security', label: isRTL ? 'مركز الأمان والمراقبة' : 'Security & Access', icon: ShieldCheck, badge: 'SEC' },
      { id: 'backup', label: isRTL ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Recovery', icon: Database, badge: 'JSON' }
    ] : []),
    { id: 'activity_log', label: t('navActivityLog'), icon: Activity },
    { id: 'trash', label: t('navTrash'), icon: Trash2 },
    { id: 'settings', label: t('navSettings'), icon: Settings },
  ];

  return (
    <div className={`min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col font-sans selection:bg-indigo-600 selection:text-white ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-b border-[#27272A] px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
        
        {/* Left Side: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-[#A1A1AA] hover:text-white rounded-md hover:bg-[#18181B] cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div 
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-mono font-bold text-white text-sm shadow-sm group-hover:bg-indigo-500 transition-colors">
              JB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-[#FAFAFA] tracking-tight">
                  {t('appName')}
                </span>
                {isSuperAdmin && (
                  <span className="hidden sm:inline-block text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#A1A1AA] font-medium leading-tight hidden md:block">
                {isRTL ? 'نظام عمل جعفر بدران الداخلي' : 'Jaafar Bdran Internal Work System'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-3 bg-[#18181B] hover:bg-[#27272A]/80 border border-[#27272A] rounded-md px-3.5 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-all cursor-pointer w-72 lg:w-96 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs">{t('commandSearch')}</span>
          </div>
          <kbd className="font-mono text-[10px] bg-[#09090B] px-1.5 py-0.5 rounded border border-[#27272A] text-[#71717A]">
            ⌘K
          </kbd>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* AI Executive Assistant */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors cursor-pointer"
            title="JB AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Quick New Case Button */}
          <button
            onClick={() => handleOpenQuickCase()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+{t('newCase')}</span>
          </button>

          {/* Network Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#18181B] border border-[#27272A]">
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[#A1A1AA]">Online</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-amber-400">Offline</span>
              </>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-2.5 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA] text-xs font-medium transition-colors cursor-pointer"
            title="Language"
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="p-2 rounded-md bg-[#18181B] hover:bg-rose-950/40 border border-[#27272A] hover:border-rose-900 text-[#A1A1AA] hover:text-rose-300 transition-colors cursor-pointer"
            title={t('signOut')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </header>

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#09090B] border-e border-[#27272A] p-4 space-y-1 shrink-0 overflow-y-auto">
          <div className="mb-4 px-2">
            <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-2">
              {isRTL ? 'القائمة الرئيسية' : 'MAIN NAVIGATION'}
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = !selectedCaseId && activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#18181B] text-white font-medium border border-[#27272A]'
                      : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#71717A]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-3 px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                JB
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-[#FAFAFA] truncate">{userProfile?.displayName}</span>
                <span className="text-[10px] text-[#71717A] font-mono uppercase">{userProfile?.role}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-[#09090B]/80 backdrop-blur-sm flex">
            <div className="w-72 bg-[#09090B] border-e border-[#27272A] p-4 space-y-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-1">
                <div className="flex items-center justify-between pb-3 border-b border-[#27272A] mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-mono font-bold text-white text-xs">
                      JB
                    </div>
                    <span className="font-bold text-[#FAFAFA] text-sm">{t('appName')}</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-[#A1A1AA] p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = !selectedCaseId && activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#18181B] text-white border border-[#27272A]'
                          : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#27272A]">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-rose-400 hover:bg-rose-950/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('signOut')}</span>
                </button>
              </div>
            </div>

            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Central Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#09090B]">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* If a Case Workspace is open, render Case Workspace */}
            {selectedCaseId ? (
              <CaseWorkspace
                caseId={selectedCaseId}
                onBack={() => setSelectedCaseId(null)}
              />
            ) : (
              <>
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

                {activeView === 'jaafar_workspace' && (
                  <JaafarWorkspace
                    onSelectCase={handleSelectCase}
                    onOpenQuickCase={handleOpenQuickCase}
                    onNavigate={handleNavigate}
                  />
                )}

                {activeView === 'personal_area' && isSuperAdmin && (
                  <PersonalAreaModule />
                )}

                {activeView === 'approvals' && isSuperAdmin && (
                  <ApprovalCenterModule />
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

                {activeView === 'external_requests' && (
                  <ExternalRequestsModule 
                    onSelectCase={handleSelectCase} 
                    onNavigateToSettings={() => handleNavigate('settings')} 
                  />
                )}

                {activeView === 'requests' && (
                  <InternalRequestsModule onSelectCase={handleSelectCase} />
                )}

                {activeView === 'clients' && (
                  <ClientsModule onSelectClient={() => {}} />
                )}

                {activeView === 'payments' && (
                  <PaymentsModule onSelectCase={handleSelectCase} />
                )}

                {activeView === 'profits' && isSuperAdmin && (
                  <ProfitsModule onSelectCase={handleSelectCase} />
                )}

                {activeView === 'my_finances' && isSuperAdmin && (
                  <MyFinancesModule />
                )}

                {activeView === 'earnings' && (
                  <EmployeeEarningsModule onSelectCase={handleSelectCase} />
                )}

                {activeView === 'security' && isSuperAdmin && (
                  <SecurityModule />
                )}

                {activeView === 'backup' && isSuperAdmin && (
                  <BackupCenterModule />
                )}

                {activeView === 'team' && (
                  <TeamModule />
                )}

                {activeView === 'reports' && (
                  <ReportsModule />
                )}

                {activeView === 'activity_log' && (
                  <AuditLogModule />
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
      <footer className="h-10 border-t border-[#27272A] px-6 sm:px-8 flex items-center justify-between text-[10px] text-[#71717A] font-medium bg-[#09090B]">
        <div>JB Work — {isRTL ? 'نظام عمل جعفر بدران الداخلي' : 'Jaafar Bdran Internal Work System'}</div>
        <div>{isRTL ? 'الإصدار 1.0.0 — جميع الحقوق محفوظة © 2026' : 'Version 1.0.0 — All Rights Reserved © 2026'}</div>
      </footer>

      {/* Quick New Case Modal */}
      {isQuickCaseOpen && (
        <QuickNewCaseModal
          isOpen={isQuickCaseOpen}
          initialType={quickCaseInitialType}
          onClose={() => {
            setIsQuickCaseOpen(false);
            setQuickCaseInitialType(undefined);
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
          <AuthWrapper />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function AuthWrapper() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center font-mono font-black text-white text-lg mx-auto animate-pulse">
            JB
          </div>
          <p className="text-xs text-slate-400 font-mono">JB Work — Loading system...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <AuthScreen />;
  }

  return <MainAppShell />;
}
