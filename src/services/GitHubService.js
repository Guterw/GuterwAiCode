// src/services/GitHubService.js
//
// Acesso somente-leitura à API pública do GitHub (sem autenticação).
// Funciona inteiramente no client, compatível com hospedagem estática
// (GitHub Pages) — sem backend.
//
// Limitações importantes (sem login):
// - Rate limit de 60 requisições/hora por IP (ver header X-RateLimit-Remaining).
// - Só funciona para repositórios PÚBLICOS.
//
// Estratégia para não estourar o rate limit:
// - A árvore completa do repositório (todas as pastas/subpastas/arquivos) é
//   buscada em UMA ÚNICA chamada via Git Trees API (`?recursive=1`), em vez
//   de uma chamada por pasta.
// - O conteúdo de cada arquivo só é buscado sob demanda (quando a IA ou o
//   usuário realmente precisam ler aquele arquivo específico).

const API_BASE = 'https://api.github.com';

// Extensões consideradas "texto/código" — evita tentar decodificar binários
// (imagens, fontes, etc.) como UTF-8.
const TEXT_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'json', 'md', 'mdx', 'txt',
  'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'c', 'h', 'cpp', 'cc', 'hpp',
  'cs', 'php', 'swift', 'm', 'sh', 'bash', 'zsh', 'ps1',
  'yml', 'yaml', 'toml', 'ini', 'env', 'cfg', 'conf',
  'sql', 'graphql', 'gql', 'proto',
  'xml', 'svg', 'gitignore', 'gitattributes', 'editorconfig', 'dockerfile',
  'lock',
]);

// Diretórios comuns que normalmente não interessam à IA (dependências,
// builds, etc.) — usados só para marcar/filtrar a árvore na UI, não
// removidos da resposta da API.
const IGNORED_DIR_PATTERNS = [
  /^node_modules\//, /^\.git\//, /^dist\//, /^build\//, /^\.next\//,
  /^\.vite\//, /^coverage\//, /^vendor\//,
];

function isLikelyTextFile(path) {
  const name = path.split('/').pop() || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : name.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function isIgnoredPath(path) {
  return IGNORED_DIR_PATTERNS.some((re) => re.test(path));
}

/**
 * Aceita várias formas de entrada e devolve { owner, repo, ref } ou lança erro.
 * Formas suportadas:
 *  - https://github.com/owner/repo
 *  - https://github.com/owner/repo.git
 *  - https://github.com/owner/repo/tree/branch
 *  - owner/repo
 *  - owner/repo@branch
 */
function parseRepoInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Informe a URL ou "owner/repo" do repositório.');
  }

  let value = input.trim();
  let ref = null;

  // owner/repo@branch
  if (!value.includes('github.com') && value.includes('@')) {
    const [base, branch] = value.split('@');
    value = base;
    ref = branch;
  }

  // Tenta como URL completa
  try {
    const url = new URL(value);
    if (!url.hostname.includes('github.com')) {
      throw new Error('not-github-url');
    }
    const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/').filter(Boolean);
    if (parts.length < 2) throw new Error('invalid-path');

    const owner = parts[0];
    const repo = parts[1];

    // /owner/repo/tree/branch/...
    if (parts[2] === 'tree' && parts[3]) {
      ref = decodeURIComponent(parts[3]);
    }

    return { owner, repo, ref };
  } catch {
    // Não é uma URL — tenta como "owner/repo"
    const cleaned = value.replace(/\.git$/, '');
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('Formato inválido. Use "owner/repo" ou a URL completa do GitHub.');
    }
    return { owner: parts[0], repo: parts[1], ref };
  }
}

