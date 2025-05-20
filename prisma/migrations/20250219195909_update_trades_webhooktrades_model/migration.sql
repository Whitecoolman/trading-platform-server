-- DropForeignKey
ALTER TABLE "Trades" DROP CONSTRAINT "Trades_positionId_fkey";

-- CreateIndex
CREATE INDEX "WebhookTrades_positionId_idx" ON "WebhookTrades"("positionId");

-- AddForeignKey
ALTER TABLE "WebhookTrades" ADD CONSTRAINT "WebhookTrades_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Trades"("positionId") ON DELETE RESTRICT ON UPDATE CASCADE;
