/*
  Warnings:

  - Added the required column `accountName` to the `MTAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MTAccount" ADD COLUMN     "accountName" TEXT NOT NULL;
