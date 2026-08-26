import { 
  ExternalRequest, 
  ExternalRequestSource, 
  ExternalRequestStatus, 
  GoogleWorkspaceConfig, 
  SyncLogEntry,
  DriveAttachmentRef
} from '../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { logAuditAndEvent } from './audit';

// Helper: Remove undefined properties from an object before saving to Firestore
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date) && typeof (value as any)?.toDate !== 'function') {
      if (value.constructor && value.constructor.name === 'Object') {
        result[key] = cleanFirestoreData(value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Helper: Extract Google Spreadsheet ID from either raw ID or URL
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match standard /d/SPREADSHEET_ID/ pattern
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If input is already an ID without slashes
  if (!trimmed.includes('/') && trimmed.length > 15) {
    return trimmed;
  }
  return trimmed;
}

// Helper: Extract Google Form ID from URL or raw ID
export function extractFormId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/forms\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

// API Request Wrapper with Access Token
async function fetchGoogleApi<T>(
  url: string, 
  token: string, 
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error?.message) {
        errorDetail = errorJson.error.message;
      }
    } catch (_) {}

    if (response.status === 401) {
      throw new Error(`AUTH_EXPIRED: انتهت صلاحية التفويض (401). يرجى الضغط على "إعادة تفويض Google" لتحديث الرمز.`);
    }
    if (response.status === 403) {
      throw new Error(`PERMISSION_DENIED: لا تملك الصلاحية للوصول إلى هذا المورد في Google (403): ${errorDetail}`);
    }
    if (response.status === 404) {
      throw new Error(`NOT_FOUND: لم يتم العثور على الملف في Google (404): ${errorDetail}`);
    }
    throw new Error(`Google API Error: ${errorDetail}`);
  }

  return response.json() as Promise<T>;
}

// ==========================================
// 1. DISCOVERY & READ-ONLY WEBSITE SHEET API
// ==========================================

export interface DiscoveredSpreadsheet {
  spreadsheetId: string;
  title: string;
  sheets: string[];
  activeSheet: string;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}

export async function discoverWebsiteSpreadsheet(
  spreadsheetIdOrUrl: string, 
  token: string, 
  targetSheetName?: string
): Promise<DiscoveredSpreadsheet> {
  const sheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!sheetId) {
    throw new Error('يرجى إدخال معرّف أو رابط صالح لملف Google Sheets.');
  }

  // 1. Get spreadsheet metadata (Sheet names & title)
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties.title`;
  const meta = await fetchGoogleApi<{
    properties: { title: string };
    sheets: Array<{ properties: { title: string } }>;
  }>(metaUrl, token);

  const title = meta.properties?.title || 'Existing Website Sheet';
  const sheets = meta.sheets?.map(s => s.properties.title) || [];
  const activeSheet = targetSheetName && sheets.includes(targetSheetName) 
    ? targetSheetName 
    : (sheets[0] || 'Sheet1');

  // 2. Read headers and sample data from the active sheet (Read-only discovery)
  const range = encodeURIComponent(`'${activeSheet}'!A1:Z50`);
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
  
  let headers: string[] = [];
  let sampleRows: string[][] = [];
  let totalRows = 0;

  try {
    const valuesRes = await fetchGoogleApi<{ values?: string[][] }>(valuesUrl, token);
    const rows = valuesRes.values || [];
    if (rows.length > 0) {
      headers = rows[0].map(h => (h || '').toString().trim());
      sampleRows = rows.slice(1, 6);
      totalRows = rows.length - 1;
    }
  } catch (err: any) {
    console.warn('Failed to read sheet sample rows:', err);
  }

  return {
    spreadsheetId: sheetId,
    title,
    sheets,
    activeSheet,
    headers,
    sampleRows,
    totalRows
  };
}

// Read all data rows safely
export async function readAllWebsiteSheetRows(
  spreadsheetId: string, 
  sheetName: string, 
  token: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const range = encodeURIComponent(`'${sheetName}'!A1:ZZ5000`);
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
  
  const valuesRes = await fetchGoogleApi<{ values?: string[][] }>(valuesUrl, token);
  const allRows = valuesRes.values || [];
  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = allRows[0].map(h => (h || '').toString().trim());
  const rows = allRows.slice(1);
  return { headers, rows };
}

// Safe single cell update for two-way sync
export async function updateWebsiteSheetCell(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number, // 1-based data row index (row 2 in sheet = index 1)
  columnLetter: string,
  newValue: string,
  token: string
): Promise<void> {
  const sheetRow = rowIndex + 1; // account for header row
  const cellRange = encodeURIComponent(`'${sheetName}'!${columnLetter}${sheetRow}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cellRange}?valueInputOption=USER_ENTERED`;

  await fetchGoogleApi(url, token, {
    method: 'PUT',
    body: JSON.stringify({
      range: `'${sheetName}'!${columnLetter}${sheetRow}`,
      majorDimension: 'ROWS',
      values: [[newValue]]
    })
  });
}

// =======================================================
// 2. DEDICATED JB WORK EXTERNAL SPREADSHEET (4 REQUIRED SHEETS)
// =======================================================

export async function createJBWorkExternalSpreadsheet(
  token: string,
  title: string = 'JB Work — External Requests'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Form Responses',
          gridProperties: { rowCount: 1000, columnCount: 15 }
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Timestamp' } },
              { userEnteredValue: { stringValue: 'Full Name' } },
              { userEnteredValue: { stringValue: 'Phone / WhatsApp' } },
              { userEnteredValue: { stringValue: 'Email' } },
              { userEnteredValue: { stringValue: 'Request Type' } },
              { userEnteredValue: { stringValue: 'Platform' } },
              { userEnteredValue: { stringValue: 'Account URL' } },
              { userEnteredValue: { stringValue: 'Post / Content URL' } },
              { userEnteredValue: { stringValue: 'Description' } },
              { userEnteredValue: { stringValue: 'Notes' } },
              { userEnteredValue: { stringValue: 'Drive Attachments' } },
            ]
          }]
        }]
      },
      {
        properties: {
          title: 'Requests',
          gridProperties: { rowCount: 1000, columnCount: 16 }
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Request ID' } },
              { userEnteredValue: { stringValue: 'Source' } },
              { userEnteredValue: { stringValue: 'Created At' } },
              { userEnteredValue: { stringValue: 'Name' } },
              { userEnteredValue: { stringValue: 'Phone' } },
              { userEnteredValue: { stringValue: 'Email' } },
              { userEnteredValue: { stringValue: 'Request Type' } },
              { userEnteredValue: { stringValue: 'Platform' } },
              { userEnteredValue: { stringValue: 'Account URL' } },
              { userEnteredValue: { stringValue: 'Post URL' } },
              { userEnteredValue: { stringValue: 'Description' } },
              { userEnteredValue: { stringValue: 'Status' } },
              { userEnteredValue: { stringValue: 'JB Case Number' } },
              { userEnteredValue: { stringValue: 'Assigned To' } },
              { userEnteredValue: { stringValue: 'Processed At' } },
            ]
          }]
        }]
      },
      {
        properties: {
          title: 'Sync Log',
          gridProperties: { rowCount: 500, columnCount: 11 }
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Sync ID' } },
              { userEnteredValue: { stringValue: 'Source' } },
              { userEnteredValue: { stringValue: 'Started At' } },
              { userEnteredValue: { stringValue: 'Completed At' } },
              { userEnteredValue: { stringValue: 'Records Found' } },
              { userEnteredValue: { stringValue: 'Records Created' } },
              { userEnteredValue: { stringValue: 'Records Updated' } },
              { userEnteredValue: { stringValue: 'Records Skipped' } },
              { userEnteredValue: { stringValue: 'Errors' } },
              { userEnteredValue: { stringValue: 'Status' } },
            ]
          }]
        }]
      },
      {
        properties: {
          title: 'Configuration',
          gridProperties: { rowCount: 50, columnCount: 4 }
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Setting Key' } },
              { userEnteredValue: { stringValue: 'Setting Value' } },
              { userEnteredValue: { stringValue: 'Updated At' } },
            ]
          }]
        }]
      }
    ]
  };

  const res = await fetchGoogleApi<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  }>(url, token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    spreadsheetId: res.spreadsheetId,
    spreadsheetUrl: res.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/edit`
  };
}

