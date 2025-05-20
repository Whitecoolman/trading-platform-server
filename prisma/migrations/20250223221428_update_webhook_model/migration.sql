/*
  Warnings:

  - You are about to drop the column `stopLoss` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `takeProfit` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "stopLoss",
DROP COLUMN "takeProfit",
ADD COLUMN     "stopLoss_pips" DOUBLE PRECISION,
ADD COLUMN     "takeProfit_pips" DOUBLE PRECISION;
