// src/services/AiService.js

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Cada modelo tem seu próprio ID no OpenRouter e sua própria env var de API key.
// Isso permite usar contas/keys distintas para "Owl Alpha" e "Nemotron 3 Ultra".
const MODEL_CONFIG = {
  'Owl Alpha': {
    id: 'openrouter/owl-alpha',
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY_OWL,
  },
  'Nemotron 3 Ultra': {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY_NVIDIA,
  },
};

const DEFAULT_MODEL = 'Owl Alpha';

// Nome completo do idioma para cada código salvo no LanguageContext/localStorage.
// Usado dentro do system prompt para forçar a IA a responder sempre nesse idioma,
// independente do idioma em que a pessoa escreveu a mensagem.
const LANGUAGE_NAMES = {
  pt: 'Portuguese (Brazil)',
  en: 'English',
  es: 'Spanish',
};

// Marcador de texto que a IA usa para "pedir" o conteúdo de um arquivo do
// repositório conectado. Não depende de function/tool calling nativo do
// modelo — funciona com qualquer modelo de texto via OpenRouter.
const FILE_REQUEST_REGEX = /\[\[READ_FILE:\s*([^\]]+?)\s*\]\]/g;

// Limite de "rodadas" de leitura de arquivo por mensagem do usuário, para
// evitar loops longos/infinitos caso a IA insista em pedir arquivos.
const MAX_FILE_READ_ROUNDS = 4;
// Limite de arquivos lidos por rodada (a IA pode pedir vários de uma vez).
const MAX_FILES_PER_ROUND = 5;
// Tamanho máximo (em caracteres) de cada arquivo injetado no contexto, para
// não explodir o tamanho do prompt com arquivos muito grandes.
const MAX_FILE_CHARS = 12000;

/**
 * Monta o system prompt que define a personalidade e as regras de trabalho da IA.
 * Focado 100% em código: gerar, revisar, corrigir e refinar, sempre priorizando
 * qualidade de produção. O idioma da resposta é fixado pelo idioma escolhido
 * pela pessoa na tela inicial (LanguageSelector), não pelo idioma da mensagem do usuário.
 *
 * @param {string} langCode - 'pt' | 'en' | 'es' (ou outro código futuro)
 * @param {object|null} repoContext - { fullName, branch, treeText } do repo conectado, se houver
 */
