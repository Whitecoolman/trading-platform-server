/*
  Warnings:

  - Added the required column `brokerName` to the `MTAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MTAccount" ADD COLUMN     "brokerName" TEXT NOT NULL;
