import React from 'react';
import { Plus, X } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';

interface ManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  manualName: string;
  setManualName: (val: string) => void;
  manualPhone: string;
  setManualPhone: (val: string) => void;
  manualEmail: string;
  setManualEmail: (val: string) => void;
  manualType: string;
  setManualType: (val: string) => void;
  manualPlatform: string;
  setManualPlatform: (val: string) => void;
  manualDescription: string;
  setManualDescription: (val: string) => void;
}

export const ManualRequestModal: React.FC<ManualRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  manualName,
  setManualName,
  manualPhone,
  setManualPhone,
  manualEmail,
  setManualEmail,
  manualType,
  setManualType,
  manualPlatform,
  setManualPlatform,
  manualDescription,
  setManualDescription
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 animate-fade-in ${
        isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold">إدخال طلب خارجي يدوياً</h3>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              اسم صاحب الطلب / الموكل *
            </label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="الاسم الكامل"
              className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                رقم الهاتف / واتساب
              </label>
              <input
                type="tel"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="+964..."
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="email@example.com"
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                نوع الطلب
              </label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                {DEFAULT_CASE_TYPES.map(ct => (
                  <option key={ct.id} value={ct.labelAr}>{ct.labelAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                المنصة المصدر
              </label>
              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                {DEFAULT_PLATFORMS.map(p => (
                  <option key={p.id} value={p.name}>{p.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              تفاصيل المشكلة والطلب
            </label>
            <textarea
              rows={3}
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="اكتب ما ذكره العميل بالتفصيل..."
              className={`w-full rounded-xl p-3 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              حفظ الطلب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
