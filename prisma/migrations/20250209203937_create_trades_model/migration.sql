-- CreateTable
CREATE TABLE "Trades" (
    "id" SERIAL NOT NULL,
    "useId" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "closePrice" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "gain" DOUBLE PRECISION NOT NULL,
    "marketValue" DOUBLE PRECISION NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "openTime" TEXT NOT NULL,
    "pips" DOUBLE PRECISION NOT NULL,
    "positionId" TEXT NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "success" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Trades_pkey" PRIMARY KEY ("id")
);
