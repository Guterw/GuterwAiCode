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
  createNewChat: async (modelName = 'Owl Alpha') => {
    const chatId = await db.chats.add({
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
  // Também é boa prática deletar as mensagens vinculadas a esse chat
  await db.messages.where('chatId').equals(chatId).delete();
  },

  getAllChats: async () => {
    return await db.chats.orderBy('updatedAt').reverse().toArray();
  },

  addMessage: async (chatId, role, content) => {
    const messageId = await db.messages.add({
      chatId: chatId,
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    });

    await db.chats.update(chatId, { updatedAt: new Date().toISOString() });
    
    return messageId;
  },

  getMessagesByChat: async (chatId) => {
    return await db.messages.where('chatId').equals(chatId).sortBy('timestamp');
  }
};