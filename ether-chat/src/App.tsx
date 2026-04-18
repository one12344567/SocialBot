/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  History, 
  Settings, 
  MoreVertical, 
  Sparkles, 
  Edit3, 
  Lightbulb, 
  Paperclip, 
  ArrowUp, 
  Menu
} from 'lucide-react';
import { motion } from 'motion/react';

type ChatHistoryItem = { role: 'user' | 'bot'; content: string };
type PersonaOption = { id: string; name: string };

const CURRENT_CHAT_STORAGE_KEY = 'currentChatHistory';
const HISTORY_STORAGE_KEY = 'historyRecords';
const PERSONA_STORAGE_KEY = 'personaId';
const THREAD_ID_STORAGE_KEY = 'threadId';

const FALLBACK_PERSONAS: PersonaOption[] = [
  { id: 'kobe_fan', name: '科比球迷' },
  { id: 'gentle_friend', name: '温柔陪伴' },
  { id: 'travel_helper', name: '城市玩乐向导' },
];

function readListFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function createThreadId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export default function App() {
    // 文件上传处理
    const handleFileUpload = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      })
        .then(async res => {
          if (!res.ok) throw new Error('上传失败');
          const data = await res.json();
          alert('上传成功: ' + (data.filename || file.name));
        })
        .catch(() => {
          alert('上传失败');
        });
    }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>(() => readListFromStorage<ChatHistoryItem>(CURRENT_CHAT_STORAGE_KEY));
  const [historyRecords, setHistoryRecords] = useState<ChatHistoryItem[]>(() => readListFromStorage<ChatHistoryItem>(HISTORY_STORAGE_KEY));
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<'chats' | 'history' | 'settings'>('chats');
  const inputRef = useRef<HTMLInputElement>(null);
  // 设置相关
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || '默认');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('fontSize')) || 15);
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || '简体中文');
  const [threadId, setThreadId] = useState(() => localStorage.getItem(THREAD_ID_STORAGE_KEY) || createThreadId());
  const [personas, setPersonas] = useState<PersonaOption[]>(FALLBACK_PERSONAS);
  const [personaId, setPersonaId] = useState(() => localStorage.getItem(PERSONA_STORAGE_KEY) || FALLBACK_PERSONAS[0].id);

  // 动态切换主题色
  React.useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  // 动态切换字体大小
  React.useEffect(() => {
    document.documentElement.style.setProperty('--msg-font-size', fontSize + 'px');
    localStorage.setItem('fontSize', String(fontSize));
  }, [fontSize]);
  // 动态切换语言
  React.useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  // 会话与历史持久化
  React.useEffect(() => {
    localStorage.setItem(CURRENT_CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  React.useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyRecords));
  }, [historyRecords]);

  React.useEffect(() => {
    localStorage.setItem(THREAD_ID_STORAGE_KEY, threadId);
  }, [threadId]);

  React.useEffect(() => {
    localStorage.setItem(PERSONA_STORAGE_KEY, personaId);
  }, [personaId]);

  // 拉取后端可用人设
  React.useEffect(() => {
    let cancelled = false;

    const fetchPersonas = async () => {
      try {
        const res = await fetch('http://localhost:8000/personas');
        if (!res.ok) {
          throw new Error('获取人设失败');
        }

        const data = await res.json();
        const remotePersonas = Array.isArray(data.personas)
          ? (data.personas as PersonaOption[]).filter((item) => item && item.id && item.name)
          : [];

        if (!cancelled && remotePersonas.length > 0) {
          setPersonas(remotePersonas);
          const defaultPersonaId = typeof data.default_persona_id === 'string' ? data.default_persona_id : remotePersonas[0].id;
          setPersonaId((prev) => {
            if (remotePersonas.some((item) => item.id === prev)) return prev;
            return remotePersonas.some((item) => item.id === defaultPersonaId) ? defaultPersonaId : remotePersonas[0].id;
          });
        }
      } catch {
        if (!cancelled) {
          setPersonas(FALLBACK_PERSONAS);
          setPersonaId((prev) => (FALLBACK_PERSONAS.some((item) => item.id === prev) ? prev : FALLBACK_PERSONAS[0].id));
        }
      }
    };

    void fetchPersonas();
    return () => {
      cancelled = true;
    };
  }, []);

  const appendMessage = React.useCallback((msg: ChatHistoryItem) => {
    setChatHistory((prev) => [...prev, msg]);
    setHistoryRecords((prev) => [...prev, msg]);
  }, []);

  // 发送消息到后端
  const sendMessage = async (messageOverride?: string) => {
    if (loading) return;
    const content = (messageOverride ?? message).trim();
    if (!content) return;

    appendMessage({ role: 'user', content });
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: content,
          thread_id: threadId,
          persona_id: personaId,
        })
      });

      if (!res.ok) throw new Error('请求失败');
      const data = await res.json();
      const reply = typeof data.reply === 'string' ? data.reply : '抱歉，我暂时没有生成内容。';
      appendMessage({ role: 'bot', content: reply });
    } catch {
      appendMessage({ role: 'bot', content: '后端连接失败，请检查服务是否启动。' });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // 新建会话
  const handleNewChat = () => {
    setChatHistory([]);
    setMessage('');
    setThreadId(createThreadId());
    setPage('chats');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 h-full w-64 glass-panel p-6 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg ether-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-headline">Ether Chat</h1>
            <p className="text-[9px] uppercase tracking-widest text-primary font-bold opacity-80">Premium Assistant</p>
          </div>
        </div>

        <button
          className="ether-gradient text-white w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mb-8 active:scale-95 transition-transform duration-200 shadow-xl shadow-indigo-500/25"
          onClick={handleNewChat}
        >
          <Plus className="w-5 h-5" />
          <span className="font-headline text-sm">New Chat</span>
        </button>

        <nav className="flex-1 space-y-1.5">
          <NavItem icon={<MessageSquare className="w-5 h-5" />} label="Chats" active={page==='chats'} onClick={() => setPage('chats')} />
          <NavItem icon={<History className="w-5 h-5" />} label="History" active={page==='history'} onClick={() => setPage('history')} />
          <NavItem icon={<Settings className="w-5 h-5" />} label="Settings" active={page==='settings'} onClick={() => setPage('settings')} />
        </nav>

        <div className="pt-6 border-t border-white/30">
          <div className="flex items-center gap-3 px-2 py-2.5 hover:bg-white/40 rounded-xl transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full border-2 border-white/80 overflow-hidden shadow-sm">
              <img 
                src="https://picsum.photos/seed/alex/100/100" 
                alt="User Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-extrabold text-slate-800 truncate">Alex Chen</p>
              <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-wider">Premium Plan</p>
            </div>
            <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center w-full px-6 py-4 glass-panel z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <span className="text-base font-bold text-slate-900 font-headline">Ether Chat</span>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden">
             <img src="https://picsum.photos/seed/alex/100/100" alt="User" referrerPolicy="no-referrer" />
          </div>
        </header>

        {/* 二级页面内容切换 */}
        {page === 'chats' && (
          <>
            <div className="flex-1 flex flex-col p-6 md:p-8 max-w-4xl mx-auto w-full z-10 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 text-center"
              >
                <div className="floating inline-flex items-center justify-center w-20 h-20 rounded-3xl glass-card text-primary mb-8 shadow-2xl shadow-indigo-500/10">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold font-headline mb-5 tracking-tight text-slate-900 leading-tight">
                  你好呀！我是喵喵
                </h2>
                <p className="text-base md:text-lg text-slate-600 font-medium max-w-md mx-auto leading-relaxed opacity-90">
                  你的智能伴侣。随时准备好为你提供帮助、解答疑问或只是简单地聊聊天。
                </p>
              </motion.div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-8">
                <SuggestionCard 
                  icon={<Edit3 className="w-5 h-5 text-indigo-600" />} 
                  title="生成春天的诗" 
                  description="激发你的文学创作灵感" 
                  onClick={() => {
                    void sendMessage('生成一首关于春天的诗');
                  }}
                />
                <SuggestionCard 
                  icon={<Lightbulb className="w-5 h-5 text-amber-500" />} 
                  title="周末去哪儿玩？" 
                  description="发现身边那些有趣的角落" 
                  onClick={() => {
                    void sendMessage('周末去哪儿玩？请给我3个不同风格的建议。');
                  }}
                />
              </div>

              {/* 聊天消息展示区 */}
              <div className="w-full max-w-3xl mx-auto mb-4 px-1 md:px-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`my-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 max-w-[80%] whitespace-pre-line ${msg.role === 'user' ? 'bg-indigo-100 text-slate-900' : 'bg-white/80 text-slate-800 border border-indigo-100'}`}
                      style={{ fontSize: `var(--msg-font-size, ${fontSize}px)` }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="my-2 flex justify-start">
                    <div className="rounded-2xl px-4 py-2 max-w-[80%] bg-white/80 text-slate-400 border border-indigo-100 animate-pulse" style={{ fontSize: `var(--msg-font-size, ${fontSize}px)` }}>
                      喵喵正在思考中...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6 md:p-8 w-full max-w-4xl mx-auto z-10">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-indigo-500/10 rounded-[22px] blur-2xl opacity-0 group-focus-within:opacity-100 transition duration-700"></div>
                <div className="relative flex items-center glass-input rounded-[20px] pl-6 pr-2.5 py-2 shadow-2xl shadow-indigo-500/5 focus-within:border-indigo-400/50 transition-all duration-300">
                  <input 
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="给喵喵发送消息..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-4 text-[15px] font-semibold outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading) {
                        void sendMessage();
                      }
                    }}
                    disabled={loading}
                  />
                  <div className="flex items-center gap-2">
                    <label className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all cursor-pointer">
                      <Paperclip className="w-6 h-6" />
                      <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={loading} />
                    </label>
                    <button
                      className="ether-gradient text-white w-12 h-12 flex items-center justify-center rounded-[14px] shadow-lg shadow-indigo-500/30 active:scale-95 transition-all hover:brightness-110 disabled:opacity-60"
                      onClick={() => {
                        void sendMessage();
                      }}
                      disabled={loading}
                    >
                      <ArrowUp className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center mt-6 gap-1">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] opacity-80">
                  Ether Engine • Premium Mode
                </p>
              </div>
            </div>
          </>
        )}

        {page === 'history' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full z-10 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
              <History className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
              <h2 className="text-2xl font-extrabold font-headline mb-2 tracking-tight text-slate-900">历史记录</h2>
              <p className="text-base text-slate-600 font-medium opacity-90">这里会展示你所有历史会话（已持久化到本地，刷新后仍可查看）。</p>
            </motion.div>
            <div className="w-full space-y-4">
              {historyRecords.length === 0 ? (
                <div className="text-slate-400 text-center py-10">暂无历史记录</div>
              ) : (
                <GeminiHistoryView chatHistory={historyRecords} />
              )}
            </div>
          </div>
        )}

        {page === 'settings' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full z-10 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
              <Settings className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
              <h2 className="text-2xl font-extrabold font-headline mb-2 tracking-tight text-slate-900">设置</h2>
              <p className="text-base text-slate-600 font-medium opacity-90">你可以在这里调整你的偏好设置（本地存储，实时生效）。</p>
            </motion.div>
            <div className="w-full space-y-6">
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-700">人设</label>
                <select className="rounded-xl border px-4 py-2 bg-white/80 text-slate-700" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>{persona.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">你可以在 back/personas.json 中新增人设，重启后端后会自动显示在这里。</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-700">主题色</label>
                <select className="rounded-xl border px-4 py-2 bg-white/80 text-slate-700" value={theme} onChange={e => setTheme(e.target.value)}>
                  <option value="默认">默认</option>
                  <option value="深色">深色</option>
                  <option value="浅色">浅色</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-700">消息字体大小 <span className="text-xs">{fontSize}px</span></label>
                <input type="range" min="12" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-slate-700">语言</label>
                <select className="rounded-xl border px-4 py-2 bg-white/80 text-slate-700" value={lang} onChange={e => setLang(e.target.value)}>
                  <option value="简体中文">简体中文</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Subtle texture overlay */}
        <div className={`fixed inset-0 pointer-events-none opacity-[0.03] z-[-1] theme-${theme}`} style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 transition-all rounded-xl active:scale-95
        ${active 
          ? 'bg-white/60 backdrop-blur-md text-primary font-bold border border-white/40 shadow-sm' 
          : 'text-slate-600 hover:bg-white/40 font-semibold'}
      `}
    >
      {icon}
      <span className="font-headline text-sm">{label}</span>
    </button>
  );
}

function SuggestionCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick?: () => void }) {
  return (
    <button className="glass-card hover:bg-white/60 transition-all p-6 rounded-2xl text-left group active:scale-95" onClick={onClick}>
      <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm mb-4 border border-white/50">
        {icon}
      </div>
      <p className="text-[15px] font-bold text-slate-900 mb-1.5">{title}</p>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
    </button>
  );
}

// Gemini 风格历史记录分组展示（需放在组件外部）
function GeminiHistoryView(props: { chatHistory: ChatHistoryItem[] }) {
    // 将历史分组为一问一答
    const groups: { user?: string, bot?: string }[] = [];
    const chatHistory = props.chatHistory;
    for (let i = 0; i < chatHistory.length; i++) {
        if (chatHistory[i].role === 'user') {
            groups.push({ user: chatHistory[i].content });
            if (chatHistory[i + 1] && chatHistory[i + 1].role === 'bot') {
                groups[groups.length - 1].bot = chatHistory[i + 1].content;
                i++;
            }
        }
    }
    return (
        <div className="space-y-6">
            {groups.map((g, idx) => (
                <div key={idx} className="rounded-2xl bg-white/90 border border-indigo-100 shadow p-5">
                    <div className="flex items-start gap-2 mb-2">
                        <span className="font-bold text-indigo-500">你：</span>
                        <span className="whitespace-pre-line text-slate-900">{g.user}</span>
                    </div>
                    {g.bot && (
                        <div className="flex items-start gap-2 mt-2">
                            <span className="font-bold text-emerald-600">喵喵：</span>
                            <span className="whitespace-pre-line text-slate-800">{g.bot}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