async function githubFetch(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  const remaining = response.headers.get('x-ratelimit-remaining');
  const resetHeader = response.headers.get('x-ratelimit-reset');

  if (response.status === 403 && remaining === '0') {
    const resetDate = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
    const when = resetDate ? ` Tente novamente após ${resetDate.toLocaleTimeString()}.` : '';
    throw new Error(
      `Limite de requisições do GitHub sem login atingido (60/hora por IP).${when}`
    );
  }

  if (response.status === 404) {
    throw new Error('Repositório, branch ou arquivo não encontrado (ou o repositório não é público).');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Erro na API do GitHub (status ${response.status}): ${body}`);
  }

  return { json: await response.json(), rateRemaining: remaining };
}

export const githubService = {
  parseRepoInput,
  isLikelyTextFile,
  isIgnoredPath,

  /**
   * Busca metadados básicos do repo (nome, descrição, branch padrão, etc).
   */
  getRepoInfo: async (owner, repo) => {
    const { json } = await githubFetch(`/repos/${owner}/${repo}`);
    return {
      fullName: json.full_name,
      description: json.description,
      defaultBranch: json.default_branch,
      stars: json.stargazers_count,
      isPrivate: json.private,
      htmlUrl: json.html_url,
    };
  },

  /**
   * Busca a árvore COMPLETA de arquivos do repositório (todas as pastas,
   * subpastas e arquivos) em uma única chamada.
   *
   * Retorna um array plano de { path, type ('file'|'dir'), size }.
   */
  getFullTree: async (owner, repo, ref) => {
    // Precisamos do SHA do commit/branch para a Trees API recursiva.
    const branchRef = ref || (await githubService.getRepoInfo(owner, repo)).defaultBranch;

    const { json } = await githubFetch(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branchRef)}?recursive=1`
    );

    if (json.truncated) {
      // Repo gigante: a API do GitHub corta a resposta. Ainda é utilizável,
      // mas avisamos quem chamou.
      console.warn('Árvore do repositório truncada pela API do GitHub (repo muito grande).');
    }

    const tree = (json.tree || [])
      .filter((entry) => entry.type === 'blob' || entry.type === 'tree')
      .map((entry) => ({
        path: entry.path,
        type: entry.type === 'tree' ? 'dir' : 'file',
        size: entry.size ?? null,
        sha: entry.sha,
      }));

    return { tree, truncated: !!json.truncated, branch: branchRef };
  },

  /**
   * Busca o conteúdo (texto) de um arquivo específico do repositório.
   * Lança erro se o arquivo parecer binário e `force` não for true.
   */
  getFileContent: async (owner, repo, path, ref, { force = false } = {}) => {
    if (!force && !isLikelyTextFile(path)) {
      throw new Error(`"${path}" parece ser um arquivo binário e não será lido como texto.`);
    }

    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const { json } = await githubFetch(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${query}`
    );

    if (Array.isArray(json)) {
      throw new Error(`"${path}" é um diretório, não um arquivo.`);
    }

    if (json.encoding !== 'base64' || typeof json.content !== 'string') {
      throw new Error(`Não foi possível decodificar o conteúdo de "${path}".`);
    }

    // Decodifica base64 (com suporte a UTF-8 multibyte) — o GitHub quebra o
    // base64 em linhas, então removemos quebras antes de decodificar.
    const base64 = json.content.replace(/\n/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const text = new TextDecoder('utf-8').decode(bytes);

    return { path, content: text, size: json.size, sha: json.sha };
  },

  /**
   * Monta uma representação em texto da árvore de arquivos, no estilo do
   * comando `tree`, para ser injetada no contexto da IA. Filtra diretórios
   * comumente irrelevantes (node_modules, .git, dist, etc.).
   */
  renderTreeAsText: (tree, { maxEntries = 800 } = {}) => {
    const filtered = tree
      .filter((entry) => !isIgnoredPath(entry.path))
      .filter((entry) => entry.type === 'file')
      .map((entry) => entry.path)
      .sort();

    const limited = filtered.slice(0, maxEntries);
    const omitted = filtered.length - limited.length;

    let text = limited.join('\n');
    if (omitted > 0) {
      text += `\n... (+${omitted} arquivos omitidos por limite de tamanho)`;
    }
    return text;
  },
};