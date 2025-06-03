/*
  Warnings:

  - Added the required column `accountType` to the `AtUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `AtUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AtUser` table without a default value. This is not possible if the table is not empty.
  - Made the column `username` on table `AtUser` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `AtUser` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AtUser" ADD COLUMN     "accountType" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL;
