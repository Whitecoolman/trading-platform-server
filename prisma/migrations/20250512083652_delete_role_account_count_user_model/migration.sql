/*
  Warnings:

  - You are about to drop the column `accountCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "accountCount",
DROP COLUMN "role";
