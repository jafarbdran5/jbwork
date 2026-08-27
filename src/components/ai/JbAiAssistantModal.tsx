import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { executeAssistantCommand } from './assistantTools';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  ShieldCheck, 
  Lightbulb, 
  DollarSign, 
  Search, 
  CheckSquare,
  AlertTriangle,
  Users,
  Copy,
  Check
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  data?: any;
}

export const JbAiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { userProfile, isSuperAdmin, isAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'ai',
      text: isRTL 
        ? `مرحباً ${userProfile?.displayName || 'جعفر'}! أنا المساعد التنفيذي لمنظومة جعفر بدران (JAAFAR BDRAN SYSTEM).
أنا متصل مباشرة بقاعدة بيانات المنظومة محلياً للبحث في القضايا، إدارة المهام، كشف التكرارات، وتحليل البيانات المالية.` 
        : `Hello ${userProfile?.displayName || 'Jaafar'}! I am your executive assistant in JAAFAR BDRAN SYSTEM.
Directly connected to the local database to search cases, manage tasks, detect duplicates, and review analytics.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const query = customPrompt || inputText;
    if (!query.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setIsThinking(true);

    try {
      // Execute command through real local tool layer
      const result = await executeAssistantCommand(query, {
        userProfile,
        isSuperAdmin,
        isAdmin
      });

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: isRTL ? result.replyAr : result.replyEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: result.data
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: isRTL ? `حدث خطأ أثناء معالجة الطلب: ${e.message}` : `Error processing request: ${e.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#27272A] bg-gradient-to-r from-indigo-950/40 via-[#18181B] to-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {isRTL ? 'المساعد الذكي لمنظومة جعفر بدران' : 'JB System AI Assistant'}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  100% Offline Database Connected
                </span>
              </h3>
              <p className="text-[11px] text-[#A1A1AA]">
                {isRTL ? 'أدوات بحث حية ومباشرة في القضايا والمهام والأمان' : 'Direct live operations & case query engine'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-[#27272A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Command Chips */}
        <div className="px-4 py-2.5 border-b border-[#27272A] bg-[#18181B]/60 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <button
            onClick={() => handleSendMessage(isRTL ? 'اعرضلي القضايا النشطة' : 'Show active cases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            {isRTL ? 'القضايا النشطة' : 'Active Cases'}
          </button>

          <button
            onClick={() => handleSendMessage(isRTL ? 'شو عندي اليوم؟' : 'What do I have today?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            {isRTL ? 'شو عندي اليوم؟' : 'My Day & Tasks'}
          </button>
          
          <button
            onClick={() => handleSendMessage(isRTL ? 'دورلي على القضايا المكررة' : 'Find duplicate cases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            {isRTL ? 'فحص القضايا المكررة' : 'Scan Duplicates'}
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => handleSendMessage(isRTL ? 'الوضع المالي والأرباح' : 'Financial summary')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              {isRTL ? 'الوضع المالي' : 'Finances'}
            </button>
          )}

          <button
            onClick={() => handleSendMessage(isRTL ? 'استعراض أعضاء الفريق' : 'Show team members')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            {isRTL ? 'أعضاء الفريق' : 'Team'}
          </button>
        </div>

        {/* Messages Container */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 font-sans text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="max-w-[85%] group relative">
                <div
                  className={`p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-[#18181B] border border-[#27272A] text-zinc-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.text}
                </div>

                <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-zinc-500">
                  <span>{m.timestamp}</span>
                  {m.sender === 'ai' && (
                    <button
                      onClick={() => handleCopyText(m.text, m.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">{isRTL ? 'تم النسخ' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{isRTL ? 'نسخ' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 items-center text-zinc-400 text-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-[#18181B] border border-[#27272A] px-4 py-2.5 rounded-2xl text-zinc-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs">{isRTL ? 'جاري فحص قاعدة البيانات وتنفيذ الأمر...' : 'Querying local database & executing tool...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#27272A] bg-[#18181B] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              isRTL 
                ? 'اكتب طلبك أو أمرك هنا (مثال: اعرضلي القضايا النشطة، أضف مهمة، دورلي على التكرارات)...' 
                : 'Ask a question or enter command (e.g. Show active cases, create task)...'
            }
            className="flex-1 bg-[#121214] border border-[#27272A] focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isThinking}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 text-sm transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{isRTL ? 'إرسال' : 'Send'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
