import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { githubService } from '../services/GitHubService';

const GitHubRepoContext = createContext();
const STORAGE_KEY = 'github_global_repo';

export const GitHubRepoProvider = ({ children }) => {
  const [repo, setRepo] = useState(null);
  const [tree, setTree] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const fileCacheRef = useRef(new Map());
  const hydratedRef = useRef(false);

  // --- HIDRATAÇÃO NO MOUNT ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { owner, repo: repoName, branch, fullName } = JSON.parse(saved);
        // Reconecta silenciosamente (busca árvore)
        (async () => {
          setStatus('loading');
          try {
            const { tree: fullTree, truncated: wasTruncated, branch: resolvedBranch } =
              await githubService.getFullTreeForRepo(owner, repoName, branch);
            setRepo({ owner, repo: repoName, branch: resolvedBranch, fullName });
            setTree(fullTree);
            setTruncated(wasTruncated);
            setStatus('ready');
          } catch (err) {
            console.error('Falha ao restaurar conexão GitHub:', err);
            localStorage.removeItem(STORAGE_KEY);
            setStatus('idle');
          }
        })();
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }
    hydratedRef.current = true;
  }, []);

  const connect = useCallback(async (rawInput) => {
    setStatus('loading'); setError(null);
    fileCacheRef.current.clear();
    try {
      const { owner, repo: repoName, ref } = githubService.parseRepoInput(rawInput);
      const info = await githubService.getRepoInfo(owner, repoName);
      const branch = ref || info.defaultBranch;
      const { tree: fullTree, truncated: wasTruncated } =
        await githubService.getFullTreeForRepo(owner, repoName, branch);

      const repoObj = { owner, repo: repoName, branch, fullName: info.fullName, description: info.description, htmlUrl: info.htmlUrl };
      setRepo(repoObj);
      setTree(fullTree);
      setTruncated(wasTruncated);
      setStatus('ready');

      // PERSISTE
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, repo: repoName, branch, fullName: info.fullName }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao conectar.');
      setStatus('error');
      setRepo(null); setTree(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    setRepo(null); setTree(null); setStatus('idle'); setError(null);
    fileCacheRef.current.clear();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getFileContent = useCallback(async (path) => {
    if (!repo) throw new Error('Nenhum repositório conectado.');
    if (fileCacheRef.current.has(path)) return fileCacheRef.current.get(path);
    const result = await githubService.getFileContent(repo.owner, repo.repo, path, repo.branch);
    fileCacheRef.current.set(path, result.content);
    return result.content;
  }, [repo]);

  const value = {
    repo, tree, status, error, truncated,
    connect, disconnect, getFileContent,
    isConnected: status === 'ready' && !!repo,
  };
  return <GitHubRepoContext.Provider value={value}>{children}</GitHubRepoContext.Provider>;
};

export const useGitHubRepo = () => useContext(GitHubRepoContext);