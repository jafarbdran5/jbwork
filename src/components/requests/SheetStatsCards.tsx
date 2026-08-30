import React from 'react';
import { FileSpreadsheet, CheckCircle2, Clock, Paperclip, Layers } from 'lucide-react';
import { useTheme } from '../../lib/theme';

interface SheetStatsCardsProps {
  totalRows: number;
  convertedCases: number;
  newUnlinked: number;
  withFiles: number;
  tabsCount: number;
}

export const SheetStatsCards: React.FC<SheetStatsCardsProps> = ({
  totalRows,
  convertedCases,
  newUnlinked,
  withFiles,
  tabsCount
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const stats = [
    {
      id: 'total',
      label: 'إجمالي الاستجابات الواردة',
      value: totalRows,
      icon: FileSpreadsheet,
      color: 'text-indigo-500',
      bgColor: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
      borderColor: isDark ? 'border-indigo-500/20' : 'border-indigo-200'
    },
    {
      id: 'converted',
      label: 'تم التحويل / الربط بقضايا',
      value: convertedCases,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      borderColor: isDark ? 'border-emerald-500/20' : 'border-emerald-200'
    },
    {
      id: 'pending',
      label: 'استجابات جديدة قيد المعالجة',
      value: newUnlinked,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      borderColor: isDark ? 'border-amber-500/20' : 'border-amber-200'
    },
    {
      id: 'files',
      label: 'تحتوي مستندات ومرفقات',
      value: withFiles,
      icon: Paperclip,
      color: 'text-blue-500',
      bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      borderColor: isDark ? 'border-blue-500/20' : 'border-blue-200'
    },
    {
      id: 'tabs',
      label: 'أوراق العمل المتصلة',
      value: tabsCount,
      icon: Layers,
      color: 'text-violet-500',
      bgColor: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
      borderColor: isDark ? 'border-violet-500/20' : 'border-violet-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {stats.map(s => {
        const Icon = s.icon;
        return (
          <div
            key={s.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              isDark 
                ? 'bg-[#18181B] border-[#27272A] hover:border-zinc-700' 
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {s.label}
              </span>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${s.bgColor} ${s.borderColor}`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {s.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};
