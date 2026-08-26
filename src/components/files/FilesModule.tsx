import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { FileItemRecord } from '../../types';
import { 
  Folder, 
  Plus, 
  Search, 
  FileText, 
  Image, 
  Video, 
  ExternalLink, 
  Trash2, 
  Download, 
  HardDrive, 
  Link2, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const FilesModule: React.FC<{ onSelectCase?: (caseId: string) => void }> = ({ onSelectCase }) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [files, setFiles] = useState<FileItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState<FileItemRecord['category']>('document');
  const [entityType, setEntityType] = useState<FileItemRecord['entityType']>('case');
  const [entityTitle, setEntityTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'system_files'), orderBy('createdAt', 'desc')), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as FileItemRecord));
      setFiles(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsub();
  }, []);

  const handleAddFile = async () => {
    if (!fileName.trim() || !fileUrl.trim()) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const docRef = await addDoc(collection(db, 'system_files'), {
      name: fileName.trim(),
      url: fileUrl.trim(),
      category,
      entityType,
      entityTitle: entityTitle.trim() || undefined,
      tags,
      uploadedBy: {
        uid: userProfile?.uid || 'super_admin',
        name: userProfile?.displayName || 'Jaafar Bdran'
      },
      createdAt: serverTimestamp()
    });

    await logAuditAndEvent({
      action: 'FILE_LINKED',
      details: `Linked file: ${fileName} (${entityType})`,
      entityType: 'attachment',
      entityId: docRef.id,
      user: userProfile || undefined
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFileName('');
    setFileUrl('');
    setCategory('document');
    setEntityType('case');
    setEntityTitle('');
    setTagsInput('');
  };

  const filteredFiles = files.filter(f => {
    const matchesCat = categoryFilter === 'all' || f.category === categoryFilter;
    const matchesSearch = searchQuery === '' || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.entityTitle && f.entityTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'إدارة الملفات و Google Drive' : 'Universal Files & Drive Repository'}
              </h1>
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO Storage
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'مستودع الوثائق، العقود، الأدلة الرقمية، وملفات Google Drive المرتبطة بالقضايا والعملاء'
                : 'Universal repository for case attachments, evidence, contracts, and Drive links'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isRTL ? 'ربط ملف أو رابط Drive' : 'Link File / Drive'}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute top-2.5 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في الملفات والمستندات...' : 'Search files...'}
            className="w-full bg-[#121214] border border-[#27272A] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'document', 'image', 'video', 'contract', 'evidence', 'report'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
              }`}
            >
              {cat === 'all' ? (isRTL ? 'الكل' : 'All') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
          <Folder className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لا توجد ملفات مرفوعة' : 'No Files Linked'}</h3>
          <p className="text-xs text-[#A1A1AA]">{isRTL ? 'اضغط على "ربط ملف أو رابط Drive" لإضافة ملفات جديدة' : 'Add Drive links or documents to store here'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div key={file.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-4 flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {file.category || 'file'}
                  </span>
                  <span className="text-[10px] text-[#71717A]">
                    {file.entityType}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{file.name}</h4>
                {file.entityTitle && (
                  <p className="text-[11px] text-indigo-400 mb-3 truncate">{file.entityTitle}</p>
                )}
              </div>

              <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {isRTL ? 'فتح الملف' : 'Open'}
                </a>

                {isSuperAdmin && (
                  <button
                    onClick={async () => {
                      if (window.confirm(isRTL ? 'حذف هذا الرابط؟' : 'Delete this link?')) {
                        await deleteDoc(doc(db, 'system_files', file.id));
                      }
                    }}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-400" />
                {isRTL ? 'ربط ملف أو وثيقة من Google Drive' : 'Link File / Document'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'اسم الملف أو الوثيقة' : 'File Name'} *</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={isRTL ? 'مثال: عقد استشارة أمنية - شركة X' : 'e.g. Security Audit Contract'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'رابط الملف (Google Drive / Direct URL)' : 'URL'} *</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'نوع الملف' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="document">Document / مستند</option>
                    <option value="contract">Contract / عقد</option>
                    <option value="evidence">Evidence / دليل رقمي</option>
                    <option value="report">Report / تقرير</option>
                    <option value="image">Image / صورة</option>
                    <option value="video">Video / فيديو</option>
                    <option value="other">Other / أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'مرتبط بـ' : 'Linked To'}</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="case">Case / قضية</option>
                    <option value="client">Client / عميل</option>
                    <option value="project">Project / مشروع</option>
                    <option value="employee">Employee / موظف</option>
                    <option value="general">General / عام</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'اسم الكيان أو رقم القضية المرجعي' : 'Reference Name / Case #'}</label>
                <input
                  type="text"
                  value={entityTitle}
                  onChange={(e) => setEntityTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: JB-2026-000145' : 'e.g. JB-2026-000145'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-5 border-t border-[#27272A] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAddFile}
                disabled={!fileName.trim() || !fileUrl.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {isRTL ? 'حفظ الرابط' : 'Link File'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
