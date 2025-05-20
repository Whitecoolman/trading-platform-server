-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "activationTrigger" DOUBLE PRECISION,
ADD COLUMN     "breakEvenExit" DOUBLE PRECISION,
ADD COLUMN     "takeProfit_pips_1" DOUBLE PRECISION,
ADD COLUMN     "takeProfit_pips_2" DOUBLE PRECISION,
ADD COLUMN     "takeProfit_pips_3" DOUBLE PRECISION,
ADD COLUMN     "timeBasedExit" DOUBLE PRECISION,
ADD COLUMN     "trailingDistance" DOUBLE PRECISION;
