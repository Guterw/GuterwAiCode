import React from 'react';
import { Utensils, Code2, Terminal } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0a0a0c]">
      <div className="max-w-2xl space-y-8 animate-in fade-in duration-700">
        
        {/* Header do Projeto */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            GuterwAiCode
          </h1>
          <p className="text-gray-400">Seu assistente inteligente de automação e alta performance.</p>
        </div>

        {/* Grid de Informações */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:border-blue-500/30 transition-all">
            <Code2 className="mx-auto mb-3 text-blue-400" />
            <h3 className="text-white font-medium mb-2">Automação</h3>
            <p className="text-xs text-gray-500">Scripts otimizados, lógica Python e automação de fluxos complexos.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:border-purple-500/30 transition-all">
            <Utensils className="mx-auto mb-3 text-purple-400" />
            <h3 className="text-white font-medium mb-2">Nutrição</h3>
            <p className="text-xs text-gray-500">Foco em dieta restrita e hidratação pura para clareza mental e física.</p>
          </div>
        </div>

        {/* Rodapé Interno do Welcome */}
        <div className="pt-8 border-t border-white/5">
          <a 
            href="https://github.com/Guterw" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Github size={18} />
            Explore meus códigos no GitHub
          </a>
        </div>
      </div>
    </div>
  );
}