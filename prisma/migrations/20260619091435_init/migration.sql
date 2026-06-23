-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('WEBSITE', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'EXTRACTING', 'GENERATING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "WaitlistSignup" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "sourceInput" TEXT,
    "inputType" "InputType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "rawExtractedText" TEXT,
    "dnaJson" JSONB,
    "mdFileUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);
