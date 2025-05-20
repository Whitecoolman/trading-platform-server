/*
  Warnings:

  - You are about to drop the column `useId` on the `Trades` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trades" DROP COLUMN "useId",
ADD COLUMN     "userId" INTEGER NOT NULL;
