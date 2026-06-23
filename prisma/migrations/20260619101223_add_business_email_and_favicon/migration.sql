-- AlterTable
ALTER TABLE "WaitlistSignup" ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "isLikelyBusinessEmail" BOOLEAN NOT NULL DEFAULT false;
