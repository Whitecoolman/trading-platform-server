/*
  Warnings:

  - A unique constraint covering the columns `[accountId,positionId]` on the table `Trades` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trades_accountId_positionId_key" ON "Trades"("accountId", "positionId");
