/*
  Warnings:

  - You are about to drop the column `connectionStatus` on the `CloseOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CloseOrder" DROP COLUMN "connectionStatus";
