// src/services/AiService.js

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const aiService = {
  // Mapeamento dos nomes da interface para os IDs reais do OpenRouter.
  // Nota: Confirme os IDs exatos dos modelos free lá na documentação deles.
  models: {
    'Owl Alpha': 'google/gemma-2-9b-it:free', // Substitua pelo ID real do Owl Alpha se for diferente
    'Nemotron 3 Ultra': 'nvidia/nemotron-4-340b-instruct:free' // Exemplo do Nemotron gratuito
  },

  /**
   * Envia o histórico de mensagens para a IA e retorna a resposta
   * @param {Array} messages - Array de objetos [{role: 'user', content: 'ola'}, ...]
   * @param {String} modelName - Nome do modelo escolhido na interface
   */
  sendMessage: async (messages, modelName = 'Owl Alpha') => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("Chave VITE_OPENROUTER_API_KEY não encontrada no .env");
      return "Erro: Chave de API não configurada.";
    }

    // Pega o ID real do modelo baseado no dicionário acima
    const modelId = aiService.models[modelName] || aiService.models['Owl Alpha'];

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Headers recomendados pelo OpenRouter para métricas
          "HTTP-Referer": "https://guterw.github.io/GuterwAiCode", 
          "X-Title": "GuterwAiCode"
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API (Status ${response.status})`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      console.error("Erro ao comunicar com OpenRouter:", error);
      return "Desculpe, ocorreu um erro de conexão com a IA.";
    }
  }
};