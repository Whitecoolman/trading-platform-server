/*
  Warnings:

  - Added the required column `userId` to the `WebhookTrades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WebhookTrades" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Trades" ADD CONSTRAINT "Trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookTrades" ADD CONSTRAINT "WebhookTrades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
