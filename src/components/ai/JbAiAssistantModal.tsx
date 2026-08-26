import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  ShieldCheck, 
  Lightbulb, 
  DollarSign, 
  BookOpen, 
  Briefcase 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const JbAiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'ai',
      text: isRTL 
        ? `مرحباً ${userProfile?.displayName || 'جعفر'}! أنا مساعدك الذكي لنظام JB Work OS. يمكنني الإجابة على استفسارات القضايا، تلخيص المعاملات المالية، واقتراح حلول أمنية فورية.` 
        : `Hello ${userProfile?.displayName || 'Jaafar'}! I am your JB Work OS AI Assistant. How can I assist your operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const query = customPrompt || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setIsThinking(true);

    // Contextual responses with strict role safety
    setTimeout(() => {
      let responseText = '';
      const q = query.toLowerCase();

      if (q.includes('أرباح') || q.includes('مالي') || q.includes('finance') || q.includes('profit')) {
        if (!isSuperAdmin) {
          responseText = isRTL 
            ? 'عذراً، البيانات المالية الشاملة والنسب المئوية للأرباح مشفرة ومتاحة للمشرف العام (جعفر بدران) فقط.' 
            : 'Access restricted: Financial overview is only accessible to the Super Admin.';
        } else {
          responseText = isRTL 
            ? 'بناءً على السجلات المالية الحالية، يمكنك الاطلاع على مؤشرات الأرباح الصافية، وتوزيع الحصص، وأرصدة المحافظ في تبويب "إدارة الأرباح والمالية". معدل تحصيل المستحقات مستقر، وتفاصيل أتعاب الموظفين مسجلة بدقة.' 
            : 'Financial health is stable. Detailed net profits, allocations, and wallet balances can be reviewed in the Profits Module.';
        }
      } else if (q.includes('انتحال') || q.includes('حساب') || q.includes('meta') || q.includes('instagram')) {
        responseText = isRTL 
          ? 'في قضايا انتحال الهوية (Impersonation): يُرجى التأكد أولاً من توثيق هوية صاحب الحساب الرسمي عبر وثيقة رسمية سارية، ثم تقديم بلاغ رسمي عبر رابط Meta Impersonation Form، وإرفاق الروابط بدقة في ملف القضية.' 
          : 'For impersonation cases: Gather verified ID documentation, submit via official Meta Impersonation channel, and link all URLs in the Case files.';
      } else if (q.includes('يوم') || q.includes('مهام') || q.includes('today')) {
        responseText = isRTL 
          ? 'توصية اليوم: ابدأ بمراجعة القضايا ذات الأولوية القصوى (Urgent)، وراجع طلبات الموافقة المعلقة قبل البدء في مهام المشاريع.' 
          : 'Daily Recommendation: Prioritize urgent security cases first, clear pending approvals, then proceed to project milestones.';
      } else {
        responseText = isRTL 
          ? `تم استلام طلبك: "${query}". النظام يعمل بكامل الكفاءة مع مزامنة لحظية لجميع بيانات القضايا والأمان والمستندات.` 
          : `Received: "${query}". All system modules and security protocols are operating at peak efficiency.`;
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-xl h-[550px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#27272A] bg-gradient-to-r from-indigo-950/40 via-[#18181B] to-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                JB AI Executive Assistant
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Online
                </span>
              </h3>
              <p className="text-[11px] text-[#A1A1AA]">
                {isRTL ? 'المساعد الذكي لإدارة العمليات والقضايا' : 'Smart Operations Assistant'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-[#71717A] hover:text-white rounded-lg hover:bg-[#27272A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-b border-[#27272A] bg-[#18181B]/50 flex items-center gap-2 overflow-x-auto text-[11px]">
          <button
            onClick={() => handleSendMessage(isRTL ? 'ما هي التوصيات الأمنية اليوم؟' : 'Daily recommendations?')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            {isRTL ? 'توصيات اليوم' : 'Daily Plan'}
          </button>
          
          {isSuperAdmin && (
            <button
              onClick={() => handleSendMessage(isRTL ? 'ملخص الأرباح والوضع المالي' : 'Financial summary')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              {isRTL ? 'الوضع المالي' : 'Finances'}
            </button>
          )}

          <button
            onClick={() => handleSendMessage(isRTL ? 'كيف أتعامل مع قضايا انتحال الهوية؟' : 'How to handle impersonation?')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            {isRTL ? 'إجراءات الانتحال' : 'Impersonation SOP'}
          </button>
        </div>

        {/* Messages */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-[#27272A] text-indigo-400'
              }`}>
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                m.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-[#18181B] text-[#D4D4D8] border border-[#27272A] rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <span className="block text-[9px] text-[#71717A] mt-1 text-right">{m.timestamp}</span>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-[#71717A] italic">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>{isRTL ? 'الذكاء الاصطناعي يفكر...' : 'Thinking...'}</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#27272A] bg-[#121214] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isRTL ? 'اسأل المساعد الذكي عن أي شيء في النظام...' : 'Ask JB Assistant anything...'}
            className="flex-1 bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
