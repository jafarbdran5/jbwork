import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth, CreateUserInput } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../../types';
import { getLocalUsers, saveLocalUser } from '../../lib/offlineStore';
import { logAuditAndEvent } from '../../lib/audit';
import { deleteEntity } from '../../services/database/deleteService';
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
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Search, 
  Lock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const AVAILABLE_DEPARTMENTS = [
  { id: 'cases', labelAr: 'إدارة وتتبع القضايا', labelEn: 'Cases & Operations' },
  { id: 'requests', labelAr: 'الطلبات والاستقبال', labelEn: 'Requests & Intake' },
  { id: 'clients', labelAr: 'دليل وسجلات الموكلين', labelEn: 'Clients Directory' },
  { id: 'finance', labelAr: 'المالية والمدفوعات والمستحقات', labelEn: 'Finance & Payments' },
  { id: 'forms', labelAr: 'نماذج الاستقبال المخصصة', labelEn: 'Forms Center' },
  { id: 'knowledge', labelAr: 'الموسوعة القانونية والخطط', labelEn: 'Knowledge Base' },
  { id: 'content_studio', labelAr: 'استوديو صناعة المحتوى', labelEn: 'Content Studio' },
  { id: 'projects', labelAr: 'المشاريع والمبادرات', labelEn: 'Projects' },
  { id: 'reports', labelAr: 'التقارير والإحصائيات', labelEn: 'Reports & Analytics' },
  { id: 'files', labelAr: 'الملفات والمستندات المركزية', labelEn: 'Files & Documents' }
];