function buildSystemPrompt(langCode, repoContext) {
  const languageName = LANGUAGE_NAMES[langCode] || LANGUAGE_NAMES.pt;

  let repoSection = '';
  if (repoContext) {
    repoSection = `

CONNECTED GITHUB REPOSITORY:
You have read-only access to the public repository "${repoContext.fullName}" (branch: ${repoContext.branch}).
Below is the full file tree (paths only, irrelevant folders like node_modules/.git/dist already excluded):

${repoContext.treeText}

HOW TO READ A FILE:
You do NOT have the content of these files yet — only their paths. When you need to see the actual content of a file to answer the user's question (e.g. to review code, find a bug, or suggest a change), request it by writing this exact marker on its own line:
[[READ_FILE: path/to/file.ext]]
You may request multiple files by writing one marker per line (up to ${MAX_FILES_PER_ROUND} per response). After you write the marker(s), STOP your response there — do not guess at the file's content. The system will fetch the real content and send it back to you automatically, then you can continue with a fully informed answer.
Only request files that are clearly relevant to the user's question. Do not request files speculatively or request the same file twice.
If you already have a file's content from earlier in this conversation, do not request it again.
You can suggest code edits as diffs or full snippets in your answer, but you NEVER apply changes directly to the repository — you have no write access and must say so if asked to commit or push anything.`;
  }

  return `You are GuterwAiCode, an elite senior software engineer AI assistant. Your sole purpose is to help the user with code: writing new code, fixing bugs, refactoring, reviewing, explaining, and architecting software. You are not a general-purpose chatbot — you are a coding specialist, comparable to the best senior engineers at top tech companies.

LANGUAGE RULE (highest priority, never break this):
Always respond in ${languageName}, regardless of the language the user writes in. Code itself (variable names, comments inside code blocks if idiomatic, commit messages, etc.) follows normal programming conventions (usually English identifiers), but ALL of your explanations, prose, and surrounding text must be written in ${languageName}.

CORE BEHAVIOR — turning requests into production-grade code:
1. Understand intent first. If the request is ambiguous, make the most reasonable assumption for a production context and state it briefly, then proceed — do not block on unnecessary clarifying questions for small ambiguities.
2. Always produce code that is correct, efficient, secure, and idiomatic for the language/framework in question. Never produce code that "looks right" but has subtle bugs, off-by-one errors, race conditions, unhandled edge cases, or silent failures.
3. Handle errors and edge cases explicitly: empty inputs, null/undefined, network failures, invalid types, concurrency issues, and boundary conditions. Production code does not assume the happy path.
4. Follow the conventions and idioms of the specific language/framework/library being used (e.g. React hooks rules, Python PEP8, proper async/await usage, correct typing). Match the style of any existing code shown to you.
5. Prefer clear, maintainable, well-structured code over clever or overly compressed code. Use meaningful names. Keep functions focused on a single responsibility.
6. When fixing a bug, identify the root cause precisely before patching — do not paper over symptoms. Briefly explain what was wrong and why your fix resolves it.
7. When refactoring, preserve existing behavior unless explicitly asked to change it, and explain any behavioral changes clearly.
8. When reviewing code, be direct and specific about real issues (correctness, security, performance, readability) without being pedantic about pure style preferences that don't affect quality.
9. Always think about security: validate inputs, avoid injection vulnerabilities, never hardcode secrets/API keys, and flag insecure patterns you notice even if not explicitly asked.
10. When relevant, mention performance implications of significantly different approaches, but don't over-engineer or prematurely optimize trivial code.
11. If a request requires information you don't have (e.g. a missing file, an undefined dependency version, or unclear requirements that materially change the solution), say so plainly instead of inventing details.
12. Be concise in explanations and let the code speak for itself — avoid padding responses with unnecessary preamble or repetition. Use code blocks with the correct language tag for all code.
${repoSection}

Your goal on every single response: deliver code that a senior engineer would approve in code review on the first pass, in the language the user has chosen for this app (${languageName}).`;
}

/**
 * Extrai os caminhos de arquivo pedidos pela IA via marcador [[READ_FILE: ...]].
 * Retorna um array de caminhos únicos, ou [] se nenhum marcador foi encontrado.
 */
function extractRequestedFiles(text) {
  const matches = [...text.matchAll(FILE_REQUEST_REGEX)];
  const paths = matches.map((m) => m[1].trim()).filter(Boolean);
  return [...new Set(paths)].slice(0, MAX_FILES_PER_ROUND);
}

/**
 * Faz uma única chamada de completions ao OpenRouter.
 */
