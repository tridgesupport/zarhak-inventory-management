/*
  Warnings:

  - You are about to drop the `CoatingTemperMapping` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CoatingTemperMapping";

-- CreateTable
CREATE TABLE "CoatingMapping" (
    "coating" TEXT NOT NULL,
    "webCoating" TEXT NOT NULL,

    CONSTRAINT "CoatingMapping_pkey" PRIMARY KEY ("coating")
);

-- CreateTable
CREATE TABLE "TemperMapping" (
    "temper" TEXT NOT NULL,
    "webTemper" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "TemperMapping_pkey" PRIMARY KEY ("temper")
);
