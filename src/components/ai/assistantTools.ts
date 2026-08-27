import { UserProfile, CaseItem } from '../../types';
import { getLocalCases, saveLocalCase, getLocalUsers, getLocalAttachments } from '../../lib/offlineStore';
import { deleteEntity } from '../../services/database/deleteService';
import { detectDuplicateCase } from '../../lib/duplicateDetector';
import { getNextSequentialCaseNumber } from '../../lib/offlineStore';

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
}

/**
 * 1. Search Cases
 */
export function toolSearchCases(query: string, statusFilter?: string): CaseItem[] {
  const allCases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  const q = query.trim().toLowerCase();
  
  return allCases.filter(c => {
    if (statusFilter && statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    if (!q) return true;
    const titleMatch = (c.title || '').toLowerCase().includes(q);
    const numMatch = (c.caseNumber || '').toLowerCase().includes(q);
    const clientMatch = (c.client?.name || '').toLowerCase().includes(q);
    const typeMatch = (c.caseType || '').toLowerCase().includes(q);
    const platMatch = (c.platform || '').toLowerCase().includes(q);
    return titleMatch || numMatch || clientMatch || typeMatch || platMatch;
  });
}

/**
 * 2. Get Case Details
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
 * 3. Create Case
 */
export function toolCreateCase(
  params: {
    title: string;
    caseType?: string;
    platform?: string;
    clientName?: string;
    clientPhone?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
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
      name: userProfile.displayName || 'جعفر بدران'
    },
    assignedTo: {
      uid: userProfile.uid,
      name: userProfile.displayName || 'جعفر بدران',
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
 * 4. Search Tasks
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
 * 5. Create Task
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
    createdBy: userProfile?.displayName || 'المستخدم',
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
 * 6. Get Daily Summary / Daily Focus
 */
export function toolGetDailySummary(): {
  activeCasesCount: number;
  urgentCasesCount: number;
  pendingTasksCount: number;
  todayTasks: any[];
  teamCount: number;
} {
  const cases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  const activeCases = cases.filter(c => c.status !== 'resolved' && c.status !== 'closed');
  const urgentCases = activeCases.filter(c => c.priority === 'urgent' || c.priority === 'high');

  const tasks = toolSearchTasks();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.dueDate === todayStr || t.status === 'pending').slice(0, 5);

  const users = getLocalUsers().filter(u => u.status !== 'deleted' && !u.isDeleted && !u._deleted);

  return {
    activeCasesCount: activeCases.length,
    urgentCasesCount: urgentCases.length,
    pendingTasksCount: tasks.filter(t => t.status !== 'completed').length,
    todayTasks,
    teamCount: users.length
  };
}

/**
 * 7. Get Financial Summary
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
      messageAr: 'عذراً، الوصول إلى التقارير والبيانات المالية محصور بالمشرف العام والمالك (جعفر بدران).'
    };
  }

  const cases = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
  let totalRevenueSYP = 0;
  let totalRevenueUSD = 0;
  let pendingDuesSYP = 0;
  let pendingDuesUSD = 0;

  cases.forEach(c => {
    const fee = Number(c.agreedFee) || 0;
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
    messageAr: `المؤشرات المالية الحالية:
• المقبوضات (USD): $${totalRevenueUSD.toLocaleString()}
• المقبوضات (ل.س): ${totalRevenueSYP.toLocaleString()} ل.س
• المتبقيات المستحقة (USD): $${pendingDuesUSD.toLocaleString()}
• المتبقيات المستحقة (ل.س): ${pendingDuesSYP.toLocaleString()} ل.س`
  };
}

/**
 * 8. Find Potential Duplicate Cases Across Entire System
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
 * 9. Search Team
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
 * Core Rule & Intent Evaluator for Local Assistant (100% Offline Capable)
 */
export async function executeAssistantCommand(
  input: string,
  context: AssistantToolContext
): Promise<AssistantCommandResult> {
  const q = input.trim().toLowerCase();

  // 1. Show Active Cases: "اعرضلي القضايا النشطة", "القضايا النشطة", "show active cases"
  if (
    q.includes('قضايا نشطة') || 
    q.includes('القضايا النشطة') || 
    q.includes('اعرضلي القضايا') || 
    q.includes('active cases') ||
    q.includes('كل القضايا')
  ) {
    const active = toolSearchCases('', 'active');
    const all = toolSearchCases('');
    const list = active.length > 0 ? active : all.slice(0, 5);

    if (list.length === 0) {
      return {
        handled: true,
        replyAr: 'لا توجد قضايا نشطة مسجلة حالياً في قاعدة البيانات المحلية. يمكنك البدء بإنشاء قضية جديدة.',
        replyEn: 'There are no active cases registered currently in the local database.'
      };
    }

    let summary = `تم العثور على (${list.length}) قضية نشطة:\n\n`;
    list.forEach((c, idx) => {
      summary += `${idx + 1}. [${c.caseNumber}] ${c.title} — الموكل: ${c.client?.name || 'غير محدد'} (${c.platform || 'عام'})\n`;
    });

    return {
      handled: true,
      replyAr: summary,
      replyEn: `Found ${list.length} active cases in the database.`,
      data: list
    };
  }

  // 2. Today's Plan & Focus: "شو عندي اليوم؟", "خطة اليوم", "مهام اليوم", "what do i have today"
  if (
    q.includes('شو عندي اليوم') || 
    q.includes('خطة اليوم') || 
    q.includes('مهام اليوم') || 
    q.includes('توصيات اليوم') ||
    q.includes('today') ||
    q.includes('ماذا لدي اليوم')
  ) {
    const daily = toolGetDailySummary();
    let reply = `ملخص جدولك اليومي في المنظومة:\n\n`;
    reply += `• القضايا النشطة قيد المعالجة: ${daily.activeCasesCount}\n`;
    reply += `• القضايا العاجلة وذات الأولوية: ${daily.urgentCasesCount}\n`;
    reply += `• المهام المتبقية: ${daily.pendingTasksCount}\n`;
    reply += `• أعضاء الفريق النشطين: ${daily.teamCount}\n\n`;

    if (daily.todayTasks.length > 0) {
      reply += `المهام الأقرب:\n`;
      daily.todayTasks.forEach((t, i) => {
        reply += `  - ${t.title} [الأولوية: ${t.priority || 'عادية'}]\n`;
      });
    } else {
      reply += `لا توجد مهام متأخرة أو حرجة محددة لليوم.`;
    }

    return {
      handled: true,
      replyAr: reply,
      replyEn: `Daily summary: ${daily.activeCasesCount} active cases, ${daily.pendingTasksCount} pending tasks.`,
      data: daily
    };
  }

  // 3. Find Duplicates: "دورلي على القضايا المكررة", "ابحث عن التكرار", "find duplicates"
  if (
    q.includes('مكرر') || 
    q.includes('تكرار') || 
    q.includes('قضايا مكررة') || 
    q.includes('duplicates')
  ) {
    const { duplicatePairs } = toolFindAllDuplicates();
    if (duplicatePairs.length === 0) {
      return {
        handled: true,
        replyAr: 'تم فحص جميع القضايا في قاعدة البيانات: لا توجد أي قضايا مكررة أو ذات تشابه غير مصرح به. البيانات سليمة 100%.',
        replyEn: 'Scan completed: No duplicate cases found.'
      };
    }

    let rep = `تنبيه: تم العثور على (${duplicatePairs.length}) حالات تطابق أو تشابه محتمل بين القضايا:\n\n`;
    duplicatePairs.forEach((p, idx) => {
      rep += `${idx + 1}. [${p.caseA.caseNumber}] و [${p.caseB.caseNumber}] — نسبة التطابق: ${p.score}%\n   السبب: ${p.reason}\n`;
    });

    return {
      handled: true,
      replyAr: rep,
      replyEn: `Found ${duplicatePairs.length} possible duplicate cases.`,
      data: duplicatePairs
    };
  }

  // 4. Create Task: "أضفلي مهمة لبكرا", "انشئ مهمة", "create task"
  if (
    q.startsWith('اضف مهمة') || 
    q.startsWith('أضفلي مهمة') || 
    q.startsWith('انشئ مهمة') ||
    q.includes('create task')
  ) {
    let taskTitle = input.replace(/^(اضف مهمة|أضفلي مهمة|انشئ مهمة|create task)/i, '').trim();
    if (!taskTitle) taskTitle = 'متابعة عاجلة مع الموكل';

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
      replyAr: `تم إنشاء المهمة بنجاح وحفظها محلياً في قاعدة البيانات:\n• العنوان: ${created.title}\n• تاريخ الاستحقاق: ${dueDate}\n• الأولوية: ${created.priority}`,
      replyEn: `Task "${created.title}" created successfully for ${dueDate}.`,
      data: created,
      actionTaken: 'CREATE_TASK'
    };
  }

  // 5. Financial Overview: "الوضع المالي", "الارباح", "finance"
  if (
    q.includes('مالي') || 
    q.includes('ارباح') || 
    q.includes('أرباح') || 
    q.includes('finance') || 
    q.includes('ميزانية')
  ) {
    const fin = toolGetFinancialSummary(context.userProfile);
    return {
      handled: true,
      replyAr: fin.messageAr,
      replyEn: fin.allowed ? 'Financial overview calculated.' : 'Access restricted to Super Admin.',
      data: fin
    };
  }

  // 6. Team Members: "الفريق", "اعضاء الفريق", "team"
  if (
    q.includes('فريق') || 
    q.includes('الفريق') || 
    q.includes('اعضاء') || 
    q.includes('أعضاء') ||
    q.includes('team members')
  ) {
    const members = toolSearchTeam();
    let rep = `أعضاء الفريق المسجلين في المنظومة (${members.length} / 50):\n\n`;
    members.forEach((m, i) => {
      rep += `${i + 1}. ${m.displayName} (${m.role}) — ${m.jobTitle || 'عضو'}\n`;
    });
    return {
      handled: true,
      replyAr: rep,
      replyEn: `Registered team members (${members.length}/50).`,
      data: members
    };
  }

  // Fallback: General Guidance
  return {
    handled: false,
    replyAr: `تم استلام طلبك: "${input}". يمكنك سؤالي عن:
• "اعرضلي القضايا النشطة"
• "شو عندي اليوم؟"
• "دورلي على القضايا المكررة"
• "أضفلي مهمة [اسم المهمة]"
• "الوضع المالي والأرباح"
• "استعراض أعضاء الفريق"`,
    replyEn: `Received: "${input}". Try asking for active cases, daily schedule, duplicates, tasks, or team.`
  };
}