async function callOpenRouter(config, fullMessages) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://guterw.github.io/GuterwAiCode",
      "X-Title": "GuterwAiCode",
    },
    body: JSON.stringify({
      model: config.id,
      messages: fullMessages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Erro na API (Status ${response.status}) ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "A IA não retornou conteúdo.";
}

export const aiService = {
  models: MODEL_CONFIG,

  /**
   * Envia o histórico de mensagens para a IA e retorna a resposta.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {string} modelName - Nome do modelo escolhido na interface ('Owl Alpha' | 'Nemotron 3 Ultra')
   * @param {string} langCode - Código do idioma escolhido na tela inicial ('pt' | 'en' | 'es')
   * @param {object|null} repoOptions - { fullName, branch, treeText, getFileContent } do repo GitHub conectado, ou null
   */
  sendMessage: async (messages, modelName = DEFAULT_MODEL, langCode = 'pt', repoOptions = null) => {
    const config = MODEL_CONFIG[modelName] || MODEL_CONFIG[DEFAULT_MODEL];
    const apiKey = config.apiKey;

    if (!apiKey) {
      const envVarName = modelName === 'Nemotron 3 Ultra'
        ? 'VITE_OPENROUTER_API_KEY_NVIDIA'
        : 'VITE_OPENROUTER_API_KEY_OWL';
      console.error(`Chave ${envVarName} não encontrada no .env`);
      return `Erro: chave de API para "${modelName}" não configurada (${envVarName}).`;
    }

    const repoContext = repoOptions
      ? { fullName: repoOptions.fullName, branch: repoOptions.branch, treeText: repoOptions.treeText }
      : null;

    const systemMessage = { role: 'system', content: buildSystemPrompt(langCode, repoContext) };
    let workingMessages = [systemMessage, ...messages];

    // Conjunto de arquivos já injetados nesta troca, para nunca buscar o
    // mesmo arquivo duas vezes mesmo que a IA peça de novo.
    const alreadyFetched = new Set();

    try {
      for (let round = 0; round < MAX_FILE_READ_ROUNDS; round++) {
        const reply = await callOpenRouter(config, workingMessages);

        // Sem repo conectado, ou sem getFileContent disponível: não há
        // como atender pedidos de leitura — devolve a resposta como está.
        if (!repoOptions?.getFileContent) {
          return reply;
        }

        const requestedPaths = extractRequestedFiles(reply).filter(
          (p) => !alreadyFetched.has(p)
        );

        // A IA não pediu nenhum arquivo novo: essa é a resposta final.
        if (requestedPaths.length === 0) {
          // Se a resposta só contém marcadores (sem texto útil) mas todos já
          // foram buscados antes, ainda assim devolvemos — evita resposta vazia.
          return reply;
        }

        // Busca o conteúdo de cada arquivo pedido, tolerando falhas
        // individuais (ex: arquivo binário, path inexistente).
        const fetchResults = await Promise.all(
          requestedPaths.map(async (path) => {
            alreadyFetched.add(path);
            try {
              const content = await repoOptions.getFileContent(path);
              const truncatedContent =
                content.length > MAX_FILE_CHARS
                  ? `${content.slice(0, MAX_FILE_CHARS)}\n... (arquivo truncado: ${content.length - MAX_FILE_CHARS} caracteres omitidos)`
                  : content;
              return { path, content: truncatedContent, ok: true };
            } catch (err) {
              return { path, error: err.message || String(err), ok: false };
            }
          })
        );

        const fileContentsBlock = fetchResults
          .map(({ path, content, error: err, ok }) =>
            ok
              ? `--- FILE: ${path} ---\n${content}\n--- END FILE: ${path} ---`
              : `--- FILE: ${path} ---\n[Erro ao ler arquivo: ${err}]\n--- END FILE: ${path} ---`
          )
          .join('\n\n');

        // Reconstrói o histórico: resposta da IA (com os marcadores) + os
        // conteúdos buscados, como se fosse o "resultado da ferramenta".
        workingMessages = [
          ...workingMessages,
          { role: 'assistant', content: reply },
          {
            role: 'user',
            content: `[Conteúdo dos arquivos solicitados]\n\n${fileContentsBlock}\n\nContinue sua resposta usando esse conteúdo. Não peça esses arquivos novamente.`,
          },
        ];
        // Próxima iteração do loop chama a IA de novo, agora com o conteúdo em mãos.
      }

      // Estourou o limite de rodadas: pede pra IA finalizar com o que tem.
      const finalReply = await callOpenRouter(config, [
        ...workingMessages,
        {
          role: 'user',
          content: 'Finalize sua resposta agora com as informações que você já tem, sem pedir mais arquivos.',
        },
      ]);
      return finalReply;
    } catch (error) {
      console.error("Erro ao comunicar com OpenRouter:", error);
      return "Desculpe, ocorreu um erro de conexão com a IA.";
    }
  },
};