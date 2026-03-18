/*
  Warnings:

  - You are about to drop the column `report` on the `StreamTarget` table. All the data in the column will be lost.
  - Made the column `name` on table `ChannelTarget` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChannelTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRecordEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ChannelTarget" ("channelId", "createdAt", "id", "name") SELECT "channelId", "createdAt", "id", "name" FROM "ChannelTarget";
DROP TABLE "ChannelTarget";
ALTER TABLE "new_ChannelTarget" RENAME TO "ChannelTarget";
CREATE UNIQUE INDEX "ChannelTarget_channelId_key" ON "ChannelTarget"("channelId");
CREATE TABLE "new_StreamTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "recordingPid" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_StreamTarget" ("createdAt", "id", "status", "title", "updatedAt", "videoId") SELECT "createdAt", "id", "status", "title", "updatedAt", "videoId" FROM "StreamTarget";
DROP TABLE "StreamTarget";
ALTER TABLE "new_StreamTarget" RENAME TO "StreamTarget";
CREATE UNIQUE INDEX "StreamTarget_videoId_key" ON "StreamTarget"("videoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
