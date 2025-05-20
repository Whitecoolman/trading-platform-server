-- AddForeignKey
ALTER TABLE "Trades" ADD CONSTRAINT "Trades_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WebhookTrades"("positionId") ON DELETE RESTRICT ON UPDATE CASCADE;
