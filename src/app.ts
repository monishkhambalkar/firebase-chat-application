import express, { type Request, type Response } from 'express';
import { mysqlChatRepository } from './db.js';
import { firestoreMessageStore } from './firestore.js';
import { ChatService } from './service.js';

export function createApp(service = new ChatService(mysqlChatRepository, firestoreMessageStore)) {
  const app = express();
  app.use(express.json());
  const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: express.NextFunction) => handler(req, res).catch(next);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/chat/create', asyncRoute(async (req, res) => {
    const { userAId, userBId } = req.body as Record<string, unknown>;
    if (typeof userAId !== 'string' || typeof userBId !== 'string') return res.status(400).json({ error: 'userAId and userBId are required' });
    const chat = await service.createOrGetChat(userAId, userBId); return res.status(200).json({ chatId: chat.id });
  }));
  app.post('/chat/:chatId/message/send', asyncRoute(async (req, res) => {
    const { senderId, text } = req.body as Record<string, unknown>;
    if (typeof senderId !== 'string' || typeof text !== 'string') return res.status(400).json({ error: 'senderId and text are required' });
    const message = await service.sendMessage(String(req.params.chatId), senderId, text); return res.status(201).json(message);
  }));
  app.get('/chat/:chatId/messages', asyncRoute(async (req, res) => {
    const limit = Number(req.query.limit ?? 50); if (!Number.isInteger(limit)) return res.status(400).json({ error: 'limit must be an integer' });
    return res.json({ messages: await service.getMessages(String(req.params.chatId), limit) });
  }));
  app.post('/chat/:chatId/message/:messageId/read', asyncRoute(async (req, res) => {
    const { userId } = req.body as Record<string, unknown>; if (typeof userId !== 'string') return res.status(400).json({ error: 'userId is required' });
    await service.markRead(String(req.params.chatId), String(req.params.messageId), userId); return res.status(204).send();
  }));
  app.post('/chat/:chatId/lastseen', asyncRoute(async (req, res) => {
    const { userId, messageId } = req.body as Record<string, unknown>; if (typeof userId !== 'string' || typeof messageId !== 'string') return res.status(400).json({ error: 'userId and messageId are required' });
    await service.updateLastSeen(String(req.params.chatId), userId, messageId); return res.status(204).send();
  }));
  app.get('/user/:userId/chats', asyncRoute(async (req, res) => res.json({ chats: await service.listUserChats(String(req.params.userId)) })));
  app.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => res.status(400).json({ error: error instanceof Error ? error.message : 'Unexpected error' }));
  return app;
}