// Append log entry to Sync Log sheet
export async function appendToSpreadsheetSyncLog(
  spreadsheetId: string,
  entry: SyncLogEntry,
  token: string
): Promise<void> {
  try {
    const range = encodeURIComponent(`'Sync Log'!A:J`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    await fetchGoogleApi(url, token, {
      method: 'POST',
      body: JSON.stringify({
        range: `'Sync Log'!A:J`,
        majorDimension: 'ROWS',
        values: [[
          entry.syncId,
          entry.source,
          entry.startedAt instanceof Date ? entry.startedAt.toISOString() : new Date().toISOString(),
          entry.completedAt instanceof Date ? entry.completedAt.toISOString() : new Date().toISOString(),
          entry.recordsFound,
          entry.recordsCreated,
          entry.recordsUpdated,
          entry.recordsSkipped,
          entry.errors.join('; ') || 'None',
          entry.status
        ]]
      })
    });
  } catch (err) {
    console.warn('Failed to append to spreadsheet sync log:', err);
  }
}

// =======================================================
// 3. DEDICATED JB WORK EXTERNAL GOOGLE FORM
// =======================================================

export async function createJBWorkExternalForm(
  token: string,
  title: string = 'JB Work — External Requests',
  caseTypesList?: string[]
): Promise<{ formId: string; formUrl: string; editUrl: string }> {
  // 1. Create Empty Form (Google API only allows info.title in create)
  const createUrl = 'https://forms.googleapis.com/v1/forms';
  const newForm = await fetchGoogleApi<{
    formId: string;
    responderUri: string;
  }>(createUrl, token, {
    method: 'POST',
    body: JSON.stringify({
      info: {
        title: title
      }
    })
  });

  const formId = newForm.formId;
  const formUrl = newForm.responderUri;
  const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;

  // 2. Populate Form Description and Questions via batchUpdate
  const typesOptions = caseTypesList && caseTypesList.length > 0 
    ? caseTypesList 
    : [
      'حساب منتحل (Impersonation)',
      'حذف منشور / محتوى (Content Removal)',
      'أمن معلومات (Infosec)',
      'قضية ابتزاز (Extortion)',
      'طلب اختبار اختراق (Penetration Test)',
      'استعادة حساب (Account Recovery)',
      'اختراق حساب (Hacked Account)',
      'انتحال شخصية (Identity Theft)',
      'إزالة محتوى (Takedown)',
      'حقوق ملكية فكرية (Copyright / IP)',
      'بلاغ منصة (Platform Report)',
      'استشارة أمنية (Security Advisory)',
      'مشكلة تقنية (Technical Issue)',
      'طلب عام (General Request)',
      'أخرى (Other)'
    ];

  const batchUrl = `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`;
  
  const requests: any[] = [
    // Update Form Description
    {
      updateFormInfo: {
        info: {
          description: 'النموذج الرسمي لاستقبال الطلبات والبلاغات والقضايا الخارجية إلى نظام عمل جعفر بدران (JB Work).'
        },
        updateMask: 'description'
      }
    },
    // Item 1: Full Name
    {
      createItem: {
        item: {
          title: 'الاسم الكامل / اسم الجهة',
          description: 'يرجى كتابة الاسم الشخصي أو اسم الشركة/الجهة صاحبة الطلب',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 0 }
      }
    },
    // Item 2: Phone / WhatsApp
    {
      createItem: {
        item: {
          title: 'رقم التواصل والواتساب',
          description: 'مع مفتاح الدولة (مثال: +961, +966, +971...)',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 1 }
      }
    },
    // Item 3: Email
    {
      createItem: {
        item: {
          title: 'البريد الإلكتروني',
          description: 'اختياري للتواصل وإرسال التحديثات',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 2 }
      }
    },
    // Item 4: Request Type (Choice)
    {
      createItem: {
        item: {
          title: 'نوع الطلب / القضية',
          description: 'حدد التصنيف الأنسب للطلب لتسريع المعالجة',
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'DROP_DOWN',
                options: typesOptions.map(t => ({ value: t }))
              }
            }
          }
        },
        location: { index: 3 }
      }
    },
    // Item 5: Platform (Choice)
    {
      createItem: {
        item: {
          title: 'المنصة المستهدفة أو المتأثرة',
          description: 'فيسبوك، إنستغرام، إكس، تيك توك، تيليجرام، واتساب، يوتيوب...',
          questionItem: {
            question: {
              required: false,
              choiceQuestion: {
                type: 'RADIO',
                options: [
                  { value: 'Instagram (إنستغرام)' },
                  { value: 'Facebook (فيسبوك)' },
                  { value: 'X / Twitter (إكس)' },
                  { value: 'TikTok (تيك توك)' },
                  { value: 'Telegram (تيليجرام)' },
                  { value: 'WhatsApp (واتساب)' },
                  { value: 'YouTube (يوتيوب)' },
                  { value: 'Snapchat (سناب شات)' },
                  { value: 'LinkedIn (لينكد إن)' },
                  { value: 'Google / Search (جوجل)' },
                  { value: 'موقع ويب / نظام خارجي' },
                  { value: 'أخرى (Other)' }
                ]
              }
            }
          }
        },
        location: { index: 4 }
      }
    },
    // Item 6: Account URL
    {
      createItem: {
        item: {
          title: 'رابط الحساب المتأثر أو المخالف',
          description: 'رابط الحساب الرسمي أو الحساب المنتحل أو المخالف',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 5 }
      }
    },
    // Item 7: Post URL
    {
      createItem: {
        item: {
          title: 'رابط المنشور أو المحتوى (إن وجد)',
          description: 'رابط الفيديو، الصورة، أو المنشور المراد التعامل معه',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: false }
            }
          }
        },
        location: { index: 6 }
      }
    },
    // Item 8: Description
    {
      createItem: {
        item: {
          title: 'تفاصيل المشكلة والطلب',
          description: 'اشرح ما حدث بدقة مع أي تواريخ أو سياق مهم',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: true }
            }
          }
        },
        location: { index: 7 }
      }
    },
    // Item 9: Case Images, Screenshots & Documents Upload
    {
      createItem: {
        item: {
          title: 'المستندات أو الصور أو لقطات الشاشة للقضية (Google Drive / روابط إثبات)',
          description: 'يرجى إرفاق روابط ملفات Google Drive، لقطات الشاشة، صور الإثبات، أو المستندات والوثائق الخاصة بالقضية',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: true }
            }
          }
        },
        location: { index: 8 }
      }
    },
    // Item 10: Notes
    {
      createItem: {
        item: {
          title: 'ملاحظات أو روابط إضافية',
          description: 'أي معلومات إضافية تود إرفاقها',
          questionItem: {
            question: {
              required: false,
              textQuestion: { paragraph: true }
            }
          }
        },
        location: { index: 9 }
      }
    }
  ];

  try {
    await fetchGoogleApi(batchUrl, token, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  } catch (e) {
    console.warn('Batch question creation warning:', e);
  }

  return { formId, formUrl, editUrl };
}

