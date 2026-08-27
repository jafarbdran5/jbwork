import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { 
  getAllRecycleBinItems, 
  UnifiedTrashItem, 
  permanentlyDeleteEntity, 
  bulkRestoreEntities, 
  bulkPermanentlyDeleteEntities 
} from '../../services/database/transactionService';
import { restoreEntity } from '../../services/database/restoreService';
import { DeletableEntityType, getEntityTypeLabelAr } from '../../services/database/deleteService';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Layers, 
  Calendar,
  XCircle, 
  Search, 
  CheckCircle2, 
  Filter, 
  FileText, 
  Briefcase, 
  CheckSquare, 
  DollarSign, 
  ShieldAlert, 
  X,
  Users,
  Check,
  Paperclip,
  FolderOpen
} from 'lucide-react';

export const TrashModule: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin } = useAuth();

  const [trashItems, setTrashItems] = useState<UnifiedTrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | DeletableEntityType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected items for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [itemToPurge, setItemToPurge] = useState<UnifiedTrashItem | null>(null);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load soft-deleted items from database
  const refreshTrashItems = () => {
    setLoading(true);
    try {
      const items = getAllRecycleBinItems();
      setTrashItems(items);
    } catch (e) {
      console.warn('Failed to load trash items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTrashItems();

    const handleSync = () => {
      refreshTrashItems();
    };

    window.addEventListener('jb_data_changed', handleSync);
    window.addEventListener('jb_entity_deleted', handleSync);
    window.addEventListener('jb_entity_restored', handleSync);
    window.addEventListener('jb_entity_purged', handleSync);

    return () => {
      window.removeEventListener('jb_data_changed', handleSync);
      window.removeEventListener('jb_entity_deleted', handleSync);
      window.removeEventListener('jb_entity_restored', handleSync);
      window.removeEventListener('jb_entity_purged', handleSync);
    };
  }, []);

  const filteredItems = useMemo(() => {
    return trashItems.filter(item => {
      if (activeTypeFilter !== 'all' && item.type !== activeTypeFilter) return false;
      if (searchQuery.trim()) {
        const queryLow = searchQuery.toLowerCase();
        const matchesTitle = (item.title || '').toLowerCase().includes(queryLow);
        const matchesSub = (item.subtitle || '').toLowerCase().includes(queryLow);
        if (!matchesTitle && !matchesSub) return false;
      }
      return true;
    });
  }, [trashItems, activeTypeFilter, searchQuery]);

  const handleRestoreItem = async (item: UnifiedTrashItem) => {
    if (!userProfile) return;
    setActionProcessing(true);
    try {
      const res = await restoreEntity(item.type, item.id, userProfile);
      if (res.success) {
        setTrashItems(prev => prev.filter(i => i.id !== item.id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setFeedbackMessage({
          type: 'success',
          text: isRTL ? `تمت استعادة ${item.title} بنجاح.` : `Restored ${item.title} successfully.`
        });
      } else {
        setFeedbackMessage({ type: 'error', text: isRTL ? res.messageAr : res.messageEn });
      }
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'Error' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleExecutePermanentPurge = async () => {
    if (!itemToPurge || !userProfile || !isSuperAdmin) return;
    setActionProcessing(true);
    try {
      const res = await permanentlyDeleteEntity(itemToPurge.type, itemToPurge.id, userProfile);
      if (res.success) {
        setTrashItems(prev => prev.filter(i => i.id !== itemToPurge.id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(itemToPurge.id);
          return next;
        });
        setFeedbackMessage({
          type: 'success',
          text: isRTL ? `تم حذف ${itemToPurge.title} نهائياً.` : `Permanently deleted ${itemToPurge.title}.`
        });
      } else {
        setFeedbackMessage({ type: 'error', text: res.messageAr });
      }
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'Error' });
    } finally {
      setActionProcessing(false);
      setItemToPurge(null);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0 || !userProfile) return;
    setActionProcessing(true);
    try {
      const itemsToRestore = trashItems.filter(i => selectedIds.has(i.id)).map(i => ({ type: i.type, id: i.id }));
      const { successCount } = await bulkRestoreEntities(itemsToRestore, userProfile);
      setTrashItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setFeedbackMessage({
        type: 'success',
        text: isRTL ? `تمت استعادة ${successCount} عنصر بنجاح.` : `Restored ${successCount} items successfully.`
      });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.size === 0 || !userProfile || !isSuperAdmin) return;
    setActionProcessing(true);
    try {
      const itemsToDelete = trashItems.filter(i => selectedIds.has(i.id)).map(i => ({ type: i.type, id: i.id }));
      const { successCount } = await bulkPermanentlyDeleteEntities(itemsToDelete, userProfile);
      setTrashItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setFeedbackMessage({
        type: 'success',
        text: isRTL ? `تم حذف ${successCount} عنصر نهائياً.` : `Permanently deleted ${successCount} items.`
      });
    } finally {
      setActionProcessing(false);
      setShowEmptyTrashConfirm(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getItemIcon = (type: DeletableEntityType) => {
    switch (type) {
      case 'case': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'user': return <Users className="w-4 h-4 text-amber-400" />;
      case 'task': return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'attachment':
      case 'document': return <Paperclip className="w-4 h-4 text-blue-400" />;
      case 'payment':
      case 'expense': return <DollarSign className="w-4 h-4 text-rose-400" />;
      default: return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {isRTL ? 'سلة المهملات الموحدة (Recycle Bin)' : 'Recycle Bin & Safe Vault'}
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-700 font-mono">
                  {trashItems.length} {isRTL ? 'عنصر' : 'items'}
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isRTL 
                  ? 'سجل آمن لجميع القضايا، أعضاء الفريق، المهام، والمستندات المحذوفة مع إمكانية الاستعادة الفورية أو الحذف النهائي.' 
                  : 'Centralized safe vault for deleted cases, team members, tasks, and files.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 p-1.5 rounded-xl">
            <span className="text-xs text-zinc-300 font-medium px-2">
              {isRTL ? `محدد (${selectedIds.size})` : `Selected (${selectedIds.size})`}
            </span>
            <button
              onClick={handleBulkRestore}
              disabled={actionProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRTL ? 'استعادة المحدد' : 'Restore Selected'}</span>
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setShowEmptyTrashConfirm(true)}
                disabled={actionProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRTL ? 'حذف نهائي' : 'Purge Selected'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في العناصر المحذوفة...' : 'Search deleted items...'}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Entity Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'case', labelAr: 'القضايا', labelEn: 'Cases' },
            { id: 'user', labelAr: 'أعضاء الفريق', labelEn: 'Team' },
            { id: 'task', labelAr: 'المهام', labelEn: 'Tasks' },
            { id: 'attachment', labelAr: 'المرفقات', labelEn: 'Attachments' },
            { id: 'payment', labelAr: 'المالية', labelEn: 'Finance' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTypeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                activeTypeFilter === tab.id
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {isRTL ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table / List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-400">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
              onChange={toggleSelectAll}
              className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>{isRTL ? 'العنصر والبيانات' : 'Item & Details'}</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="hidden sm:inline">{isRTL ? 'القسم والنوع' : 'Category'}</span>
            <span className="hidden md:inline">{isRTL ? 'تاريخ الحذف' : 'Deleted Date'}</span>
            <span>{isRTL ? 'الإجراءات' : 'Actions'}</span>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>{isRTL ? 'جاري فحص سلة المهملات...' : 'Loading trash items...'}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-300">
              {isRTL ? 'سلة المهملات نظيفة' : 'Recycle Bin is Empty'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {isRTL 
                ? 'لا توجد أي عناصر محذوفة حالياً تطابق الفلاتر المحددة.' 
                : 'No deleted items found matching the current filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filteredItems.map(item => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-zinc-800/30 ${
                    isSelected ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  {/* Left: Checkbox + Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                      className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Badges */}
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {getEntityTypeLabelAr(item.type)}
                    </span>
                  </div>

                  {/* Middle: Date */}
                  <div className="hidden md:block text-[11px] text-zinc-400 font-mono">
                    {new Date(item.deletedAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRestoreItem(item)}
                      disabled={actionProcessing}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                      title={isRTL ? 'استعادة' : 'Restore'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isRTL ? 'استعادة' : 'Restore'}</span>
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => setItemToPurge(item)}
                        disabled={actionProcessing}
                        className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                        title={isRTL ? 'حذف نهائي' : 'Permanent Purge'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Single Item Purge */}
      {itemToPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121214] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                {isRTL ? 'تأكيد الحذف النهائي الذي لا رجعة فيه' : 'Confirm Permanent Deletion'}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {isRTL 
                  ? `أنت على وشك حذف "${itemToPurge.title}" نهائياً من قاعدة البيانات والتخزين المحلي. لن تتمكن من استعادة هذا السجل مجدداً.` 
                  : `Are you sure you want to permanently delete "${itemToPurge.title}"? This action cannot be undone.`}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setItemToPurge(null)}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleExecutePermanentPurge}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {actionProcessing ? (isRTL ? 'جاري الحذف...' : 'Purging...') : (isRTL ? 'نعم، احذف نهائياً' : 'Yes, Purge Permanently')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Purge */}
      {showEmptyTrashConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121214] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                {isRTL ? `حذف نهائي لـ (${selectedIds.size}) عنصر؟` : `Purge (${selectedIds.size}) items permanently?`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {isRTL 
                  ? 'سيتم حذف جميع السجلات المحددة فوراً من التخزين المحلي وقاعدة البيانات. هذه العملية مخصصة للمشرف العام فقط.' 
                  : 'Selected records will be physically erased from all storage.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowEmptyTrashConfirm(false)}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkPermanentDelete}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {actionProcessing ? (isRTL ? 'جاري المعالجة...' : 'Processing...') : (isRTL ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Purge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
