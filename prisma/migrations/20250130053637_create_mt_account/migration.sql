-- CreateTable
CREATE TABLE "MTAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MTAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MTAccount_accountId_key" ON "MTAccount"("accountId");

-- AddForeignKey
ALTER TABLE "MTAccount" ADD CONSTRAINT "MTAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
