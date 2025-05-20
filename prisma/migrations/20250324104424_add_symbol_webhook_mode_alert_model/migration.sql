/*
  Warnings:

  - Added the required column `symbol` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `webhookMode` to the `Alert` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "symbol" TEXT NOT NULL,
ADD COLUMN     "webhookMode" TEXT NOT NULL;
