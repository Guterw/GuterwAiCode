import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../config/dexieDb';
import { aiService } from '../services/AiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useGitHubRepo } from '../contexts/GitHubRepoContext';
import { githubService } from '../services/GitHubService';
import { Send, Loader2, Bot, User } from 'lucide-react';
import GithubIcon from './icons/GithubIcon';

const MODEL_LABELS = {
  'Owl Alpha': 'OWL-Gemma-2',
  'Nemotron 3 Ultra': 'NVIDIA-Nemotron',
};

export default function ChatArea() {
  const { id } = useParams();
  const chatId = Number(id);
  const { lang } = useLanguage();
  const githubRepo = useGitHubRepo();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Antes: dbOperations.db.chats.get(...) falhava pois `db` não existia em dbOperations.
  // useLiveQuery retorna `undefined` tanto enquanto a query carrega quanto quando o
  // registro não existe; usamos `null` como sentinela própria para "não encontrado".
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

      // Se houver um repositório GitHub conectado, monta o contexto que o
      // AiService vai injetar no system prompt e usar para resolver pedidos
      // de leitura de arquivo feitos pela IA durante a resposta.
      const repoOptions = githubRepo?.isConnected
        ? {
            fullName: githubRepo.repo.fullName,
            branch: githubRepo.repo.branch,
            treeText: githubService.renderTreeAsText(githubRepo.tree),
            getFileContent: githubRepo.getFileContent,
          }
        : null;

      const response = await aiService.sendMessage(history, currentChat.model, lang, repoOptions);
      await dbOperations.addMessage(chatId, 'assistant', response);
    } catch (error) {
      console.error(error);
      await dbOperations.addMessage(chatId, 'assistant', 'Ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enquanto o chat ainda não carregou do IndexedDB, mostra um loader isolado
  // (e não misturado com o restante do layout, que era o bug original).
  if (currentChat === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0c] text-blue-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  // Chat não existe (ex: foi deletado, ou id inválido)
  if (currentChat === null) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0c] text-gray-500">
        Conversa não encontrada.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0c]">
      {/* Header com título, modelo e indicador de repositório conectado */}
      <header className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 gap-3">
        <h2 className="font-medium text-blue-400 truncate">{currentChat.title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {githubRepo?.isConnected && (
            <span
              title={`Repositório conectado: ${githubRepo.repo.fullName}`}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 text-blue-300 rounded border border-blue-500/40 bg-blue-500/5"
            >
              <GithubIcon size={11} />
              <span className="max-w-30 truncate normal-case tracking-normal">
                {githubRepo.repo.fullName}
              </span>
            </span>
          )}
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 text-white rounded border border-blue-500">
            {MODEL_LABELS[currentChat.model] || currentChat.model}
          </span>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Seletor de modelo inicial */}
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
            {githubRepo?.isConnected && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                <GithubIcon size={12} />
                Repositório <span className="text-blue-400">{githubRepo.repo.fullName}</span> conectado e disponível para esta conversa.
              </p>
            )}
          </div>
        )}

        {messages?.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-purple-400" />
              </div>
            )}
            <div
              className={`max-w-[70%] p-4 rounded-2xl whitespace-pre-wrap wrap-break-word ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1a1a] border border-white/5 text-gray-200'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
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