import React from 'react';
import { Code2, Terminal } from 'lucide-react';
import GithubIcon from './icons/GithubIcon';

export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0a0a0c] overflow-y-auto">
      <div className="max-w-2xl space-y-8 animate-in fade-in duration-700">

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
            GuterwAiCode
          </h1>
          <p className="text-gray-400">Desenvolvimento de lógica, scripts e automação inteligente.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:border-blue-500/30 transition-all">
            <Code2 className="mx-auto mb-3 text-blue-400" />
            <h3 className="text-white font-medium mb-2">Arquitetura de Código</h3>
            <p className="text-xs text-gray-500">Construção de soluções escaláveis, limpas e de alta performance.</p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:border-purple-500/30 transition-all">
            <Terminal className="mx-auto mb-3 text-purple-400" />
            <h3 className="text-white font-medium mb-2">Lógica & Automação</h3>
            <p className="text-xs text-gray-500">Desenvolvimento de scripts complexos para otimizar fluxos de trabalho.</p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5">
          <a
            href="https://github.com/Guterw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <GithubIcon size={18} className="w-5 h-5" />
            Explore meus repositórios no GitHub
          </a>
        </div>
      </div>
    </div>
  );
}