/*
  Warnings:

  - You are about to drop the column `takeProfit_pips_1` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `takeProfit_pips_2` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `takeProfit_pips_3` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "takeProfit_pips_1",
DROP COLUMN "takeProfit_pips_2",
DROP COLUMN "takeProfit_pips_3",
ADD COLUMN     "multiTakeProfits_pips" DOUBLE PRECISION[];
