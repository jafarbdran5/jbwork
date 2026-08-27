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
  where,
  limit
} from 'firebase/firestore';
import { 
  ExternalRequest, 
  CaseItem
} from '../../types';
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
  extractSheetInfo, 
  extractFilesAndLinksFromRow,
  getGoogleDrivePreviewUrl,
  analyzeCellValue,
  parseRawTableText
} from '../../lib/googleSheetsReader';
import { logAuditAndEvent } from '../../lib/audit';
import { generateNextCaseNumber } from '../../lib/firebase';
import { saveLocalCase } from '../../lib/offlineStore';
import { 
  suggestCaseType, 
  detectPlatform, 
  cleanFirestoreData
} from '../../lib/googleWorkspace';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { 
  FileSpreadsheet, 
  Inbox,
  Plus, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  User, 
  X,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  Mail,
  FolderPlus,
  Link as LinkIcon,
  Copy,
  Check,
  Layers,
  Calendar,
  Sparkles,
  Paperclip,
  ImageIcon,
  Eye,
  Trash2,
  FileSearch,
  Table as TableIcon,
  LayoutGrid,
  UserPlus,
  CheckSquare,
  Compass,
  ArrowUpDown
} from 'lucide-react';

interface ExternalRequestsModuleProps {
  onSelectCase?: (caseId: string) => void;
  onNavigate?: (view: string) => void;
  onOpenQuickCaseWithData?: (prefill: { title: string; clientName: string; clientPhone?: string; notes: string; links: string[] }) => void;
}

// Helper to reliably extract details from a dynamic sheet row
function getRowDetails(row: SheetRowItem, sheet: SavedPublicSheet | null) {
  const extracted = extractFilesAndLinksFromRow(row);
  const driveLinks = extracted.driveLinks || [];
  const otherLinks = extracted.otherLinks || [];
  const fileLinks = [...driveLinks, ...otherLinks];
  const allUrls = [...driveLinks, ...otherLinks];
  const phone = extracted.phones[0] || '';
  const email = extracted.emails[0] || '';

  // Look for client name
  let clientName = '';
  if (sheet && sheet.columns) {
    const nameCol = sheet.columns.find(c => {
      const l = c.label.toLowerCase();
      return l.includes('اسم') || l.includes('name') || l.includes('عميل') || l.includes('صاحب') || l.includes('مقدم');
    });
    if (nameCol && row[nameCol.id]) {
      clientName = String(row[nameCol.id]).trim();
    }
  }

  if (!clientName) {
    // Search entries
    for (const [key, val] of Object.entries(row)) {
      if (key.startsWith('_') || !val) continue;
      const l = key.toLowerCase();
      if ((l.includes('اسم') || l.includes('name') || l.includes('عميل')) && typeof val === 'string' && val.trim().length > 2) {
        clientName = val.trim();
        break;
      }
    }
  }

  // Build notes summary
  const summaryParts: string[] = [];
  Object.entries(row).forEach(([k, v]) => {
    if (k.startsWith('_') || v === null || v === undefined || v === '') return;
    summaryParts.push(`${k}: ${v}`);
  });
  const notesSummary = summaryParts.join('\n');

  return {
    clientName,
    phone,
    email,
    fileLinks,
    allUrls,
    notesSummary
  };
}

