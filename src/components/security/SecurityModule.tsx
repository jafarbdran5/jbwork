import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Mail, 
  Lock, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  RefreshCw, 
  Activity, 
  Smartphone, 
  Globe,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { SecurityLogEntry, UserProfile, UserPermissions, SystemSetting } from '../../types';

export const SecurityModule: React.FC = () => {
  const { 
    userProfile, 
    isSuperAdmin, 
    updateAdminSecurityEmails, 
    updateUserStatus, 
    updateUserPermissions,
    systemSettings 
  } = useAuth();
  const { isRTL } = useI18n();

  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Security Email Edit State
  const [primaryEmail, setPrimaryEmail] = useState<string>(systemSettings?.primaryAdminEmail || 'jfrbdran@gmail.com');
  const [secondaryEmail, setSecondaryEmail] = useState<string>(systemSettings?.secondaryAdminEmail || '');
  const [savingEmails, setSavingEmails] = useState<boolean>(false);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState<boolean>(false);

  // Selected User for Permissions Matrix Editing
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [permissionsEdit, setPermissionsEdit] = useState<Partial<UserPermissions>>({});

  // Subscriptions
  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);

    // 1. Security Logs
    const qLogs = query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SecurityLogEntry));
      setLogs(items);
    });

    // 2. Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const items = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(items);
      setLoading(false);
    });

    return () => {
      unsubLogs();
      unsubUsers();
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (systemSettings) {
      setPrimaryEmail(systemSettings.primaryAdminEmail || 'jfrbdran@gmail.com');
      setSecondaryEmail(systemSettings.secondaryAdminEmail || '');
    }
  }, [systemSettings]);

  const handleSaveSecurityEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmails(true);
    setEmailSaveSuccess(false);
    try {
      await updateAdminSecurityEmails(primaryEmail, secondaryEmail);
      setEmailSaveSuccess(true);
      setTimeout(() => setEmailSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating admin security emails:', err);
    } finally {
      setSavingEmails(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await updateUserStatus(user.uid, nextStatus);
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleOpenPermsModal = (user: UserProfile) => {
    setSelectedUser(user);
    setPermissionsEdit(user.permissions || {
      casesView: true,
      casesCreate: true,
      casesEdit: true,
      casesDelete: false,
      requestsView: true,
      requestsCreate: true,
      requestsEdit: true,
      financeView: false,
      financeManage: false,
      employeeEarningsView: true,
      employeeEarningsManage: false,
      personalFinanceView: false,
      personalFinanceManage: false,
      teamManage: false,
      securityView: false,
      settingsManage: false
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      await updateUserPermissions(selectedUser.uid, permissionsEdit);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error saving user permissions:', err);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">وصول محظور</h2>
        <p className="text-sm text-slate-400">مركز الأمان والصلاحيات خاص بالمشرف العام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isRTL ? 'مركز الأمان ومراقبة الوصول' : 'Security & Access Control Center'}
            </h1>
            <p className="text-xs text-slate-400">
              {isRTL ? 'إدارة حسابات المشرف العام، قائمة المستخدمين المعتمدة، وسجلات محاولات الدخول' : 'Super Admin account configs, user allowlist, and live security audits'}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>FIREWALL ACTIVE • STRICT ALLOWLIST</span>
        </div>
      </div>

      {/* Grid: Admin Accounts Configuration & Security Rules Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Admin Email Accounts Config */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Mail className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              {isRTL ? 'حسابات المشرف العام المعتمدة' : 'Authorized Super Admin Emails'}
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {isRTL 
              ? 'أي تسجيل دخول من خلال هذه العناوين يتم منحه تلقائياً صلاحيات المشرف العام (Super Admin) الكاملة.'
              : 'Any login from these emails is granted full Super Admin authority across all modules.'}
          </p>

          <form onSubmit={handleSaveSecurityEmails} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                {isRTL ? 'البريد الإلكتروني الرئيسي للمشرف العام' : 'Primary Super Admin Email'}
              </label>
              <input
                type="email"
                required
                value={primaryEmail}
                onChange={e => setPrimaryEmail(e.target.value)}
                placeholder="jfrbdran@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                {isRTL ? 'البريد الإلكتروني الاحتياطي (Secondary)' : 'Secondary / Backup Admin Email'}
              </label>
              <input
                type="email"
                value={secondaryEmail}
                onChange={e => setSecondaryEmail(e.target.value)}
                placeholder="admin.backup@jbwork.com (اختياري)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {emailSaveSuccess && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isRTL ? 'تم حفظ وتحديث إعدادات الأمان بنجاح' : 'Security settings updated'}
                </span>
              )}
              <button
                type="submit"
                disabled={savingEmails}
                className="ms-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
              >
                {savingEmails ? (isRTL ? 'جار الحفظ...' : 'Saving...') : (isRTL ? 'تحديث إعدادات المشرف' : 'Update Admin Emails')}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Security System Parameters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {isRTL ? 'سياسات الأمان والحماية المطبقة' : 'Enforced Security Policies'}
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">{isRTL ? 'التسجيل العام (Public Sign Up)' : 'Public Sign Up'}</span>
                <span className="text-[11px] text-slate-400">{isRTL ? 'معطل كلياً — الإضافة فقط عبر المشرف' : 'Disabled completely — Admin invitation only'}</span>
              </div>
              <span className="bg-rose-950 text-rose-400 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold border border-rose-800/50">
                BLOCKED
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">{isRTL ? 'قائمة المستخدمين المصرحين (Allowlist)' : 'Strict User Allowlist'}</span>
                <span className="text-[11px] text-slate-400">{isRTL ? 'يتم فحص كل حساب Google أو بريد قبل الدخول' : 'Every login is matched against verified database'}</span>
              </div>
              <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold border border-emerald-800/50">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">{isRTL ? 'حماية البيانات المالية والشخصية' : 'Finance & PII Isolation'}</span>
                <span className="text-[11px] text-slate-400">{isRTL ? 'محمية بصلاحيات سوبر أدمن فقط في القواعد' : 'Guarded strictly via Super Admin rules'}</span>
              </div>
              <span className="bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold border border-cyan-800/50">
                ISOLATED
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Authorized Users Allowlist Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              {isRTL ? 'قائمة المستخدمين المعتمدين والمصرح لهم' : 'Authorized Users Allowlist'}
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{users.length} {isRTL ? 'مستخدم' : 'users'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">{isRTL ? 'المستخدم' : 'User'}</th>
                <th className="p-3">{isRTL ? 'الرتبة' : 'Role'}</th>
                <th className="p-3">{isRTL ? 'حساب Google المرتبط' : 'Linked Google'}</th>
                <th className="p-3">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="p-3 text-right">{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-slate-200">{u.displayName}</div>
                    <div className="text-[11px] font-mono text-slate-400">{u.email}</div>
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      u.role === 'super_admin' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      u.role === 'admin' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                      'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>

                  <td className="p-3 font-mono text-[11px] text-slate-300">
                    {u.googleEmail ? (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {u.googleEmail}
                      </span>
                    ) : (
                      <span className="text-slate-500">{isRTL ? 'غير مربوط' : 'Not linked'}</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      u.status === 'active' || u.isActive
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {u.status === 'active' || u.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'موقوف' : 'Suspended')}
                    </span>
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenPermsModal(u)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit Permissions"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {u.role !== 'super_admin' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40'
                          }`}
                          title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                        >
                          {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realtime Security Logs Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {isRTL ? 'سجل الرقابة الأمنية والنشاط المباشر' : 'Live Security Audit Logs'}
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">آخر {logs.length} حدث</span>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map(log => {
              const isDenied = log.result === 'denied' || log.result === 'blocked';
              return (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                    isDenied 
                      ? 'bg-rose-950/20 border-rose-800/40' 
                      : 'bg-slate-950/70 border-slate-800/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${isDenied ? 'bg-rose-900/40 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                      {isDenied ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isDenied ? 'text-rose-300' : 'text-slate-200'}`}>
                          {log.action}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isDenied ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/60 text-emerald-300'
                        }`}>
                          {log.result}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{log.details}</p>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-1">
                        <span>{log.email}</span>
                        {log.device && <span>• {log.device}</span>}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'Recent'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              {isRTL ? 'لا توجد سجلات أمنية حتى الآن.' : 'No security logs found.'}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Matrix Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">
                  {isRTL ? 'تعديل مصفوفة الصلاحيات' : 'Edit Permissions Matrix'}
                </h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">{selectedUser.displayName} ({selectedUser.email})</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
              {[
                { key: 'casesView', label: isRTL ? 'عرض القضايا' : 'View Cases' },
                { key: 'casesCreate', label: isRTL ? 'إنشاء قضايا جديدة' : 'Create Cases' },
                { key: 'casesEdit', label: isRTL ? 'تعديل القضايا' : 'Edit Cases' },
                { key: 'casesDelete', label: isRTL ? 'حذف القضايا' : 'Delete Cases' },
                { key: 'requestsView', label: isRTL ? 'عرض الطلبات الداخلية' : 'View Requests' },
                { key: 'requestsCreate', label: isRTL ? 'تقديم طلبات' : 'Create Requests' },
                { key: 'financeView', label: isRTL ? 'الاطلاع على الأرباح والمالية' : 'View Finance' },
                { key: 'financeManage', label: isRTL ? 'إدارة المالية والمصاريف' : 'Manage Finance' },
                { key: 'employeeEarningsView', label: isRTL ? 'عرض مستحقاته المالية' : 'View Own Earnings' },
                { key: 'teamManage', label: isRTL ? 'إدارة الفريق' : 'Manage Team' },
                { key: 'settingsManage', label: isRTL ? 'إدارة إعدادات النظام' : 'Manage Settings' }
              ].map(perm => (
                <label key={perm.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-300 font-medium">{perm.label}</span>
                  <input
                    type="checkbox"
                    checked={!!(permissionsEdit as any)[perm.key]}
                    onChange={e => setPermissionsEdit({ ...permissionsEdit, [perm.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-0 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSavePermissions} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
                {isRTL ? 'حفظ الصلاحيات' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
