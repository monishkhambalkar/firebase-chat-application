import type { ChatRepository, MessageStore } from './types.js';

export class ChatService {
  constructor(private readonly chats: ChatRepository, private readonly messages: MessageStore) {}

  createOrGetChat(userAId: string, userBId: string) { return this.chats.findOrCreateOneToOneChat(userAId, userBId); }

  async sendMessage(chatId: string, senderId: string, text: string) {
    const chat = await this.chats.findChatById(chatId);
    if (!chat || ![chat.userAId, chat.userBId].includes(senderId)) throw new Error('Chat or sender not found');
    const cleanText = text.trim();
    if (!cleanText) throw new Error('Message text is required');
    return this.messages.createMessage(chatId, senderId, cleanText);
  }

  async getMessages(chatId: string, limit: number) {
    if (!await this.chats.findChatById(chatId)) throw new Error('Chat not found');
    return this.messages.listMessages(chatId, Math.min(Math.max(limit, 1), 100));
  }

  async markRead(chatId: string, messageId: string, userId: string) { return this.messages.markMessageRead(chatId, messageId, userId); }
  async updateLastSeen(chatId: string, userId: string, messageId: string) { return this.messages.updateLastSeen(chatId, userId, messageId); }
  listUserChats(userId: string) { return this.chats.listChatsForUser(userId); }
}
