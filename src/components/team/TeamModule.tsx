import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth, CreateUserInput } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../../types';
import { getLocalUsers, saveLocalUser } from '../../lib/offlineStore';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Shield, 
  Briefcase, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Phone, 
  Edit3,
  Trash2,
  Key,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  Lock,
  ExternalLink
} from 'lucide-react';

export const AVAILABLE_DEPARTMENTS = [
  { id: 'cases', labelAr: 'إدارة وتتبع القضايا', labelEn: 'Cases & Operations' },
  { id: 'requests', labelAr: 'الطلبات والاستقبال (Google Forms)', labelEn: 'Requests & Intake' },
  { id: 'clients', labelAr: 'دليل وسجلات العملاء', labelEn: 'Clients Directory' },
  { id: 'finance', labelAr: 'المالية والمدفوعات والمستحقات', labelEn: 'Finance & Payments' },
  { id: 'forms', labelAr: 'نماذج الاستقبال المخصصة', labelEn: 'Forms Center' },
  { id: 'knowledge', labelAr: 'قاعدة المعرفة والخطط', labelEn: 'Knowledge Base' },
  { id: 'content_studio', labelAr: 'استوديو المحتوى والإعلام', labelEn: 'Content Studio' },
  { id: 'projects', labelAr: 'المشاريع والمبادرات', labelEn: 'Projects' },
  { id: 'reports', labelAr: 'التقارير والإحصائيات', labelEn: 'Reports & Analytics' },
  { id: 'files', labelAr: 'الملفات والدرايف المركزي', labelEn: 'Drive & Files' }
];

