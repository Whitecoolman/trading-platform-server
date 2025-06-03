/*
  Warnings:

  - You are about to drop the column `password` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `Webhook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "password",
DROP COLUMN "username";

-- CreateTable
CREATE TABLE "AtUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "password" TEXT,

    CONSTRAINT "AtUser_pkey" PRIMARY KEY ("id")
);
