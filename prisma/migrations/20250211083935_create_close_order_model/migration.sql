-- CreateTable
CREATE TABLE "CloseOrder" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountId" TEXT,
    "webhookName" TEXT NOT NULL,
    "webhookMode" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "tradeExecutionTime" TIMESTAMP(3),
    "tradeStartTime" TIMESTAMP(3),

    CONSTRAINT "CloseOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CloseOrder" ADD CONSTRAINT "CloseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
