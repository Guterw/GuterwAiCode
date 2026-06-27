import React, { useState } from 'react';
import { X, Loader2, AlertCircle, FolderTree, Unlink, Star } from 'lucide-react';
import { useGitHubRepo } from '../contexts/GitHubRepoContext';
import GithubIcon from './icons/GithubIcon';

export default function GitHubConnector({ align = 'right' }) {
  const ctx = useGitHubRepo();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Guarda defensiva: este componente depende do GitHubRepoProvider estar
  // presente na árvore. Se não estiver (ex: reuso futuro em outro lugar),
  // falha de forma silenciosa em vez de quebrar a UI inteira.
  if (!ctx) return null;

  const { repo, tree, status, error, truncated, connect, disconnect, isConnected } = ctx;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || status === 'loading') return;
    await connect(inputValue.trim());
  };

  const handleDisconnect = () => {
    disconnect();
    setInputValue('');
  };

  const fileCount = tree?.filter((t) => t.type === 'file').length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
          isConnected
            ? 'border-blue-500/40 bg-blue-600/10 text-blue-300 hover:border-blue-500/60'
            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white'
        }`}
        title={isConnected ? repo.fullName : 'Conectar repositório do GitHub'}
      >
        <GithubIcon size={15} />
        {isConnected ? (
          <span className="max-w-[140px] truncate">{repo.fullName}</span>
        ) : (
          <span>Conectar GitHub</span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-96 max-w-[calc(100vw-2rem)] z-50 rounded-2xl border border-white/10 bg-[#121212] shadow-2xl p-5`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <GithubIcon size={16} className="text-blue-400" />
              Repositório GitHub
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {!isConnected ? (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="owner/repo ou URL do GitHub"
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || status === 'loading'}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Lendo repositório...
                    </>
                  ) : (
                    'Conectar'
                  )}
                </button>
              </form>

              <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                Funciona apenas com repositórios públicos, sem necessidade de login.
                A IA poderá ler a estrutura e o conteúdo dos arquivos para te ajudar
                a entender e sugerir mudanças no código (ela não aplica alterações
                automaticamente).
              </p>

              {status === 'error' && (
                <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 mb-3">
                <div className="flex items-center justify-between">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-300 hover:text-blue-200 truncate"
                  >
                    {repo.fullName}
                  </a>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0 ml-2">
                    {repo.branch}
                  </span>
                </div>
                {repo.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{repo.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                  <FolderTree size={12} />
                  <span>{fileCount} arquivos indexados</span>
                </div>
                {truncated && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-400 mt-2">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span>Repositório muito grande: parte dos arquivos pode não ter sido listada.</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-red-500/40 hover:text-red-400 text-gray-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              >
                <Unlink size={13} />
                Desconectar repositório
              </button>
            </>
          )}

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-gray-600">
            <Star size={10} />
            <span>Sem login • dados públicos via API do GitHub</span>
          </div>
        </div>
      )}
    </div>
  );
}