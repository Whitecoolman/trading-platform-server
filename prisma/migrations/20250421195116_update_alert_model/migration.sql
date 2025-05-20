/*
  Warnings:

  - You are about to drop the column `tradeTime_m` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `tradeTime_t` on the `Alert` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "tradeTime_m",
DROP COLUMN "tradeTime_t",
ADD COLUMN     "tradeStartTime" TIMESTAMP(3);
