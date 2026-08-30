import React, { ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { useTheme } from '../../lib/theme';

export type AppModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: AppModalSize;
  isBottomSheetOnMobile?: boolean;
  closeOnBackdropClick?: boolean;
  isSubmitting?: boolean;
  preventCloseOnLoading?: boolean;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
  hideHeader?: boolean;
  id?: string;
  zIndex?: number;
}

const sizeClasses: Record<AppModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full w-full mx-2 sm:mx-6 min-h-[92vh]',
};

export const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerActions,
  children,
  footer,
  size = 'lg',
  isBottomSheetOnMobile = false,
  closeOnBackdropClick = true,
  isSubmitting = false,
  preventCloseOnLoading = false,
  className = '',
  contentClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  hideCloseButton = false,
  hideHeader = false,
  id,
  zIndex = 50,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    id,
    isSubmitting,
    preventCloseOnLoading,
  });

  if (!isOpen) return null;

  const maxWidthClass = sizeClasses[size] || 'max-w-lg';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex }}
      className={`fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto ${
        isBottomSheetOnMobile ? 'items-end sm:items-center p-0 sm:p-5' : 'items-center'
      } ${className}`}
      onClick={closeOnBackdropClick ? handleBackdropClick : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClass} max-h-[90vh] sm:max-h-[88vh] flex flex-col rounded-2xl sm:rounded-2xl border shadow-2xl transition-all my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isBottomSheetOnMobile ? 'rounded-b-none sm:rounded-2xl max-h-[92vh]' : ''
        } ${
          isDark
            ? 'bg-[#18181B] border-[#27272A] text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        } ${contentClassName}`}
      >
        {/* Modal Header */}
        {!hideHeader && (title || icon || !hideCloseButton) && (
          <div
            className={`px-5 py-4 border-b shrink-0 flex items-center justify-between gap-3 ${
              isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-100 bg-slate-50/80'
            } ${headerClassName}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDark
                      ? 'bg-indigo-950/50 border-indigo-800/40 text-indigo-400'
                      : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                  }`}
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {title && (
                  <h3 className="text-sm sm:text-base font-bold leading-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p
                    className={`text-[11px] sm:text-xs leading-normal mt-0.5 line-clamp-2 ${
                      isDark ? 'text-zinc-400' : 'text-slate-500'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={handleSafeClose}
                  disabled={preventCloseOnLoading && isSubmitting}
                  aria-label="Close modal"
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  } ${preventCloseOnLoading && isSubmitting ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-5 overscroll-contain ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Modal Footer (Pinned) */}
        {footer && (
          <div
            className={`px-5 py-3.5 border-t shrink-0 flex items-center justify-end gap-2.5 ${
              isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-100 bg-slate-50/80'
            } ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
