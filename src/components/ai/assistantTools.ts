import { UserProfile, CaseItem, ExternalRequest } from '../../types';
import { getLocalCases, saveLocalCase, getLocalUsers, getLocalAttachments, getNextSequentialCaseNumber } from '../../lib/offlineStore';
import { getSavedPublicSheets } from '../../lib/googleSheetsReader';
import { detectDuplicateCase } from '../../lib/duplicateDetector';
import { hasPermission } from '../../lib/permissionGuard';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export interface AssistantToolContext {
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export interface AssistantCommandResult {
  handled: boolean;
  replyAr: string;
  replyEn: string;
  data?: any;
  actionTaken?: string;
  category?: string;
}

/**
 * 1. Search Cases in Local Store & Firestore
 */
export function toolSearchCases(queryString: string, statusFilter?: string): CaseItem[] {
  const allCases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  const q = queryString.trim().toLowerCase();
  
  return allCases.filter(c => {
    if (statusFilter && statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    if (!q) return true;
    const titleMatch = (c.title || '').toLowerCase().includes(q);
    const numMatch = (c.caseNumber || '').toLowerCase().includes(q);
    const clientMatch = (c.client?.name || '').toLowerCase().includes(q);
    const phoneMatch = (c.client?.phone || '').includes(q) || (c.client?.whatsapp || '').includes(q);
    const typeMatch = (c.caseType || '').toLowerCase().includes(q);
    const platMatch = (c.platform || '').toLowerCase().includes(q);
    const descMatch = (c.description || '').toLowerCase().includes(q);
    return titleMatch || numMatch || clientMatch || phoneMatch || typeMatch || platMatch || descMatch;
  });
}

/**
 * 2. Search External Requests
 */
export function toolSearchExternalRequests(queryString?: string): any[] {
  const results: any[] = [];
  const sheets = getSavedPublicSheets();
  const q = (queryString || '').trim().toLowerCase();

  sheets.forEach(sheet => {
    (sheet.rows || []).forEach(row => {
      let matches = false;
      if (!q) {
        matches = true;
      } else {
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes(q)) matches = true;
      }
      if (matches) {
        results.push({
          sheetTitle: sheet.title,
          activeTab: sheet.activeTabName || 'الرئيسية',
          row
        });
      }
    });
  });

  return results;
}

/**
 * 3. Get Case Details
 */
export function toolGetCase(identifier: string): CaseItem | null {
  const allCases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  const clean = identifier.trim().toLowerCase();
  return allCases.find(c => 
    c.id.toLowerCase() === clean || 
    (c.caseNumber && c.caseNumber.toLowerCase() === clean) ||
    (c.externalCaseNumber && c.externalCaseNumber.toLowerCase() === clean)
  ) || null;
}

/**
 * 4. Create Case
 */
export function toolCreateCase(
  params: {
    title: string;
    caseType?: string;
    platform?: string;
    clientName?: string;
    clientPhone?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    description?: string;
  },
  userProfile: UserProfile | null
): { success: boolean; caseItem?: CaseItem; errorAr?: string } {
  if (!userProfile) {
    return { success: false, errorAr: 'غير مصرح: يجب تسجيل الدخول لإنشاء قضية.' };
  }

  const caseNumber = getNextSequentialCaseNumber();
  const now = new Date().toISOString();

  const newCase: CaseItem = {
    id: `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    caseNumber,
    title: params.title.trim(),
    description: params.description || '',
    caseType: (params.caseType as any) || 'impersonation',
    platform: (params.platform as any) || 'Instagram',
    priority: params.priority || 'medium',
    status: 'new',
    client: {
      id: `cli_${Date.now()}`,
      name: params.clientName || 'صاحب البلاغ',
      phone: params.clientPhone || '',
      email: '',
      whatsapp: params.clientPhone || ''
    },
    createdBy: {
      uid: userProfile.uid,
      name: userProfile.displayName || 'المشرف'
    },
    assignedTo: {
      uid: userProfile.uid,
      name: userProfile.displayName || 'المشرف',
      email: userProfile.email || 'jfrbdran@gmail.com'
    },
    createdAt: now,
    updatedAt: now,
    isDeleted: false
  };

  saveLocalCase(newCase);
  return { success: true, caseItem: newCase };
}

/**
 * 5. Search Tasks
 */
export function toolSearchTasks(queryText?: string, status?: string): any[] {
  const results: any[] = [];
  const taskKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_tasks_') || k === 'jb_global_tasks');
  
  taskKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const list = JSON.parse(raw);
        list.forEach((t: any) => {
          if (!t.isDeleted && !t._deleted) {
            if (status && t.status !== status) return;
            if (queryText && !t.title?.toLowerCase().includes(queryText.toLowerCase())) return;
            results.push(t);
          }
        });
      }
    } catch (_) {}
  });

  return results;
}

/**
 * 6. Create Task
 */
export function toolCreateTask(
  params: {
    title: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    caseId?: string;
  },
  userProfile: UserProfile | null
): any {
  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: params.title.trim(),
    priority: params.priority || 'medium',
    status: 'pending',
    dueDate: params.dueDate || new Date().toISOString().split('T')[0],
    caseId: params.caseId || 'global',
    createdAt: new Date().toISOString(),
    createdBy: userProfile?.displayName || 'المشرف',
    isDeleted: false
  };

  const key = params.caseId ? `jb_tasks_${params.caseId}` : 'jb_global_tasks';
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(newTask);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (_) {}

  return newTask;
}

/**
 * 7. System Comprehensive Summary
 */
export function toolGetSystemSummary(): {
  totalCases: number;
  openCases: number;
  inProgressCases: number;
  closedCases: number;
  urgentCases: number;
  externalSheetsCount: number;
  externalRowsCount: number;
  pendingTasks: number;
  teamCount: number;
} {
  const cases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  const openCases = cases.filter(c => c.status === 'new').length;
  const inProgressCases = cases.filter(c => c.status === 'in_progress' || c.status === 'pending').length;
  const closedCases = cases.filter(c => c.status === 'completed' || (c.status as string) === 'closed' || (c.status as string) === 'resolved').length;
  const urgentCases = cases.filter(c => (c.priority === 'urgent' || c.priority === 'high') && c.status !== 'completed' && (c.status as string) !== 'closed').length;

  const sheets = getSavedPublicSheets();
  let externalRowsCount = 0;
  sheets.forEach(s => {
    externalRowsCount += (s.rows || []).length;
  });

  const tasks = toolSearchTasks();
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const users = getLocalUsers().filter(u => u.status !== 'deleted' && !u.isDeleted && !u._deleted);

  return {
    totalCases: cases.length,
    openCases,
    inProgressCases,
    closedCases,
    urgentCases,
    externalSheetsCount: sheets.length,
    externalRowsCount,
    pendingTasks,
    teamCount: users.length
  };
}

/**
 * 8. Financial Summary (Restricted to Super Admin)
 */
export function toolGetFinancialSummary(userProfile: UserProfile | null): {
  allowed: boolean;
  totalRevenueUSD?: number;
  totalRevenueSYP?: number;
  pendingDuesUSD?: number;
  pendingDuesSYP?: number;
  messageAr: string;
} {
  const isSuperAdmin = userProfile?.role === 'super_admin';
  if (!isSuperAdmin) {
    return {
      allowed: false,
      messageAr: 'عذراً، الوصول إلى التقارير والبيانات المالية محصور بالمشرف الرئيسي (جعفر بدران).'
    };
  }

  const cases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  let totalRevenueSYP = 0;
  let totalRevenueUSD = 0;
  let pendingDuesSYP = 0;
  let pendingDuesUSD = 0;

  cases.forEach(c => {
    const fee = Number(c.agreedFee || (c as any).agreedAmount) || 0;
    const paid = Number(c.paidAmount) || 0;
    const curr = (c.currency || 'SYP').toUpperCase();
    const remaining = Math.max(0, fee - paid);

    if (curr === 'USD') {
      totalRevenueUSD += paid;
      pendingDuesUSD += remaining;
    } else {
      totalRevenueSYP += paid;
      pendingDuesSYP += remaining;
    }
  });

  return {
    allowed: true,
    totalRevenueUSD,
    totalRevenueSYP,
    pendingDuesUSD,
    pendingDuesSYP,
    messageAr: `المؤشرات المالية الحالية في المنظومة:
• المقبوضات (USD): $${totalRevenueUSD.toLocaleString()}
• المقبوضات (ل.س): ${totalRevenueSYP.toLocaleString()} ل.س
• المتبقيات المستحقة (USD): $${pendingDuesUSD.toLocaleString()}
• المتبقيات المستحقة (ل.س): ${pendingDuesSYP.toLocaleString()} ل.س`
  };
}

/**
 * 9. Find Duplicates
 */
export function toolFindAllDuplicates(): { duplicatePairs: Array<{ caseA: CaseItem; caseB: CaseItem; reason: string; score: number }> } {
  const cases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  const duplicatePairs: Array<{ caseA: CaseItem; caseB: CaseItem; reason: string; score: number }> = [];

  for (let i = 0; i < cases.length; i++) {
    for (let j = i + 1; j < cases.length; j++) {
      const a = cases[i];
      const b = cases[j];
      const match = detectDuplicateCase({
        title: a.title,
        clientName: a.client?.name,
        clientPhone: a.client?.phone,
        platform: a.platform,
        caseType: a.caseType,
        excludeCaseId: a.id
      }, [b]);

      if (match.isDuplicate && match.score >= 70) {
        duplicatePairs.push({
          caseA: a,
          caseB: b,
          reason: match.matchReasonAr,
          score: match.score
        });
      }
    }
  }

  return { duplicatePairs };
}

/**
 * 10. Search Team Members
 */
export function toolSearchTeam(queryText?: string): UserProfile[] {
  const users = getLocalUsers().filter(u => u.status !== 'deleted' && !u.isDeleted && !u._deleted);
  if (!queryText) return users;
  const q = queryText.toLowerCase().trim();
  return users.filter(u => 
    u.displayName?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.jobTitle?.toLowerCase().includes(q) ||
    u.role?.toLowerCase().includes(q)
  );
}

/**
 * Core Executive AI Execution & Query Answering Engine
 * Fully grounded in real system state with natural language intelligence
 */
export async function executeAssistantCommand(
  input: string,
  context: AssistantToolContext
): Promise<AssistantCommandResult> {
  const q = input.trim();
  const lowerQ = q.toLowerCase();

  // Small delay for natural processing feel
  await new Promise(r => setTimeout(r, 250));

  // 1. Specific Search Query for a Case or Client: e.g. "ابحث عن قضية احمد", "قضية رقم 102", "search for case #102"
  const searchPattern = /(?:ابحث عن|بحث عن|دور على|ابحثلي عن|search for|find case|case|قضية|ملف)\s+(.+)/i;
  const searchMatch = q.match(searchPattern);
  
  if (searchMatch && !lowerQ.includes('مكرر') && !lowerQ.includes('نشطة') && !lowerQ.includes('كل')) {
    const term = searchMatch[1].trim();
    const results = toolSearchCases(term);
    const extResults = toolSearchExternalRequests(term);

    if (results.length > 0 || extResults.length > 0) {
      let rep = `نتائج البحث عن "${term}":\n\n`;
      
      if (results.length > 0) {
        rep += `📁 القضايا الداخلية (${results.length}):\n`;
        results.slice(0, 5).forEach((c, idx) => {
          rep += `  ${idx + 1}. [${c.caseNumber}] ${c.title} — ${c.client?.name || 'صاحب البلاغ'} (${c.status === 'in_progress' ? 'قيد المتابعة' : c.status === 'new' ? 'جديدة' : c.status === 'completed' ? 'مكتملة' : c.status})\n`;
        });
        rep += '\n';
      }

      if (extResults.length > 0) {
        rep += `📥 الطلبات الخارجية (${extResults.length}):\n`;
        extResults.slice(0, 3).forEach((r, idx) => {
          rep += `  ${idx + 1}. [ورقة: ${r.sheetTitle}] ${JSON.stringify(r.row).substring(0, 80)}...\n`;
        });
      }

      return {
        handled: true,
        replyAr: rep.trim(),
        replyEn: `Found ${results.length} internal cases and ${extResults.length} external records matching "${term}".`,
        data: { internalCases: results, externalRequests: extResults }
      };
    } else {
      return {
        handled: true,
        replyAr: `لم يتم العثور على أي قضايا أو طلبات خارجية تطابق "${term}". يمكنك التأكد من رقم القضية أو اسم صاحب البلاغ.`,
        replyEn: `No cases or external requests found matching "${term}".`
      };
    }
  }

  // 2. Statistics & General Question: "كم عدد القضايا", "الاحصائيات", "ملخص النظام", "system status"
  if (
    lowerQ.includes('كم عدد') || 
    lowerQ.includes('احصائيات') || 
    lowerQ.includes('إحصائيات') || 
    lowerQ.includes('ملخص') || 
    lowerQ.includes('status') ||
    lowerQ.includes('نظام') ||
    lowerQ.includes('summary')
  ) {
    const summary = toolGetSystemSummary();
    const reply = `تقرير وإحصائيات النظام الفورية:
📊 القضايا الداخلية:
• إجمالي القضايا: ${summary.totalCases}
• القضايا الجديدة (المفتوحة): ${summary.openCases}
• القضايا قيد المتابعة: ${summary.inProgressCases}
• القضايا المغلقة والمكتملة: ${summary.closedCases}
• القضايا العاجلة: ${summary.urgentCases}

📥 الطلبات الخارجية:
• أوراق العمل المربوطة (Google Sheets): ${summary.externalSheetsCount}
• إجمالي السجلات والطلبات المستلمة: ${summary.externalRowsCount}

⚡ المهام والفريق:
• المهام المعلقة: ${summary.pendingTasks}
• أعضاء الفريق المسجلين: ${summary.teamCount}`;

    return {
      handled: true,
      replyAr: reply,
      replyEn: `System statistics: ${summary.totalCases} total cases (${summary.openCases} new, ${summary.inProgressCases} in progress), ${summary.externalRowsCount} external requests.`,
      data: summary
    };
  }

  // 3. Active Cases: "اعرضلي القضايا النشطة", "القضايا النشطة", "show active cases"
  if (
    lowerQ.includes('قضايا نشطة') || 
    lowerQ.includes('القضايا النشطة') || 
    lowerQ.includes('اعرضلي القضايا') || 
    lowerQ.includes('active cases') ||
    lowerQ.includes('كل القضايا') ||
    lowerQ.includes('القضايا الحالية')
  ) {
    const all = toolSearchCases('');
    const active = all.filter(c => c.status !== 'completed' && (c.status as string) !== 'closed');
    const list = active.length > 0 ? active : all.slice(0, 10);

    if (list.length === 0) {
      return {
        handled: true,
        replyAr: 'لا توجد قضايا مسجلة حالياً في النظام. يمكنك الضغط على زر "+ قضية جديدة" للبدء.',
        replyEn: 'There are no active cases in the database.'
      };
    }

    let summary = `تم العثور على (${list.length}) قضية نشطة:\n\n`;
    list.slice(0, 8).forEach((c, idx) => {
      summary += `${idx + 1}. [${c.caseNumber}] ${c.title}\n   الموكل: ${c.client?.name || 'غير محدد'} | المنصة: ${c.platform || 'عام'} | الأولوية: ${c.priority || 'عادية'}\n`;
    });

    if (list.length > 8) {
      summary += `\n... وهناك ${list.length - 8} قضايا أخرى يمكن استعراضها من قسم القضايا.`;
    }

    return {
      handled: true,
      replyAr: summary,
      replyEn: `Found ${list.length} active cases in the database.`,
      data: list
    };
  }

  // 4. External Requests: "الطلبات الخارجية", "طلبات جديدة", "external requests"
  if (
    lowerQ.includes('طلبات خارجية') || 
    lowerQ.includes('الطلبات الخارجية') || 
    lowerQ.includes('طلبات جديدة') || 
    lowerQ.includes('شيت') ||
    lowerQ.includes('external requests')
  ) {
    const sheets = getSavedPublicSheets();
    if (sheets.length === 0) {
      return {
        handled: true,
        replyAr: 'لم يتم ربط أي ورقة Google Sheet للطلبات الخارجية بعد. يمكنك ربط ورقة عمل بسهولة من قسم الطلبات الخارجية واختيار اسم الورقة بدون GID.',
        replyEn: 'No external Google Sheets linked yet.'
      };
    }

    let rep = `ملخص الطلبات الخارجية المربوطة (${sheets.length} ملفات):\n\n`;
    sheets.forEach((s, idx) => {
      rep += `${idx + 1}. 📄 ${s.title} (الورقة: ${s.activeTabName || 'الرئيسية'})\n   - عدد السجلات: ${s.totalRows || (s.rows || []).length}\n   - آخر مزامنة: ${s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'مباشرة'}\n`;
    });

    return {
      handled: true,
      replyAr: rep,
      replyEn: `Found ${sheets.length} external Google Sheet integrations.`,
      data: sheets
    };
  }

  // 5. Today's Plan & Focus: "شو عندي اليوم؟", "خطة اليوم", "مهام اليوم", "what do i have today"
  if (
    lowerQ.includes('شو عندي اليوم') || 
    lowerQ.includes('خطة اليوم') || 
    lowerQ.includes('مهام اليوم') || 
    lowerQ.includes('توصيات اليوم') ||
    lowerQ.includes('today') ||
    lowerQ.includes('ماذا لدي اليوم') ||
    lowerQ.includes('اليوم')
  ) {
    const cases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
    const urgent = cases.filter(c => (c.priority === 'urgent' || c.priority === 'high') && c.status !== 'completed');
    const tasks = toolSearchTasks();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate === todayStr || t.status === 'pending');

    let reply = `خطة يومك في المنظومة:\n\n`;
    reply += `• القضايا ذات الأولوية العاجلة: ${urgent.length}\n`;
    reply += `• المهام المجدولة أو قيد التنفيذ: ${todayTasks.length}\n\n`;

    if (urgent.length > 0) {
      reply += `🚨 قضايا عاجلة بحاجة لمتابعة فورية:\n`;
      urgent.slice(0, 3).forEach(c => {
        reply += `  - [${c.caseNumber}] ${c.title} (${c.client?.name || 'موكل'})\n`;
      });
      reply += '\n';
    }

    if (todayTasks.length > 0) {
      reply += `📋 أهم المهام:\n`;
      todayTasks.slice(0, 4).forEach(t => {
        reply += `  - ${t.title} [${t.priority || 'عادية'}]\n`;
      });
    } else {
      reply += `✅ لا توجد مهام متأخرة لليوم.`;
    }

    return {
      handled: true,
      replyAr: reply,
      replyEn: `Daily plan: ${urgent.length} urgent cases, ${todayTasks.length} pending tasks.`,
      data: { urgent, todayTasks }
    };
  }

  // 6. Create Case: "انشئ قضية", "اضف قضية", "create case"
  if (
    lowerQ.startsWith('انشئ قضية') || 
    lowerQ.startsWith('اضف قضية') || 
    lowerQ.startsWith('أضف قضية') ||
    lowerQ.includes('create case')
  ) {
    if (!hasPermission(context.userProfile, 'cases_create')) {
      return {
        handled: true,
        replyAr: '⚠️ هذه الوظيفة غير متاحة لحسابك حالياً. يرجى التواصل مع المشرف العام للحصول على الصلاحيات المطلوبة.',
        replyEn: 'Permission denied. Please contact the administrator.'
      };
    }
    let caseTitle = q.replace(/^(انشئ قضية|اضف قضية|أضف قضية|create case)/i, '').trim();
    if (!caseTitle) caseTitle = 'بلاغ جديد وارد';

    const result = toolCreateCase({
      title: caseTitle,
      priority: 'high',
      clientName: 'صاحب البلاغ'
    }, context.userProfile);

    if (result.success && result.caseItem) {
      return {
        handled: true,
        replyAr: `تم إنشاء القضية بنجاح وحفظها في المنظومة:\n• رقم القضية: ${result.caseItem.caseNumber}\n• العنوان: ${result.caseItem.title}\n• الحالة: جديدة\n• الأولوية: ${result.caseItem.priority}\nيمكنك الآن فتحها وتعبئة التفاصيل والمرفقات.`,
        replyEn: `Case ${result.caseItem.caseNumber} created successfully.`,
        data: result.caseItem,
        actionTaken: 'CREATE_CASE'
      };
    } else {
      return {
        handled: true,
        replyAr: `تعذر إنشاء القضية: ${result.errorAr || 'يرجى التأكد من الصلاحيات'}`,
        replyEn: `Failed to create case.`
      };
    }
  }

  // 7. Create Task: "اضف مهمة", "انشئ مهمة", "create task"
  if (
    lowerQ.startsWith('اضف مهمة') || 
    lowerQ.startsWith('أضفلي مهمة') || 
    lowerQ.startsWith('انشئ مهمة') ||
    lowerQ.includes('create task')
  ) {
    if (!hasPermission(context.userProfile, 'tasks_create')) {
      return {
        handled: true,
        replyAr: '⚠️ هذه الوظيفة غير متاحة لحسابك حالياً. يرجى التواصل مع المشرف العام للحصول على الصلاحيات المطلوبة.',
        replyEn: 'Permission denied. Please contact the administrator.'
      };
    }
    let taskTitle = q.replace(/^(اضف مهمة|أضفلي مهمة|انشئ مهمة|create task)/i, '').trim();
    if (!taskTitle) taskTitle = 'متابعة عاجلة';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const created = toolCreateTask({
      title: taskTitle,
      dueDate,
      priority: 'high'
    }, context.userProfile);

    return {
      handled: true,
      replyAr: `تم إنشاء المهمة وحفظها بنجاح:\n• المهمة: ${created.title}\n• الاستحقاق: ${dueDate}\n• الأولوية: ${created.priority}`,
      replyEn: `Task "${created.title}" created successfully.`,
      data: created,
      actionTaken: 'CREATE_TASK'
    };
  }

  // 8. Find Duplicates: "دورلي على القضايا المكررة", "ابحث عن التكرار", "find duplicates"
  if (
    lowerQ.includes('مكرر') || 
    lowerQ.includes('تكرار') || 
    lowerQ.includes('قضايا مكررة') || 
    lowerQ.includes('duplicates')
  ) {
    const { duplicatePairs } = toolFindAllDuplicates();
    if (duplicatePairs.length === 0) {
      return {
        handled: true,
        replyAr: 'تم فحص جميع القضايا في قاعدة البيانات: لا توجد أي قضايا مكررة أو ذات تشابه غير مصرح به. البيانات سليمة 100%.',
        replyEn: 'Scan completed: No duplicate cases found.'
      };
    }

    let rep = `تنبيه: تم العثور على (${duplicatePairs.length}) حالات تشابه محتملة بين القضايا:\n\n`;
    duplicatePairs.forEach((p, idx) => {
      rep += `${idx + 1}. [${p.caseA.caseNumber}] و [${p.caseB.caseNumber}] — نسبة التطابق: ${p.score}%\n   السبب: ${p.reason}\n`;
    });

    return {
      handled: true,
      replyAr: rep,
      replyEn: `Found ${duplicatePairs.length} duplicate pairs.`,
      data: duplicatePairs
    };
  }

  // 9. Financial Summary: "الوضع المالي", "الارباح", "finance"
  if (
    lowerQ.includes('مالي') || 
    lowerQ.includes('ارباح') || 
    lowerQ.includes('أرباح') || 
    lowerQ.includes('finance') || 
    lowerQ.includes('ميزانية')
  ) {
    if (!hasPermission(context.userProfile, 'finances_view')) {
      return {
        handled: true,
        replyAr: '⚠️ هذه الوظيفة غير متاحة لحسابك حالياً. يرجى التواصل مع المشرف العام للحصول على الصلاحيات المطلوبة.',
        replyEn: 'Permission denied. Financial data is restricted.'
      };
    }
    const fin = toolGetFinancialSummary(context.userProfile);
    return {
      handled: true,
      replyAr: fin.messageAr,
      replyEn: fin.allowed ? 'Financial overview generated.' : 'Restricted to Super Admin.',
      data: fin
    };
  }

  // 10. Team Members: "الفريق", "اعضاء الفريق", "المشرفين", "team"
  if (
    lowerQ.includes('فريق') || 
    lowerQ.includes('الفريق') || 
    lowerQ.includes('اعضاء') || 
    lowerQ.includes('مشرف') ||
    lowerQ.includes('مشرفين') ||
    lowerQ.includes('team')
  ) {
    if (!hasPermission(context.userProfile, 'team_view')) {
      return {
        handled: true,
        replyAr: '⚠️ هذه الوظيفة غير متاحة لحسابك حالياً. يرجى التواصل مع المشرف العام للحصول على الصلاحيات المطلوبة.',
        replyEn: 'Permission denied. Team directory is restricted.'
      };
    }
    const members = toolSearchTeam();
    let rep = `المشرفين وأعضاء الفريق المسجلين (${members.length}):\n\n`;
    members.forEach((m, i) => {
      rep += `${i + 1}. ${m.displayName} (${m.role === 'super_admin' ? 'مشرف رئيسي' : m.role === 'admin' ? 'مشرف' : 'مستخدم'}) — ${m.email}\n`;
    });
    return {
      handled: true,
      replyAr: rep,
      replyEn: `Team members: ${members.length} users registered.`,
      data: members
    };
  }

  // 11. Fallback with direct helpful answer and guidance
  const casesCount = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted).length;
  return {
    handled: true,
    replyAr: `أهلاً بك! لقد تم استلام استفسارك: "${q}".
نظام المساعد متصل مباشرة بقاعدة البيانات (${casesCount} قضايا مسجلة).

يمكنك توجيه أي سؤال محدد، مثل:
• "ابحث عن قضية [اسم أو رقم]"
• "كم عدد القضايا في النظام؟"
• "اعرضلي القضايا النشطة"
• "شو عندي اليوم؟"
• "انشئ قضية [عنوان القضية]"
• "اضف مهمة [عنوان المهمة]"
• "دورلي على القضايا المكررة"
• "استعراض أعضاء الفريق والمشرفين"`,
    replyEn: `Assistant is live and connected. You can ask about cases, daily plans, tasks, statistics, and team members.`
  };
}
