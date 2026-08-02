-- CreateTable
CREATE TABLE "DoSequence" (
    "fy" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DoSequence_pkey" PRIMARY KEY ("fy")
);
