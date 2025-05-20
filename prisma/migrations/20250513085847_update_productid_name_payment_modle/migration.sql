/*
  Warnings:

  - You are about to drop the column `productID` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "productID",
ADD COLUMN     "product_id" TEXT;
