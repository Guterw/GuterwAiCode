import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { githubService } from '../services/GitHubService';

const GitHubRepoContext = createContext();

export const GitHubRepoProvider = ({ children }) => {
  const [repo, setRepo] = useState(null); // { owner, repo, branch, fullName, description }
  const [tree, setTree] = useState(null); // array de { path, type, size }
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [truncated, setTruncated] = useState(false);

  // Cache simples em memória: path -> conteúdo já buscado, pra não
  // refazer requisições à API do GitHub para o mesmo arquivo.
  const fileCacheRef = useRef(new Map());

  const connect = useCallback(async (rawInput) => {
    setStatus('loading');
    setError(null);
    fileCacheRef.current.clear();

    try {
      const { owner, repo: repoName, ref } = githubService.parseRepoInput(rawInput);
      const info = await githubService.getRepoInfo(owner, repoName);
      const branch = ref || info.defaultBranch;
      const { tree: fullTree, truncated: wasTruncated } = await githubService.getFullTree(
        owner,
        repoName,
        branch
      );

      setRepo({
        owner,
        repo: repoName,
        branch,
        fullName: info.fullName,
        description: info.description,
        htmlUrl: info.htmlUrl,
      });
      setTree(fullTree);
      setTruncated(wasTruncated);
      setStatus('ready');
    } catch (err) {
      console.error('Erro ao conectar repositório GitHub:', err);
      setError(err.message || 'Erro desconhecido ao conectar ao repositório.');
      setStatus('error');
      setRepo(null);
      setTree(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    setRepo(null);
    setTree(null);
    setStatus('idle');
    setError(null);
    fileCacheRef.current.clear();
  }, []);

  /**
   * Busca (com cache) o conteúdo de um arquivo do repositório conectado.
   */
  const getFileContent = useCallback(
    async (path) => {
      if (!repo) throw new Error('Nenhum repositório conectado.');

      if (fileCacheRef.current.has(path)) {
        return fileCacheRef.current.get(path);
      }

      const result = await githubService.getFileContent(repo.owner, repo.repo, path, repo.branch);
      fileCacheRef.current.set(path, result.content);
      return result.content;
    },
    [repo]
  );

  const value = {
    repo,
    tree,
    status,
    error,
    truncated,
    connect,
    disconnect,
    getFileContent,
    isConnected: status === 'ready' && !!repo,
  };

  return <GitHubRepoContext.Provider value={value}>{children}</GitHubRepoContext.Provider>;
};

export const useGitHubRepo = () => useContext(GitHubRepoContext);