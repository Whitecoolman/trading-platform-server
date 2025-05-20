/*
  Warnings:

  - You are about to drop the column `activationTrigger` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `breakEvenExit` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `timeBasedExit` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `trailingDistance` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "activationTrigger",
DROP COLUMN "breakEvenExit",
DROP COLUMN "timeBasedExit",
DROP COLUMN "trailingDistance",
ADD COLUMN     "activationTrigger_pips" DOUBLE PRECISION,
ADD COLUMN     "breakenEvenSetting_pips" DOUBLE PRECISION,
ADD COLUMN     "timeBasedExitMinute" DOUBLE PRECISION,
ADD COLUMN     "trailingDistance_pips" DOUBLE PRECISION;
