/*
  Warnings:

  - Made the column `hashedWebhook` on table `Webhook` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Webhook" ALTER COLUMN "hashedWebhook" SET NOT NULL;
