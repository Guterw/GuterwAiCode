// projeto/components/ChatInput.jsx
import React, { memo } from 'react';
import { Send } from 'lucide-react';

const ChatInput = memo(function ChatInput({ value, onChange, onSubmit, disabled, placeholder }) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-white/5 bg-[#0a0a0c] shrink-0">
      <div className="flex gap-2 max-w-4xl mx-auto">
        <input
          className="flex-1 bg-[#1a1a1a] border border-white/10 p-4 rounded-xl focus:outline-none focus:border-blue-500 text-gray-100"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="p-4 bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
});

export default ChatInput;