// Fetch Form Responses and Schema from Google Forms API
export async function fetchGoogleFormResponses(
  formId: string,
  token: string
): Promise<Array<{
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers: Record<string, { 
    questionId?: string;
    textAnswers?: { answers: Array<{ value: string }> };
    fileUploadAnswers?: { answers: Array<{ fileId: string; fileName?: string; mimeType?: string }> };
  }>;
}>> {
  const url = `https://forms.googleapis.com/v1/forms/${formId}/responses`;
  const data = await fetchGoogleApi<{
    responses?: Array<{
      responseId: string;
      createTime: string;
      lastSubmittedTime: string;
      answers: Record<string, { 
        questionId?: string;
        textAnswers?: { answers: Array<{ value: string }> };
        fileUploadAnswers?: { answers: Array<{ fileId: string; fileName?: string; mimeType?: string }> };
      }>;
    }>;
  }>(url, token);

  return data.responses || [];
}

// Fetch Form Metadata & Question Definitions
export async function fetchGoogleFormDetails(
  formId: string,
  token: string
): Promise<{
  formId: string;
  title: string;
  description?: string;
  questions: Array<{
    itemId: string;
    questionId: string;
    title: string;
    description?: string;
  }>;
}> {
  try {
    const url = `https://forms.googleapis.com/v1/forms/${formId}`;
    const data = await fetchGoogleApi<any>(url, token);
    const questions: Array<{
      itemId: string;
      questionId: string;
      title: string;
      description?: string;
    }> = [];

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        const q = item.questionItem?.question;
        if (q && q.questionId) {
          questions.push({
            itemId: item.itemId || '',
            questionId: q.questionId,
            title: item.title || '',
            description: item.description || ''
          });
        }
      });
    }

    return {
      formId: data.formId || formId,
      title: data.info?.title || 'JB Work Form',
      description: data.info?.description,
      questions
    };
  } catch (e) {
    console.warn('Failed to fetch Google Form details/schema, continuing with heuristic parsing:', e);
    return { formId, title: 'JB Work Form', questions: [] };
  }
}

