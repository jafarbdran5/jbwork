import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { useAppLabel } from '../../lib/useDynamicLabels';
import { QuickRenameModal } from './QuickRenameModal';
import { useAuth } from '../../lib/auth';
import { hasPermission } from '../../lib/permissionGuard';

interface DynamicLabelTextProps {
  id: string;
  defaultText: string;
  className?: string;
  showEditIcon?: boolean;
  onRenamed?: (newLabel: string) => void;
  wrapperClassName?: string;
  tag?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';
}

export const DynamicLabelText: React.FC<DynamicLabelTextProps> = ({
  id,
  defaultText,
  className = '',
  showEditIcon = true,
  onRenamed,
  wrapperClassName = 'inline-flex items-center gap-1.5 group',
  tag = 'span'
}) => {
  const label = useAppLabel(id, defaultText);
  const { userProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canEdit = userProfile?.role === 'super_admin' || hasPermission(userProfile, 'sections_manage');

  const TagComponent = tag as any;

  return (
    <>
      <span className={wrapperClassName}>
        <TagComponent className={className}>
          {label}
        </TagComponent>

        {showEditIcon && canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsModalOpen(true);
            }}
            title={`إعادة تسمية: ${label} (ID: ${id})`}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded transition-all shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </span>

      {isModalOpen && (
        <QuickRenameModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          labelId={id}
          defaultFallback={defaultText}
          onSuccess={onRenamed}
        />
      )}
    </>
  );
};
