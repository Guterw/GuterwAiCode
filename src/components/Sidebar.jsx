import React, { useState } from 'react';
import { PlusCircle, MessageSquare, Trash2, ChevronLeft, ChevronRight, BrainCircuit } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../config/dexieDb';

const MODEL_SHORT_LABEL = {
  'Owl Alpha': 'OWL',
  'Nemotron 3 Ultra': 'NVIDIA',
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const chats = useLiveQuery(() => dbOperations.getAllChats(), []);

  const handleNewChat = async () => {
    const chatId = await dbOperations.createNewChat('Owl Alpha');
    navigate(`/chat/${chatId}`);
  };

  const handleDelete = async (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Excluir chat?')) {
      await dbOperations.deleteChat(chatId);
      if (location.pathname === `/chat/${chatId}`) navigate('/');
    }
  };

  return (
    <aside className={`relative bg-[#0a0a0c] flex flex-col h-full transition-all duration-500 ease-out border-r border-white/5 shrink-0 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-blue-500/20 to-transparent"></div>

      <div className="p-6 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center gap-3 text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400 font-bold tracking-widest">
            <BrainCircuit size={24} className="text-blue-500" />
            <span className="text-sm uppercase tracking-[0.2em]">GuterwAi</span>
            <span className="-ml-2 mr-2 text-sm">Code</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5 transition-all hover:text-white"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div className="px-4 mb-6">
        <button
          onClick={handleNewChat}
          className={`flex items-center gap-3 bg-linear-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 text-blue-300 p-3 rounded-xl hover:border-blue-500/40 transition-all w-full group ${isOpen ? 'justify-start' : 'justify-center'}`}
        >
          <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
          {isOpen && <span className="font-medium text-sm">Novo Chat</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        {chats?.map((chat) => (
          <div key={chat.id} className="group relative">
            <Link
              to={`/chat/${chat.id}`}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                location.pathname === `/chat/${chat.id}`
                  ? 'bg-linear-to-r from-blue-600/20 to-transparent border-l-2 border-blue-500'
                  : 'hover:bg-white/5'
              }`}
            >
              <MessageSquare size={16} className={location.pathname === `/chat/${chat.id}` ? 'text-blue-400' : 'text-gray-600'} />

              {isOpen && (
                <div className="flex flex-col overflow-hidden flex-1">
                  <span className="truncate text-xs text-gray-300 group-hover:text-white">{chat.title}</span>
                  <span className="text-[9px] font-mono text-blue-500/60 uppercase tracking-tighter">
                    {MODEL_SHORT_LABEL[chat.model] || chat.model}
                  </span>
                </div>
              )}

              {isOpen && (
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 ml-auto p-1.5 hover:bg-red-500/20 rounded-md text-gray-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </Link>
          </div>
        ))}

        {chats?.length === 0 && isOpen && (
          <p className="text-xs text-gray-600 text-center mt-8 px-2">Nenhuma conversa ainda.</p>
        )}
      </div>
    </aside>
  );
}
