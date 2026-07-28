CREATE TABLE "repair_chats" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "repair_chats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_chat_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "content" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repair_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_chat_read_cursors" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "repair_chat_read_cursors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repair_chats_repairId_key" ON "repair_chats"("repairId");
CREATE INDEX "repair_chats_lastMessageAt_idx" ON "repair_chats"("lastMessageAt");
CREATE UNIQUE INDEX "repair_chat_messages_senderId_clientRequestId_key" ON "repair_chat_messages"("senderId", "clientRequestId");
CREATE INDEX "repair_chat_messages_chatId_createdAt_idx" ON "repair_chat_messages"("chatId", "createdAt");
CREATE INDEX "repair_chat_messages_replyToId_idx" ON "repair_chat_messages"("replyToId");
CREATE UNIQUE INDEX "repair_chat_read_cursors_chatId_userId_key" ON "repair_chat_read_cursors"("chatId", "userId");
CREATE INDEX "repair_chat_read_cursors_userId_lastReadAt_idx" ON "repair_chat_read_cursors"("userId", "lastReadAt");

ALTER TABLE "repair_chats" ADD CONSTRAINT "repair_chats_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_chat_messages" ADD CONSTRAINT "repair_chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "repair_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_chat_messages" ADD CONSTRAINT "repair_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repair_chat_messages" ADD CONSTRAINT "repair_chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "repair_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_chat_read_cursors" ADD CONSTRAINT "repair_chat_read_cursors_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "repair_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_chat_read_cursors" ADD CONSTRAINT "repair_chat_read_cursors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
