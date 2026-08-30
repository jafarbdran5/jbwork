/**
 * Google Sheets Public Reader & Form Responses Engine (100% Zero-Auth / Public Mode)
 * Reads public Google Sheets & Google Forms responses without requiring OAuth credentials.
 * Supports:
 *  - Full Multi-Worksheet / Multi-Tab navigation and automatic tab discovery
 *  - Full GViz JSON parser with fallback header detection (handles empty column headers, dates, formulas)
 *  - Fallback CSV Export parser with auto-delimiter detection (comma, tab, semicolon)
 *  - Direct TSV Export parser
 *  - Manual CSV / TSV text paste parser (useful when network or CORS is blocked)
 *  - Comprehensive URL link extraction & Google Drive document embedder
 *  - Seamless two-way integration with System (Cases, Clients, Tasks, Documents)
 */

export interface SheetWorksheetTab {
  gid: string;
  name: string;
  isDefault?: boolean;
  rowCount?: number;
}

export interface SheetColumn {
  id: string;
  label: string;
  type?: string;
  isTimestamp?: boolean;
  isFileLink?: boolean;
  isEmail?: boolean;
  isPhone?: boolean;
  isUrl?: boolean;
}

export interface SheetRowItem {
  _rowId: string;
  _rowIndex: number;
  _syncedAt: string;
  _hasFiles: boolean;
  _fileUrls: string[];
  _linkedCaseId?: string;
  _linkedCaseNumber?: string;
  _linkedClientId?: string;
  _linkedClientName?: string;
  _linkedTaskId?: string;
  _linkedTaskTitle?: string;
  _systemStatus?: 'unlinked' | 'case_created' | 'case_linked' | 'client_created' | 'task_created' | 'completed';
  [key: string]: any;
}

export interface SavedPublicSheet {
  id: string;
  title: string;
  description?: string;
  url: string;
  sheetId: string;
  gid?: string;
  activeTabName?: string;
  tabs?: SheetWorksheetTab[];
  category: string;
  targetModule?: 'cases' | 'clients' | 'financials' | 'consultations' | 'requests' | 'general';
  tags?: string[];
  color?: string;
  createdAt: string;
  lastSyncedAt?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  columns: SheetColumn[];
  rows: SheetRowItem[];
  totalRows: number;
  pinned?: boolean;
  autoSync?: boolean;
}

const STORAGE_KEY = 'jb_saved_public_sheets';

/**
 * Extracts Google Sheet ID and GID from any valid Google Sheets / Forms URL or raw ID
 */
