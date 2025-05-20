-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "openPrice_pips" DOUBLE PRECISION,
ADD COLUMN     "orderType" TEXT,
ADD COLUMN     "stopLimit_pips" DOUBLE PRECISION;