export const TeamModule: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin, isAdmin, createInternalUser, sendPasswordReset, deleteUser } = useAuth();

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add User Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newDepartments, setNewDepartments] = useState<string[]>(['cases', 'requests', 'clients']);

  // Success Created Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    displayName: string;
    email: string;
    password?: string;
    role: UserRole;
    phone?: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Edit Member Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editJobTitle, setEditJobTitle] = useState<string>('');
  const [editDepartments, setEditDepartments] = useState<string[]>(['cases', 'requests', 'clients']);

  // Password reset state feedback
  const [resetFeedback, setResetFeedback] = useState<{ email: string; success: boolean; msg: string } | null>(null);

  useEffect(() => {
    // 1. Initial hydration from cache and current profile
    const cachedUsers = getLocalUsers();
    let initialList: UserProfile[] = [...cachedUsers];

    if (userProfile && !initialList.some(u => u.uid === userProfile.uid || (u.email && u.email.toLowerCase() === userProfile.email?.toLowerCase()))) {
      initialList.unshift(userProfile);
      saveLocalUser(userProfile);
    }

    // Default fallback if no users are present anywhere
    if (initialList.length === 0) {
      const defaultOwner: UserProfile = {
        uid: userProfile?.uid || 'super_admin_jaafar',
        email: userProfile?.email || 'jfrbdran@gmail.com',
        displayName: userProfile?.displayName || 'جعفر بدران (Jaafar Bdran)',
        role: 'super_admin',
        status: 'active',
        isActive: true,
        jobTitle: 'المالك والمشرف العام',
        phone: '+966500000000',
        permissions: {
          casesView: true,
          casesCreate: true,
          casesEdit: true,
          casesDelete: true,
          requestsView: true,
          requestsCreate: true,
          requestsEdit: true,
          financeView: true,
          financeManage: true,
          employeeEarningsView: true,
          employeeEarningsManage: true,
          personalFinanceView: true,
          personalFinanceManage: true,
          teamManage: true,
          securityView: true,
          settingsManage: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      initialList = [defaultOwner];
      saveLocalUser(defaultOwner);
      // Also persist to Firestore users collection in background
      setDoc(doc(db, 'users', defaultOwner.uid), defaultOwner, { merge: true }).catch(() => {});
    }

    setMembers(initialList);
    setLoading(false);

    // 2. Real-time listener without strict orderBy to avoid omitting documents missing timestamp
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snap) => {
      const mergedMap = new Map<string, UserProfile>();

      // Put cached first
      cachedUsers.forEach((u: any) => {
        if (u && (u.uid || u.email)) {
          mergedMap.set(u.uid || u.email, u);
        }
      });

      // Put current logged-in profile
      if (userProfile) {
        mergedMap.set(userProfile.uid, userProfile);
        saveLocalUser(userProfile);
      }

      // Put Firestore documents
      if (!snap.empty) {
        snap.docs.forEach(d => {
          const uData = { ...d.data(), uid: d.id } as UserProfile;
          mergedMap.set(uData.uid, uData);
          saveLocalUser(uData);
        });
      }

      const allMembers = Array.from(mergedMap.values());

      // Sort by role hierarchy: super_admin -> admin -> manager -> employee -> viewer
      const roleOrder: Record<string, number> = {
        super_admin: 0,
        admin: 1,
        manager: 2,
        employee: 3,
        viewer: 4
      };

      allMembers.sort((a, b) => {
        const orderA = roleOrder[a.role] ?? 99;
        const orderB = roleOrder[b.role] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      setMembers(allMembers.length > 0 ? allMembers : initialList);
      setLoading(false);
    }, (err) => {
      console.warn('Team snapshot fallback:', err);
      const fallbackLocal = getLocalUsers();
      if (fallbackLocal.length > 0) {
        setMembers(fallbackLocal);
      } else if (userProfile) {
        setMembers([userProfile]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Jb@';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += `${Math.floor(10 + Math.random() * 90)}#`;
    setNewPassword(pass);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setNewDisplayName('');
    setNewEmail('');
    setNewPhone('');
    setNewJobTitle('');
    setNewRole('employee');
    setNewIsActive(true);
    setFormError(null);
    handleGeneratePassword();
    setShowAddModal(true);
  };

  // Submit Add User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، كلمة المرور).' : 'Please fill all required fields.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const input: CreateUserInput = {
        displayName: newDisplayName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        phone: newPhone.trim(),
        jobTitle: newJobTitle.trim(),
        role: newRole,
        departments: newDepartments,
        isActive: newIsActive
      };

      const result = await createInternalUser(input);

      setShowAddModal(false);
      setCreatedCredentials({
        displayName: result.displayName,
        email: result.email,
        password: result.password,
        role: result.role,
        phone: newPhone.trim()
      });
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/email-already-in-use') {
        setFormError(isRTL ? 'هذا البريد الإلكتروني مسجل مسبقاً في النظام.' : 'This email address is already registered.');
      } else if (err?.code === 'auth/weak-password') {
        setFormError(isRTL ? 'كلمة المرور ضعيفة. يجب أن تتكون من 6 خانات على الأقل.' : 'Password is too weak (min 6 chars).');
      } else if (err?.code === 'auth/invalid-email') {
        setFormError(isRTL ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email address format.');
      } else {
        setFormError(isRTL ? 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة ثانية.' : 'Failed to create user account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy formatted credentials
  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const roleLabel = getRoleTitle(createdCredentials.role);
    const text = `مرحباً ${createdCredentials.displayName}،
تم إنشاء حسابك الداخلي في نظام عمل جعفر بدران (JB WORK):
🌐 رابط النظام: ${window.location.origin}
📧 البريد الإلكتروني: ${createdCredentials.email}
🔑 كلمة المرور: ${createdCredentials.password}
🛡️ الصلاحية الممنوحة: ${roleLabel}

يرجى تسجيل الدخول والاحتفاظ بالبيانات بأمان.`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!createdCredentials) return;
    const roleLabel = getRoleTitle(createdCredentials.role);
    const message = encodeURIComponent(`مرحباً ${createdCredentials.displayName}،
تم إنشاء حسابك الداخلي في نظام عمل جعفر بدران (JB WORK):
🌐 رابط النظام: ${window.location.origin}
📧 البريد الإلكتروني: ${createdCredentials.email}
🔑 كلمة المرور: ${createdCredentials.password}
🛡️ الصلاحية: ${roleLabel}

يرجى تسجيل الدخول إلى المنظومة.`);

    const phoneClean = createdCredentials.phone?.replace(/[^0-9+]/g, '') || '';
    const url = phoneClean ? `https://wa.me/${phoneClean}?text=${message}` : `https://api.whatsapp.com/send?text=${message}`;
    window.open(url, '_blank');
  };

  // Open Edit Modal
  const handleOpenEdit = (m: UserProfile) => {
    setSelectedMember(m);
    setEditRole(m.role);
    setEditIsActive(m.isActive !== false && m.status !== 'inactive');
    setEditDisplayName(m.displayName || '');
    setEditPhone(m.phone || '');
    setEditJobTitle(m.jobTitle || '');
    setEditDepartments(m.departments || ['cases', 'requests', 'clients']);
    setShowEditModal(true);
  };

  // Save Edit Member
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !userProfile || !isAdmin) return;

    try {
      await updateDoc(doc(db, 'users', selectedMember.uid), {
        role: editRole,
        isActive: editIsActive,
        status: editIsActive ? 'active' : 'inactive',
        displayName: editDisplayName.trim(),
        phone: editPhone.trim(),
        jobTitle: editJobTitle.trim(),
        departments: editDepartments,
        updatedAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: 'UPDATE_TEAM_MEMBER',
        details: `تحديث بيانات وصلاحيات العضو: ${editDisplayName} (${editRole}) - الحالة: ${editIsActive ? 'نشط' : 'معطل'}`,
        entityType: 'user',
        entityId: selectedMember.uid,
        entityTitle: editDisplayName,
        user: userProfile
      });

      setShowEditModal(false);
      setSelectedMember(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Send password reset
  const handleSendPasswordReset = async (member: UserProfile) => {
    if (!member.email) return;
    try {
      await sendPasswordReset(member.email);
      setResetFeedback({
        email: member.email,
        success: true,
        msg: isRTL ? `تم إرسال رابط استعادة كلمة المرور إلى ${member.email} بنجاح.` : `Password reset email sent to ${member.email}.`
      });
      setTimeout(() => setResetFeedback(null), 5000);
    } catch (err: any) {
      console.error(err);
      setResetFeedback({
        email: member.email,
        success: false,
        msg: isRTL ? 'تعذر إرسال الرابط. تأكد من صحة البريد.' : 'Failed to send reset link.'
      });
      setTimeout(() => setResetFeedback(null), 5000);
    }
  };

  // Delete User
  const handleDeleteMember = async (m: UserProfile) => {
    if (!isSuperAdmin) return;
    if (m.email?.toLowerCase().includes('jfrbdran') || m.role === 'super_admin') {
      alert(t('cannotDeleteSuperAdmin'));
      return;
    }

    const confirm = window.confirm(
      isRTL 
        ? `هل أنت متأكد من حذف حساب العضو "${m.displayName}" نهائياً من المنظومة؟` 
        : `Are you sure you want to permanently delete "${m.displayName}"?`
    );
    if (!confirm) return;

    try {
      await deleteUser(m.uid, m.displayName);
    } catch (err: any) {
      console.error('Delete user error:', err);
      alert(isRTL ? 'حدث خطأ أثناء محاولة حذف الحساب.' : 'Failed to delete user.');
    }
  };

  const getRoleTitle = (r: UserRole) => {
    switch (r) {
      case 'super_admin': return isRTL ? 'المالك والمشرف العام (Super Admin)' : 'Super Admin (Owner)';
      case 'admin': return isRTL ? 'مسؤول النظام (Admin)' : 'Operations Admin';
      case 'manager': return isRTL ? 'مدير / مشرف عمليات (Manager)' : 'Operations Manager';
      case 'employee': return isRTL ? 'أخصائي قضايا / موظف (Employee)' : 'Case Specialist (Employee)';
      default: return isRTL ? 'مشاهد فقط (Viewer)' : 'Viewer (Read Only)';
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-800/70 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>SUPER ADMIN</span>
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-950/80 text-rose-300 border border-rose-800/70 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide">
            <Shield className="w-3 h-3 text-rose-400" />
            <span>ADMIN</span>
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-950/80 text-purple-300 border border-purple-800/70 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide">
            <Briefcase className="w-3 h-3 text-purple-400" />
            <span>MANAGER</span>
          </span>
        );
      case 'employee':
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-950/80 text-cyan-300 border border-cyan-800/70 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>EMPLOYEE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide">
            <Eye className="w-3 h-3 text-slate-400" />
            <span>VIEWER</span>
          </span>
        );
    }
  };

  // Filtered members
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      !searchQuery.trim() ||
      m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery) ||
      m.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const isMemberActive = m.isActive !== false && m.status !== 'inactive';
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? isMemberActive : !isMemberActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header with Title & Add User Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {t('navTeam')}
                </h1>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 border border-cyan-800/60 px-2.5 py-0.5 rounded-full">
                  {members.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRTL 
                  ? 'إدارة الأعضاء والمسؤولين ومنح الصلاحيات من داخل النظام حصراً — التسجيل الخارجي معطل' 
                  : 'Manage team members & assign RBAC permissions internally — External registration closed'}
              </p>
            </div>
          </div>
        </div>

        {/* Add User Button (Super Admin / Admin only) */}
        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 hover:shadow-cyan-600/40 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('addTeamMember')}</span>
          </button>
        )}
      </div>

      {/* Password reset feedback banner */}
      {resetFeedback && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in duration-150 ${
          resetFeedback.success 
            ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-800/70 text-rose-200'
        }`}>
          {resetFeedback.success ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{resetFeedback.msg}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، البريد، الهاتف، أو المسمى الوظيفي...' : 'Search by name, email, phone, or title...'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Role & Status filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">{isRTL ? 'جميع الرتب والصلاحيات' : 'All Roles'}</option>
            <option value="super_admin">Super Admin (المشرف العام)</option>
            <option value="admin">Admin (مسؤول النظام)</option>
            <option value="manager">Manager (مدير عمليات)</option>
            <option value="employee">Employee (أخصائي قضايا)</option>
            <option value="viewer">Viewer (مشاهد فقط)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="active">{isRTL ? 'الحسابات النشطة' : 'Active Only'}</option>
            <option value="inactive">{isRTL ? 'الحسابات المعطلة' : 'Inactive Only'}</option>
          </select>
        </div>
      </div>

      {/* Team Member Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 font-mono flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>{isRTL ? 'جارٍ تحميل بيانات الفريق والصلاحيات...' : 'Loading team & permissions...'}</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white">{isRTL ? 'لا يوجد أعضاء يطابقون خيارات البحث' : 'No members match search'}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isRTL 
              ? 'يمكنك إضافة عضو أو مسؤول جديد مباشرة وتزويده ببيانات الدخول.' 
              : 'You can create a new member or admin account directly.'}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('addTeamMember')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => {
            const isMemberActive = m.isActive !== false && m.status !== 'inactive';
            const isOwner = m.email?.toLowerCase().includes('jfrbdran') || m.role === 'super_admin';

            return (
              <div 
                key={m.uid} 
                className={`border rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between transition-all duration-200 ${
                  isMemberActive 
                    ? 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700' 
                    : 'bg-slate-950/80 border-rose-950/60 opacity-80'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top line: Avatar, Name, and Status indicator */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-md ${
                        isOwner 
                          ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white ring-2 ring-amber-400/30' 
                          : m.role === 'admin'
                          ? 'bg-gradient-to-br from-rose-600 to-rose-800 text-white'
                          : m.role === 'manager'
                          ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white'
                          : 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white'
                      }`}>
                        {m.displayName?.charAt(0) || 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white truncate" title={m.displayName}>
                            {m.displayName}
                          </h3>
                        </div>
                        <p className="text-[11px] text-cyan-400 font-medium truncate">
                          {m.jobTitle || getRoleTitle(m.role)}
                        </p>
                      </div>
                    </div>

                    {/* Active/Inactive Pill */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isMemberActive 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                        : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isMemberActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      <span>{isMemberActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}</span>
                    </span>
                  </div>

                  {/* Contact Info (Email & Phone) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px] truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate" title={m.email}>{m.email}</span>
                    </div>

                    {m.phone && (
                      <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{m.phone}</span>
                        </div>
                        <a
                          href={`https://wa.me/${m.phone.replace(/[^0-9+]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{isRTL ? 'مراسلة' : 'Chat'}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Role & Departments */}
                  <div className="pt-2 border-t border-slate-800/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>{getRoleBadge(m.role)}</div>
                      {m.lastLogin && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {isRTL ? 'آخر دخول نشط' : 'Active'}
                        </span>
                      )}
                    </div>

                    {/* Departments Access Badges */}
                    {m.departments && m.departments.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {m.departments.slice(0, 3).map(dId => {
                          const deptObj = AVAILABLE_DEPARTMENTS.find(d => d.id === dId);
                          return (
                            <span key={dId} className="px-1.5 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/60 text-[10px] text-slate-300 font-medium truncate max-w-[120px]">
                              {deptObj ? (isRTL ? deptObj.labelAr : deptObj.labelEn) : dId}
                            </span>
                          );
                        })}
                        {m.departments.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-cyan-400 font-bold font-mono">
                            +{m.departments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (Super Admin / Admin) */}
                {isAdmin && (
                  <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      {/* Edit Role & Access */}
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        title={isRTL ? 'تعديل الصلاحيات والحالة' : 'Edit permissions & status'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isRTL ? 'الصلاحيات' : 'Edit'}</span>
                      </button>

                      {/* Send password reset link */}
                      <button
                        onClick={() => handleSendPasswordReset(m)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-300 text-xs transition-colors cursor-pointer"
                        title={t('sendResetEmail')}
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete user button (Super Admin only, protected for Owner) */}
                    {isSuperAdmin && !isOwner && (
                      <button
                        onClick={() => handleDeleteMember(m)}
                        className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-rose-950/80 border border-transparent hover:border-rose-800 text-slate-500 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD MEMBER / ADMIN MODAL (Requirements: Create from inside app, RBAC)   */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('addTeamMember')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('createAccountForEmployee')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Creation Form */}
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              
              {/* Full Name & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('fullName')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder={isRTL ? 'مثال: أحمد العلي' : 'e.g. Ahmad Al-Ali'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('jobTitle')}
                  </label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder={isRTL ? 'مثال: أخصائي استرداد حسابات' : 'e.g. Recovery Specialist'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('clientEmail') || (isRTL ? 'البريد الإلكتروني' : 'Email Address')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="employee@jbwork.internal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('clientPhone') || (isRTL ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp')}
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+963 9XX XXX XXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password with Strong Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {t('passwordLabel')} <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t('generatePassword')}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pe-10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection with RBAC Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('roleAndPermissions')} <span className="text-rose-400">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  {/* Super Admin option (Only visible to current Super Admin) */}
                  {isSuperAdmin && (
                    <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      newRole === 'super_admin' ? 'bg-amber-950/40 border-amber-500/80 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="newRole"
                        value="super_admin"
                        checked={newRole === 'super_admin'}
                        onChange={() => setNewRole('super_admin')}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold text-amber-400">Super Admin (مشرف عام)</div>
                        <div className="text-[10px] text-slate-400">{isRTL ? 'كامل الصلاحيات وحذف وتعديل المنظومة' : 'Full access to all system features'}</div>
                      </div>
                    </label>
                  )}

                  {/* Admin */}
                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    newRole === 'admin' ? 'bg-rose-950/40 border-rose-500/80 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="newRole"
                      value="admin"
                      checked={newRole === 'admin'}
                      onChange={() => setNewRole('admin')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-400">Admin (مسؤول نظام)</div>
                      <div className="text-[10px] text-slate-400">{isRTL ? 'إدارة القضايا والفرق والعملاء والمدفوعات' : 'Full operational & financial access'}</div>
                    </div>
                  </label>

                  {/* Manager */}
                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    newRole === 'manager' ? 'bg-purple-950/40 border-purple-500/80 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="newRole"
                      value="manager"
                      checked={newRole === 'manager'}
                      onChange={() => setNewRole('manager')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold text-purple-400">Manager (مدير عمليات)</div>
                      <div className="text-[10px] text-slate-400">{isRTL ? 'إشراف وتعيين المهام ومتابعة الأداء' : 'Manage operations & assign tasks'}</div>
                    </div>
                  </label>

                  {/* Employee (Default) */}
                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    newRole === 'employee' ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="newRole"
                      value="employee"
                      checked={newRole === 'employee'}
                      onChange={() => setNewRole('employee')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold text-cyan-400">Employee (أخصائي قضايا)</div>
                      <div className="text-[10px] text-slate-400">{isRTL ? 'العمل على القضايا والمهام والمرفقات' : 'Handle cases, tasks & attachments'}</div>
                    </div>
                  </label>

                  {/* Viewer */}
                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    newRole === 'viewer' ? 'bg-slate-800/80 border-slate-600 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="newRole"
                      value="viewer"
                      checked={newRole === 'viewer'}
                      onChange={() => setNewRole('viewer')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-300">Viewer (مشاهد فقط)</div>
                      <div className="text-[10px] text-slate-400">{isRTL ? 'استعراض البيانات دون صلاحية تعديل' : 'View only permissions'}</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Departments Access Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isRTL ? 'الأقسام والصلاحيات المسموح الوصول إليها' : 'Assigned Departments & Access'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewDepartments(newDepartments.length === AVAILABLE_DEPARTMENTS.length ? [] : AVAILABLE_DEPARTMENTS.map(d => d.id))}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {newDepartments.length === AVAILABLE_DEPARTMENTS.length ? (isRTL ? 'إلغاء تحديد الكل' : 'Deselect All') : (isRTL ? 'تحديد كافة الأقسام' : 'Select All')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 max-h-48 overflow-y-auto">
                  {AVAILABLE_DEPARTMENTS.map(dept => {
                    const isChecked = newDepartments.includes(dept.id);
                    return (
                      <label
                        key={dept.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-cyan-950/50 border-cyan-700/70 text-cyan-200' : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewDepartments([...newDepartments, dept.id]);
                            } else {
                              setNewDepartments(newDepartments.filter(id => id !== dept.id));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="truncate text-[11px] font-medium">{isRTL ? dept.labelAr : dept.labelEn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newActiveCheck"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="newActiveCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  {t('activeStatus')}
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('saving')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('save')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS CREDENTIALS MODAL (Share Login Details with Employee)              */}
      {/* ========================================================================= */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-800/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t('userCreatedSuccess')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {t('provideCredentialsToUser')}
                </p>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-500 font-sans text-[11px]">{t('fullName')}:</span>
                <span className="text-white font-bold font-sans">{createdCredentials.displayName}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-500 font-sans text-[11px]">{isRTL ? 'البريد الإلكتروني' : 'Email'}:</span>
                <span className="text-cyan-400 font-bold" dir="ltr">{createdCredentials.email}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-slate-500 font-sans text-[11px]">{t('passwordLabel')}:</span>
                <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50" dir="ltr">
                  {createdCredentials.password}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans text-[11px]">{t('roleAndPermissions')}:</span>
                <span className="text-slate-200 font-sans font-bold">{getRoleTitle(createdCredentials.role)}</span>
              </div>
            </div>

            {/* Actions: Copy or Send WhatsApp */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleCopyCredentials}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {copiedCredentials ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCredentials ? t('credentialsCopied') : t('copyCredentials')}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-950 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>{t('sendViaWhatsApp')}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ROLE & PERMISSIONS MODAL                                            */}
      {/* ========================================================================= */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRTL ? 'تعديل بيانات وصلاحيات العضو' : 'Edit Member Permissions'}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{selectedMember.email}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('fullName')}</label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('jobTitle')}</label>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'رقم الهاتف' : 'Phone'}</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('roleAndPermissions')}</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {isSuperAdmin && <option value="super_admin">Super Admin (المشرف العام - كامل الصلاحيات)</option>}
                  <option value="admin">Admin (مسؤول النظام والعمليات والمدفوعات)</option>
                  <option value="manager">Manager (مدير عمليات / إشراف وتوزيع مهام)</option>
                  <option value="employee">Employee (أخصائي قضايا / العمل على القضايا والمهام)</option>
                  <option value="viewer">Viewer (مشاهد فقط / عرض دون تعديل)</option>
                </select>
              </div>

              {/* Departments Access Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isRTL ? 'الأقسام والصلاحيات المسموح الوصول إليها' : 'Assigned Departments & Access'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditDepartments(editDepartments.length === AVAILABLE_DEPARTMENTS.length ? [] : AVAILABLE_DEPARTMENTS.map(d => d.id))}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {editDepartments.length === AVAILABLE_DEPARTMENTS.length ? (isRTL ? 'إلغاء تحديد الكل' : 'Deselect All') : (isRTL ? 'تحديد كافة الأقسام' : 'Select All')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 max-h-48 overflow-y-auto">
                  {AVAILABLE_DEPARTMENTS.map(dept => {
                    const isChecked = editDepartments.includes(dept.id);
                    return (
                      <label
                        key={dept.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-cyan-950/50 border-cyan-700/70 text-cyan-200' : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditDepartments([...editDepartments, dept.id]);
                            } else {
                              setEditDepartments(editDepartments.filter(id => id !== dept.id));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="truncate text-[11px] font-medium">{isRTL ? dept.labelAr : dept.labelEn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editActiveCheck"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="editActiveCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  {t('activeStatus')}
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
