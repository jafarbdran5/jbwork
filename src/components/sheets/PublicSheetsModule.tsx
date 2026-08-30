import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { 
  SavedPublicSheet, 
  SheetRowItem, 
  SheetColumn, 
  SheetWorksheetTab,
  getSavedPublicSheets, 
  savePublicSheet, 
  deletePublicSheet, 
  fetchPublicGoogleSheet, 
  discoverSheetTabs,
  discoverSpreadsheetMetadata,
  extractSheetInfo, 
  extractFilesAndLinksFromRow,
  getGoogleDrivePreviewUrl,
  analyzeCellValue,
  parseRawTableText
} from '../../lib/googleSheetsReader';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  FileSpreadsheet, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Search, 
  Filter, 
  FileText, 
  Eye, 
  Download, 
  Share2, 
  Check, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Link as LinkIcon, 
  FolderPlus, 
  Zap, 
  HardDrive, 
  Tag, 
  Maximize2, 
  ArrowUpDown, 
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  FileCheck2,
  Lock,
  Globe,
  ClipboardPaste,
  Briefcase,
  UserPlus,
  CheckSquare,
  BookmarkPlus,
  Send,
  Compass,
  FileSearch,
  FolderOpen,
  Edit3
} from 'lucide-react';
import { QuickRenameModal } from '../common/QuickRenameModal';

interface PublicSheetsModuleProps {
  onSelectCase?: (caseId: string) => void;
  onNavigate?: (view: string) => void;
  onOpenQuickCaseWithData?: (prefill: { title: string; clientName: string; clientPhone?: string; notes: string; links: string[] }) => void;
}