export const TeamModule: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin, isAdmin, createInternalUser, sendPasswordReset } = useAuth();

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

  // Custom Delete Member Confirmation Modal
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password reset state feedback
  const [resetFeedback, setResetFeedback] = useState<{ email: string; success: boolean; msg: string } | null>(null);

  // Hydrate team members from database (excluding soft-deleted)
  const refreshMembersFromStore = () => {
    const cachedUsers = getLocalUsers().filter(u => u.status !== 'deleted' && !u.isDeleted && !u._deleted);
    let initialList: UserProfile[] = [...cachedUsers];

    // Ensure Primary Admin exists
    const hasOwner = initialList.some(u => u.role === 'super_admin' || u.email?.toLowerCase().includes('jfrbdran'));
    if (!hasOwner) {
      const defaultOwner: UserProfile = {
        uid: userProfile?.uid || 'super_admin_jaafar',
        email: userProfile?.email || 'jfrbdran@gmail.com',
        displayName: userProfile?.displayName || 'جعفر بدران (Jaafar Bdran)',
        role: 'super_admin',
        status: 'active',
        isActive: true,
        jobTitle: 'المالك والمشرف العام',
        phone: '+963900000000',
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
      initialList = [defaultOwner, ...initialList];
      saveLocalUser(defaultOwner);
    }

    setMembers(initialList);
    setLoading(false);
  };

  useEffect(() => {
    refreshMembersFromStore();

    try {
      const usersCol = collection(db, 'users');
      const unsubscribe = onSnapshot(usersCol, (snap) => {
        const mergedMap = new Map<string, UserProfile>();

        // Load local
        getLocalUsers()
          .filter(u => u.status !== 'deleted' && !u.isDeleted && !u._deleted)
          .forEach((u: any) => {
            if (u && (u.uid || u.email)) {
              mergedMap.set(u.uid || u.email, u);
            }
          });

        // Current profile
        if (userProfile && (userProfile as any).status !== 'deleted' && !(userProfile as any).isDeleted) {
          mergedMap.set(userProfile.uid, userProfile);
        }

        // Firestore documents
        if (!snap.empty) {
          snap.docs.forEach(d => {
            const uData = { ...d.data(), uid: d.id } as UserProfile;
            if ((uData as any).status !== 'deleted' && !(uData as any)._deleted && !(uData as any).isDeleted) {
              mergedMap.set(uData.uid, uData);
              saveLocalUser(uData);
            }
          });
        }

        const allMembers = Array.from(mergedMap.values());
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

        setMembers(allMembers);
        setLoading(false);
      }, (err) => {
        console.warn('Team snapshot fallback:', err);
        refreshMembersFromStore();
      });

      return () => unsubscribe();
    } catch (e) {
      refreshMembersFromStore();
    }
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
    if (members.length >= 51) {
      alert(isRTL ? 'تم الوصول إلى الحد الأقصى لسعة الفريق (50 عضواً بالإضافة للمشرف العام).' : 'Maximum team capacity of 50 members reached.');
      return;
    }
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

      refreshMembersFromStore();
    } catch (err: any) {
      console.error('Failed to create team member:', err);
      setFormError(err.message || (isRTL ? 'فشل إنشاء الحساب.' : 'Failed to create user.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (member: UserProfile) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setEditIsActive(member.isActive !== false && member.status !== 'inactive');
    setEditDisplayName(member.displayName || '');
    setEditPhone(member.phone || '');
    setEditJobTitle(member.jobTitle || '');
    setEditDepartments(member.departments || ['cases', 'requests', 'clients']);
    setShowEditModal(true);
  };

  // Save Edit Member
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !userProfile || !isAdmin) return;

    try {
      const updatedFields = {
        role: editRole,
        isActive: editIsActive,
        status: editIsActive ? ('active' as const) : ('inactive' as const),
        displayName: editDisplayName.trim(),
        phone: editPhone.trim(),
        jobTitle: editJobTitle.trim(),
        departments: editDepartments,
        updatedAt: new Date().toISOString()
      };

      saveLocalUser({
        ...selectedMember,
        ...updatedFields
      });

      try {
        await updateDoc(doc(db, 'users', selectedMember.uid), {
          ...updatedFields,
          updatedAt: serverTimestamp()
        });
      } catch (_) {}

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
      refreshMembersFromStore();
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
      setResetFeedback({
        email: member.email,
        success: false,
        msg: isRTL ? 'تعذر إرسال الرابط. تأكد من صحة البريد.' : 'Failed to send reset link.'
      });
      setTimeout(() => setResetFeedback(null), 5000);
    }
  };

  // Execute Soft Delete to Recycle Bin
  const handleExecuteDeleteMember = async () => {
    if (!memberToDelete || !isSuperAdmin || !userProfile) return;
    setIsDeleting(true);

    try {
      const res = await deleteEntity('user', memberToDelete.uid, userProfile, {
        customTitle: `${memberToDelete.displayName} (${memberToDelete.email})`,
        reason: 'حذف العضو ونقله إلى سلة المهملات'
      });

      if (res.success) {
        setMembers(prev => prev.filter(m => m.uid !== memberToDelete.uid));
        setMemberToDelete(null);
        setResetFeedback({
          email: memberToDelete.email || '',
          success: true,
          msg: isRTL ? `تم نقل حساب "${memberToDelete.displayName}" إلى سلة المهملات بنجاح.` : `Moved ${memberToDelete.displayName} to Recycle Bin.`
        });
        setTimeout(() => setResetFeedback(null), 4000);
      } else {
        alert(isRTL ? res.messageAr : res.messageEn);
      }
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (statusFilter !== 'all') {
        const isActive = m.isActive !== false && m.status !== 'inactive';
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (m.displayName || '').toLowerCase().includes(q);
        const matchesEmail = (m.email || '').toLowerCase().includes(q);
        const matchesPhone = (m.phone || '').toLowerCase().includes(q);
        const matchesTitle = (m.jobTitle || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesTitle) return false;
      }
      return true;
    });
  }, [members, roleFilter, statusFilter, searchQuery]);

  const additionalMembersCount = Math.max(0, members.filter(m => m.role !== 'super_admin').length);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {isRTL ? 'إدارة الفريق والمشرفين (Team Management)' : 'Team & Operations Staff'}
                <span className="text-xs bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-800 font-mono font-bold">
                  {additionalMembersCount} / 50 {isRTL ? 'أعضاء إضافيين' : 'Members'}
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isRTL 
                  ? 'إدارة حسابات فريق العمل، تحديد الأدوار، الصلاحيات، وتعيين المهام في بيئة محلية مستقلة.' 
                  : 'Manage internal team members, roles, departmental access, and security credentials.'}
              </p>
            </div>
          </div>
        </div>

        {/* Add User Button (Super Admin / Admin only) */}
        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isRTL ? 'إضافة عضو فريق جديد' : 'Add Team Member'}</span>
          </button>
        )}
      </div>

      {/* Password reset feedback banner */}
      {resetFeedback && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-fade-in ${
          resetFeedback.success 
            ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-800/70 text-rose-200'
        }`}>
          {resetFeedback.success ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{resetFeedback.msg}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، البريد، الهاتف، أو المسمى الوظيفي...' : 'Search by name, email, phone, or title...'}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl ps-10 pe-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="active">{isRTL ? 'الحسابات النشطة' : 'Active Only'}</option>
            <option value="inactive">{isRTL ? 'الحسابات المعطلة' : 'Inactive Only'}</option>
          </select>
        </div>
      </div>

      {/* Team Member Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-zinc-400 font-mono flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span>{isRTL ? 'جارٍ تحميل بيانات الفريق والصلاحيات...' : 'Loading team & permissions...'}</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 space-y-3">
          <Users className="w-10 h-10 text-zinc-600 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white">{isRTL ? 'لا يوجد أعضاء يطابقون خيارات البحث' : 'No members match search'}</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {isRTL 
              ? 'يمكنك إضافة عضو أو مسؤول جديد مباشرة وتزويده ببيانات الدخول.' 
              : 'You can create a new member or admin account directly.'}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isRTL ? 'إضافة عضو فريق جديد' : 'Add Team Member'}</span>
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
                  isOwner 
                    ? 'bg-gradient-to-b from-indigo-950/30 to-zinc-900 border-indigo-500/40 shadow-indigo-950/20' 
                    : isMemberActive
                      ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-950/80 border-zinc-800/80 opacity-75'
                }`}
              >
                {/* Top: Avatar, Role & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border shadow-inner ${
                      isOwner
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-mono'
                        : isMemberActive
                          ? 'bg-zinc-800 border-zinc-700 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}>
                      {m.displayName ? m.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{m.displayName || 'عضو غير مسمى'}</span>
                        {isOwner && (
                          <span title={isRTL ? 'المالك والمشرف العام الأصيل' : 'Primary Owner & Super Admin'}>
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-zinc-500" />
                        <span>{m.jobTitle || (isOwner ? 'المشرف العام والمالك' : 'عضو فريق')}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isMemberActive 
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
                      : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isMemberActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{isMemberActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}</span>
                  </span>
                </div>

                {/* Info List */}
                <div className="space-y-1.5 text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-2 text-zinc-400 truncate">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate" title={m.email}>{m.email || 'بدون بريد'}</span>
                  </div>
                  {m.phone && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="font-mono">{m.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-zinc-400 pt-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-mono font-bold text-[11px] text-indigo-300 uppercase">{m.role}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEditModal(m)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
                        title={isRTL ? 'تعديل البيانات والصلاحيات' : 'Edit Member'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isRTL ? 'تعديل' : 'Edit'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleSendPasswordReset(m)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
                      title={isRTL ? 'إرسال رابط إعادة تعيين كلمة المرور' : 'Reset Password'}
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Delete Button (Super Admin only, Protected for Owner) */}
                  {isSuperAdmin && !isOwner && (
                    <button
                      onClick={() => setMemberToDelete(m)}
                      className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-colors"
                      title={isRTL ? 'نقل الحساب إلى سلة المهملات' : 'Move to Trash'}
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

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'إضافة عضو فريق جديد للمنظومة' : 'Add New Team Member'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder={isRTL ? 'مثال: أحمد العلي' : 'e.g. Ahmad Alali'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {isRTL ? 'البريد الإلكتروني / اسم المستخدم *' : 'Email / Username *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@jb-system.local"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {isRTL ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+963..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-medium">
                    {isRTL ? 'كلمة المرور الابتدائية *' : 'Initial Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isRTL ? 'توليد تلقائي' : 'Generate'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {isRTL ? 'الرتبة والدور *' : 'Role *'}
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="employee">Employee (أخصائي قضايا)</option>
                    <option value="manager">Manager (مدير عمليات)</option>
                    <option value="admin">Admin (مسؤول نظام)</option>
                    <option value="viewer">Viewer (مشاهد فقط)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {isRTL ? 'المسمى الوظيفي' : 'Job Title'}
                  </label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder={isRTL ? 'أخصائي متابعة قضايا' : 'Case Manager'}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 font-semibold cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {isSubmitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الحساب فوراً' : 'Save Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {isRTL ? `تعديل بيانات: ${selectedMember.displayName}` : `Edit: ${selectedMember.displayName}`}
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  {isRTL ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {isRTL ? 'الدور والرتبة' : 'Role'}
                  </label>
                  <select
                    value={editRole}
                    disabled={selectedMember.role === 'super_admin'}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="employee">Employee (أخصائي قضايا)</option>
                    <option value="manager">Manager (مدير عمليات)</option>
                    <option value="admin">Admin (مسؤول نظام)</option>
                    <option value="viewer">Viewer (مشاهد فقط)</option>
                    {selectedMember.role === 'super_admin' && <option value="super_admin">Super Admin (المشرف العام)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {isRTL ? 'حالة الحساب' : 'Account Status'}
                  </label>
                  <select
                    value={editIsActive ? 'active' : 'inactive'}
                    disabled={selectedMember.role === 'super_admin'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="active">{isRTL ? 'نشط ومفعل' : 'Active'}</option>
                    <option value="inactive">{isRTL ? 'معطل ومحظور مؤقتاً' : 'Disabled / Suspended'}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 font-semibold cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {isRTL ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATED CREDENTIALS SUCCESS MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121214] border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                {isRTL ? 'تم إنشاء حساب العضو بنجاح' : 'Member Account Created'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {isRTL ? 'يرجى نسخ بيانات تسجيل الدخول وتزويد العضو بها:' : 'Please copy credentials to share with the user:'}
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>{isRTL ? 'الاسم:' : 'Name:'}</span>
                <span className="text-white font-bold">{createdCredentials.displayName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>{isRTL ? 'البريد:' : 'Email:'}</span>
                <span className="text-indigo-300">{createdCredentials.email}</span>
              </div>
              {createdCredentials.password && (
                <div className="flex justify-between text-zinc-400">
                  <span>{isRTL ? 'كلمة المرور:' : 'Password:'}</span>
                  <span className="text-emerald-400 font-bold">{createdCredentials.password}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const text = `بيانات دخول منظومة جعفر بدران:\nالاسم: ${createdCredentials.displayName}\nالبريد: ${createdCredentials.email}\nكلمة المرور: ${createdCredentials.password || ''}`;
                  navigator.clipboard.writeText(text);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 2000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedCredentials ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCredentials ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'نسخ البيانات' : 'Copy All')}</span>
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
              >
                {isRTL ? 'تم' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MEMBER CONFIRMATION MODAL */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121214] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                {isRTL ? 'تأكيد حذف حساب العضو ونقله لسلة المهملات' : 'Confirm Move Member to Trash'}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {isRTL 
                  ? `أنت على وشك حذف حساب "${memberToDelete.displayName}". سيتم تعطيل تسجيل دخوله فوراً ونقل حسابه إلى سلة المهملات مع إمكانية استعادته لاحقاً.` 
                  : `Are you sure you want to delete ${memberToDelete.displayName}? Login will be blocked immediately.`}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleExecuteDeleteMember}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {isDeleting ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'نعم، انقل لسلة المهملات' : 'Move to Trash')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
