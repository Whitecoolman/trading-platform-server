/*
  Warnings:

  - Added the required column `hashedWebhook` to the `CloseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CloseOrder" ADD COLUMN     "hashedWebhook" TEXT NOT NULL;
