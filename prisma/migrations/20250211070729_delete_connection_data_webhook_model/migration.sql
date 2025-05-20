/*
  Warnings:

  - You are about to drop the column `connectionData` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "connectionData";
