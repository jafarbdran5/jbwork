import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { CaseItem, CaseTypeConfig, PlatformConfig, UserProfile, CaseStatus, CasePriority } from '../../types';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { getLocalCases, saveLocalCase } from '../../lib/offlineStore';
import { deleteEntity } from '../../services/database/deleteService';
import { 
  Search, 
  Filter, 
  FolderPlus, 
  Layers, 
  Tag, 
  Clock, 
  User, 
  Calendar, 
  ChevronRight, 
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Phone,
  Coins,
  Trash2
} from 'lucide-react';

interface CaseListProps {
  onSelectCase: (caseId: string) => void;
  onOpenQuickCase: (type?: string) => void;
  myCasesOnly?: boolean;
}

export const CaseList: React.FC<CaseListProps> = ({
  onSelectCase,
  onOpenQuickCase,
  myCasesOnly = false
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile, canEdit } = useAuth();

  const [cases, setCases] = useState<CaseItem[]>(() => getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted));
  const [loading, setLoading] = useState<boolean>(() => getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted).length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Quick Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeQuickFilter, setTypeQuickFilter] = useState<string>('all');

  // Advanced Filters
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  const [caseTypes, setCaseTypes] = useState<CaseTypeConfig[]>(DEFAULT_CASE_TYPES);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  // Subscribe to Cases & Live Deletion Events
  useEffect(() => {
    const syncLocal = () => {
      const local = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
      setCases(local);
    };

    const handleDataChanged = (e: any) => {
      if (e.detail?.entityType === 'case' || e.detail?.type) {
        syncLocal();
      }
    };

    window.addEventListener('jb_data_changed', handleDataChanged);
    window.addEventListener('jb_entity_deleted', handleDataChanged);
    window.addEventListener('jb_entity_restored', handleDataChanged);

    const q = query(collection(db, 'cases'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CaseItem))
        .filter(c => !c.isDeleted && !(c as any)._deleted)
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

      if (list.length > 0) {
        setCases(list);
        list.forEach(c => saveLocalCase(c));
      } else {
        syncLocal();
      }
      setLoading(false);
    }, (err) => {
      console.warn('CaseList query fallback:', err);
      syncLocal();
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('jb_data_changed', handleDataChanged);
      window.removeEventListener('jb_entity_deleted', handleDataChanged);
      window.removeEventListener('jb_entity_restored', handleDataChanged);
    };
  }, []);

  // Quick Direct Delete Handler
  const handleDeleteCase = async (e: React.MouseEvent, caseItem: CaseItem) => {
    e.stopPropagation();

    const confirmMsg = isRTL 
      ? `هل أنت متأكد من نقل القضية (${caseItem.caseNumber || ''} - ${caseItem.title || ''}) إلى سلة المهملات؟`
      : `Move case (${caseItem.caseNumber || ''} - ${caseItem.title || ''}) to Recycle Bin?`;
    
    if (!window.confirm(confirmMsg)) return;

    // 1. Immediately remove from React state for zero-latency UI
    setCases(prev => prev.filter(c => c.id !== caseItem.id && c.caseNumber !== caseItem.caseNumber));

    // 2. Call unified deletion service
    await deleteEntity('case', caseItem.id, userProfile, {
      customTitle: `${caseItem.caseNumber || ''} - ${caseItem.title || ''}`,
      reason: 'حذف مباشر من قائمة القضايا'
    });
  };

  // Filter cases
  const filteredCases = cases.filter(item => {
    if (item.isDeleted || (item as any)._deleted) return false;
    // 1. My cases check
    if (myCasesOnly && userProfile && item.assignedTo?.uid !== userProfile.uid) {
      return false;
    }

    // 2. Status Quick Filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // 3. Type Quick Filter
    if (typeQuickFilter !== 'all' && item.caseType !== typeQuickFilter) {
      return false;
    }

    // 4. Advanced: Platform
    if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) {
      return false;
    }

    // 5. Advanced: Priority
    if (selectedPriority !== 'all' && item.priority !== selectedPriority) {
      return false;
    }

    // 6. Advanced: Assignee
    if (selectedAssignee !== 'all' && item.assignedTo?.uid !== selectedAssignee) {
      return false;
    }

    // 7. Text Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = item.caseNumber?.toLowerCase().includes(q);
      const extMatch = item.externalNumber?.toLowerCase().includes(q);
      const titleMatch = item.title?.toLowerCase().includes(q);
      const clientMatch = item.client?.name?.toLowerCase().includes(q) || item.client?.phone?.includes(q);
      const platformMatch = item.platform?.toLowerCase().includes(q);
      const notesMatch = item.notes?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      
      return numMatch || extMatch || titleMatch || clientMatch || platformMatch || notesMatch;
    }

    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>{myCasesOnly ? t('navMyCases') : t('navCases')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {filteredCases.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'إدارة ومتابعة قضايا الأمن الرقمي وحذف المحتوى واستعادة الحسابات' : 'Manage and track cybersecurity, takedowns and investigation cases'}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => onOpenQuickCase()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t('newCase')}</span>
          </button>
        )}
      </div>

      {/* Search & Quick Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
        
        {/* Search Input and Filter toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl ps-10 pe-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              showAdvanced || selectedPlatform !== 'all' || selectedPriority !== 'all'
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t('filter')}</span>
          </button>
        </div>

        {/* Status Quick Filters Pills (Requirement 30) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: t('filterAll') },
            { id: 'new', label: t('filterNew') },
            { id: 'in_progress', label: t('filterInProgress') },
            { id: 'pending', label: t('filterPending') },
            { id: 'overdue', label: t('filterOverdue') },
            { id: 'completed', label: t('filterCompleted') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Top Case Types Quick Pills (Requirement 30) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] pt-1 border-t border-slate-800/60">
          <button
            onClick={() => setTypeQuickFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              typeQuickFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isRTL ? 'جميع الأنواع' : 'All Types'}
          </button>
          {[
            { id: 'impersonation', label: isRTL ? 'الانتحال' : 'Impersonation' },
            { id: 'content_removal', label: isRTL ? 'حذف المحتوى' : 'Takedowns' },
            { id: 'infosec', label: isRTL ? 'أمن المعلومات' : 'InfoSec' },
            { id: 'extortion', label: isRTL ? 'الابتزاز' : 'Extortion' },
            { id: 'penetration_testing', label: isRTL ? 'اختبار الاختراق' : 'Pentest' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTypeQuickFilter(item.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeQuickFilter === item.id
                  ? 'bg-blue-900/80 text-blue-200 border border-blue-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters Expandable Drawer (Requirement 29) */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('platform')}</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">{isRTL ? 'جميع المنصات' : 'All Platforms'}</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.name}>{isRTL ? p.nameAr : p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('priority')}</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">{isRTL ? 'جميع الأولويات' : 'All Priorities'}</option>
                <option value="urgent">{t('priority_urgent')}</option>
                <option value="high">{t('priority_high')}</option>
                <option value="medium">{t('priority_medium')}</option>
                <option value="low">{t('priority_low')}</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedPlatform('all');
                  setSelectedPriority('all');
                  setSelectedAssignee('all');
                  setStatusFilter('all');
                  setTypeQuickFilter('all');
                  setSearchQuery('');
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                {isRTL ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Case List Display */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-mono">{isRTL ? 'جارٍ تحميل القضايا...' : 'Loading cases...'}</p>
        </div>
      ) : filteredCases.length === 0 ? (
        /* Empty state (Requirement 52) */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">{t('noCasesFound')}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {t('noCasesSub')}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => onOpenQuickCase()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{t('newCase')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCases.map((c) => {
            const typeConfig = caseTypes.find(ct => ct.key === c.caseType);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-4.5 transition-all shadow-md hover:shadow-cyan-950/20 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ring-1 ring-transparent hover:ring-cyan-500/10"
              >
                {/* Left Side Info */}
                <div className="flex items-start gap-3.5 overflow-hidden">
                  {/* Monogram JB Number Block */}
                  <div className="shrink-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-cyan-400 bg-cyan-950/90 border border-cyan-800/60 px-2.5 py-1.5 rounded-xl inline-block shadow-inner">
                      {c.caseNumber}
                    </span>
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-md">
                        {c.title}
                      </h3>
                      {c.externalNumber && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {c.externalNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Tag className="w-3 h-3 text-cyan-400" />
                        {typeConfig ? (isRTL ? typeConfig.labelAr : typeConfig.labelEn) : c.caseType}
                      </span>

                      {c.platform && (
                        <span className="bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-900/50 font-medium text-[10px]">
                          {c.platform}
                        </span>
                      )}

                      {c.client?.name && (
                        <span className="flex items-center gap-1 text-slate-300 font-medium bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                          <User className="w-2.5 h-2.5 text-cyan-400" />
                          <span>{c.client.name}</span>
                          {c.client.phone && (
                            <span className="text-emerald-400/90 font-mono ms-1" dir="ltr">{c.client.phone}</span>
                          )}
                        </span>
                      )}

                      {c.assignedTo?.name && (
                        <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <User className="w-2.5 h-2.5 text-slate-500" />
                          {c.assignedTo.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side Status, Cost & Priority */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 shrink-0">
                  {/* Cost Badge if set */}
                  {c.agreedAmount !== undefined && c.agreedAmount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-800/60 font-mono shadow-sm">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>{c.agreedAmount.toLocaleString()}</span>
                      <span className="text-[10px] text-amber-400/80">
                        {c.currency === 'SYP' ? (isRTL ? 'ل.س' : 'SYP') : '$'}
                      </span>
                    </span>
                  )}

                  {/* Status Pill */}
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    c.status === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' :
                    c.status === 'in_progress' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' :
                    c.status === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' :
                    c.status === 'overdue' ? 'bg-rose-950 text-rose-300 border border-rose-800/60' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {t(`status_${c.status}`)}
                  </span>

                  {/* Priority Pill */}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${
                    c.priority === 'urgent' ? 'text-red-400 bg-red-950/80 border border-red-800' :
                    c.priority === 'high' ? 'text-orange-400 bg-orange-950/80 border border-orange-800' :
                    c.priority === 'medium' ? 'text-amber-400 bg-amber-950/80 border border-amber-800' :
                    'text-slate-400 bg-slate-800/80 border border-slate-700'
                  }`}>
                    {t(`priority_${c.priority}`)}
                  </span>

                  {/* Direct Delete Button for Editors */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCase(e, c)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                      title={isRTL ? 'نقل القضية إلى سلة المهملات' : 'Move to Recycle Bin'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="text-slate-500 group-hover:text-cyan-400 transition-colors ps-1">
                    <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