export const ExternalRequestsModule: React.FC<ExternalRequestsModuleProps> = ({ 
  onSelectCase, 
  onNavigate,
  onOpenQuickCaseWithData 
}) => {
  const { t, isRTL } = useI18n();
  const { isDark } = useTheme();
  const { userProfile } = useAuth();

  // Top Section Mode: Google Sheets Hub vs Firestore DB
  const [sectionMode, setSectionMode] = useState<'sheets_hub' | 'firestore_db'>('sheets_hub');

  // ==========================================
  // 1. GOOGLE SHEETS STATE & LOGIC
  // ==========================================
  const [sheets, setSheets] = useState<SavedPublicSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlinked' | 'case_linked' | 'case_created' | 'client_created' | 'task_created' | 'has_files'>('all');
  const [isDiscoveringTabs, setIsDiscoveringTabs] = useState(false);

  // Sheets Modals & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [isLinkToCaseModalOpen, setIsLinkToCaseModalOpen] = useState(false);
  const [inspectingRow, setInspectingRow] = useState<SheetRowItem | null>(null);
  const [linkingRow, setLinkingRow] = useState<SheetRowItem | null>(null);
  const [previewingFile, setPreviewingFile] = useState<{ url: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tab Form State
  const [newTabName, setNewTabName] = useState('');
  const [newTabGid, setNewTabGid] = useState('');

  // Add Sheet Form State
  const [importMode, setImportMode] = useState<'url' | 'paste'>('url');
  const [pastedData, setPastedData] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('استقبال طلبات وبلاغات');
  const [formGid, setFormGid] = useState('0');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; rowCount?: number; columns?: SheetColumn[]; discoveredTabs?: SheetWorksheetTab[] } | null>(null);

  // Pagination & Sorting for Table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ==========================================
  // 2. FIRESTORE EXTERNAL REQUESTS STATE
  // ==========================================
  const [firestoreRequests, setFirestoreRequests] = useState<ExternalRequest[]>([]);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualType, setManualType] = useState('طلب عام');
  const [manualPlatform, setManualPlatform] = useState('Instagram');
  const [manualAccountUrl, setManualAccountUrl] = useState('');
  const [manualPostUrl, setManualPostUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // System Cases List for Direct Linking
  const [systemCases, setSystemCases] = useState<CaseItem[]>([]);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [isConvertingAction, setIsConvertingAction] = useState(false);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Saved Sheets on mount
  useEffect(() => {
    const loaded = getSavedPublicSheets();
    setSheets(loaded);
    if (loaded.length > 0) {
      setSelectedSheetId(loaded[0].id);
    }
  }, []);

  // Load Real-time Firestore External Requests & Cases
  useEffect(() => {
    const qReq = query(collection(db, 'externalRequests'), orderBy('createdAt', 'desc'));
    const unsubReq = onSnapshot(qReq, (snap) => {
      const list: ExternalRequest[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ExternalRequest));
      setFirestoreRequests(list);
    }, (err) => {
      console.warn('External requests snapshot notice:', err);
    });

    const qCases = query(collection(db, 'cases'), where('isDeleted', '==', false), orderBy('createdAt', 'desc'), limit(100));
    const unsubCases = onSnapshot(qCases, (snap) => {
      const list: CaseItem[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as CaseItem));
      setSystemCases(list);
    }, (err) => {
      console.warn('System cases query notice:', err);
    });

    return () => {
      unsubReq();
      unsubCases();
    };
  }, []);

  // Active Current Sheet
  const currentSheet = useMemo(() => {
    return sheets.find(s => s.id === selectedSheetId) || sheets[0] || null;
  }, [sheets, selectedSheetId]);

  // Handle Worksheet Tab Switch
  const handleSwitchTab = async (sheetId: string, tab: SheetWorksheetTab) => {
    const target = sheets.find(s => s.id === sheetId);
    if (!target) return;

    // Set active tab locally
    const updatedSheet: SavedPublicSheet = {
      ...target,
      gid: tab.gid,
      activeTabName: tab.name,
      syncStatus: 'syncing'
    };
    savePublicSheet(updatedSheet);
    setSheets(getSavedPublicSheets());
    showToast(`جاري التبديل إلى ورقة العمل "${tab.name}"...`);

    try {
      const res = await fetchPublicGoogleSheet(target.url, tab.gid);
      const refreshed: SavedPublicSheet = {
        ...updatedSheet,
        columns: res.columns,
        rows: res.rows,
        totalRows: res.totalRows,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        errorMessage: undefined
      };
      savePublicSheet(refreshed);
      setSheets(getSavedPublicSheets());
      showToast(`✓ تم تحميل بيانات ورقة "${tab.name}" (${res.totalRows} صف)`);
    } catch (e: any) {
      console.error('Switch tab error:', e);
      const errSheet: SavedPublicSheet = {
        ...updatedSheet,
        syncStatus: 'error',
        errorMessage: e.message || String(e)
      };
      savePublicSheet(errSheet);
      setSheets(getSavedPublicSheets());
      showToast(`✕ تعذر جلب بيانات ورقة "${tab.name}": ${e.message || e}`);
    }
  };

  // Discover Tabs for current sheet
  const handleAutoDiscoverTabs = async () => {
    if (!currentSheet || !currentSheet.sheetId) return;
    setIsDiscoveringTabs(true);
    showToast('جاري فحص واكتشاف كافة أوراق العمل في الملف...');

    try {
      const tabs = await discoverSheetTabs(currentSheet.sheetId);
      if (tabs && tabs.length > 0) {
        const existingGids = new Set((currentSheet.tabs || []).map(t => t.gid));
        const combinedTabs = [...(currentSheet.tabs || [])];
        
        tabs.forEach(t => {
          if (!existingGids.has(t.gid)) {
            combinedTabs.push(t);
          }
        });

        const updated: SavedPublicSheet = {
          ...currentSheet,
          tabs: combinedTabs
        };
        savePublicSheet(updated);
        setSheets(getSavedPublicSheets());
        showToast(`✓ تم اكتشاف ${tabs.length} ورقة عمل بنجاح!`);
      } else {
        showToast('لم يتم العثور على أوراق عمل إضافية عامة في هذا الرابط.');
      }
    } catch (e: any) {
      showToast(`✕ تعذر فحص أوراق العمل: ${e.message || e}`);
    } finally {
      setIsDiscoveringTabs(false);
    }
  };

  // Add Custom Tab
  const handleAddCustomTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSheet || !newTabName.trim()) return;

    const gid = newTabGid.trim() || '0';
    const newTab: SheetWorksheetTab = {
      name: newTabName.trim(),
      gid: gid
    };

    const existingTabs = currentSheet.tabs || [{ gid: currentSheet.gid || '0', name: currentSheet.activeTabName || 'الورقة الرئيسية', isDefault: true }];
    const updatedTabs = [...existingTabs.filter(t => t.gid !== gid), newTab];

    const updatedSheet: SavedPublicSheet = {
      ...currentSheet,
      tabs: updatedTabs
    };

    savePublicSheet(updatedSheet);
    setSheets(getSavedPublicSheets());
    setIsAddTabModalOpen(false);
    setNewTabName('');
    setNewTabGid('');

    // Switch to it immediately
    handleSwitchTab(currentSheet.id, newTab);
  };

  // Delete Tab / Worksheet
  const handleDeleteTab = (tabGid: string, tabName: string) => {
    if (!currentSheet) return;
    const existingTabs = currentSheet.tabs || [{ gid: currentSheet.gid || '0', name: currentSheet.activeTabName || 'الورقة الرئيسية', isDefault: true }];
    const remainingTabs = existingTabs.filter(t => !(t.gid === tabGid && t.name === tabName));
    
    // Fallback if user deletes the last tab
    const fallbackTab = { gid: '0', name: 'الورقة 1', isDefault: true };
    const finalTabs = remainingTabs.length > 0 ? remainingTabs : [fallbackTab];
    const newActiveTab = finalTabs[0];

    const isCurrentActive = (currentSheet.gid || '0') === tabGid;

    const updatedSheet: SavedPublicSheet = {
      ...currentSheet,
      tabs: finalTabs,
      gid: isCurrentActive ? newActiveTab.gid : currentSheet.gid,
      activeTabName: isCurrentActive ? newActiveTab.name : currentSheet.activeTabName,
      rows: isCurrentActive ? [] : currentSheet.rows,
      totalRows: isCurrentActive ? 0 : currentSheet.totalRows
    };

    savePublicSheet(updatedSheet);
    setSheets(getSavedPublicSheets());
    showToast(`✓ تم حذف ورقة العمل "${tabName}"`);

    if (isCurrentActive && remainingTabs.length > 0) {
      handleSwitchTab(currentSheet.id, newActiveTab);
    }
  };

  // Sync Single Sheet
  const handleSyncSheet = async (sheet: SavedPublicSheet) => {
    const updating: SavedPublicSheet = { ...sheet, syncStatus: 'syncing' };
    savePublicSheet(updating);
    setSheets(getSavedPublicSheets());

    try {
      const res = await fetchPublicGoogleSheet(sheet.url, sheet.gid || '0');
      const synced: SavedPublicSheet = {
        ...sheet,
        columns: res.columns,
        rows: res.rows,
        totalRows: res.totalRows,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        errorMessage: undefined
      };
      savePublicSheet(synced);
      setSheets(getSavedPublicSheets());
      showToast(`✓ تم تحديث "${sheet.title}" (${res.totalRows} صف)`);
    } catch (e: any) {
      const errSheet: SavedPublicSheet = {
        ...sheet,
        syncStatus: 'error',
        errorMessage: e.message || String(e)
      };
      savePublicSheet(errSheet);
      setSheets(getSavedPublicSheets());
      showToast(`✕ تعذر التحديث: ${e.message || e}`);
    }
  };

  // Delete Sheet
  const handleDeleteSheet = (id: string) => {
    deletePublicSheet(id);
    const remaining = getSavedPublicSheets();
    setSheets(remaining);
    if (selectedSheetId === id) {
      if (remaining.length > 0) {
        setSelectedSheetId(remaining[0].id);
      } else {
        setSelectedSheetId('');
      }
    }
    showToast('✓ تم حذف الجدول من القائمة');
  };

  // Filtered Rows in Sheet
  const filteredRows = useMemo(() => {
    if (!currentSheet || !currentSheet.rows) return [];
    let list = [...currentSheet.rows];

    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'unlinked') {
        list = list.filter(r => !r._linkedCaseId && !r._linkedClientId && !r._linkedTaskId);
      } else if (statusFilter === 'case_linked') {
        list = list.filter(r => !!r._linkedCaseId);
      } else if (statusFilter === 'case_created') {
        list = list.filter(r => r._systemStatus === 'case_created');
      } else if (statusFilter === 'client_created') {
        list = list.filter(r => !!r._linkedClientId);
      } else if (statusFilter === 'task_created') {
        list = list.filter(r => !!r._linkedTaskId);
      } else if (statusFilter === 'has_files') {
        list = list.filter(r => r._hasFiles || (r._fileUrls && r._fileUrls.length > 0));
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(row => {
        return Object.entries(row).some(([key, val]) => {
          if (key.startsWith('_')) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Sorting
    if (sortColumn) {
      list.sort((a, b) => {
        const valA = a[sortColumn] ?? '';
        const valB = b[sortColumn] ?? '';
        if (sortDirection === 'asc') {
          return String(valA).localeCompare(String(valB), 'ar');
        } else {
          return String(valB).localeCompare(String(valA), 'ar');
        }
      });
    }

    return list;
  }, [currentSheet, statusFilter, searchQuery, sortColumn, sortDirection]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  // Test URL in Add Sheet Modal
  const handleTestUrl = async () => {
    if (!formUrl.trim()) return;
    setIsTestingUrl(true);
    setTestResult(null);

    try {
      const res = await fetchPublicGoogleSheet(formUrl, formGid);
      const info = extractSheetInfo(formUrl);
      let discoveredTabs: SheetWorksheetTab[] = [];
      if (info.sheetId) {
        discoveredTabs = await discoverSheetTabs(info.sheetId);
      }

      setTestResult({
        success: true,
        message: `✓ تم الاتصال بنجاح! تم العثور على ${res.totalRows} صف و ${res.columns.length} عمود.`,
        rowCount: res.totalRows,
        columns: res.columns,
        discoveredTabs: discoveredTabs.length > 0 ? discoveredTabs : undefined
      });

      if (!formTitle.trim()) {
        setFormTitle(`استجابات نموذج Google (${new Date().toLocaleDateString('ar-EG')})`);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `✕ فشل الاتصال: ${e.message || e}`
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Save New Sheet
  const handleSaveNewSheet = (e: React.FormEvent) => {
    e.preventDefault();

    if (importMode === 'paste') {
      if (!pastedData.trim()) return;
      const parsed = parseRawTableText(pastedData);
      if (parsed.rows.length === 0) {
        alert('تعذر استخراج بيانات من النص الملصق. يرجى التأكد من نسخه كجدول أو CSV.');
        return;
      }

      const newSheet: SavedPublicSheet = {
        id: `sheet_pasted_${Date.now()}`,
        title: formTitle.trim() || 'جدول ملصق يدوياً',
        description: formDescription.trim(),
        url: '',
        sheetId: '',
        category: formCategory,
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        columns: parsed.columns,
        rows: parsed.rows,
        totalRows: parsed.totalRows,
        tabs: [{ gid: '0', name: 'البيانات الملصقة', isDefault: true }]
      };

      savePublicSheet(newSheet);
      setSheets(getSavedPublicSheets());
      setSelectedSheetId(newSheet.id);
      setIsAddModalOpen(false);
      setPastedData('');
      showToast('✓ تم استيراد الجدول الملصق بنجاح');
      return;
    }

    if (!formUrl.trim()) return;
    const info = extractSheetInfo(formUrl);
    if (!info.sheetId) {
      alert('يرجى إدخال رابط Google Sheet صالح أو معرف الجدول.');
      return;
    }

    const newSheet: SavedPublicSheet = {
      id: `sheet_${info.sheetId}_${Date.now()}`,
      title: formTitle.trim() || 'استجابات Google Sheet',
      description: formDescription.trim(),
      url: info.cleanUrl,
      sheetId: info.sheetId,
      gid: formGid || info.gid || '0',
      category: formCategory,
      createdAt: new Date().toISOString(),
      syncStatus: 'idle',
      columns: testResult?.columns || [],
      rows: [],
      totalRows: testResult?.rowCount || 0,
      tabs: testResult?.discoveredTabs || [{ gid: formGid || '0', name: 'استجابات النموذج 1', isDefault: true }]
    };

    savePublicSheet(newSheet);
    const updatedList = getSavedPublicSheets();
    setSheets(updatedList);
    setSelectedSheetId(newSheet.id);
    setIsAddModalOpen(false);
    setFormUrl('');
    setFormTitle('');
    setFormDescription('');
    setTestResult(null);

    // Initial Fetch
    handleSyncSheet(newSheet);
    showToast('✓ تمت إضافة الجدول إلى المفضلة');
  };

  // ==========================================
  // 3. SYSTEM INTEGRATION HANDLERS
  // ==========================================

  // Fast Create Case from Sheet Row
  const handleCreateCaseFromRow = async (row: SheetRowItem) => {
    if (!userProfile) return;
    setIsConvertingAction(true);

    try {
      const rowInfo = getRowDetails(row, currentSheet);
      const caseNumber = await generateNextCaseNumber();

      // Detect Platform & Type
      const rowText = Object.values(row).filter(v => typeof v === 'string').join(' ');
      const detectedPlatformName = detectPlatform(rowText) || 'Instagram';
      const detectedType = suggestCaseType(rowText) || 'general';

      const title = rowInfo.clientName 
        ? `طلب استجابة — ${rowInfo.clientName}` 
        : `طلب استجابة نموذج (${caseNumber})`;

      // Create Case in Firestore
      const newCaseData: Omit<CaseItem, 'id'> = {
        caseNumber,
        title,
        caseType: detectedType,
        platform: detectedPlatformName,
        status: 'new',
        priority: 'medium',
        client: {
          clientId: '',
          name: rowInfo.clientName || 'عميل وارد من النموذج',
          phone: rowInfo.phone || '',
          whatsapp: rowInfo.phone || '',
          email: rowInfo.email || ''
        },
        description: rowInfo.notesSummary || 'طلب وارد عبر استجابات Google Sheets',
        notes: `[المصدر: Google Sheets ${currentSheet?.title || ''}]:\n${rowInfo.notesSummary}`,
        typeSpecificData: {
          source: 'google_sheets_public',
          sourceLabel: currentSheet?.title || 'Google Sheet',
          extractedLinks: rowInfo.allUrls
        },
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        }
      };

      let newCaseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        const caseRef = await addDoc(collection(db, 'cases'), cleanFirestoreData(newCaseData));
        newCaseId = caseRef.id;
      } catch (dbErr) {
        console.warn('Firestore write offline, saving case locally:', dbErr);
      }

      saveLocalCase({
        id: newCaseId,
        ...newCaseData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update row in current sheet
      if (currentSheet) {
        const updatedRows = currentSheet.rows.map(r => {
          if (r._rowId === row._rowId) {
            return {
              ...r,
              _linkedCaseId: newCaseId,
              _linkedCaseNumber: caseNumber,
              _systemStatus: 'case_created' as const
            };
          }
          return r;
        });

        const updatedSheet = { ...currentSheet, rows: updatedRows };
        savePublicSheet(updatedSheet);
        setSheets(getSavedPublicSheets());
      }

      // Add to Case Attachments if files exist
      if (rowInfo.fileLinks.length > 0) {
        for (const fUrl of rowInfo.fileLinks) {
          try {
            await addDoc(collection(db, 'caseAttachments'), cleanFirestoreData({
              caseId: newCaseId,
              caseNumber: caseNumber,
              fileName: 'مستند مرفق من استجابة النموذج',
              fileType: 'application/pdf',
              downloadUrl: fUrl,
              dataUrl: fUrl,
              syncStatus: 'synced',
              uploadedBy: {
                uid: userProfile.uid,
                name: rowInfo.clientName || 'النموذج الخارجي'
              },
              notes: `تم استيراده من Google Sheets`,
              createdAt: serverTimestamp()
            }));
          } catch (attErr) {
            console.warn('Attachment save notice:', attErr);
          }
        }
      }

      // Log Audit
      await logAuditAndEvent({
        action: 'CREATE_CASE_FROM_SHEET',
        details: `إنشاء القضية ${caseNumber} من استجابة Google Sheets`,
        entityType: 'case',
        entityId: newCaseId,
        entityTitle: caseNumber,
        caseId: newCaseId,
        user: userProfile
      });

      showToast(`✓ تم إنشاء القضية ${caseNumber} بنجاح!`);

      if (onSelectCase) {
        onSelectCase(newCaseId);
      }
    } catch (e: any) {
      console.error('Error creating case:', e);
      alert(`خطأ: ${e.message || e}`);
    } finally {
      setIsConvertingAction(false);
      setInspectingRow(null);
    }
  };

  // Fast Create Client from Sheet Row
  const handleCreateClientFromRow = async (row: SheetRowItem) => {
    if (!userProfile) return;
    const rowInfo = getRowDetails(row, currentSheet);
    const clientName = rowInfo.clientName || prompt('يرجى تأكيد اسم الموكل:');
    if (!clientName) return;

    try {
      const clientRef = await addDoc(collection(db, 'clients'), cleanFirestoreData({
        name: clientName,
        phone: rowInfo.phone || '',
        whatsapp: rowInfo.phone || '',
        email: rowInfo.email || '',
        notes: `تم التسجيل من استجابة Google Sheet: ${currentSheet?.title || ''}`,
        caseIds: [],
        totalCasesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        }
      }));

      // Update row in current sheet
      if (currentSheet) {
        const updatedRows = currentSheet.rows.map(r => {
          if (r._rowId === row._rowId) {
            return {
              ...r,
              _linkedClientId: clientRef.id,
              _linkedClientName: clientName,
              _systemStatus: 'client_created' as const
            };
          }
          return r;
        });

        const updatedSheet = { ...currentSheet, rows: updatedRows };
        savePublicSheet(updatedSheet);
        setSheets(getSavedPublicSheets());
      }

      showToast(`✓ تم إضافة الموكل "${clientName}" بنجاح!`);
    } catch (e: any) {
      alert(`خطأ: ${e.message || e}`);
    }
  };

  // Fast Create Task from Sheet Row
  const handleCreateTaskFromRow = async (row: SheetRowItem) => {
    if (!userProfile) return;
    const rowInfo = getRowDetails(row, currentSheet);
    const taskTitle = prompt('عنوان المهمة:', `متابعة استجابة: ${rowInfo.clientName || 'عميل جديد'}`);
    if (!taskTitle) return;

    try {
      const taskRef = await addDoc(collection(db, 'tasks'), cleanFirestoreData({
        title: taskTitle,
        description: `متابعة البيانات الواردة:\n${rowInfo.notesSummary}`,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        assignedTo: {
          uid: userProfile.uid,
          name: userProfile.displayName
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        }
      }));

      if (currentSheet) {
        const updatedRows = currentSheet.rows.map(r => {
          if (r._rowId === row._rowId) {
            return {
              ...r,
              _linkedTaskId: taskRef.id,
              _linkedTaskTitle: taskTitle,
              _systemStatus: 'task_created' as const
            };
          }
          return r;
        });

        const updatedSheet = { ...currentSheet, rows: updatedRows };
        savePublicSheet(updatedSheet);
        setSheets(getSavedPublicSheets());
      }

      showToast(`✓ تم تعيين المهمة "${taskTitle}" بنجاح!`);
    } catch (e: any) {
      alert(`خطأ: ${e.message || e}`);
    }
  };

  // Link Row to Existing Case
  const handleLinkRowToExistingCase = async (caseItem: CaseItem) => {
    if (!linkingRow || !userProfile || !currentSheet) return;

    try {
      const rowInfo = getRowDetails(linkingRow, currentSheet);

      // Add timeline event to case
      await addDoc(collection(db, 'caseEvents'), cleanFirestoreData({
        caseId: caseItem.id,
        action: 'SHEET_RESPONSE_LINKED',
        title: `ربط استجابة نموذج بالقضية`,
        description: `تم إلحاق استجابة من Google Sheet (${currentSheet.title}) بسجل القضية.`,
        performedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        },
        timestamp: serverTimestamp(),
        metadata: {
          sheetTitle: currentSheet.title,
          rowId: linkingRow._rowId
        }
      }));

      // Attach drive files if available
      if (rowInfo.fileLinks.length > 0) {
        for (const fUrl of rowInfo.fileLinks) {
          try {
            await addDoc(collection(db, 'caseAttachments'), cleanFirestoreData({
              caseId: caseItem.id,
              caseNumber: caseItem.caseNumber,
              fileName: 'مستند مرفق من Google Sheet',
              fileType: 'application/pdf',
              downloadUrl: fUrl,
              dataUrl: fUrl,
              syncStatus: 'synced',
              uploadedBy: {
                uid: userProfile.uid,
                name: rowInfo.clientName || 'النموذج الخارجي'
              },
              notes: `تم ربطه من الشيت ${currentSheet.title}`,
              createdAt: serverTimestamp()
            }));
          } catch (attErr) {
            console.warn('Attachment linking notice:', attErr);
          }
        }
      }

      // Update row in current sheet
      const updatedRows = currentSheet.rows.map(r => {
        if (r._rowId === linkingRow._rowId) {
          return {
            ...r,
            _linkedCaseId: caseItem.id,
            _linkedCaseNumber: caseItem.caseNumber,
            _systemStatus: 'case_linked' as const
          };
        }
        return r;
      });

      const updatedSheet = { ...currentSheet, rows: updatedRows };
      savePublicSheet(updatedSheet);
      setSheets(getSavedPublicSheets());

      showToast(`✓ تم ربط الاستجابة بالقضية ${caseItem.caseNumber} بنجاح!`);
      setIsLinkToCaseModalOpen(false);
      setLinkingRow(null);
    } catch (e: any) {
      alert(`خطأ: ${e.message || e}`);
    }
  };

  // Copy text helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Manual Request Submission
  const handleCreateManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !userProfile) return;

    try {
      const reqId = `REQ-${Date.now().toString().slice(-6)}`;
      await addDoc(collection(db, 'externalRequests'), cleanFirestoreData({
        requestId: reqId,
        clientName: manualName.trim(),
        phone: manualPhone.trim(),
        whatsapp: manualPhone.trim(),
        email: manualEmail.trim(),
        requestType: manualType,
        platform: manualPlatform,
        accountUrl: manualAccountUrl.trim(),
        postUrl: manualPostUrl.trim(),
        description: manualDescription.trim(),
        notes: manualNotes.trim(),
        source: 'manual_entry',
        sourceLabel: 'إدخال يدوي مباشر',
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        }
      }));

      setShowManualModal(false);
      setManualName('');
      setManualPhone('');
      setManualEmail('');
      setManualDescription('');
      setManualAccountUrl('');
      showToast(`✓ تم تسجيل الطلب الخارجي (${reqId}) بنجاح!`);
    } catch (e: any) {
      alert(`خطأ: ${e.message || e}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in text-sm font-semibold border border-indigo-400">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header & Mode Switcher */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Header Branding */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black tracking-tight">
                  الطلبات الخارجية واستجابات Google Sheets
                </h1>
                <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Multi-Worksheet + Zero-Auth
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                قراءة فورية واستعراض أوراق العمل والتبديل بين الصفحات، وتحويل الاستجابات لقضايا وعملاء فوراً
              </p>
            </div>
          </div>

          {/* Action Toolbar & Mode Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle Button Group */}
            <div className={`p-1 rounded-xl border flex items-center gap-1 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setSectionMode('sheets_hub')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectionMode === 'sheets_hub'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>أوراق Google Sheets ({sheets.length})</span>
              </button>

              <button
                onClick={() => setSectionMode('firestore_db')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectionMode === 'firestore_db'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>سجل الطلبات المتزامنة ({firestoreRequests.length})</span>
              </button>
            </div>

            {/* Manual New Request Button */}
            <button
              onClick={() => setShowManualModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>إدخال طلب يدوي</span>
            </button>

            {/* Connect / Add New Sheet Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ربط جدول / فورم جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 1: GOOGLE SHEETS & WORKSHEETS HUB */}
      {/* ========================================== */}
      {sectionMode === 'sheets_hub' && (
        <div className="space-y-6">
          
          {/* Sheets Selector & Sheet Management Bar */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Sheets Pill Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                <span className="text-xs font-bold text-slate-400 shrink-0 ms-1">الجداول المتصلة:</span>
                {sheets.map(s => {
                  const isSelected = s.id === (currentSheet?.id || '');
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSheetId(s.id);
                        setCurrentPage(1);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : isDark
                            ? 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="truncate max-w-[160px]">{s.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-emerald-700 text-white' : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {s.totalRows || 0}
                      </span>
                    </button>
                  );
                })}

                {sheets.length === 0 && (
                  <div className="text-xs text-amber-500 font-medium py-1">
                    لا يوجد جداول مضافة بعد. اضغط "ربط جدول / فورم جديد" للبدء.
                  </div>
                )}
              </div>

              {/* Sheet Control Buttons */}
              {currentSheet && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSyncSheet(currentSheet)}
                    disabled={currentSheet.syncStatus === 'syncing'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title="تحديث البيانات من الشيت"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${currentSheet.syncStatus === 'syncing' ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>تحديث البيانات</span>
                  </button>

                  <button
                    onClick={handleAutoDiscoverTabs}
                    disabled={isDiscoveringTabs}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    }`}
                    title="فحص واكتشاف كافة أوراق العمل في الملف"
                  >
                    <Compass className={`w-3.5 h-3.5 ${isDiscoveringTabs ? 'animate-spin' : ''}`} />
                    <span>اكتشاف الأوراق (Auto-Tabs)</span>
                  </button>

                  {currentSheet.url && (
                    <a
                      href={currentSheet.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`p-2 rounded-xl border text-xs cursor-pointer ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                      title="فتح الشيت الأصلي في Google Sheets"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteSheet(currentSheet.id)}
                    className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs cursor-pointer"
                    title="حذف هذا الجدول من المفضلة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 📑 WORKSHEETS / TABS NAVIGATION BAR */}
            {currentSheet && (
              <div className="mt-4 pt-3 border-t border-dashed border-zinc-700/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 shrink-0 me-1">
                    <Layers className="w-4 h-4" />
                    <span>أوراق العمل (Tabs):</span>
                  </div>

                  {(currentSheet.tabs || [{ gid: currentSheet.gid || '0', name: currentSheet.activeTabName || 'استجابات النموذج 1', isDefault: true }]).map((tab, idx) => {
                    const isActive = (currentSheet.gid || '0') === tab.gid;
                    const totalTabs = (currentSheet.tabs || []).length;
                    return (
                      <div
                        key={`${tab.gid}_${idx}`}
                        className={`flex items-center rounded-lg border text-xs font-bold transition-all shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : isDark
                              ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        <button
                          onClick={() => handleSwitchTab(currentSheet.id, tab)}
                          className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{tab.name}</span>
                          <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                            isActive ? 'bg-indigo-700 text-white' : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-100 text-slate-500'
                          }`}>
                            GID: {tab.gid}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTab(tab.gid, tab.name);
                          }}
                          title={`حذف ورقة العمل "${tab.name}"`}
                          className={`p-1 me-1 rounded-md transition-colors cursor-pointer ${
                            isActive
                              ? 'text-indigo-200 hover:text-white hover:bg-indigo-700'
                              : 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-800'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add Tab Button */}
                  <button
                    onClick={() => setIsAddTabModalOpen(true)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed flex items-center gap-1 shrink-0 cursor-pointer ${
                      isDark ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة ورقة عمل</span>
                  </button>
                </div>

                {/* Last Synced Info */}
                <div className="text-[11px] text-slate-500 flex items-center gap-2 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    آخر مزامنة: {currentSheet.lastSyncedAt ? new Date(currentSheet.lastSyncedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'غير محدد'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search, Status Filters & View Controls */}
          {currentSheet && (
            <div className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              
              {/* Search Field */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="بحث في الاسم، الهاتف، البلاغ، الملاحظات..."
                  className={`w-full ps-10 pe-4 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <span className="text-xs text-slate-400 shrink-0 font-medium">الحالة:</span>
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'unlinked', label: 'غير معالج' },
                  { id: 'case_created', label: 'تم فتح قضية' },
                  { id: 'case_linked', label: 'مرتبط بقضية' },
                  { id: 'client_created', label: 'تمت إضافة عميل' },
                  { id: 'task_created', label: 'تمت إضافة مهمة' },
                  { id: 'has_files', label: 'يحتوي ملفات' }
                ].map(flt => (
                  <button
                    key={flt.id}
                    onClick={() => {
                      setStatusFilter(flt.id as any);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      statusFilter === flt.id
                        ? 'bg-indigo-600 text-white'
                        : isDark ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              {/* View Switcher (Table / Grid) */}
              <div className={`p-1 rounded-xl border flex items-center gap-1 shrink-0 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                    viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="عرض كجدول بيانات تفصيلي"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                    viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="عرض كبطاقات تفاعلية"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* SHEET DATA VIEW: TABLE OR CARDS */}
          {/* ========================================== */}
          {currentSheet && currentSheet.rows && currentSheet.rows.length > 0 ? (
            <div>
              {viewMode === 'table' ? (
                /* TABLE VIEW */
                <div className={`rounded-2xl border overflow-hidden transition-all ${
                  isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead className={`border-b text-slate-400 font-bold uppercase ${
                        isDark ? 'bg-zinc-900/90 border-[#27272A]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <tr>
                          <th className="p-3 text-start w-12">#</th>
                          <th className="p-3 text-start">حالة المنظومة والربط</th>
                          {currentSheet.columns.slice(0, 7).map(col => (
                            <th 
                              key={col.id}
                              onClick={() => {
                                if (sortColumn === col.id) {
                                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortColumn(col.id);
                                  setSortDirection('desc');
                                }
                              }}
                              className="p-3 text-start cursor-pointer hover:text-indigo-400 transition-colors whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1">
                                <span>{col.label}</span>
                                <ArrowUpDown className="w-3 h-3 opacity-60" />
                              </div>
                            </th>
                          ))}
                          <th className="p-3 text-center">المرفقات والروابط</th>
                          <th className="p-3 text-center">الإجراءات والتحويل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {paginatedRows.map((row, rIdx) => {
                          const rowNum = (currentPage - 1) * itemsPerPage + rIdx + 1;
                          const rowInfo = getRowDetails(row, currentSheet);

                          return (
                            <tr
                              key={row._rowId || rIdx}
                              className={`transition-colors ${
                                isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'
                              } ${row._linkedCaseId ? (isDark ? 'bg-emerald-950/10' : 'bg-emerald-50/30') : ''}`}
                            >
                              {/* Row Number */}
                              <td className="p-3 font-mono text-slate-400 text-[11px]">
                                {rowNum}
                              </td>

                              {/* System Status Badges */}
                              <td className="p-3 whitespace-nowrap">
                                {row._linkedCaseNumber ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>قضية {row._linkedCaseNumber}</span>
                                  </span>
                                ) : row._linkedClientName ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                                    <User className="w-3 h-3" />
                                    <span>عميل مسجل</span>
                                  </span>
                                ) : row._linkedTaskTitle ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                    <CheckSquare className="w-3 h-3" />
                                    <span>مهمة معينة</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
                                    <Clock className="w-3 h-3" />
                                    <span>جديد / غير معالج</span>
                                  </span>
                                )}
                              </td>

                              {/* Columns Data */}
                              {currentSheet.columns.slice(0, 7).map(col => {
                                const val = row[col.id] ?? '';
                                const strVal = String(val);
                                const analyzed = analyzeCellValue(strVal);

                                return (
                                  <td key={col.id} className="p-3 max-w-[220px] truncate text-slate-300">
                                    {analyzed.isPhone ? (
                                      <a
                                        href={`tel:${strVal}`}
                                        className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>{strVal}</span>
                                      </a>
                                    ) : analyzed.isEmail ? (
                                      <a
                                        href={`mailto:${strVal}`}
                                        className="text-indigo-400 hover:underline flex items-center gap-1"
                                      >
                                        <Mail className="w-3 h-3" />
                                        <span className="truncate">{strVal}</span>
                                      </a>
                                    ) : analyzed.isDrive ? (
                                      <button
                                        onClick={() => setPreviewingFile({ url: strVal, title: col.label })}
                                        className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>معاينة المستند</span>
                                      </button>
                                    ) : (
                                      <span title={strVal}>{strVal || '—'}</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Attachments & URLs */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {rowInfo.fileLinks.length > 0 && (
                                    <button
                                      onClick={() => setPreviewingFile({ url: rowInfo.fileLinks[0], title: 'مرفق النموذج' })}
                                      className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs flex items-center gap-1 px-2 cursor-pointer font-bold"
                                      title="معاينة المستند المرفق من Drive"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{rowInfo.fileLinks.length} ملف</span>
                                    </button>
                                  )}

                                  {rowInfo.allUrls.length > 0 && (
                                    <button
                                      onClick={() => handleCopy(rowInfo.allUrls[0], `url_${rIdx}`)}
                                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                                      title="نسخ الرابط"
                                    >
                                      {copiedId === `url_${rIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Row Quick Actions */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  
                                  {/* Convert to Case */}
                                  <button
                                    onClick={() => handleCreateCaseFromRow(row)}
                                    disabled={isConvertingAction}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                    title="تحويل هذه الاستجابة إلى ملف قضية جديد فوراً"
                                  >
                                    <FolderPlus className="w-3.5 h-3.5" />
                                    <span>فتح قضية</span>
                                  </button>

                                  {/* Link to Existing Case */}
                                  <button
                                    onClick={() => {
                                      setLinkingRow(row);
                                      setIsLinkToCaseModalOpen(true);
                                    }}
                                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                                    }`}
                                    title="ربط بقضية قائمة في المنظومة"
                                  >
                                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                                  </button>

                                  {/* Inspect Row Details */}
                                  <button
                                    onClick={() => setInspectingRow(row)}
                                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                                    }`}
                                    title="معاينة تفاصيل الاستجابة كاملة"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className={`p-4 border-t flex items-center justify-between text-xs ${
                    isDark ? 'bg-zinc-900/50 border-[#27272A] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div>
                      عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredRows.length)} من إجمالي {filteredRows.length} صف
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border disabled:opacity-40 cursor-pointer"
                      >
                        السابق
                      </button>
                      <span className="font-bold text-white">صفحة {currentPage} من {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border disabled:opacity-40 cursor-pointer"
                      >
                        التالي
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                /* CARDS VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedRows.map((row, rIdx) => {
                    const rowInfo = getRowDetails(row, currentSheet);
                    return (
                      <div
                        key={row._rowId || rIdx}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isDark ? 'bg-[#18181B] border-[#27272A] hover:border-zinc-700' : 'bg-white border-slate-200 shadow-xs'
                        } ${row._linkedCaseId ? 'ring-1 ring-emerald-500/40' : ''}`}
                      >
                        <div className="space-y-3">
                          {/* Card Top Badges */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-slate-400">#{(currentPage - 1) * itemsPerPage + rIdx + 1}</span>
                            {row._linkedCaseNumber ? (
                              <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                قضية {row._linkedCaseNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
                                استجابة واردة
                              </span>
                            )}
                          </div>

                          {/* Client Name / Header */}
                          <div className="font-bold text-base text-white">
                            {rowInfo.clientName || 'استجابة بدون اسم محدد'}
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1 text-xs">
                            {rowInfo.phone && (
                              <div className="flex items-center gap-2 text-indigo-400 font-mono">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{rowInfo.phone}</span>
                              </div>
                            )}
                            {rowInfo.email && (
                              <div className="flex items-center gap-2 text-slate-400">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="truncate">{rowInfo.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes / Description Summary */}
                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                            {rowInfo.notesSummary || 'لا توجد تفاصيل إضافية'}
                          </p>

                          {/* Files */}
                          {rowInfo.fileLinks.length > 0 && (
                            <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>{rowInfo.fileLinks.length} ملفات مرفقة (Drive)</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setInspectingRow(row)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                          >
                            معاينة
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setLinkingRow(row);
                                setIsLinkToCaseModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white text-xs cursor-pointer"
                              title="ربط بقضية مسجلة"
                            >
                              <LinkIcon className="w-4 h-4 text-indigo-400" />
                            </button>
                            <button
                              onClick={() => handleCreateCaseFromRow(row)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                              <span>فتح قضية</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Empty State for Sheets */
            <div className={`p-12 text-center rounded-2xl border ${
              isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-white mb-1">لا توجد بيانات متاحة في ورقة العمل الحالية</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                تأكد من مشاركة الجدول كـ "عام لمن يملك الرابط" (Anyone with link can view)، أو قم بالتبديل إلى ورقة عمل أخرى من شريط الأوراق.
              </p>
              {currentSheet && (
                <button
                  onClick={() => handleSyncSheet(currentSheet)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة تحميل الجدول</span>
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================== */}
      {/* SECTION 2: FIRESTORE EXTERNAL REQUESTS DB */}
      {/* ========================================== */}
      {sectionMode === 'firestore_db' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">سجل الطلبات الخارجية المتزامنة (Database)</h2>
                <p className="text-xs text-slate-400">كافة الطلبات المحفوظة في قاعدة بيانات المنظومة مع تفاصيل التحويل</p>
              </div>
              <button
                onClick={() => setShowManualModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إدخال طلب جديد</span>
              </button>
            </div>
          </div>

          {firestoreRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {firestoreRequests.map(req => {
                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-400">{req.requestId}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === 'converted_to_case' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : req.status === 'linked_to_case'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {req.status === 'converted_to_case' ? `تم التحويل (${req.linkedCaseNumber})` : req.status === 'linked_to_case' ? `مرتبط (${req.linkedCaseNumber})` : 'جديد قيد الانتظار'}
                        </span>
                      </div>

                      <div className="font-bold text-base text-white">{req.clientName}</div>
                      
                      <div className="text-xs text-slate-400 space-y-1">
                        {req.phone && <div className="font-mono">{req.phone}</div>}
                        {req.platform && <div>المنصة: <span className="text-zinc-300 font-semibold">{req.platform}</span></div>}
                        {req.requestType && <div>النوع: <span className="text-zinc-300 font-semibold">{req.requestType}</span></div>}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-3">{req.description}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {req.sourceLabel || req.source}
                      </span>

                      {req.linkedCaseId && (
                        <button
                          onClick={() => onSelectCase && onSelectCase(req.linkedCaseId!)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>عرض القضية ({req.linkedCaseNumber})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`p-12 text-center rounded-2xl border ${
              isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <Inbox className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-white mb-1">لا توجد طلبات مسجلة في قاعدة البيانات</h3>
              <p className="text-xs text-slate-400 mb-4">يمكنك إنشاء طلبات يدوية أو تحويل استجابات الشيت مباشرة إلى قضايا.</p>
              <button
                onClick={() => setShowManualModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إدخال طلب جديد</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD / CONNECT NEW GOOGLE SHEET */}
      {/* ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-5 animate-fade-in ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">ربط Google Sheet أو نموذج استجابات</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher: Direct URL vs Paste CSV/TSV */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setImportMode('url')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  importMode === 'url' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                رابط Google Sheets مباشر (Zero-Auth)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  importMode === 'paste' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                لصق بيانات جدول (CSV / TSV)
              </button>
            </div>

            <form onSubmit={handleSaveNewSheet} className="space-y-4">
              
              {importMode === 'url' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">رابط Google Sheet (أو معرف الجدول)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formUrl}
                        onChange={(e) => {
                          setFormUrl(e.target.value);
                          setTestResult(null);
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleTestUrl}
                        disabled={isTestingUrl || !formUrl.trim()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                        <span>فحص الرابط</span>
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-xl border text-xs font-medium ${
                      testResult.success 
                        ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' 
                        : 'bg-rose-950/30 border-rose-800 text-rose-300'
                    }`}>
                      {testResult.message}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">عنوان وتسمية الجدول</label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="مثال: استجابات استمارة البلاغات"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">رقم الورقة (GID)</label>
                      <input
                        type="text"
                        value={formGid}
                        onChange={(e) => setFormGid(e.target.value)}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">عنوان الجدول</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="مثال: بيانات طلبات واردة"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">الصق محتوى الجدول (CSV أو منسوخ من Excel/Sheets)</label>
                    <textarea
                      rows={5}
                      value={pastedData}
                      onChange={(e) => setPastedData(e.target.value)}
                      placeholder="الاسم	الهاتف	المنصة	التفاصيل..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ والبدء بالقراءة
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD CUSTOM WORKSHEET TAB */}
      {/* ========================================== */}
      {isAddTabModalOpen && currentSheet && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 animate-fade-in ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">إضافة ورقة عمل (Worksheet Tab)</h3>
              <button onClick={() => setIsAddTabModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomTab} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">اسم الورقة</label>
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="مثال: استجابات النموذج 2 أو العملاء"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">معرف الورقة (GID)</label>
                <input
                  type="text"
                  value={newTabGid}
                  onChange={(e) => setNewTabGid(e.target.value)}
                  placeholder="مثال: 14589230 (يمكن تركه 0 للورقة الأولى)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddTabModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  إضافة وتحميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: LINK ROW TO EXISTING CASE */}
      {/* ========================================== */}
      {isLinkToCaseModalOpen && linkingRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 animate-fade-in ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">ربط الاستجابة بقضية مسجلة</h3>
              </div>
              <button onClick={() => setIsLinkToCaseModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="text"
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  placeholder="ابحث برقم القضية، العنوان، أو اسم الموكل..."
                  className="w-full ps-9 pe-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pe-1">
                {systemCases
                  .filter(c => {
                    const q = caseSearchQuery.toLowerCase();
                    return c.caseNumber.toLowerCase().includes(q) ||
                           c.title.toLowerCase().includes(q) ||
                           (c.client?.name || '').toLowerCase().includes(q);
                  })
                  .slice(0, 15)
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleLinkRowToExistingCase(c)}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-400">{c.caseNumber}</span>
                          <span className="text-xs font-bold text-white">{c.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">الموكل: {c.client?.name || 'غير محدد'}</div>
                      </div>
                      <button className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                        اختيار
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ROW DETAILS INSPECTOR */}
      {/* ========================================== */}
      {inspectingRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border p-6 shadow-2xl space-y-4 overflow-y-auto ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">تفاصيل الاستجابة الكاملة</h3>
              </div>
              <button onClick={() => setInspectingRow(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Key Values Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentSheet?.columns.map(col => {
                  const val = inspectingRow[col.id] ?? '';
                  if (!val) return null;
                  return (
                    <div key={col.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                      <div className="text-[11px] font-bold text-slate-400">{col.label}</div>
                      <div className="text-xs text-white break-words">{String(val)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCreateClientFromRow(inspectingRow)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-blue-400" />
                    <span>إضافة كموكل</span>
                  </button>
                  <button
                    onClick={() => handleCreateTaskFromRow(inspectingRow)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                    <span>إنشاء مهمة</span>
                  </button>
                </div>

                <button
                  onClick={() => handleCreateCaseFromRow(inspectingRow)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>فتح ملف قضية فوري</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: MANUAL REQUEST ENTRY */}
      {/* ========================================== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 animate-fade-in ${
            isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">إدخال طلب خارجي يدوياً</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualRequest} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">اسم صاحب الطلب / الموكل *</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">رقم الهاتف / واتساب</label>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="+964..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">نوع الطلب</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEFAULT_CASE_TYPES.map(ct => (
                      <option key={ct.id} value={ct.labelAr}>{ct.labelAr}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">المنصة</label>
                  <select
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEFAULT_PLATFORMS.map(p => (
                      <option key={p.id} value={p.name}>{p.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">تفاصيل المشكلة والطلب</label>
                <textarea
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="اكتب ما ذكره العميل بالتفصيل..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: FILE PREVIEW (Google Drive) */}
      {/* ========================================== */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white truncate max-w-md">{previewingFile.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewingFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في نافذة جديدة</span>
                </a>
                <button
                  onClick={() => setPreviewingFile(null)}
                  className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg cursor-pointer"
                >
                  إغلاق (✕)
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/60 rounded-xl p-2 min-h-[350px]">
              <iframe
                src={getGoogleDrivePreviewUrl(previewingFile.url)}
                className="w-full h-[60vh] rounded-lg border-0"
                title="معاينة الملف"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