export const PublicSheetsModule: React.FC<PublicSheetsModuleProps> = ({ 
  onSelectCase, 
  onNavigate,
  onOpenQuickCaseWithData 
}) => {
  const { isRTL } = useI18n();
  const { isDark } = useTheme();
  const { userProfile, canEdit } = useAuth();

  // Saved Sheets State
  const [sheets, setSheets] = useState<SavedPublicSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlinked' | 'case_linked' | 'case_created' | 'client_created' | 'task_created' | 'has_files'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isDiscoveringTabs, setIsDiscoveringTabs] = useState(false);

  // System Cases List for Direct Linking
  const [systemCases, setSystemCases] = useState<{ id: string; caseNumber: string; title: string; clientName?: string }[]>([]);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [isLinkToCaseModalOpen, setIsLinkToCaseModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [renameModalInfo, setRenameModalInfo] = useState<{ isOpen: boolean; labelId: string; defaultFallback: string } | null>(null);
  const [inspectingRow, setInspectingRow] = useState<SheetRowItem | null>(null);
  const [linkingRow, setLinkingRow] = useState<SheetRowItem | null>(null);
  const [previewingFile, setPreviewingFile] = useState<{ url: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Tab Form State
  const [newTabName, setNewTabName] = useState('');
  const [newTabGid, setNewTabGid] = useState('');

  // New Sheet Form State
  const [importMode, setImportMode] = useState<'url' | 'paste'>('url');
  const [pastedData, setPastedData] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('استقبال قضايا وبلاغات');
  const [formGid, setFormGid] = useState('0');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; rowCount?: number; columns?: SheetColumn[]; discoveredTabs?: SheetWorksheetTab[] } | null>(null);

  // 🌟 Automatic Multi-Tab Discovery & Selection State for Add Modal 🌟
  const [discoveredModalTabs, setDiscoveredModalTabs] = useState<SheetWorksheetTab[]>([]);
  const [isAutoDiscoveringModal, setIsAutoDiscoveringModal] = useState(false);
  const [newManualTabNameInModal, setNewManualTabNameInModal] = useState('');

  // Pagination & Sorting for Table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load sheets on mount
  useEffect(() => {
    const loaded = getSavedPublicSheets();
    setSheets(loaded);
    if (loaded.length > 0) {
      setSelectedSheetId(loaded[0].id);
    }
  }, []);

  // 🌟 Auto-discover all worksheet tabs immediately when user enters / pastes a Google Sheet URL 🌟
  useEffect(() => {
    if (!formUrl || importMode !== 'url') return;
    const { sheetId, gid } = extractSheetInfo(formUrl);
    if (!sheetId || sheetId.length < 15) return;

    const timer = setTimeout(async () => {
      setIsAutoDiscoveringModal(true);
      try {
        const meta = await discoverSpreadsheetMetadata(formUrl);
        if (meta.tabs && meta.tabs.length > 0) {
          setDiscoveredModalTabs(meta.tabs);
          if (!formTitle && meta.title && meta.title !== 'Google Spreadsheet') {
            setFormTitle(meta.title);
          }
          if (gid) {
            setFormGid(gid);
          }
        }
      } catch (e) {
        console.warn('Auto tab discovery notice:', e);
      } finally {
        setIsAutoDiscoveringModal(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formUrl, importMode]);

  // Load live system cases for linking
  useEffect(() => {
    const q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          caseNumber: data.caseNumber || d.id,
          title: data.title || 'قضية بدون عنوان',
          clientName: data.client?.name
        };
      });
      setSystemCases(list);
    }, (err) => {
      console.warn('Fallback loading system cases for sheets:', err);
    });

    return () => unsub();
  }, []);

  const activeSheet = useMemo(() => {
    return sheets.find(s => s.id === selectedSheetId) || sheets[0] || null;
  }, [sheets, selectedSheetId]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    sheets.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [sheets]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(isRTL ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sync single sheet or specific worksheet tab
  const handleSyncSheet = async (sheetId: string, customGid?: string, customTabName?: string) => {
    const allSaved = getSavedPublicSheets();
    const target = allSaved.find(s => s.id === sheetId) || sheets.find(s => s.id === sheetId);
    if (!target) return;

    const gidToSync = customGid !== undefined ? customGid : (target.gid || '0');
    const tabNameToSync = customTabName !== undefined ? customTabName : target.activeTabName;

    // Update status to syncing
    setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, syncStatus: 'syncing' } : s));

    try {
      const result = await fetchPublicGoogleSheet(target.url, gidToSync, tabNameToSync);
      
      // Preserve any local row system linkages if same IDs exist
      const existingLinkages = new Map<string, Partial<SheetRowItem>>();
      target.rows.forEach(r => {
        if (r._systemStatus && r._systemStatus !== 'unlinked') {
          existingLinkages.set(r._rowId, {
            _systemStatus: r._systemStatus,
            _linkedCaseId: r._linkedCaseId,
            _linkedCaseNumber: r._linkedCaseNumber,
            _linkedClientId: r._linkedClientId,
            _linkedClientName: r._linkedClientName,
            _linkedTaskId: r._linkedTaskId,
            _linkedTaskTitle: r._linkedTaskTitle
          });
        }
      });

      const mergedRows = result.rows.map(r => {
        const linkData = existingLinkages.get(r._rowId);
        return linkData ? { ...r, ...linkData } : r;
      });

      // Update tabs list if current tab wasn't there
      let updatedTabs = [...(target.tabs || [])];
      if (updatedTabs.length === 0) {
        updatedTabs = [{ gid: gidToSync, name: tabNameToSync || `ورقة (${gidToSync})`, isDefault: true, rowCount: mergedRows.length }];
      } else {
        const tabIdx = updatedTabs.findIndex(t => t.gid === gidToSync || (tabNameToSync && t.name === tabNameToSync));
        if (tabIdx >= 0) {
          updatedTabs[tabIdx] = { ...updatedTabs[tabIdx], rowCount: mergedRows.length };
        } else {
          updatedTabs.push({ gid: gidToSync, name: tabNameToSync || `ورقة (${gidToSync})`, rowCount: mergedRows.length });
        }
      }

      const updatedSheet: SavedPublicSheet = {
        ...target,
        gid: gidToSync,
        activeTabName: tabNameToSync,
        tabs: updatedTabs,
        columns: result.columns,
        rows: mergedRows,
        totalRows: mergedRows.length,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        errorMessage: undefined
      };

      const updatedList = savePublicSheet(updatedSheet);
      setSheets(updatedList);
      showToast(isRTL ? `تمت مزامنة ورقة "${tabNameToSync || gidToSync}" (${mergedRows.length} صف)` : `Synced tab "${tabNameToSync || gidToSync}" successfully!`);
    } catch (err: any) {
      console.error('Failed to sync sheet:', err);
      const updatedSheet: SavedPublicSheet = {
        ...target,
        syncStatus: 'error',
        errorMessage: err.message || (isRTL ? 'فشل الاتصال بالشيت' : 'Connection failed')
      };
      const updatedList = savePublicSheet(updatedSheet);
      setSheets(updatedList);
      showToast(isRTL ? `خطأ: ${err.message}` : `Error: ${err.message}`);
    }
  };

  // Switch Active Worksheet Tab
  const handleSwitchTab = async (tab: SheetWorksheetTab) => {
    if (!activeSheet) return;
    await handleSyncSheet(activeSheet.id, tab.gid, tab.name);
  };

  // Discover all tabs in active sheet automatically
  const handleAutoDiscoverTabs = async () => {
    if (!activeSheet) return;
    setIsDiscoveringTabs(true);
    try {
      const meta = await discoverSpreadsheetMetadata(activeSheet.sheetId || activeSheet.url);
      if (meta.tabs && meta.tabs.length > 0) {
        // Merge with existing tabs
        const currentTabs = activeSheet.tabs || [];
        const mergedMap = new Map<string, SheetWorksheetTab>();
        currentTabs.forEach(t => mergedMap.set(`${t.gid}_${t.name}`, t));
        meta.tabs.forEach(d => {
          const key = `${d.gid}_${d.name}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, d);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        const updatedSheet: SavedPublicSheet = {
          ...activeSheet,
          title: (!activeSheet.title || activeSheet.title === 'شيت مستورد') && meta.title ? meta.title : activeSheet.title,
          tabs: mergedList
        };
        const updated = savePublicSheet(updatedSheet);
        setSheets(updated);
        showToast(isRTL ? `تم اكتشاف وتحديث ${mergedList.length} ورقة عمل للشيت!` : `Discovered ${mergedList.length} worksheet tabs!`);
      } else {
        showToast(isRTL ? 'لم يتم العثور على أوراق إضافية، يمكنك إضافة ورقة بالاسم يدوياً.' : 'No additional public tabs found.');
      }
    } catch (e) {
      showToast(isRTL ? 'تعذر جلب الأوراق تلقائياً، يمكنك كتابة اسم الورقة يدوياً.' : 'Tab discovery error');
    } finally {
      setIsDiscoveringTabs(false);
    }
  };

  // 🗑️ Exclude/Delete a discovered tab inside the Add Modal before saving
  const handleDeleteDiscoveredModalTab = (gid: string, name: string) => {
    setDiscoveredModalTabs(prev => {
      const filtered = prev.filter(t => !(t.gid === gid && t.name === name));
      return filtered;
    });
    showToast(isRTL ? `تم استبعاد ورقة العمل "${name}"` : `Excluded worksheet "${name}"`);
  };

  // ➕ Manually add a worksheet tab inside the Add Modal
  const handleAddManualTabInModal = () => {
    if (!newManualTabNameInModal.trim()) return;
    const name = newManualTabNameInModal.trim();
    const gid = `custom_${Date.now()}`;
    const newTab: SheetWorksheetTab = {
      gid,
      name,
      rowCount: 0
    };
    setDiscoveredModalTabs(prev => [...prev, newTab]);
    setNewManualTabNameInModal('');
    showToast(isRTL ? `تمت إضافة الورقة "${name}"` : `Added tab "${name}"`);
  };

  // Add Custom Worksheet Tab Manually in Main Sheet View
  const handleAddCustomTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet || !newTabName.trim()) return;

    const trimmedName = newTabName.trim();
    const cleanGid = newTabGid.trim() || `tab_${Date.now()}`;

    const newTab: SheetWorksheetTab = {
      name: trimmedName,
      gid: cleanGid,
      rowCount: 0
    };

    const currentTabs = activeSheet.tabs || [];
    const updatedTabs = [...currentTabs.filter(t => t.name !== trimmedName && t.gid !== cleanGid), newTab];

    const updatedSheet: SavedPublicSheet = {
      ...activeSheet,
      tabs: updatedTabs
    };
    savePublicSheet(updatedSheet);
    setSheets(getSavedPublicSheets());
    setIsAddTabModalOpen(false);
    setNewTabName('');
    setNewTabGid('');

    // Immediately load/sync this new tab
    await handleSyncSheet(activeSheet.id, cleanGid, trimmedName);
  };

  // Delete Worksheet Tab
  const handleDeleteWorksheetTab = (e: React.MouseEvent, tab: SheetWorksheetTab) => {
    e.stopPropagation();
    if (!activeSheet) return;
    
    const currentTabs = activeSheet.tabs || [{ gid: activeSheet.gid || '0', name: activeSheet.activeTabName || 'الورقة 1', isDefault: true }];
    const remainingTabs = currentTabs.filter(t => !(t.gid === tab.gid && t.name === tab.name));
    
    // If user deletes the last tab, fallback to clean initial tab
    const fallbackTab: SheetWorksheetTab = { gid: '0', name: isRTL ? 'الورقة 1' : 'Sheet 1', isDefault: true, rowCount: 0 };
    const finalTabs = remainingTabs.length > 0 ? remainingTabs : [fallbackTab];
    const newActiveTab = finalTabs[0];

    const isCurrentActive = (tab.gid === (activeSheet.gid || '0')) || (activeSheet.activeTabName && tab.name === activeSheet.activeTabName);

    const updatedSheet: SavedPublicSheet = {
      ...activeSheet,
      tabs: finalTabs,
      gid: isCurrentActive ? newActiveTab.gid : activeSheet.gid,
      activeTabName: isCurrentActive ? newActiveTab.name : activeSheet.activeTabName,
      rows: isCurrentActive ? [] : activeSheet.rows,
      totalRows: isCurrentActive ? 0 : activeSheet.totalRows
    };

    const updatedList = savePublicSheet(updatedSheet);
    setSheets(updatedList);
    showToast(isRTL ? `✓ تم حذف ورقة العمل "${tab.name}"` : `✓ Worksheet "${tab.name}" deleted`);

    if (isCurrentActive && remainingTabs.length > 0) {
      handleSyncSheet(activeSheet.id, newActiveTab.gid, newActiveTab.name);
    }
  };

  // Delete Individual Row
  const handleDeleteRow = (rowId: string) => {
    if (!activeSheet) return;
    const updatedRows = activeSheet.rows.filter(r => r._rowId !== rowId);
    const updatedSheet: SavedPublicSheet = {
      ...activeSheet,
      rows: updatedRows,
      totalRows: updatedRows.length
    };
    const updatedList = savePublicSheet(updatedSheet);
    setSheets(updatedList);
    showToast(isRTL ? '✓ تم حذف الصف من الجدول' : '✓ Row removed from sheet');
  };

  // Sync all sheets
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    for (const s of sheets) {
      try {
        const result = await fetchPublicGoogleSheet(s.url, s.gid || '0', s.activeTabName);
        const updatedSheet: SavedPublicSheet = {
          ...s,
          columns: result.columns,
          rows: result.rows,
          totalRows: result.totalRows,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: 'success',
          errorMessage: undefined
        };
        savePublicSheet(updatedSheet);
      } catch (err: any) {
        console.error(`Failed to sync sheet ${s.title}:`, err);
      }
    }
    setSheets(getSavedPublicSheets());
    setIsSyncingAll(false);
    showToast(isRTL ? 'تمت مزامنة جميع الشيتات بنجاح!' : 'All sheets synced!');
  };

  // Test URL in Add Modal
  const handleTestUrl = async () => {
    if (!formUrl) return;
    setIsTestingUrl(true);
    setTestResult(null);

    try {
      const { sheetId, gid } = extractSheetInfo(formUrl);
      if (!sheetId) {
        throw new Error('الرابط لا يبدو كرابط Google Sheet صالح');
      }

      const [res, meta] = await Promise.all([
        fetchPublicGoogleSheet(formUrl, gid || '0'),
        discoverSpreadsheetMetadata(formUrl).catch(() => ({ sheetId, title: '', tabs: [] }))
      ]);

      const foundTabs = (meta.tabs && meta.tabs.length > 0) ? meta.tabs : [];
      if (foundTabs.length > 0) {
        setDiscoveredModalTabs(foundTabs);
      }

      setTestResult({
        success: true,
        message: isRTL 
          ? `تم الاتصال بنجاح! تم استخراج ${res.totalRows} صف و ${res.columns.length} عمود.` 
          : `Connected! Found ${res.totalRows} rows and ${res.columns.length} columns.`,
        rowCount: res.totalRows,
        columns: res.columns,
        discoveredTabs: foundTabs
      });

      if (!formTitle) {
        setFormTitle(meta.title || res.sheetTitle || (isRTL ? 'شيت جديد مستورد' : 'Imported Sheet'));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || (isRTL ? 'فشل فحص الرابط' : 'Failed to test URL')
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Save new sheet
  const handleSaveNewSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) {
      showToast(isRTL ? 'يرجى إدخال عنوان للشيت' : 'Please enter a sheet title');
      return;
    }

    if (importMode === 'paste') {
      if (!pastedData.trim()) {
        showToast(isRTL ? 'يرجى لصق بيانات الجدول أولاً' : 'Please paste table data');
        return;
      }

      const parsed = parseRawTableText(pastedData.trim(), `manual_${Date.now()}`, '0');
      if (parsed.rows.length === 0 && parsed.columns.length === 0) {
        showToast(isRTL ? 'تعذر التعرف على أعمدة أو صفوف في النص الملصوق' : 'No rows found in pasted text');
        return;
      }

      const newSheet: SavedPublicSheet = {
        id: `sheet_pasted_${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        url: formUrl.trim() || 'بيانات مدخلة ومحفوظة يدوياً',
        sheetId: `manual_${Date.now()}`,
        gid: '0',
        activeTabName: 'البيانات الملصوقة',
        tabs: [{ gid: '0', name: 'البيانات الملصوقة', isDefault: true, rowCount: parsed.totalRows }],
        category: formCategory.trim() || 'عام',
        tags: ['Pasted Sheet', formCategory],
        color: '#4F46E5',
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        columns: parsed.columns,
        rows: parsed.rows,
        totalRows: parsed.totalRows,
        pinned: false
      };

      const updated = savePublicSheet(newSheet);
      setSheets(updated);
      setSelectedSheetId(newSheet.id);
      setIsAddModalOpen(false);

      // Reset
      setFormUrl('');
      setPastedData('');
      setFormTitle('');
      setFormDescription('');
      setDiscoveredModalTabs([]);
      setTestResult(null);

      showToast(isRTL ? `تم استيراد ${parsed.totalRows} صف بنجاح!` : `Imported ${parsed.totalRows} rows successfully!`);
      return;
    }

    // URL Mode
    if (!formUrl) {
      showToast(isRTL ? 'يرجى إدخال الرابط' : 'Please enter URL');
      return;
    }

    const { sheetId, gid } = extractSheetInfo(formUrl);
    if (!sheetId) {
      showToast(isRTL ? 'رابط Google Sheet غير صالح' : 'Invalid Google Sheet URL');
      return;
    }

    setIsTestingUrl(true);

    try {
      // Determine final tabs: prioritize user-curated discoveredModalTabs if any remain
      let finalTabsToSave: SheetWorksheetTab[] = discoveredModalTabs.length > 0
        ? [...discoveredModalTabs]
        : [];

      if (finalTabsToSave.length === 0) {
        const meta = await discoverSpreadsheetMetadata(formUrl).catch(() => ({ sheetId, title: '', tabs: [] }));
        if (meta.tabs && meta.tabs.length > 0) {
          finalTabsToSave = meta.tabs;
        }
      }

      const activeGid = gid || formGid || (finalTabsToSave[0]?.gid) || '0';
      const activeName = (finalTabsToSave.find(t => t.gid === activeGid)?.name) || finalTabsToSave[0]?.name || 'الورقة 1';

      const result = await fetchPublicGoogleSheet(formUrl, activeGid, activeName);

      if (finalTabsToSave.length === 0) {
        finalTabsToSave = [{ gid: activeGid, name: activeName, isDefault: true, rowCount: result.totalRows }];
      }

      const newSheet: SavedPublicSheet = {
        id: `sheet_${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        url: formUrl.trim(),
        sheetId,
        gid: activeGid,
        activeTabName: activeName,
        tabs: finalTabsToSave,
        category: formCategory.trim() || 'عام',
        tags: ['Google Sheets', formCategory],
        color: '#4F46E5',
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        columns: result.columns,
        rows: result.rows,
        totalRows: result.totalRows,
        pinned: false
      };

      const updated = savePublicSheet(newSheet);
      setSheets(updated);
      setSelectedSheetId(newSheet.id);
      setIsAddModalOpen(false);

      // Reset
      setFormUrl('');
      setPastedData('');
      setFormTitle('');
      setFormDescription('');
      setDiscoveredModalTabs([]);
      setTestResult(null);

      showToast(isRTL ? `تم حفظ الشيت وتحميل ${finalTabsToSave.length} أوراق عمل بنجاح!` : `Sheet saved with ${finalTabsToSave.length} tabs!`);
    } catch (err: any) {
      // Save with error state so user can retry or adjust
      const fallbackTabs = discoveredModalTabs.length > 0 
        ? discoveredModalTabs 
        : [{ gid: gid || formGid || '0', name: 'الورقة 1', isDefault: true }];

      const newSheet: SavedPublicSheet = {
        id: `sheet_${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        url: formUrl.trim(),
        sheetId,
        gid: gid || formGid || '0',
        tabs: fallbackTabs,
        category: formCategory.trim() || 'عام',
        tags: [formCategory],
        color: '#4F46E5',
        createdAt: new Date().toISOString(),
        syncStatus: 'error',
        errorMessage: err.message,
        columns: [],
        rows: [],
        totalRows: 0
      };

      const updated = savePublicSheet(newSheet);
      setSheets(updated);
      setSelectedSheetId(newSheet.id);
      setIsAddModalOpen(false);
      setDiscoveredModalTabs([]);
      showToast(isRTL ? `تم حفظ الشيت ولكن واجه مشكلة أثناء المزامنة: ${err.message}` : `Saved with sync notice: ${err.message}`);
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Delete Sheet
  const handleDeleteSheet = (id: string, title: string) => {
    const updated = deletePublicSheet(id);
    setSheets(updated);
    if (selectedSheetId === id) {
      if (updated.length > 0) {
        setSelectedSheetId(updated[0].id);
      } else {
        setSelectedSheetId('');
      }
    }
    showToast(isRTL ? `✓ تم حذف الشيت "${title}" بنجاح` : `✓ Sheet "${title}" deleted`);
  };

  // Toggle Pin
  const handleTogglePin = (sheet: SavedPublicSheet) => {
    const updated = savePublicSheet({ ...sheet, pinned: !sheet.pinned });
    setSheets(updated);
  };

  // SYSTEM INTEGRATION 1: Direct Link Row to Existing Case
  const handleLinkRowToExistingCase = async (targetCase: { id: string; caseNumber: string; title: string }) => {
    if (!linkingRow || !activeSheet || !userProfile) return;

    try {
      const rowNotes = Object.entries(linkingRow)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const extracted = extractFilesAndLinksFromRow(linkingRow);
      const allFiles = [...extracted.driveLinks, ...extracted.otherLinks];

      // 1. Log event and audit in Firestore for that case
      await logAuditAndEvent({
        action: 'LINK_SHEET_ROW',
        details: `ربط استجابة من جدول (${activeSheet.title}) - الصف #${linkingRow._rowIndex}`,
        entityType: 'case',
        caseId: targetCase.id,
        entityTitle: targetCase.title,
        user: userProfile
      });

      // 2. Update Case doc to append sheet reference
      const caseRef = doc(db, 'cases', targetCase.id);
      await updateDoc(caseRef, {
        notes: `[مستورد من ${activeSheet.title} - صف ${linkingRow._rowIndex}]:\n${rowNotes}\n\n`,
        updatedAt: serverTimestamp()
      });

      // 3. Mark row in local sheet state
      const updatedRows = activeSheet.rows.map(r => {
        if (r._rowId === linkingRow._rowId) {
          return {
            ...r,
            _systemStatus: 'case_linked' as const,
            _linkedCaseId: targetCase.id,
            _linkedCaseNumber: targetCase.caseNumber
          };
        }
        return r;
      });

      const updatedSheet = { ...activeSheet, rows: updatedRows };
      savePublicSheet(updatedSheet);
      setSheets(getSavedPublicSheets());

      setIsLinkToCaseModalOpen(false);
      setLinkingRow(null);

      showToast(isRTL ? `تم ربط الصف بنجاح بالقضية ${targetCase.caseNumber}!` : `Row linked to case ${targetCase.caseNumber}!`);
    } catch (e: any) {
      console.error('Failed to link row to case:', e);
      showToast(isRTL ? `خطأ أثناء الربط: ${e.message}` : `Linking failed: ${e.message}`);
    }
  };

  // SYSTEM INTEGRATION 2: Quick Create Client in System
  const handleQuickCreateClient = async (row: SheetRowItem) => {
    if (!activeSheet || !userProfile || !canEdit) return;

    try {
      const extracted = extractFilesAndLinksFromRow(row);
      
      // Auto-extract client name
      let clientName = '';
      let clientPhone = extracted.phones[0] || '';
      let clientEmail = extracted.emails[0] || '';
      let notes = '';

      Object.entries(row).forEach(([k, v]) => {
        if (k.startsWith('_') || !v) return;
        const valStr = String(v);
        const lowerK = k.toLowerCase();
        if ((lowerK.includes('اسم') || lowerK.includes('name') || lowerK.includes('عميل') || lowerK.includes('client')) && !clientName) {
          clientName = valStr;
        } else if ((lowerK.includes('هاتف') || lowerK.includes('phone') || lowerK.includes('واتساب') || lowerK.includes('جوال')) && !clientPhone) {
          clientPhone = valStr;
        } else if ((lowerK.includes('بريد') || lowerK.includes('email') || lowerK.includes('mail')) && !clientEmail) {
          clientEmail = valStr;
        }
        notes += `${k}: ${valStr}\n`;
      });

      if (!clientName) {
        clientName = `عميل استجابة #${row._rowIndex} (${activeSheet.title})`;
      }

      const clientDoc = await addDoc(collection(db, 'clients'), {
        name: clientName.trim(),
        phone: clientPhone.trim(),
        whatsapp: clientPhone.trim(),
        email: clientEmail.trim(),
        company: '',
        notes: `تم إنشاؤه تلقائياً من ${activeSheet.title} (صف ${row._rowIndex}):\n${notes}`,
        caseCount: 0,
        tags: ['Google Sheets', activeSheet.category],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logAuditAndEvent({
        action: 'CREATE_CLIENT_FROM_SHEET',
        details: `إنشاء عميل جديد من جدول Google Sheet: ${clientName}`,
        entityType: 'case',
        entityId: clientDoc.id,
        entityTitle: clientName,
        user: userProfile
      });

      // Update row in sheet
      const updatedRows = activeSheet.rows.map(r => {
        if (r._rowId === row._rowId) {
          return {
            ...r,
            _systemStatus: 'client_created' as const,
            _linkedClientId: clientDoc.id,
            _linkedClientName: clientName
          };
        }
        return r;
      });

      const updatedSheet = { ...activeSheet, rows: updatedRows };
      savePublicSheet(updatedSheet);
      setSheets(getSavedPublicSheets());

      showToast(isRTL ? `تمت إضافة العميل "${clientName}" إلى قاعدة العملاء!` : `Client "${clientName}" created!`);
    } catch (e: any) {
      console.error('Failed to create client:', e);
      showToast(isRTL ? `فشل إنشاء العميل: ${e.message}` : `Client creation failed: ${e.message}`);
    }
  };

  // SYSTEM INTEGRATION 3: Quick Create Task in System
  const handleQuickCreateTask = async (row: SheetRowItem) => {
    if (!activeSheet || !userProfile || !canEdit) return;

    try {
      const extracted = extractFilesAndLinksFromRow(row);
      let summary = '';
      Object.entries(row).forEach(([k, v]) => {
        if (k.startsWith('_') || !v) return;
        summary += `${k}: ${v} | `;
      });

      const taskTitle = `متابعة استجابة فورم #${row._rowIndex} - ${activeSheet.title}`;

      const taskDoc = await addDoc(collection(db, 'caseTasks'), {
        title: taskTitle,
        description: `مستورد من ${activeSheet.title} (الصف ${row._rowIndex}):\n${summary.slice(0, 400)}`,
        status: 'todo',
        priority: 'high',
        assignedTo: {
          uid: userProfile.uid,
          name: userProfile.displayName || 'Me'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logAuditAndEvent({
        action: 'CREATE_TASK_FROM_SHEET',
        details: `إنشاء مهمة متابعة من جدول: ${taskTitle}`,
        entityType: 'task',
        entityId: taskDoc.id,
        entityTitle: taskTitle,
        user: userProfile
      });

      // Update row in sheet
      const updatedRows = activeSheet.rows.map(r => {
        if (r._rowId === row._rowId) {
          return {
            ...r,
            _systemStatus: 'task_created' as const,
            _linkedTaskId: taskDoc.id,
            _linkedTaskTitle: taskTitle
          };
        }
        return r;
      });

      const updatedSheet = { ...activeSheet, rows: updatedRows };
      savePublicSheet(updatedSheet);
      setSheets(getSavedPublicSheets());

      showToast(isRTL ? 'تم إنشاء مهمة المتابعة بنجاح في قسم المهام!' : 'Task created in tasks center!');
    } catch (e: any) {
      console.error('Failed to create task:', e);
      showToast(isRTL ? `فشل إنشاء المهمة: ${e.message}` : `Task creation failed: ${e.message}`);
    }
  };

  // SYSTEM INTEGRATION 4: Save extracted files/links into Vault (system_files)
  const handleSaveFilesToVault = async (row: SheetRowItem) => {
    if (!activeSheet || !userProfile || !row._fileUrls || row._fileUrls.length === 0) return;

    try {
      let savedCount = 0;
      for (const fileUrl of row._fileUrls) {
        const previewInfo = getGoogleDrivePreviewUrl(fileUrl);
        const fileName = `مستند استجابة #${row._rowIndex} - ${activeSheet.title.slice(0, 25)}`;

        await addDoc(collection(db, 'system_files'), {
          name: fileName,
          url: previewInfo.previewUrl || fileUrl,
          directUrl: previewInfo.directUrl || fileUrl,
          fileType: fileUrl.includes('drive.google.com') ? 'google_drive' : 'url_document',
          category: 'document',
          entityType: 'general',
          entityTitle: activeSheet.title,
          tags: ['Google Sheets', activeSheet.category, `الصف_${row._rowIndex}`],
          uploadedBy: {
            uid: userProfile.uid,
            name: userProfile.displayName || 'Admin'
          },
          createdAt: serverTimestamp()
        });
        savedCount++;
      }

      await logAuditAndEvent({
        action: 'SAVE_SHEET_FILES_TO_VAULT',
        details: `حفظ ${savedCount} مستند من الجدول في خزانة الملفات`,
        entityType: 'attachment',
        entityTitle: activeSheet.title,
        user: userProfile
      });

      showToast(isRTL ? `تم حفظ ${savedCount} مستند في خزانة الملفات بنجاح!` : `Saved ${savedCount} files to Vault!`);
    } catch (e: any) {
      console.error('Failed to save files to vault:', e);
      showToast(isRTL ? `فشل الحفظ: ${e.message}` : `Failed to save: ${e.message}`);
    }
  };

  // Filter and sort rows
  const processedRows = useMemo(() => {
    if (!activeSheet || !activeSheet.rows) return [];

    let filtered = [...activeSheet.rows];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(row => {
        return Object.entries(row).some(([key, val]) => {
          if (key.startsWith('_')) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Filter by system status
    if (statusFilter === 'has_files') {
      filtered = filtered.filter(row => row._hasFiles);
    } else if (statusFilter === 'unlinked') {
      filtered = filtered.filter(row => !row._systemStatus || row._systemStatus === 'unlinked');
    } else if (statusFilter === 'case_linked' || statusFilter === 'case_created') {
      filtered = filtered.filter(row => row._systemStatus === 'case_linked' || row._systemStatus === 'case_created');
    } else if (statusFilter === 'client_created') {
      filtered = filtered.filter(row => row._systemStatus === 'client_created');
    } else if (statusFilter === 'task_created') {
      filtered = filtered.filter(row => row._systemStatus === 'task_created');
    }

    // Sort
    if (sortColumn) {
      filtered.sort((a, b) => {
        const valA = a[sortColumn] || '';
        const valB = b[sortColumn] || '';
        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const comp = String(valA).localeCompare(String(valB), 'ar');
        return sortDirection === 'asc' ? comp : -comp;
      });
    }

    return filtered;
  }, [activeSheet, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRows.slice(start, start + itemsPerPage);
  }, [processedRows, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / itemsPerPage));

  // Convert row to Case in modal
  const handleTransferRowToCase = (row: SheetRowItem) => {
    if (!activeSheet) return;

    let clientName = '';
    let clientPhone = '';
    let notes = `[استجابة من: ${activeSheet.title} - الصف #${row._rowIndex}]\n\n`;

    Object.entries(row).forEach(([key, val]) => {
      if (key.startsWith('_') || val === null || val === undefined || val === '') return;
      const lower = key.toLowerCase();
      if (!clientName && (lower.includes('اسم') || lower.includes('عميل') || lower.includes('client') || lower.includes('صاحب'))) {
        clientName = String(val);
      }
      if (!clientPhone && (lower.includes('هاتف') || lower.includes('phone') || lower.includes('واتساب') || lower.includes('whatsapp') || lower.includes('جوال'))) {
        clientPhone = String(val);
      }
      notes += `• ${key}: ${val}\n`;
    });

    const title = clientName 
      ? `بلاغ / استشارة: ${clientName} (${activeSheet.category})`
      : `قضية مستوردة من ${activeSheet.title} - #${row._rowIndex}`;

    if (onOpenQuickCaseWithData) {
      onOpenQuickCaseWithData({
        title,
        clientName,
        clientPhone,
        notes,
        links: row._fileUrls || []
      });

      // Mark row as case created
      const updatedRows = activeSheet.rows.map(r => {
        if (r._rowId === row._rowId) {
          return { ...r, _systemStatus: 'case_created' as const };
        }
        return r;
      });
      const updatedSheet = { ...activeSheet, rows: updatedRows };
      savePublicSheet(updatedSheet);
      setSheets(getSavedPublicSheets());
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold shadow-2xl border border-slate-700/60 flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border bg-slate-900/40 dark:bg-slate-900/40 backdrop-blur-sm border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-inner">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isRTL ? 'مركز جداول Google Sheets واستجابات النماذج' : 'Google Sheets & Forms Hub'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Zero-Auth / Public Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {isRTL 
                ? 'استعراض كل أوراق العمل (Tabs) في الشيت، استخراج استجابات Google Forms والروابط، وربطها مباشرة بالقضايا والموكلين والمهام بالمنظومة بنقرة واحدة.' 
                : 'Browse all worksheet tabs, inspect responses, Google Drive documents, and link them to Cases, Clients & Tasks.'}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isRTL ? 'دليل الربط السريع' : 'Guide'}</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || sheets.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isSyncingAll ? (isRTL ? 'جاري التحديث...' : 'Syncing...') : (isRTL ? 'مزامنة الكل' : 'Sync All')}</span>
          </button>

          <button
            onClick={() => {
              setImportMode('url');
              setTestResult(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'إضافة شيت جديد' : 'Add Google Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Sheets Selector & Management Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Left / Sidebar Column: Saved Spreadsheets List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isRTL ? 'الجداول المحفوظة' : 'Saved Spreadsheets'}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {sheets.length}
              </span>
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {sheets.map(sheet => {
              const isSelected = sheet.id === selectedSheetId;
              const isSyncing = sheet.syncStatus === 'syncing';
              const isError = sheet.syncStatus === 'error';

              return (
                <div
                  key={sheet.id}
                  onClick={() => {
                    setSelectedSheetId(sheet.id);
                    setCurrentPage(1);
                  }}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/30 hover:bg-slate-800/40 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}>
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {sheet.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sheet.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        title={isRTL ? 'تحديث هذه الورقة' : 'Sync'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncSheet(sheet.id);
                        }}
                        disabled={isSyncing}
                        className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800/60 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                      </button>
                      <button
                        title={isRTL ? 'حذف' : 'Delete'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSheet(sheet.id, sheet.title);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/60 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sheet Metadata Badges */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>{sheet.totalRows || 0}</span>
                      <span className="font-sans text-slate-400 font-normal">{isRTL ? 'صف' : 'rows'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      {sheet.tabs?.length ? `${sheet.tabs.length} ${isRTL ? 'أوراق' : 'tabs'}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}

            {sheets.length === 0 && (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs">{isRTL ? 'لا توجد جداول محفوظة' : 'No sheets saved'}</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-3 px-3 py-1.5 text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  {isRTL ? '+ إضافة أول جدول' : '+ Add first sheet'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 3 Columns: Active Sheet Explorer, Multi-Tab Switcher & Data Grid */}
        <div className="lg:col-span-3 space-y-4">
          
          {activeSheet ? (
            <div className="space-y-4">
              
              {/* Active Sheet Header Card */}
              <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-white truncate">
                      {activeSheet.title}
                    </h2>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setRenameModalInfo({
                          isOpen: true,
                          labelId: `sheet_${activeSheet.id}`,
                          defaultFallback: activeSheet.title
                        })}
                        title="إعادة تسمية هذا الجدول"
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {activeSheet.category}
                    </span>
                    {activeSheet.syncStatus === 'error' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{isRTL ? 'تنبيه: يتطلب فحص المشاركة' : 'Sync Warning'}</span>
                      </span>
                    )}
                  </div>
                  {activeSheet.description && (
                    <p className="text-xs text-slate-400 truncate">
                      {activeSheet.description}
                    </p>
                  )}
                </div>

                {/* Direct External Links & Quick Sync */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeSheet.url.startsWith('http') && (
                    <a
                      href={activeSheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isRTL ? 'فتح في Google Sheets' : 'Open in Sheets'}</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleSyncSheet(activeSheet.id)}
                    disabled={activeSheet.syncStatus === 'syncing'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${activeSheet.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>{isRTL ? 'تحديث البيانات' : 'Refresh'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSheet(activeSheet.id, activeSheet.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                    title={isRTL ? 'حذف هذا الشيت بالكامل' : 'Delete this sheet'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'حذف الشيت' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              {/* 🌟 WORKSHEET TAB BAR: Switch & Discover all pages/tabs in spreadsheet 🌟 */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1 shrink-0">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isRTL ? 'أوراق العمل:' : 'Worksheets:'}</span>
                  </span>

                  {/* Tabs List */}
                  {(activeSheet.tabs || [{ gid: activeSheet.gid || '0', name: activeSheet.activeTabName || 'الورقة 1', isDefault: true }]).map((tab, tIdx) => {
                    const isActive = (tab.gid === (activeSheet.gid || '0')) || (activeSheet.activeTabName && tab.name === activeSheet.activeTabName);
                    return (
                      <div
                        key={`${tab.gid}_${tIdx}`}
                        className={`group relative flex items-center rounded-lg border text-xs font-bold whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400/40 border-indigo-500'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                        }`}
                      >
                        <button
                          onClick={() => handleSwitchTab(tab)}
                          className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 opacity-70" />
                          <span>{tab.name}</span>
                          {tab.rowCount !== undefined && tab.rowCount > 0 && (
                            <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'}`}>
                              {tab.rowCount}
                            </span>
                          )}
                        </button>

                        {/* Quick Rename Worksheet Tab */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameModalInfo({
                                isOpen: true,
                                labelId: `sheet_${activeSheet.id}_tab_${tab.gid || tab.name}`,
                                defaultFallback: tab.name
                              });
                            }}
                            title={`إعادة تسمية ورقة العمل "${tab.name}"`}
                            className={`p-1 rounded-md transition-colors ${
                              isActive ? 'text-indigo-200 hover:text-white hover:bg-indigo-700' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}

                        {/* Delete Tab Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteWorksheetTab(e, tab)}
                          title={isRTL ? `حذف ورقة العمل "${tab.name}"` : `Delete tab "${tab.name}"`}
                          className={`p-1 me-1 rounded-md transition-colors cursor-pointer ${
                            isActive 
                              ? 'text-indigo-200 hover:text-white hover:bg-indigo-700' 
                              : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* + Add Worksheet Tab Button */}
                  <button
                    onClick={() => setIsAddTabModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-dashed border-indigo-500/40 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'إضافة ورقة' : 'Add Tab'}</span>
                  </button>
                </div>

                {/* Auto Discover Sheets Button */}
                {activeSheet.url.startsWith('http') && (
                  <button
                    onClick={handleAutoDiscoverTabs}
                    disabled={isDiscoveringTabs}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Compass className={`w-3.5 h-3.5 ${isDiscoveringTabs ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>{isDiscoveringTabs ? (isRTL ? 'جاري الفحص...' : 'Discovering...') : (isRTL ? 'اكتشاف باقي الأوراق' : 'Auto-Discover Tabs')}</span>
                  </button>
                )}
              </div>

              {/* Data Filtering, System Status Filter & View Toggle */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isRTL ? 'البحث السريع في كل خلايا الورقة...' : 'Search across all cells...'}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* System Linkage & File Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="all">{isRTL ? '⚡ كل الصفوف' : 'All Rows'}</option>
                    <option value="unlinked">{isRTL ? '🆕 غير مرتبطة (استجابات جديدة)' : 'Unlinked / New'}</option>
                    <option value="case_linked">{isRTL ? '⚖️ مرتبطة بقضايا المنظومة' : 'Linked to Cases'}</option>
                    <option value="client_created">{isRTL ? '👤 تم تسجيلهم كعملاء' : 'Saved as Clients'}</option>
                    <option value="task_created">{isRTL ? '📋 تم تعيين مهام لهم' : 'Tasks Created'}</option>
                    <option value="has_files">{isRTL ? '📁 تحتوي على ملفات وروابط' : 'Has Files / Links'}</option>
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                    <button
                      title={isRTL ? 'عرض جدول' : 'Table View'}
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>
                    <button
                      title={isRTL ? 'عرض بطاقات' : 'Cards View'}
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Display: Table Mode vs Cards Mode */}
              {processedRows.length > 0 ? (
                viewMode === 'table' ? (
                  /* Table View */
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[550px]">
                      <table className="w-full text-right text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-3 px-3.5 w-12 text-center">#</th>
                            <th className="py-3 px-3.5 w-32">{isRTL ? 'حالة الربط' : 'Link Status'}</th>
                            {activeSheet.columns.map((col) => (
                              <th
                                key={col.id}
                                onClick={() => {
                                  if (sortColumn === col.label) {
                                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortColumn(col.label);
                                    setSortDirection('asc');
                                  }
                                }}
                                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-white transition-colors"
                              >
                                <div className="flex items-center gap-1.5 justify-start">
                                  <span>{col.label}</span>
                                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                                </div>
                              </th>
                            ))}
                            <th className="py-3 px-3.5 text-center w-28">{isRTL ? 'إجراءات المنظومة' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {paginatedRows.map((row, rIdx) => {
                            const isLinkedToCase = row._systemStatus === 'case_linked' || row._systemStatus === 'case_created';
                            const isClientCreated = row._systemStatus === 'client_created';
                            const isTaskCreated = row._systemStatus === 'task_created';

                            return (
                              <tr 
                                key={row._rowId || rIdx}
                                className={`hover:bg-slate-800/40 transition-colors ${
                                  isLinkedToCase ? 'bg-indigo-950/20' : ''
                                }`}
                              >
                                <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 text-center">
                                  {row._rowIndex}
                                </td>

                                {/* System Link Status Badge */}
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {isLinkedToCase ? (
                                    <button
                                      onClick={() => {
                                        if (row._linkedCaseId && onSelectCase) {
                                          onSelectCase(row._linkedCaseId);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
                                    >
                                      <Briefcase className="w-3 h-3 text-indigo-400" />
                                      <span>{row._linkedCaseNumber || (isRTL ? 'قضية مرتبطة' : 'Linked Case')}</span>
                                    </button>
                                  ) : isClientCreated ? (
                                    <button
                                      onClick={() => onNavigate && onNavigate('clients')}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
                                    >
                                      <UserPlus className="w-3 h-3 text-emerald-400" />
                                      <span>{isRTL ? 'عميل مسجل' : 'Client Saved'}</span>
                                    </button>
                                  ) : isTaskCreated ? (
                                    <button
                                      onClick={() => onNavigate && onNavigate('tasks')}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                                    >
                                      <CheckSquare className="w-3 h-3 text-cyan-400" />
                                      <span>{isRTL ? 'مهمة عمل' : 'Task Assigned'}</span>
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                      <span>{isRTL ? 'جديد' : 'New'}</span>
                                    </span>
                                  )}
                                </td>

                                {/* Dynamic Columns */}
                                {activeSheet.columns.map((col) => {
                                  const cellVal = row[col.label] || row[col.id] || '';
                                  const analysis = analyzeCellValue(cellVal);

                                  return (
                                    <td key={col.id} className="py-3 px-3.5 text-slate-300 whitespace-nowrap max-w-xs truncate">
                                      {analysis.isDrive ? (
                                        <button
                                          onClick={() => setPreviewingFile({ url: cellVal, title: `${col.label} - صف ${row._rowIndex}` })}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                                        >
                                          <HardDrive className="w-3 h-3 text-indigo-400" />
                                          <span>{isRTL ? 'معاينة مستند Drive' : 'Preview Drive Doc'}</span>
                                        </button>
                                      ) : analysis.isUrl ? (
                                        <a
                                          href={cellVal}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span className="truncate max-w-[140px]">{cellVal}</span>
                                        </a>
                                      ) : analysis.isPhone ? (
                                        <span className="font-mono text-emerald-400">{cellVal}</span>
                                      ) : analysis.isEmail ? (
                                        <span className="text-indigo-400">{cellVal}</span>
                                      ) : (
                                        <span>{cellVal || '-'}</span>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Actions Dropdown / Quick Links */}
                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      title={isRTL ? 'معاينة كامل تفاصيل الصف' : 'Inspect'}
                                      onClick={() => setInspectingRow(row)}
                                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      title={isRTL ? 'ربط بقضية قائمة في المنظومة' : 'Link to Case'}
                                      onClick={() => {
                                        setLinkingRow(row);
                                        setIsLinkToCaseModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      title={isRTL ? 'تحويل إلى قضية جديدة فوراً' : 'Create Case'}
                                      onClick={() => handleTransferRowToCase(row)}
                                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                                    >
                                      <Briefcase className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      title={isRTL ? 'حذف هذا الصف' : 'Delete Row'}
                                      onClick={() => handleDeleteRow(row._rowId)}
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {isRTL ? `عرض ${(currentPage - 1) * itemsPerPage + 1} إلى ${Math.min(currentPage * itemsPerPage, processedRows.length)} من أصل ${processedRows.length} صف` : `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, processedRows.length)} of ${processedRows.length}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="font-mono font-bold text-slate-300 px-2">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Cards View */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedRows.map((row) => {
                      const isLinkedToCase = row._systemStatus === 'case_linked' || row._systemStatus === 'case_created';
                      return (
                        <div
                          key={row._rowId}
                          className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                              #{row._rowIndex}
                            </span>

                            {isLinkedToCase ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                <span>{row._linkedCaseNumber || (isRTL ? 'مرتبط بقضية' : 'Linked')}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                                {isRTL ? 'استجابة جديدة' : 'New'}
                              </span>
                            )}
                          </div>

                          {/* Key-Value Fields */}
                          <div className="space-y-1.5 text-xs">
                            {activeSheet.columns.slice(0, 5).map(col => {
                              const val = row[col.label] || row[col.id];
                              if (!val) return null;
                              return (
                                <div key={col.id} className="flex justify-between gap-2 border-b border-slate-800/40 pb-1">
                                  <span className="text-slate-400 shrink-0">{col.label}:</span>
                                  <span className="text-slate-200 truncate font-medium">{String(val)}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Card Quick Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <button
                              onClick={() => setInspectingRow(row)}
                              className="text-xs text-indigo-400 hover:underline font-bold flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isRTL ? 'عرض كامل البيانات' : 'View Full Details'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setLinkingRow(row);
                                  setIsLinkToCaseModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-bold hover:bg-indigo-600/30 transition-colors"
                              >
                                {isRTL ? 'ربط بقضية' : 'Link'}
                              </button>
                              <button
                                onClick={() => handleTransferRowToCase(row)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs font-bold hover:bg-emerald-600/30 transition-colors"
                              >
                                {isRTL ? 'إنشاء قضية' : 'Create Case'}
                              </button>
                              <button
                                onClick={() => handleDeleteRow(row._rowId)}
                                title={isRTL ? 'حذف هذا الصف' : 'Delete Row'}
                                className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-500">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
                  <p className="text-sm font-bold text-slate-300">{isRTL ? 'لا توجد بيانات مطابقة لخيارات البحث' : 'No rows match filter'}</p>
                  <p className="text-xs text-slate-500 mt-1">{isRTL ? 'جرب تغيير الفلتر أو إعادة مزامنة الورقة' : 'Try adjusting your search query or refreshing the tab'}</p>
                </div>
              )}

            </div>
          ) : (
            <div className="p-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-indigo-400 opacity-60" />
              <h3 className="text-base font-bold text-white">{isRTL ? 'اختر شيت من القائمة الجانبية أو أضف شيت جديد' : 'Select a sheet or add a new one'}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {isRTL ? 'يمكنك ربط أي جدول Google Sheet عام أو شيت استجابات Google Forms واستعراض كافة أوراق العمل الخاصة به.' : 'Connect any public Google Sheet or Forms responses spreadsheet.'}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
              >
                {isRTL ? '+ إضافة Google Sheet الآن' : '+ Add Google Sheet'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* 🚀 MODAL 1: ADD NEW GOOGLE SHEET (URL or DIRECT PASTE) 🚀 */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'إضافة وربط Google Sheet جديد' : 'Add New Google Sheet'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setImportMode('url')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  importMode === 'url' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isRTL ? 'رابط Google Sheet (أوتوماتيكي)' : 'Google Sheet URL'}</span>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  importMode === 'paste' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>{isRTL ? 'لصق البيانات يدوياً (نسخ ولصق)' : 'Paste Table Data'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewSheet} className="space-y-4">
              {importMode === 'url' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                    <span>{isRTL ? 'رابط الـ Google Sheet (أو شيت استجابات الفورم)' : 'Google Sheet URL'}</span>
                    <button
                      type="button"
                      onClick={() => setIsGuideModalOpen(true)}
                      className="text-indigo-400 hover:underline text-[11px] font-medium"
                    >
                      {isRTL ? 'كيف أجهّز الرابط؟' : 'Need help?'}
                    </button>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required={importMode === 'url'}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit?usp=sharing"
                      value={formUrl}
                      onChange={(e) => {
                        setFormUrl(e.target.value);
                        setTestResult(null);
                      }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none font-mono focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestUrl}
                      disabled={isTestingUrl || !formUrl}
                      className="px-4 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isTestingUrl ? (isRTL ? 'جاري الفحص...' : 'Testing...') : (isRTL ? 'فحص واكتشاف' : 'Test & Discover')}
                    </button>
                  </div>

                  {/* Automatic Loading Indicator */}
                  {isAutoDiscoveringModal && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs animate-pulse">
                      <Compass className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>{isRTL ? 'جاري اكتشاف وتحميل أوراق العمل من الشيت تلقائياً...' : 'Auto-discovering worksheet tabs from spreadsheet...'}</span>
                    </div>
                  )}

                  {/* 📑 Discovered Tabs List with Deletion & Exclusion 📑 */}
                  {discoveredModalTabs.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">
                            {isRTL ? `أوراق العمل المكتشفة (${discoveredModalTabs.length})` : `Discovered Tabs (${discoveredModalTabs.length})`}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {isRTL ? 'اضغط 🗑️ لحذف أي ورقة لا تريدها' : 'Click 🗑️ to exclude any tab'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {discoveredModalTabs.map((tab, idx) => (
                          <div
                            key={`${tab.gid}_${tab.name}_${idx}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="font-semibold text-slate-200 truncate" title={tab.name}>
                                {tab.name}
                              </span>
                              {tab.rowCount !== undefined && tab.rowCount > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono shrink-0">
                                  {tab.rowCount} {isRTL ? 'صف' : 'rows'}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteDiscoveredModalTab(tab.gid, tab.name)}
                              title={isRTL ? `حذف واستبعاد ورقة "${tab.name}"` : `Exclude tab "${tab.name}"`}
                              className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add another tab manually */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <input
                          type="text"
                          placeholder={isRTL ? 'اسم ورقة أخرى ترغب بإضافتها...' : 'Add another tab name...'}
                          value={newManualTabNameInModal}
                          onChange={(e) => setNewManualTabNameInModal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddManualTabInModal();
                            }
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddManualTabInModal}
                          disabled={!newManualTabNameInModal.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 disabled:opacity-40 cursor-pointer"
                        >
                          {isRTL ? '+ إضافة' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                    <span>{isRTL ? 'الصق خلايا الجدول هنا (من Google Sheet أو Excel أو CSV)' : 'Paste Table Content (TSV / CSV)'}</span>
                    <span className="text-[10px] text-indigo-400 font-medium">{isRTL ? 'انسخ الخلايا مع صف العناوين والصقها' : 'Copy cells with headers and paste'}</span>
                  </label>
                  <textarea
                    rows={4}
                    required={importMode === 'paste'}
                    placeholder={isRTL ? "الاسم\tالهاتف\tالبريد\tملاحظات\nأحمد\t07701234567\tahmed@mail.com\tاستشارة قضائية" : "Name\tPhone\tEmail\nJohn\t555-1234\tjohn@mail.com"}
                    value={pastedData}
                    onChange={(e) => {
                      setPastedData(e.target.value);
                      if (!formTitle && e.target.value.trim()) {
                        setFormTitle(isRTL ? `جدول مستورد (${new Date().toLocaleDateString('ar-EG')})` : `Imported Sheet (${new Date().toLocaleDateString()})`);
                      }
                    }}
                    className="w-full p-3 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none font-mono focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Test Result Feedback */}
              {testResult && (
                <div className={`p-3 rounded-xl text-xs border flex items-start gap-2.5 ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.discoveredTabs && testResult.discoveredTabs.length > 0 && (
                      <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                        {isRTL ? `تم العثور على ${testResult.discoveredTabs.length} ورقة عمل للشيت.` : `Found ${testResult.discoveredTabs.length} tabs.`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    {isRTL ? 'عنوان أو اسم الشيت' : 'Sheet Title'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isRTL ? 'استقبال قضايا الموكلين' : 'Client Intake Form Responses'}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    {isRTL ? 'التصنيف' : 'Category'}
                  </label>
                  <input
                    type="text"
                    placeholder={isRTL ? 'استقبال قضايا وبلاغات' : 'Intake'}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {isRTL ? 'وصف مختصر (اختياري)' : 'Description (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isRTL ? 'شيت استجابات نموذج استقبال العملاء والمستندات' : 'Responses spreadsheet'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isTestingUrl}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isRTL ? 'حفظ وجلب البيانات' : 'Save & Import'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📄 MODAL 2: ADD CUSTOM WORKSHEET TAB (BY NAME OR GID) 📄 */}
      {/* ======================================================== */}
      {isAddTabModalOpen && activeSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'إضافة ورقة عمل (Sheet Tab)' : 'Add Worksheet Tab'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddTabModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {isRTL ? `أدخل اسم الورقة أو رقم المعرف (GID) كما يظهر أسفل ملف Google Sheet: ${activeSheet.title}` : `Enter sheet name or GID as shown in Google Sheet tabs:`}
            </p>

            <form onSubmit={handleAddCustomTab} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {isRTL ? 'اسم ورقة العمل (بالضبط كما في الشيت)' : 'Worksheet Tab Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRTL ? 'مثال: العملاء أو Sheet2 أو استجابات 2' : 'e.g. Sheet2, Clients'}
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {isRTL ? 'معرف الورقة (GID) - اختياري' : 'GID Number (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="0 أو 123456789"
                  value={newTabGid}
                  onChange={(e) => setNewTabGid(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-800 bg-slate-950 text-white outline-none font-mono focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTabModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  {isRTL ? 'إضافة الورقة واستعراضها' : 'Add & Load Tab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ⚖️ MODAL 3: DIRECT LINK TO EXISTING SYSTEM CASE ⚖️ */}
      {/* ======================================================== */}
      {isLinkToCaseModalOpen && linkingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'ربط الاستجابة بقضية قائمة في المنظومة' : 'Link Row to Existing Case'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsLinkToCaseModalOpen(false);
                  setLinkingRow(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <p className="font-bold text-indigo-300 mb-1">{isRTL ? 'بيانات الصف المراد ربطه:' : 'Row Data to Link:'}</p>
              <p className="truncate text-slate-400">
                #{linkingRow._rowIndex} - {Object.values(linkingRow).filter(v => typeof v === 'string').slice(0, 3).join(' | ')}
              </p>
            </div>

            {/* Case Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isRTL ? 'ابحث عن القضية برقم القضية أو اسم الموكل أو العنوان...' : 'Search cases by number or client name...'}
                value={caseSearchQuery}
                onChange={(e) => setCaseSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Cases Selection List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {systemCases
                .filter(c => {
                  if (!caseSearchQuery.trim()) return true;
                  const q = caseSearchQuery.toLowerCase();
                  return c.caseNumber.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.clientName && c.clientName.toLowerCase().includes(q));
                })
                .map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleLinkRowToExistingCase(c)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-indigo-950/40 hover:border-indigo-500/50 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-400">{c.caseNumber}</span>
                        <h4 className="text-xs font-bold text-white truncate">{c.title}</h4>
                      </div>
                      {c.clientName && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{isRTL ? `الموكل: ${c.clientName}` : `Client: ${c.clientName}`}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white group-hover:bg-indigo-500 transition-colors shrink-0"
                    >
                      {isRTL ? 'ربط الآن' : 'Link'}
                    </button>
                  </div>
                ))}

              {systemCases.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  {isRTL ? 'لا توجد قضايا مسجلة في المنظومة بعد' : 'No cases found'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🔍 MODAL 4: ROW INSPECT & COMPREHENSIVE ACTIONS MODAL 🔍 */}
      {/* ======================================================== */}
      {inspectingRow && activeSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-right overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRTL ? `تفاصيل الاستجابة (الصف #${inspectingRow._rowIndex})` : `Row Response #${inspectingRow._rowIndex}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">{activeSheet.title}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectingRow(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Fields List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* System Linkage Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">{isRTL ? 'إجراءات المنظومة المباشرة:' : 'System Quick Actions:'}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      handleQuickCreateClient(inspectingRow);
                      setInspectingRow(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'تسجيل كعميل' : 'Add Client'}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleQuickCreateTask(inspectingRow);
                      setInspectingRow(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'إنشاء مهمة' : 'Add Task'}</span>
                  </button>

                  {inspectingRow._fileUrls && inspectingRow._fileUrls.length > 0 && (
                    <button
                      onClick={() => handleSaveFilesToVault(inspectingRow)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>{isRTL ? 'حفظ في المستندات' : 'Save to Vault'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data Fields */}
              <div className="space-y-2.5">
                {activeSheet.columns.map((col) => {
                  const val = inspectingRow[col.label] || inspectingRow[col.id];
                  if (!val && val !== 0) return null;
                  const analysis = analyzeCellValue(val);

                  return (
                    <div key={col.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>{col.label}</span>
                        <button
                          onClick={() => handleCopy(String(val), col.id)}
                          className="text-slate-500 hover:text-slate-300 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{isRTL ? 'نسخ' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="text-xs text-white break-words">
                        {analysis.isDrive ? (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setPreviewingFile({ url: String(val), title: `${col.label}` })}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isRTL ? 'معاينة المستند الآن' : 'Preview Document'}</span>
                            </button>
                            <a
                              href={String(val)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline text-xs"
                            >
                              {isRTL ? 'فتح في علامة تبويب جديدة' : 'Open in tab'}
                            </a>
                          </div>
                        ) : analysis.isUrl ? (
                          <a
                            href={String(val)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{String(val)}</span>
                          </a>
                        ) : (
                          <p className="whitespace-pre-wrap">{String(val)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectingRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTransferRowToCase(inspectingRow);
                  setInspectingRow(null);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
              >
                <Briefcase className="w-4 h-4" />
                <span>{isRTL ? 'تحويل إلى ملف قضية جديد' : 'Convert to Case'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🖼️ MODAL 5: INTERACTIVE FILE & DRIVE DOC PREVIEWER 🖼️ */}
      {/* ======================================================== */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-right">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-md">
                  {previewingFile.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewingFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'فتح في Drive' : 'Open in Drive'}</span>
                </a>
                <button
                  onClick={() => setPreviewingFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 relative">
              <iframe
                src={getGoogleDrivePreviewUrl(previewingFile.url).previewUrl}
                title={previewingFile.title}
                className="w-full h-full border-0"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📖 MODAL 6: QUICK INTEGRATION & SHARING GUIDE 📖 */}
      {/* ======================================================== */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'دليل إعداد Google Sheets بدون تعقيدات' : 'Google Sheets Quick Guide'}
                </h3>
              </div>
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-indigo-400">1. جعل الشيت عاماً للقراءة (Public Link):</p>
                <p className="text-slate-400">
                  افتح Google Sheet الخاص بك، اضغط على زر **Share (مشاركة)** بالأعلى، ثم اختر **Anyone with the link can view (أي شخص لديه الرابط يمكنه العرض)**.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-400">2. أوراق العمل المتعددة (Worksheet Tabs):</p>
                <p className="text-slate-400">
                  المنظومة تتيح لك التنقل بين كافة أوراق العمل في الشيت أو إضافة ورقة بالاسم مباشرة أو استخدام زر **(اكتشاف باقي الأوراق)**.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-cyan-400">3. خيار اللصق السريع (نسخ ولصق):</p>
                <p className="text-slate-400">
                  يمكنك أيضاً في أي وقت نسخ أي نطاق خلايا من Google Sheet أو Excel ولصقه مباشرة ليقوم النظام بقراءته وتخزينه أوفلاين.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {isRTL ? 'فهمت ذلك' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Rename Modal for Sheets and Tabs */}
      {renameModalInfo && (
        <QuickRenameModal
          isOpen={renameModalInfo.isOpen}
          onClose={() => setRenameModalInfo(null)}
          labelId={renameModalInfo.labelId}
          defaultFallback={renameModalInfo.defaultFallback}
          onSuccess={(newName) => {
            setSheets(getSavedPublicSheets());
            showToast(isRTL ? `تم تحديث الاسم إلى: "${newName}"` : `Updated title to: "${newName}"`);
          }}
        />
      )}

    </div>
  );
};
