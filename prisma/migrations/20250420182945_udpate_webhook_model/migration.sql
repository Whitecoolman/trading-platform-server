/*
  Warnings:

  - You are about to drop the column `accNum` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "accNum",
DROP COLUMN "accountId",
ADD COLUMN     "accNum_t" TEXT,
ADD COLUMN     "accountId_m" TEXT,
ADD COLUMN     "accountId_t" TEXT,
ADD COLUMN     "accountType_t" TEXT,
ADD COLUMN     "refreshToken_t" TEXT;