// =======================================================
// 4. GOOGLE DRIVE DIRECTORY HIERARCHY & CASE FOLDERS
// =======================================================

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

// Create or find folder in Google Drive
export async function getOrCreateDriveFolder(
  folderName: string,
  parentId?: string,
  token?: string
): Promise<DriveFileItem> {
  if (!token) throw new Error('No Google token provided');

  let q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  } else {
    q += ` and 'root' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)`;
  const searchRes = await fetchGoogleApi<{ files?: DriveFileItem[] }>(searchUrl, token);

  if (searchRes.files && searchRes.files.length > 0) {
    return searchRes.files[0];
  }

  // Create folder
  const createUrl = 'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink';
  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    body.parents = [parentId];
  }

  return await fetchGoogleApi<DriveFileItem>(createUrl, token, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// Setup standard JB Work Drive hierarchy
export async function setupJBWorkDriveHierarchy(token: string): Promise<{
  rootFolderId: string;
  rootFolderName: string;
  externalRequestsFolderId: string;
  casesFolderId: string;
  casesCurrentYearFolderId: string;
  reportsFolderId: string;
  archiveFolderId: string;
}> {
  const currentYear = String(new Date().getFullYear());

  // 1. Root: JB Work
  const root = await getOrCreateDriveFolder('JB Work', undefined, token);
  
  // 2. External Requests
  const extReq = await getOrCreateDriveFolder('External Requests', root.id, token);
  
  // 3. Cases
  const cases = await getOrCreateDriveFolder('Cases', root.id, token);
  
  // 4. Cases / 2026
  const casesYear = await getOrCreateDriveFolder(currentYear, cases.id, token);

  // 5. Reports
  const reports = await getOrCreateDriveFolder('Reports', root.id, token);

  // 6. Archive
  const archive = await getOrCreateDriveFolder('Archive', root.id, token);

  return {
    rootFolderId: root.id,
    rootFolderName: root.name,
    externalRequestsFolderId: extReq.id,
    casesFolderId: cases.id,
    casesCurrentYearFolderId: casesYear.id,
    reportsFolderId: reports.id,
    archiveFolderId: archive.id,
  };
}

// Create dedicated Case Folder in Google Drive
export async function createCaseDriveFolder(
  caseNumber: string,
  yearFolderId: string,
  token: string
): Promise<{ caseFolderId: string; attachmentsFolderId: string; folderUrl: string }> {
  // Case folder: e.g. JB-2026-000142
  const caseFolder = await getOrCreateDriveFolder(caseNumber, yearFolderId, token);
  
  // Subfolder: Attachments
  const attachFolder = await getOrCreateDriveFolder('Attachments', caseFolder.id, token);

  return {
    caseFolderId: caseFolder.id,
    attachmentsFolderId: attachFolder.id,
    folderUrl: caseFolder.webViewLink || `https://drive.google.com/drive/folders/${caseFolder.id}`
  };
}

// =======================================================
// 5. SMART PARSING, URL EXTRACTION & AUTO-SUGGESTION
// =======================================================

export function suggestCaseType(text: string, title?: string): string {
  const combined = `${title || ''} ${text || ''}`.toLowerCase();

  if (combined.includes('منتحل') || combined.includes('انتحال') || combined.includes('مزيف') || combined.includes('impersonat') || combined.includes('fake account')) {
    return 'impersonation';
  }
  if (combined.includes('ابتزاز') || combined.includes('تهديد') || combined.includes('extort') || combined.includes('blackmail') || combined.includes('تهديد بالصور')) {
    return 'extortion';
  }
  if (combined.includes('حذف منشور') || combined.includes('إزالة محتوى') || combined.includes('ازالة') || combined.includes('takedown') || combined.includes('removal') || combined.includes('حذف فيديو') || combined.includes('حذف صورة')) {
    return 'content_removal';
  }
  if (combined.includes('اختبار اختراق') || combined.includes('pentest') || combined.includes('penetration') || combined.includes('فحص أمني')) {
    return 'infosec';
  }
  if (combined.includes('استعادة حساب') || combined.includes('اختراق حساب') || combined.includes('مهكر') || combined.includes('hack') || combined.includes('recovery') || combined.includes('مسروق')) {
    return 'impersonation'; // or generic account security
  }
  if (combined.includes('حقوق') || combined.includes('ملكية فكرية') || combined.includes('copyright') || combined.includes('dmca')) {
    return 'content_removal';
  }
  if (combined.includes('ثغرة') || combined.includes('تسريب') || combined.includes('أمن معلومات') || combined.includes('security') || combined.includes('leak')) {
    return 'infosec';
  }
  return 'general';
}

export function detectPlatform(text: string, url?: string): string {
  const combined = `${url || ''} ${text || ''}`.toLowerCase();
  if (combined.includes('instagram.com') || combined.includes('إنستغرام') || combined.includes('انستغرام') || combined.includes('instagram')) return 'Instagram';
  if (combined.includes('facebook.com') || combined.includes('فيسبوك') || combined.includes('فيس بوك') || combined.includes('fb.com')) return 'Facebook';
  if (combined.includes('twitter.com') || combined.includes('x.com') || combined.includes('إكس') || combined.includes('تويتر')) return 'X';
  if (combined.includes('tiktok.com') || combined.includes('تيك توك') || combined.includes('تيكتوك')) return 'TikTok';
  if (combined.includes('telegram') || combined.includes('t.me') || combined.includes('تيليجرام') || combined.includes('تلغرام')) return 'Telegram';
  if (combined.includes('whatsapp') || combined.includes('واتساب') || combined.includes('wa.me')) return 'WhatsApp';
  if (combined.includes('youtube.com') || combined.includes('youtu.be') || combined.includes('يوتيوب')) return 'YouTube';
  if (combined.includes('snapchat.com') || combined.includes('سناب شات') || combined.includes('سناب')) return 'Snapchat';
  if (combined.includes('linkedin.com') || combined.includes('لينكد إن')) return 'LinkedIn';
  return 'Other';
}

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s\)\],]+)/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map(u => u.trim())));
}

