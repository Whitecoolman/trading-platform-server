/*
  Warnings:

  - You are about to drop the `CloseOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CloseOrder" DROP CONSTRAINT "CloseOrder_userId_fkey";

-- DropTable
DROP TABLE "CloseOrder";