export function extractSheetInfo(inputUrl: string): { sheetId: string | null; gid: string | null; cleanUrl: string } {
  if (!inputUrl) return { sheetId: null, gid: null, cleanUrl: '' };

  const trimmed = inputUrl.trim();

  // If user pasted direct ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return { sheetId: trimmed, gid: '0', cleanUrl: `https://docs.google.com/spreadsheets/d/${trimmed}/edit` };
  }

  // Standard Google Sheets URL: /spreadsheets/d/{SHEET_ID}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const sheetId = match ? match[1] : null;

  // Extract GID if present (#gid=123 or ?gid=123 or &gid=123)
  const gidMatch = trimmed.match(/[#?&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  // Published to web format: /spreadsheets/d/e/{PUB_ID}/...
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch) {
    return { sheetId: pubMatch[1], gid: gid || '0', cleanUrl: trimmed };
  }

  return { 
    sheetId, 
    gid: gid || '0', 
    cleanUrl: sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid || '0'}` : trimmed 
  };
}

export interface DiscoveredTabsResult {
  sheetId: string;
  title: string;
  tabs: SheetWorksheetTab[];
}

/**
 * Discovers all worksheet tabs from a Google Spreadsheet using server proxy + API + multiple fallbacks
 */
export async function discoverSheetTabs(sheetIdOrUrl: string): Promise<SheetWorksheetTab[]> {
  const result = await discoverSpreadsheetMetadata(sheetIdOrUrl);
  return result.tabs;
}

/**
 * Comprehensive discovery of Spreadsheet Title and all its Worksheet Tabs
 */
export async function discoverSpreadsheetMetadata(sheetIdOrUrl: string): Promise<DiscoveredTabsResult> {
  const { sheetId } = extractSheetInfo(sheetIdOrUrl);
  if (!sheetId) {
    return {
      sheetId: '',
      title: 'Google Spreadsheet',
      tabs: [{ gid: '0', name: 'الورقة 1 (الرئيسية)', isDefault: true }]
    };
  }

  const discovered: SheetWorksheetTab[] = [];
  const visitedGids = new Set<string>();
  const visitedNames = new Set<string>();
  let sheetTitle = '';

  const addTab = (gid: string, name: string, rowCount?: number) => {
    const cleanGid = String(gid || '0').trim();
    const cleanName = (name || '').trim();
    if (!cleanName) return;
    if (visitedGids.has(cleanGid) && visitedNames.has(cleanName.toLowerCase())) return;

    visitedGids.add(cleanGid);
    visitedNames.add(cleanName.toLowerCase());
    discovered.push({
      gid: cleanGid,
      name: cleanName,
      isDefault: cleanGid === '0' || discovered.length === 0,
      rowCount
    });
  };

  // Strategy 1: Server-side API endpoint (/api/sheets/discover-tabs)
  try {
    const serverUrl = `/api/sheets/discover-tabs?sheetId=${encodeURIComponent(sheetId)}`;
    const res = await fetch(serverUrl, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.tabs) && data.tabs.length > 0) {
        if (data.title) sheetTitle = data.title;
        data.tabs.forEach((t: any) => {
          addTab(String(t.gid), String(t.name), t.rowCount);
        });
        if (discovered.length > 0) {
          return { sheetId, title: sheetTitle || 'Google Spreadsheet', tabs: discovered };
        }
      }
    }
  } catch (serverErr) {
    console.warn('Server discovery proxy notice:', serverErr);
  }

  // Strategy 2: Google Workspace OAuth Token (if available in client)
  try {
    const token = localStorage.getItem('jb_google_workspace_token');
    if (token) {
      const gRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties.rowCount)`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData?.properties?.title) sheetTitle = gData.properties.title;
        (gData?.sheets || []).forEach((s: any, idx: number) => {
          const gid = String(s?.properties?.sheetId ?? idx);
          const name = String(s?.properties?.title || `Sheet ${idx + 1}`);
          const rowCount = s?.properties?.gridProperties?.rowCount;
          addTab(gid, name, rowCount);
        });
        if (discovered.length > 0) {
          return { sheetId, title: sheetTitle || 'Google Spreadsheet', tabs: discovered };
        }
      }
    }
  } catch (tokenErr) {
    console.warn('OAuth discovery notice:', tokenErr);
  }

  // Strategy 3: Probe Common Tab Names via GViz (Works on all public sheets without CORS issues)
  const candidateNames = [
    'Sheet1', 'Sheet2', 'Sheet3', 'Sheet4', 'Sheet5', 'Sheet6', 'Sheet7', 'Sheet8',
    'الورقة 1', 'الورقة 2', 'الورقة 3', 'الورقة 4', 'الورقة 5', 'الورقة 6',
    'ورقة 1', 'ورقة 2', 'ورقة 3', 'ورقة1', 'ورقة2', 'ورقة3',
    'Form Responses 1', 'Form Responses 2', 'Form Responses 3',
    'ردود النموذج 1', 'ردود النموذج 2', 'استجابات النموذج 1', 'استجابات النموذج 2',
    'استجابات الفورم', 'الاستجابات', 'الردود', 'استجابات النموذج', 'ردود النموذج',
    'Data', 'البيانات', 'Cases', 'القضايا', 'Clients', 'العملاء', 'Tasks', 'المهمات',
    'Summary', 'الملخص', 'Archive', 'الأرشيف', 'Main', 'الرئيسية'
  ];

  try {
    const probePromises = candidateNames.map(async (name) => {
      try {
        const probeUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}`;
        const res = await fetch(probeUrl);
        if (res.ok) {
          const text = await res.text();
          if (text.includes('google.visualization.Query.setResponse')) {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
            if (match && match[1]) {
              const parsed = JSON.parse(match[1]);
              if (parsed.status === 'ok' && parsed.table) {
                const rowCount = parsed.table.rows?.length || 0;
                return { name, rowCount };
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
      return null;
    });

    const probeResults = await Promise.all(probePromises);
    probeResults.filter(Boolean).forEach((res, idx) => {
      if (res) {
        addTab(String(idx), res.name, res.rowCount);
      }
    });
  } catch (probeErr) {
    console.warn('Probe error:', probeErr);
  }

  // Strategy 4: Direct Web scraping fallback
  try {
    const urls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'text/html,application/xhtml+xml' } });
        if (res.ok) {
          const html = await res.text();
          
          // Sheet Title
          if (!sheetTitle) {
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              sheetTitle = titleMatch[1].replace(/ - Google Sheets/i, '').replace(/ - جداول بيانات Google/i, '').trim();
            }
          }

          // Pattern 1: <li id="sheet-button-([0-9]+)"[^>]*><a[^>]*>([^<]+)</a>
          const btnRegex = /<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
          let match: RegExpExecArray | null;
          while ((match = btnRegex.exec(html)) !== null) {
            addTab(match[1], match[2].trim());
          }

          // Pattern 2: JSON name & id
          const jsonMatches = html.match(/\{"(?:name|title)":"([^"]+)","(?:id|sheetId)":([0-9]+)[^}]*\}/g);
          if (jsonMatches) {
            jsonMatches.forEach(jm => {
              const nm = jm.match(/"(?:name|title)":"([^"]+)"/);
              const idm = jm.match(/"(?:id|sheetId)":([0-9]+)/);
              if (nm && idm) {
                addTab(idm[1], nm[1].trim());
              }
            });
          }

          if (discovered.length > 0) break;
        }
      } catch (innerErr) {
        // continue
      }
    }
  } catch (err) {
    console.warn('Tab auto-discovery fetch error:', err);
  }

  // Fallback defaults if none discovered
  if (discovered.length === 0) {
    addTab('0', 'الورقة 1 (الرئيسية)', 0);
  }

  return {
    sheetId,
    title: sheetTitle || 'Google Spreadsheet',
    tabs: discovered
  };
}

/**
 * Smart delimiter detector for CSV / TSV
 */
function detectDelimiter(sampleText: string): string {
  const firstLine = sampleText.split(/\r\n|\r|\n/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

/**
 * Robust CSV / TSV parser handling quotes, linebreaks, commas, tabs, and semicolons
 */
export function parseCSV(text: string, customDelimiter?: string): string[][] {
  if (!text || !text.trim()) return [];

  const delimiter = customDelimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Detects if a string is a URL, Google Drive link, email, or phone
 */
export function analyzeCellValue(val: any): { isUrl: boolean; isDrive: boolean; isEmail: boolean; isPhone: boolean; isDate: boolean } {
  if (typeof val !== 'string' || !val) {
    return { isUrl: false, isDrive: false, isEmail: false, isPhone: false, isDate: false };
  }

  const str = val.trim();
  const isUrl = /^https?:\/\//i.test(str);
  const isDrive = isUrl && (str.includes('drive.google.com') || str.includes('docs.google.com') || str.includes('drive.usercontent.google.com'));
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  const isPhone = /^(\+|00)?[0-9\s\-()]{7,20}$/.test(str) && !isEmail && (str.replace(/[^0-9]/g, '').length >= 7);
  const isDate = !isNaN(Date.parse(str)) && (str.includes('-') || str.includes('/') || str.includes(':')) && str.length >= 8;

  return { isUrl, isDrive, isEmail, isPhone, isDate };
}

/**
 * Extracts all links and Google Drive URLs from a row object
 */
export function extractFilesAndLinksFromRow(row: Record<string, any>): { driveLinks: string[]; otherLinks: string[]; emails: string[]; phones: string[] } {
  const driveLinks: string[] = [];
  const otherLinks: string[] = [];
  const emails: string[] = [];
  const phones: string[] = [];

  Object.entries(row).forEach(([key, val]) => {
    if (key.startsWith('_') || val === null || val === undefined) return;
    const strVal = String(val).trim();
    if (!strVal) return;
    
    // Check if cell contains multiple comma/space/newline separated links (common in Google Forms file uploads)
    const urlRegex = /(https?:\/\/[^\s,]+)/gi;
    const matches = strVal.match(urlRegex);

    if (matches && matches.length > 0) {
      matches.forEach(token => {
        const cleanToken = token.replace(/["')\]]+$/, '').trim();
        if (cleanToken.includes('drive.google.com') || cleanToken.includes('docs.google.com') || cleanToken.includes('drive.usercontent.google.com')) {
          if (!driveLinks.includes(cleanToken)) driveLinks.push(cleanToken);
        } else {
          if (!otherLinks.includes(cleanToken)) otherLinks.push(cleanToken);
        }
      });
    } else {
      const analysis = analyzeCellValue(strVal);
      if (analysis.isDrive && !driveLinks.includes(strVal)) driveLinks.push(strVal);
      else if (analysis.isUrl && !otherLinks.includes(strVal)) otherLinks.push(strVal);
      else if (analysis.isEmail && !emails.includes(strVal)) emails.push(strVal);
      else if (analysis.isPhone && !phones.includes(strVal)) phones.push(strVal);
    }
  });

  return { driveLinks, otherLinks, emails, phones };
}

/**
 * Converts Google Drive share URL into an embeddable preview or direct link
 */
export function getGoogleDrivePreviewUrl(url: string): { previewUrl: string; directUrl: string; fileId: string | null } {
  if (!url) return { previewUrl: '', directUrl: '', fileId: null };

  // Match /file/d/{FILE_ID}/...
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  // Match ?id={FILE_ID} or &id={FILE_ID}
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  // Match /document/d/{FILE_ID}/ or /spreadsheets/d/{FILE_ID}/ or /presentation/d/{FILE_ID}/ or /forms/d/{FILE_ID}/
  const docMatch = url.match(/\/(document|spreadsheets|presentation|forms)\/d\/([a-zA-Z0-9_-]+)/);

  const fileId = fileMatch ? fileMatch[1] : (idMatch ? idMatch[1] : (docMatch ? docMatch[2] : null));

  if (!fileId) {
    return { previewUrl: url, directUrl: url, fileId: null };
  }

  return {
    previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    directUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
    fileId
  };
}

/**
 * Main fetch function: Fetches public Google Sheet data via multiple resilient strategies
 */
export async function fetchPublicGoogleSheet(
  urlOrId: string, 
  gid: string = '0',
  sheetName?: string
): Promise<{
  columns: SheetColumn[];
  rows: SheetRowItem[];
  totalRows: number;
  sheetTitle?: string;
  activeGid: string;
  activeSheetName?: string;
}> {
  const { sheetId, gid: extractedGid } = extractSheetInfo(urlOrId);
  const activeGid = gid || extractedGid || '0';

  if (!sheetId) {
    throw new Error('رابط Google Sheet غير صالح أو لم يتم العثور على المعرف');
  }

  // Strategy 1: Google Visualization API (GViz JSON)
  try {
    const gvizResult = await fetchViaGViz(sheetId, activeGid, sheetName);
    if (gvizResult.rows.length > 0 || gvizResult.columns.length > 0) {
      return {
        ...gvizResult,
        activeGid,
        activeSheetName: sheetName
      };
    }
  } catch (err: any) {
    console.warn('Strategy 1 (GViz) failed, trying Strategy 2 (CSV Export)...', err.message);
  }

  // Strategy 2: Direct CSV Export URL
  try {
    const csvResult = await fetchViaCSV(sheetId, activeGid);
    if (csvResult.rows.length > 0 || csvResult.columns.length > 0) {
      return {
        ...csvResult,
        activeGid,
        activeSheetName: sheetName
      };
    }
  } catch (err: any) {
    console.warn('Strategy 2 (CSV Export) failed, trying Strategy 3 (TSV Export)...', err.message);
  }

  // Strategy 3: TSV Export URL
  try {
    const tsvResult = await fetchViaTSV(sheetId, activeGid);
    if (tsvResult.rows.length > 0 || tsvResult.columns.length > 0) {
      return {
        ...tsvResult,
        activeGid,
        activeSheetName: sheetName
      };
    }
  } catch (err: any) {
    console.warn('Strategy 3 (TSV) failed:', err.message);
  }

  throw new Error(
    'تعذر قراءة بيانات الورقة تلقائياً. تأكد من أن الشيت عام (Anyone with the link can view).\nيمكنك أيضاً نسخ خلايا الورقة ولصقها مباشرة عبر خيار (لصق البيانات يدوياً).'
  );
}

/**
 * Strategy 1 Implementation: Google Visualization API
 */
async function fetchViaGViz(sheetId: string, gid: string, sheetName?: string): Promise<{
  columns: SheetColumn[];
  rows: SheetRowItem[];
  totalRows: number;
  sheetTitle?: string;
}> {
  let gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  if (sheetName) {
    gvizUrl += `&sheet=${encodeURIComponent(sheetName)}`;
  } else {
    gvizUrl += `&gid=${gid}`;
  }

  const response = await fetch(gvizUrl, {
    headers: { 'Accept': 'application/json, text/plain, */*' }
  });

  if (!response.ok) {
    throw new Error(`GViz error status: ${response.status}`);
  }

  const rawText = await response.text();

  if (rawText.includes('<!DOCTYPE html>') || rawText.includes('ServiceLogin') || rawText.includes('accounts.google.com')) {
    throw new Error('هذا الشيت مقفل أو يتطلب صلاحيات خاصة (يرجى جعله متاحاً لأي شخص لديه الرابط).');
  }

  const jsonMatch = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
  if (!jsonMatch || !jsonMatch[1]) {
    throw new Error('No GViz JSON envelope found');
  }

  const parsedData = JSON.parse(jsonMatch[1]);
  if (parsedData.status === 'error') {
    const errorReason = parsedData.errors?.[0]?.detailed_message || parsedData.errors?.[0]?.message || 'خطأ في استعلام الشيت';
    throw new Error(errorReason);
  }

  const table = parsedData.table;
  if (!table) {
    throw new Error('لا توجد بيانات داخل جدول الشيت');
  }

  const rawCols: any[] = table.cols || [];
  const rawRows: any[] = table.rows || [];

  // Determine if the first row contains actual headers (when table.cols[].label is empty)
  let firstRowIsHeader = false;
  const colLabelsFromCols = rawCols.map(c => (c.label && c.label.trim()) || '');
  const hasEmptyLabels = colLabelsFromCols.some(l => l === '');

  let headerRowCells: string[] = [];

  if (hasEmptyLabels && rawRows.length > 0) {
    // Check if row 0 contains text headers
    const row0Cells = (rawRows[0]?.c || []).map((cell: any) => {
      if (!cell) return '';
      return String(cell.f !== undefined ? cell.f : (cell.v !== undefined ? cell.v : '')).trim();
    });

    const nonEmpties = row0Cells.filter(Boolean);
    if (nonEmpties.length >= Math.max(1, rawCols.length / 2)) {
      firstRowIsHeader = true;
      headerRowCells = row0Cells;
    }
  }

  // 1. Build Columns
  const columns: SheetColumn[] = rawCols.map((c, idx) => {
    let colLabel = (c.label && c.label.trim()) || '';
    if (!colLabel && firstRowIsHeader && headerRowCells[idx]) {
      colLabel = headerRowCells[idx];
    }
    if (!colLabel) {
      colLabel = `العمود ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ''}`;
    }

    const lower = colLabel.toLowerCase();
    return {
      id: `col_${idx}`,
      label: colLabel,
      type: c.type || 'string',
      isTimestamp: lower.includes('timestamp') || lower.includes('طابع') || lower.includes('وقت') || lower.includes('تاريخ'),
      isFileLink: lower.includes('ملف') || lower.includes('file') || lower.includes('مستند') || lower.includes('cv') || lower.includes('drive'),
      isEmail: lower.includes('email') || lower.includes('بريد'),
      isPhone: lower.includes('phone') || lower.includes('هاتف') || lower.includes('جوال') || lower.includes('واتساب') || lower.includes('mobile'),
      isUrl: lower.includes('url') || lower.includes('link') || lower.includes('رابط')
    };
  });

  // 2. Build Rows (skip first row if it was used for headers)
  const rowsToProcess = firstRowIsHeader ? rawRows.slice(1) : rawRows;
  const rows: SheetRowItem[] = [];

  rowsToProcess.forEach((r, rIdx) => {
    const actualRowIndex = firstRowIsHeader ? rIdx + 2 : rIdx + 1;
    const rowItem: SheetRowItem = {
      _rowId: `row_${sheetId}_${gid}_${actualRowIndex}`,
      _rowIndex: actualRowIndex,
      _syncedAt: new Date().toISOString(),
      _hasFiles: false,
      _fileUrls: [],
      _systemStatus: 'unlinked'
    };

    const cells = r.c || [];
    let hasAnyData = false;

    columns.forEach((col, cIdx) => {
      const cell = cells[cIdx];
      let val: any = '';

      if (cell) {
        if (cell.f !== undefined && cell.f !== null) {
          val = cell.f;
        } else if (cell.v !== undefined && cell.v !== null) {
          if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
            val = cell.f || cell.v;
          } else {
            val = cell.v;
          }
        }
      }

      if (val !== '' && val !== null && val !== undefined) {
        hasAnyData = true;
      }

      rowItem[col.label] = val;
      rowItem[col.id] = val;
    });

    if (hasAnyData) {
      const extracted = extractFilesAndLinksFromRow(rowItem);
      const allFiles = [...extracted.driveLinks, ...extracted.otherLinks];
      rowItem._hasFiles = allFiles.length > 0;
      rowItem._fileUrls = allFiles;
      rows.push(rowItem);
    }
  });

  return {
    columns,
    rows,
    totalRows: rows.length,
    sheetTitle: parsedData.table?.reqId || 'Google Sheet'
  };
}

/**
 * Strategy 2 Implementation: CSV Export
 */
async function fetchViaCSV(sheetId: string, gid: string): Promise<{
  columns: SheetColumn[];
  rows: SheetRowItem[];
  totalRows: number;
}> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(`CSV Export failed (HTTP ${response.status})`);
  }

  const csvText = await response.text();
  if (csvText.includes('<!DOCTYPE html>') || csvText.includes('ServiceLogin')) {
    throw new Error('يتطلب تسجيل دخول Google.');
  }

  return parseRawTableText(csvText, sheetId, gid, ',');
}

/**
 * Strategy 3 Implementation: TSV Export
 */
async function fetchViaTSV(sheetId: string, gid: string): Promise<{
  columns: SheetColumn[];
  rows: SheetRowItem[];
  totalRows: number;
}> {
  const tsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv&gid=${gid}`;
  const response = await fetch(tsvUrl);

  if (!response.ok) {
    throw new Error(`TSV Export failed (HTTP ${response.status})`);
  }

  const tsvText = await response.text();
  if (tsvText.includes('<!DOCTYPE html>') || tsvText.includes('ServiceLogin')) {
    throw new Error('يتطلب تسجيل دخول Google.');
  }

  return parseRawTableText(tsvText, sheetId, gid, '\t');
}

/**
 * Helper to build columns and rows from raw CSV/TSV text
 */
export function parseRawTableText(text: string, sheetId: string = 'pasted', gid: string = '0', delimiter?: string): {
  columns: SheetColumn[];
  rows: SheetRowItem[];
  totalRows: number;
} {
  const rawRows = parseCSV(text, delimiter);
  if (rawRows.length === 0) {
    return { columns: [], rows: [], totalRows: 0 };
  }

  const headerRow = rawRows[0];
  const columns: SheetColumn[] = headerRow.map((header, idx) => {
    const label = header.trim() || `العمود ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ''}`;
    const lower = label.toLowerCase();
    return {
      id: `col_${idx}`,
      label,
      type: 'string',
      isTimestamp: lower.includes('timestamp') || lower.includes('طابع') || lower.includes('وقت') || lower.includes('تاريخ'),
      isFileLink: lower.includes('ملف') || lower.includes('file') || lower.includes('مستند') || lower.includes('cv') || lower.includes('drive'),
      isEmail: lower.includes('email') || lower.includes('بريد'),
      isPhone: lower.includes('phone') || lower.includes('هاتف') || lower.includes('جوال') || lower.includes('واتساب') || lower.includes('mobile'),
      isUrl: lower.includes('url') || lower.includes('link') || lower.includes('رابط')
    };
  });

  const dataRows = rawRows.slice(1);
  const rows: SheetRowItem[] = [];

  dataRows.forEach((r, rIdx) => {
    if (r.every(c => !c.trim())) return; // skip empty rows

    const rowItem: SheetRowItem = {
      _rowId: `row_${sheetId}_${gid}_${rIdx + 1}`,
      _rowIndex: rIdx + 1,
      _syncedAt: new Date().toISOString(),
      _hasFiles: false,
      _fileUrls: [],
      _systemStatus: 'unlinked'
    };

    columns.forEach((col, cIdx) => {
      const val = r[cIdx] !== undefined ? r[cIdx] : '';
      rowItem[col.label] = val;
      rowItem[col.id] = val;
    });

    const extracted = extractFilesAndLinksFromRow(rowItem);
    const allFiles = [...extracted.driveLinks, ...extracted.otherLinks];
    rowItem._hasFiles = allFiles.length > 0;
    rowItem._fileUrls = allFiles;

    rows.push(rowItem);
  });

  return {
    columns,
    rows,
    totalRows: rows.length
  };
}

/**
 * Local Storage Operations for Public Sheets
 */
export function getSavedPublicSheets(): SavedPublicSheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default starter sample sheet
      return [
        {
          id: 'sample_intake_sheet',
          title: 'استقبال بلاغات القضايا والأمان الرقمي (Google Forms)',
          description: 'شيت استجابات نموذج استقبال استشارات وبلاغات الحسابات والموكلين مع الروابط والمستندات',
          url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
          sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          gid: '0',
          activeTabName: 'استجابات النموذج 1',
          tabs: [
            { gid: '0', name: 'استجابات النموذج 1', isDefault: true, rowCount: 3 },
            { gid: '112233', name: 'قضايا قيد المتابعة', isDefault: false, rowCount: 0 },
            { gid: '445566', name: 'دليل الموكلين المسجلين', isDefault: false, rowCount: 0 }
          ],
          category: 'استقبال قضايا وبلاغات',
          tags: ['Google Forms', 'عملاء', 'قضايا', 'أوفلاين'],
          color: '#4F46E5',
          createdAt: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
          syncStatus: 'success',
          columns: [
            { id: 'col_0', label: 'الطابع الزمني', isTimestamp: true },
            { id: 'col_1', label: 'اسم صاحب البلاغ / العميل' },
            { id: 'col_2', label: 'رقم الواتساب / الهاتف', isPhone: true },
            { id: 'col_3', label: 'البريد الإلكتروني', isEmail: true },
            { id: 'col_4', label: 'نوع المشكلة أو القضية' },
            { id: 'col_5', label: 'المنصة المعنية' },
            { id: 'col_6', label: 'رابط الحساب أو المنشور المخالف', isUrl: true },
            { id: 'col_7', label: 'رابط ملفات الإثبات أو السكرين شوت (Drive)', isFileLink: true },
            { id: 'col_8', label: 'شرح وتفاصيل الحالة' },
            { id: 'col_9', label: 'درجة الاستعجال' }
          ],
          rows: [
            {
              _rowId: 'sample_row_1',
              _rowIndex: 1,
              _syncedAt: new Date().toISOString(),
              _hasFiles: true,
              _fileUrls: ['https://drive.google.com/file/d/1sampleDocIdProof/view'],
              _systemStatus: 'unlinked',
              'الطابع الزمني': '2026/08/25 10:30:15',
              'اسم صاحب البلاغ / العميل': 'خالد المنصوري (شركة الأفق للتقنية)',
              'رقم الواتساب / الهاتف': '+9647701234567',
              'البريد الإلكتروني': 'khaled@alofooq.iq',
              'نوع المشكلة أو القضية': 'انتحال حساب تجاري ونصب',
              'المنصة المعنية': 'Instagram',
              'رابط الحساب أو المنشور المخالف': 'https://instagram.com/fake_alofooq_official',
              'رابط ملفات الإثبات أو السكرين شوت (Drive)': 'https://drive.google.com/file/d/1sampleDocIdProof/view',
              'شرح وتفاصيل الحالة': 'تم فتح صفحة مزيفة بنفس الاسم التجاري والشعار واستخدامها لجمع بيانات العملاء',
              'درجة الاستعجال': 'عاجل جداً'
            },
            {
              _rowId: 'sample_row_2',
              _rowIndex: 2,
              _syncedAt: new Date().toISOString(),
              _hasFiles: true,
              _fileUrls: ['https://drive.google.com/file/d/2sampleContractPdf/view'],
              _systemStatus: 'unlinked',
              'الطابع الزمني': '2026/08/26 14:15:00',
              'اسم صاحب البلاغ / العميل': 'سارة عبد الرحمن',
              'رقم الواتساب / الهاتف': '+9647809876543',
              'البريد الإلكتروني': 'sara.abd@gmail.com',
              'نوع المشكلة أو القضية': 'اختراق حساب تليجرام واسترجاع',
              'المنصة المعنية': 'Telegram',
              'رابط الحساب أو المنشور المخالف': 'https://t.me/sara_security_case',
              'رابط ملفات الإثبات أو السكرين شوت (Drive)': 'https://drive.google.com/file/d/2sampleContractPdf/view',
              'شرح وتفاصيل الحالة': 'تم اختراق رقم التليجرام وطلب مبالغ مالية من جهات الاتصال',
              'درجة الاستعجال': 'متوسط'
            },
            {
              _rowId: 'sample_row_3',
              _rowIndex: 3,
              _syncedAt: new Date().toISOString(),
              _hasFiles: false,
              _fileUrls: [],
              _systemStatus: 'unlinked',
              'الطابع الزمني': '2026/08/27 09:00:22',
              'اسم صاحب البلاغ / العميل': 'الدكتور يوسف العبيدي',
              'رقم الواتساب / الهاتف': '+9647501122334',
              'البريد الإلكتروني': 'dr.yousif@gmail.com',
              'نوع المشكلة أو القضية': 'إزالة محتوى تشهير مسيء',
              'المنصة المعنية': 'Facebook',
              'رابط الحساب أو المنشور المخالف': 'https://facebook.com/post/987654321',
              'رابط ملفات الإثبات أو السكرين شوت (Drive)': '',
              'شرح وتفاصيل الحالة': 'منشور يحتوي على معلومات كاذبة وتشهير بالسمعة المهنية',
              'درجة الاستعجال': 'عادي'
            }
          ],
          totalRows: 3,
          pinned: true
        }
      ];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get saved sheets from localStorage:', e);
    return [];
  }
}

export function savePublicSheet(sheet: SavedPublicSheet): SavedPublicSheet[] {
  try {
    const list = getSavedPublicSheets();
    const idx = list.findIndex(s => s.id === sheet.id);
    if (idx >= 0) {
      list[idx] = sheet;
    } else {
      list.unshift(sheet);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Failed to save public sheet:', e);
    return [];
  }
}

export function deletePublicSheet(id: string): SavedPublicSheet[] {
  try {
    const list = getSavedPublicSheets().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Failed to delete public sheet:', e);
    return [];
  }
}
