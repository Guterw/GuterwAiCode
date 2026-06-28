import Dexie from 'dexie';

// 1. Inicializa o banco de dados
export const db = new Dexie('AIChatDB');

// 2. Define a estrutura das tabelas
db.version(1).stores({
  chats: '++id, title, model, updatedAt',
  messages: '++id, chatId, role, timestamp'
});

// 3. Funções auxiliares para a interface
export const dbOperations = {
  db,

  createNewChat: async (modelName = 'Owl Alpha') => {
    // Busca todos os chats e encontra os IDs existentes
    const allChats = await db.chats.toArray();
    const existingIds = allChats.map(c => c.id).sort((a, b) => a - b);
    
    // Lógica para encontrar o menor ID disponível (começando do 1)
    let nextId = 1;
    for (let id of existingIds) {
      if (id === nextId) {
        nextId++;
      } else if (id > nextId) {
        break; // Encontrou um "buraco" na numeração
      }
    }

    // Força o Dexie a usar o nextId encontrado
    const chatId = await db.chats.add({
      id: nextId, 
      title: 'Novo Chat',
      model: modelName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return chatId;
  },

  updateChatInfo: async (chatId, title, model) => {
    await db.chats.update(chatId, { title, model });
  },

  deleteChat: async (chatId) => {
    await db.chats.delete(chatId);
    await db.messages.where('chatId').equals(chatId).delete();
  },

  getAllChats: async () => {
    return await db.chats.orderBy('updatedAt').reverse().toArray();
  },

  getChatById: async (chatId) => {
    return await db.chats.get(chatId);
  },

  addMessage: async (chatId, role, content) => {
    const messageId = await db.messages.add({
      chatId,
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    await db.chats.update(chatId, { updatedAt: new Date().toISOString() });
    return messageId;
  },

  getMessagesByChat: async (chatId) => {
    return await db.messages.where('chatId').equals(chatId).sortBy('timestamp');
  },

  // NOVO: busca paginada (mais recentes primeiro) para renderização leve
  getMessagesPaginated: async (chatId, limit = 4, offset = 0) => {
    // Dexie: orderBy('timestamp').reverse() = mais recentes primeiro
    // offset = quantas pular, limit = quantas pegar
    return await db.messages
      .where('chatId')
      .equals(chatId)
      .reverse()
      .sortBy('timestamp')
      .then(all => all.slice(offset, offset + limit));
  },

  // NOVO: conta total de mensagens do chat (para saber se tem mais)
  countMessagesByChat: async (chatId) => {
    return await db.messages.where('chatId').equals(chatId).count();
  },
};