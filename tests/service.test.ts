import { describe, expect, it } from 'vitest';
import { ChatService } from '../src/service.js';
import type { Chat, ChatRepository, Message, MessageStore } from '../src/types.js';

const chat: Chat = { id: 'chat-1', userAId: 'u1', userBId: 'u2', createdAt: new Date() };
function fixtures() {
  const repo: ChatRepository = { findOrCreateOneToOneChat: async () => chat, findChatById: async () => chat, listChatsForUser: async () => [chat] };
  const sent: Message[] = [];
  const store: MessageStore = { createMessage: async (chatId, senderId, text) => { const message = { id: 'm1', chatId, senderId, text, createdAt: new Date(), readBy: [senderId] }; sent.push(message); return message; }, listMessages: async () => sent, markMessageRead: async () => undefined, updateLastSeen: async () => undefined };
  return { service: new ChatService(repo, store), sent };
}

describe('ChatService', () => {
  it('trims and sends a message for a chat member', async () => { const { service, sent } = fixtures(); await service.sendMessage('chat-1', 'u1', ' hello '); expect(sent[0]?.text).toBe('hello'); });
  it('rejects empty messages', async () => { const { service } = fixtures(); await expect(service.sendMessage('chat-1', 'u1', '  ')).rejects.toThrow('Message text is required'); });
  it('rejects a sender outside the chat', async () => { const { service } = fixtures(); await expect(service.sendMessage('chat-1', 'u3', 'hello')).rejects.toThrow('Chat or sender not found'); });
});
