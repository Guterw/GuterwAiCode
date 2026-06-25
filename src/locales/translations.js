const translations = {
  pt: {
    newChat: "Novo Chat",
    placeholder: "Envie uma mensagem...",
    selectLang: "Selecione seu idioma",
    empty: "Histórico vazio"
  },
  en: {
    newChat: "New Chat",
    placeholder: "Send a message...",
    selectLang: "Select your language",
    empty: "Empty history"
  },
  es: {
    newChat: "Nuevo Chat",
    placeholder: "Envía un mensaje...",
    selectLang: "Selecciona tu idioma",
    empty: "Historial vacío"
  }
};

export const getTranslation = (lang) => translations[lang] || translations['pt'];