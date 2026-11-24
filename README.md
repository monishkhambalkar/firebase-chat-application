# Firebase + MySQL Chat Backend

A strict TypeScript REST API for one-to-one chat. MySQL owns users and chat membership; Firebase Firestore owns messages, read receipts, and per-user last-seen state.

## Run locally

1. Install Node.js 20+ and MySQL 8+.
2. Run `npm install`.
3. Create the relational schema: `mysql -u root -p < schema.sql`.
4. Create a Firebase project, enable Firestore, create a service account, and copy its values into `.env` based on `.env.example`.
5. Start the API with `npm run dev`.

The local health URL is http://localhost:3000/health. The API base URL is http://localhost:3000.

Run `npm test` for unit tests, `npm run typecheck` for strict TypeScript checks, and `npm run build` to produce `dist/`.

## API

- `POST /chat/create` with `{ "userAId": "u1", "userBId": "u2" }` returns `{ "chatId": "..." }` and is idempotent for the same pair.
- `POST /chat/:chatId/message/send` with `{ "senderId": "u1", "text": "Hello" }` writes a Firestore message.
- `GET /chat/:chatId/messages?limit=50` returns chronological messages. The maximum page size is 100.
- `POST /chat/:chatId/message/:messageId/read` with `{ "userId": "u2" }` adds that user to `readBy` atomically.
- `POST /chat/:chatId/lastseen` with `{ "userId": "u2", "messageId": "..." }` writes the user's latest position.
- `GET /user/:userId/chats` returns relational chat membership.

## Data design

MySQL tables are defined in `schema.sql`. The `chats` table has both user IDs and a uniqueness constraint for ordered direct-chat pairs. The repository checks both `(A,B)` and `(B,A)` so the API never creates duplicate one-to-one chats.

Firestore uses this structure:

```text
chats/{chatId}/messages/{messageId}
  chatId, senderId, text, createdAt, readBy[]
chats/{chatId}/lastSeen/{userId}
  messageId, updatedAt
```

Message timestamps are Firestore server timestamps. Reads use a descending timestamp query and reverse the result so the API response is oldest-to-newest. Read receipts use a Firestore transaction to avoid lost updates when two clients mark a message at the same time.

## Implementation workflow, from UI to code

1. A chat UI creates or retrieves a direct chat using the two authenticated user IDs. The backend validates the payload and delegates chat membership to MySQL.
2. The composer sends text to the message endpoint. The service verifies that the sender belongs to the chat, trims the text, and writes the message to Firestore with a timestamp.
3. A conversation screen requests a page of messages. Firestore orders by `createdAt`; the service caps the requested page size to protect the endpoint.
4. When a message becomes visible, the UI posts a read receipt. The Firestore transaction merges the user into `readBy` without removing other readers.
5. As the user scrolls or leaves the conversation, the UI posts its latest message ID to `lastSeen/{userId}`. This makes unread calculations and resume position straightforward.
6. The chat list reads from MySQL because membership and user relationships are relational data. Message content stays in Firestore for simple ordered reads and Firebase-native realtime expansion later.

## Firebase setup details

In Firebase Console, create a project and Firestore database, then create a service account under Project settings > Service accounts. Put the project ID, client email, and private key in environment variables. The server uses Firebase Admin SDK, never exposes admin credentials to a browser, and replaces escaped `\\n` sequences in the private key. In production, prefer the platform's service-account identity or a secret manager over committing a credential file.

## Scope and production follow-ups

The requested one-to-one API is implemented. Authentication/authorization should be added before production (the sample accepts IDs in request bodies for assessment clarity), along with cursor pagination, rate limiting, structured logging, Firestore security/retention policies, and integration tests against disposable MySQL and Firebase emulators.
