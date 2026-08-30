import React from 'react';
import { Eye, ExternalLink, X } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { getGoogleDrivePreviewUrl } from '../../lib/googleSheetsReader';

interface DrivePreviewModalProps {
  previewingFile: { url: string; title: string } | null;
  onClose: () => void;
}

export const DrivePreviewModal: React.FC<DrivePreviewModalProps> = ({
  previewingFile,
  onClose
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen: Boolean(previewingFile),
    onClose,
    id: 'drive-preview-modal',
  });

  if (!previewingFile) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[90vh] my-auto rounded-2xl border p-4 flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs font-bold truncate max-w-md ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {previewingFile.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={previewingFile.url}
              target="_blank"
              rel="noreferrer"
              className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح في نافذة جديدة</span>
            </a>
            <button
              type="button"
              onClick={handleSafeClose}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className={`flex-1 overflow-auto flex items-center justify-center rounded-xl p-2 min-h-[380px] ${
          isDark ? 'bg-black/60' : 'bg-slate-100'
        }`}>
          <iframe
            src={getGoogleDrivePreviewUrl(previewingFile.url)}
            className="w-full h-[62vh] rounded-lg border-0"
            title="معاينة الملف"
          />
        </div>
      </div>
    </div>
  );
};
