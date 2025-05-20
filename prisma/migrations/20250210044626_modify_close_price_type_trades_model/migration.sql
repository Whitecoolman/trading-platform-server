/*
  Warnings:

  - Changed the type of `closePrice` on the `Trades` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Trades" DROP COLUMN "closePrice",
ADD COLUMN     "closePrice" DOUBLE PRECISION NOT NULL;
