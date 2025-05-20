/*
  Warnings:

  - A unique constraint covering the columns `[positionId]` on the table `Trades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[positionId]` on the table `WebhookTrades` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trades_positionId_key" ON "Trades"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookTrades_positionId_key" ON "WebhookTrades"("positionId");

-- AddForeignKey
ALTER TABLE "Trades" ADD CONSTRAINT "Trades_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WebhookTrades"("positionId") ON DELETE RESTRICT ON UPDATE CASCADE;
