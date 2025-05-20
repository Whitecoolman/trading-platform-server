-- DropForeignKey
ALTER TABLE "WebhookTrades" DROP CONSTRAINT "WebhookTrades_positionId_fkey";

-- DropIndex
DROP INDEX "Trades_positionId_key";

-- DropIndex
DROP INDEX "WebhookTrades_positionId_idx";

-- DropIndex
DROP INDEX "WebhookTrades_positionId_key";
