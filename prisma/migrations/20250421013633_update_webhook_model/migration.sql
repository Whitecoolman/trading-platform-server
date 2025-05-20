/*
  Warnings:

  - You are about to drop the column `accNum_t` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `accountType_t` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken_t` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "accNum_t",
DROP COLUMN "accountType_t",
DROP COLUMN "refreshToken_t",
ADD COLUMN     "accNum" TEXT,
ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "refreshToken" TEXT;
