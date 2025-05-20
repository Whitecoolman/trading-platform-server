/*
  Warnings:

  - You are about to drop the column `positionId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `tradeTime` on the `Alert` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "positionId",
DROP COLUMN "tradeTime",
ADD COLUMN     "positionId_m" TEXT,
ADD COLUMN     "positionId_t" TEXT,
ADD COLUMN     "tradeTime_m" TIMESTAMP(3),
ADD COLUMN     "tradeTime_t" TIMESTAMP(3);
