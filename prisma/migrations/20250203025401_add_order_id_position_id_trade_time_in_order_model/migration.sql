-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "positionId" TEXT,
ADD COLUMN     "tradeExecutionTime" TIMESTAMP(3),
ADD COLUMN     "tradeStartTime" TIMESTAMP(3);
