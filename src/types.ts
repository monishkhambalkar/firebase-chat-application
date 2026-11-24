export interface Chat {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  readBy: string[];
}

export interface LastSeen {
  userId: string;
  messageId: string;
  updatedAt: Date;
}

export interface ChatRepository {
  findOrCreateOneToOneChat(userAId: string, userBId: string): Promise<Chat>;
  findChatById(chatId: string): Promise<Chat | null>;
  listChatsForUser(userId: string): Promise<Chat[]>;
}

export interface MessageStore {
  createMessage(chatId: string, senderId: string, text: string): Promise<Message>;
  listMessages(chatId: string, limit: number): Promise<Message[]>;
  markMessageRead(chatId: string, messageId: string, userId: string): Promise<void>;
  updateLastSeen(chatId: string, userId: string, messageId: string): Promise<void>;
}
