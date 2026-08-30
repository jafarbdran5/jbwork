import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  RotateCcw,
  ExternalLink,
  FolderOpen
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  data?: any;
  error?: boolean;
}

export const JbAiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void; onNavigate?: (view: string) => void }> = ({ 
  isOpen, 
  onClose,
  onNavigate 
}) => {
  const { userProfile, isSuperAdmin, isAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'ai',
      text: isRTL 
        ? `مرحباً ${userProfile?.displayName?.split(' ')[0] || 'بك'}! أنا المساعد الذكي لمنظومة جعفر بدران.
أنا متصل مباشرة ببيانات القضايا، الطلبات الخارجية، المهام، وأعضاء الفريق. يمكنك سؤالي عن أي قضية أو طلب، أو البحث، أو إنشاء المهام والقضايا مباشرة.` 
        : `Hello! I am your AI Operations Assistant for Jaafar Bdran System.
Directly connected to cases, external requests, tasks, and team members. Ask me anything or command actions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isThinking, isOpen]);

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
      console.error('Assistant execution error:', e);
      const errorMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: isRTL 
          ? `عذراً، حدث خطأ أثناء معالجة استفسارك: ${e?.message || 'خطأ غير معروف'}. يرجى التحقق من صياغة السؤال والمحاولة مرة أخرى.` 
          : `Error processing request: ${e?.message || 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-2xl h-[85vh] max-h-[650px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {isRTL ? 'المساعد الذكي لمنظومة جعفر بدران' : 'JB System AI Assistant'}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  متصل ومفعل
                </span>
              </h3>
              <p className="text-[11px] text-[#A1A1AA]">
                {isRTL ? 'استعلام مباشر في القضايا، الطلبات، والمهام' : 'Direct search & case operations'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-[#71717A] hover:text-white rounded-lg hover:bg-[#27272A] cursor-pointer transition-colors"
            title={isRTL ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 border-b border-[#27272A] bg-[#18181B]/60 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <button
            onClick={() => handleSendMessage(isRTL ? 'اعرضلي القضايا النشطة' : 'Show active cases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            {isRTL ? 'القضايا النشطة' : 'Active Cases'}
          </button>

          <button
            onClick={() => handleSendMessage(isRTL ? 'الطلبات الخارجية المربوطة' : 'External requests')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            {isRTL ? 'الطلبات الخارجية' : 'External Requests'}
          </button>

          <button
            onClick={() => handleSendMessage(isRTL ? 'شو عندي اليوم؟' : 'What do I have today?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            {isRTL ? 'خطة اليوم' : 'My Day'}
          </button>
          
          <button
            onClick={() => handleSendMessage(isRTL ? 'دورلي على القضايا المكررة' : 'Find duplicate cases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            {isRTL ? 'فحص التكرارات' : 'Duplicates'}
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
            onClick={() => handleSendMessage(isRTL ? 'استعراض المشرفين وفريق العمل' : 'Show team members')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            {isRTL ? 'المشرفين والفريق' : 'Team'}
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

              <div className="max-w-[88%] group relative">
                <div
                  className={`p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : m.error 
                        ? 'bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-bl-none shadow-sm'
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
            <div className="flex gap-3 items-center text-zinc-400 text-xs animate-in fade-in duration-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-[#18181B] border border-[#27272A] px-4 py-2.5 rounded-2xl text-zinc-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs font-medium">{isRTL ? 'جاري التفكير ومعالجة البيانات...' : 'Thinking and querying system database...'}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
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
                ? 'اكتب سؤالك أو أمرك هنا (مثلاً: ابحث عن قضية احمد، اعرض القضايا، انشئ مهمة)...' 
                : 'Ask a question or enter command (e.g. Search case, show requests, create task)...'
            }
            className="flex-1 bg-[#121214] border border-[#27272A] focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isThinking}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 text-sm transition-colors cursor-pointer shrink-0 min-h-[44px]"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{isRTL ? 'إرسال' : 'Send'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
