/*
  Warnings:

  - You are about to drop the `WebhookTrades` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WebhookTrades" DROP CONSTRAINT "WebhookTrades_userId_fkey";

-- DropTable
DROP TABLE "WebhookTrades";
