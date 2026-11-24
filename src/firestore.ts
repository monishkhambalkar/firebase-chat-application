import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Message, MessageStore } from './types.js';

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(
  process.env.FIREBASE_CLIENT_EMAIL
    ? { credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '' }) }
    : { credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID },
);
const firestore = getFirestore(app);

export const firestoreMessageStore: MessageStore = {
  async createMessage(chatId, senderId, text) {
    const ref = firestore.collection('chats').doc(chatId).collection('messages').doc();
    const createdAt = Timestamp.now();
    await ref.set({ chatId, senderId, text, createdAt, readBy: [senderId] });
    return { id: ref.id, chatId, senderId, text, createdAt: createdAt.toDate(), readBy: [senderId] };
  },
  async listMessages(chatId, limit) {
    const snapshot = await firestore.collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, chatId, senderId: String(data.senderId), text: String(data.text), createdAt: data.createdAt.toDate(), readBy: Array.isArray(data.readBy) ? data.readBy.map(String) : [] };
    }).reverse();
  },
  async markMessageRead(chatId, messageId, userId) {
    await firestore.collection('chats').doc(chatId).collection('messages').doc(messageId)
      .update({ readBy: (await firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('chats').doc(chatId).collection('messages').doc(messageId);
        const snap = await tx.get(ref);
        const existing = Array.isArray(snap.data()?.readBy) ? snap.data()?.readBy as string[] : [];
        const next = existing.includes(userId) ? existing : [...existing, userId];
        tx.update(ref, { readBy: next });
        return next;
      })) });
  },
  async updateLastSeen(chatId, userId, messageId) {
    await firestore.collection('chats').doc(chatId).collection('lastSeen').doc(userId).set({ messageId, updatedAt: Timestamp.now() });
  },
};
