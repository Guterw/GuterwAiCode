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

/**
 * Monta o system prompt que define a personalidade e as regras de trabalho da IA.
 * Focado 100% em código: gerar, revisar, corrigir e refinar, sempre priorizando
 * qualidade de produção. O idioma da resposta é fixado pelo idioma escolhido
 * pela pessoa na tela inicial (LanguageSelector), não pelo idioma da mensagem do usuário.
 *
 * @param {string} langCode - 'pt' | 'en' | 'es' (ou outro código futuro)
 */
function buildSystemPrompt(langCode) {
  const languageName = LANGUAGE_NAMES[langCode] || LANGUAGE_NAMES.pt;

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

Your goal on every single response: deliver code that a senior engineer would approve in code review on the first pass, in the language the user has chosen for this app (${languageName}).`;
}

export const aiService = {
  models: MODEL_CONFIG,

  /**
   * Envia o histórico de mensagens para a IA e retorna a resposta.
   * @param {Array<{role: string, content: string}>} messages
   * @param {string} modelName - Nome do modelo escolhido na interface ('Owl Alpha' | 'Nemotron 3 Ultra')
   * @param {string} langCode - Código do idioma escolhido na tela inicial ('pt' | 'en' | 'es')
   */
  sendMessage: async (messages, modelName = DEFAULT_MODEL, langCode = 'pt') => {
    const config = MODEL_CONFIG[modelName] || MODEL_CONFIG[DEFAULT_MODEL];
    const apiKey = config.apiKey;

    if (!apiKey) {
      const envVarName = modelName === 'Nemotron 3 Ultra'
        ? 'VITE_OPENROUTER_API_KEY_NVIDIA'
        : 'VITE_OPENROUTER_API_KEY_OWL';
      console.error(`Chave ${envVarName} não encontrada no .env`);
      return `Erro: chave de API para "${modelName}" não configurada (${envVarName}).`;
    }

    const systemMessage = { role: 'system', content: buildSystemPrompt(langCode) };
    const fullMessages = [systemMessage, ...messages];

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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

    } catch (error) {
      console.error("Erro ao comunicar com OpenRouter:", error);
      return "Desculpe, ocorreu um erro de conexão com a IA.";
    }
  },
};