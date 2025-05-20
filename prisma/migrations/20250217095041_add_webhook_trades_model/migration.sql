-- CreateTable
CREATE TABLE "WebhookTrades" (
    "id" SERIAL NOT NULL,
    "webhookName" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "WebhookTrades_pkey" PRIMARY KEY ("id")
);
