/*
  Warnings:

  - A unique constraint covering the columns `[accountId,positionId,type]` on the table `Trades` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Trades_accountId_positionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Trades_accountId_positionId_type_key" ON "Trades"("accountId", "positionId", "type");
