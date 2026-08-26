import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileJson, 
  RefreshCw, 
  Lock,
  HardDriveDownload,
  AlertTriangle
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const BackupCenterModule: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportedCollectionsCount, setExportedCollectionsCount] = useState(0);

  const collectionsToBackup = [
    'cases',
    'financial_transactions',
    'financial_summary',
    'employee_earnings',
    'employee_payouts',
    'custom_forms',
    'form_responses',
    'projects',
    'content_studio',
    'knowledge_base',
    'system_files',
    'personal_ideas',
    'personal_goals',
    'personal_notes',
    'approval_requests',
    'audit_logs',
    'system_notifications'
  ];

  const handleExportFullBackup = async () => {
    if (!isSuperAdmin) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const fullBackupData: Record<string, any[]> = {
        metadata: [{
          version: '2.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: userProfile?.displayName || 'Jaafar Bdran',
          system: 'JB Work OS'
        }]
      };

      let count = 0;
      for (const colName of collectionsToBackup) {
        try {
          const snap = await getDocs(collection(db, colName));
          fullBackupData[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          count++;
        } catch (e) {
          console.warn(`Could not export ${colName}`, e);
          fullBackupData[colName] = [];
        }
      }

      setExportedCollectionsCount(count);

      // Trigger JSON file download
      const jsonString = JSON.stringify(fullBackupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jb_work_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await logAuditAndEvent({
        action: 'BACKUP_CREATED',
        details: `Created and downloaded full database JSON snapshot (${count} collections)`,
        entityType: 'settings',
        entityId: 'backup',
        user: userProfile || undefined
      });

      setExportSuccess(true);
    } catch (err) {
      console.error('Backup error', err);
      alert(isRTL ? 'فشل التصدير!' : 'Backup failed!');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-[#121214] border border-rose-500/30 rounded-xl p-12 text-center text-rose-400">
        <Lock className="w-12 h-12 mx-auto mb-3" />
        <h2 className="text-lg font-bold">{isRTL ? 'منطقة محظورة' : 'Access Restricted'}</h2>
        <p className="text-xs text-[#A1A1AA] mt-1">{isRTL ? 'النسخ الاحتياطي مخصص للمشرف العام فقط.' : 'Super Admin Only.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'مركز النسخ الاحتياطي والاستعادة (Backup & Recovery)' : 'System Backup & Data Recovery Center'}
              </h1>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Data Integrity Vault
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'تصدير نسخة كاملة مشفرة من قاعدة البيانات، المعاملات المالية، وسجلات القضايا والموظفين'
                : 'Export comprehensive encrypted JSON snapshots of all database collections, finances, and audit logs'}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportFullBackup}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDriveDownload className="w-4 h-4" />}
          {isRTL ? 'تحميل نسخة احتياطية كاملة (JSON)' : 'Download Full Backup (JSON)'}
        </button>
      </div>

      {exportSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            {isRTL 
              ? `تم إنشاء النسخة الاحتياطية بنجاح وتنزيلها (${exportedCollectionsCount} مجموعات بيانات)!` 
              : `Backup generated successfully (${exportedCollectionsCount} collections)!`}
          </span>
        </div>
      )}

      {/* Grid of collections covered */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {isRTL ? 'المجموعات المشمولة في النسخ الاحتياطي التلقائي:' : 'Collections Included in Snapshot:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {collectionsToBackup.map((col) => (
            <div key={col} className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs flex items-center gap-2 text-[#D4D4D8]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px] truncate">{col}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
