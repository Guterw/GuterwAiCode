import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../config/dexieDb';
import { aiService } from '../services/AiService';
import { Send, Loader2, Bot, Sparkles } from 'lucide-react';

export default function ChatArea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chatId = Number(id);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const currentChat = useLiveQuery(() => dbOperations.db.chats.get(chatId), [chatId]);
  const messages = useLiveQuery(() => dbOperations.getMessagesByChat(chatId), [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSelectModel = async (modelName) => {
    await dbOperations.updateChatInfo(chatId, currentChat.title, modelName);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // 1. Se for a primeira mensagem, renomeia o chat automaticamente
      if (!messages || messages.length === 0) {
        const newTitle = userText.substring(0, 25) + (userText.length > 25 ? '...' : '');
        await dbOperations.updateChatInfo(chatId, newTitle, currentChat.model);
      }

      await dbOperations.addMessage(chatId, 'user', userText);
      const history = messages?.map(m => ({ role: m.role, content: m.content })) || [];
      history.push({ role: 'user', content: userText });

      const response = await aiService.sendMessage(history, currentChat.model);
      await dbOperations.addMessage(chatId, 'assistant', response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentChat) return null;

  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0c] text-blue-400">
      <Loader2 className="animate-spin" size={32} />
      {/* Header com título e modelo */}
      <header className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-medium text-blue-400">{currentChat.title}</h2>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-white/5 rounded border border-white/10">
          {currentChat.model === 'Owl Alpha' ? 'OWL-Gemma-2' : 'NVIDIA-Nemotron'}
        </span>
      </header>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-8">
        {/* Seletor de modelo inicial */}
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h3 className="text-xl font-light text-gray-400 mb-4">Escolha seu motor:</h3>
            <div className="flex gap-4">
              {['Owl Alpha', 'Nemotron 3 Ultra'].map(m => (
                <button 
                  key={m} 
                  onClick={() => handleSelectModel(m)}
                  className={`px-6 py-3 rounded-xl border ${currentChat.model === m ? 'border-blue-500 bg-blue-600/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600' : 'bg-[#1a1a1a] border border-white/5'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-blue-500 animate-pulse text-sm">IA pensando...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#0a0a0c]">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input 
            className="flex-1 bg-[#1a1a1a] border border-white/10 p-4 rounded-xl focus:outline-none focus:border-blue-500"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite algo..."
          />
          <button className="p-4 bg-blue-600 rounded-xl hover:bg-blue-700 transition">
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}