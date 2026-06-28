import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../config/dexieDb';
import { aiService } from '../services/AiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useGitHubRepo } from '../contexts/GitHubRepoContext';
import { githubService } from '../services/GitHubService';
import { Send, Loader2, Bot, User, Paperclip, X } from 'lucide-react'; // Adicionei ícones novos aqui
import GithubIcon from './icons/GithubIcon';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MODEL_LABELS = {
  'Owl Alpha': 'OWL-Gemma-2',
  'Nemotron 3 Ultra': 'NVIDIA-Nemotron',
};

// Componente de Interpretação da IA (Com os espaçamentos mb-5 e whitespace-pre-wrap corrigidos)
function MarkdownMessage({ content }) {
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
}

export default function ChatArea() {
  const { id } = useParams();
  const chatId = Number(id);
  const { lang } = useLanguage();
  const githubRepo = useGitHubRepo();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const currentChat = useLiveQuery(
    async () => (await dbOperations.db.chats.get(chatId)) ?? null,
    [chatId]
  );
  const messages = useLiveQuery(
    () => dbOperations.getMessagesByChat(chatId),
    [chatId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectModel = async (modelName) => {
    if (!currentChat) return;
    await dbOperations.updateChatInfo(chatId, currentChat.title, modelName);
  };

  // --- NOVAS FUNÇÕES: Fixar e Remover Repositório do Chat ---
  const handleAttachRepository = async () => {
    if (!currentChat || !githubRepo?.isConnected) return;
    // Atualiza diretamente no Dexie adicionando a propriedade 'repository'
    await dbOperations.db.chats.update(chatId, { repository: githubRepo.repo.fullName });
  };

  const handleRemoveRepository = async () => {
    if (!currentChat) return;
    await dbOperations.db.chats.update(chatId, { repository: null });
  };
  // ------------------------------------------------------------

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentChat) return;

    const userText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const isFirstMessage = !messages || messages.length === 0;
      if (isFirstMessage) {
        const newTitle = userText.substring(0, 25) + (userText.length > 25 ? '...' : '');
        await dbOperations.updateChatInfo(chatId, newTitle, currentChat.model);
      }

      await dbOperations.addMessage(chatId, 'user', userText);

      const history = (messages || []).map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: userText });

      // AGORA A IA SÓ RECEBE O REPOSITÓRIO SE ELE ESTIVER FIXADO NESTE CHAT ESPECÍFICO
      // E se o repositório atual conectado bater com o fixado (para poder ler os arquivos)
      let repoOptions = null;
      
      if (githubRepo?.isConnected) {
        // PRIORIDADE 1: Repo conectado globalmente
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
          // Se precisar buscar arquivos, a função getFileContent deve ser tratada
          // para suportar a busca baseada apenas no fullName.
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0c]">
      <header className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 gap-3">
        <h2 className="font-medium text-blue-400 truncate">{currentChat.title}</h2>
        
        <div className="flex items-center gap-3 shrink-0">
          
          {/* LÓGICA VISUAL DO REPOSITÓRIO FIXADO NO HEADER */}
          {currentChat.repository ? (
            // Se tem repositório fixo, mostra o badge com opção de remover
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
            // Se NÃO tem repositório fixo, mas tem um global conectado, oferece para fixar
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
            
            {/* Dica para o usuário fixar o repositório se ele estiver criando a conversa agora */}
            {githubRepo?.isConnected && !currentChat.repository && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                Dica: Clique em "Fixar {githubRepo.repo.fullName.split('/')[1]}" no topo para atrelar os arquivos a este chat.
              </p>
            )}
          </div>
        )}

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

        {isLoading && (
          <div className="flex items-center gap-2 text-blue-500 text-sm pl-11">
            <Loader2 className="animate-spin" size={14} />
            IA pensando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#0a0a0c] shrink-0">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            className="flex-1 bg-[#1a1a1a] border border-white/10 p-4 rounded-xl focus:outline-none focus:border-blue-500 text-gray-100"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite algo..."
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="p-4 bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}