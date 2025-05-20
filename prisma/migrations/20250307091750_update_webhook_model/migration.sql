-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "allTrades" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moveStopLoss_pips" DOUBLE PRECISION,
ADD COLUMN     "partialClose" DOUBLE PRECISION;
