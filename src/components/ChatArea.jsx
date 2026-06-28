import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../config/dexieDb';
import { aiService } from '../services/AiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useGitHubRepo } from '../contexts/GitHubRepoContext';
import { githubService } from '../services/GitHubService';
import { Send, Loader2, Bot, User, Paperclip, X, ChevronUp } from 'lucide-react';
import GithubIcon from './icons/GithubIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ChatInput from './ChatInput';

const MODEL_LABELS = {
  'Owl Alpha': 'OWL-Gemma-2',
  'Nemotron 3 Ultra': 'NVIDIA-Nemotron',
};

// Componente de Interpretação da IA (inalterado)
const MarkdownMessage = React.memo(function MarkdownMessage({ content }) {
  return (
    <div className="text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="mb-5 whitespace-pre-wrap leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-5 space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-5 space-y-2" {...props} />,
          li: ({ node, ...props }) => <li className="text-gray-200" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-blue-400" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-blue-400" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-blue-300" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-gray-100" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-gray-800 border border-gray-700 rounded-lg" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 bg-[#111115] text-left text-sm font-semibold text-gray-200 uppercase tracking-wider" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700" {...props} />
          ),
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match) {
              return (
                <div className="mt-4 mb-6 rounded-md overflow-hidden border border-gray-700 bg-[#0d0d0d]">
                  <div className="bg-[#111115] text-gray-400 px-4 py-1.5 text-xs font-mono uppercase border-b border-gray-700">
                    {match[1]}
                  </div>
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            return (
              <code className="bg-gray-800 text-purple-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => (
            <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
})

const PAGE_SIZE = 3; // Mensagens por página (renderização)

export default function ChatArea() {
  const { id } = useParams();
  const chatId = Number(id);
  const { lang } = useLanguage();
  const githubRepo = useGitHubRepo();

  // --- ESTADOS ---
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const loadMoreRef = useRef(null);

  // --- QUERIES DEXIE ---
  // Chat atual (reativo)
  const currentChat = useLiveQuery(
    async () => (await dbOperations.db.chats.get(chatId)) ?? null,
    [chatId]
  );

  // Total de mensagens (reativo, leve - só conta)
  const totalMessages = useLiveQuery(
    () => dbOperations.countMessagesByChat(chatId),
    [chatId]
  );

  // Mensagens renderizadas (estado local paginado)
  const [messages, setMessages] = useState([]);

  // --- EFEITOS DE PAGINAÇÃO ---
  // Carrega primeira página (mais recentes) quando o chat muda
  useEffect(() => {
    if (currentChat === undefined || currentChat === null) return;
    setOffset(0);
    setMessages([]);
    loadInitialPage();
  }, [currentChat]);

  const loadInitialPage = useCallback(async () => {
    const page = await dbOperations.getMessagesPaginated(chatId, PAGE_SIZE, 0);
    setMessages(page.reverse()); // Inverte para ordem cronológica (antiga -> nova)
    setOffset(PAGE_SIZE);
    setHasMore(page.length === PAGE_SIZE);
  }, [chatId]);

  // Carrega mensagens mais antigas (botão "Carregar mais")
  const loadMore = useCallback(async () => {
    if (loadingHistory || !hasMore) return;
    setLoadingHistory(true);
    try {
      const page = await dbOperations.getMessagesPaginated(chatId, PAGE_SIZE, offset);
      if (page.length === 0) {
        setHasMore(false);
        return;
      }
      // Prepend: mensagens mais antigas vão para o INÍCIO do array
      setMessages(prev => [...page.reverse(), ...prev]);
      setOffset(prev => prev + page.length);
      setHasMore(page.length === PAGE_SIZE);
      // Mantém scroll posicionado no botão "carregar mais"
      requestAnimationFrame(() => {
        loadMoreRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [chatId, offset, loadingHistory, hasMore]);

  // Auto-scroll para novas respostas da IA
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- HANDLERS EXISTENTES (MANTIDOS) ---
  const handleSelectModel = async (modelName) => {
    if (!currentChat) return;
    await dbOperations.updateChatInfo(chatId, currentChat.title, modelName);
  };

  const handleAttachRepository = async () => {
    if (!currentChat || !githubRepo?.isConnected) return;
    await dbOperations.db.chats.update(chatId, { repository: githubRepo.repo.fullName });
  };

  const handleRemoveRepository = async () => {
    if (!currentChat) return;
    await dbOperations.db.chats.update(chatId, { repository: null });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentChat) return;

    const userText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Detecta se é a primeira mensagem real do chat (estado vazio + sem mais histórico)
      const isFirstMessage = messages.length === 0 && offset === 0 && !hasMore;
      if (isFirstMessage) {
        const newTitle = userText.substring(0, 25) + (userText.length > 25 ? '...' : '');
        await dbOperations.updateChatInfo(chatId, newTitle, currentChat.model);
      }

      await dbOperations.addMessage(chatId, 'user', userText);

      // ⚡️ MUDANÇA CHAVE: Busca TODAS as mensagens do banco para contexto da IA
      // (ignora paginação do frontend)
      const fullHistory = await dbOperations.getMessagesByChat(chatId);
      const history = fullHistory.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: userText });

      // Sua lógica de Repositório (INALTERADA)
      let repoOptions = null;
      if (githubRepo?.isConnected) {
        repoOptions = {
          fullName: githubRepo.repo.fullName,
          branch: githubRepo.repo.branch,
          treeText: githubService.renderTreeAsText(githubRepo.tree),
          getFileContent: githubRepo.getFileContent,
        };
      } else if (currentChat.repository) {
        repoOptions = {
          fullName: currentChat.repository,
          branch: githubRepo.repo.branch,
          treeText: githubService.renderTreeAsText(githubRepo.tree),
          getFileContent: githubRepo.getFileContent,
        };
      }

      const response = await aiService.sendMessage(history, currentChat.model, lang, repoOptions);
      await dbOperations.addMessage(chatId, 'assistant', response);
    } catch (error) {
      console.error(error);
      await dbOperations.addMessage(chatId, 'assistant', 'Ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOADING / NOT FOUND (INALTERADO) ---
  if (currentChat === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0c] text-blue-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (currentChat === null) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0c] text-gray-500">
        Conversa não encontrada.
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0c]">
      <header className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 gap-3">
        <h2 className="font-medium text-blue-400 truncate">{currentChat.title}</h2>

        <div className="flex items-center gap-3 shrink-0">
          {/* Lógica visual do Repositório Fixado (INALTERADA) */}
          {currentChat.repository ? (
            <div className="flex items-center gap-0 overflow-hidden rounded border border-blue-500/40 bg-blue-500/5">
              <span
                title={`Repositório fixado nesta conversa: ${currentChat.repository}`}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 text-blue-300"
              >
                <GithubIcon size={11} />
                <span className="max-w-30 truncate normal-case tracking-normal">
                  {currentChat.repository}
                </span>
              </span>
              <button
                onClick={handleRemoveRepository}
                className="px-1.5 py-1 text-blue-400 hover:bg-blue-500/20 hover:text-red-400 transition-colors border-l border-blue-500/20"
                title="Desvincular repositório"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            githubRepo?.isConnected && (
              <button
                onClick={handleAttachRepository}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 text-gray-400 hover:text-blue-300 rounded border border-gray-700 hover:border-blue-500/40 transition-colors"
                title="Fixar este repositório para ser usado apenas nesta conversa"
              >
                <Paperclip size={11} />
                Fixar {githubRepo.repo.fullName.split('/')[1]}
              </button>
            )
          )}

          <span className="text-[10px] uppercase tracking-widest px-2 py-1 text-white rounded border border-blue-500">
            {MODEL_LABELS[currentChat.model] || currentChat.model}
          </span>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* BOTÃO CARREGAR MAIS (NOVO - TOPO DA LISTA) */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center pt-2">
            <button
              onClick={loadMore}
              disabled={loadingHistory}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white border border-white/10 rounded-full transition-colors disabled:opacity-50"
            >
              {loadingHistory ? (
                <> <Loader2 className="animate-spin inline mr-1" size={12} /> Carregando...</>
              ) : (
                <> <ChevronUp className="inline mr-1" size={12} /> Carregar mensagens anteriores</>
              )}
            </button>
          </div>
        )}

        {/* TELA VAZIA / ESCOLHA DE MODELO (INALTERADA) */}
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h3 className="text-xl font-light text-gray-400 mb-4">Escolha seu motor:</h3>
            <div className="flex gap-4">
              {Object.keys(MODEL_LABELS).map((m) => (
                <button
                  key={m}
                  onClick={() => handleSelectModel(m)}
                  className={`px-6 py-3 rounded-xl border transition-colors ${
                    currentChat.model === m
                      ? 'border-blue-500 bg-blue-600/10 text-white'
                      : 'border-white/10 hover:border-white/20 text-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {githubRepo?.isConnected && !currentChat.repository && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                Dica: Clique em "Fixar {githubRepo.repo.fullName.split('/')[1]}" no topo para atrelar os arquivos a este chat.
              </p>
            )}
          </div>
        )}

        {/* LISTA DE MENSAGENS PAGINADA (USA STATE `messages` LOCAL) */}
        {messages?.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-purple-400" />
              </div>
            )}

            <div
              className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl wrap-break-word ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white whitespace-pre-wrap'
                  : 'bg-[#1a1a1a] border border-white/5'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <MarkdownMessage content={msg.content} />
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {/* LOADING IA PENSANDO (INALTERADO) */}
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-500 text-sm pl-11">
            <Loader2 className="animate-spin" size={14} />
            IA pensando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT (INALTERADO) */}
      <ChatInput
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onSubmit={handleSendMessage}
        disabled={isLoading}
        placeholder="Digite algo..."
      />
    </div>
  );
}