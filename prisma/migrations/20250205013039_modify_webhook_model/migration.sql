/*
  Warnings:

  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropTable
DROP TABLE "Order";

-- CreateTable
CREATE TABLE "Webhook" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountId" TEXT,
    "webhookName" TEXT NOT NULL,
    "webhookMode" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "orderDirection" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION NOT NULL,
    "takeProfit" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "positionId" TEXT,
    "tradeExecutionTime" TIMESTAMP(3),
    "tradeStartTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "connectionStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
