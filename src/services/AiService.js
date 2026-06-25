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

export const aiService = {
  models: MODEL_CONFIG,

  /**
   * Envia o histórico de mensagens para a IA e retorna a resposta.
   * @param {Array<{role: string, content: string}>} messages
   * @param {string} modelName - Nome do modelo escolhido na interface ('Owl Alpha' | 'Nemotron 3 Ultra')
   */
  sendMessage: async (messages, modelName = DEFAULT_MODEL) => {
    const config = MODEL_CONFIG[modelName] || MODEL_CONFIG[DEFAULT_MODEL];
    const apiKey = config.apiKey;

    if (!apiKey) {
      const envVarName = modelName === 'Nemotron 3 Ultra'
        ? 'VITE_OPENROUTER_API_KEY_NVIDIA'
        : 'VITE_OPENROUTER_API_KEY_OWL';
      console.error(`Chave ${envVarName} não encontrada no .env`);
      return `Erro: chave de API para "${modelName}" não configurada (${envVarName}).`;
    }

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
          messages,
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