// =======================================================
// 6. SYNCHRONIZATION ENGINE & ORCHESTRATOR
// =======================================================

export async function runFullGoogleSync(
  config: GoogleWorkspaceConfig,
  token: string,
  userProfile: { uid: string; displayName?: string; name?: string; email?: string; role?: string }
): Promise<SyncLogEntry> {
  const syncId = `SYNC-${Date.now()}`;
  const startTime = new Date();
  const errors: string[] = [];

  let recordsFound = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;

  // 1. Sync from Dedicated Google Form (with schema and file attachments)
  if (config.externalFormId) {
    try {
      // Fetch both responses and form schema
      const [responses, formDetails] = await Promise.all([
        fetchGoogleFormResponses(config.externalFormId, token),
        fetchGoogleFormDetails(config.externalFormId, token)
      ]);

      recordsFound += responses.length;

      // Build questionId to question mapping
      const qMap = new Map<string, { title: string; description?: string }>();
      if (formDetails?.questions) {
        formDetails.questions.forEach(q => {
          if (q.questionId) {
            qMap.set(q.questionId, { title: q.title.toLowerCase().trim(), description: q.description });
          }
        });
      }

      for (const resp of responses) {
        const respId = resp.responseId;
        const sourceId = `form_${respId}`;

        // Check if request already exists in Firestore
        const q = query(
          collection(db, 'externalRequests'), 
          where('sourceId', '==', sourceId)
        );
        const existingSnap = await getDocs(q);

        if (!existingSnap.empty) {
          recordsSkipped++;
          continue;
        }

        // Parse answers from Form Response
        const answers = resp.answers || {};
        let name = '';
        let phone = '';
        let email = '';
        let requestType = 'طلب عام';
        let platform = '';
        let accountUrl = '';
        let postUrl = '';
        let description = '';
        let notes = '';
        const driveAttachments: DriveAttachmentRef[] = [];

        // 1. First parse by matching Question Titles if schema is present
        Object.entries(answers).forEach(([questionId, ansObj]) => {
          const qInfo = qMap.get(questionId);
          const qTitle = qInfo?.title || '';
          
          // Extract text value
          const textVal = ansObj.textAnswers?.answers && ansObj.textAnswers.answers.length > 0 
            ? (ansObj.textAnswers.answers[0].value || '').trim()
            : '';

          // Extract file upload answers from Google Form
          if (ansObj.fileUploadAnswers?.answers && ansObj.fileUploadAnswers.answers.length > 0) {
            ansObj.fileUploadAnswers.answers.forEach(fa => {
              if (fa.fileId) {
                const isImg = (fa.mimeType || '').startsWith('image/') || (fa.fileName || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
                driveAttachments.push({
                  fileId: fa.fileId,
                  fileName: fa.fileName || 'مستند / صورة مرفقة من النموذج',
                  fileType: fa.mimeType || (isImg ? 'image/jpeg' : 'application/octet-stream'),
                  url: `https://drive.google.com/file/d/${fa.fileId}/view`,
                  thumbnailUrl: `https://drive.google.com/thumbnail?id=${fa.fileId}&sz=w800`,
                  isImage: !!isImg
                });
              }
            });
          }

          if (!textVal) return;

          // Check for URLs or Drive links inside any answer
          const foundUrls = extractUrls(textVal);
          foundUrls.forEach(url => {
            if (url.includes('drive.google.com/file/d/') || url.includes('drive.google.com/open?id=') || url.includes('drive.google.com/thumbnail')) {
              const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
              const fId = fileIdMatch ? fileIdMatch[1] : '';
              if (fId && !driveAttachments.some(a => a.fileId === fId)) {
                driveAttachments.push({
                  fileId: fId,
                  fileName: 'صورة / مستند Drive مرفق',
                  fileType: 'image/jpeg',
                  url: `https://drive.google.com/file/d/${fId}/view`,
                  thumbnailUrl: `https://drive.google.com/thumbnail?id=${fId}&sz=w800`,
                  isImage: true
                });
              }
            } else if (url.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i)) {
              driveAttachments.push({
                fileId: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                fileName: 'صورة إثبات مرفقة',
                fileType: 'image/jpeg',
                url: url,
                thumbnailUrl: url,
                isImage: true
              });
            }
          });

          if (qTitle.includes('اسم') || qTitle.includes('name') || qTitle.includes('جهة') || qTitle.includes('عميل')) {
            name = textVal;
          } else if (qTitle.includes('هاتف') || qTitle.includes('واتساب') || qTitle.includes('phone') || qTitle.includes('تواصل')) {
            phone = textVal;
          } else if (qTitle.includes('بريد') || qTitle.includes('email') || qTitle.includes('إيميل')) {
            email = textVal;
          } else if (qTitle.includes('نوع') || qTitle.includes('قضية') || qTitle.includes('type') || qTitle.includes('تصنيف')) {
            requestType = textVal;
          } else if (qTitle.includes('منصة') || qTitle.includes('platform')) {
            platform = textVal;
          } else if (qTitle.includes('حساب') || qTitle.includes('account')) {
            accountUrl = textVal;
          } else if (qTitle.includes('منشور') || qTitle.includes('محتوى') || qTitle.includes('post')) {
            postUrl = textVal;
          } else if (qTitle.includes('تفاصيل') || qTitle.includes('وصف') || qTitle.includes('مشكلة') || qTitle.includes('description')) {
            description = textVal;
          } else if (qTitle.includes('ملاحظات') || qTitle.includes('notes') || qTitle.includes('روابط') || qTitle.includes('مستندات') || qTitle.includes('صور')) {
            notes = notes ? `${notes}\n${textVal}` : textVal;
          }
        });

        // Fallback: If title matching was partial, extract answers sequentially
        if (!name || !description) {
          const answerValues: string[] = [];
          Object.values(answers).forEach(ans => {
            if (ans.textAnswers?.answers && ans.textAnswers.answers.length > 0) {
              const val = (ans.textAnswers.answers[0].value || '').trim();
              if (val) answerValues.push(val);
            }
          });

          if (!name && answerValues.length > 0) name = answerValues[0];
          if (!phone && answerValues.length > 1) phone = answerValues[1];
          if (!email && answerValues.length > 2 && answerValues[2].includes('@')) email = answerValues[2];
          if (!description && answerValues.length > 7) description = answerValues[7];
          else if (!description && answerValues.length > 3) description = answerValues[answerValues.length - 1];
        }

        const reqIndexStr = String(recordsCreated + 1).padStart(5, '0');
        const requestId = `EXT-${new Date().getFullYear()}-${reqIndexStr}`;
        const suggestedType = suggestCaseType(`${requestType} ${description}`);
        const detectedPlat = platform ? detectPlatform(platform) : detectPlatform(description, accountUrl || postUrl);

        const newExtReq: Record<string, any> = {
          requestId,
          source: 'google_form',
          sourceLabel: 'Google Form (JB Work)',
          sourceId,
          clientName: name || 'صاحب طلب خارجي',
          phone: phone || '',
          email: email || '',
          requestType: requestType || 'طلب عام',
          suggestedCaseType: suggestedType,
          platform: detectedPlat,
          accountUrl: accountUrl || '',
          postUrl: postUrl || '',
          description: description || '',
          notes: notes || '',
          status: 'new',
          driveAttachments: driveAttachments,
          rawPayload: { formResponseId: respId, submittedAt: resp.lastSubmittedTime || resp.createTime || '' },
          createdAt: serverTimestamp(),
          receivedAt: resp.lastSubmittedTime ? new Date(resp.lastSubmittedTime) : new Date(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'externalRequests'), cleanFirestoreData(newExtReq));
        recordsCreated++;
      }
    } catch (formErr: any) {
      console.error('Error syncing Google Form responses:', formErr);
      errors.push(`Google Form: ${formErr.message || formErr}`);
    }
  }

  // 2. Sync from Existing Website Sheet (Strict JB-CASE Filter & Full Columns Sync)
  const targetSpreadsheetId = config.websiteSpreadsheetId || '1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ';
  if (targetSpreadsheetId) {
    try {
      // STRICT USER REQUIREMENT: Only sync from the 'cases' sheet to avoid mixing requests
      let sheetsToSync: string[] = [];
      if (config.websiteSheetName && config.websiteSheetName.toLowerCase() === 'cases') {
        sheetsToSync = [config.websiteSheetName];
      } else {
        // Query spreadsheet metadata to find the 'cases' sheet
        try {
          const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}?fields=sheets.properties.title`;
          const metaRes = await fetchGoogleApi<{ sheets?: Array<{ properties: { title: string } }> }>(metaUrl, token);
          const allTitles = (metaRes.sheets || []).map(s => s.properties.title);
          const foundCasesSheet = allTitles.find(t => t.toLowerCase() === 'cases' || t.toLowerCase().includes('case'));
          if (foundCasesSheet) {
            sheetsToSync = [foundCasesSheet];
          } else {
            sheetsToSync = allTitles.length > 0 ? [allTitles[0]] : ['cases'];
          }
        } catch (mErr) {
          console.warn('Metadata discovery error, using cases sheet name:', mErr);
          sheetsToSync = ['cases'];
        }
      }

      for (const sheetName of sheetsToSync) {
        try {
          const { headers, rows } = await readAllWebsiteSheetRows(
            targetSpreadsheetId,
            sheetName,
            token
          );

          if (!rows || rows.length === 0) continue;
          recordsFound += rows.length;

          // Find header column indices with intelligent heuristic matching
          const mapping = config.websiteFieldMapping || {};
          const findIndex = (jbKey: string, synonyms: string[]): number => {
            if (mapping[jbKey]) {
              const explicitIdx = headers.indexOf(mapping[jbKey]);
              if (explicitIdx >= 0) return explicitIdx;
            }
            return headers.findIndex(h => {
              const cleanH = (h || '').toLowerCase().trim();
              return synonyms.some(s => cleanH.includes(s.toLowerCase()));
            });
          };

          const nameIdx = findIndex('clientName', ['اسم', 'name', 'العميل', 'صاحب', 'جهة', 'client']);
          const phoneIdx = findIndex('phone', ['هاتف', 'phone', 'واتساب', 'whatsapp', 'موبايل', 'رقم', 'جوال', 'تواصل']);
          const emailIdx = findIndex('email', ['بريد', 'email', 'ايميل', 'mail']);
          const typeIdx = findIndex('requestType', ['نوع', 'type', 'الطلب', 'category', 'خدمة', 'الموضوع']);
          const platformIdx = findIndex('platform', ['منصة', 'platform', 'الموقع', 'social']);
          const accUrlIdx = findIndex('accountUrl', ['رابط الحساب', 'account', 'profile', 'حساب', 'url']);
          const postUrlIdx = findIndex('postUrl', ['منشور', 'post', 'رابط المنشور', 'محتوى']);
          const descIdx = findIndex('description', ['وصف', 'تفاصيل', 'مشكلة', 'description', 'message', 'رسالة', 'الطلب']);
          const notesIdx = findIndex('notes', ['ملاحظات', 'notes', 'تعليق']);
          const statusIdx = findIndex('status', ['حالة', 'status', 'الوضع']);
          const caseNumIdx = findIndex('caseNumber', ['قضية', 'case', 'رقم القضية', 'كود', 'code', 'معرف', 'id']);

          const isCasesSheet = sheetName.toLowerCase().includes('case') || sheetName.includes('قض');

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || row.every(c => !c || c.trim() === '')) {
              continue; // skip empty rows
            }

            // STRICT USER DIRECTIVE: ONLY pull and sync rows that start with JB-CASE
            // Check caseNumIdx first, or search across all cells in this row
            let matchedJbCaseCell = '';
            if (caseNumIdx >= 0 && (row[caseNumIdx] || '').trim().toUpperCase().startsWith('JB-CASE')) {
              matchedJbCaseCell = (row[caseNumIdx] || '').trim();
            } else {
              const cellWithJb = row.find(c => (c || '').trim().toUpperCase().startsWith('JB-CASE'));
              if (cellWithJb) {
                matchedJbCaseCell = cellWithJb.trim();
              }
            }

            // If no cell starts with JB-CASE, skip this row strictly
            if (!matchedJbCaseCell) {
              recordsSkipped++;
              continue;
            }

            const caseIdentifier = matchedJbCaseCell;
            const sourceId = `site_${targetSpreadsheetId}_${sheetName}_${caseIdentifier}`;

            // Build full column data map so no column is lost
            const allColumnsMap: Record<string, string> = {};
            headers.forEach((h, hIdx) => {
              const colName = h && h.trim() ? h.trim() : `Column_${hIdx + 1}`;
              allColumnsMap[colName] = (row[hIdx] || '').trim();
            });

            const name = nameIdx >= 0 ? (row[nameIdx] || '').trim() : '';
            const phone = phoneIdx >= 0 ? (row[phoneIdx] || '').trim() : '';
            const email = emailIdx >= 0 ? (row[emailIdx] || '').trim() : '';
            const reqType = typeIdx >= 0 ? (row[typeIdx] || '').trim() : 'قضية من الموقع';
            const plat = platformIdx >= 0 ? (row[platformIdx] || '').trim() : '';
            const accUrl = accUrlIdx >= 0 ? (row[accUrlIdx] || '').trim() : '';
            const postUrl = postUrlIdx >= 0 ? (row[postUrlIdx] || '').trim() : '';
            const desc = descIdx >= 0 ? (row[descIdx] || '').trim() : '';
            const note = notesIdx >= 0 ? (row[notesIdx] || '').trim() : '';
            const siteStatus = statusIdx >= 0 ? (row[statusIdx] || '').trim() : '';

            // Extract any Drive files, images, or document URLs in any column of the row
            const rowText = row.join(' ');
            const rowUrls = extractUrls(rowText);
            const driveAttachments: DriveAttachmentRef[] = [];
            rowUrls.forEach(url => {
              if (url.includes('drive.google.com')) {
                const fMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
                const fileId = fMatch ? fMatch[1] : 'drive_ref';
                driveAttachments.push({
                  fileId,
                  fileName: 'مستند / صورة من الموقع',
                  fileType: 'image/jpeg',
                  url: url,
                  thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
                  isImage: true
                });
              } else if (url.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i)) {
                driveAttachments.push({
                  fileId: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  fileName: 'صورة مرفقة من الموقع',
                  fileType: 'image/jpeg',
                  url: url,
                  thumbnailUrl: url,
                  isImage: true
                });
              }
            });

            const suggestedType = suggestCaseType(`${reqType} ${desc}`);
            const detectedPlat = plat ? detectPlatform(plat) : detectPlatform(desc, accUrl || postUrl);

            const extReqData: Record<string, any> = {
              requestId: caseIdentifier,
              linkedCaseNumber: caseIdentifier,
              source: 'website_sheet',
              sourceLabel: isCasesSheet ? `الموقع — ورقة القضايا (${sheetName})` : `الموقع — ورقة (${sheetName})`,
              sourceId,
              sheetRowIndex: i + 2,
              clientName: name || 'عميل قضية الموقع',
              phone: phone || '',
              email: email || '',
              requestType: reqType || 'قضية موقع',
              suggestedCaseType: suggestedType,
              platform: detectedPlat,
              accountUrl: accUrl || '',
              postUrl: postUrl || '',
              description: desc || `بيانات القضية المستوردة بالكامل من ورقة ${sheetName}`,
              notes: note || '',
              status: 'linked_to_case',
              driveAttachments: driveAttachments,
              rawPayload: { 
                allColumns: allColumnsMap, 
                rowData: row, 
                sheetName, 
                sheetRow: i + 2, 
                siteStatus: siteStatus || '',
                caseNumber: caseIdentifier
              },
              receivedAt: new Date(),
              updatedAt: serverTimestamp()
            };

            // Deduplication & safe upsert check
            const q = query(
              collection(db, 'externalRequests'), 
              where('sourceId', '==', sourceId)
            );
            const existingSnap = await getDocs(q);

            if (!existingSnap.empty) {
              // Update existing document with fresh columns
              const existingDoc = existingSnap.docs[0];
              await updateDoc(doc(db, 'externalRequests', existingDoc.id), cleanFirestoreData(extReqData));
              recordsUpdated++;
            } else {
              extReqData.createdAt = serverTimestamp();
              await addDoc(collection(db, 'externalRequests'), cleanFirestoreData(extReqData));
              recordsCreated++;
            }
          }
        } catch (sErr: any) {
          console.warn(`Error reading sheet ${sheetName}:`, sErr);
          errors.push(`Sheet [${sheetName}]: ${sErr.message || sErr}`);
        }
      }
    } catch (sheetErr: any) {
      console.error('Error syncing Website sheet rows:', sheetErr);
      errors.push(`Website Sheet: ${sheetErr.message || sheetErr}`);
    }
  }

  const endTime = new Date();
  const durationMs = Math.max(1, endTime.getTime() - startTime.getTime());
  const status: SyncLogEntry['status'] = errors.length > 0 && recordsCreated === 0 && recordsFound === 0
    ? 'error' 
    : errors.length > 0 
      ? 'warning' 
      : 'success';

  const logEntry: SyncLogEntry = {
    id: syncId,
    syncId,
    source: 'all',
    startedAt: startTime,
    completedAt: endTime,
    durationMs,
    recordsFound,
    recordsCreated,
    recordsUpdated,
    recordsSkipped,
    errors,
    status,
    triggeredBy: {
      uid: userProfile.uid,
      name: userProfile.displayName || userProfile.name || 'المشرف العام'
    }
  };

  // 1. Save log in Firestore
  try {
    await setDoc(doc(db, 'googleSyncLogs', syncId), cleanFirestoreData({
      ...logEntry,
      startedAt: serverTimestamp(),
      completedAt: serverTimestamp()
    }));
  } catch (e) {
    console.warn('Failed to save sync log to Firestore:', e);
  }

  // 2. Append to Dedicated Google Spreadsheet (Sync Log sheet)
  if (config.externalSpreadsheetId) {
    await appendToSpreadsheetSyncLog(config.externalSpreadsheetId, logEntry, token);
  }

  // 3. Update Last Sync Time in Google Integrations config doc
  try {
    await updateDoc(doc(db, 'googleIntegrations', 'config'), cleanFirestoreData({
      lastSyncTime: endTime.toISOString(),
      updatedAt: serverTimestamp()
    }));
  } catch (e) {
    console.warn('Failed to update last sync time in config:', e);
  }

  // 4. Log Audit
  await logAuditAndEvent({
    action: 'GOOGLE_SYNC_COMPLETED',
    details: `اكتمال مزامنة Google Workspace: جلب ${recordsFound}، إضافة ${recordsCreated}، تخطي ${recordsSkipped} مكرر`,
    entityType: 'google_sync',
    entityId: syncId,
    user: {
      uid: userProfile.uid,
      displayName: userProfile.displayName || userProfile.name || 'المشرف العام',
      email: userProfile.email || '',
      role: userProfile.role || 'super_admin'
    }
  });

  return logEntry;
}
